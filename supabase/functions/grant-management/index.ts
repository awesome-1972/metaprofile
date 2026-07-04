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
//
//   401 { error: "unauthorized" }        — немає/невалідний JWT
//   403 { error: "forbidden" }           — викликач не owner/admin
//   404 { error: "scope_not_found" }     — scope_id не існує у відповідній таблиці
//   404 { error: "grant_not_found" }     — grant_id не існує (revoke/update)
//   422 { error: "invalid_scope_type" }  — scope_type поза {client,hiring_project}
//   422 { error: "invalid_action" | "invalid_body" | ... }
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
const SCOPE_TYPES = new Set(["client", "hiring_project"]);

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
      return json({ ok: true, grants: data ?? [] });
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
      // на дві таблиці неможливий — це відповідальність цієї функції).
      const table = scopeType === "client" ? "clients" : "hiring_projects";
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

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("grant-management unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
