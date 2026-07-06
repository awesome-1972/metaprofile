// supabase/functions/parse-resume/index.ts
//
// Metaprofile ATS — фаза M4b — Edge Function: parse-resume (Epic C, US-C02).
//
// Приймає вже витягнутий на клієнті (з pdf/docx у браузері) текст резюме,
// парсить його через Anthropic (forced tool-use, мирор c2c-extract) у
// структурований JSON, зберігає сирий текст + структурований результат на
// ats_candidates та (обережно, БЕЗ перетирання наявних значень) підтягує
// full_name/email/phone/messengers у порожні поля картки кандидата.
//
// ── AUTH-КОНТРАКТ (мирор grant-management/generate-candidate-report) ────────
//   • service_role client всередині функції — RLS bypass ЛИШЕ тут, для
//     читання/запису ats_candidates ПІСЛЯ підтвердження scope.
//   • Викликач верифікується через supabase.auth.getUser(jwt) з Authorization
//     заголовка — НІКОЛИ з body.
//   • Scope: mp_can_edit_candidate(candidate_id) через RPC ПІД JWT ВИКЛИКАЧА
//     (asCaller client, не service_role) — auth.uid() у security definer
//     функції резолвиться з цього JWT, так само як RLS резолвив би його у
//     звичайному запиті. Немає прав → 403 forbidden.
//
// ── ANTI-FABRICATION (мирор c2c-extract) ────────────────────────────────────
//   Системний промт СУВОРО забороняє вигадувати дані. Все, чого немає в
//   тексті резюме — null (для скалярів) або порожній список (для масивів).
//   Жодних припущень, жодного заповнення "типових" значень.
//
// ── ANTHROPIC PROVIDER (Messages API, forced tool call) ─────────────────────
//   POST https://api.anthropic.com/v1/messages, x-api-key ANTHROPIC_API_KEY,
//   model ANTHROPIC_MODEL (дефолт claude-sonnet-4-6), tool_choice forced —
//   структурований вихід (Anthropic-еквівалент OpenAI strict json_schema).
//   ANTHROPIC_API_KEY відсутній → 503 (жодного фейкового парсингу-заглушки).
//
// ── CONTRACT ─────────────────────────────────────────────────────────────────
//   POST { candidate_id: uuid, resume_text: string, file_name?: string }
//     200 { parsed: {
//       full_name, email, phone, location, summary,
//       positions: [{title, company, from, to, description}],
//       education:  [{degree, institution, year}],
//       skills: string[],
//       languages: [{language, level}],
//       messengers: { telegram?, linkedin?, viber?, whatsapp?, facebook? }
//     } }
//
//   401 { error: "unauthorized" }
//   403 { error: "forbidden" }               — немає mp_can_edit_candidate
//   404 { error: "candidate_not_found" }
//   422 { error: "invalid_body" | "resume_text_too_long" }
//   503 { error: "ai_not_configured" }
//   502 { error: "ai_provider_error", detail }
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy parse-resume
// Secrets: ANTHROPIC_API_KEY (required; відсутній → 503),
//          ANTHROPIC_MODEL   (optional; дефолт claude-sonnet-4-6).
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned.
//          ALLOWED_ORIGIN (опційно, інакше "*" для dev).
// config:  verify_jwt = true (звичайний користувацький JWT; scope перевіряється
//          вручну всередині через RPC — verify_jwt лише перевіряє підпис).
//
// TODO(open-question): файл резюме (бінарник) сам по собі НЕ приймається цією
// функцією — текст має бути вже витягнутий у браузері (pdf.js/mammoth тощо),
// мирор Q8/резюме-нотатки з 20260706090000 (MVP — один файл, без версійності).
// Якщо власник підтвердить потребу зберігати сам бінарник — окрема функція
// upload-resume + Storage bucket, поза цим скоупом.

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
const MAX_RESUME_CHARS = 100_000;
const MAX_FILE_NAME_CHARS = 300;

// Anthropic Messages API (мирор c2c-extract / generate-candidate-report).
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

// ── Модель виходу парсингу резюме (structured, tool-use forced) ────────────
interface ParsedPosition {
  title: string | null;
  company: string | null;
  from: string | null;
  to: string | null;
  description: string | null;
}
interface ParsedEducation {
  degree: string | null;
  institution: string | null;
  year: string | null;
}
interface ParsedLanguage {
  language: string | null;
  level: string | null;
}
interface ParsedMessengers {
  telegram?: string | null;
  linkedin?: string | null;
  viber?: string | null;
  whatsapp?: string | null;
  facebook?: string | null;
}
interface ParsedResume {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  positions: ParsedPosition[];
  education: ParsedEducation[];
  skills: string[];
  languages: ParsedLanguage[];
  messengers: ParsedMessengers;
}

function asNullableString(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
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

// Validate + coerce the model's raw tool input into a safe ParsedResume.
// Never throws on shape drift — anything malformed degrades to null/[] rather
// than fabricating a value (anti-fabrication also applies to our own parsing).
function validateParsed(raw: unknown): ParsedResume {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const positionsIn = Array.isArray(r.positions) ? r.positions : [];
  const positions: ParsedPosition[] = positionsIn.slice(0, 50).map((p) => {
    const pp = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return {
      title: asNullableString(pp.title, 300),
      company: asNullableString(pp.company, 300),
      from: asNullableString(pp.from, 50),
      to: asNullableString(pp.to, 50),
      description: asNullableString(pp.description, 4000),
    };
  });

  const educationIn = Array.isArray(r.education) ? r.education : [];
  const education: ParsedEducation[] = educationIn.slice(0, 20).map((e) => {
    const ee = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
    return {
      degree: asNullableString(ee.degree, 300),
      institution: asNullableString(ee.institution, 300),
      year: asNullableString(ee.year, 50),
    };
  });

  const languagesIn = Array.isArray(r.languages) ? r.languages : [];
  const languages: ParsedLanguage[] = languagesIn.slice(0, 20).map((l) => {
    const ll = (l && typeof l === "object" ? l : {}) as Record<string, unknown>;
    return {
      language: asNullableString(ll.language, 100),
      level: asNullableString(ll.level, 100),
    };
  });

  const messengersIn = (r.messengers && typeof r.messengers === "object" ? r.messengers : {}) as Record<
    string,
    unknown
  >;
  const messengers: ParsedMessengers = {};
  for (const key of ["telegram", "linkedin", "viber", "whatsapp", "facebook"] as const) {
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
    "Ти — парсер резюме для ATS рекрутингової агенції. Тобі дають сирий текст",
    "резюме кандидата (витягнутий з pdf/docx). Твоє єдине завдання — витягти",
    "структуровані дані, які ФАКТИЧНО присутні в тексті.",
    "",
    "АБСОЛЮТНІ ПРАВИЛА — не порушувати:",
    "1. НІКОЛИ не вигадуй, не додумуй і не доповнюй дані. Якщо факт не",
    "   зазначений у тексті — поверни null (для одиничних полів) або порожній",
    "   список (для масивів). НЕ вгадуй email/телефон/дати за відсутності",
    "   явного зазначення в тексті.",
    "2. Не нормалізуй і не перекладай зміст — переноси формулювання максимально",
    "   близько до оригіналу (мова тексту як є).",
    "3. positions/education — у порядку, як вони йдуть у резюме (як правило,",
    "   від найновішого до найстарішого, якщо текст так впорядкований).",
    "4. messengers — заповнюй лише ті канали, що явно згадані (юзернейм,",
    "   номер, URL-профіль); канали без явної згадки не додавай у обʼєкт.",
    "5. skills — список окремих навичок/технологій, без дублікатів.",
    "6. Повертай СУВОРО структуровані дані відповідно до наданої схеми — без",
    "   жодного додаткового тексту.",
  ].join("\n");
}

function buildInputSchema(): unknown {
  const nullableString = { type: ["string", "null"] };
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      full_name: nullableString,
      email: nullableString,
      phone: nullableString,
      location: nullableString,
      summary: nullableString,
      positions: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: nullableString,
            company: nullableString,
            from: nullableString,
            to: nullableString,
            description: nullableString,
          },
          required: ["title", "company", "from", "to", "description"],
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            degree: nullableString,
            institution: nullableString,
            year: nullableString,
          },
          required: ["degree", "institution", "year"],
        },
      },
      skills: { type: "array", items: { type: "string" } },
      languages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            language: nullableString,
            level: nullableString,
          },
          required: ["language", "level"],
        },
      },
      messengers: {
        type: "object",
        additionalProperties: false,
        properties: {
          telegram: nullableString,
          linkedin: nullableString,
          viber: nullableString,
          whatsapp: nullableString,
          facebook: nullableString,
        },
      },
    },
    required: ["full_name", "email", "phone", "location", "summary", "positions", "education", "skills", "languages", "messengers"],
  };
}

// One provider call — forced tool call, мирор c2c-extract callProvider.
async function callAnthropic(
  system: string,
  userContent: string,
): Promise<{ ok: true; parsed: unknown } | { ok: false; status: number; message: string }> {
  const tool = {
    name: "emit_parsed_resume",
    description: "Return the resume parsed into structured fields per the schema.",
    input_schema: buildInputSchema(),
  };

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
        temperature: 0,
        system,
        messages: [{ role: "user", content: userContent }],
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
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
  const blocks = (data as { content?: Array<{ type?: string; input?: unknown }> })?.content;
  const toolBlock = Array.isArray(blocks)
    ? blocks.find((b) => b?.type === "tool_use" && b.input !== undefined)
    : undefined;
  if (!toolBlock || toolBlock.input === undefined) {
    return { ok: false, status: 502, message: "Model returned no structured tool output." };
  }
  return { ok: true, parsed: toolBlock.input };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? serviceRoleKey;

    // service_role client — RLS bypass ЛИШЕ всередині цієї функції.
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

    // Клієнт "під JWT викликача" — RPC на mp_can_edit_candidate резолвить
    // auth.uid() з ЦЬОГО JWT (не service_role), так само як RLS-предикат.
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

    const candidateId = body.candidate_id;
    if (!isUuid(candidateId)) return json({ error: "invalid_body", detail: "candidate_id" }, 422);

    const resumeTextRaw = body.resume_text;
    if (typeof resumeTextRaw !== "string" || !resumeTextRaw.trim()) {
      return json({ error: "invalid_body", detail: "resume_text" }, 422);
    }
    const resumeText = resumeTextRaw.trim();
    if (resumeText.length > MAX_RESUME_CHARS) {
      return json({ error: "resume_text_too_long" }, 422);
    }

    let fileName: string | null = null;
    if (body.file_name !== undefined && body.file_name !== null) {
      if (typeof body.file_name !== "string") return json({ error: "invalid_body", detail: "file_name" }, 422);
      fileName = body.file_name.trim().slice(0, MAX_FILE_NAME_CHARS) || null;
    }

    // --- 3. Scope: mp_can_edit_candidate через RPC під JWT викликача ------
    const { data: canEdit, error: accessErr } = await asCaller.rpc("mp_can_edit_candidate", {
      p_candidate_id: candidateId,
    });
    if (accessErr) {
      console.error("parse-resume mp_can_edit_candidate error:", accessErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // --- 4. Провайдер має бути налаштований (жоден фейковий парсинг) -----
    if (!ANTHROPIC_API_KEY) {
      return json({ error: "ai_not_configured" }, 503);
    }

    // --- 5. Кандидат має існувати (під service_role, scope вже підтверджено)
    const { data: candidate, error: candErr } = await admin
      .from("ats_candidates")
      .select("id, full_name, email, phone, messengers")
      .eq("id", candidateId)
      .maybeSingle();
    if (candErr) {
      console.error("parse-resume candidate lookup error:", candErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!candidate) return json({ error: "candidate_not_found" }, 404);

    // --- 6. Виклик Anthropic (forced tool-use, structured output) --------
    const systemPrompt = buildSystemPrompt();
    const userContent = `### Текст резюме\n\n${resumeText}`;

    const result = await callAnthropic(systemPrompt, userContent);
    if (!result.ok) {
      const status = result.status === 429 || result.status === 402 ? result.status : 502;
      return json({ error: "ai_provider_error", detail: result.message }, status);
    }

    const parsed = validateParsed(result.parsed);

    // --- 7. Оновити ats_candidates під service_role -----------------------
    // resume_text/resume_file_name/resume_parsed/resume_uploaded_at — завжди
    // перезаписуються (нове завантаження замінює попереднє, MVP — 1 файл на
    // кандидата, без версійності, узгоджено з 20260706090000).
    const patch: Record<string, unknown> = {
      resume_text: resumeText,
      resume_file_name: fileName,
      resume_parsed: parsed,
      resume_uploaded_at: new Date().toISOString(),
    };

    // full_name/email/phone/messengers — заповнюємо ЛИШЕ порожні поля
    // кандидата, НІКОЛИ не перетираємо наявні значення (явна вимога).
    if (!candidate.full_name?.trim() && parsed.full_name) {
      patch.full_name = parsed.full_name;
    }
    if (!candidate.email?.trim() && parsed.email) {
      patch.email = parsed.email;
    }
    if (!candidate.phone?.trim() && parsed.phone) {
      patch.phone = parsed.phone;
    }
    const existingMessengers = (candidate.messengers && typeof candidate.messengers === "object"
      ? candidate.messengers
      : {}) as Record<string, unknown>;
    const mergedMessengers: Record<string, unknown> = { ...existingMessengers };
    let messengersChanged = false;
    for (const [key, value] of Object.entries(parsed.messengers)) {
      if (!value) continue;
      const existingVal = existingMessengers[key];
      if (typeof existingVal === "string" && existingVal.trim()) continue; // не перетираємо наявне
      mergedMessengers[key] = value;
      messengersChanged = true;
    }
    if (messengersChanged) {
      patch.messengers = mergedMessengers;
    }

    const { error: updateErr } = await admin
      .from("ats_candidates")
      .update(patch)
      .eq("id", candidateId);
    if (updateErr) {
      console.error("parse-resume update error:", updateErr.message);
      return json({ error: "server_error" }, 500);
    }

    // --- 8. Повернути превʼю ------------------------------------------------
    return json({ parsed });
  } catch (error) {
    console.error("parse-resume unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
