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

// Нормалізація назв міст work.ua (легасі-російська) → українська. Основні міста;
// решта лишаються як віддав API.
const RU_UA_CITY: Record<string, string> = {
  "Киев": "Київ", "Львов": "Львів", "Днепр": "Дніпро", "Харьков": "Харків", "Одесса": "Одеса",
  "Запорожье": "Запоріжжя", "Винница": "Вінниця", "Николаев": "Миколаїв", "Ровно": "Рівне",
  "Луцк": "Луцьк", "Донецк": "Донецьк", "Луганск": "Луганськ", "Черкассы": "Черкаси",
  "Чернигов": "Чернігів", "Черновцы": "Чернівці", "Хмельницкий": "Хмельницький",
  "Ивано-Франковск": "Івано-Франківськ", "Кропивницкий": "Кропивницький", "Тернополь": "Тернопіль",
  "Сумы": "Суми", "Полтава": "Полтава", "Херсон": "Херсон", "Ужгород": "Ужгород",
  "Симферополь": "Сімферополь", "Севастополь": "Севастополь", "Мариуполь": "Маріуполь",
  "Кривой Рог": "Кривий Ріг", "Кременчуг": "Кременчук", "Белая Церковь": "Біла Церква",
  "Мелитополь": "Мелітополь", "Никополь": "Нікополь", "Бердянск": "Бердянськ",
  "Славянск": "Слов'янськ", "Краматорск": "Краматорськ", "Каменское": "Кам'янське",
  "Александрия": "Олександрія", "Умань": "Умань", "Бровары": "Бровари", "Борисполь": "Бориспіль",
  "Ирпень": "Ірпінь", "Павлоград": "Павлоград", "Каменец-Подольский": "Кам'янець-Подільський",
  "Житомир": "Житомир", "Бердичев": "Бердичів", "Изюм": "Ізюм", "Лисичанск": "Лисичанськ",
  "Северодонецк": "Сєвєродонецьк", "Ковель": "Ковель", "Нежин": "Ніжин", "Кам'янець-Подільський": "Кам'янець-Подільський",
};

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

    // ── dictionaries (для форми публікації) ───────────────────────────────
    if (action === "dictionaries") {
      const res = await fetch(`${WORKUA_BASE}/dictionaries`, { headers: workuaHeaders() });
      if (!res.ok) return json({ error: "workua_error", detail: `dictionaries ${res.status}` }, 502);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await res.json().catch(() => ({})) as Record<string, any>;
      const pick = (k: string) => (Array.isArray(data[k]) ? data[k].map((o: Record<string, unknown>) => ({ id: String(o.id), name: String(o.name ?? "") })) : []);
      // work.ua віддає назви міст російською (легасі) — нормалізуємо основні на укр.
      const town = pick("town").map((t: { id: string; name: string }) => ({ id: t.id, name: RU_UA_CITY[t.name] ?? t.name }));
      return json({
        town,
        category: pick("category"),
        jobtype: pick("jobtype"),
        experience: pick("experience"),
        education: pick("education"),
        publication_type: pick("publication_type"),
      });
    }

    // ── publish_job (створення/редагування вакансії на work.ua) ────────────
    if (action === "publish_job") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
      const { data: canEdit } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
      if (!canEdit) return json({ error: "forbidden" }, 403);
      const { data: vacancy } = await admin.from("vacancies").select("title, description, workua_job_id").eq("id", vacancyId).maybeSingle();
      const vac = vacancy as unknown as { title: string; description: string | null; workua_job_id: string | null } | null;
      if (!vac) return json({ error: "vacancy_not_found" }, 404);

      const regionId = String(body.region_id ?? "");
      const categoryIds = Array.isArray(body.category_ids) ? (body.category_ids as unknown[]).map(String).slice(0, 3) : [];
      const jobtypeIds = Array.isArray(body.jobtype_ids) ? (body.jobtype_ids as unknown[]).map(String).slice(0, 3) : [];
      const experienceId = String(body.experience_id ?? "");
      const publication = typeof body.publication === "string" ? body.publication : "";
      if (!regionId || categoryIds.length === 0 || jobtypeIds.length === 0 || !experienceId) {
        return json({ error: "invalid_body", detail: "Обов'язкові: регіон, категорія, зайнятість, досвід" }, 422);
      }

      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rawDesc = (vac.description ?? vac.title ?? "").toString();
      const htmlDesc = rawDesc.split(/\n{2,}/).map((p) => `<p>${esc(p.replace(/\n/g, " "))}</p>`).join("") || `<p>${esc(vac.title ?? "")}</p>`;

      const params = new URLSearchParams();
      params.set("name", vac.title ?? "Вакансія");
      params.set("description", htmlDesc);
      params.set("region[id]", regionId);
      categoryIds.forEach((id) => params.append("category[][id]", id));
      jobtypeIds.forEach((id) => params.append("jobtype[][id]", id));
      params.set("experience[id]", experienceId);
      if (typeof body.education_id === "string" && body.education_id) params.set("education[id]", body.education_id);
      if (body.salary_value) params.set("salary[value]", String(body.salary_value));
      if (body.salary_value_max) params.set("salary[value_max]", String(body.salary_value_max));
      if (typeof body.salary_comment === "string" && body.salary_comment) params.set("salary[comment]", body.salary_comment);
      if (publication) params.set("publication", publication);

      const isEdit = !!vac.workua_job_id;
      const res = await fetch(`${WORKUA_BASE}/jobs${isEdit ? `/${vac.workua_job_id}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: { ...workuaHeaders(), "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });
      if (res.status === 201 || res.status === 204) {
        let jobId = vac.workua_job_id;
        const loc = res.headers.get("Location");
        if (loc) { const m = loc.match(/(\d+)/); if (m) jobId = m[1]; }
        if (jobId && jobId !== vac.workua_job_id) await admin.from("vacancies").update({ workua_job_id: jobId } as never).eq("id", vacancyId);
        return json({ ok: true, job_id: jobId, published: !!publication });
      }
      const errText = await res.text().catch(() => "");
      let detail = errText.slice(0, 300);
      try {
        const p = JSON.parse(errText) as { errors?: Array<{ message?: string }> };
        if (Array.isArray(p.errors)) detail = p.errors.map((e) => e.message).filter(Boolean).join("; ");
      } catch { /* keep */ }
      return json({ error: "workua_publish_error", detail: detail || `HTTP ${res.status}` }, 400);
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
