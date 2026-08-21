// supabase/functions/robota-connector/index.ts
//
// Metaprofile ATS — інтеграція Robota.ua (employer-api.robota.ua).
//
// Дії:
//   • list_jobs        — POST /vacancy/list (вакансії акаунта) — для вибору vacancy_id.
//   • dictionaries     — GET /values/citylist + /values/vacancy/publicationtype
//                        + статичні employment/work types (для форми публікації).
//   • publish_job      — POST /vacancy/add (id=0 нова / id — редагування) →
//                        POST /vacancy/state/{id}?state=Publicated (якщо публікуємо).
//                        Перечитує стан через /vacancy/get/{id}.
//   • import_responses — POST /apply/list → створює кандидатів + заявки у воронку
//                        (дедуп robotaua_synced_responses).
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt). list_jobs/dictionaries/available — owner/admin.
//   publish_job/import_responses — mp_can_edit_vacancy(vacancy_id).
//   Robota.ua — X-Api-Key (ROBOTAUA_API_KEY) у пріоритеті; /Login як запасний.
//
// Deploy:  supabase functions deploy robota-connector   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROBOTA_BASE = "https://employer-api.robota.ua";

// Статичні довідники robota.ua (за докою /vacancy/add).
const EMPLOYMENT_TYPES = [
  { id: "FullTime", name: "Повна зайнятість" },
  { id: "PartTime", name: "Часткова зайнятість" },
  { id: "ProjectBased", name: "Проектна робота" },
  { id: "Shift", name: "Позмінна робота" },
];
const WORK_TYPES = [
  { id: "Remote", name: "Віддалена" },
  { id: "Hybrid", name: "Гібридна" },
  { id: "Office", name: "В офісі / на місці" },
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

// Заголовок авторизації robota.ua: пріоритет — статичний API-ключ (X-Api-Key);
// /Login запасний (Cloudflare managed-challenge часто ріже його з сервера).
let robotaTokenCache: { token: string; expMs: number } | null = null;
async function getRobotaToken(): Promise<string | null> {
  const email = Deno.env.get("ROBOTAUA_EMAIL");
  const password = Deno.env.get("ROBOTAUA_PASSWORD");
  if (!email || !password) return null;
  const now = Date.now();
  if (robotaTokenCache && robotaTokenCache.expMs - 60_000 > now) return robotaTokenCache.token;
  const res = await fetch("https://auth-api.robota.ua/Login", {
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
// Заголовки мають бути валідним ByteString (лише 0x00–0xFF). Ключі, скопійовані
// з кабінету, часом містять незламні пробіли / zero-width символи — чистимо.
function asciiHeader(v: string): string {
  // eslint-disable-next-line no-control-regex
  return v.replace(/[^\x20-\x7E]/g, "").trim();
}
// Схема авторизації employer-api невідома напевно (swagger за Cloudflare):
// у доці згадано лише Bearer, але видано «API-ключ». Тому пробуємо кілька
// варіантів і кешуємо той, що не дав 401/403.
function robotaAuthVariants(): Record<string, string>[] {
  const apiKey = Deno.env.get("ROBOTAUA_API_KEY");
  const out: Record<string, string>[] = [];
  if (apiKey) {
    const k = asciiHeader(apiKey);
    if (k) {
      out.push({ Authorization: `Bearer ${k}` });
      out.push({ "X-Api-Key": `ApiKey ${k}` });
      out.push({ "X-Api-Key": k });
    }
  }
  return out;
}
function robotaConfigured(): boolean {
  return robotaAuthVariants().length > 0 || (!!Deno.env.get("ROBOTAUA_EMAIL") && !!Deno.env.get("ROBOTAUA_PASSWORD"));
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
let robotaWorkingAuth = 0;
async function robotaFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let variants = robotaAuthVariants();
  if (variants.length === 0) {
    const token = await getRobotaToken().catch(() => null);
    if (token) variants = [{ Authorization: `Bearer ${asciiHeader(token)}` }];
  }
  if (variants.length === 0) throw new Error("robotaua_not_configured");
  const baseHeaders = { Accept: "application/json", ...(init.headers as Record<string, string> | undefined) };
  const order = [robotaWorkingAuth, ...variants.map((_, i) => i).filter((i) => i !== robotaWorkingAuth)];
  let last: Response | null = null;
  for (const i of order) {
    const v = variants[i];
    if (!v) continue;
    const res = await edgeFetch(url, { ...init, headers: { ...baseHeaders, ...v } });
    if (res.status !== 401 && res.status !== 403) { robotaWorkingAuth = i; return res; }
    last = res;
  }
  return last as Response;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickList(data: any, keys: string[]): any[] {
  if (Array.isArray(data)) return data;
  for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
  return [];
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

    if (!robotaConfigured()) return json({ error: "robotaua_not_configured" }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const action = typeof body.action === "string" ? body.action : "";

    // ── list_jobs ─────────────────────────────────────────────────────────
    if (action === "list_jobs") {
      const { data: isAdmin } = await asCaller.rpc("mp_is_workspace_admin");
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      const res = await robotaFetch(`${ROBOTA_BASE}/vacancy/list`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 0 }),
      });
      if (!res.ok) {
        const bodyText = (await res.text().catch(() => "")).slice(0, 400);
        const cf = res.headers.get("cf-ray") || /cloudflare|Attention Required|Just a moment|<!DOCTYPE html/i.test(bodyText);
        return json({
          error: "robotaua_error",
          detail: `vacancy/list ${res.status}${cf ? " · схоже на Cloudflare-блок серверного IP" : ""}: ${bodyText || "(порожнє тіло)"}`,
          cloudflare: !!cf,
        }, 502);
      }
      const data = await res.json().catch(() => ({}));
      const items = pickList(data, ["documents", "items", "vacancies", "result"]);
      const jobs = items.map((v) => {
        const state = String(v.state ?? v.stateName ?? v.vacancyState ?? "").toLowerCase();
        return { id: String(v.id ?? v.vacancyId ?? ""), name: v.name ?? v.title ?? "Вакансія", active: state === "publicated" || v.isActive === true };
      }).filter((j) => j.id);
      return json({ jobs });
    }

    // ── dictionaries ──────────────────────────────────────────────────────
    if (action === "dictionaries") {
      const [cityRes, pubRes] = await Promise.all([
        robotaFetch(`${ROBOTA_BASE}/values/citylist`),
        robotaFetch(`${ROBOTA_BASE}/values/vacancy/publicationtype`),
      ]);
      if (!cityRes.ok) {
        const bodyText = (await cityRes.text().catch(() => "")).slice(0, 400);
        const cf = cityRes.headers.get("cf-ray") || /cloudflare|Attention Required|Just a moment|<!DOCTYPE html/i.test(bodyText);
        return json({
          error: "robotaua_error",
          detail: `citylist ${cityRes.status}${cf ? " · схоже на Cloudflare-блок серверного IP" : ""}: ${bodyText || "(порожнє тіло)"}`,
          cloudflare: !!cf,
        }, 502);
      }
      const cityData = await cityRes.json().catch(() => ([]));
      const city = pickList(cityData, ["documents", "items", "cities", "result"])
        .map((c) => ({ id: String(c.id ?? c.cityId ?? ""), name: String(c.name ?? c.title ?? "") }))
        .filter((c) => c.id && c.name);
      let publication_type = [
        { id: "Business", name: "Бізнес" },
        { id: "Optimum", name: "Оптимум" },
        { id: "Professional", name: "Професійна" },
        { id: "Anonym", name: "Анонімна" },
      ];
      if (pubRes.ok) {
        const pd = await pubRes.json().catch(() => ([]));
        const list = pickList(pd, ["documents", "items", "result"])
          .map((p) => ({ id: String(p.id ?? p.type ?? p.name ?? ""), name: String(p.name ?? p.title ?? p.id ?? "") }))
          .filter((p) => p.id);
        if (list.length) publication_type = list;
      }
      return json({ city, publication_type, employment_type: EMPLOYMENT_TYPES, work_type: WORK_TYPES });
    }

    // ── publish_job ───────────────────────────────────────────────────────
    if (action === "publish_job") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
      const { data: canEdit } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
      if (!canEdit) return json({ error: "forbidden" }, 403);
      const { data: vacancy } = await admin.from("vacancies").select("title, description, robotaua_vacancy_id").eq("id", vacancyId).maybeSingle();
      const vac = vacancy as unknown as { title: string; description: string | null; robotaua_vacancy_id: string | null } | null;
      if (!vac) return json({ error: "vacancy_not_found" }, 404);

      const cityId = Number(body.city_id);
      const publishType = String(body.publish_type ?? "");
      const employmentTypes = Array.isArray(body.employment_types) ? (body.employment_types as unknown[]).map(String) : [];
      const workTypes = Array.isArray(body.work_types) ? (body.work_types as unknown[]).map(String) : [];
      const description = (vac.description ?? "").toString().trim();
      if (!cityId || !publishType) return json({ error: "invalid_body", detail: "Обов'язкові: місто, тип публікації" }, 422);
      if (description.length < 150) {
        return json({ error: "description_too_short", detail: `Robota.ua вимагає опис від 150 символів (зараз ${description.length}). Доповніть опис вакансії.` }, 422);
      }

      const doPublish = body.publish === true || body.publish === "true";
      const existingId = vac.robotaua_vacancy_id ? Number(vac.robotaua_vacancy_id) : 0;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        id: existingId || 0,
        cityId,
        name: vac.title ?? "Вакансія",
        description,
        publishType,
        sendResumeType: "3", // тільки в розділ «Відгуки» на сайті (щоб тягнути через /apply/list)
      };
      if (body.salary_value) payload.salary = Number(body.salary_value);
      if (body.salary_from || body.salary_to) {
        payload.salaryRange = { amountFrom: Number(body.salary_from ?? 0), amountTo: Number(body.salary_to ?? 0) };
      }
      if (typeof body.salary_comment === "string" && body.salary_comment) payload.salaryDescr = body.salary_comment;
      if (employmentTypes.length) payload.employmentTypes = employmentTypes;
      if (workTypes.length) payload.workTypes = workTypes;
      if (body.is_for_student === true) payload.isForStudent = true;

      const addRes = await robotaFetch(`${ROBOTA_BASE}/vacancy/add`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const addText = await addRes.text().catch(() => "");
      if (!addRes.ok) {
        let detail = addText.slice(0, 300);
        try { const p = JSON.parse(addText); detail = p.message || p.error || (Array.isArray(p.errors) ? p.errors.map((e: { message?: string }) => e.message).join("; ") : detail); } catch { /* keep */ }
        return json({ error: "robotaua_publish_error", detail: detail || `HTTP ${addRes.status}` }, 400);
      }
      // id вакансії — з тіла відповіді (число / {id}) або лишаємо існуючий.
      let vacId = existingId;
      try { const p = JSON.parse(addText); vacId = Number(p?.id ?? p?.vacancyId ?? p) || existingId; }
      catch { const n = Number(addText.replace(/[^0-9]/g, "")); if (n) vacId = n; }
      if (vacId && String(vacId) !== vac.robotaua_vacancy_id) {
        await admin.from("vacancies").update({ robotaua_vacancy_id: String(vacId) } as never).eq("id", vacancyId);
      }

      // Публікація статусу.
      let published = false;
      if (doPublish && vacId) {
        const stRes = await robotaFetch(`${ROBOTA_BASE}/vacancy/state/${vacId}?state=Publicated`, { method: "POST" });
        if (!stRes.ok) {
          const st = await stRes.text().catch(() => "");
          let detail = st.slice(0, 300);
          try { const p = JSON.parse(st); detail = p.message || p.error || detail; } catch { /* keep */ }
          return json({ error: "robotaua_state_error", detail: detail || `state HTTP ${stRes.status}`, job_id: String(vacId) }, 400);
        }
      }
      // Перечитуємо реальний стан.
      if (vacId) {
        const getRes = await robotaFetch(`${ROBOTA_BASE}/vacancy/get/${vacId}`);
        if (getRes.ok) {
          const jd = await getRes.json().catch(() => ({})) as Record<string, unknown>;
          const state = String(jd.state ?? jd.stateName ?? jd.vacancyState ?? "").toLowerCase();
          published = state === "publicated";
        } else if (doPublish) {
          published = true; // state прийнято, але get недоступний — вважаємо опублікованою
        }
      }
      const note = doPublish && !published
        ? "Robota.ua створив вакансію, але вона неактивна. Найімовірніше, бракує куплених публікацій цього типу — перевірте баланс на robota.ua."
        : undefined;
      return json({ ok: true, job_id: vacId ? String(vacId) : null, published, requested: doPublish, note });
    }

    // ── import_responses ──────────────────────────────────────────────────
    if (action === "import_responses") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
      const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
      if (scopeErr) { console.error("robota scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
      if (!canEdit) return json({ error: "forbidden" }, 403);

      const { data: vacancy } = await admin.from("vacancies").select("id, tenant_id, robotaua_vacancy_id").eq("id", vacancyId).maybeSingle();
      const vac = vacancy as unknown as { tenant_id: string | null; robotaua_vacancy_id: string | null } | null;
      if (!vac) return json({ error: "vacancy_not_found" }, 404);
      if (!vac.robotaua_vacancy_id) return json({ error: "no_robotaua_job", detail: "Спершу опублікуйте/прив'яжіть вакансію robota.ua" }, 422);

      const res = await robotaFetch(`${ROBOTA_BASE}/apply/list`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacancyId: Number(vac.robotaua_vacancy_id), folderId: 0, page: 0, filter: "" }),
      });
      if (!res.ok) return json({ error: "robotaua_error", detail: `apply/list ${res.status}: ${(await res.text().catch(() => "")).slice(0, 150)}` }, 502);
      const data = await res.json().catch(() => ({}));
      const items = pickList(data, ["documents", "items", "applies", "result"]);

      const { data: src } = await admin.from("candidate_sources").select("id").eq("name", "Robota.ua").limit(1).maybeSingle();
      const sourceId = (src as { id: string } | null)?.id ?? null;
      const { data: firstStage } = await admin.from("pipeline_stages").select("id").eq("vacancy_id", vacancyId).order("position", { ascending: true }).limit(1).maybeSingle();
      const firstStageId = (firstStage as { id: string } | null)?.id ?? null;

      const { data: synced } = await admin.from("robotaua_synced_responses").select("response_id").eq("vacancy_id", vacancyId);
      const seen = new Set((synced ?? []).map((s) => (s as { response_id: string }).response_id));

      let imported = 0, skipped = 0;
      for (const it of items) {
        const responseId = String(it.id ?? it.applyId ?? "");
        if (!responseId || seen.has(responseId)) { skipped++; continue; }
        const fullName = (it.name as string) || (it.fullName as string) || [it.firstName, it.lastName].filter(Boolean).join(" ") || "Без імені";
        const notes = [it.coverLetter, it.text, it.speciality].filter((x) => typeof x === "string" && x.trim()).join("\n---\n").slice(0, 4000) || null;
        const { data: cand, error: cErr } = await admin.from("ats_candidates").insert({
          full_name: fullName,
          email: (it.email as string) || null,
          phone: (it.phone as string) || null,
          notes,
          resume_text: typeof it.text === "string" ? it.text.slice(0, 8000) : null,
          source_id: sourceId,
          tenant_id: vac.tenant_id,
        }).select("id").single();
        if (cErr) { console.error("robota candidate insert:", cErr.message); skipped++; continue; }
        const candidateId = (cand as { id: string }).id;
        await admin.from("applications").insert({
          vacancy_id: vacancyId, candidate_id: candidateId, list_state: "long_list",
          ...(firstStageId ? { current_stage_id: firstStageId } : {}), tenant_id: vac.tenant_id,
        });
        await admin.from("robotaua_synced_responses").insert({
          vacancy_id: vacancyId, response_id: responseId, candidate_id: candidateId, tenant_id: vac.tenant_id,
        });
        seen.add(responseId);
        imported++;
      }
      return json({ imported, skipped, total: items.length });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("robota-connector unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
