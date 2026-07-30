// supabase/functions/import-vacancy/index.ts
//
// Metaprofile ATS — «Магічний імпорт вакансії» (ідея з конкурентного аналізу).
//
// Приймає посилання на джоб-постинг АБО текст → повертає структуровані поля
// вакансії (preview, БЕЗ запису). Рекрутер редагує й створює вакансію наявним
// шляхом. Дзеркалить preview-контракт parse-cv-preview.
//
// ── AUTH (мирор parse-cv-preview) ──────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope — mp_is_internal() (внутрішній
//   користувач воркспейсу). Anthropic forced tool-use. Нічого не пишемо.
//
// ── SSRF-захист (url-шлях) ──────────────────────────────────────────────────
//   Тільки https; блок localhost/приватних/лінк-локальних хостів і metadata-IP;
//   без слідування на не-https; ліміт розміру й таймаут; HTML → текст.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { source: { url?: string, text?: string } }
//   200 { parsed: { title, seniority, employment_type, location, is_remote,
//                   description, responsibilities[], requirements[],
//                   nice_to_have[], skills[], languages[] }, source_chars }
//   401/403/422(no_source|invalid_url|blocked_url|fetch_failed|empty_text)/
//   429/502(ai_provider_error)/503(ai_not_configured)/500
//
// Deploy:  supabase functions deploy import-vacancy
// config:  verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const MAX_TOKENS = 4096;
const MAX_TEXT_CHARS = 60_000;
const MAX_FETCH_BYTES = 600_000;
const FETCH_TIMEOUT_MS = 10_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || now - b.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT_MAX;
}

/** SSRF: дозволяємо лише публічні https-хости. Блок private/loopback/link-local. */
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local") || h.endsWith(".internal")) return true;
  // IPv6 loopback / link-local.
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  // IPv4 приватні/лінк-локальні/метадані.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata 169.254.169.254
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}

/** Груба, але безпечна конвертація HTML → текст (без DOM у Deno Edge). */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJobText(rawUrl: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (u.protocol !== "https:") return { ok: false, error: "blocked_url" };
  if (isBlockedHost(u.hostname)) return { ok: false, error: "blocked_url" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(u.toString(), {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": "MetaprofileATS/1.0 (+vacancy-import)", Accept: "text/html,text/plain" },
    });
  } catch {
    clearTimeout(timer);
    return { ok: false, error: "fetch_failed" };
  }
  clearTimeout(timer);
  // Після редіректів фінальний хост теж має бути публічним https.
  try {
    const fin = new URL(resp.url);
    if (fin.protocol !== "https:" || isBlockedHost(fin.hostname)) return { ok: false, error: "blocked_url" };
  } catch {
    /* ignore */
  }
  if (!resp.ok) return { ok: false, error: "fetch_failed" };

  const reader = resp.body?.getReader();
  if (!reader) return { ok: false, error: "fetch_failed" };
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
      if (total > MAX_FETCH_BYTES) {
        reader.cancel();
        break;
      }
    }
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c.subarray(0, Math.min(c.length, buf.length - off)), off);
    off += c.length;
    if (off >= buf.length) break;
  }
  const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  const text = htmlToText(html);
  if (!text) return { ok: false, error: "empty_text" };
  return { ok: true, text };
}

// ── Anthropic ──────────────────────────────────────────────────────────────
function buildSystem(): string {
  return [
    "Ти — асистент рекрутера. Тобі дають текст оголошення про вакансію.",
    "Витягни структуровані поля СУВОРО за схемою. Не вигадуй: якщо факту немає —",
    "null або порожній список. Мова полів — як в оригіналі оголошення.",
    "employment_type обери з дозволених значень або null. is_remote — true лише",
    "якщо явно віддалено/remote; false якщо офіс; null якщо не зазначено.",
    "description — стислий зв'язний опис ролі (2–5 речень) мовою оригіналу.",
  ].join("\n");
}
function buildSchema(): unknown {
  const ns = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      title: ns,
      seniority: ns,
      employment_type: { type: ["string", "null"], enum: ["full_time", "part_time", "contract", "internship", "temporary", null] },
      location: ns,
      is_remote: { type: ["boolean", "null"] },
      description: ns,
      responsibilities: { type: "array", items: { type: "string" } },
      requirements: { type: "array", items: { type: "string" } },
      nice_to_have: { type: "array", items: { type: "string" } },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "string" } },
    },
    required: ["title", "seniority", "employment_type", "location", "is_remote", "description", "responsibilities", "requirements", "nice_to_have", "skills", "languages"],
  };
}
async function callAnthropic(text: string): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = { name: "emit_vacancy", description: "Return the job posting parsed into structured fields.", input_schema: buildSchema() };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: MAX_TOKENS, temperature: 0,
        system: buildSystem(),
        messages: [{ role: "user", content: `### Оголошення про вакансію\n\n${text}` }],
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

function asStr(v: unknown, max = 4000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
function asArr(v: unknown, maxItems = 40, maxLen = 500): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) { const s = asStr(x, maxLen); if (s) out.push(s); if (out.length >= maxItems) break; }
  return out;
}
const EMP = new Set(["full_time", "part_time", "contract", "internship", "temporary"]);

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
    const { data: isInternal, error: scopeErr } = await asCaller.rpc("mp_is_internal");
    if (scopeErr) { console.error("import-vacancy scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!isInternal) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const source = (body.source && typeof body.source === "object" ? body.source : {}) as { url?: unknown; text?: unknown };
    const url = typeof source.url === "string" ? source.url.trim() : "";
    const rawText = typeof source.text === "string" ? source.text.trim() : "";
    if (!url && !rawText) return json({ error: "no_source" }, 422);

    let text: string;
    if (rawText) {
      text = rawText.slice(0, MAX_TEXT_CHARS);
    } else {
      const fetched = await fetchJobText(url);
      if (!fetched.ok) return json({ error: fetched.error }, 422);
      text = fetched.text.slice(0, MAX_TEXT_CHARS);
    }
    if (!text) return json({ error: "empty_text" }, 422);

    const result = await callAnthropic(text);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }
    const r = (result.parsed && typeof result.parsed === "object" ? result.parsed : {}) as Record<string, unknown>;
    const empRaw = typeof r.employment_type === "string" ? r.employment_type : null;
    const parsed = {
      title: asStr(r.title, 300),
      seniority: asStr(r.seniority, 100),
      employment_type: empRaw && EMP.has(empRaw) ? empRaw : null,
      location: asStr(r.location, 300),
      is_remote: typeof r.is_remote === "boolean" ? r.is_remote : null,
      description: asStr(r.description, 4000),
      responsibilities: asArr(r.responsibilities),
      requirements: asArr(r.requirements),
      nice_to_have: asArr(r.nice_to_have),
      skills: asArr(r.skills, 100, 200),
      languages: asArr(r.languages, 20, 100),
    };
    return json({ parsed, source_chars: text.length });
  } catch (error) {
    console.error("import-vacancy unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
