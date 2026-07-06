// supabase/functions/fetch-meet-transcript/index.ts
//
// Metaprofile ATS — Edge Function: fetch-meet-transcript.
//
// Підтягує ГОТОВИЙ транскрипт зустрічі Google Meet (Google Doc у Drive,
// який Meet автоматично створює функцією "Transcripts", за умови увімкнених
// Host controls → Meeting records на тарифі Workspace, що це підтримує).
//
// ОБМЕЖЕННЯ (важливо): це НЕ speech-to-text і НЕ аудіо-транскрибація. Функція
// лише читає вже готовий текстовий документ через Google Docs API. Якщо
// зустріч не мала увімкненого запису транскрипта — документа не існує, і
// підтягнути нема чого. Аудіо-транскрибація "з нуля" — окремий, ще не
// реалізований етап (потребував би Speech-to-Text API або зовнішній сервіс).
//
// ── AUTH-КОНТРАКТ (дзеркалить schedule-interview/index.ts) ─────────────────
//   • service_role client — RLS bypass ЛИШЕ всередині цієї функції.
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Доступ на ЧИТАННЯ — через RPC mp_can_access_application(application_id)
//     інтервʼю (interviews.application_id), дзеркалить RLS interviews_select.
//   • Доступ на ЗАПИС (збереження transcript) — мірор RLS interviews_update:
//     mp_is_workspace_admin() OR interviewer_id = caller OR
//     mp_can_edit_vacancy(vacancy_id). Без цього read-only грант міг би
//     перезаписувати transcript.
//   • Google Docs API викликається з імперсонацією ВИКЛИКАЧА (не organizer_email
//     інтервʼю) — читає документ, до якого повинен мати доступ саме той, хто
//     запитує (типово рекрутер/інтервʼюер зі спільного Workspace-домену).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { interview_id: uuid, doc_url_or_id: string }
//     doc_url_or_id — або повний URL виду
//       https://docs.google.com/document/d/<DOC_ID>/edit, або сам <DOC_ID>.
//     Дії:
//       1. Перевірка існування interviews.id → application_id →
//          mp_can_access_application.
//       2. Витяг docId з doc_url_or_id (regex /document/d/([a-zA-Z0-9_-]+)/
//          або весь рядок як id, якщо regex не збігся).
//       3. getGoogleAccessToken(callerEmail, [documents.readonly]).
//       4. GET https://docs.googleapis.com/v1/documents/{docId}.
//       5. Зібрати plain text з body.content[].paragraph.elements[].textRun.content
//          (послідовна конкатенація параграфів, без форматування).
//       6. Обрізати до 300 000 символів (MAX_TRANSCRIPT_CHARS).
//       7. UPDATE interviews SET transcript=..., transcript_doc_id=docId,
//          transcript_fetched_at=now() WHERE id=interview_id.
//     200 { ok: true, chars: number, preview: string (перші 500 символів) }
//
//   401 { error: "unauthorized" }          — немає/невалідний JWT
//   403 { error: "forbidden" }             — немає доступу до заявки інтервʼю
//   404 { error: "interview_not_found" }
//   422 { error: "invalid_body" | "invalid_interview_id" | "invalid_doc_url" |
//                 "empty_transcript" }     — документ існує, але без тексту
//   429 { error: "rate_limited" }
//   502 { error: "google_error", detail: string }
//        — помилка Google Docs API; 401/403 від Google → підказка щодо
//          domain-wide delegation і scope documents.readonly (+ drive.readonly,
//          якщо документ треба читати за посиланням поза власним Drive).
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy fetch-meet-transcript
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto-provisioned);
//          GOOGLE_SA_EMAIL, GOOGLE_SA_PRIVATE_KEY (див. docs/google-workspace-setup.md);
//          ALLOWED_ORIGIN (опційно, інакше "*" для dev).
// config:  verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGoogleAccessToken, GoogleAuthError } from "../_shared/google-auth.ts";

// --- CORS -------------------------------------------------------------
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// documents.readonly — читання вмісту документа. drive.readonly додається на
// делегацію (Workspace Admin), щоб охопити випадки, коли документ
// розшарений через Drive-посилання поза структурою, яку documents.get бачить
// напряму; сам виклик тут — лише Docs API (документ читається за ID).
const DOCS_SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];
const MAX_TRANSCRIPT_CHARS = 300_000;
const PREVIEW_CHARS = 500;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Rate limiter — дзеркалить schedule-interview/grant-management.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { count: 1, windowStart: now });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

/**
 * Витягує Google Docs document ID з URL (docs.google.com/document/d/<ID>/...)
 * або повертає вхідний рядок як-є, якщо це вже виглядає як голий ID
 * (Google Docs ID: літери/цифри/-/_ , зазвичай 25–70 символів).
 */
function extractDocId(input: string): string | null {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

interface GoogleDocParagraphElement {
  textRun?: { content?: string };
}
interface GoogleDocStructuralElement {
  paragraph?: { elements?: GoogleDocParagraphElement[] };
  table?: {
    tableRows?: {
      tableCells?: { content?: GoogleDocStructuralElement[] }[];
    }[];
  };
}
interface GoogleDocResponse {
  body?: { content?: GoogleDocStructuralElement[] };
  error?: { message?: string; status?: string };
}

/** Рекурсивно збирає plain text з body.content (параграфи + вкладені таблиці — Meet-транскрипти часто у форматі таблиці "спікер | текст"). */
function extractPlainText(elements: GoogleDocStructuralElement[] | undefined): string {
  if (!elements) return "";
  let out = "";
  for (const el of elements) {
    if (el.paragraph?.elements) {
      for (const run of el.paragraph.elements) {
        if (run.textRun?.content) out += run.textRun.content;
      }
    }
    if (el.table?.tableRows) {
      for (const row of el.table.tableRows) {
        for (const cell of row.tableCells ?? []) {
          out += extractPlainText(cell.content);
          out += "\t";
        }
        out += "\n";
      }
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Верифікація JWT (НЕ з body) ---------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (!caller.email) {
      return json({ error: "server_error", detail: "caller has no email in auth.users" }, 500);
    }

    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);

    // --- 2. Parse body ---------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const interviewId = body.interview_id;
    if (!isUuid(interviewId)) return json({ error: "invalid_interview_id" }, 422);

    const docUrlOrId = body.doc_url_or_id;
    if (typeof docUrlOrId !== "string" || !docUrlOrId.trim()) return json({ error: "invalid_doc_url" }, 422);
    const docId = extractDocId(docUrlOrId);
    if (!docId) return json({ error: "invalid_doc_url" }, 422);

    // --- 3. Інтервʼю + scope-перевірка ------------------------------------
    const { data: interview, error: interviewErr } = await supabase
      .from("interviews")
      .select("id, application_id, interviewer_id, application:applications(vacancy_id)")
      .eq("id", interviewId)
      .maybeSingle();
    if (interviewErr) {
      console.error("fetch-meet-transcript interview lookup error:", interviewErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!interview) return json({ error: "interview_not_found" }, 404);

    const { data: canAccess, error: accessErr } = await supabase.rpc("mp_can_access_application", {
      p_application_id: interview.application_id,
    });
    if (accessErr) {
      console.error("fetch-meet-transcript mp_can_access_application error:", accessErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canAccess) return json({ error: "forbidden" }, 403);

    // Збереження транскрипта — UPDATE interviews (мірор RLS interviews_update:
    // mp_is_workspace_admin() OR interviewer_id = caller OR
    // mp_can_edit_vacancy(vacancy_id)). Read-scope mp_can_access_application
    // сам по собі недостатній для запису — інакше read-only грант міг би
    // перезаписувати interviews.transcript.
    const vacancyId = (interview as unknown as { application: { vacancy_id: string } | null }).application?.vacancy_id;
    const isOwnInterview = interview.interviewer_id === caller.id;
    let canWrite = isOwnInterview;
    if (!canWrite && vacancyId) {
      const { data: canEdit, error: editErr } = await supabase.rpc("mp_can_edit_vacancy", {
        p_vacancy_id: vacancyId,
      });
      if (editErr) {
        console.error("fetch-meet-transcript mp_can_edit_vacancy error:", editErr.message);
        return json({ error: "server_error" }, 500);
      }
      canWrite = Boolean(canEdit);
    }
    if (!canWrite) return json({ error: "forbidden" }, 403);

    // --- 4. Google Docs API: читання документа ----------------------------
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(caller.email, DOCS_SCOPES);
    } catch (err) {
      const detail = err instanceof GoogleAuthError ? err.message : (err as Error).message;
      console.error("fetch-meet-transcript getGoogleAccessToken error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    let googleResponse: Response;
    try {
      googleResponse = await fetch(`https://docs.googleapis.com/v1/documents/${encodeURIComponent(docId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      console.error("fetch-meet-transcript Docs API fetch error:", (err as Error).message);
      return json({ error: "google_error", detail: "Не вдалося звʼязатися з Google Docs API" }, 502);
    }

    let docResponse: GoogleDocResponse;
    try {
      docResponse = await googleResponse.json();
    } catch {
      return json({ error: "google_error", detail: `Google Docs API повернув невалідний JSON (HTTP ${googleResponse.status})` }, 502);
    }

    if (!googleResponse.ok) {
      let detail = docResponse.error?.message || `HTTP ${googleResponse.status}`;
      if (googleResponse.status === 401 || googleResponse.status === 403) {
        detail +=
          " — перевірте domain-wide delegation (scope documents.readonly/drive.readonly) " +
          "і що викликач має доступ до цього документа у Google Workspace.";
      }
      if (googleResponse.status === 404) {
        detail += " — документ не знайдено (перевірте посилання; можливо, транскрипт ще не створено Meet).";
      }
      console.error("fetch-meet-transcript Docs API error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    // --- 5. Збірка plain text + обмеження розміру -------------------------
    let text = extractPlainText(docResponse.body?.content).trim();
    if (!text) return json({ error: "empty_transcript" }, 422);
    let truncated = false;
    if (text.length > MAX_TRANSCRIPT_CHARS) {
      text = text.slice(0, MAX_TRANSCRIPT_CHARS);
      truncated = true;
    }

    // --- 6. Збереження в interviews ---------------------------------------
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("interviews")
      .update({
        transcript: text,
        transcript_doc_id: docId,
        transcript_fetched_at: nowIso,
      })
      .eq("id", interviewId);
    if (updateErr) {
      console.error("fetch-meet-transcript interviews update error:", updateErr.message);
      return json({ error: "server_error" }, 500);
    }

    return json({
      ok: true,
      chars: text.length,
      truncated,
      preview: text.slice(0, PREVIEW_CHARS),
    });
  } catch (error) {
    console.error("fetch-meet-transcript unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
