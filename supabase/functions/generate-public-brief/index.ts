// ============================================================
// generate-public-brief — AI-чернетка бріфу для КАНДИДАТІВ
// ============================================================
// Dual job profile: внутрішній бріф (68 питань із замовником) — джерело правди,
// але кандидату його показувати не можна. Ця функція робить із нього ПУБЛІЧНУ
// проекцію: опис позиції, мета, зони відповідальності, вимоги, умови — без
// конфіденційного (імені клієнта, якщо пошук закритий; внутрішніх причин
// відкриття вакансії; оцінок попередника; фін-даних агенції).
//
// Контракт:
//   POST { vacancy_id: uuid, extra_notes?: string, disclose_client?: boolean }
//   200 { ok: true, title, intro, sections: [{heading, body}], model }
//   401 unauthorized | 403 forbidden | 404 vacancy_not_found
//   422 invalid_body | 428 brief_empty | 503 ai_not_configured
//
// Рішення завжди за людиною: функція нічого не зберігає — повертає чернетку,
// яку рекрутер редагує і зберігає сам (vacancy_public_briefs).
//
// Secrets: ANTHROPIC_API_KEY (required), ANTHROPIC_MODEL (optional).
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 8192;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const SYSTEM_PROMPT = `Ти — консультант executive search агенції MetaVision Consulting.
Готуєш «Бріф для кандидатів» — документ, який кандидат отримує ПЕРЕД співбесідою.

Джерело: внутрішній бріф із замовником (68 питань), матриця компетенцій і стратегія пошуку.
Твоє завдання — зробити з цього чистий, привабливий і чесний опис позиції українською.

ЗАБОРОНЕНО виносити в публічний документ:
- назву компанії-клієнта, якщо явно не дозволено (пиши «Наш Клієнт — <опис без назви>»);
- внутрішні причини відкриття вакансії (конфлікти, звільнення, оцінки попередника);
- фінансові умови агенції, внутрішні ризики, оцінки кандидатів;
- будь-що, що звучить як внутрішня кухня замовника.

Структура документа (пропускай секцію, якщо даних немає — не вигадуй):
1. Загальна інформація про позицію (назва, тип залучення, функція, локація, підпорядкування, мови)
2. Мета посади
3. Ключові зони відповідальності
4. Поза зоною відповідальності (якщо є розмежування з іншими ролями)
5. Вимоги до досвіду (обовʼязковий / бажаний)
6. Вимоги до знань
7. Компетенції та особисті якості
8. Умови (те, що можна розкривати кандидату)
9. Процес відбору (етапи)

Стиль: діловий, конкретний, без маркетингової води й без канцеляриту.
Жодних вигаданих фактів: чого немає у вхідних даних — того немає в документі.

Формат відповіді — СТРОГО JSON без markdown-огорожі:
{"title": "<назва позиції>",
 "intro": "<1–2 абзаци про Клієнта і контекст, без назви компанії якщо не дозволено>",
 "sections": [{"heading": "<заголовок>", "body": "<текст, можна markdown-списки>"}]}`;

async function callAnthropic(system: string, userContent: string) {
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
    });
  } catch (e) {
    return { ok: false as const, status: 502, message: `Network error: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return { ok: false as const, status: res.status, message: detail.slice(0, 300) };
  }
  const data = (await res.json().catch(() => null)) as
    | { content?: Array<{ type?: string; text?: string }> }
    | null;
  const text = data?.content?.find((b) => b?.type === "text" && typeof b.text === "string")?.text;
  if (!text) return { ok: false as const, status: 502, message: "Model returned no text" };
  return { ok: true as const, text };
}

interface BriefDraft {
  title: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}

function parseDraft(text: string): BriefDraft | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as Partial<BriefDraft>;
    if (!Array.isArray(parsed.sections)) return null;
    const sections = parsed.sections
      .filter((s) => s && typeof s.heading === "string" && typeof s.body === "string")
      .map((s) => ({ heading: s.heading as string, body: s.body as string }));
    if (sections.length === 0) return null;
    return {
      title: typeof parsed.title === "string" ? parsed.title : "",
      intro: typeof parsed.intro === "string" ? parsed.intro : "",
      sections,
    };
  } catch {
    return null;
  }
}

/** Плаский дамп відповідей брифу: "питання: відповідь" (порожні пропускаємо). */
function formatAnswers(answers: unknown): string {
  if (!answers || typeof answers !== "object") return "";
  return Object.entries(answers as Record<string, unknown>)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `- ${k}: ${(v as string).trim()}`)
    .join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
    const discloseClient = body.disclose_client === true;
    const extraNotes =
      typeof body.extra_notes === "string" ? body.extra_notes.trim().slice(0, 4_000) : "";

    // Право писати артефакти вакансії = право редагувати вакансію.
    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", {
      p_vacancy_id: vacancyId,
    });
    if (scopeErr) {
      console.error("generate-public-brief scope:", scopeErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    const [{ data: vacancy }, { data: brief }, { data: competencies }, { data: strategy }] =
      await Promise.all([
        admin
          .from("vacancies")
          .select(
            "id, title, description, location, is_remote, employment_type, headcount, " +
              "hiring_project:hiring_projects(name, client:clients(name, industry))",
          )
          .eq("id", vacancyId)
          .maybeSingle(),
        admin.from("vacancy_briefs").select("answers, status").eq("vacancy_id", vacancyId).maybeSingle(),
        admin
          .from("vacancy_competencies")
          .select("name, group_name, weight, is_must_have")
          .eq("vacancy_id", vacancyId)
          .order("position"),
        admin
          .from("vacancy_search_strategies")
          .select("focus, industries, target_titles, profile_musts, out_of_scope")
          .eq("vacancy_id", vacancyId)
          .maybeSingle(),
      ]);

    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);

    const answersText = formatAnswers(brief?.answers);
    if (!answersText && !vacancy.description) {
      // Нема з чого робити публічний бріф — чесна відмова замість галюцинації.
      return json({ error: "brief_empty" }, 428);
    }

    const client = (vacancy as { hiring_project?: { client?: { name?: string; industry?: string } } })
      .hiring_project?.client;

    const competencyLines = (competencies ?? [])
      .map(
        (c) =>
          `- ${c.name}${c.is_must_have ? " (must-have)" : ""}` +
          `${c.group_name ? ` [${c.group_name}]` : ""} — вага ${c.weight}`,
      )
      .join("\n");

    const userContent = [
      `ПОЗИЦІЯ: ${vacancy.title}`,
      vacancy.location ? `Локація: ${vacancy.location}${vacancy.is_remote ? " (можливо віддалено)" : ""}` : "",
      `Тип зайнятості: ${vacancy.employment_type}`,
      discloseClient && client?.name
        ? `Клієнт (МОЖНА називати): ${client.name}${client.industry ? `, галузь: ${client.industry}` : ""}`
        : `Клієнт: НЕ називати. Галузь клієнта: ${client?.industry ?? "—"}. Пиши «Наш Клієнт — …».`,
      vacancy.description ? `\nОпис вакансії:\n${vacancy.description}` : "",
      answersText ? `\nВНУТРІШНІЙ БРІФ ІЗ ЗАМОВНИКОМ (не цитувати конфіденційне):\n${answersText}` : "",
      competencyLines ? `\nМАТРИЦЯ КОМПЕТЕНЦІЙ:\n${competencyLines}` : "",
      strategy?.focus ? `\nСТРАТЕГІЯ ПОШУКУ (фокус): ${strategy.focus}` : "",
      strategy?.out_of_scope ? `Поза скоупом: ${strategy.out_of_scope}` : "",
      extraNotes ? `\nДОДАТКОВІ ВКАЗІВКИ РЕКРУТЕРА:\n${extraNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = await callAnthropic(SYSTEM_PROMPT, userContent);
    if (!result.ok) {
      console.error("generate-public-brief model error:", result.message);
      return json({ error: "model_error", detail: result.message }, 502);
    }

    const draft = parseDraft(result.text);
    if (!draft) return json({ error: "model_error", detail: "Не вдалося розібрати відповідь моделі" }, 502);

    return json({ ok: true, ...draft, model: ANTHROPIC_MODEL });
  } catch (e) {
    console.error("generate-public-brief unexpected:", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
