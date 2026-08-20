// supabase/functions/dou-market/index.ts
//
// Metaprofile ATS — моніторинг вакансій DOU через офіційні RSS-фіди
// (jobs.dou.ua/vacancies/feeds). Легально й стабільно, без скрейпу HTML.
// DOU не має API резюме — тут лише РИНОК ВАКАНСІЙ (аналіз, конкуренти, попит).
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope — mp_is_internal().
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id?: uuid, keywords?: string, category?: string, city?: string }
//   200 { total, jobs: [{ title, company, location, snippet, link, updated }], query }
//   401/403/422/502(dou_error)/500
//
// Deploy: supabase functions deploy dou-market · verify_jwt=true.

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
function asStr(v: unknown, max = 400): string { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
function stripTags(s: string): string { return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
}
function firstTag(block: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  if (!m) return "";
  let v = m[1].trim();
  const cdata = /^<!\[CDATA\[([\s\S]*?)\]\]>$/.exec(v);
  if (cdata) v = cdata[1];
  return decodeEntities(v.trim());
}

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
    if (scopeErr) { console.error("dou scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!isInternal) return json({ error: "forbidden" }, 403);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }

    let keywords = asStr(body.keywords, 120);
    const category = asStr(body.category, 80);
    const city = asStr(body.city, 80);
    if (isUuid(body.vacancy_id) && !keywords) {
      const { data: vac } = await admin.from("vacancies").select("title").eq("id", body.vacancy_id).maybeSingle();
      const t = (vac as { title?: string } | null)?.title;
      if (t) keywords = asStr(t, 120);
    }

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (city) params.set("city", city);
    const feedUrl = `https://jobs.dou.ua/vacancies/feeds/${params.toString() ? `?${params}` : ""}`;

    let res: Response;
    try {
      res = await fetch(feedUrl, { headers: { "User-Agent": "Metaprofile ATS", Accept: "application/rss+xml, application/xml, text/xml" } });
    } catch (e) {
      return json({ error: "dou_error", detail: `network: ${(e as Error).message}` }, 502);
    }
    if (!res.ok) {
      const t = (await res.text().catch(() => "")).slice(0, 200);
      return json({ error: "dou_error", detail: `HTTP ${res.status}: ${t}` }, 502);
    }
    const xml = await res.text();
    const items = xml.split(/<item[\s>]/i).slice(1).map((chunk) => "<item " + chunk.split(/<\/item>/i)[0] + "</item>");

    const kw = keywords.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const jobs = items.map((it) => {
      const title = firstTag(it, "title");
      const rawDesc = firstTag(it, "description");
      // DOU кладе компанію/місто в опис; лишаємо короткий сніпет.
      return {
        title,
        company: "",
        location: city,
        snippet: stripTags(rawDesc).slice(0, 400),
        link: firstTag(it, "link"),
        updated: firstTag(it, "pubDate"),
      };
    }).filter((j) => {
      if (!j.title) return false;
      if (kw.length === 0) return true;
      const hay = `${j.title} ${j.snippet}`.toLowerCase();
      return kw.some((w) => hay.includes(w));
    }).slice(0, 40);

    return json({ total: jobs.length, jobs, query: { keywords, category, city } });
  } catch (error) {
    console.error("dou-market unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
