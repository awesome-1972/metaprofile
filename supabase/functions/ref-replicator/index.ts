// supabase/functions/ref-replicator/index.ts
//
// Metaprofile ATS — Edge Function: ref-replicator (спец. розділ 7.2.2, E2+E3).
//
// Реплікує readonly-кеш довідника хаба (positions/grades/competencies) у
// ref_positions/ref_grades/ref_competencies під service_role. Крон/internal-only
// — НІКОЛИ не викликається з фронтенду.
//
// ── AUTH-КОНТРАКТ (розділ 7.2.0 п.2, SEC-06) ─────────────────────────────────
//   • verify_jwt = false (config.toml) — ця функція НЕ приймає користувацький JWT.
//   • Єдиний допустимий канал автентифікації: заголовок x-internal-secret,
//     що дорівнює Deno.env.get('REF_REPLICATOR_SECRET'). Немає/невалідний
//     секрет → 403 (constant-time порівняння проти timing-атак).
//   • Якщо в запиті випадково прийде Authorization: Bearer <JWT> — ігнорується;
//     секрет — єдине джерело довіри для цього ендпоінту.
//
// ── SEC-07 — токен хаба ───────────────────────────────────────────────────
//   HUB_CONTRACT_TOKEN — лише в Deno.env, readonly-scope контракту хаба
//   (positions/grades/competencies), НІКОЛИ service_role хаба, НІКОЛИ у VITE_*.
//
// ── ТРАНЗАКЦІЙНІСТЬ (без часткового запису) ─────────────────────────────────
//   1. Спочатку ВЕСЬ довідник хаба тягнеться і валідується в памʼяті (staging).
//   2. Якщо хаб недоступний / відповідь невалідна на БУДЬ-ЯКІЙ із запитаних
//      сутностей → 502 hub_contract_unavailable, У БАЗУ НІЧОГО НЕ ПИШЕТЬСЯ.
//   3. Лише після успішного staging усіх сутностей — upsert по кожній entity
//      послідовно (по hub_id) під service_role, потім деактивація зниклих
//      записів (is_active=false) для entity, що синхронізувалась повністю.
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { entities: ["positions","grades","competencies"], full_resync?: bool }
//     (заголовок x-internal-secret обовʼязковий)
//   200 { ok: true, synced: {positions,grades,competencies},
//         deactivated: {positions,grades,competencies}, synced_at }
//   403 { error: "forbidden" }                    — відсутній/невалідний секрет
//   422 { error: "invalid_entities" }
//   502 { error: "hub_contract_unavailable", details? } — хаб недоступний
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy ref-replicator --no-verify-jwt
// Secrets: HUB_CONTRACT_URL, HUB_CONTRACT_TOKEN, REF_REPLICATOR_SECRET
//          (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — auto-provisioned).
// config:  verify_jwt = false (внутрішній секрет замінює JWT-перевірку).

import { createClient } from "jsr:@supabase/supabase-js@2";

// Internal-only endpoint: not exposed to browsers, so a permissive CORS is
// fine (there is no session cookie / user JWT trust boundary crossed here).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-internal-secret, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ENTITIES = ["positions", "grades", "competencies"] as const;
type EntityName = (typeof VALID_ENTITIES)[number];

const ENTITY_TABLE: Record<EntityName, string> = {
  positions: "ref_positions",
  grades: "ref_grades",
  competencies: "ref_competencies",
};

const FETCH_TIMEOUT_MS = 15_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Constant-time string compare to avoid leaking secret length/prefix via timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

interface HubRefRow {
  hub_id: string;
  code?: string | null;
  name: string;
  is_active?: boolean;
  rank?: number | null; // grades only
  category?: string | null; // competencies only
}

function asString(v: unknown, max = 300): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

// Validates + normalizes one hub row. Returns null (drop) if hub_id/name missing.
function normalizeHubRow(raw: unknown, entity: EntityName): HubRefRow | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const hubId = asString(r.id ?? r.hub_id, 200);
  const name = asString(r.name, 500);
  if (!hubId || !name) return null;
  const row: HubRefRow = {
    hub_id: hubId,
    code: asString(r.code, 100),
    name,
    is_active: r.is_active === false ? false : true,
  };
  if (entity === "grades") {
    const rank = typeof r.rank === "number" && Number.isFinite(r.rank) ? r.rank : null;
    row.rank = rank;
  }
  if (entity === "competencies") {
    row.category = asString(r.category, 200);
  }
  return row;
}

// Fetches ONE entity's full list from the hub contract facade. Throws on any
// network/HTTP/shape failure — caller aggregates into a single 502.
async function fetchHubEntity(
  hubUrl: string,
  hubToken: string,
  entity: EntityName,
): Promise<HubRefRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${hubUrl.replace(/\/$/, "")}/${entity}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${hubToken}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
  } catch (e) {
    throw new Error(`network error fetching '${entity}': ${(e as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`hub responded ${res.status} for '${entity}': ${detail.slice(0, 300)}`);
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`hub returned non-JSON for '${entity}': ${(e as Error).message}`);
  }
  const list = Array.isArray(data) ? data : (data as { items?: unknown[] })?.items;
  if (!Array.isArray(list)) {
    throw new Error(`hub returned an unexpected shape for '${entity}' (expected array)`);
  }
  const normalized: HubRefRow[] = [];
  for (const item of list) {
    const row = normalizeHubRow(item, entity);
    if (row) normalized.push(row);
  }
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    // --- 1. Internal-secret auth (NOT a user JWT) ------------------------
    const providedSecret = req.headers.get("x-internal-secret") ?? "";
    const expectedSecret = Deno.env.get("REF_REPLICATOR_SECRET") ?? "";
    if (!expectedSecret || !providedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
      return json({ error: "forbidden" }, 403);
    }

    // --- 2. Parse + validate body -----------------------------------------
    let body: { entities?: unknown; full_resync?: unknown };
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const requested = Array.isArray(body.entities) && body.entities.length > 0
      ? body.entities
      : VALID_ENTITIES;
    const entities: EntityName[] = [];
    for (const e of requested) {
      if (typeof e === "string" && (VALID_ENTITIES as readonly string[]).includes(e)) {
        entities.push(e as EntityName);
      } else {
        return json({ error: "invalid_entities" }, 422);
      }
    }
    if (entities.length === 0) return json({ error: "invalid_entities" }, 422);

    const hubUrl = Deno.env.get("HUB_CONTRACT_URL");
    const hubToken = Deno.env.get("HUB_CONTRACT_TOKEN");
    if (!hubUrl || !hubToken) {
      console.error("ref-replicator misconfigured: HUB_CONTRACT_URL/HUB_CONTRACT_TOKEN unset");
      return json({ error: "hub_contract_unavailable", details: "replicator not configured" }, 502);
    }

    // --- 3. STAGE everything in memory first (no partial writes) ----------
    const staged = new Map<EntityName, HubRefRow[]>();
    for (const entity of entities) {
      try {
        const rows = await fetchHubEntity(hubUrl, hubToken, entity);
        staged.set(entity, rows);
      } catch (e) {
        console.error("ref-replicator staging failed:", (e as Error).message);
        return json(
          { error: "hub_contract_unavailable", details: `failed to stage '${entity}'` },
          502,
        );
      }
    }

    // --- 4. All staged successfully → upsert under service_role -----------
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const synced: Record<EntityName, number> = { positions: 0, grades: 0, competencies: 0 };
    const deactivated: Record<EntityName, number> = { positions: 0, grades: 0, competencies: 0 };
    const syncedAt = new Date().toISOString();

    for (const entity of entities) {
      const rows = staged.get(entity)!;
      const table = ENTITY_TABLE[entity];

      if (rows.length > 0) {
        const upsertRows = rows.map((r) => ({
          hub_id: r.hub_id,
          code: r.code ?? null,
          name: r.name,
          is_active: r.is_active ?? true,
          synced_at: syncedAt,
          ...(entity === "grades" ? { rank: r.rank ?? null } : {}),
          ...(entity === "competencies" ? { category: r.category ?? null } : {}),
        }));
        const { error: upsertErr, count } = await supabase
          .from(table)
          .upsert(upsertRows, { onConflict: "hub_id", count: "exact" });
        if (upsertErr) {
          // Partial-write risk from here on is inherent to per-entity upsert;
          // we already avoided cross-entity partial writes by staging first.
          console.error(`ref-replicator upsert error for '${entity}':`, upsertErr.message);
          return json({ error: "hub_contract_unavailable", details: `upsert failed for '${entity}'` }, 502);
        }
        synced[entity] = count ?? rows.length;
      }

      // Deactivate hub_ids no longer present in this full fetch (entity was
      // fetched completely, so absence = removed at the hub).
      const hubIds = rows.map((r) => r.hub_id);
      let deactivateQuery = supabase
        .from(table)
        .update({ is_active: false, synced_at: syncedAt })
        .eq("is_active", true);
      deactivateQuery = hubIds.length > 0
        ? deactivateQuery.not("hub_id", "in", `(${hubIds.map((id) => `"${id}"`).join(",")})`)
        : deactivateQuery; // empty hub response → deactivate everything for this entity
      const { error: deactErr, count: deactCount } = await deactivateQuery.select("id", { count: "exact", head: true });
      if (deactErr) {
        console.error(`ref-replicator deactivate error for '${entity}':`, deactErr.message);
        return json({ error: "hub_contract_unavailable", details: `deactivate failed for '${entity}'` }, 502);
      }
      deactivated[entity] = deactCount ?? 0;
    }

    return json({ ok: true, synced, deactivated, synced_at: syncedAt });
  } catch (error) {
    console.error("ref-replicator unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
