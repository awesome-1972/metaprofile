// supabase/functions/djinni-webhook/index.ts
//
// Metaprofile ATS — ПУБЛІЧНИЙ приймач вебхуків Djinni (Action: "Candidate Apply").
// Djinni у реальному часі шле POST на цей URL при кожному новому відгуку.
// Ми знаходимо нашу вакансію (за djinni_job_id або external_job_id) і додаємо
// кандидата + заявку у воронку (дедуп djinni_synced_responses).
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=false (Djinni не має нашого JWT). Захист — СПІЛЬНИЙ СЕКРЕТ:
//   у Djinni Webhooks → Authentication Method = Header, Header Name =
//   "X-Webhook-Token", Value = DJINNI_WEBHOOK_SECRET. Також приймаємо Basic
//   (Authorization: Basic base64("djinni:<secret>")).
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST <candidate apply payload> → 200 { ok, imported }
//   401 (bad secret) / 200 (ack, навіть якщо skip) / 500
//
// Deploy: supabase functions deploy djinni-webhook · config: verify_jwt = false.

import { createClient } from "jsr:@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEBHOOK_SECRET = (Deno.env.get("DJINNI_WEBHOOK_SECRET") ?? "").trim();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }
function asStr(v: unknown, max = 4000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

/** Перевірка спільного секрету: кастомний заголовок або Basic/Bearer. */
function authOk(req: Request): boolean {
  if (!WEBHOOK_SECRET) return false; // без секрету не приймаємо (безпека)
  const custom = req.headers.get("X-Webhook-Token") || req.headers.get("x-webhook-token");
  if (custom && custom.trim() === WEBHOOK_SECRET) return true;
  const auth = req.headers.get("Authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    if (auth.slice(7).trim() === WEBHOOK_SECRET) return true;
  }
  if (auth.toLowerCase().startsWith("basic ")) {
    try {
      const decoded = atob(auth.slice(6).trim());
      // формат "user:secret" — секрет після першої двокрапки
      const secret = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
      if (secret === WEBHOOK_SECRET) return true;
    } catch { /* ignore */ }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrap(body: any): any {
  if (!body || typeof body !== "object") return {};
  return body.candidate ?? body.data ?? body.application ?? body.payload ?? body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!authOk(req)) return json({ error: "unauthorized" }, 401);

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let raw: any;
    try { raw = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const c = unwrap(raw);

    const djinniJobId = c.job_id != null ? String(c.job_id) : "";
    const externalJobId = c.external_job_id != null ? String(c.external_job_id) : "";
    const responseId = String(c.application_id ?? c.id ?? "");
    if (!responseId) return json({ ok: true, imported: 0, skipped: "no_application_id" });

    // Знаходимо нашу вакансію: спершу external_job_id (наш UUID), далі djinni_job_id.
    let vac: { id: string; tenant_id: string | null } | null = null;
    if (isUuid(externalJobId)) {
      const { data } = await admin.from("vacancies").select("id, tenant_id").eq("id", externalJobId).maybeSingle();
      vac = (data as { id: string; tenant_id: string | null } | null) ?? null;
    }
    if (!vac && djinniJobId) {
      const { data } = await admin.from("vacancies").select("id, tenant_id").eq("djinni_job_id", djinniJobId).maybeSingle();
      vac = (data as { id: string; tenant_id: string | null } | null) ?? null;
    }
    if (!vac) return json({ ok: true, imported: 0, skipped: "vacancy_not_matched" });

    // Дедуп.
    const { data: existing } = await admin.from("djinni_synced_responses")
      .select("id").eq("vacancy_id", vac.id).eq("response_id", responseId).maybeSingle();
    if (existing) return json({ ok: true, imported: 0, skipped: "duplicate" });

    const { data: src } = await admin.from("candidate_sources").select("id").eq("name", "Djinni").limit(1).maybeSingle();
    const sourceId = (src as { id: string } | null)?.id ?? null;
    const { data: firstStage } = await admin.from("pipeline_stages").select("id").eq("vacancy_id", vac.id).order("position", { ascending: true }).limit(1).maybeSingle();
    const firstStageId = (firstStage as { id: string } | null)?.id ?? null;

    const fullName = asStr(c.name) || asStr(c.position) || "Кандидат Djinni";
    const links = [
      c.public_profile_url ? `Djinni: ${c.public_profile_url}` : "",
      c.cv_url ? `CV: ${c.cv_url}` : "",
      c.linkedin ? `LinkedIn: ${c.linkedin}` : "",
      c.github ? `GitHub: ${c.github}` : "",
      c.telegram ? `Telegram: ${c.telegram}` : "",
    ].filter(Boolean).join("\n");
    const notes = [
      asStr(c.cover_letter),
      Array.isArray(c.skills) && c.skills.length ? `Навички: ${c.skills.map(String).join(", ")}` : "",
      c.experience_years ? `Досвід (років): ${c.experience_years}` : "",
      c.english_level ? `English: ${c.english_level}` : "",
      c.salary_min ? `Очікування ЗП: від ${c.salary_min}` : "",
      links,
    ].filter(Boolean).join("\n---\n").slice(0, 4000) || null;

    const { data: cand, error: cErr } = await admin.from("ats_candidates").insert({
      full_name: fullName,
      email: asStr(c.email),
      phone: asStr(c.phone),
      notes,
      resume_text: asStr(c.cover_letter, 8000),
      source_id: sourceId,
      tenant_id: vac.tenant_id,
    }).select("id").single();
    if (cErr) { console.error("djinni-webhook candidate insert:", cErr.message); return json({ ok: false, error: "insert_failed" }, 200); }
    const candidateId = (cand as { id: string }).id;

    await admin.from("applications").insert({
      vacancy_id: vac.id, candidate_id: candidateId, list_state: "long_list",
      ...(firstStageId ? { current_stage_id: firstStageId } : {}), tenant_id: vac.tenant_id,
    });
    await admin.from("djinni_synced_responses").insert({
      vacancy_id: vac.id, response_id: responseId, candidate_id: candidateId, tenant_id: vac.tenant_id,
    });

    return json({ ok: true, imported: 1 });
  } catch (error) {
    console.error("djinni-webhook unhandled error:", (error as Error).message);
    return json({ ok: false, error: "server_error" }, 200); // 200, щоб Djinni не ретраїв нескінченно
  }
});
