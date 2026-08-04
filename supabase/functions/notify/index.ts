// supabase/functions/notify/index.ts
//
// Metaprofile ATS — сповіщення про затвердження requisition (approval flow Фаза 2).
//
// Викликається клієнтом ПІСЛЯ успішної зміни approval_status вакансії. За статусом
// визначає подію й отримувачів, пише in-app сповіщення (таблиця notifications,
// service_role) і — якщо налаштовано Resend — дублює на email.
//   • pending_approval          → approval_submitted → усі owner/admin тенанта (крім автора дії)
//   • approved/changes_requested/rejected → approval_decision → автор вакансії (created_by)
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); право дії перевіряє сам перехід (RLS/guard),
//   тут лише розсилка. Email — best-effort: без RESEND_API_KEY/FROM_EMAIL просто
//   пропускається (in-app сповіщення все одно створюються).
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, status: requisition_approval_status, note?: string }
//   200 { notified: n, emailed: n }   ·   401/403/404/422/500
//
// Deploy:  supabase functions deploy notify   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://metaprofile.pages.dev";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

const DECISION_STATUSES = new Set(["approved", "changes_requested", "rejected"]);
const DECISION_TITLE: Record<string, string> = {
  approved: "Requisition затверджено",
  changes_requested: "Requisition повернуто на доопрацювання",
  rejected: "Requisition відхилено",
};

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !FROM_EMAIL) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, srk);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    const status = String(body.status ?? "");
    const note = typeof body.note === "string" ? body.note : "";
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    // Вакансія + tenant + автор.
    const { data: vacancy, error: vErr } = await admin
      .from("vacancies")
      .select("id, title, tenant_id, created_by")
      .eq("id", vacancyId)
      .maybeSingle();
    if (vErr) { console.error("notify vacancy error:", vErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const vac = vacancy as unknown as { title: string; tenant_id: string | null; created_by: string | null };

    // Визначаємо отримувачів.
    let recipientIds: string[] = [];
    let title = "";
    let bodyText = "";
    const link = `/ats/vacancies/${vacancyId}`;

    if (status === "pending_approval") {
      title = `Нова заявка на затвердження: ${vac.title}`;
      bodyText = "Requisition подано на затвердження й очікує вашого рішення.";
      // Усі owner/admin тенанта, крім автора дії.
      let rq = admin.from("user_roles").select("user_id, role").in("role", ["owner", "admin"]);
      if (vac.tenant_id) rq = rq.eq("tenant_id", vac.tenant_id);
      const { data: roles } = await rq;
      recipientIds = [...new Set((roles ?? []).map((r) => (r as { user_id: string }).user_id))].filter((uid) => uid !== caller.id);
    } else if (DECISION_STATUSES.has(status)) {
      title = `${DECISION_TITLE[status]}: ${vac.title}`;
      bodyText = note ? `Коментар: ${note}` : "Статус вашої заявки змінено.";
      if (vac.created_by && vac.created_by !== caller.id) recipientIds = [vac.created_by];
    } else {
      return json({ notified: 0, emailed: 0 }); // draft чи інше — не сповіщаємо
    }

    if (recipientIds.length === 0) return json({ notified: 0, emailed: 0 });

    // In-app сповіщення.
    const rows = recipientIds.map((uid) => ({
      tenant_id: vac.tenant_id, user_id: uid, kind: status === "pending_approval" ? "approval_submitted" : "approval_decision",
      title, body: bodyText, link, entity_type: "vacancy", entity_id: vacancyId, created_by: caller.id,
    }));
    const { error: insErr } = await admin.from("notifications").insert(rows);
    if (insErr) console.error("notify insert error:", insErr.message);

    // Email (best-effort).
    let emailed = 0;
    if (RESEND_API_KEY && FROM_EMAIL) {
      const { data: profs } = await admin.from("profiles").select("id, email, full_name").in("id", recipientIds);
      const fullLink = `${APP_BASE_URL}${link}`;
      const html = `<p>${title}</p><p>${bodyText}</p><p><a href="${fullLink}">Відкрити вакансію</a></p>`;
      for (const p of (profs ?? []) as Array<{ email: string | null }>) {
        if (p.email && (await sendEmail(p.email, title, html))) emailed++;
      }
    }

    return json({ notified: recipientIds.length, emailed });
  } catch (error) {
    console.error("notify unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
