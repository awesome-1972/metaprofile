// supabase/functions/djinni-connector/index.ts
//
// Metaprofile ATS — інтеграція Djinni (djinni.co/api/v2, X-API-Key).
//
// Дії:
//   • list_jobs        — GET /jobs/ (список вакансій акаунта) — owner/admin.
//   • import_responses — GET /jobs/{djinniJobId}/candidates → створює кандидатів
//                        + заявки у воронку нашої вакансії (дедуп djinni_synced_responses).
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt). Djinni — X-API-Key: DJINNI_API_KEY.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { action: "list_jobs" } → { jobs: [{id, name, active}] }
//   POST { action: "import_responses", vacancy_id } → { imported, skipped, total }
//   401/403/404/422/502(djinni)/503(not_configured)/500
//
// Deploy: supabase functions deploy djinni-connector · verify_jwt=true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DJINNI_API_KEY = (Deno.env.get("DJINNI_API_KEY") ?? "").replace(/[^\x20-\x7E]/g, "").trim();
const DJINNI_BASE = "https://djinni.co/api/v2";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
function djinniHeaders(): Record<string, string> {
  return { "X-API-Key": DJINNI_API_KEY, Accept: "application/json" };
}
function asStr(v: unknown, max = 4000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
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

    if (!DJINNI_API_KEY) return json({ error: "djinni_not_configured" }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const action = typeof body.action === "string" ? body.action : "";

    // ── list_jobs ─────────────────────────────────────────────────────────
    if (action === "list_jobs") {
      const { data: isAdmin } = await asCaller.rpc("mp_is_workspace_admin");
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      const res = await fetch(`${DJINNI_BASE}/jobs/`, { headers: djinniHeaders() });
      if (!res.ok) return json({ error: "djinni_error", detail: `jobs ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` }, 502);
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(data) ? data : (data.items ?? data.results ?? []);
      const jobs = items.map((j) => ({
        id: String(j.id ?? ""),
        name: j.position ?? j.primary_keyword ?? "Вакансія",
        active: j.published === true || String(j.status ?? "").toLowerCase() === "published" || (!j.is_deleted && j.published !== false),
      })).filter((j) => j.id);
      return json({ jobs });
    }

    // ── import_responses ──────────────────────────────────────────────────
    if (action === "import_responses") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
      const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
      if (scopeErr) { console.error("djinni scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
      if (!canEdit) return json({ error: "forbidden" }, 403);

      const { data: vacancy } = await admin.from("vacancies").select("id, tenant_id, djinni_job_id").eq("id", vacancyId).maybeSingle();
      const vac = vacancy as unknown as { tenant_id: string | null; djinni_job_id: string | null } | null;
      if (!vac) return json({ error: "vacancy_not_found" }, 404);
      if (!vac.djinni_job_id) return json({ error: "no_djinni_job", detail: "Спершу вкажіть Djinni job_id для вакансії" }, 422);

      const res = await fetch(`${DJINNI_BASE}/jobs/${encodeURIComponent(vac.djinni_job_id)}/candidates`, { headers: djinniHeaders() });
      if (res.status === 404) return json({ imported: 0, skipped: 0, total: 0 });
      if (!res.ok) return json({ error: "djinni_error", detail: `candidates ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}` }, 502);
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(data) ? data : (data.items ?? data.results ?? []);

      const { data: src } = await admin.from("candidate_sources").select("id").eq("name", "Djinni").limit(1).maybeSingle();
      const sourceId = (src as { id: string } | null)?.id ?? null;
      const { data: firstStage } = await admin.from("pipeline_stages").select("id").eq("vacancy_id", vacancyId).order("position", { ascending: true }).limit(1).maybeSingle();
      const firstStageId = (firstStage as { id: string } | null)?.id ?? null;

      const { data: synced } = await admin.from("djinni_synced_responses").select("response_id").eq("vacancy_id", vacancyId);
      const seen = new Set((synced ?? []).map((s) => (s as { response_id: string }).response_id));

      let imported = 0, skipped = 0;
      for (const it of items) {
        const responseId = String(it.application_id ?? it.id ?? "");
        if (!responseId || seen.has(responseId)) { skipped++; continue; }
        const fullName = asStr(it.name) || asStr(it.position) || "Кандидат Djinni";
        const links = [
          it.public_profile_url ? `Djinni: ${it.public_profile_url}` : "",
          it.cv_url ? `CV: ${it.cv_url}` : "",
          it.linkedin ? `LinkedIn: ${it.linkedin}` : "",
          it.github ? `GitHub: ${it.github}` : "",
          it.telegram ? `Telegram: ${it.telegram}` : "",
        ].filter(Boolean).join("\n");
        const notesParts = [
          asStr(it.cover_letter),
          it.skills && Array.isArray(it.skills) && it.skills.length ? `Навички: ${it.skills.map(String).join(", ")}` : "",
          it.experience_years ? `Досвід (років): ${it.experience_years}` : "",
          it.english_level ? `English: ${it.english_level}` : "",
          it.salary_min ? `Очікування ЗП: від ${it.salary_min}` : "",
          links,
        ].filter(Boolean);
        const notes = notesParts.join("\n---\n").slice(0, 4000) || null;

        const { data: cand, error: cErr } = await admin.from("ats_candidates").insert({
          full_name: fullName,
          email: asStr(it.email),
          phone: asStr(it.phone),
          notes,
          resume_text: asStr(it.cover_letter, 8000),
          source_id: sourceId,
          tenant_id: vac.tenant_id,
        }).select("id").single();
        if (cErr) { console.error("djinni candidate insert:", cErr.message); skipped++; continue; }
        const candidateId = (cand as { id: string }).id;
        await admin.from("applications").insert({
          vacancy_id: vacancyId, candidate_id: candidateId, list_state: "long_list",
          ...(firstStageId ? { current_stage_id: firstStageId } : {}), tenant_id: vac.tenant_id,
        });
        await admin.from("djinni_synced_responses").insert({
          vacancy_id: vacancyId, response_id: responseId, candidate_id: candidateId, tenant_id: vac.tenant_id,
        });
        seen.add(responseId);
        imported++;
      }
      return json({ imported, skipped, total: items.length });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("djinni-connector unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
