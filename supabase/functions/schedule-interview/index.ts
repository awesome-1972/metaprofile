// supabase/functions/schedule-interview/index.ts
//
// Metaprofile ATS — Edge Function: schedule-interview.
//
// Призначення інтервʼю з Google Meet-лінком з системи. Модель інтеграції
// (рішення власника): сервісний акаунт Google + domain-wide delegation —
// функція ІМПЕРСОНУЄ викликача (його email з auth.users) як організатора
// Google Calendar-події, тож подія і Meet-лінк створюються "від імені"
// реального співробітника агенції, а не від сервісного бота.
//
// ── AUTH-КОНТРАКТ (дзеркалить grant-management/index.ts, log-application-event) ──
//   • service_role client — RLS bypass ЛИШЕ всередині цієї функції.
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Доступ до заявки — через RPC mp_can_access_application(application_id)
//     (та сама функція, що й RLS interviews_select). Немає доступу → 403.
//   • Окремо, ДРУГА перевірка mp_can_edit_vacancy(vacancy_id) — планування
//     зустріч це запис (мірор RLS interviews_insert: admin АБО can_edit на
//     вакансію). Самого read-scope доступу до заявки НЕДОСТАТНЬО для
//     створення реальної Google Calendar-події.
//   • organizer_email ЗАВЖДИ = email викликача з auth.users (JWT), ніколи
//     з body — імперсонація відбувається виключно від імені автентифікованого
//     користувача, що ініціював запит.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { application_id: uuid, scheduled_at: ISO-8601 string,
//          duration_minutes?: number (5–480, дефолт 60),
//          candidate_email?: string, note?: string }
//     Дії:
//       1. Перевірка mp_can_access_application(application_id).
//       2. Читання applications → candidate (full_name) + vacancy (title).
//       3. getGoogleAccessToken(callerEmail, [calendar.events scope]).
//       4. POST https://www.googleapis.com/calendar/v3/calendars/primary/events
//          ?conferenceDataVersion=1, body:
//            { summary: "Інтервʼю: {імʼя кандидата} — {вакансія}",
//              start: { dateTime: scheduled_at }, end: { dateTime: +duration },
//              attendees: candidate_email ? [{ email: candidate_email }] : [],
//              conferenceData: { createRequest: { requestId: uuid() } } }
//       5. Витяг meet_link з response.hangoutLink /
//          conferenceData.entryPoints[type=video].uri.
//       6. Upsert interviews (application_id, scheduled_at, duration_minutes,
//          calendar_event_id, meet_link, organizer_email, interviewer_id=caller,
//          notes=note) — INSERT нового рядка (одна заявка може мати кілька
//          інтервʼю; апдейт конкретного інтервʼю — окрема майбутня дія,
//          не в скоупі цього виклику).
//     200 { ok: true, interview_id, meet_link, event_link }
//
//   401 { error: "unauthorized" }         — немає/невалідний JWT
//   403 { error: "forbidden" }            — немає доступу до заявки
//   404 { error: "application_not_found" }
//   422 { error: "invalid_body" | "invalid_application_id" | "invalid_scheduled_at" |
//                 "invalid_duration_minutes" | "invalid_candidate_email" }
//   429 { error: "rate_limited" }
//   502 { error: "google_error", detail: string }
//        — помилка Google API (Calendar); detail містить підказку щодо
//          domain-wide delegation при 401/403 від Google (див. _shared/google-auth.ts).
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy schedule-interview
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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const MIN_DURATION = 5;
const MAX_DURATION = 480;
const MAX_NOTE_LEN = 4000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Rate limiter — дзеркалить grant-management.
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

interface GoogleEventResponse {
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
  error?: { message?: string; status?: string };
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

    // Клієнт від імені викликача (JWT у заголовку) — ПОТРІБЕН для RPC
    // mp_can_* (вони спираються на auth.uid(); під service_role uid=NULL →
    // перевірки завжди повертали б false). Записи лишаються під service_role.
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
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

    const applicationId = body.application_id;
    if (!isUuid(applicationId)) return json({ error: "invalid_application_id" }, 422);

    const scheduledAtRaw = body.scheduled_at;
    if (typeof scheduledAtRaw !== "string") return json({ error: "invalid_scheduled_at" }, 422);
    const scheduledAt = new Date(scheduledAtRaw);
    if (Number.isNaN(scheduledAt.getTime())) return json({ error: "invalid_scheduled_at" }, 422);

    let durationMinutes = 60;
    if (body.duration_minutes !== undefined) {
      const d = Number(body.duration_minutes);
      if (!Number.isFinite(d) || d < MIN_DURATION || d > MAX_DURATION) {
        return json({ error: "invalid_duration_minutes" }, 422);
      }
      durationMinutes = Math.round(d);
    }

    let candidateEmail: string | null = null;
    if (body.candidate_email !== undefined && body.candidate_email !== null && body.candidate_email !== "") {
      if (typeof body.candidate_email !== "string" || !EMAIL_RE.test(body.candidate_email)) {
        return json({ error: "invalid_candidate_email" }, 422);
      }
      candidateEmail = body.candidate_email.trim().toLowerCase();
    }

    const note = typeof body.note === "string" ? body.note.trim().slice(0, MAX_NOTE_LEN) : null;

    // --- 3. Scope-перевірка: mp_can_access_application (дзеркалить RLS) ---
    const { data: canAccess, error: accessErr } = await supabaseAuth.rpc("mp_can_access_application", {
      p_application_id: applicationId,
    });
    if (accessErr) {
      console.error("schedule-interview mp_can_access_application error:", accessErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canAccess) return json({ error: "forbidden" }, 403);

    // --- 4. Дані заявки: імʼя кандидата, назва вакансії + vacancy_id ------
    const { data: application, error: appErr } = await supabase
      .from("applications")
      .select("id, vacancy_id, candidate:ats_candidates(full_name), vacancy:vacancies(title)")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr) {
      console.error("schedule-interview application lookup error:", appErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!application) return json({ error: "application_not_found" }, 404);

    // Планування зустрічі — операція запису (мірор RLS interviews_insert:
    // mp_is_workspace_admin() OR mp_can_edit_vacancy(vacancy_id)). Самого
    // mp_can_access_application (read-scope) недостатньо для write-дії —
    // без цієї другої перевірки read-only грант (can_edit=false) міг би
    // створювати реальні Google Calendar-події, що суперечить RLS-моделі.
    const { data: canEdit, error: editErr } = await supabaseAuth.rpc("mp_can_edit_vacancy", {
      p_vacancy_id: application.vacancy_id,
    });
    if (editErr) {
      console.error("schedule-interview mp_can_edit_vacancy error:", editErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    const candidateName =
      (application as unknown as { candidate: { full_name: string } | null }).candidate?.full_name ?? "Кандидат";
    const vacancyTitle =
      (application as unknown as { vacancy: { title: string } | null }).vacancy?.title ?? "Вакансія";

    // --- 5. Google Calendar: створення події з Meet-лінком ----------------
    const endAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(caller.email, CALENDAR_SCOPES);
    } catch (err) {
      const detail = err instanceof GoogleAuthError ? err.message : (err as Error).message;
      console.error("schedule-interview getGoogleAccessToken error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    const eventBody = {
      summary: `Інтервʼю: ${candidateName} — ${vacancyTitle}`,
      description: note ?? undefined,
      start: { dateTime: scheduledAt.toISOString() },
      end: { dateTime: endAt.toISOString() },
      attendees: candidateEmail ? [{ email: candidateEmail }] : [],
      conferenceData: {
        createRequest: {
          requestId: crypto.randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    };

    let googleResponse: Response;
    try {
      googleResponse = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventBody),
        },
      );
    } catch (err) {
      console.error("schedule-interview Calendar fetch error:", (err as Error).message);
      return json({ error: "google_error", detail: "Не вдалося звʼязатися з Google Calendar API" }, 502);
    }

    let googleEvent: GoogleEventResponse;
    try {
      googleEvent = await googleResponse.json();
    } catch {
      return json({ error: "google_error", detail: `Google Calendar повернув невалідний JSON (HTTP ${googleResponse.status})` }, 502);
    }

    if (!googleResponse.ok || !googleEvent.id) {
      let detail = googleEvent.error?.message || `HTTP ${googleResponse.status}`;
      if (googleResponse.status === 401 || googleResponse.status === 403) {
        detail += " — перевірте domain-wide delegation (Google Workspace Admin → Security → API Controls) для scope calendar.events.";
      }
      console.error("schedule-interview Calendar API error:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    const meetLink =
      googleEvent.hangoutLink ??
      googleEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      null;

    // --- 6. Upsert interviews ---------------------------------------------
    const { data: interview, error: insertErr } = await supabase
      .from("interviews")
      .insert({
        application_id: applicationId,
        interviewer_id: caller.id,
        // interview_type enum ('phone_screen','technical','behavioral',
        // 'culture_fit','final','other') не має спеціального значення для
        // "відеодзвінок" — Google Meet-канал не є типом інтервʼю по суті,
        // тож лишаємо дефолт 'other'; тип (technical/final/...) редагується
        // окремо, поза цим Edge-викликом.
        interview_type: "other",
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: durationMinutes,
        calendar_event_id: googleEvent.id,
        meet_link: meetLink,
        organizer_email: caller.email,
        notes: note,
      })
      .select("id")
      .single();
    if (insertErr || !interview) {
      console.error("schedule-interview interviews insert error:", insertErr?.message);
      return json({ error: "server_error" }, 500);
    }

    return json({
      ok: true,
      interview_id: interview.id,
      meet_link: meetLink,
      event_link: googleEvent.htmlLink ?? null,
    });
  } catch (error) {
    console.error("schedule-interview unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
