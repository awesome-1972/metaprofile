// supabase/functions/parse-brief/index.ts
//
// Metaprofile ATS — розбір транскрипту розмови з клієнтом у поля бріф-опитувальника.
//
// Отримує транскрипцію запису розмови й список питань бріфу (id/label/type/options),
// через Anthropic forced tool-use витягує значення для тих полів, що ЯВНО прозвучали,
// і повертає їх. Клієнт зливає значення у форму бріфу — з ручним доопрацюванням.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, transcript: string,
//          questions: [{ id: string, label: string, type: "text"|"textarea"|"radio", options?: string[] }] }
//   200 { extracted: [{ id, value }] }
//   401/403/422/429/502/503/500
//
// Deploy:  supabase functions deploy parse-brief   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 8192;
const MAX_TRANSCRIPT = 40_000;
const MAX_QUESTIONS = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_LIMIT_WINDOW_MS) { rateBuckets.set(key, { count: 1, windowStart: now }); return false; }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

interface Q { id: string; label: string; type: string; options?: string[] }

async function callAnthropic(system: string, user: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = {
    name: "emit_brief",
    description: "Витягнуті з розмови значення полів бріфу.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        extracted: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: { id: { type: "string" }, value: { type: "string" } },
            required: ["id", "value"],
          },
        },
      },
      required: ["extracted"],
    },
  };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: MAX_TOKENS, temperature: 0, system, messages: [{ role: "user", content: user }], tools: [tool], tool_choice: { type: "tool", name: tool.name } }),
    });
  } catch (e) { return { ok: false, status: 0, message: `Network: ${(e as Error).message}` }; }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let msg = detail.slice(0, 300);
    try { const p = JSON.parse(detail) as { error?: { message?: string } }; if (p.error?.message) msg = p.error.message; } catch { /* keep */ }
    return { ok: false, status: res.status, message: msg };
  }
  let data: unknown;
  try { data = await res.json(); } catch (e) { return { ok: false, status: 502, message: `Non-JSON: ${(e as Error).message}` }; }
  const blocks = (data as { content?: Array<{ type?: string; input?: unknown }> })?.content;
  const tb = Array.isArray(blocks) ? blocks.find((b) => b?.type === "tool_use" && b.input !== undefined) : undefined;
  if (!tb || tb.input === undefined) return { ok: false, status: 502, message: "No structured output." };
  return { ok: true, parsed: tb.input };
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
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const questions = Array.isArray(body.questions) ? (body.questions as Q[]).slice(0, MAX_QUESTIONS) : [];
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
    if (transcript.length < 20) return json({ error: "invalid_body", detail: "transcript" }, 422);
    if (questions.length === 0) return json({ error: "invalid_body", detail: "questions" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("parse-brief scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    const fieldsText = questions
      .map((q) => {
        const opts = q.type === "radio" && Array.isArray(q.options) ? ` [оберіть одне з: ${q.options.join(" | ")}]` : "";
        return `- ${q.id}: ${q.label}${opts}`;
      })
      .join("\n");

    const system = [
      "Ти — асистент рекрутера. З транскрипту розмови з клієнтом витягни відповіді на поля бріфу.",
      "Правила:",
      "• Заповнюй ЛИШЕ ті поля, відповідь на які ЯВНО прозвучала в розмові. Нічого не вигадуй.",
      "• Якщо поля немає в розмові — просто не включай його у відповідь.",
      "• Для полів з переліком варіантів обери РІВНО один із запропонованих варіантів.",
      "• Значення став українською, стисло й по суті, зберігаючи зміст сказаного.",
      "• id повертай точно так, як задано.",
    ].join("\n");
    const user = `### Поля бріфу\n${fieldsText}\n\n### Транскрипт розмови\n${transcript.slice(0, MAX_TRANSCRIPT)}`;

    const result = await callAnthropic(system, user);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }
    const rawList = Array.isArray((result.parsed as { extracted?: unknown }).extracted)
      ? (result.parsed as { extracted: Array<Record<string, unknown>> }).extracted
      : [];
    const validIds = new Set(questions.map((q) => q.id));
    const extracted = rawList
      .map((e) => ({ id: String(e.id ?? ""), value: typeof e.value === "string" ? e.value.trim() : "" }))
      .filter((e) => validIds.has(e.id) && e.value.length > 0);

    return json({ extracted });
  } catch (error) {
    console.error("parse-brief unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
