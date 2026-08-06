// supabase/functions/workua-connector/index.ts
//
// Metaprofile ATS — інтеграція Work.ua (api.work.ua, HTTP Basic Auth).
//
// Дії:
//   • list_jobs        — GET /jobs/my (список вакансій акаунта work.ua) — безкоштовно.
//   • import_responses — GET /jobs/{jobId}/responses → створює кандидатів + заявки у
//                        воронку нашої вакансії (дедуп workua_synced_responses). Читання
//                        відгуків не палить квоту контактів.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt). list_jobs — owner/admin. import_responses —
//   mp_can_edit_vacancy(vacancy_id). Work.ua — Basic Auth WORKUA_EMAIL:WORKUA_PASSWORD.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { action: "list_jobs" } → { jobs: [{id, name, active}] }
//   POST { action: "import_responses", vacancy_id } → { imported, skipped, total }
//   401/403/404/422/502(workua)/503/500
//
// Deploy:  supabase functions deploy workua-connector   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WORKUA_EMAIL = Deno.env.get("WORKUA_EMAIL") ?? "";
const WORKUA_PASSWORD = Deno.env.get("WORKUA_PASSWORD") ?? "";
const WORKUA_BASE = "https://api.work.ua";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

function workuaHeaders(): Record<string, string> {
  const basic = btoa(`${WORKUA_EMAIL}:${WORKUA_PASSWORD}`);
  return {
    Authorization: `Basic ${basic}`,
    "User-Agent": `Metaprofile ATS (${WORKUA_EMAIL})`,
    "X-Locale": "uk_UA",
    Accept: "application/json",
  };
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

    if (!WORKUA_EMAIL || !WORKUA_PASSWORD) return json({ error: "workua_not_configured" }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const action = typeof body.action === "string" ? body.action : "";

    // ── list_jobs ─────────────────────────────────────────────────────────
    if (action === "list_jobs") {
      const { data: isAdmin } = await asCaller.rpc("mp_is_workspace_admin");
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      const res = await fetch(`${WORKUA_BASE}/jobs/my?full=1`, { headers: workuaHeaders() });
      if (res.status === 404) return json({ jobs: [] });
      if (!res.ok) return json({ error: "workua_error", detail: `jobs/my ${res.status}` }, 502);
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(data) ? data : (data.items ?? data.jobs ?? []);
      const jobs = items.map((j) => ({ id: String(j.id), name: j.name ?? "Вакансія", active: j.active === 1 || j.active === true }));
      return json({ jobs });
    }

    // ── import_responses ──────────────────────────────────────────────────
    if (action === "import_responses") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
      const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
      if (scopeErr) { console.error("workua scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
      if (!canEdit) return json({ error: "forbidden" }, 403);

      const { data: vacancy } = await admin.from("vacancies").select("id, tenant_id, workua_job_id").eq("id", vacancyId).maybeSingle();
      const vac = vacancy as unknown as { tenant_id: string | null; workua_job_id: string | null } | null;
      if (!vac) return json({ error: "vacancy_not_found" }, 404);
      if (!vac.workua_job_id) return json({ error: "no_workua_job", detail: "Спершу вкажіть work.ua job_id для вакансії" }, 422);

      const res = await fetch(`${WORKUA_BASE}/jobs/${encodeURIComponent(vac.workua_job_id)}/responses?limit=50`, { headers: workuaHeaders() });
      if (res.status === 404) return json({ imported: 0, skipped: 0, total: 0 });
      if (!res.ok) return json({ error: "workua_error", detail: `responses ${res.status}: ${(await res.text().catch(() => "")).slice(0, 150)}` }, 502);
      const data = await res.json().catch(() => ({}));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(data) ? data : (data.items ?? []);

      // Джерело Work.ua + перша стадія воронки.
      const { data: src } = await admin.from("candidate_sources").select("id").eq("name", "Work.ua").limit(1).maybeSingle();
      const sourceId = (src as { id: string } | null)?.id ?? null;
      const { data: firstStage } = await admin.from("pipeline_stages").select("id").eq("vacancy_id", vacancyId).order("position", { ascending: true }).limit(1).maybeSingle();
      const firstStageId = (firstStage as { id: string } | null)?.id ?? null;

      // Уже імпортовані response_id.
      const { data: synced } = await admin.from("workua_synced_responses").select("response_id").eq("vacancy_id", vacancyId);
      const seen = new Set((synced ?? []).map((s) => (s as { response_id: string }).response_id));

      let imported = 0, skipped = 0;
      for (const it of items) {
        const responseId = String(it.id ?? "");
        if (!responseId || seen.has(responseId)) { skipped++; continue; }
        const fullName = (it.fio as string) || "Без імені";
        const notes = [it.cover, it.text].filter((x) => typeof x === "string" && x.trim()).join("\n---\n").slice(0, 4000) || null;
        const { data: cand, error: cErr } = await admin.from("ats_candidates").insert({
          full_name: fullName,
          email: (it.email as string) || null,
          phone: (it.phone as string) || null,
          notes,
          resume_text: typeof it.text === "string" ? it.text.slice(0, 8000) : null,
          source_id: sourceId,
          tenant_id: vac.tenant_id,
        }).select("id").single();
        if (cErr) { console.error("workua candidate insert:", cErr.message); skipped++; continue; }
        const candidateId = (cand as { id: string }).id;
        await admin.from("applications").insert({
          vacancy_id: vacancyId, candidate_id: candidateId, list_state: "long_list",
          ...(firstStageId ? { current_stage_id: firstStageId } : {}), tenant_id: vac.tenant_id,
        });
        await admin.from("workua_synced_responses").insert({
          vacancy_id: vacancyId, response_id: responseId, candidate_id: candidateId, tenant_id: vac.tenant_id,
        });
        seen.add(responseId);
        imported++;
      }
      return json({ imported, skipped, total: items.length });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("workua-connector unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
