// supabase/functions/admin-invite-user/index.ts
//
// Metaprofile ATS — Edge Function: admin-invite-user.
//
// Онбординг внутрішніх користувачів агенції (owner/admin/recruiter/assistant)
// — запрошення поштою, перегляд списку, керування ролями, деактивація.
// НЕ використовується для company/candidate — це окремий (публічний)
// самостійний sign-up флоу (AuthPage.tsx), тут навмисно недоступний.
//
// ── AUTH-КОНТРАКТ (дзеркалить grant-management/index.ts) ────────────────────
//   • service_role client — RLS bypass ЛИШЕ всередині цієї функції; також
//     потрібен для auth.admin.* (inviteUserByEmail/listUsers/updateUserById),
//     які недоступні анон/user-ключем.
//   • Викликач верифікується через supabase.auth.getUser(jwt) — НІКОЛИ з body.
//   • Роль перевіряється через has_role(caller.id, 'owner'|'admin') — не
//     з тіла запиту. Будь-яка інша роль (recruiter/assistant/company/candidate)
//     → 403 forbidden.
//   • user_roles.role для дій invite/set_role — ЛИШЕ allow-list
//     {owner, recruiter, assistant, admin} (ATS-онбординг). company/candidate
//     НЕ дозволені через цей інтерфейс навіть для owner/admin.
//   • Самоблокування: не можна зняти власну роль admin і не можна
//     деактивувати самого себе.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { action: "invite", email, full_name?, role }
//     → auth.admin.inviteUserByEmail(email, { data: { full_name }, redirectTo })
//       + insert user_roles(user_id, role) + insert profiles(user_id, email, full_name)
//     200 { ok: true, user_id, email }
//     409 { error: "user_exists" }               — email вже зареєстрований
//
//   POST { action: "list" }
//     → auth.admin.listUsers() + profiles + user_roles, обʼєднані по user_id
//     200 { ok: true, users: [{ id, email, full_name, roles, created_at,
//                                last_sign_in_at, confirmed, banned }] }
//
//   POST { action: "set_role", user_id, role, enabled }
//     → enabled=true: insert user_roles(user_id, role) (idempotent)
//     → enabled=false: delete user_roles where (user_id, role)
//     200 { ok: true, user_id, role, enabled }
//     403 { error: "self_lockout" }              — знімає admin із себе
//
//   POST { action: "deactivate", user_id }
//     → auth.admin.updateUserById(user_id, { ban_duration: "876000h" })
//   POST { action: "activate", user_id }
//     → auth.admin.updateUserById(user_id, { ban_duration: "none" })
//     200 { ok: true, user_id, banned }
//     403 { error: "self_lockout" }              — деактивує самого себе
//
//   401 { error: "unauthorized" }        — немає/невалідний JWT
//   403 { error: "forbidden" }           — викликач не owner/admin
//   404 { error: "user_not_found" }      — user_id не існує (set_role/de|activate)
//   409 { error: "user_exists" }         — email вже зайнятий (invite)
//   422 { error: "invalid_action" | "invalid_body" | "invalid_email" |
//                 "invalid_role" | "invalid_user_id" | "invalid_enabled" }
//   429 { error: "rate_limited" }        — забагато запитів (проста in-memory throttle)
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy admin-invite-user
// Secrets: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (auto-provisioned);
//          APP_ORIGIN (опційно, дефолт http://localhost:8080);
//          ALLOWED_ORIGIN (опційно, інакше "*" для dev).
// config:  verify_jwt = true (звичайний користувацький JWT; роль перевіряється
//          вручну всередині — verify_jwt лише перевіряє підпис).

import { createClient } from "jsr:@supabase/supabase-js@2";

// --- CORS -------------------------------------------------------------
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

const APP_ORIGIN = Deno.env.get("APP_ORIGIN") ?? "http://localhost:8080";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Проста, але достатня email-валідація (не RFC5322-повна, і не потрібна тут:
// реальна перевірка доставки — на стороні auth.admin.inviteUserByEmail).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ATS-онбординг: лише внутрішні ролі агенції. company/candidate — окремий
// публічний sign-up флоу (AuthPage.tsx), навмисно недоступний тут.
const INVITE_ROLES = new Set(["owner", "recruiter", "assistant", "admin"]);

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
// this isolate's lifetime (дзеркалить grant-management).
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

function isUserExistsError(message: string | undefined): boolean {
  const m = message || "";
  return /already.*registered|already.*exists|user.*already/i.test(m);
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
      console.error("admin-invite-user has_role(owner) error:", ownerErr.message);
      return json({ error: "server_error" }, 500);
    }
    let authorized = Boolean(isOwner);
    if (!authorized) {
      const { data: isAdmin, error: adminErr } = await supabase.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      if (adminErr) {
        console.error("admin-invite-user has_role(admin) error:", adminErr.message);
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

    // ------------------------------------------------------------------
    // action: invite
    // ------------------------------------------------------------------
    if (action === "invite") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : undefined;
      const role = body.role;

      if (!EMAIL_RE.test(email)) return json({ error: "invalid_email" }, 422);
      if (typeof role !== "string" || !INVITE_ROLES.has(role)) {
        return json({ error: "invalid_role" }, 422);
      }

      const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : {},
        redirectTo: `${APP_ORIGIN}/v2/auth`,
      });

      if (inviteErr || !invited?.user) {
        if (isUserExistsError(inviteErr?.message)) {
          return json({ error: "user_exists" }, 409);
        }
        console.error("admin-invite-user inviteUserByEmail error:", inviteErr?.message);
        return json({ error: "server_error" }, 500);
      }

      const userId = invited.user.id;

      // profiles — немає БД-тригера handle_new_user у цьому репо (профіль
      // сьогодні створюється клієнтським кодом при sign-up, див. AuthPage.tsx);
      // для запрошених користувачів робимо це тут, інакше рядок з'явиться
      // лише якщо/коли користувач сам залогіниться і щось напише в profiles.
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          { user_id: userId, email, full_name: fullName || null },
          { onConflict: "user_id" },
        );
      if (profileErr) {
        console.error("admin-invite-user profile upsert error:", profileErr.message);
        // Не фатально для запрошення — роль все одно призначаємо нижче;
        // profiles.full_name/email можна донаповнити пізніше.
      }

      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (roleErr && !/duplicate/i.test(roleErr.message)) {
        console.error("admin-invite-user role insert error:", roleErr.message);
        return json({ error: "server_error" }, 500);
      }

      return json({ ok: true, user_id: userId, email });
    }

    // ------------------------------------------------------------------
    // action: list
    // ------------------------------------------------------------------
    if (action === "list") {
      const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) {
        console.error("admin-invite-user listUsers error:", listErr.message);
        return json({ error: "server_error" }, 500);
      }

      const authUsers = usersPage?.users ?? [];
      const userIds = authUsers.map((u) => u.id);

      const [{ data: profiles, error: profilesErr }, { data: roles, error: rolesErr }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
        supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
      ]);
      if (profilesErr) {
        console.error("admin-invite-user profiles lookup error:", profilesErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (rolesErr) {
        console.error("admin-invite-user roles lookup error:", rolesErr.message);
        return json({ error: "server_error" }, 500);
      }

      const profileByUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const rolesByUser = new Map<string, string[]>();
      for (const r of roles ?? []) {
        const list = rolesByUser.get(r.user_id) ?? [];
        list.push(r.role as string);
        rolesByUser.set(r.user_id, list);
      }

      const users = authUsers.map((u) => {
        const profile = profileByUser.get(u.id);
        return {
          id: u.id,
          email: u.email ?? profile?.email ?? null,
          full_name: profile?.full_name ?? null,
          roles: rolesByUser.get(u.id) ?? [],
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
          banned: Boolean(u.banned_until && u.banned_until !== "none" && new Date(u.banned_until) > new Date()),
        };
      });

      return json({ ok: true, users });
    }

    // ------------------------------------------------------------------
    // action: set_role
    // ------------------------------------------------------------------
    if (action === "set_role") {
      const userId = body.user_id;
      const role = body.role;
      const enabled = body.enabled;

      if (!isUuid(userId)) return json({ error: "invalid_user_id" }, 422);
      if (typeof role !== "string" || !INVITE_ROLES.has(role)) {
        return json({ error: "invalid_role" }, 422);
      }
      if (typeof enabled !== "boolean") return json({ error: "invalid_enabled" }, 422);

      // Самоблокування: заборонено знімати admin із самого себе.
      if (!enabled && role === "admin" && userId === caller.id) {
        return json({ error: "self_lockout" }, 403);
      }

      // Перевірка існування користувача (auth.admin.getUserById).
      const { data: targetUser, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
      if (getUserErr || !targetUser?.user) {
        return json({ error: "user_not_found" }, 404);
      }

      if (enabled) {
        const { error: insertErr } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (insertErr && !/duplicate/i.test(insertErr.message)) {
          console.error("admin-invite-user set_role insert error:", insertErr.message);
          return json({ error: "server_error" }, 500);
        }
      } else {
        const { error: deleteErr } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (deleteErr) {
          console.error("admin-invite-user set_role delete error:", deleteErr.message);
          return json({ error: "server_error" }, 500);
        }
      }

      return json({ ok: true, user_id: userId, role, enabled });
    }

    // ------------------------------------------------------------------
    // action: deactivate / activate
    // ------------------------------------------------------------------
    if (action === "deactivate" || action === "activate") {
      const userId = body.user_id;
      if (!isUuid(userId)) return json({ error: "invalid_user_id" }, 422);

      if (action === "deactivate" && userId === caller.id) {
        return json({ error: "self_lockout" }, 403);
      }

      const { data: targetUser, error: getUserErr } = await supabase.auth.admin.getUserById(userId);
      if (getUserErr || !targetUser?.user) {
        return json({ error: "user_not_found" }, 404);
      }

      const banDuration = action === "deactivate" ? "876000h" : "none";
      const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
        ban_duration: banDuration,
      });
      if (updateErr) {
        console.error(`admin-invite-user ${action} error:`, updateErr.message);
        return json({ error: "server_error" }, 500);
      }

      return json({ ok: true, user_id: userId, banned: action === "deactivate" });
    }

    return json({ error: "invalid_action" }, 422);
  } catch (error) {
    console.error("admin-invite-user unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
