// supabase/functions/merge-candidates/index.ts
//
// Metaprofile ATS — злиття дублів кандидатів (Talent CRM дедуплікація).
//
// Переносить усе з дубля на первинного кандидата й видаляє дубль:
//   • applications        — reassign; при unique(candidate_id, vacancy_id)-конфлікті
//                           (первинний уже має заявку в тій вакансії) дубль-заявку видаляємо;
//   • vacancy_candidate_matches — так само conflict-aware по (vacancy_id, candidate_id);
//   • candidate_communications, sourced_profiles — просто reassign candidate_id;
//   • поля первинного доповнюємо з дубля (coalesce), теги — об'єднуємо, нотатки — конкатенуємо.
// competency_scores / candidate_reports прив'язані до application_id — переносяться разом із заявками.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); право — mp_can_edit_candidate на ОБОХ кандидатів.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { primary_id: uuid, duplicate_id: uuid }
//   200 { merged_into, moved_applications, dropped_applications }
//   400/401/403/404/409/422/500
//
// Deploy:  supabase functions deploy merge-candidates   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

interface Cand {
  id: string; tenant_id: string | null;
  email: string | null; phone: string | null; headline: string | null;
  current_company: string | null; location: string | null; linkedin_url: string | null;
  notes: string | null; resume_text: string | null; resume_file_name: string | null;
  resume_parsed: unknown; tags: string[] | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? srk;
    const admin = createClient(url, srk);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const primaryId = body.primary_id;
    const duplicateId = body.duplicate_id;
    if (!isUuid(primaryId) || !isUuid(duplicateId)) return json({ error: "invalid_body" }, 422);
    if (primaryId === duplicateId) return json({ error: "same_candidate" }, 422);

    // Право редагувати обох.
    for (const cid of [primaryId, duplicateId]) {
      const { data: canEdit, error } = await asCaller.rpc("mp_can_edit_candidate", { p_candidate_id: cid });
      if (error) { console.error("merge-candidates scope error:", error.message); return json({ error: "server_error" }, 500); }
      if (!canEdit) return json({ error: "forbidden" }, 403);
    }

    const { data: cands, error: cErr } = await admin
      .from("ats_candidates")
      .select("id, tenant_id, email, phone, headline, current_company, location, linkedin_url, notes, resume_text, resume_file_name, resume_parsed, tags")
      .in("id", [primaryId, duplicateId]);
    if (cErr) { console.error("merge-candidates read error:", cErr.message); return json({ error: "server_error" }, 500); }
    const primary = (cands ?? []).find((c) => c.id === primaryId) as Cand | undefined;
    const duplicate = (cands ?? []).find((c) => c.id === duplicateId) as Cand | undefined;
    if (!primary || !duplicate) return json({ error: "candidate_not_found" }, 404);
    if (primary.tenant_id !== duplicate.tenant_id) return json({ error: "tenant_mismatch" }, 409);

    // ── applications: reassign з урахуванням unique(candidate_id, vacancy_id) ──
    const { data: primApps } = await admin.from("applications").select("vacancy_id").eq("candidate_id", primaryId);
    const primVacancies = new Set((primApps ?? []).map((a) => (a as { vacancy_id: string }).vacancy_id));
    const { data: dupApps } = await admin.from("applications").select("id, vacancy_id").eq("candidate_id", duplicateId);
    let moved = 0, dropped = 0;
    for (const a of (dupApps ?? []) as Array<{ id: string; vacancy_id: string }>) {
      if (primVacancies.has(a.vacancy_id)) {
        await admin.from("applications").delete().eq("id", a.id);
        dropped++;
      } else {
        await admin.from("applications").update({ candidate_id: primaryId }).eq("id", a.id);
        primVacancies.add(a.vacancy_id);
        moved++;
      }
    }

    // ── vacancy_candidate_matches: conflict-aware по (vacancy_id, candidate_id) ──
    const { data: primMatches } = await admin.from("vacancy_candidate_matches").select("vacancy_id").eq("candidate_id", primaryId);
    const primMatchVac = new Set((primMatches ?? []).map((m) => (m as { vacancy_id: string }).vacancy_id));
    const { data: dupMatches } = await admin.from("vacancy_candidate_matches").select("id, vacancy_id").eq("candidate_id", duplicateId);
    for (const m of (dupMatches ?? []) as Array<{ id: string; vacancy_id: string }>) {
      if (primMatchVac.has(m.vacancy_id)) await admin.from("vacancy_candidate_matches").delete().eq("id", m.id);
      else await admin.from("vacancy_candidate_matches").update({ candidate_id: primaryId }).eq("id", m.id);
    }

    // ── прості reassign ──
    await admin.from("candidate_communications").update({ candidate_id: primaryId }).eq("candidate_id", duplicateId);
    await admin.from("sourced_profiles").update({ candidate_id: primaryId }).eq("candidate_id", duplicateId);

    // ── злиття полів у первинного ──
    const pick = <T,>(a: T | null, b: T | null): T | null => (a !== null && a !== undefined && a !== "" ? a : b);
    const mergedTags = [...new Set([...(primary.tags ?? []), ...(duplicate.tags ?? [])])];
    const mergedNotes = [primary.notes, duplicate.notes].filter((n) => n && n.trim()).join("\n---\n") || null;
    const patch: Record<string, unknown> = {
      email: pick(primary.email, duplicate.email),
      phone: pick(primary.phone, duplicate.phone),
      headline: pick(primary.headline, duplicate.headline),
      current_company: pick(primary.current_company, duplicate.current_company),
      location: pick(primary.location, duplicate.location),
      linkedin_url: pick(primary.linkedin_url, duplicate.linkedin_url),
      resume_text: pick(primary.resume_text, duplicate.resume_text),
      resume_file_name: pick(primary.resume_file_name, duplicate.resume_file_name),
      resume_parsed: primary.resume_parsed ?? duplicate.resume_parsed ?? null,
      notes: mergedNotes,
      tags: mergedTags,
    };
    const { error: updErr } = await admin.from("ats_candidates").update(patch).eq("id", primaryId);
    if (updErr) { console.error("merge-candidates merge fields error:", updErr.message); return json({ error: "server_error" }, 500); }

    // ── видалити дубль (решта FK — cascade/set null) ──
    const { error: delErr } = await admin.from("ats_candidates").delete().eq("id", duplicateId);
    if (delErr) { console.error("merge-candidates delete error:", delErr.message); return json({ error: "server_error" }, 500); }

    return json({ merged_into: primaryId, moved_applications: moved, dropped_applications: dropped });
  } catch (error) {
    console.error("merge-candidates unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
