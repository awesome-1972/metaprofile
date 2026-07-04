// supabase/functions/seed-vacancy-stages/index.ts
//
// Metaprofile ATS — Edge Function: seed-vacancy-stages (спец. розділ 7.2.4).
//
// Матеріалізує pipeline_stages для вакансії з pipeline_stage_template_items
// обраного шаблону (або is_default, якщо template_id не передано). Ідемпотентна:
// якщо у вакансії вже є стадії — 409 (no silent no-op, щоб виклик не сховав
// логічну помилку на фронтенді — прямий сигнал "вже засіяно").
//
// ── AUTH-КОНТРАКТ (розділ 7.2.0) ────────────────────────────────────────────
//   • getUser(jwt) — НЕ з body. 401 якщо немає.
//   • Дозволено: owner/admin (has_role) АБО викликач має can_edit на
//     hiring_project вакансії (mp_can_edit_project, під JWT ВИКЛИКАЧА).
//     Немає доступу → 403 forbidden.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid, template_id?: uuid|null }   // null/omitted → is_default
//   200 { ok: true, stages_created: number }
//   401 { error: "unauthorized" }
//   403 { error: "forbidden" }
//   404 { error: "vacancy_not_found" | "template_not_found" }
//   409 { error: "stages_already_seeded" }
//   422 { error: "invalid_vacancy_id" | "invalid_template_id" }
//   500 { error: "server_error" }
//
// Deploy:  supabase functions deploy seed-vacancy-stages
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // --- 1. Verify JWT --------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user: caller },
      error: authError,
    } = await supabaseService.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);

    // --- 2. Parse + validate body -----------------------------------------
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid_body" }, 400);
    }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_vacancy_id" }, 422);

    let templateId: string | null = null;
    if (body.template_id !== undefined && body.template_id !== null) {
      if (!isUuid(body.template_id)) return json({ error: "invalid_template_id" }, 422);
      templateId = body.template_id;
    }

    // --- 3. Load vacancy (need hiring_project_id for the authz check) -----
    const { data: vacancy, error: vacErr } = await supabaseService
      .from("vacancies")
      .select("id, hiring_project_id")
      .eq("id", vacancyId)
      .maybeSingle();
    if (vacErr) {
      console.error("seed-vacancy-stages vacancy lookup error:", vacErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);

    // --- 4. Authorize: owner/admin OR can_edit on the vacancy's project ---
    const { data: isOwner, error: ownerErr } = await supabaseService.rpc("has_role", {
      _user_id: caller.id,
      _role: "owner",
    });
    if (ownerErr) {
      console.error("seed-vacancy-stages has_role(owner) error:", ownerErr.message);
      return json({ error: "server_error" }, 500);
    }
    let authorized = Boolean(isOwner);
    if (!authorized) {
      const { data: isAdmin, error: adminErr } = await supabaseService.rpc("has_role", {
        _user_id: caller.id,
        _role: "admin",
      });
      if (adminErr) {
        console.error("seed-vacancy-stages has_role(admin) error:", adminErr.message);
        return json({ error: "server_error" }, 500);
      }
      authorized = Boolean(isAdmin);
    }
    if (!authorized) {
      const supabaseAsCaller = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { global: { headers: { Authorization: `Bearer ${jwt}` } } },
      );
      const { data: canEdit, error: rpcErr } = await supabaseAsCaller.rpc("mp_can_edit_project", {
        p_project_id: vacancy.hiring_project_id,
      });
      if (rpcErr) {
        console.error("seed-vacancy-stages mp_can_edit_project error:", rpcErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!canEdit) return json({ error: "forbidden" }, 403);
    }

    // --- 5. Idempotency: refuse if stages already exist for this vacancy --
    const { count: existingCount, error: existErr } = await supabaseService
      .from("pipeline_stages")
      .select("id", { count: "exact", head: true })
      .eq("vacancy_id", vacancyId);
    if (existErr) {
      console.error("seed-vacancy-stages existing-stages check error:", existErr.message);
      return json({ error: "server_error" }, 500);
    }
    if ((existingCount ?? 0) > 0) return json({ error: "stages_already_seeded" }, 409);

    // --- 6. Resolve template (explicit id, or the workspace default) ------
    let resolvedTemplateId = templateId;
    if (!resolvedTemplateId) {
      const { data: defaultTemplate, error: defErr } = await supabaseService
        .from("pipeline_stage_templates")
        .select("id")
        .eq("is_default", true)
        .maybeSingle();
      if (defErr) {
        console.error("seed-vacancy-stages default template lookup error:", defErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!defaultTemplate) return json({ error: "template_not_found" }, 404);
      resolvedTemplateId = defaultTemplate.id;
    } else {
      const { data: template, error: tplErr } = await supabaseService
        .from("pipeline_stage_templates")
        .select("id")
        .eq("id", resolvedTemplateId)
        .maybeSingle();
      if (tplErr) {
        console.error("seed-vacancy-stages template lookup error:", tplErr.message);
        return json({ error: "server_error" }, 500);
      }
      if (!template) return json({ error: "template_not_found" }, 404);
    }

    // --- 7. Load template items and materialize as pipeline_stages --------
    const { data: items, error: itemsErr } = await supabaseService
      .from("pipeline_stage_template_items")
      .select("name, stage_type, position, is_terminal")
      .eq("template_id", resolvedTemplateId)
      .order("position", { ascending: true });
    if (itemsErr) {
      console.error("seed-vacancy-stages items lookup error:", itemsErr.message);
      return json({ error: "server_error" }, 500);
    }
    if (!items || items.length === 0) {
      return json({ ok: true, stages_created: 0 });
    }

    const rows = items.map((item) => ({
      vacancy_id: vacancyId,
      name: item.name,
      stage_type: item.stage_type,
      position: item.position,
      is_terminal: item.is_terminal,
    }));

    // Re-check-then-insert has a narrow TOCTOU window under concurrent seeding
    // of the same vacancy; the unique (vacancy_id, position) constraint on
    // pipeline_stages makes a racing second insert fail atomically rather
    // than silently duplicating stages.
    const { data: inserted, error: insertErr } = await supabaseService
      .from("pipeline_stages")
      .insert(rows)
      .select("id");
    if (insertErr) {
      // Unique-violation from a concurrent seed race surfaces as a conflict,
      // not a generic 500 — the caller can safely treat it as "already seeded".
      if ((insertErr as { code?: string }).code === "23505") {
        return json({ error: "stages_already_seeded" }, 409);
      }
      console.error("seed-vacancy-stages insert error:", insertErr.message);
      return json({ error: "server_error" }, 500);
    }

    return json({ ok: true, stages_created: inserted?.length ?? 0 });
  } catch (error) {
    console.error("seed-vacancy-stages unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
