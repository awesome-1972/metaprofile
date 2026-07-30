// supabase/functions/recommend-candidates/index.ts
//
// Metaprofile ATS — Фіча: рекомендовані кандидати з бази під бріф.
//
// Будує «профіль ролі» з вакансії (title/description) + компетенцій + бріфу,
// робить дешевий детермінований pre-filter по кандидатах тенанта
// (токен-overlap над resume_parsed), топ-N віддає в Anthropic для скору 0–100 з
// поясненням, і матеріалізує результат у vacancy_candidate_matches. Клієнт лише
// читає збережене. Запис — service_role з явним tenant_id.
//
// ── AUTH (мирор parse-cv-preview) ──────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy. Anthropic forced
//   tool-use. Кандидати читаються під service_role СТРОГО з tenant_id вакансії.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid }
//   200 { matches: [{candidate_id, full_name, score, matched_skills[], gaps[],
//         rationale}], total_scanned, computed_at }
//   401/403/404/422/429/502(ai_provider_error)/503(ai_not_configured)/500
//
// Deploy:  supabase functions deploy recommend-candidates
// config:  verify_jwt = true.

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
const MAX_CANDIDATES_SCAN = 800; // ліміт вибірки кандидатів тенанта
const RERANK_TOP_N = 30;         // скільки віддаємо в LLM

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 15;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_LIMIT_WINDOW_MS) { rateBuckets.set(key, { count: 1, windowStart: now }); return false; }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

// Легкий стабільний хеш (fingerprint брифу).
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

interface ParsedPos { title?: string | null; company?: string | null }
interface Cand { id: string; full_name: string | null; resume_parsed: Record<string, unknown> | null }

function candText(c: Cand): { skills: string[]; titles: string[]; summary: string } {
  const rp = c.resume_parsed ?? {};
  const skills = Array.isArray((rp as { skills?: unknown }).skills) ? ((rp as { skills: unknown[] }).skills.filter((x) => typeof x === "string") as string[]) : [];
  const positions = Array.isArray((rp as { positions?: unknown }).positions) ? ((rp as { positions: ParsedPos[] }).positions) : [];
  const titles = positions.map((p) => [p.title, p.company].filter(Boolean).join(" ")).filter(Boolean) as string[];
  const summary = typeof (rp as { summary?: unknown }).summary === "string" ? (rp as { summary: string }).summary : "";
  return { skills, titles, summary };
}

// ── Anthropic ──────────────────────────────────────────────────────────────
function buildSchema(): unknown {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            index: { type: "integer" },
            score: { type: "integer" },
            matched_skills: { type: "array", items: { type: "string" } },
            gaps: { type: "array", items: { type: "string" } },
            rationale: { type: ["string", "null"] },
          },
          required: ["index", "score", "matched_skills", "gaps", "rationale"],
        },
      },
    },
    required: ["matches"],
  };
}
async function callAnthropic(system: string, user: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = { name: "emit_matches", description: "Оцінка відповідності кандидатів ролі.", input_schema: buildSchema() };
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
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("recommend-candidates scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    // Вакансія + tenant.
    const { data: vacancy, error: vErr } = await admin.from("vacancies").select("id, title, description, tenant_id").eq("id", vacancyId).maybeSingle();
    if (vErr) { console.error("recommend-candidates vacancy error:", vErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const vac = vacancy as unknown as { title: string; description: string | null; tenant_id: string | null };
    const tenantId = vac.tenant_id;

    // Компетенції + бріф → профіль ролі.
    const { data: comps } = await admin.from("vacancy_competencies").select("group_name, name, name_en, weight").eq("vacancy_id", vacancyId);
    const { data: brief } = await admin.from("vacancy_briefs").select("answers").eq("vacancy_id", vacancyId).maybeSingle();
    const compNames = (comps ?? []).map((c) => (c as { name: string }).name).filter(Boolean);
    const briefText = brief ? JSON.stringify((brief as { answers: unknown }).answers).slice(0, 4000) : "";

    const roleProfile = [
      `Назва: ${vac.title}`,
      vac.description ? `Опис: ${vac.description}` : "",
      compNames.length ? `Компетенції: ${compNames.join(", ")}` : "",
      briefText ? `Бріф: ${briefText}` : "",
    ].filter(Boolean).join("\n");
    const fingerprint = hashStr(roleProfile);

    // Кандидати тенанта (без анонімізованих).
    let q = admin.from("ats_candidates").select("id, full_name, resume_parsed").limit(MAX_CANDIDATES_SCAN);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    const { data: candsRaw, error: cErr } = await q;
    if (cErr) { console.error("recommend-candidates candidates error:", cErr.message); return json({ error: "server_error" }, 500); }
    const cands = (candsRaw ?? []) as Cand[];
    if (cands.length === 0) return json({ matches: [], total_scanned: 0, computed_at: new Date().toISOString() });

    // Pre-filter: токен-overlap профілю ролі з кандидатом.
    const roleTokens = new Set([...tokenize(vac.title), ...tokenize(vac.description ?? ""), ...compNames.flatMap(tokenize), ...tokenize(briefText)]);
    const scored = cands.map((c) => {
      const { skills, titles, summary } = candText(c);
      const ct = new Set([...skills.flatMap(tokenize), ...titles.flatMap(tokenize), ...tokenize(summary)]);
      let overlap = 0;
      for (const t of ct) if (roleTokens.has(t)) overlap++;
      return { c, overlap, skills, titles, summary };
    });
    scored.sort((a, b) => b.overlap - a.overlap);
    const shortlist = scored.slice(0, RERANK_TOP_N);

    // Компактний список для LLM.
    const listText = shortlist
      .map((s, i) => {
        const parts = [
          `#${i} ${s.c.full_name ?? "Без імені"}`,
          s.titles.length ? `Досвід: ${s.titles.slice(0, 4).join("; ")}` : "",
          s.skills.length ? `Навички: ${s.skills.slice(0, 25).join(", ")}` : "",
          s.summary ? `Про: ${s.summary.slice(0, 400)}` : "",
        ].filter(Boolean);
        return parts.join("\n");
      })
      .join("\n\n");

    const system = [
      "Ти — асистент рекрутера. Оціни відповідність кандидатів заданій ролі.",
      "Для КОЖНОГО кандидата дай score 0–100 (наскільки підходить під роль),",
      "matched_skills (що збігається), gaps (чого бракує), короткий rationale.",
      "Спирайся ЛИШЕ на надані дані; не вигадуй. Повертай усіх кандидатів за схемою.",
    ].join("\n");
    const user = `### Профіль ролі\n${roleProfile}\n\n### Кандидати\n${listText}`;

    const result = await callAnthropic(system, user);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }
    const rawMatches = Array.isArray((result.parsed as { matches?: unknown }).matches) ? (result.parsed as { matches: Array<Record<string, unknown>> }).matches : [];

    // Збірка рядків для збереження + відповіді.
    const rows = rawMatches
      .map((m) => {
        const idx = typeof m.index === "number" ? m.index : -1;
        const s = shortlist[idx];
        if (!s) return null;
        const score = Math.max(0, Math.min(100, typeof m.score === "number" ? Math.round(m.score) : 0));
        const matched_skills = Array.isArray(m.matched_skills) ? (m.matched_skills.filter((x) => typeof x === "string").slice(0, 30) as string[]) : [];
        const gaps = Array.isArray(m.gaps) ? (m.gaps.filter((x) => typeof x === "string").slice(0, 30) as string[]) : [];
        const rationale = typeof m.rationale === "string" ? m.rationale.slice(0, 1500) : null;
        return {
          candidate_id: s.c.id,
          full_name: s.c.full_name,
          score,
          breakdown: { matched_skills, gaps, rationale, model: ANTHROPIC_MODEL },
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.score - a.score);

    // Матеріалізація: чистимо старі матчі вакансії й пишемо свіжі.
    await admin.from("vacancy_candidate_matches").delete().eq("vacancy_id", vacancyId);
    if (rows.length > 0) {
      const nowIso = new Date().toISOString();
      const insertRows = rows.map((r) => ({
        vacancy_id: vacancyId,
        candidate_id: r.candidate_id,
        tenant_id: tenantId,
        score: r.score,
        breakdown: r.breakdown,
        brief_fingerprint: fingerprint,
        computed_at: nowIso,
        created_by: caller.id,
      }));
      const { error: insErr } = await admin.from("vacancy_candidate_matches").insert(insertRows);
      if (insErr) console.error("recommend-candidates insert error:", insErr.message);
    }

    return json({
      matches: rows.map((r) => ({
        candidate_id: r.candidate_id,
        full_name: r.full_name,
        score: r.score,
        matched_skills: r.breakdown.matched_skills,
        gaps: r.breakdown.gaps,
        rationale: r.breakdown.rationale,
      })),
      total_scanned: cands.length,
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("recommend-candidates unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
