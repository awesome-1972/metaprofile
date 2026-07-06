// supabase/functions/grant-management/index.ts
//
// Metaprofile ATS — Edge Function: grant-management (спец. розділ 7.2.1).
//
// Видача/оновлення/відкликання гранулярних грантів access_grants. Це ЄДИНИЙ
// легітимний write-шлях для UI (RLS access_grants_insert/update лишається як
// запасний прямий шлях для owner/admin, але фронтенд має ходити сюди, бо тут
// валідується існування scope_id — декларативний FK на дві різні таблиці
// неможливий).
//
// ── AUTH-КОНТРАКТ (розділ 7.2.0, SEC-06/SEC-09) ──────────────────────────────
//   • service_role client — RLS bypass ЛИШЕ всередині цієї функції.
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Роль перевіряється через has_role(caller.id, 'owner'|'admin') — не
//     з тіла запиту. Інша роль (напр. recruiter) → 403 forbidden.
//   • granted_by ЗАВЖДИ = caller.id (з JWT), ніколи з body (SEC-09).
//   • scope_id валідується проти реального існування рядка в clients або
//     hiring_projects (за scope_type) — відсутність → 404 scope_not_found.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { action: "grant", user_id, scope_type, scope_id, can_edit?,
//          can_view_financials?, permissions? }
//     200 { ok: true, grant_id, is_active: true }
//   POST { action: "revoke", grant_id }
//     200 { ok: true, grant_id, is_active: false }
//   POST { action: "list" }
//     200 { ok: true, grants: [...] }               (усі гранти; owner/admin only)
//   POST { action: "update", grant_id, can_edit?, can_view_financials?, permissions? }
//     200 { ok: true, grant_id, is_active }
//   POST { action: "assign_recruiter", vacancy_id, user_id: uuid|null }
//     200 { ok: true, vacancy_id, assigned_recruiter_id, grant_id: uuid|null }
//     — Призначає/знімає відповідального рекрутера на вакансію
//       (vacancies.assigned_recruiter_id, ПІД service_role, лише
//       owner/admin — ліберальніше не потрібно: власник вакансії — не
//       окрема концепція, авторизація тотожна action="grant").
//     — Якщо user_id != null: атомарно (в межах цього виклику) також
//       upsert vacancy-грант (scope_type='vacancy', scope_id=vacancy_id,
//       can_edit=true) цьому користувачу, якщо активного гранта ще немає —
//       інакше поле стало б лише візуальним ярликом без реального доступу
//       (див. коментар у 20260706090000_ats_m4b_grants_comms_resume.sql).
//     — Якщо user_id == null: лише знімає assigned_recruiter_id; існуючий
//       vacancy-грант (якщо був) НЕ відкликається автоматично (явне
//       revoke — окрема дія адміністратора, щоб не ламати доступ, виданий
//       з іншої причини на ту саму вакансію).
//
//   401 { error: "unauthorized" }        — немає/невалідний JWT
//   403 { error: "forbidden" }           — викликач не owner/admin
//   404 { error: "scope_not_found" }     — scope_id не існує у відповідній таблиці
//   404 { error: "grant_not_found" }     — grant_id не існує (revoke/update)
//   404 { error: "vacancy_not_found" }   — vacancy_id не існує (assign_recruiter)
//   422 { error: "invalid_scope_type" }  — scope_type поза {client,hiring_project,vacancy}
//   422 { error: "invalid_action" | "invalid_body" | "invalid_user_id" | ... }
//   429 { error: "rate_limited" }        — забагато запитів (проста in-memory throttle)
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy grant-management
// Secrets: жодних додаткових (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY —
//          auto-provisioned); ALLOWED_ORIGIN (опційно, інакше "*" для dev).
// config:  verify_jwt = true (звичайний користувацький JWT; роль перевіряється
//          вручну всередині — verify_jwt лише перевіряє підпис).

import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS -------------------------------------------------------------
// SEC-06: у продакшн-домені має бути конкретний ALLOWED_ORIGIN, не "*".
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// 'vacancy' — третій scope_type (М4b, гібрид V3, вимога 3): гранулярний грант
// на одну вакансію, окремо від client/hiring_project. Валідується проти
// vacancies (не clients/hiring_projects) у гілці action==="grant" нижче.
const SCOPE_TYPES = new Set(["client", "hiring_project", "vacancy"]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

// Very small in-memory token-bucket rate limiter per caller id, scoped to
// this isolate's lifetime. Mitigates scope_id brute-forcing (SEC-06 pt.5).
// Not a substitute for infra-level rate limiting, but a defence-in-depth net.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;
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

// permissions jsonb — resereved for future rare rights; keep it a plain object,
// bounded in size to avoid abuse.
function sanitizePermissions(v: unknown): Record<string, unknown> | null {
  if (v === undefined || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const s = JSON.stringify(v);
  if (s.length > 2000) return null;
  return v as Record<string, unknown>;
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

    if (isRateLimited(caller.id)) return json({ error: "rate_limited" }, 429);

    // --- 2. Роль ТІЛЬКИ через has_role(), не з body ----------------------
    const { data: isOwner, error: ownerErr } = await supabase.rpc("has_role", {
      _user_id: caller.id,
      _role: "owner",
    });
    if (ownerErr) {
      console.error("grant-management has_role(owner) error:", ownerErr.message);
      return json({ error: "server_error" }, 500);
    }
    let authorized = Boolean(isOwner);
    if (!authorized) {
      const { data: isAdmin, error: adminErr } = await supabase.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      if (adminErr) {
        console.error("grant-management has_role(admin) error:", adminErr.message);
        return json({ error: "server_error" }, 500);
      }
      authorized = Boolean(isAdmin);
    }
    if (!authorized) return json({ error: "forbidden" }, 403);

    // --- 3. Parse body ---------------------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "list") {
      const { data, error } = await supabase
        .from("access_grants")
        .select("id, user_id, scope_type, scope_id, can_edit, can_view_financials, permissions, is_active, granted_by, created_at, updated_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error("grant-management list error:", error.message);
        return json({ error: "server_error" }, 500);
      }
      const grants = data ?? [];

      // Збагачення для UI: email/імʼя користувача + назва обʼєкта scope
      // (клієнт/проект/вакансія). Batch-запити під service_role.
      const userIds = [...new Set(grants.map((g) => g.user_id as string))];
      const idsByType: Record<string, string[]> = { client: [], hiring_project: [], vacancy: [] };
      for (const g of grants) {
        const t = g.scope_type as string;
        if (idsByType[t]) idsByType[t].push(g.scope_id as string);
      }

      const [profilesRes, clientsRes, projectsRes, vacanciesRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("user_id, email, full_name").in("user_id", userIds)
          : Promise.resolve({ data: [] as unknown[], error: null }),
        idsByType.client.length
          ? supabase.from("clients").select("id, name").in("id", idsByType.client)
          : Promise.resolve({ data: [] as unknown[], error: null }),
        idsByType.hiring_project.length
          ? supabase.from("hiring_projects").select("id, name").in("id", idsByType.hiring_project)
          : Promise.resolve({ data: [] as unknown[], error: null }),
        idsByType.vacancy.length
          ? supabase.from("vacancies").select("id, title").in("id", idsByType.vacancy)
          : Promise.resolve({ data: [] as unknown[], error: null }),
      ]);

      const emailByUser = new Map(
        ((profilesRes.data ?? []) as Array<{ user_id: string; email: string | null; full_name: string | null }>).map(
          (p) => [p.user_id, p.full_name || p.email],
        ),
      );
      const nameByScope = new Map<string, string>();
      for (const c of (clientsRes.data ?? []) as Array<{ id: string; name: string }>) nameByScope.set(c.id, c.name);
      for (const p of (projectsRes.data ?? []) as Array<{ id: string; name: string }>) nameByScope.set(p.id, p.name);
      for (const v of (vacanciesRes.data ?? []) as Array<{ id: string; title: string }>) nameByScope.set(v.id, v.title);

      const enriched = grants.map((g) => ({
        ...g,
        user_email: emailByUser.get(g.user_id as string) ?? null,
        scope_name: nameByScope.get(g.scope_id as string) ?? null,
      }));
      return json({ ok: true, grants: enriched });
    }

    if (action === "grant") {
      const userId = body.user_id;
      const scopeType = body.scope_type;
      const scopeId = body.scope_id;
      const canEdit = body.can_edit === true;
      const canViewFinancials = body.can_view_financials === true;
      const permissions = sanitizePermissions(body.permissions);

      if (!isUuid(userId)) return json({ error: "invalid_user_id" }, 422);
      if (typeof scopeType !== "string" || !SCOPE_TYPES.has(scopeType)) {
        return json({ error: "invalid_scope_type" }, 422);
      }
      if (!isUuid(scopeId)) return json({ error: "invalid_scope_id" }, 422);
      if (permissions === null) return json({ error: "invalid_permissions" }, 422);

      // Валідація існування scope_id у відповідній таблиці (декларативний FK
      // на три таблиці неможливий — це відповідальність цієї функції).
      const table = scopeType === "client" ? "clients" : scopeType === "hiring_project" ? "hiring_projects" : "vacancies";
      const { data: scopeRow, error: scopeErr } = await supabase
        .from(table)
        .select("id")
        .eq("id", scopeId)
        .maybeSingle();
      if (scopeErr) {
        console.error("grant-management scope lookup error:", scopeErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!scopeRow) return json({ error: "scope_not_found" }, 404);

      // Upsert за унікальним (user_id, scope_type, scope_id) — повторна видача
      // = оновлення існуючого гранта (реактивація/зміна прав), не дублікат.
      const { data: upserted, error: upsertErr } = await supabase
        .from("access_grants")
        .upsert(
          {
            user_id: userId,
            scope_type: scopeType,
            scope_id: scopeId,
            can_edit: canEdit,
            can_view_financials: canViewFinancials,
            permissions: permissions ?? {},
            is_active: true,
            granted_by: caller.id, // SEC-09: завжди з JWT, ніколи з body
          },
          { onConflict: "user_id,scope_type,scope_id" },
        )
        .select("id, is_active")
        .single();
      if (upsertErr || !upserted) {
        console.error("grant-management upsert error:", upsertErr?.message);
        return json({ error: "server_error" }, 500);
      }
      return json({ ok: true, grant_id: upserted.id, is_active: upserted.is_active });
    }

    if (action === "update") {
      const grantId = body.grant_id;
      if (!isUuid(grantId)) return json({ error: "invalid_grant_id" }, 422);

      const patch: Record<string, unknown> = {};
      if (body.can_edit !== undefined) {
        if (typeof body.can_edit !== "boolean") return json({ error: "invalid_can_edit" }, 422);
        patch.can_edit = body.can_edit;
      }
      if (body.can_view_financials !== undefined) {
        if (typeof body.can_view_financials !== "boolean") {
          return json({ error: "invalid_can_view_financials" }, 422);
        }
        patch.can_view_financials = body.can_view_financials;
      }
      if (body.permissions !== undefined) {
        const permissions = sanitizePermissions(body.permissions);
        if (permissions === null) return json({ error: "invalid_permissions" }, 422);
        patch.permissions = permissions;
      }
      if (Object.keys(patch).length === 0) return json({ error: "invalid_body" }, 400);

      const { data: updated, error: updateErr } = await supabase
        .from("access_grants")
        .update(patch)
        .eq("id", grantId)
        .select("id, is_active")
        .maybeSingle();
      if (updateErr) {
        console.error("grant-management update error:", updateErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!updated) return json({ error: "grant_not_found" }, 404);
      return json({ ok: true, grant_id: updated.id, is_active: updated.is_active });
    }

    if (action === "revoke") {
      const grantId = body.grant_id;
      if (!isUuid(grantId)) return json({ error: "invalid_grant_id" }, 422);

      // Мʼяке відкликання (is_active=false) — зберігає аудит-слід.
      const { data: revoked, error: revokeErr } = await supabase
        .from("access_grants")
        .update({ is_active: false })
        .eq("id", grantId)
        .select("id, is_active")
        .maybeSingle();
      if (revokeErr) {
        console.error("grant-management revoke error:", revokeErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!revoked) return json({ error: "grant_not_found" }, 404);
      return json({ ok: true, grant_id: revoked.id, is_active: revoked.is_active });
    }

    if (action === "assign_recruiter") {
      const vacancyId = body.vacancy_id;
      if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

      // user_id: uuid АБО null (зняти призначення). undefined — invalid_body.
      let userId: string | null;
      if (body.user_id === null) {
        userId = null;
      } else if (isUuid(body.user_id)) {
        userId = body.user_id;
      } else {
        return json({ error: "invalid_user_id" }, 422);
      }

      // Перевірка існування вакансії (owner/admin вже підтверджено вище —
      // авторизація для цієї дії тотожна дії "grant").
      const { data: vacancy, error: vacErr } = await supabase
        .from("vacancies")
        .select("id, assigned_recruiter_id")
        .eq("id", vacancyId)
        .maybeSingle();
      if (vacErr) {
        console.error("grant-management assign_recruiter vacancy lookup error:", vacErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!vacancy) return json({ error: "vacancy_not_found" }, 404);

      // 1) Запис vacancies.assigned_recruiter_id (UI-денормалізація) — ПІД
      //    service_role, лише після підтвердженої owner/admin-авторизації.
      const { error: assignErr } = await supabase
        .from("vacancies")
        .update({ assigned_recruiter_id: userId })
        .eq("id", vacancyId);
      if (assignErr) {
        console.error("grant-management assign_recruiter update error:", assignErr.message);
        return json({ error: "server_error" }, 500);
      }

      // 2) Якщо призначаємо (user_id != null) — атомарно (в межах цього
      //    виклику) гарантуємо реальний доступ: upsert vacancy-гранта
      //    can_edit=true, якщо ще не існує активного гранта цьому
      //    користувачу на цю вакансію. Повторний виклик = ідемпотентний
      //    (upsert за унікальним (user_id, scope_type, scope_id)).
      let grantId: string | null = null;
      if (userId) {
        const { data: existingGrant, error: existErr } = await supabase
          .from("access_grants")
          .select("id, is_active, can_edit")
          .eq("user_id", userId)
          .eq("scope_type", "vacancy")
          .eq("scope_id", vacancyId)
          .maybeSingle();
        if (existErr) {
          console.error("grant-management assign_recruiter grant lookup error:", existErr.message);
          return json({ error: "server_error" }, 500);
        }

        if (!existingGrant || !existingGrant.is_active) {
          const { data: upserted, error: upsertErr } = await supabase
            .from("access_grants")
            .upsert(
              {
                user_id: userId,
                scope_type: "vacancy",
                scope_id: vacancyId,
                can_edit: true,
                can_view_financials: false,
                permissions: {},
                is_active: true,
                granted_by: caller.id, // SEC-09: завжди з JWT, ніколи з body
              },
              { onConflict: "user_id,scope_type,scope_id" },
            )
            .select("id")
            .single();
          if (upsertErr || !upserted) {
            console.error("grant-management assign_recruiter grant upsert error:", upsertErr?.message);
            return json({ error: "server_error" }, 500);
          }
          grantId = upserted.id;
        } else {
          grantId = existingGrant.id;
        }
      }

      return json({ ok: true, vacancy_id: vacancyId, assigned_recruiter_id: userId, grant_id: grantId });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("grant-management unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
