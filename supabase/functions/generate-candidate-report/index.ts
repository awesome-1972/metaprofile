// supabase/functions/generate-candidate-report/index.ts
//
// Metaprofile ATS — фаза M4c — Edge Function: generate-candidate-report.
//
// Реалізує Epic E (docs/requirements/ats-agency-features.md, US-E03) — AI-звіт
// для клієнта по кандидату (kind='candidate_report') або порівняльний звіт по
// всіх кандидатах вакансії (kind='comparative_report'), на основі:
//   • брифу вакансії (vacancy_briefs.answers, БЕЗ фінансової частини, якщо
//     викликач не має can_view_financials — SEC-04/SEC-05-подібний гейт,
//     Epic E сценарій 5 ATS-вимог);
//   • матриці компетенцій вакансії (vacancy_competencies) + оцінок кандидата
//     (competency_scores) — зважений бал і фінальна оцінка з порогами
//     Додатку A (2.34–3.00 висока / 1.67–2.33 середня / 1.00–1.66 низька);
//   • промту з vacancy_prompts (kind-специфічний) або дефолтного промту за
//     структурою Додатку A (доказовість, факт/оцінка/припущення, не вигадувати);
//   • транскрипції інтерв'ю (вхідний параметр transcript — interviews.transcript
//     ще не існує в схемі, Q3 ATS-вимог відкрите; MVP приймає текст напряму
//     з тіла запиту, вставлений рекрутером вручну) і extra_notes.
//
// ── AUTH-КОНТРАКТ (мирор grant-management, розділ 7.2.0/7.2.1) ──────────────
//   • service_role client всередині функції — RLS bypass ЛИШЕ тут.
//   • Викликач верифікується через supabase.auth.getUser(jwt) з Authorization
//     заголовка — НІКОЛИ з body.
//   • Scope: mp_can_access_vacancy(vacancy_id) через RPC ПІД ANON-КЛІЄНТОМ,
//     що НЕСЕ JWT викликача (не service_role client) — auth.uid() у security
//     definer функції резолвиться з цього JWT, так само як access_grants RLS
//     резолвив би auth.uid() у звичайному запиті.
//   • created_by у candidate_reports = caller.id (з JWT), ніколи з body.
//   • Фінансовий гейт: mp_can_view_vacancy_financials(vacancy_id) — та сама
//     RPC-під-JWT техніка; якщо false, фінансова частина брифу просто НЕ
//     запитується (service_role client її й не читає для цього виклику).
//
// ── ANTHROPIC PROVIDER (Messages API, мирор c2c-extract) ────────────────────
//   POST https://api.anthropic.com/v1/messages, x-api-key ANTHROPIC_API_KEY,
//   model ANTHROPIC_MODEL (дефолт claude-sonnet-4-6), max_tokens 8192.
//   Немає forced tool call — вихід очікується як вільний markdown-текст
//   (звіт для клієнта, не структуровані дані), тому просто читаємо
//   content[0].text з відповіді.
//   ANTHROPIC_API_KEY відсутній → 503 (жодного фейкового звіту-заглушки).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { application_id?: uuid, vacancy_id: uuid,
//          kind: 'candidate_report' | 'comparative_report',
//          transcript?: string, extra_notes?: string }
//     200 { report_id: uuid, content_md: string }
//
//   401 { error: "unauthorized" }
//   403 { error: "forbidden" }             — немає mp_can_access_vacancy
//   404 { error: "vacancy_not_found" | "application_not_found" }
//   422 { error: "invalid_body" | "invalid_kind" | "missing_competency_matrix"
//               | "missing_scores" | "invalid_application_for_vacancy" }
//   503 { error: "ai_not_configured" }
//   502 { error: "ai_provider_error", detail }
//   500 { error: "server_error" }
//
// Файл із лого агенції (docx/pdf) — ПОЗА СКОУПОМ цієї Edge Function. MVP
// повертає лише markdown (content_md); брендований файл-рендерер — наступний
// крок (окрема функція + Supabase Storage bucket для готових файлів звітів).
//
// Deploy:  supabase functions deploy generate-candidate-report
// Secrets: ANTHROPIC_API_KEY (required; відсутній → 503),
//          ANTHROPIC_MODEL   (optional; дефолт claude-sonnet-4-6).
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned.
// config:  verify_jwt = true (звичайний користувацький JWT; scope перевіряється
//          вручну всередині через RPC — verify_jwt лише перевіряє підпис).

import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS -------------------------------------------------------------
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REPORT_KINDS = new Set(["candidate_report", "comparative_report"]);

// Native Anthropic Messages API (мирор c2c-extract).
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 8192;

// Hard caps — захист бюджету провайдера від надмірно довгих вхідних текстів.
const MAX_TRANSCRIPT_CHARS = 200_000;
const MAX_NOTES_CHARS = 10_000;

// Пороги відповідності — Додаток A ATS-вимог (шкала фінального зваженого бала
// по компетенціях, вага 0..1 на компетенцію, оцінка 1..3 на компетенцію).
const THRESHOLD_HIGH = 2.34; // 2.34–3.00 висока відповідність
const THRESHOLD_MEDIUM = 1.67; // 1.67–2.33 середня відповідність
// нижче 1.67 → 1.00–1.66 низька відповідність

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function asBoundedString(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

interface CompetencyRow {
  id: string;
  group_name: string;
  group_weight: number;
  name: string;
  name_en: string | null;
  questions: unknown;
  weight: number;
  position: number;
}
interface ScoreRow {
  competency_id: string;
  score: number;
  note: string | null;
}

// Зважений фінальний бал: сума(вага_компетенції × бал) / сума(ваг оцінених
// компетенцій). Не вигадуємо формулу «власника» понад Додаток A — це
// найпростіша зважена інтерпретація «вага × оцінка», що збігається зі
// зразком (фінальний бал компетенції = вага × оцінка; загальний бал —
// нормалізована сума, щоб лишитись у шкалі 1..3 для порогів 2.34/1.67).
function computeWeightedScore(
  competencies: CompetencyRow[],
  scores: ScoreRow[],
): { weightedScore: number | null; totalWeightScored: number; totalWeight: number; verdict: string | null } {
  const scoreByCompetency = new Map(scores.map((s) => [s.competency_id, s.score]));
  let weightedSum = 0;
  let totalWeightScored = 0;
  let totalWeight = 0;

  for (const c of competencies) {
    totalWeight += c.weight;
    const score = scoreByCompetency.get(c.id);
    if (score === undefined) continue;
    weightedSum += c.weight * score;
    totalWeightScored += c.weight;
  }

  if (totalWeightScored === 0) {
    return { weightedScore: null, totalWeightScored, totalWeight, verdict: null };
  }

  const weightedScore = weightedSum / totalWeightScored;
  let verdict: string;
  if (weightedScore >= THRESHOLD_HIGH) verdict = "висока відповідність";
  else if (weightedScore >= THRESHOLD_MEDIUM) verdict = "середня відповідність";
  else verdict = "низька відповідність";

  return { weightedScore, totalWeightScored, totalWeight, verdict };
}

function formatCompetencyMatrix(
  competencies: CompetencyRow[],
  scores: ScoreRow[],
  candidateLabel: string,
): string {
  const scoreByCompetency = new Map(scores.map((s) => [s.competency_id, s]));
  const byGroup = new Map<string, { weight: number; items: CompetencyRow[] }>();
  for (const c of competencies) {
    const g = byGroup.get(c.group_name) ?? { weight: c.group_weight, items: [] };
    g.items.push(c);
    byGroup.set(c.group_name, g);
  }

  const lines: string[] = [`### Матриця компетенцій — ${candidateLabel}`, ""];
  for (const [groupName, group] of byGroup) {
    lines.push(`#### Група: ${groupName} (вага групи ${group.weight})`);
    for (const c of group.items) {
      const s = scoreByCompetency.get(c.id);
      const scoreText = s ? `${s.score}/3` : "не оцінено";
      const noteText = s?.note ? ` — коментар рекрутера: ${s.note}` : "";
      const nameLabel = c.name_en ? `${c.name} / ${c.name_en}` : c.name;
      lines.push(`- **${nameLabel}** (вага ${c.weight}): бал ${scoreText}${noteText}`);
      const questions = Array.isArray(c.questions) ? c.questions : [];
      for (const q of questions) {
        if (typeof q === "string" && q.trim()) lines.push(`  - питання: ${q}`);
      }
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ── Дефолтний промт (Додаток A п.2) — використовується, якщо на вакансії
// немає власного запису у vacancy_prompts для цього kind. ─────────────────
function buildDefaultSystemPrompt(kind: "candidate_report" | "comparative_report"): string {
  const base = [
    "Ти — асистент рекрутингової агенції, що готує звіт для КЛІЄНТА агенції",
    "(роботодавця) по кандидату(-ах) на вакансію.",
    "",
    "ПРАВИЛА СТИЛЮ (обов'язкові, не порушувати):",
    "1. Доказовість: кожне твердження про кандидата має спиратись на джерело",
    "   (транскрипт співбесіди, оцінка по матриці компетенцій, нотатки",
    "   рекрутера). Не роби висновків, не підкріплених наданими даними.",
    "2. Чітко розрізняй ФАКТ (сказане кандидатом / зафіксоване в оцінці),",
    "   ОЦІНКУ (твоя інтерпретація факту) і ПРИПУЩЕННЯ (гіпотеза, що прямо",
    "   позначена як припущення). Ніколи не подавай припущення як факт.",
    "3. НІКОЛИ не вигадуй дані, яких немає у вхідних матеріалах (досвід,",
    "   навички, цифри, дати). Якщо дані відсутні — прямо вкажи, що інформація",
    "   не надана, замість заповнення прогалини вигаданим змістом.",
    "4. Не згадуй жодних фінансових умов (зарплатна вилка, бонуси, fee",
    "   агенції), якщо вони explicitly не передані тобі в контексті цього",
    "   запиту.",
    "5. Пиши українською, професійним, нейтральним тоном для клієнта-",
    "   роботодавця.",
  ];

  if (kind === "candidate_report") {
    base.push(
      "",
      "СТРУКТУРА ЗВІТУ (Додаток A):",
      "1. Загальна відповідність позиції (короткий висновок + фінальна оцінка).",
      "2. Сильні сторони кандидата.",
      "3. Зони ризику з рівнем критичності (низька/середня/висока).",
      "4. Таблиця по групах компетенцій з обґрунтуванням кожної оцінки.",
      "5. Рекомендація рекрутера (якщо надана в контексті).",
    );
  } else {
    base.push(
      "",
      "СТРУКТУРА ЗВІТУ (порівняльний, Додаток A):",
      "1. Короткий вступ — по яких кандидатах і на яку позицію складено звіт.",
      "2. Порівняльна таблиця кандидатів по загальній оцінці та групах",
      "   компетенцій.",
      "3. Сильні і слабкі сторони кожного кандидата.",
      "4. Підсумкова рекомендація агенції — кого рекомендовано розглянути в",
      "   пріоритеті, з обґрунтуванням.",
    );
  }
  return base.join("\n");
}

function formatBriefForPrompt(answers: unknown, financialAnswers: unknown | null): string {
  const lines: string[] = ["### Бріф вакансії (відповіді клієнта)", ""];
  if (answers && typeof answers === "object") {
    lines.push("```json", JSON.stringify(answers, null, 2), "```");
  } else {
    lines.push("(бріф не заповнено)");
  }
  if (financialAnswers) {
    lines.push("", "### Умови (фінансово-чутлива секція — доступна викликачу)", "```json", JSON.stringify(financialAnswers, null, 2), "```");
  }
  return lines.join("\n");
}

// One provider call — мирор callProvider з c2c-extract, без forced tool
// (звіт — вільний markdown-текст, не структуровані дані).
async function callAnthropic(
  system: string,
  userContent: string,
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
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
    return { ok: false, status: 0, message: `Network error calling model: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let providerMessage = detail.slice(0, 300);
    try {
      const parsed = JSON.parse(detail) as { error?: { message?: string } };
      if (parsed.error?.message) providerMessage = parsed.error.message;
    } catch {
      /* keep raw slice */
    }
    let message: string;
    if (res.status === 429) message = `Model rate limit / quota exceeded (429): ${providerMessage}`;
    else if (res.status === 402) message = `Model billing / insufficient credit (402): ${providerMessage}`;
    else if (res.status === 401 || res.status === 403) {
      message = `Model authentication failed (${res.status}): check ANTHROPIC_API_KEY.`;
    } else if (res.status >= 500) {
      message = `Model provider is temporarily unavailable (${res.status}): ${providerMessage}`;
    } else {
      message = `Model request failed (${res.status}): ${providerMessage}`;
    }
    return { ok: false, status: res.status, message };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (e) {
    return { ok: false, status: 502, message: `Model returned non-JSON envelope: ${(e as Error).message}` };
  }
  const blocks = (data as { content?: Array<{ type?: string; text?: string }> })?.content;
  const textBlock = Array.isArray(blocks) ? blocks.find((b) => b?.type === "text" && typeof b.text === "string") : undefined;
  if (!textBlock?.text) {
    return { ok: false, status: 502, message: "Model returned no text content." };
  }
  return { ok: true, text: textBlock.text };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Мирор log-application-event/seed-vacancy-stages: SUPABASE_ANON_KEY не
    // гарантовано автопровіжн у кожному середовищі — fallback на service_role
    // ЛИШЕ для конструювання клієнта; RLS-релевантні RPC нижче все одно
    // виконуються з явним Authorization: Bearer <jwt викликача>, тому
    // auth.uid() у security-definer функціях резолвиться з JWT, а не з ключа.
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;

    // service_role client — RLS bypass ЛИШЕ всередині цієї функції, для
    // читання/запису контексту звіту ПІСЛЯ підтвердження scope.
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- 1. Верифікація JWT (НЕ з body) ---------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");

    const {
      data: { user: caller },
      error: authError,
    } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    // Клієнт "під JWT викликача" — RPC на security-definer helper-функціях
    // резолвлять auth.uid() з ЦЬОГО JWT (не service_role), точнісінько як
    // RLS-предикат резолвив би auth.uid() у звичайному запиті клієнта.
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // --- 2. Parse + validate body ----------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const kind = body.kind;
    if (typeof kind !== "string" || !REPORT_KINDS.has(kind)) {
      return json({ error: "invalid_kind" }, 422);
    }

    let applicationId: string | null = null;
    if (body.application_id !== undefined && body.application_id !== null) {
      if (!isUuid(body.application_id)) return json({ error: "invalid_body", detail: "application_id" }, 422);
      applicationId = body.application_id;
    }
    if (kind === "candidate_report" && !applicationId) {
      return json({ error: "invalid_body", detail: "application_id required for candidate_report" }, 422);
    }

    const transcript = asBoundedString(body.transcript, MAX_TRANSCRIPT_CHARS);
    const extraNotes = asBoundedString(body.extra_notes, MAX_NOTES_CHARS);

    // --- 3. Scope: mp_can_access_vacancy через RPC під JWT викликача ------
    const { data: canAccess, error: accessErr } = await asCaller.rpc("mp_can_access_vacancy", {
      p_vacancy_id: vacancyId,
    });
    if (accessErr) {
      console.error("generate-candidate-report mp_can_access_vacancy error:", accessErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canAccess) return json({ error: "forbidden" }, 403);

    // --- 4. Провайдер має бути налаштований (жоден фейковий звіт) --------
    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ai_not_configured" }, 503);
    }

    // --- 5. Завантажити вакансію (title/description) під service_role ----
    const { data: vacancy, error: vacancyErr } = await admin
      .from("vacancies")
      .select("id, title, description, location, employment_type")
      .eq("id", vacancyId)
      .maybeSingle();
    if (vacancyErr) {
      console.error("generate-candidate-report vacancy lookup error:", vacancyErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);

    // --- 5a. Якщо candidate_report — перевірити заявку належить вакансії --
    let candidate: { id: string; full_name: string; email: string | null; headline: string | null; location: string | null } | null = null;
    if (kind === "candidate_report") {
      const { data: application, error: appErr } = await admin
        .from("applications")
        .select("id, vacancy_id, candidate_id")
        .eq("id", applicationId!)
        .maybeSingle();
      if (appErr) {
        console.error("generate-candidate-report application lookup error:", appErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!application) return json({ error: "application_not_found" }, 404);
      if (application.vacancy_id !== vacancyId) {
        return json({ error: "invalid_application_for_vacancy" }, 422);
      }

      const { data: candidateRow, error: candErr } = await admin
        .from("ats_candidates")
        .select("id, full_name, email, headline, location")
        .eq("id", application.candidate_id)
        .maybeSingle();
      if (candErr) {
        console.error("generate-candidate-report candidate lookup error:", candErr.message);
        return json({ error: "server_error" }, 500);
      }
      candidate = candidateRow;
    }

    // --- 6. Матриця компетенцій вакансії -----------------------------------
    const { data: competencies, error: compErr } = await admin
      .from("vacancy_competencies")
      .select("id, group_name, group_weight, name, name_en, questions, weight, position")
      .eq("vacancy_id", vacancyId)
      .order("position", { ascending: true });
    if (compErr) {
      console.error("generate-candidate-report competencies lookup error:", compErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!competencies || competencies.length === 0) {
      return json({ error: "missing_competency_matrix" }, 422);
    }

    // --- 7. Оцінки — по одній заявці (candidate_report) або по всіх заявках
    //        вакансії (comparative_report) ---------------------------------
    interface ApplicationWithCandidate {
      id: string;
      candidate_id: string;
      candidate_name: string;
    }
    let targetApplications: ApplicationWithCandidate[] = [];
    if (kind === "candidate_report") {
      targetApplications = [
        { id: applicationId!, candidate_id: candidate!.id, candidate_name: candidate!.full_name },
      ];
    } else {
      const { data: apps, error: appsErr } = await admin
        .from("applications")
        .select("id, candidate_id, ats_candidates(full_name)")
        .eq("vacancy_id", vacancyId);
      if (appsErr) {
        console.error("generate-candidate-report applications lookup error:", appsErr.message);
        return json({ error: "server_error" }, 500);
      }
      targetApplications = (apps ?? []).map((a) => ({
        id: a.id as string,
        candidate_id: a.candidate_id as string,
        candidate_name:
          (a as unknown as { ats_candidates?: { full_name?: string } }).ats_candidates?.full_name ?? "Кандидат",
      }));
      if (targetApplications.length === 0) {
        return json({ error: "missing_scores", detail: "no applications for vacancy" }, 422);
      }
    }

    const applicationIds = targetApplications.map((a) => a.id);
    const { data: scoresRaw, error: scoresErr } = await admin
      .from("competency_scores")
      .select("application_id, competency_id, score, note")
      .in("application_id", applicationIds);
    if (scoresErr) {
      console.error("generate-candidate-report scores lookup error:", scoresErr.message);
      return json({ error: "server_error" }, 500);
    }
    const scores = scoresRaw ?? [];
    if (scores.length === 0) {
      return json({ error: "missing_scores" }, 422);
    }

    // --- 8. Бріф вакансії (БЕЗ фінансів, якщо немає can_view_financials) --
    const { data: brief, error: briefErr } = await admin
      .from("vacancy_briefs")
      .select("id, answers")
      .eq("vacancy_id", vacancyId)
      .maybeSingle();
    if (briefErr) {
      console.error("generate-candidate-report brief lookup error:", briefErr.message);
      return json({ error: "server_error" }, 500);
    }

    let financialAnswers: unknown | null = null;
    if (brief) {
      const { data: canViewFinancials, error: finErr } = await asCaller.rpc("mp_can_view_vacancy_financials", {
        p_vacancy_id: vacancyId,
      });
      if (finErr) {
        console.error("generate-candidate-report mp_can_view_vacancy_financials error:", finErr.message);
        // fail-closed: без підтвердження права — фінансів у промт не додаємо.
      } else if (canViewFinancials) {
        const { data: finRow, error: finLookupErr } = await admin
          .from("vacancy_brief_financials")
          .select("answers")
          .eq("vacancy_brief_id", brief.id)
          .maybeSingle();
        if (finLookupErr) {
          console.error("generate-candidate-report brief financials lookup error:", finLookupErr.message);
        } else if (finRow) {
          financialAnswers = finRow.answers;
        }
      }
    }

    // --- 9. Промт вакансії (kind-специфічний) або дефолтний --------------
    const { data: promptRow, error: promptErr } = await admin
      .from("vacancy_prompts")
      .select("prompt")
      .eq("vacancy_id", vacancyId)
      .eq("kind", kind)
      .maybeSingle();
    if (promptErr) {
      console.error("generate-candidate-report prompt lookup error:", promptErr.message);
      return json({ error: "server_error" }, 500);
    }
    const systemPrompt = promptRow?.prompt?.trim() || buildDefaultSystemPrompt(kind as "candidate_report" | "comparative_report");

    // --- 10. Створити рядок candidate_reports зі статусом 'generating' ---
    const { data: reportRow, error: insertErr } = await admin
      .from("candidate_reports")
      .insert({
        application_id: kind === "candidate_report" ? applicationId : null,
        vacancy_id: vacancyId,
        kind,
        status: "generating",
        model: ANTHROPIC_MODEL,
        created_by: caller.id,
      })
      .select("id")
      .single();
    if (insertErr || !reportRow) {
      console.error("generate-candidate-report insert error:", insertErr?.message);
      return json({ error: "server_error" }, 500);
    }
    const reportId = (reportRow as { id: string }).id;

    // --- 11. Побудувати промт-контекст (allow-list джерел — жодних інших
    //         таблиць, зокрема vacancy_financials, не читаємо тут) ---------
    const userParts: string[] = [];
    userParts.push(`### Вакансія`, `- Назва: ${vacancy.title}`);
    if (vacancy.location) userParts.push(`- Локація: ${vacancy.location}`);
    if (vacancy.employment_type) userParts.push(`- Тип зайнятості: ${vacancy.employment_type}`);
    if (vacancy.description) userParts.push("", "#### Опис вакансії", vacancy.description);
    userParts.push("", formatBriefForPrompt(brief?.answers ?? null, financialAnswers));

    if (kind === "candidate_report") {
      userParts.push(
        "",
        "### Кандидат",
        `- Ім'я: ${candidate!.full_name}`,
        candidate!.headline ? `- Позиція/заголовок резюме: ${candidate!.headline}` : "",
        candidate!.location ? `- Локація кандидата: ${candidate!.location}` : "",
      );
      userParts.push(
        "",
        formatCompetencyMatrix(
          competencies as CompetencyRow[],
          scores.filter((s) => s.application_id === applicationId) as ScoreRow[],
          candidate!.full_name,
        ),
      );
      const { weightedScore, verdict } = computeWeightedScore(
        competencies as CompetencyRow[],
        scores.filter((s) => s.application_id === applicationId) as ScoreRow[],
      );
      if (weightedScore !== null) {
        userParts.push(
          "",
          `### Розрахована загальна оцінка: ${weightedScore.toFixed(2)} / 3.00 — ${verdict}`,
          "(пороги: 2.34–3.00 висока / 1.67–2.33 середня / 1.00–1.66 низька відповідність)",
        );
      }
      if (transcript) {
        userParts.push("", "### Транскрипція співбесіди", transcript);
      } else {
        userParts.push("", "### Транскрипція співбесіди", "(транскрипція не надана для цього звіту)");
      }
      if (extraNotes) userParts.push("", "### Додаткові нотатки рекрутера", extraNotes);
    } else {
      // comparative_report — усі кандидати вакансії.
      for (const app of targetApplications) {
        const appScores = scores.filter((s) => s.application_id === app.id) as ScoreRow[];
        if (appScores.length === 0) continue; // без оцінок — не включаємо в порівняння
        userParts.push("", formatCompetencyMatrix(competencies as CompetencyRow[], appScores, app.candidate_name));
        const { weightedScore, verdict } = computeWeightedScore(competencies as CompetencyRow[], appScores);
        if (weightedScore !== null) {
          userParts.push(`Загальна оцінка ${app.candidate_name}: ${weightedScore.toFixed(2)} / 3.00 — ${verdict}`);
        }
      }
      if (extraNotes) userParts.push("", "### Додаткові нотатки рекрутера", extraNotes);
    }

    const userContent = userParts.filter((l) => l !== "").join("\n");

    // --- 12. Виклик Anthropic Messages API --------------------------------
    const result = await callAnthropic(systemPrompt, userContent);
    if (!result.ok) {
      await admin
        .from("candidate_reports")
        .update({ status: "failed", error: result.message })
        .eq("id", reportId);
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message, report_id: reportId }, status);
    }

    // --- 13. Позначити готовим і повернути ---------------------------------
    const { error: updateErr } = await admin
      .from("candidate_reports")
      .update({ status: "ready", content_md: result.text })
      .eq("id", reportId);
    if (updateErr) {
      console.error("generate-candidate-report update error:", updateErr.message);
      return json({ error: "server_error" }, 500);
    }

    return json({ report_id: reportId, content_md: result.text });
  } catch (error) {
    console.error("generate-candidate-report unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
