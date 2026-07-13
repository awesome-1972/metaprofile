// ============================================================
// draft-communication — AI-чернетка листа кандидату
// ============================================================
// Навіщо: на кожному етапі пошуку рекрутер шле кандидату або відмову, або
// запрошення на наступний етап. Шаблон дає каркас; ця функція персоналізує
// текст під конкретного кандидата (роль, стадія, причина відмови, оцінки за
// компетенціями) — але НІЧОГО не відправляє. Відправка лишається окремою дією
// людини (`send-communication`), як і рішення про відмову.
//
// Контракт:
//   POST { application_id: uuid,
//          kind: "rejection" | "invitation",
//          reason?: string,            // причина відмови (текст або label зі списку)
//          template_body?: string,     // шаблон-каркас, який треба персоналізувати
//          extra_notes?: string }      // довільний контекст від рекрутера
//   200 { ok: true, subject: string, body: string }
//   401 unauthorized | 403 forbidden | 422 invalid_body | 503 ai_not_configured
//
// Безпека: JWT викликача верифікується через auth.getUser; право на дію
// перевіряється RPC `mp_can_edit_vacancy` під JWT викликача (не service_role),
// тому auth.uid() у security-definer helper'і резолвиться коректно.
//
// Secrets: ANTHROPIC_API_KEY (required; відсутній → 503),
//          ANTHROPIC_MODEL   (optional; дефолт claude-sonnet-4-6).
// ============================================================

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS = new Set(["rejection", "invitation"]);

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 2048;
const MAX_TEXT = 8_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function bounded(v: unknown, max = MAX_TEXT): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

const SYSTEM_PROMPT = `Ти — старший консультант executive search агенції MetaVision Consulting.
Пишеш листи кандидатам українською мовою.

Правила:
- Тон: людяний, професійний, стриманий. Без канцеляриту й без надмірних вибачень.
- Відмова: коротко (4–7 речень), з повагою, без принижень і без фальшивих обіцянок.
  Причину формулюй чесно, але коректно: про відповідність профілю ролі, а не про
  «недоліки» людини. Ніколи не наводь внутрішні оцінки, бали чи цитати з інтервʼю.
- Запрошення: конкретика — що за етап, що відбуватиметься, скільки триває, що підготувати.
- Жодних вигаданих фактів: якщо дати/часу немає в контексті — залиш плейсхолдер {{date}}.
- Не згадуй, що текст згенеровано AI.

Формат відповіді — СТРОГО JSON без markdown-огорожі:
{"subject": "<тема листа>", "body": "<текст листа з абзацами через \\n>"}`;

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

/** Модель просять віддати JSON; на всяк випадок знімаємо ```-огорожу. */
function parseDraft(text: string): { subject: string; body: string } | null {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(cleaned) as { subject?: unknown; body?: unknown };
    if (typeof parsed.body !== "string" || !parsed.body.trim()) return null;
    return {
      subject: typeof parsed.subject === "string" ? parsed.subject : "",
      body: parsed.body,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- 1. JWT викликача -------------------------------------------------
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

    // --- 2. Body ----------------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const applicationId = body.application_id;
    if (!isUuid(applicationId)) return json({ error: "invalid_body", detail: "application_id" }, 422);

    const kind = body.kind;
    if (typeof kind !== "string" || !KINDS.has(kind)) return json({ error: "invalid_kind" }, 422);

    const reason = bounded(body.reason, 2_000);
    const templateBody = bounded(body.template_body);
    const extraNotes = bounded(body.extra_notes, 2_000);

    // --- 3. Заявка + scope ------------------------------------------------
    const { data: application, error: appErr } = await admin
      .from("applications")
      .select("id, vacancy_id, candidate_id, current_stage_id")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) {
      console.error("draft-communication application lookup:", appErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!application) return json({ error: "application_not_found" }, 404);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", {
      p_vacancy_id: application.vacancy_id,
    });
    if (scopeErr) {
      console.error("draft-communication mp_can_edit_vacancy:", scopeErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    // --- 4. Контекст ------------------------------------------------------
    const [{ data: vacancy }, { data: candidate }, { data: stage }, { data: profile }] = await Promise.all([
      admin
        .from("vacancies")
        .select("id, title, location, hiring_project:hiring_projects(name, client:clients(name))")
        .eq("id", application.vacancy_id)
        .maybeSingle(),
      admin
        .from("ats_candidates")
        .select("id, full_name, headline")
        .eq("id", application.candidate_id)
        .maybeSingle(),
      application.current_stage_id
        ? admin
            .from("pipeline_stages")
            .select("id, name, phase:search_phases(name, kind)")
            .eq("id", application.current_stage_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from("profiles").select("full_name, email").eq("user_id", caller.id).maybeSingle(),
    ]);

    const stageRow = stage as { name?: string; phase?: { name?: string; kind?: string } | null } | null;

    const contextLines = [
      `Тип листа: ${kind === "rejection" ? "ВІДМОВА" : "ЗАПРОШЕННЯ НА НАСТУПНИЙ ЕТАП"}`,
      `Кандидат: ${candidate?.full_name ?? "—"}${candidate?.headline ? ` (${candidate.headline})` : ""}`,
      `Вакансія: ${vacancy?.title ?? "—"}`,
      `Поточна стадія: ${stageRow?.name ?? "—"}`,
      `Етап пошуку: ${stageRow?.phase?.name ?? "—"}`,
      reason ? `Причина відмови (внутрішнє формулювання, НЕ цитувати дослівно): ${reason}` : "",
      extraNotes ? `Додатковий контекст від рекрутера: ${extraNotes}` : "",
      `Підпис: ${profile?.full_name ?? "рекрутер MetaVision Consulting"}`,
      "",
      templateBody
        ? `Каркас-шаблон, який треба персоналізувати (зберегти структуру й тон, підставити конкретику):\n${templateBody}`
        : "Шаблону немає — напиши лист з нуля.",
      "",
      "Клієнта-замовника НЕ називай, якщо його немає в контексті вище (пошук конфіденційний).",
    ].filter(Boolean);

    const result = await callAnthropic(SYSTEM_PROMPT, contextLines.join("\n"));
    if (!result.ok) {
      console.error("draft-communication model error:", result.message);
      return json({ error: "model_error", detail: result.message }, 502);
    }

    const draft = parseDraft(result.text);
    if (!draft) return json({ error: "model_error", detail: "Не вдалося розібрати відповідь моделі" }, 502);

    return json({ ok: true, subject: draft.subject, body: draft.body });
  } catch (e) {
    console.error("draft-communication unexpected:", (e as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
