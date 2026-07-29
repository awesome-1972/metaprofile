// supabase/functions/parse-cv-preview/index.ts
//
// Metaprofile ATS — Фаза 3, крок 2 — Edge Function: parse-cv-preview.
//
// Парсить CV у структуровані поля для ПРЕВʼЮ — БЕЗ запису в кандидата. Фронт
// показує форму, дає виправити, і лише після підтвердження створює/оновлює
// кандидата (окремим запитом). Додатково повертає можливі збіги з наявними
// кандидатами (дедуп за email/телефоном/ПІБ) — рішення «оновити чи створити»
// за рекрутером.
//
// Два джерела CV (рішення власника — обидва шляхи):
//   • resume_text — вже витягнутий на клієнті (pdf.js/mammoth, resume-parse-client.ts).
//   • drive_file_id — файл у Drive: сервісний акаунт читає його (імперсонація
//     викликача, drive.readonly). PDF → Claude document-блоком; Google Doc →
//     export text/plain → як текст. Інші типи (напр. .docx у Drive) → 422 з
//     підказкою скористатись завантаженням файлу.
//
// ── AUTH-КОНТРАКТ (мирор parse-resume / import-drive-folder) ────────────────
//   • service_role client — RLS bypass ЛИШЕ тут (читання ats_candidates для
//     дедупу, читання vacancies.tenant_id).
//   • Викликач верифікується через getUser(jwt) — НІКОЛИ з body.
//   • Scope: mp_can_edit_vacancy(vacancy_id) під JWT викликача.
//   • Нічого не пишеться в кандидата — лише читання для дедупу.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, resume_text?: string, drive_file_id?: string,
//          file_name?: string }
//     200 { parsed: {...}, matches: [{id, full_name, email, phone}],
//           source_text_chars: number }
//   401 unauthorized · 403 forbidden · 404 vacancy_not_found ·
//   422 invalid_body|no_source|unsupported_drive_type|empty_text ·
//   429 rate_limited · 502 google_error|ai_provider_error · 503 ai_not_configured ·
//   500 server_error
//
// Deploy:  supabase functions deploy parse-cv-preview
// Secrets: ANTHROPIC_API_KEY (обовʼязково), ANTHROPIC_MODEL (опц.),
//          GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY, SUPABASE_* (auto).
// config:  verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGoogleAccessToken, GoogleAuthError } from "../_shared/google-auth.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RESUME_CHARS = 100_000;
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const PDF_MIME = "application/pdf";

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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
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

// ── Модель виходу (мирор parse-resume) ─────────────────────────────────────
interface ParsedResume {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  positions: Array<{ title: string | null; company: string | null; from: string | null; to: string | null; description: string | null }>;
  education: Array<{ degree: string | null; institution: string | null; year: string | null }>;
  skills: string[];
  languages: Array<{ language: string | null; level: string | null }>;
  messengers: Record<string, string>;
}

function asNullableString(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}
function asStringArray(v: unknown, maxItems = 100, maxLen = 300): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = asNullableString(x, maxLen);
    if (s) out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
}
function validateParsed(raw: unknown): ParsedResume {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const positions = (Array.isArray(r.positions) ? r.positions : []).slice(0, 50).map((p) => {
    const pp = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return {
      title: asNullableString(pp.title, 300),
      company: asNullableString(pp.company, 300),
      from: asNullableString(pp.from, 50),
      to: asNullableString(pp.to, 50),
      description: asNullableString(pp.description, 4000),
    };
  });
  const education = (Array.isArray(r.education) ? r.education : []).slice(0, 20).map((e) => {
    const ee = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    return {
      degree: asNullableString(ee.degree, 300),
      institution: asNullableString(ee.institution, 300),
      year: asNullableString(ee.year, 50),
    };
  });
  const languages = (Array.isArray(r.languages) ? r.languages : []).slice(0, 20).map((l) => {
    const ll = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    return { language: asNullableString(ll.language, 100), level: asNullableString(ll.level, 100) };
  });
  const messengersIn = (r.messengers && typeof r.messengers === "object" ? r.messengers : {}) as Record<string, unknown>;
  const messengers: Record<string, string> = {};
  for (const key of ["telegram", "linkedin", "viber", "whatsapp", "facebook"]) {
    const val = asNullableString(messengersIn[key], 500);
    if (val) messengers[key] = val;
  }
  return {
    full_name: asNullableString(r.full_name, 300),
    email: asNullableString(r.email, 300),
    phone: asNullableString(r.phone, 50),
    location: asNullableString(r.location, 300),
    summary: asNullableString(r.summary, 4000),
    positions,
    education,
    skills: asStringArray(r.skills, 100, 200),
    languages,
    messengers,
  };
}

function buildSystemPrompt(): string {
  return [
    "Ти — парсер резюме для ATS рекрутингової агенції. Тобі дають CV кандидата",
    "(текст або PDF). Твоє єдине завдання — витягти структуровані дані, які",
    "ФАКТИЧНО присутні у документі.",
    "",
    "АБСОЛЮТНІ ПРАВИЛА:",
    "1. НІКОЛИ не вигадуй. Немає факту — null (скаляр) або [] (масив).",
    "2. Не нормалізуй і не перекладай зміст — мова як в оригіналі.",
    "3. positions/education — у порядку, як у резюме.",
    "4. messengers — лише явно згадані канали.",
    "5. skills — окремі навички без дублікатів.",
    "6. Повертай СУВОРО за схемою, без зайвого тексту.",
  ].join("\n");
}
function buildInputSchema(): unknown {
  const ns = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      full_name: ns, email: ns, phone: ns, location: ns, summary: ns,
      positions: { type: "array", items: { type: "object", additionalProperties: false, properties: { title: ns, company: ns, from: ns, to: ns, description: ns }, required: ["title", "company", "from", "to", "description"] } },
      education: { type: "array", items: { type: "object", additionalProperties: false, properties: { degree: ns, institution: ns, year: ns }, required: ["degree", "institution", "year"] } },
      skills: { type: "array", items: { type: "string" } },
      languages: { type: "array", items: { type: "object", additionalProperties: false, properties: { language: ns, level: ns }, required: ["language", "level"] } },
      messengers: { type: "object", additionalProperties: false, properties: { telegram: ns, linkedin: ns, viber: ns, whatsapp: ns, facebook: ns } },
    },
    required: ["full_name", "email", "phone", "location", "summary", "positions", "education", "skills", "languages", "messengers"],
  };
}

type AnthropicContent = string | Array<Record<string, unknown>>;
async function callAnthropic(userContent: AnthropicContent): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = { name: "emit_parsed_resume", description: "Return the resume parsed into structured fields per the schema.", input_schema: buildInputSchema() };
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": ANTHROPIC_VERSION, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL, max_tokens: MAX_TOKENS, temperature: 0,
        system: buildSystemPrompt(),
        messages: [{ role: "user", content: userContent }],
        tools: [tool], tool_choice: { type: "tool", name: tool.name },
      }),
    });
  } catch (e) {
    return { ok: false, status: 0, message: `Network error calling model: ${(e as Error).message}` };
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let msg = detail.slice(0, 300);
    try { const p = JSON.parse(detail) as { error?: { message?: string } }; if (p.error?.message) msg = p.error.message; } catch { /* keep */ }
    return { ok: false, status: res.status, message: msg };
  }
  let data: unknown;
  try { data = await res.json(); } catch (e) { return { ok: false, status: 502, message: `Model returned non-JSON: ${(e as Error).message}` }; }
  const blocks = (data as { content?: Array<{ type?: string; input?: unknown }> })?.content;
  const toolBlock = Array.isArray(blocks) ? blocks.find((b) => b?.type === "tool_use" && b.input !== undefined) : undefined;
  if (!toolBlock || toolBlock.input === undefined) return { ok: false, status: 502, message: "Model returned no structured output." };
  return { ok: true, parsed: toolBlock.input };
}

/** base64 з довільних байтів (чанками, щоб не впертись у ліміт стека). */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function normEmail(v: string | null): string | null {
  return v ? v.trim().toLowerCase() || null : null;
}
function normPhone(v: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 7 ? digits : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // --- 1. Auth --------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);
    const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // --- 2. Body --------------------------------------------------------
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
    const resumeTextRaw = typeof body.resume_text === "string" ? body.resume_text.trim() : "";
    const driveFileId = typeof body.drive_file_id === "string" ? body.drive_file_id.trim() : "";
    if (!resumeTextRaw && !driveFileId) return json({ error: "no_source" }, 422);

    // --- 3. Scope + AI config -------------------------------------------
    const { data: canEdit, error: editErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (editErr) { console.error("parse-cv-preview mp_can_edit_vacancy error:", editErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);
    if (!ANTHROPIC_API_KEY) return json({ error: "ai_not_configured" }, 503);

    const { data: vacancy, error: vacErr } = await admin.from("vacancies").select("id, tenant_id").eq("id", vacancyId).maybeSingle();
    if (vacErr) { console.error("parse-cv-preview vacancy lookup error:", vacErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const tenantId = (vacancy as unknown as { tenant_id: string | null }).tenant_id;

    // --- 4. Побудова вхідного контенту для моделі -----------------------
    let userContent: AnthropicContent;
    let sourceChars = 0;

    if (resumeTextRaw) {
      const text = resumeTextRaw.slice(0, MAX_RESUME_CHARS);
      sourceChars = text.length;
      userContent = `### Текст резюме\n\n${text}`;
    } else {
      // Drive: прочитати метадані → залежно від типу читаємо PDF або export.
      let accessToken: string;
      try {
        accessToken = await getGoogleAccessToken(caller.email!, DRIVE_SCOPES);
      } catch (err) {
        const detail = err instanceof GoogleAuthError ? err.message : (err as Error).message;
        console.error("parse-cv-preview getGoogleAccessToken error:", detail);
        return json({ error: "google_error", detail }, 502);
      }
      // Метадані (mimeType, name).
      let metaResp: Response;
      try {
        metaResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?fields=id,name,mimeType&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
      } catch (err) {
        console.error("parse-cv-preview drive meta fetch error:", (err as Error).message);
        return json({ error: "google_error", detail: "Не вдалося звʼязатися з Drive API" }, 502);
      }
      if (!metaResp.ok) {
        const t = await metaResp.text().catch(() => "");
        let detail = `HTTP ${metaResp.status}`;
        if (metaResp.status === 401 || metaResp.status === 403) detail += " — перевірте delegation (drive.readonly) і доступ до файлу.";
        if (metaResp.status === 404) detail += " — файл не знайдено.";
        console.error("parse-cv-preview drive meta error:", t.slice(0, 200));
        return json({ error: "google_error", detail }, 502);
      }
      const meta = await metaResp.json() as { mimeType?: string; name?: string };

      if (meta.mimeType === GOOGLE_DOC_MIME) {
        // Google Doc → export text/plain.
        const expResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}/export?mimeType=text/plain`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!expResp.ok) return json({ error: "google_error", detail: `Export HTTP ${expResp.status}` }, 502);
        const text = (await expResp.text()).trim().slice(0, MAX_RESUME_CHARS);
        if (!text) return json({ error: "empty_text" }, 422);
        sourceChars = text.length;
        userContent = `### Текст резюме\n\n${text}`;
      } else if (meta.mimeType === PDF_MIME) {
        // PDF → завантажити байти → Claude document-блоком.
        const dlResp = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(driveFileId)}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!dlResp.ok) return json({ error: "google_error", detail: `Download HTTP ${dlResp.status}` }, 502);
        const buf = new Uint8Array(await dlResp.arrayBuffer());
        const b64 = bytesToBase64(buf);
        sourceChars = buf.length;
        userContent = [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
          { type: "text", text: "Розпізнай це резюме у структуровані поля за схемою." },
        ];
      } else {
        return json({ error: "unsupported_drive_type", detail: meta.mimeType ?? "unknown" }, 422);
      }
    }

    // --- 5. Виклик моделі ------------------------------------------------
    const result = await callAnthropic(userContent);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }
    const parsed = validateParsed(result.parsed);

    // --- 6. Дедуп: збіги серед наявних кандидатів тенанта ----------------
    const matches: Array<{ id: string; full_name: string | null; email: string | null; phone: string | null }> = [];
    const email = normEmail(parsed.email);
    const phone = normPhone(parsed.phone);
    const fullName = parsed.full_name?.trim() ?? null;
    if (email || phone || fullName) {
      // Тягнемо кандидатів тенанта й фільтруємо в коді (email exact,
      // phone за цифрами, ПІБ за нормалізованим збігом).
      let q = admin.from("ats_candidates").select("id, full_name, email, phone").limit(500);
      if (tenantId) q = q.eq("tenant_id", tenantId);
      const { data: cands, error: candErr } = await q;
      if (candErr) { console.error("parse-cv-preview candidates lookup error:", candErr.message); }
      else {
        for (const c of cands ?? []) {
          const cEmail = normEmail(c.email);
          const cPhone = normPhone(c.phone);
          const cName = (c.full_name ?? "").trim().toLowerCase();
          const hit =
            (email && cEmail && cEmail === email) ||
            (phone && cPhone && cPhone === phone) ||
            (fullName && cName && cName === fullName.toLowerCase());
          if (hit) {
            matches.push({ id: c.id, full_name: c.full_name, email: c.email, phone: c.phone });
            if (matches.length >= 5) break;
          }
        }
      }
    }

    return json({ parsed, matches, source_text_chars: sourceChars });
  } catch (error) {
    console.error("parse-cv-preview unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
