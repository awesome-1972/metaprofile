// supabase/functions/save-cv-candidate/index.ts
//
// Metaprofile ATS — Фаза 3, крок 2 — Edge Function: save-cv-candidate.
//
// Зберігає кандидата з розпізнаного CV (створити нового або оновити наявного)
// і опційно додає його у воронку вакансії. Пишеться під service_role, щоб
// уникнути крайових випадків RLS/tenant при клієнтській вставці; tenant_id
// проставляється ЯВНО з вакансії. Доступ строго перевіряється:
// mp_can_edit_vacancy(vacancy_id) під JWT викликача.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST {
//     vacancy_id: uuid,
//     mode: "create" | "update",
//     candidate_id?: uuid,            // обовʼязково для update
//     full_name: string,
//     email?: string | null,
//     phone?: string | null,
//     messengers?: object,
//     resume_parsed?: object,
//     add_to_funnel?: boolean
//   }
//   200 { ok: true, candidate_id: uuid, added_to_funnel: boolean }
//   401 unauthorized · 403 forbidden · 404 vacancy_not_found|candidate_not_found ·
//   422 invalid_body · 409 (нічого; дубль заявки — не помилка) · 500 server_error
//
// Deploy:  supabase functions deploy save-cv-candidate
// config:  verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
function asStr(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
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
    const asCaller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    // --- 2. Body --------------------------------------------------------
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);
    const mode = body.mode === "update" ? "update" : "create";
    const fullName = asStr(body.full_name);
    if (!fullName) return json({ error: "invalid_body", detail: "full_name" }, 422);
    const email = asStr(body.email);
    const phone = asStr(body.phone, 50);
    const messengers = (body.messengers && typeof body.messengers === "object" ? body.messengers : {}) as Record<string, unknown>;
    const resumeParsed = (body.resume_parsed && typeof body.resume_parsed === "object" ? body.resume_parsed : null);
    const addToFunnel = body.add_to_funnel !== false;
    const candidateIdIn = body.candidate_id;
    if (mode === "update" && !isUuid(candidateIdIn)) return json({ error: "invalid_body", detail: "candidate_id" }, 422);

    // --- 3. Scope: право редагувати вакансію (під JWT викликача) ----------
    const { data: canEdit, error: editErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (editErr) { console.error("save-cv-candidate mp_can_edit_vacancy error:", editErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    // Вакансія + tenant_id (для явного stamp).
    const { data: vacancy, error: vacErr } = await admin.from("vacancies").select("id, tenant_id").eq("id", vacancyId).maybeSingle();
    if (vacErr) { console.error("save-cv-candidate vacancy lookup error:", vacErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const tenantId = (vacancy as unknown as { tenant_id: string | null }).tenant_id;

    // --- 4. Create / Update кандидата (service_role) ---------------------
    let candidateId: string;
    if (mode === "create") {
      const insertRow: Record<string, unknown> = {
        tenant_id: tenantId,
        full_name: fullName,
        email,
        phone,
        messengers,
        created_by: caller.id,
      };
      if (resumeParsed) {
        insertRow.resume_parsed = resumeParsed;
        insertRow.resume_uploaded_at = new Date().toISOString();
      }
      const { data: created, error: insErr } = await admin
        .from("ats_candidates")
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr) { console.error("save-cv-candidate insert candidate error:", insErr.message); return json({ error: "server_error", detail: insErr.message }, 500); }
      candidateId = created.id as string;
    } else {
      candidateId = candidateIdIn as string;
      // Перевірка тенанта наявного кандидата (не редагувати чужий тенант).
      const { data: existing, error: exErr } = await admin.from("ats_candidates").select("id, tenant_id").eq("id", candidateId).maybeSingle();
      if (exErr) { console.error("save-cv-candidate candidate lookup error:", exErr.message); return json({ error: "server_error" }, 500); }
      if (!existing) return json({ error: "candidate_not_found" }, 404);
      if (tenantId && (existing as unknown as { tenant_id: string | null }).tenant_id && (existing as unknown as { tenant_id: string }).tenant_id !== tenantId) {
        return json({ error: "forbidden" }, 403);
      }
      const patch: Record<string, unknown> = { full_name: fullName, email, phone };
      if (Object.keys(messengers).length > 0) patch.messengers = messengers;
      if (resumeParsed) {
        patch.resume_parsed = resumeParsed;
        patch.resume_uploaded_at = new Date().toISOString();
      }
      const { error: updErr } = await admin.from("ats_candidates").update(patch).eq("id", candidateId);
      if (updErr) { console.error("save-cv-candidate update candidate error:", updErr.message); return json({ error: "server_error", detail: updErr.message }, 500); }
    }

    // --- 5. Додати у воронку (опційно) -----------------------------------
    let addedToFunnel = false;
    if (addToFunnel) {
      // Чи вже є заявка цього кандидата на цю вакансію?
      const { data: existingApp } = await admin
        .from("applications")
        .select("id")
        .eq("vacancy_id", vacancyId)
        .eq("candidate_id", candidateId)
        .maybeSingle();
      if (!existingApp) {
        const { error: appErr } = await admin
          .from("applications")
          .insert({ vacancy_id: vacancyId, candidate_id: candidateId, tenant_id: tenantId });
        if (appErr) {
          // Не критично: кандидат збережений; лишаємо у базі, воронку можна додати вручну.
          console.error("save-cv-candidate application insert error:", appErr.message);
        } else {
          addedToFunnel = true;
        }
      }
    }

    return json({ ok: true, candidate_id: candidateId, added_to_funnel: addedToFunnel });
  } catch (error) {
    console.error("save-cv-candidate unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
