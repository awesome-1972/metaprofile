// supabase/functions/generate-search-strategy/index.ts
//
// Metaprofile ATS — AI-генерація «Стратегії пошуку» з бріфу вакансії.
// Повторює структуру документа MetaVision: фокус, галузі з частками, цільові
// компанії, цільові посади (+ суміжні), що важливо в профілі, поза скоупом.
// PREVIEW: нічого не пише — рекрутер переглядає у формі й зберігає.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope — mp_can_edit_vacancy(vacancy_id).
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid }
//   200 { strategy: { focus, industries:[{name,share}], target_companies[],
//         target_titles[], profile_musts[], out_of_scope, notes } }
//   401/403/404/422/429/502/503/500
//
// Deploy: supabase functions deploy generate-search-strategy · verify_jwt=true.

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
const MAX_TOKENS = 5000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
// Прибираємо markdown-розмітку — поля стратегії це ПЛОСКІ textarea, не markdown.
function stripMd(s: string): string {
  return s
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .trim();
}
function asStr(v: unknown, max = 2000): string { return typeof v === "string" ? stripMd(v.trim()).slice(0, max) : ""; }
function asArr(v: unknown, maxItems = 25, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) { const s = asStr(x, maxLen); if (s) out.push(s); if (out.length >= maxItems) break; }
  return out;
}
// Текстове поле, яке модель інколи віддає масивом або JSON-рядком «[...]» —
// приводимо до звичайного тексту (переліки — рядками з •), без markdown.
function cleanText(v: unknown, max = 1500): string {
  if (Array.isArray(v)) return v.map((x) => `• ${stripMd(String(x))}`).join("\n").slice(0, max);
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.map((x) => `• ${stripMd(String(x))}`).join("\n").slice(0, max);
    } catch { /* not JSON — fall through */ }
  }
  return stripMd(t).slice(0, max);
}

const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > 60_000) { rateBuckets.set(key, { count: 1, windowStart: now }); return false; }
  b.count += 1;
  return b.count > 10;
}

function buildSystem(): string {
  return [
    "Ти — досвідчений хедхантер-дослідник (executive search). Складаєш СТРАТЕГІЮ ПОШУКУ під конкретну вакансію.",
    "ЗАВЖДИ українською. Міркуй як практик: звідки реально брати таких кандидатів на українському ринку (і за кордоном, якщо доречно).",
    "focus — 1–2 речення про фокус пошуку (галузі/сегмент).",
    "industries — 2–5 галузей-джерел із приблизними частками у % (сума ≈ 100).",
    "target_companies — 8–20 КОНКРЕТНИХ компаній або чітких типів компаній, звідки дивитися кандидатів (українські + міжнародні, де доречно). Реальні назви, не абстракції.",
    "target_titles — 5–12 посад: цільова + суміжні/попередні ролі, з яких логічно росте потрібний кандидат.",
    "profile_musts — 5–10 пунктів, що обов'язково має бути в профілі.",
    "out_of_scope — кого НЕ беремо / хибні збіги (1–3 речення або перелік).",
    "notes — логіка воронки: з чого починати, куди спускатися за низької конверсії.",
    "Будь конкретним під роль і галузь. Не вигадуй компанії, яких не існує.",
    "ВАЖЛИВО: пиши ПЛОСКИМ текстом без markdown — жодних **, __, #, зірочок, квадратних дужок чи JSON. out_of_scope і notes — звичайні речення; переліки в них — новими рядками, кожен з тире.",
  ].join(" ");
}

function buildSchema() {
  const strArr = { type: "array", items: { type: "string" } };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      focus: { type: "string" },
      industries: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: { name: { type: "string" }, share: { type: "number" } },
          required: ["name", "share"],
        },
      },
      target_companies: strArr,
      target_titles: strArr,
      profile_musts: strArr,
      out_of_scope: { type: "string" },
      notes: { type: "string" },
    },
    required: ["focus", "industries", "target_companies", "target_titles", "profile_musts", "out_of_scope", "notes"],
  };
}

async function callAnthropic(prompt: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = { name: "emit_search_strategy", description: "Return the sourcing/search strategy for the vacancy.", input_schema: buildSchema() };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: MAX_TOKENS, temperature: 0.3,
        system: buildSystem(),
        messages: [{ role: "user", content: prompt }],
        tools: [tool], tool_choice: { type: "tool", name: tool.name },
      }),
    });
  } catch (e) {
    return { ok: false, status: 0, message: `Network error: ${(e as Error).message}` };
  }
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
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);
    const asCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("gen-strategy scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    const { data: vacancy } = await admin
      .from("vacancies")
      .select("title, description, candidates_geo, work_style, work_schedule")
      .eq("id", vacancyId)
      .maybeSingle();
    const vac = vacancy as unknown as {
      title: string; description: string | null; candidates_geo: string | null;
      work_style: string | null; work_schedule: string | null;
    } | null;
    if (!vac) return json({ error: "vacancy_not_found" }, 404);

    // Компетенції — додатковий контекст для профілю.
    const { data: comps } = await admin.from("vacancy_competencies").select("name").eq("vacancy_id", vacancyId);
    const compNames = (comps ?? []).map((c) => (c as { name: string }).name).filter(Boolean).slice(0, 30);

    const prompt = [
      `### Вакансія\nНазва: ${vac.title}`,
      vac.candidates_geo ? `Гео/локація: ${vac.candidates_geo}` : "",
      vac.work_style ? `Стиль роботи: ${vac.work_style}` : "",
      compNames.length ? `Ключові компетенції: ${compNames.join(", ")}` : "",
      vac.description ? `\nОпис/бріф:\n${vac.description.slice(0, 12000)}` : "",
      "\nСклади стратегію пошуку під цю роль: фокус, галузі з частками, цільові компанії, цільові й суміжні посади, що важливо в профілі, поза скоупом, логіка воронки.",
    ].filter(Boolean).join("\n");

    const ai = await callAnthropic(prompt);
    if (!ai.ok) { console.error("gen-strategy AI error:", ai.status, ai.message); return json({ error: "ai_provider_error", detail: ai.message }, 502); }

    const p = ai.parsed as Record<string, unknown>;
    const industries = Array.isArray(p.industries)
      ? p.industries.slice(0, 6).map((i) => {
          const ii = i as Record<string, unknown>;
          return { name: asStr(ii.name, 120), share: Math.max(0, Math.min(100, Math.round(Number(ii.share) || 0))) };
        }).filter((i) => i.name)
      : [];
    const strategy = {
      focus: cleanText(p.focus, 1000),
      industries,
      target_companies: asArr(p.target_companies, 25, 160),
      target_titles: asArr(p.target_titles, 20, 160),
      profile_musts: asArr(p.profile_musts, 15, 300),
      out_of_scope: cleanText(p.out_of_scope, 1500),
      notes: cleanText(p.notes, 1500),
    };
    return json({ strategy });
  } catch (error) {
    console.error("generate-search-strategy unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
