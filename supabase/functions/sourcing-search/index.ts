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
const KNOWN_PROVIDERS = ["github", "pdl", "apollo", "proxycurl", "robotaua", "workua"] as const;
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
// Proxycurl ВИМКНЕНО: сервіс закрито 04.07.2025 після позову LinkedIn.
// LinkedIn-дані тепер — через PDL/Apollo (агреговані бази). Заглушка лишена,
// щоб не ламати тип провайдера й старі збережені запити.
async function searchProxycurl(_q: RoleQuery): Promise<NormProfile[]> {
  return [];
}

// robota.ua — employer-api CvDb (пошук по базі резюме, ~6.4M).
// Auth: POST auth-api.robota.ua/Login {username,password} → JWT (text/plain).
// Токен кешуємо в памʼяті isolate (за exp з payload, із запасом).
let robotaTokenCache: { token: string; expMs: number } | null = null;
async function getRobotaToken(): Promise<string | null> {
  const email = Deno.env.get("ROBOTAUA_EMAIL");
  const password = Deno.env.get("ROBOTAUA_PASSWORD");
  if (!email || !password) return null;
  const now = Date.now();
  if (robotaTokenCache && robotaTokenCache.expMs - 60_000 > now) return robotaTokenCache.token;
  const res = await edgeFetch("https://auth-api.robota.ua/Login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain" },
    body: JSON.stringify({ username: email, password }),
  });
  if (!res.ok) throw new Error(`robotaua login ${res.status}`);
  const token = (await res.text()).trim().replace(/^"|"$/g, "");
  if (!token) throw new Error("robotaua login: empty token");
  let expMs = now + 45 * 60_000;
  try { const p = JSON.parse(atob(token.split(".")[1])); if (p.exp) expMs = p.exp * 1000; } catch { /* keep default */ }
  robotaTokenCache = { token, expMs };
  return token;
}

// Заголовок авторизації robota.ua: пріоритет — статичний API-ключ (X-Api-Key),
// бо інтерактивний /Login захищений Cloudflare managed-challenge і з сервера не
// проходить. Логін лишаємо запасним (раптом дадуть доступ без челенджу).
// Заголовки — валідний ByteString (0x00–0xFF). Чистимо ключ від незламних
// пробілів / zero-width символів, які трапляються при копіюванні з кабінету.
function asciiHeader(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[^\x20-\x7E]/g, "").trim();
}

// Опційний релей для обходу Cloudflare-блоку серверного IP (relay/server.mjs).
const RELAY_URL = (Deno.env.get("RELAY_URL") ?? "").replace(/\/+$/, "");
const RELAY_SECRET = Deno.env.get("RELAY_SECRET") ?? "";
async function edgeFetch(url: string, init: RequestInit = {}): Promise<Response> {
  if (!RELAY_URL || !RELAY_SECRET) return fetch(url, init);
  const r = await fetch(`${RELAY_URL}/fetch`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-relay-secret": RELAY_SECRET },
    body: JSON.stringify({
      url,
      method: init.method ?? "GET",
      headers: (init.headers as Record<string, string>) ?? {},
      body: typeof init.body === "string" ? init.body : null,
    }),
  });
  if (!r.ok) return new Response(await r.text().catch(() => ""), { status: r.status });
  const data = await r.json().catch(() => ({})) as { status?: number; content_type?: string; body?: string };
  return new Response(data.body ?? "", { status: Number(data.status) || 502, headers: { "content-type": data.content_type || "application/json" } });
}
async function robotaAuthHeaders(): Promise<Record<string, string> | null> {
  const apiKey = Deno.env.get("ROBOTAUA_API_KEY");
  if (apiKey) {
    const clean = asciiHeader(apiKey);
    if (clean) return { "X-Api-Key": `ApiKey ${clean}` };
  }
  const token = await getRobotaToken();
  return token ? { Authorization: `Bearer ${asciiHeader(token)}` } : null;
}

async function searchRobotaUa(q: RoleQuery): Promise<NormProfile[]> {
  const auth = await robotaAuthHeaders();
  if (!auth) return [];
  const keyWords = [q.keywords, ...q.titles.slice(0, 1), ...q.skills.slice(0, 4)].filter(Boolean).join(" ").trim();
  const body = {
    page: 0,
    count: PER_PROVIDER_LIMIT,
    ukrainian: true,
    isSynonym: true,
    sort: "Score",
    keyWords: keyWords || undefined,
  };
  const res = await edgeFetch("https://employer-api.robota.ua/cvdb/resumes", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain", ...auth },
    body: JSON.stringify(body),
  });
  const rawText = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`robotaua ${res.status}: ${rawText.slice(0, 200)}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any = {};
  try { data = JSON.parse(rawText); } catch { /* not json */ }
  // Структура CvDb від robota гуляє — беремо перший масив із відомих ключів.
  const items: Array<Record<string, unknown>> =
    (Array.isArray(data) ? data
      : data.documents ?? data.items ?? data.resumes ?? data.result ?? data.data ?? []) as Array<Record<string, unknown>>;
  console.log(`robotaua parse: keys=${Object.keys(data || {}).join(",")} items=${items.length}`);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return items.map((d) => {
    const id = d.resumeId ?? d.id ?? d.resume_id;
    const name = str(d.fullName) || str(d.displayName) || [d.surname, d.name].filter(Boolean).join(" ").trim() || null;
    return {
      provider: "robotaua" as const,
      external_id: String(id ?? crypto.randomUUID()),
      full_name: name,
      title: str(d.speciality) || str(d.position) || str(d.title),
      company: null,
      location: str(d.cityName) || str(d.city) || str(d.cityNameEn),
      skills: Array.isArray(d.keywords) ? (d.keywords as string[]).slice(0, 40) : (Array.isArray(d.skills) ? (d.skills as string[]).slice(0, 40) : []),
      profile_url: str(d.url) ?? (id ? `https://robota.ua/candidates/${id}` : null),
      raw: d,
    };
  });
}

// work.ua — пошук по базі резюме (Basic Auth). Мапимо ЛИШЕ не-контактні поля
// (ПІБ, посада, місто, лінк). Увага: /resumes може списувати квоту контактів —
// вмикайте свідомо. Без відкриття контактів надійніший шлях — відгуки на
// опубліковану вакансію (WorkuaResponsesCard → import_responses).
async function searchWorkUa(q: RoleQuery): Promise<NormProfile[]> {
  const email = Deno.env.get("WORKUA_EMAIL");
  const password = Deno.env.get("WORKUA_PASSWORD");
  if (!email || !password) return [];
  const search = [q.keywords, ...q.titles.slice(0, 1), ...q.skills.slice(0, 4)].filter(Boolean).join(" ").trim();
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("limit", String(Math.min(100, Math.max(10, PER_PROVIDER_LIMIT))));
  params.set("page", "1");
  params.set("sort", "1");
  const res = await fetch(`https://api.work.ua/resumes?${params}`, {
    headers: {
      Authorization: `Basic ${btoa(`${email}:${password}`)}`,
      "User-Agent": `Metaprofile ATS (${email})`,
      "X-Locale": "uk_UA",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`workua ${res.status}: ${(await res.text().catch(() => "")).slice(0, 150)}`);
  const data = await res.json() as { result?: Array<Record<string, unknown>> };
  return (data.result ?? []).map((r) => {
    const fn = [r.first_name, r.last_name].filter(Boolean).join(" ").trim();
    return {
      provider: "workua" as const,
      external_id: String(r.resume_id ?? r.id ?? crypto.randomUUID()),
      full_name: fn || (r.name as string) || null,
      title: (r.name as string) ?? null,
      company: null,
      location: (r.region as string) ?? null,
      skills: [],
      profile_url: r.resume_id ? `https://www.work.ua/resumes/${r.resume_id}/` : null,
      raw: { ...r, contacts: undefined },
    };
  });
}

const PROVIDER_FN: Record<Provider, (q: RoleQuery) => Promise<NormProfile[]>> = {
  github: searchGitHub, pdl: searchPDL, apollo: searchApollo, proxycurl: searchProxycurl, robotaua: searchRobotaUa, workua: searchWorkUa,
};
const PROVIDER_SECRET: Record<Provider, string> = {
  github: "GITHUB_TOKEN", pdl: "PDL_API_KEY", apollo: "APOLLO_API_KEY", proxycurl: "PROXYCURL_API_KEY", robotaua: "ROBOTAUA_API_KEY", workua: "WORKUA_EMAIL",
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
