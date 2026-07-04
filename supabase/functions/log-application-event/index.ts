// supabase/functions/log-application-event/index.ts
//
// Metaprofile ATS — Edge Function: log-application-event (спец. розділ 7.2.3).
//
// Записує РУЧНІ події журналу application_events (нотатка/дзвінок/офер тощо).
// Автоматичні `created`/`stage_changed` пише тригер mp_log_stage_change — ця
// функція НЕ їх дублює.
//
// ── AUTH-КОНТРАКТ (розділ 7.2.0, SEC-06) ────────────────────────────────────
//   • service_role client — RLS bypass ЛИШЕ всередині функції (append-only
//     журнал: клієнтський INSERT заборонено RLS — 5.11).
//   • Викликач верифікується через getUser(jwt) — НЕ з body. 401 якщо немає.
//   • Доступ до application_id перевіряється через RPC mp_can_access_application
//     ПІД JWT ВИКЛИКАЧА (не service_role) — той самий резолв, що і RLS.
//     Немає доступу → 403 forbidden.
//   • actor_id ЗАВЖДИ = caller.id з JWT, ніколи з body.
//
// ── SEC-05 (HARD RULE) — фін-валідація входу ────────────────────────────────
//   • metadata: лише ключі з allow-list {channel, source, interview_id, outcome, tags}.
//     Будь-який інший ключ → 422 invalid_metadata_key.
//   • note/metadata (серіалізовані в JSON) проганяються через regex на
//     суми/валюти/fee/salary/compensation/оклад/гонорар/ставка → якщо збіг,
//     422 financial_data_forbidden. Узгоджена сума офера живе ВИКЛЮЧНО у
//     vacancy_financials.agreed_salary — ніколи в цьому журналі.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { application_id: uuid, event_type: application_event_type,
//          note?: string, metadata?: object }
//   200 { ok: true, event_id, created_at }
//   401 { error: "unauthorized" }
//   403 { error: "forbidden" }
//   422 { error: "invalid_application_id" | "invalid_event_type"
//              | "invalid_metadata_key" | "financial_data_forbidden"
//              | "note_too_long" }
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy log-application-event
// Secrets: жодних додаткових (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned); ALLOWED_ORIGIN опційно.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NOTE_CHARS = 4000;

// Only MANUAL event types are legitimate to log here; the automatic ones
// (`created`, `stage_changed`) are exclusively written by the DB trigger —
// allowing them here would let a client forge a fake stage-transition record.
const ALLOWED_EVENT_TYPES = new Set([
  "note_added",
  "interview_scheduled",
  "interview_completed",
  "offer_made",
  "offer_accepted",
  "offer_declined",
  "rejected",
  "withdrawn",
  "reactivated",
  "assessment_linked",
]);

// SEC-05: metadata allow-list — configurable, deliberately WITHOUT any
// financial keys (no amount/fee/salary/compensation/currency/rate/etc.).
const METADATA_ALLOWED_KEYS = new Set(["channel", "source", "interview_id", "outcome", "tags"]);

// SEC-05: financial pattern filter. Catches currency symbols, ISO codes next
// to numbers, and common financial terms (EN + UK) so amounts/fees/comp never
// leak into the journal, which is readable without can_view_financials.
const FINANCIAL_PATTERNS: RegExp[] = [
  /[$€£₴]\s?\d/, // currency symbol adjacent to a digit
  /\b\d[\d.,]*\s?(usd|eur|gbp|uah|грн|usd\/mo|k\/yr)\b/i,
  /\b(usd|eur|gbp|uah)\s?\d/i,
  /\bfee\b/i,
  /\bsalary\b/i,
  /\bcompensation\b/i,
  /\bbonus\b/i,
  /\bpayroll\b/i,
  /\brate\s?card\b/i,
  /\bоклад\b/i,
  /\bгонорар\b/i,
  /\bзарплат\w*\b/i,
  /\bкомісі[юя]\b/i,
  /\bставк[аи]\b/i,
  /\bбюджет\w*\b/i,
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

function containsFinancialPattern(text: string): boolean {
  return FINANCIAL_PATTERNS.some((re) => re.test(text));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // service_role — only for the final append-only insert (bypasses the
    // client-write DENY on application_events). All authorization checks
    // above use the CALLER's own JWT-scoped RPC, never service_role blindly.
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Verify JWT ----------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseService.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    // --- 2. Parse + basic validation ---------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }

    const applicationId = body.application_id;
    if (!isUuid(applicationId)) return json({ error: "invalid_application_id" }, 422);

    const eventType = body.event_type;
    if (typeof eventType !== "string" || !ALLOWED_EVENT_TYPES.has(eventType)) {
      return json({ error: "invalid_event_type" }, 422);
    }

    let note: string | null = null;
    if (body.note !== undefined && body.note !== null) {
      if (typeof body.note !== "string") return json({ error: "invalid_note" }, 422);
      if (body.note.length > MAX_NOTE_CHARS) return json({ error: "note_too_long" }, 422);
      note = body.note.trim();
    }

    let metadata: Record<string, unknown> = {};
    if (body.metadata !== undefined && body.metadata !== null) {
      if (typeof body.metadata !== "object" || Array.isArray(body.metadata)) {
        return json({ error: "invalid_metadata" }, 422);
      }
      const raw = body.metadata as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        if (!METADATA_ALLOWED_KEYS.has(key)) {
          return json({ error: "invalid_metadata_key", key }, 422);
        }
      }
      metadata = raw;
    }

    // SEC-05: financial pattern scan over note + serialized metadata.
    const scanTarget = `${note ?? ""}\n${JSON.stringify(metadata)}`;
    if (containsFinancialPattern(scanTarget)) {
      return json({ error: "financial_data_forbidden" }, 422);
    }

    // --- 3. Authorize: caller must have scope access to this application ---
    // RPC executed as the CALLER (own JWT client), mirroring the RLS resolver
    // exactly — not a service_role shortcut that could mask a scope bug.
    const supabaseAsCaller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: `Bearer ${jwt}` } } },
    );
    const { data: canAccess, error: rpcErr } = await supabaseAsCaller.rpc(
      "mp_can_access_application",
      { p_application_id: applicationId },
    );
    if (rpcErr) {
      console.error("log-application-event mp_can_access_application error:", rpcErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!canAccess) return json({ error: "forbidden" }, 403);

    // --- 4. Append-only insert under service_role --------------------------
    // actor_id ALWAYS from JWT (caller.id), never from body.
    const { data: inserted, error: insertErr } = await supabaseService
      .from("application_events")
      .insert({
        application_id: applicationId,
        event_type: eventType,
        actor_id: caller.id,
        note,
        metadata,
      })
      .select("id, created_at")
      .single();
    if (insertErr || !inserted) {
      console.error("log-application-event insert error:", insertErr?.message);
      return json({ error: "server_error" }, 500);
    }

    return json({ ok: true, event_id: inserted.id, created_at: inserted.created_at });
  } catch (error) {
    console.error("log-application-event unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
