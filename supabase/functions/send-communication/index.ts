// supabase/functions/send-communication/index.ts
//
// Metaprofile ATS — фаза M4b — Edge Function: send-communication (Epic F,
// US-F01/US-F02). Resend email-провайдер + масова відправка з можливістю
// скасування до фактичної відправки (candidate_communications, batch_id).
//
// ── AUTH-КОНТРАКТ (мирор grant-management/generate-candidate-report) ────────
//   • service_role client всередині функції — RLS bypass ЛИШЕ тут, для
//     читання/запису candidate_communications ПІСЛЯ підтвердження scope на
//     кожного кандидата окремо.
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Scope на КОЖНОГО кандидата: mp_can_edit_candidate(candidate_id) АБО (якщо
//     передано vacancy_id) mp_can_edit_vacancy(vacancy_id) через RPC ПІД JWT
//     ВИКЛИКАЧА (asCaller client) — auth.uid() резолвиться з JWT, як у RLS.
//     Кандидати БЕЗ доступу НЕ блокують весь запит — пропускаються з
//     поміткою у результаті (skipped: [{candidate_id, reason: "forbidden"}]).
//   • created_by комунікації = caller.id (з JWT), ніколи з body.
//
// ── RESEND PROVIDER ──────────────────────────────────────────────────────────
//   POST https://api.resend.com/emails, Authorization: Bearer RESEND_API_KEY,
//   { from: FROM_EMAIL, to, subject, html }.
//   RESEND_API_KEY відсутній → 503 (режим заглушки, як TurboSMS у хабі —
//   ЖОДНОЇ фейкової "успішної" відправки без реального провайдера).
//
// ── CONTRACT ─────────────────────────────────────────────────────────────────
//   POST { action: "send_now", communication_ids: uuid[] }
//     200 { ok: true, sent: number, failed: number, skipped: [...],
//           results: [{communication_id, status, error?}] }
//     422 { error: "channel_not_supported" } — якщо ЄДИНА ціль не email-канал
//         (у масовому виклику неемейлові канали позначаються в skipped, не
//         зупиняють увесь batch — 422 повертається лише коли ВЗАГАЛІ немає
//         жодної email-комунікації серед переданих id).
//
//   POST { action: "queue_batch", candidate_ids: uuid[], vacancy_id?: uuid,
//          subject: string, body: string }
//     200 { ok: true, batch_id: uuid, queued: number, skipped: [...] }
//
//   POST { action: "send_batch", batch_id: uuid }
//     200 { ok: true, sent: number, failed: number, results: [...] }
//
//   POST { action: "cancel_batch", batch_id: uuid }
//     200 { ok: true, cancelled: number }
//
//   401 { error: "unauthorized" }
//   404 { error: "batch_not_found" }
//   422 { error: "invalid_action" | "invalid_body" | "invalid_communication_ids"
//               | "invalid_candidate_ids" | "batch_too_large"
//               | "channel_not_supported" | "no_queued_in_batch" }
//   503 { error: "email_not_configured" }
//   500 { error: "server_error" }
//
// Rate: послідовна відправка з паузою SEND_DELAY_MS між листами (простий
// захист від провайдерського rate-limit — немає паралелізму навмисно).
// Ліміт: BATCH_MAX = 100 кандидатів на один queue_batch/send_batch виклик.
//
// Плейсхолдери в body листа: {{name}} → candidate.full_name (єдиний
// підтримуваний плейсхолдер у MVP; довільні {{field}} — поза скоупом).
//
// Deploy:  supabase functions deploy send-communication
// Secrets: RESEND_API_KEY (required для send_now/send_batch; відсутній → 503),
//          FROM_EMAIL      (required разом із RESEND_API_KEY, напр.
//                           "Metaprofile ATS <noreply@yourdomain.com>").
//          SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned. ALLOWED_ORIGIN опційно.
// config:  verify_jwt = true (роль/scope перевіряється вручну всередині).
//
// TODO(open-question): non-email канали (telegram/viber/whatsapp/linkedin/
// facebook/phone/other) — за задумом Epic F це лінк-базовані канали
// (рекрутер сам відкриває чат за посиланням і надсилає вручну); ця функція
// НЕ намагається інтегруватись із жодним із них, лише позначає такі рядки
// статусом-помилкою 422 channel_not_supported при спробі send_now/send_batch.
// Якщо власник підтвердить потребу автоматизації для конкретного каналу —
// окрема наступна ітерація.

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
const ACTIONS = new Set(["send_now", "queue_batch", "send_batch", "cancel_batch"]);
const BATCH_MAX = 100;
const SEND_DELAY_MS = 150; // проста послідовна пауза, захист від провайдерського rate-limit
const MAX_SUBJECT_CHARS = 500;
const MAX_BODY_CHARS = 50_000;

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function isUuidArray(v: unknown, max: number): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.length <= max && v.every(isUuid);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// {{name}} → full_name кандидата. Єдиний підтримуваний плейсхолдер у MVP.
function renderBody(template: string, candidateName: string): string {
  return template.replaceAll("{{name}}", candidateName);
}

interface CommRow {
  id: string;
  candidate_id: string;
  vacancy_id: string | null;
  channel: string;
  subject: string | null;
  body: string;
  status: string;
  batch_id: string | null;
}

interface SendResult {
  communication_id: string;
  status: "sent" | "failed";
  error?: string;
}

// One Resend call. Returns { ok:true, id } on 2xx, else a human-readable error.
async function sendViaResend(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
  } catch (e) {
    return { ok: false, message: `Network error calling Resend: ${(e as Error).message}` };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let providerMessage = detail.slice(0, 300);
    try {
      const parsed = JSON.parse(detail) as { message?: string };
      if (parsed.message) providerMessage = parsed.message;
    } catch {
      /* keep raw slice */
    }
    let message: string;
    if (res.status === 429) message = `Resend rate limit exceeded (429): ${providerMessage}`;
    else if (res.status === 401 || res.status === 403) {
      message = `Resend authentication failed (${res.status}): check RESEND_API_KEY.`;
    } else if (res.status >= 500) {
      message = `Resend is temporarily unavailable (${res.status}): ${providerMessage}`;
    } else {
      message = `Resend request failed (${res.status}): ${providerMessage}`;
    }
    return { ok: false, message };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, message: "Resend returned a non-JSON response." };
  }
  const id = (data as { id?: unknown })?.id;
  if (typeof id !== "string" || !id) {
    return { ok: false, message: "Resend response did not include an email id." };
  }
  return { ok: true, id };
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

    // Клієнт "під JWT викликача" — RPC резолвить auth.uid() з ЦЬОГО JWT.
    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Helper: чи має викликач право редагувати цього кандидата (напряму
    // АБО через can_edit на передану вакансію — мирор RLS-політики
    // candidate_communications_insert/update з 20260706090000).
    async function canEditCandidate(candidateId: string, vacancyId: string | null): Promise<boolean> {
      const { data: canEditCand, error: candErr } = await asCaller.rpc("mp_can_edit_candidate", {
        p_candidate_id: candidateId,
      });
      if (candErr) {
        console.error("send-communication mp_can_edit_candidate error:", candErr.message);
        return false;
      }
      if (canEditCand) return true;
      if (!vacancyId) return false;
      const { data: canEditVac, error: vacErr } = await asCaller.rpc("mp_can_edit_vacancy", {
        p_vacancy_id: vacancyId,
      });
      if (vacErr) {
        console.error("send-communication mp_can_edit_vacancy error:", vacErr.message);
        return false;
      }
      return Boolean(canEditVac);
    }

    // --- 2. Parse body -----------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    const action = typeof body.action === "string" ? body.action : "";
    if (!ACTIONS.has(action)) return json({ error: "invalid_action" }, 422);

    // ══════════════════════════════════════════════════════════════════
    // action: send_now — відправляє вже існуючі draft/queued email-комунікації.
    // ══════════════════════════════════════════════════════════════════
    if (action === "send_now") {
      const ids = body.communication_ids;
      if (!isUuidArray(ids, BATCH_MAX)) return json({ error: "invalid_communication_ids" }, 422);

      if (!RESEND_API_KEY || !FROM_EMAIL) {
        return json({ error: "email_not_configured" }, 503);
      }

      const { data: comms, error: commsErr } = await admin
        .from("candidate_communications")
        .select("id, candidate_id, vacancy_id, channel, subject, body, status, batch_id")
        .in("id", ids);
      if (commsErr) {
        console.error("send-communication send_now lookup error:", commsErr.message);
        return json({ error: "server_error" }, 500);
      }
      const rows = (comms ?? []) as CommRow[];

      const skipped: Array<{ communication_id: string; reason: string }> = [];
      const eligible: CommRow[] = [];
      const foundIds = new Set(rows.map((r) => r.id));
      for (const id of ids) {
        if (!foundIds.has(id)) skipped.push({ communication_id: id, reason: "not_found" });
      }
      for (const row of rows) {
        if (row.status !== "draft" && row.status !== "queued") {
          skipped.push({ communication_id: row.id, reason: `invalid_status:${row.status}` });
          continue;
        }
        if (row.channel !== "email") {
          skipped.push({ communication_id: row.id, reason: "channel_not_supported" });
          continue;
        }
        eligible.push(row);
      }

      if (eligible.length === 0) {
        // Нічого відправляти. Якщо ЖОДНОГО email серед переданих — явний 422,
        // інакше (усі просто not_found/invalid_status) — 200 з нульовими лічильниками.
        const anyEmail = rows.some((r) => r.channel === "email");
        if (!anyEmail && rows.length > 0) return json({ error: "channel_not_supported" }, 422);
        return json({ ok: true, sent: 0, failed: 0, skipped, results: [] });
      }

      // Авторизація по кожному кандидату окремо — недоступні пропускаються.
      const authorized: CommRow[] = [];
      for (const row of eligible) {
        const allowed = await canEditCandidate(row.candidate_id, row.vacancy_id);
        if (!allowed) {
          skipped.push({ communication_id: row.id, reason: "forbidden" });
          continue;
        }
        authorized.push(row);
      }

      const results: SendResult[] = [];
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < authorized.length; i++) {
        const row = authorized[i];
        const { data: candidate } = await admin
          .from("ats_candidates")
          .select("full_name, email")
          .eq("id", row.candidate_id)
          .maybeSingle();
        const to = candidate?.email;
        if (!to) {
          failedCount++;
          results.push({ communication_id: row.id, status: "failed", error: "candidate_has_no_email" });
          await admin
            .from("candidate_communications")
            .update({ status: "failed", error: "candidate_has_no_email" })
            .eq("id", row.id);
          continue;
        }

        const renderedBody = renderBody(row.body, candidate?.full_name ?? "");
        const sendResult = await sendViaResend(to, row.subject ?? "", renderedBody);

        if (sendResult.ok) {
          sentCount++;
          results.push({ communication_id: row.id, status: "sent" });
          await admin
            .from("candidate_communications")
            .update({ status: "sent", sent_at: new Date().toISOString(), external_id: sendResult.id, error: null })
            .eq("id", row.id);
        } else {
          failedCount++;
          results.push({ communication_id: row.id, status: "failed", error: sendResult.message });
          await admin
            .from("candidate_communications")
            .update({ status: "failed", error: sendResult.message })
            .eq("id", row.id);
        }

        if (i < authorized.length - 1) await sleep(SEND_DELAY_MS);
      }

      return json({ ok: true, sent: sentCount, failed: failedCount, skipped, results });
    }

    // ══════════════════════════════════════════════════════════════════
    // action: queue_batch — створює draft->queued комунікації зі спільним batch_id.
    // ══════════════════════════════════════════════════════════════════
    if (action === "queue_batch") {
      const candidateIds = body.candidate_ids;
      if (!isUuidArray(candidateIds, BATCH_MAX)) {
        return json({ error: "invalid_candidate_ids" }, 422);
      }
      if (new Set(candidateIds).size !== candidateIds.length) {
        return json({ error: "invalid_candidate_ids", detail: "duplicate candidate_ids" }, 422);
      }

      let vacancyId: string | null = null;
      if (body.vacancy_id !== undefined && body.vacancy_id !== null) {
        if (!isUuid(body.vacancy_id)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
        vacancyId = body.vacancy_id;
      }

      const subject = typeof body.subject === "string" ? body.subject.trim() : "";
      if (!subject || subject.length > MAX_SUBJECT_CHARS) {
        return json({ error: "invalid_body", detail: "subject" }, 422);
      }
      const messageBody = typeof body.body === "string" ? body.body.trim() : "";
      if (!messageBody || messageBody.length > MAX_BODY_CHARS) {
        return json({ error: "invalid_body", detail: "body" }, 422);
      }

      const skipped: Array<{ candidate_id: string; reason: string }> = [];
      const authorizedCandidateIds: string[] = [];
      for (const candidateId of candidateIds) {
        const allowed = await canEditCandidate(candidateId, vacancyId);
        if (!allowed) {
          skipped.push({ candidate_id: candidateId, reason: "forbidden" });
          continue;
        }
        authorizedCandidateIds.push(candidateId);
      }

      if (authorizedCandidateIds.length === 0) {
        return json({ ok: true, batch_id: null, queued: 0, skipped });
      }

      // Генеруємо batch_id на боці Edge Function (Deno-нативний UUID) — усі
      // рядки цього виклику queue_batch поділяють один id, що дозволяє
      // групову відправку/скасування одним запитом пізніше.
      const batchId = crypto.randomUUID();

      const rows = authorizedCandidateIds.map((candidateId) => ({
        candidate_id: candidateId,
        vacancy_id: vacancyId,
        channel: "email" as const,
        direction: "out" as const,
        subject,
        body: messageBody,
        status: "queued" as const,
        batch_id: batchId,
        created_by: caller.id,
      }));

      const { data: inserted, error: insertErr } = await admin
        .from("candidate_communications")
        .insert(rows)
        .select("id");
      if (insertErr) {
        console.error("send-communication queue_batch insert error:", insertErr.message);
        return json({ error: "server_error" }, 500);
      }

      return json({ ok: true, batch_id: batchId, queued: inserted?.length ?? 0, skipped });
    }

    // ══════════════════════════════════════════════════════════════════
    // action: send_batch — відправляє всі queued комунікації batch'а.
    // ══════════════════════════════════════════════════════════════════
    if (action === "send_batch") {
      const batchId = body.batch_id;
      if (!isUuid(batchId)) return json({ error: "invalid_body", detail: "batch_id" }, 422);

      if (!RESEND_API_KEY || !FROM_EMAIL) {
        return json({ error: "email_not_configured" }, 503);
      }

      const { data: comms, error: commsErr } = await admin
        .from("candidate_communications")
        .select("id, candidate_id, vacancy_id, channel, subject, body, status, batch_id")
        .eq("batch_id", batchId)
        .eq("status", "queued");
      if (commsErr) {
        console.error("send-communication send_batch lookup error:", commsErr.message);
        return json({ error: "server_error" }, 500);
      }
      const rows = (comms ?? []) as CommRow[];
      if (rows.length === 0) {
        // Розрізняємо "batch не існує" від "усе вже відправлено/скасовано" —
        // перевіряємо, чи взагалі колись існував такий batch_id.
        const { count } = await admin
          .from("candidate_communications")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId);
        if (!count) return json({ error: "batch_not_found" }, 404);
        return json({ error: "no_queued_in_batch" }, 422);
      }

      const skipped: Array<{ communication_id: string; reason: string }> = [];
      const eligible: CommRow[] = [];
      for (const row of rows) {
        if (row.channel !== "email") {
          skipped.push({ communication_id: row.id, reason: "channel_not_supported" });
          continue;
        }
        eligible.push(row);
      }

      const authorized: CommRow[] = [];
      for (const row of eligible) {
        const allowed = await canEditCandidate(row.candidate_id, row.vacancy_id);
        if (!allowed) {
          skipped.push({ communication_id: row.id, reason: "forbidden" });
          continue;
        }
        authorized.push(row);
      }

      const results: SendResult[] = [];
      let sentCount = 0;
      let failedCount = 0;

      for (let i = 0; i < authorized.length; i++) {
        const row = authorized[i];
        const { data: candidate } = await admin
          .from("ats_candidates")
          .select("full_name, email")
          .eq("id", row.candidate_id)
          .maybeSingle();
        const to = candidate?.email;
        if (!to) {
          failedCount++;
          results.push({ communication_id: row.id, status: "failed", error: "candidate_has_no_email" });
          await admin
            .from("candidate_communications")
            .update({ status: "failed", error: "candidate_has_no_email" })
            .eq("id", row.id);
          continue;
        }

        const renderedBody = renderBody(row.body, candidate?.full_name ?? "");
        const sendResult = await sendViaResend(to, row.subject ?? "", renderedBody);

        if (sendResult.ok) {
          sentCount++;
          results.push({ communication_id: row.id, status: "sent" });
          await admin
            .from("candidate_communications")
            .update({ status: "sent", sent_at: new Date().toISOString(), external_id: sendResult.id, error: null })
            .eq("id", row.id);
        } else {
          failedCount++;
          results.push({ communication_id: row.id, status: "failed", error: sendResult.message });
          await admin
            .from("candidate_communications")
            .update({ status: "failed", error: sendResult.message })
            .eq("id", row.id);
        }

        if (i < authorized.length - 1) await sleep(SEND_DELAY_MS);
      }

      return json({ ok: true, sent: sentCount, failed: failedCount, skipped, results });
    }

    // ══════════════════════════════════════════════════════════════════
    // action: cancel_batch — усі queued цього batch → cancelled.
    // ══════════════════════════════════════════════════════════════════
    if (action === "cancel_batch") {
      const batchId = body.batch_id;
      if (!isUuid(batchId)) return json({ error: "invalid_body", detail: "batch_id" }, 422);

      const { data: comms, error: commsErr } = await admin
        .from("candidate_communications")
        .select("id, candidate_id, vacancy_id, status")
        .eq("batch_id", batchId)
        .eq("status", "queued");
      if (commsErr) {
        console.error("send-communication cancel_batch lookup error:", commsErr.message);
        return json({ error: "server_error" }, 500);
      }
      const rows = comms ?? [];
      if (rows.length === 0) {
        const { count } = await admin
          .from("candidate_communications")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId);
        if (!count) return json({ error: "batch_not_found" }, 404);
        return json({ ok: true, cancelled: 0 });
      }

      // Авторизація: скасувати можна лише ті рядки, на кандидата/вакансію
      // яких викликач має can_edit (мирор insert/update RLS-політики).
      const authorizedIds: string[] = [];
      for (const row of rows) {
        const allowed = await canEditCandidate(
          row.candidate_id as string,
          (row as { vacancy_id: string | null }).vacancy_id,
        );
        if (allowed) authorizedIds.push(row.id as string);
      }
      if (authorizedIds.length === 0) return json({ ok: true, cancelled: 0 });

      const { data: cancelled, error: cancelErr } = await admin
        .from("candidate_communications")
        .update({ status: "cancelled" })
        .in("id", authorizedIds)
        .eq("status", "queued") // guard-тригер mp_comm_immutable_after_send теж це вимагає
        .select("id");
      if (cancelErr) {
        console.error("send-communication cancel_batch update error:", cancelErr.message);
        return json({ error: "server_error" }, 500);
      }

      return json({ ok: true, cancelled: cancelled?.length ?? 0 });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("send-communication unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
