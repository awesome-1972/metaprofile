// supabase/functions/generate-vacancy-competencies/index.ts
//
// Metaprofile ATS — AI-генерація матриці компетенцій із бріфу вакансії.
//
// Читає вакансію (назва/опис/гео/пріоритет/стиль) → Anthropic forced tool-use →
// повертає структуровану матрицю (4 групи × компетенції з питаннями, probes,
// red flags, рубрикою, must-have). PREVIEW: нічого не пише — рекрутер застосовує
// у UI (useSeedCompetencyGroups).
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope — mp_can_edit_vacancy(vacancy_id).
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, groups_count?: number, per_group?: number }
//   200 { groups: [{ group_name, group_weight, competencies:[{ name, name_en,
//         weight, questions[], probes[], red_flags[], rubric{1,2,3},
//         is_must_have }] }] }
//   401/403/404/422/429/502(ai_provider_error)/503(ai_not_configured)/500
//
// Deploy: supabase functions deploy generate-vacancy-competencies  · verify_jwt=true.

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
const MAX_TOKENS = 8000;

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

function buildSystem(): string {
  return [
    "Ти — старший рекрутер-методолог. Складаєш матрицю компетенцій для оцінки кандидатів на вакансію.",
    "ЗАВЖДИ українською мовою (name_en — англійський відповідник назви компетенції).",
    "Структура: 4 групи — «Ціннісні», «Професійні», «Лідерські», «Особисті», кожна вагою 0.25 (сума = 1).",
    "У кожній групі 4–6 компетенцій. Вага компетенцій у межах групи в сумі ≈ 1 (напр. по 0.2 при п'яти).",
    "Для КОЖНОЇ компетенції дай: 2–3 змістовні питання для інтерв'ю (questions), 2–4 уточнюючі (probes),",
    "2–4 red_flags (ознаки невідповідності у відповіді кандидата), і рубрику rubric — що означає бал 1/2/3.",
    "Позначай is_must_have=true лише для 2–4 критичних компетенцій, без яких кандидат не проходить далі.",
    "Компетенції мають бути конкретні під РОЛЬ і галузь, а не загальні шаблони. Уникай води.",
  ].join(" ");
}

function buildSchema() {
  const strArr = { type: "array", items: { type: "string" } };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      groups: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            group_name: { type: "string" },
            group_weight: { type: "number" },
            competencies: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  name: { type: "string" },
                  name_en: { type: "string" },
                  weight: { type: "number" },
                  questions: strArr,
                  probes: strArr,
                  red_flags: strArr,
                  rubric: {
                    type: "object",
                    additionalProperties: false,
                    properties: { "1": { type: "string" }, "2": { type: "string" }, "3": { type: "string" } },
                    required: ["1", "2", "3"],
                  },
                  is_must_have: { type: "boolean" },
                },
                required: ["name", "name_en", "weight", "questions", "probes", "red_flags", "rubric", "is_must_have"],
              },
            },
          },
          required: ["group_name", "group_weight", "competencies"],
        },
      },
    },
    required: ["groups"],
  };
}

async function callAnthropic(prompt: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = { name: "emit_competency_matrix", description: "Return the competency matrix for the vacancy.", input_schema: buildSchema() };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: MAX_TOKENS, temperature: 0.2,
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

function asStr(v: unknown, max = 1000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function asArr(v: unknown, maxItems = 8, maxLen = 600): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) { const s = asStr(x, maxLen); if (s) out.push(s); if (out.length >= maxItems) break; }
  return out;
}
function clampWeight(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return fallback;
  return Math.round(n * 10000) / 10000;
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
    if (scopeErr) { console.error("gen-competencies scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
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

    const prompt = [
      `### Вакансія\nНазва: ${vac.title}`,
      vac.candidates_geo ? `Гео/локація: ${vac.candidates_geo}` : "",
      vac.work_style ? `Стиль роботи: ${vac.work_style}` : "",
      vac.work_schedule ? `Графік: ${vac.work_schedule}` : "",
      vac.description ? `\nОпис/бріф:\n${vac.description.slice(0, 12000)}` : "",
      "\nСклади матрицю компетенцій під цю роль (4 групи по 25%, 4–6 компетенцій у групі).",
    ].filter(Boolean).join("\n");

    const ai = await callAnthropic(prompt);
    if (!ai.ok) {
      console.error("gen-competencies AI error:", ai.status, ai.message);
      return json({ error: "ai_provider_error", detail: ai.message }, 502);
    }

    // Нормалізація виходу.
    const rawGroups = (ai.parsed as { groups?: unknown })?.groups;
    if (!Array.isArray(rawGroups)) return json({ error: "ai_provider_error", detail: "no groups" }, 502);
    const groups = rawGroups.slice(0, 6).map((g) => {
      const gg = g as Record<string, unknown>;
      const comps = Array.isArray(gg.competencies) ? gg.competencies.slice(0, 8) : [];
      return {
        group_name: asStr(gg.group_name, 120) || "Група",
        group_weight: clampWeight(gg.group_weight, 0.25),
        competencies: comps.map((c) => {
          const cc = c as Record<string, unknown>;
          const rubricRaw = (cc.rubric ?? {}) as Record<string, unknown>;
          return {
            name: asStr(cc.name, 200) || "Компетенція",
            name_en: asStr(cc.name_en, 200) || null,
            weight: clampWeight(cc.weight, 0.2),
            questions: asArr(cc.questions),
            probes: asArr(cc.probes),
            red_flags: asArr(cc.red_flags),
            rubric: {
              "1": asStr(rubricRaw["1"], 600),
              "2": asStr(rubricRaw["2"], 600),
              "3": asStr(rubricRaw["3"], 600),
            },
            is_must_have: cc.is_must_have === true,
          };
        }).filter((c) => c.name),
      };
    }).filter((g) => g.competencies.length > 0);

    return json({ groups });
  } catch (error) {
    console.error("generate-vacancy-competencies unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
