// supabase/functions/parse-stoplist/index.ts
//
// Metaprofile ATS — розбір транскрипту розмови у записи стоп-листа вакансії.
//
// З тексту розмови з клієнтом витягує КОНКРЕТНИХ людей, яких клієнт ЯВНО просив не
// розглядати на цю вакансію (ПІБ + опційно компанія + причина). Клієнт переглядає
// прев'ю й додає обрані записи. Нічого не вигадує.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, transcript: string }
//   200 { entries: [{ full_name, company, reason }] }
//   401/403/422/429/502/503/500
//
// Deploy:  supabase functions deploy parse-stoplist   ·   config: verify_jwt = true.

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
const MAX_TOKENS = 4096;
const MAX_TRANSCRIPT = 40_000;

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

async function callAnthropic(system: string, user: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = {
    name: "emit_stoplist",
    description: "Люди, яких клієнт заборонив розглядати на вакансію.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        entries: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              full_name: { type: "string" },
              company: { type: ["string", "null"] },
              reason: { type: ["string", "null"] },
            },
            required: ["full_name", "company", "reason"],
          },
        },
      },
      required: ["entries"],
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
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
    if (transcript.length < 20) return json({ error: "invalid_body", detail: "transcript" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("parse-stoplist scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    const system = [
      "Ти — асистент рекрутера. З транскрипту розмови з клієнтом витягни СПИСОК КОНКРЕТНИХ ЛЮДЕЙ,",
      "яких клієнт ЯВНО попросив НЕ розглядати на цю вакансію (стоп-лист).",
      "Правила:",
      "• Додавай лише людей, названих поіменно, для яких прозвучала заборона/небажання їх бачити.",
      "• full_name — ПІБ людини; company — де вона працює/працювала (або null); reason — коротка причина (або null).",
      "• НЕ додавай компанії без конкретної людини, загальні побажання чи профілі кандидатів.",
      "• Нічого не вигадуй. Якщо таких людей у розмові немає — поверни порожній список.",
      "• Значення — українською, стисло.",
    ].join("\n");
    const user = `### Транскрипт розмови\n${transcript.slice(0, MAX_TRANSCRIPT)}`;

    const result = await callAnthropic(system, user);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }
    const rawList = Array.isArray((result.parsed as { entries?: unknown }).entries)
      ? (result.parsed as { entries: Array<Record<string, unknown>> }).entries
      : [];
    const entries = rawList
      .map((e) => ({
        full_name: typeof e.full_name === "string" ? e.full_name.trim() : "",
        company: typeof e.company === "string" && e.company.trim() ? e.company.trim() : null,
        reason: typeof e.reason === "string" && e.reason.trim() ? e.reason.trim() : null,
      }))
      .filter((e) => e.full_name.length > 0)
      .slice(0, 50);

    return json({ entries });
  } catch (error) {
    console.error("parse-stoplist unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
