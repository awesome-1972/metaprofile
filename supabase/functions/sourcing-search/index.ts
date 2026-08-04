// supabase/functions/sourcing-search/index.ts
//
// Metaprofile ATS — AI-сорсинг із зовнішніх джерел (SPEC-ENGINEERING Розділ 12–13).
//
// Будує «профіль ролі» з вакансії (title/description/компетенції/бріф), для кожного
// увімкненого й налаштованого провайдера (GitHub / PDL / Apollo / Proxycurl) виконує
// пошук, нормалізує профілі, дедупить проти ats_candidates і sourced_profiles,
// ранжує дешевим токен-overlap (match_score 0–100) і матеріалізує в sourced_profiles.
// Клієнт лише читає збережене й імпортує профіль у базу.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy. Ключі провайдерів —
//   із secrets; запис у БД — service_role з явним tenant_id вакансії.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, providers?: string[], query?: {titles?,skills?,locations?,keywords?}, limit?: number }
//   200 { search_id, profiles: [...], counts: {provider: n}, skipped: [provider], total }
//   401/403/404/422/429/500
//
// Deploy:  supabase functions deploy sourcing-search   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KNOWN_PROVIDERS = ["github", "pdl", "apollo", "proxycurl"] as const;
type Provider = (typeof KNOWN_PROVIDERS)[number];
const PER_PROVIDER_LIMIT = 25;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_LIMIT_WINDOW_MS) { rateBuckets.set(key, { count: 1, windowStart: now }); return false; }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

function tokenize(s: string): string[] {
  return (s || "").toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, " ").split(/\s+/).filter((t) => t.length >= 3);
}

// Нормалізований профіль, спільний для всіх провайдерів.
interface NormProfile {
  provider: Provider;
  external_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  skills: string[];
  profile_url: string | null;
  raw: Record<string, unknown>;
}

interface RoleQuery { titles: string[]; skills: string[]; locations: string[]; keywords: string }

// ── Провайдери ───────────────────────────────────────────────────────────────
// GitHub — пошук користувачів за мовою/локацією/ключовими словами.
async function searchGitHub(q: RoleQuery): Promise<NormProfile[]> {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) return [];
  const terms: string[] = [];
  if (q.keywords) terms.push(q.keywords);
  for (const s of q.skills.slice(0, 3)) terms.push(s);
  if (q.locations[0]) terms.push(`location:${q.locations[0]}`);
  const query = terms.join(" ").trim() || "developer";
  const url = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&per_page=${PER_PROVIDER_LIMIT}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "metaprofile-ats" } });
  if (!res.ok) throw new Error(`github ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const data = await res.json() as { items?: Array<Record<string, unknown>> };
  const items = Array.isArray(data.items) ? data.items : [];
  // Легке збагачення першими N (профіль дає ім'я/біо/локацію).
  const out: NormProfile[] = [];
  for (const it of items) {
    const login = String(it.login ?? "");
    let name: string | null = null, location: string | null = null, company: string | null = null, bio = "";
    try {
      const p = await fetch(`https://api.github.com/users/${login}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "metaprofile-ats" } });
      if (p.ok) { const pd = await p.json() as Record<string, unknown>; name = (pd.name as string) ?? null; location = (pd.location as string) ?? null; company = (pd.company as string) ?? null; bio = (pd.bio as string) ?? ""; }
    } catch { /* ignore enrich failure */ }
    out.push({
      provider: "github", external_id: String(it.id ?? login), full_name: name || login,
      title: bio || null, company, location, skills: [], profile_url: String(it.html_url ?? `https://github.com/${login}`),
      raw: it,
    });
  }
  return out;
}

// People Data Labs — person search.
async function searchPDL(q: RoleQuery): Promise<NormProfile[]> {
  const key = Deno.env.get("PDL_API_KEY");
  if (!key) return [];
  const must: unknown[] = [];
  if (q.titles[0]) must.push({ match: { job_title: q.titles[0] } });
  for (const s of q.skills.slice(0, 5)) must.push({ match: { skills: s } });
  if (q.locations[0]) must.push({ match: { location_locality: q.locations[0] } });
  const body = { query: { bool: { must } }, size: PER_PROVIDER_LIMIT };
  const res = await fetch("https://api.peopledatalabs.com/v5/person/search", { method: "POST", headers: { "X-Api-Key": key, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`pdl ${res.status}`);
  const data = await res.json() as { data?: Array<Record<string, unknown>> };
  return (data.data ?? []).map((d) => ({
    provider: "pdl" as const, external_id: String(d.id ?? crypto.randomUUID()),
    full_name: (d.full_name as string) ?? null, title: (d.job_title as string) ?? null,
    company: (d.job_company_name as string) ?? null, location: (d.location_name as string) ?? null,
    skills: Array.isArray(d.skills) ? (d.skills as string[]).slice(0, 40) : [],
    profile_url: (d.linkedin_url as string) ?? null, raw: d,
  }));
}

// Apollo.io — mixed people search.
async function searchApollo(q: RoleQuery): Promise<NormProfile[]> {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) return [];
  const body: Record<string, unknown> = { page: 1, per_page: PER_PROVIDER_LIMIT };
  if (q.titles.length) body.person_titles = q.titles.slice(0, 5);
  if (q.locations.length) body.person_locations = q.locations.slice(0, 5);
  if (q.keywords) body.q_keywords = q.keywords;
  const res = await fetch("https://api.apollo.io/v1/mixed_people/search", { method: "POST", headers: { "X-Api-Key": key, "Content-Type": "application/json", "Cache-Control": "no-cache" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`apollo ${res.status}`);
  const data = await res.json() as { people?: Array<Record<string, unknown>> };
  return (data.people ?? []).map((p) => ({
    provider: "apollo" as const, external_id: String(p.id ?? crypto.randomUUID()),
    full_name: (p.name as string) ?? null, title: (p.title as string) ?? null,
    company: ((p.organization as Record<string, unknown>)?.name as string) ?? null,
    location: [p.city, p.country].filter(Boolean).join(", ") || null,
    skills: [], profile_url: (p.linkedin_url as string) ?? null, raw: p,
  }));
}

// Proxycurl — LinkedIn-type person search.
async function searchProxycurl(q: RoleQuery): Promise<NormProfile[]> {
  const key = Deno.env.get("PROXYCURL_API_KEY");
  if (!key) return [];
  const params = new URLSearchParams();
  if (q.titles[0]) params.set("current_role_title", q.titles[0]);
  if (q.locations[0]) params.set("country", q.locations[0]);
  if (q.skills[0]) params.set("skills", q.skills.slice(0, 3).join(" "));
  params.set("page_size", String(PER_PROVIDER_LIMIT));
  const res = await fetch(`https://nubela.co/proxycurl/api/v2/search/person?${params}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`proxycurl ${res.status}`);
  const data = await res.json() as { results?: Array<Record<string, unknown>> };
  return (data.results ?? []).map((r) => ({
    provider: "proxycurl" as const, external_id: String(r.linkedin_profile_url ?? crypto.randomUUID()),
    full_name: (r.full_name as string) ?? null, title: (r.occupation as string) ?? null,
    company: null, location: null, skills: [],
    profile_url: (r.linkedin_profile_url as string) ?? null, raw: r,
  }));
}

const PROVIDER_FN: Record<Provider, (q: RoleQuery) => Promise<NormProfile[]>> = {
  github: searchGitHub, pdl: searchPDL, apollo: searchApollo, proxycurl: searchProxycurl,
};
const PROVIDER_SECRET: Record<Provider, string> = {
  github: "GITHUB_TOKEN", pdl: "PDL_API_KEY", apollo: "APOLLO_API_KEY", proxycurl: "PROXYCURL_API_KEY",
};

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
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("sourcing-search scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // Провайдери: із запиту, лишаємо лише відомі й ті, що мають ключ.
    const requested = Array.isArray(body.providers) && body.providers.length
      ? (body.providers.filter((p) => KNOWN_PROVIDERS.includes(p as Provider)) as Provider[])
      : [...KNOWN_PROVIDERS];
    const active: Provider[] = [];
    const skipped: Provider[] = [];
    for (const p of requested) (Deno.env.get(PROVIDER_SECRET[p]) ? active : skipped).push(p);

    // Вакансія + tenant.
    const { data: vacancy, error: vErr } = await admin.from("vacancies").select("id, title, description, candidates_geo, tenant_id").eq("id", vacancyId).maybeSingle();
    if (vErr) { console.error("sourcing-search vacancy error:", vErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const vac = vacancy as unknown as { title: string; description: string | null; candidates_geo: string | null; tenant_id: string | null };
    const tenantId = vac.tenant_id;

    // Профіль ролі: з тіла запиту або з бріфу/компетенцій вакансії.
    const { data: comps } = await admin.from("vacancy_competencies").select("name").eq("vacancy_id", vacancyId);
    const compNames = (comps ?? []).map((c) => (c as { name: string }).name).filter(Boolean);
    const qbody = (body.query ?? {}) as { titles?: string[]; skills?: string[]; locations?: string[]; keywords?: string };
    const roleQuery: RoleQuery = {
      titles: Array.isArray(qbody.titles) && qbody.titles.length ? qbody.titles : [vac.title],
      skills: Array.isArray(qbody.skills) && qbody.skills.length ? qbody.skills : compNames,
      locations: Array.isArray(qbody.locations) && qbody.locations.length ? qbody.locations : (vac.candidates_geo ? [vac.candidates_geo] : []),
      keywords: typeof qbody.keywords === "string" ? qbody.keywords : vac.title,
    };

    // Створюємо запис пошуку (running).
    const { data: searchRow, error: sErr } = await admin.from("sourcing_searches").insert({
      vacancy_id: vacancyId, tenant_id: tenantId, query: roleQuery, providers: active, status: "running", created_by: caller.id,
    }).select("id").single();
    if (sErr) { console.error("sourcing-search insert search error:", sErr.message); return json({ error: "server_error" }, 500); }
    const searchId = (searchRow as { id: string }).id;

    // Запити до провайдерів (паралельно, ізольовано по помилках).
    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};
    const settled = await Promise.allSettled(active.map(async (p) => ({ p, list: await PROVIDER_FN[p](roleQuery) })));
    let all: NormProfile[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") { counts[s.value.p] = s.value.list.length; all = all.concat(s.value.list); }
      else { const msg = (s.reason as Error)?.message ?? "error"; const prov = KNOWN_PROVIDERS.find((k) => msg.startsWith(k)) ?? "unknown"; errors[prov] = msg; }
    }

    // Дедуп проти вже наявних кандидатів тенанта (за profile_url або нормалізованим ім'ям).
    let existing: Array<{ full_name: string | null }> = [];
    {
      let q = admin.from("ats_candidates").select("full_name").limit(2000);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data } = await q;
      existing = (data ?? []) as Array<{ full_name: string | null }>;
    }
    const existingNames = new Set(existing.map((e) => (e.full_name ?? "").trim().toLowerCase()).filter(Boolean));

    // Ранжування токен-overlap проти профілю ролі.
    const roleTokens = new Set([...tokenize(vac.title), ...tokenize(vac.description ?? ""), ...compNames.flatMap(tokenize), ...roleQuery.skills.flatMap(tokenize)]);
    const seen = new Set<string>();
    const rows = all
      .filter((p) => {
        const dk = `${p.provider}:${p.external_id}`;
        if (seen.has(dk)) return false; seen.add(dk);
        return true;
      })
      .map((p) => {
        const ptoks = new Set([...tokenize(p.title ?? ""), ...tokenize(p.company ?? ""), ...p.skills.flatMap(tokenize), ...tokenize(p.full_name ?? "")]);
        let overlap = 0; for (const t of ptoks) if (roleTokens.has(t)) overlap++;
        const denom = Math.max(1, Math.min(roleTokens.size, 12));
        const score = Math.max(0, Math.min(100, Math.round((overlap / denom) * 100)));
        const already = existingNames.has((p.full_name ?? "").trim().toLowerCase());
        return {
          search_id: searchId, vacancy_id: vacancyId, tenant_id: tenantId, provider: p.provider, external_id: p.external_id,
          full_name: p.full_name, title: p.title, company: p.company, location: p.location, skills: p.skills,
          profile_url: p.profile_url, raw: p.raw, match_score: score,
          breakdown: { overlap, already_in_base: already }, consent_basis: null, candidate_id: null,
        };
      })
      .sort((a, b) => b.match_score - a.match_score);

    if (rows.length > 0) {
      // upsert по (tenant_id, provider, external_id) — повторний пошук не дублює.
      const { error: insErr } = await admin.from("sourced_profiles").upsert(rows, { onConflict: "tenant_id,provider,external_id" });
      if (insErr) console.error("sourcing-search profiles upsert error:", insErr.message);
    }

    await admin.from("sourcing_searches").update({ status: "done", result_count: rows.length, error: Object.keys(errors).length ? JSON.stringify(errors) : null }).eq("id", searchId);

    return json({
      search_id: searchId,
      total: rows.length,
      counts, skipped, errors,
      profiles: rows.slice(0, 100).map((r) => ({
        provider: r.provider, external_id: r.external_id, full_name: r.full_name, title: r.title,
        company: r.company, location: r.location, skills: r.skills, profile_url: r.profile_url, match_score: r.match_score,
        already_in_base: (r.breakdown as { already_in_base?: boolean }).already_in_base ?? false,
      })),
    });
  } catch (error) {
    console.error("sourcing-search unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
