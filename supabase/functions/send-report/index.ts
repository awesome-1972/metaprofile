// supabase/functions/send-report/index.ts
//
// Metaprofile ATS — надсилання звіту по кандидату клієнту на email (через Resend).
//
// Вмикає захищене посилання на звіт (якщо ще не ввімкнене) і шле клієнту лист із
// лінком на /report/:token. Текст звіту в лист не вкладаємо — клієнт відкриває
// актуальну (можливо, доредаговану) версію за посиланням і зберігає PDF.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); право — mp_can_edit_vacancy(звітної вакансії).
//   Email — Resend (RESEND_API_KEY + FROM_EMAIL). Без ключів → 503.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { report_id: uuid, to_email: string, message?: string }
//   200 { sent: true, link }
//   401/403/404/422/503/502/500
//
// Deploy:  supabase functions deploy send-report   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "";
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "https://metaprofile.pages.dev";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
function esc(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

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
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const reportId = body.report_id;
    const toEmail = typeof body.to_email === "string" ? body.to_email.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!isUuid(reportId)) return json({ error: "invalid_body", detail: "report_id" }, 422);
    if (!EMAIL_RE.test(toEmail)) return json({ error: "invalid_body", detail: "to_email" }, 422);
    if (!RESEND_API_KEY || !FROM_EMAIL) return json({ error: "email_not_configured" }, 503);

    // Звіт + вакансія.
    const { data: report, error: rErr } = await admin
      .from("candidate_reports")
      .select("id, vacancy_id, status, public_token, is_shared, vacancy:vacancies(title)")
      .eq("id", reportId)
      .maybeSingle();
    if (rErr) { console.error("send-report lookup error:", rErr.message); return json({ error: "server_error" }, 500); }
    if (!report) return json({ error: "report_not_found" }, 404);
    const rep = report as unknown as { vacancy_id: string; status: string; public_token: string | null; is_shared: boolean; vacancy: { title: string } | null };
    if (rep.status !== "ready") return json({ error: "report_not_ready" }, 422);

    // Право — редагувати вакансію звіту.
    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: rep.vacancy_id });
    if (scopeErr) { console.error("send-report scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // Гарантуємо увімкнене посилання + токен.
    let token = rep.public_token;
    if (!rep.is_shared || !token) {
      token = token || crypto.randomUUID();
      const { error: upErr } = await admin
        .from("candidate_reports")
        .update({ is_shared: true, public_token: token, shared_at: new Date().toISOString() } as never)
        .eq("id", reportId);
      if (upErr) { console.error("send-report share error:", upErr.message); return json({ error: "server_error" }, 500); }
    }
    const link = `${APP_BASE_URL}/report/${token}`;
    const positionTitle = rep.vacancy?.title ?? "вакансія";

    const html =
      `<p>Доброго дня!</p>` +
      (message ? `<p>${esc(message)}</p>` : "") +
      `<p>Надсилаємо висновок щодо кандидата на позицію «${esc(positionTitle)}».</p>` +
      `<p><a href="${link}">Відкрити звіт</a> (можна зберегти у PDF).</p>` +
      `<p>З повагою,<br/>MetaVision</p>`;

    let res: Response;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_EMAIL, to: toEmail, subject: `Висновок щодо кандидата — ${positionTitle}`, html }),
      });
    } catch (e) { return json({ error: "email_provider_error", detail: (e as Error).message }, 502); }
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return json({ error: "email_provider_error", detail }, 502);
    }

    return json({ sent: true, link });
  } catch (error) {
    console.error("send-report unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
