// supabase/functions/jooble-market/index.ts
//
// Metaprofile ATS — моніторинг РИНКУ ВАКАНСІЙ через Jooble (офіційний API).
// Jooble — агрегатор вакансій (не резюме): корисний для аналізу конкурентів,
// вилок і попиту по регіонах під конкретну роль.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope — mp_is_internal(). Jooble — JOOBLE_API_KEY.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id?: uuid, keywords?: string, location?: string, page?: number }
//     (vacancy_id → keywords=title, location=candidates_geo, якщо явно не задано)
//   200 { total: number, jobs: [{ title, company, location, salary, snippet,
//         link, source, type, updated }] }
//   401/403/422/502(jooble_error)/503(jooble_not_configured)/500
//
// Deploy: supabase functions deploy jooble-market  · verify_jwt=true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JOOBLE_API_KEY = Deno.env.get("JOOBLE_API_KEY") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
function asStr(v: unknown, max = 600): string { return typeof v === "string" ? v.trim().slice(0, max) : ""; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: isInternal, error: scopeErr } = await asCaller.rpc("mp_is_internal");
    if (scopeErr) { console.error("jooble scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!isInternal) return json({ error: "forbidden" }, 403);
    if (!JOOBLE_API_KEY) return json({ error: "jooble_not_configured" }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

    let keywords = asStr(body.keywords, 200);
    let location = asStr(body.location, 120);
    const page = Number.isFinite(Number(body.page)) && Number(body.page) > 0 ? Math.floor(Number(body.page)) : 1;

    // Якщо задано vacancy_id — беремо назву/гео з вакансії (як дефолт).
    if (isUuid(body.vacancy_id) && (!keywords || !location)) {
      const { data: vac } = await admin.from("vacancies").select("title, candidates_geo, location").eq("id", body.vacancy_id).maybeSingle();
      const v = vac as unknown as { title: string; candidates_geo: string | null; location: string | null } | null;
      if (v) {
        if (!keywords) keywords = asStr(v.title, 200);
        if (!location) location = asStr(v.candidates_geo ?? v.location ?? "", 120);
      }
    }
    if (!keywords) return json({ error: "invalid_body", detail: "keywords або vacancy_id" }, 422);

    let res: Response;
    try {
      res = await fetch(`https://jooble.org/api/${encodeURIComponent(JOOBLE_API_KEY)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, page: String(page) }),
      });
    } catch (e) {
      return json({ error: "jooble_error", detail: `network: ${(e as Error).message}` }, 502);
    }
    if (!res.ok) {
      const t = (await res.text().catch(() => "")).slice(0, 200);
      return json({ error: "jooble_error", detail: `HTTP ${res.status}: ${t}` }, 502);
    }
    const data = await res.json().catch(() => ({})) as { totalCount?: number; jobs?: Array<Record<string, unknown>> };
    const jobs = (Array.isArray(data.jobs) ? data.jobs : []).slice(0, 40).map((j) => ({
      title: asStr(j.title, 300),
      company: asStr(j.company, 200),
      location: asStr(j.location, 200),
      salary: asStr(j.salary, 120),
      snippet: asStr(j.snippet, 500).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      link: asStr(j.link, 1000),
      source: asStr(j.source, 120),
      type: asStr(j.type, 80),
      updated: asStr(j.updated, 60),
    }));
    return json({ total: Number(data.totalCount ?? jobs.length), jobs, query: { keywords, location, page } });
  } catch (error) {
    console.error("jooble-market unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
