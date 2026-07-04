// supabase/functions/erase-candidate/index.ts
//
// Metaprofile ATS — Edge Function: erase-candidate (спец. розділ 7.2.5, SEC-01/SEC-10/SEC-15).
//
// ЄДИНИЙ легітимний GDPR-erasure-шлях для рекрутера: анонімізує PII у
// public.ats_candidates замість фізичного каскадного DELETE (який знищив би
// append-only application_events і заявки чужих клієнтів того ж кандидата,
// оскільки кандидат — спільна сутність між тенантами).
//
// ── AUTH-КОНТРАКТ (розділ 7.2.0, 7.2.5) ─────────────────────────────────────
//   • getUser(jwt) — НЕ з body. 401 якщо немає валідного користувача.
//   • Дозволено: owner/admin (has_role) АБО рекрутер, у якого доступна (за
//     mp_can_access_vacancy) КОЖНА вакансія з заявок цього кандидата — тобто
//     ВСІ заявки кандидата в scope викликача. Якщо кандидат має хоч ОДНУ
//     заявку поза scope викликача → 403 forbidden (fail-closed: не можна
//     анонімізувати чужі дані одним запитом на спільного кандидата).
//   • Кандидат без жодної заявки: дозволено лише owner/admin або created_by
//     викликача (дзеркалить mp_can_edit_candidate).
//
// ── ЩО РОБИТЬ ────────────────────────────────────────────────────────────────
//   full_name → '[erased]'; email/phone/linkedin_url/headline/location/notes
//   → NULL; is_anonymized=true; anonymized_at=now(). Append-only журнал
//   (application_events) НЕ чіпається (SEC-15) — лише додається подія
//   'note_added' з метаданими erasure (без PII) для аудиту.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { candidate_id: uuid, reason?: string }
//   200 { ok: true, candidate_id, anonymized_at }
//   401 { error: "unauthorized" }
//   403 { error: "forbidden" }
//   404 { error: "candidate_not_found" }
//   409 { error: "already_anonymized" }
//   422 { error: "invalid_candidate_id" | "invalid_reason" }
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy erase-candidate
// Secrets: жодних додаткових (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned); ALLOWED_ORIGIN опційно.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_REASON_CHARS = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Verify JWT ------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseService.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    // --- 2. Parse + validate body --------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    const candidateId = body.candidate_id;
    if (!isUuid(candidateId)) return json({ error: "invalid_candidate_id" }, 422);

    let reason: string | null = null;
    if (body.reason !== undefined && body.reason !== null) {
      if (typeof body.reason !== "string" || body.reason.length > MAX_REASON_CHARS) {
        return json({ error: "invalid_reason" }, 422);
      }
      reason = body.reason.trim() || null;
    }

    // --- 3. Load candidate under service_role (bypasses RLS, but we do our
    //        own explicit authorization check below — never trust RLS alone
    //        for an operation this sensitive) -----------------------------
    const { data: candidate, error: candErr } = await supabaseService
      .from("ats_candidates")
      .select("id, created_by, is_anonymized")
      .eq("id", candidateId)
      .maybeSingle();
    if (candErr) {
      console.error("erase-candidate candidate lookup error:", candErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!candidate) return json({ error: "candidate_not_found" }, 404);
    if (candidate.is_anonymized) return json({ error: "already_anonymized" }, 409);

    // --- 4. Authorize: owner/admin bypass, else ALL applications' vacancies
    //        must be in caller's scope (mp_can_access_vacancy per row) -------
    const { data: isOwner, error: ownerErr } = await supabaseService.rpc("has_role", {
      _user_id: caller.id,
      _role: "owner",
    });
    if (ownerErr) {
      console.error("erase-candidate has_role(owner) error:", ownerErr.message);
      return json({ error: "server_error" }, 500);
    }
    let isAdminOrOwner = Boolean(isOwner);
    if (!isAdminOrOwner) {
      const { data: isAdmin, error: adminErr } = await supabaseService.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      if (adminErr) {
        console.error("erase-candidate has_role(admin) error:", adminErr.message);
        return json({ error: "server_error" }, 500);
      }
      isAdminOrOwner = Boolean(isAdmin);
    }

    if (!isAdminOrOwner) {
      // Caller-scoped client so mp_can_access_vacancy resolves under the
      // CALLER's own grants (identical resolver used by RLS), not service_role.
      const supabaseAsCaller = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { global: { headers: { Authorization: `Bearer ${jwt}` } } },
      );

      const { data: applications, error: appsErr } = await supabaseService
        .from("applications")
        .select("id, vacancy_id")
        .eq("candidate_id", candidateId);
      if (appsErr) {
        console.error("erase-candidate applications lookup error:", appsErr.message);
        return json({ error: "server_error" }, 500);
      }

      if (!applications || applications.length === 0) {
        // No applications at all: only the author (created_by) may erase,
        // mirroring mp_can_edit_candidate's fallback branch.
        if (candidate.created_by !== caller.id) return json({ error: "forbidden" }, 403);
      } else {
        // EVERY application's vacancy must be accessible to the caller.
        for (const app of applications) {
          const { data: canAccess, error: rpcErr } = await supabaseAsCaller.rpc(
            "mp_can_access_vacancy",
            { p_vacancy_id: app.vacancy_id },
          );
          if (rpcErr) {
            console.error("erase-candidate mp_can_access_vacancy error:", rpcErr.message);
            return json({ error: "server_error" }, 500);
          }
          if (!canAccess) return json({ error: "forbidden" }, 403);
        }
      }
    }

    // --- 5. Anonymize (never a physical DELETE) ------------------------------
    const anonymizedAt = new Date().toISOString();
    const { data: updated, error: updateErr } = await supabaseService
      .from("ats_candidates")
      .update({
        full_name: "[erased]",
        email: null,
        phone: null,
        linkedin_url: null,
        headline: null,
        location: null,
        notes: null,
        is_anonymized: true,
        anonymized_at: anonymizedAt,
      })
      .eq("id", candidateId)
      .eq("is_anonymized", false) // guards against a race with a concurrent erase
      .select("id")
      .maybeSingle();
    if (updateErr) {
      console.error("erase-candidate update error:", updateErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!updated) return json({ error: "already_anonymized" }, 409);

    // --- 6. Audit trail: append a note_added event per application (no PII,
    //        journal itself stays intact — SEC-15) ---------------------------
    const { data: applicationsForLog } = await supabaseService
      .from("applications")
      .select("id")
      .eq("candidate_id", candidateId);
    if (applicationsForLog && applicationsForLog.length > 0) {
      const events = applicationsForLog.map((a) => ({
        application_id: a.id,
        event_type: "note_added" as const,
        actor_id: caller.id,
        note: "Candidate PII anonymized (GDPR erasure).",
        metadata: reason ? { source: "erase-candidate" } : { source: "erase-candidate" },
      }));
      const { error: logErr } = await supabaseService.from("application_events").insert(events);
      if (logErr) {
        // Anonymization already committed; log failure is surfaced server-side
        // only — do not fail the erasure itself over an audit-log hiccup.
        console.error("erase-candidate audit log insert error:", logErr.message);
      }
    }

    return json({ ok: true, candidate_id: candidateId, anonymized_at: anonymizedAt });
  } catch (error) {
    console.error("erase-candidate unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
