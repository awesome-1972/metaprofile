// supabase/functions/public-client-portal/index.ts
//
// Публічний клієнтський портал вакансії за токеном (/client/:token).
// verify_jwt=false. Віддає ЛИШЕ дозволені прапорцями розділи:
//   • strategy  — стратегія пошуку;
//   • progress  — етапи воронки + лічильники;
//   • shortlist — презентовані кандидати зі звітами/оцінками;
//   • longlist  — «чистий» лонг-лист: посада + досвід, БЕЗ приміток рекрутера
//                 і контактів (і без ПІБ для неконтактованих).
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { token: uuid } → { vacancy, sections:{strategy?,progress?,shortlist?,longlist?} }
//   404 not_found · 400 invalid_body · 500 server_error
//
// Deploy: supabase functions deploy public-client-portal · config: verify_jwt=false.

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
function arr(v: unknown): string[] { return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : []; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!UUID_RE.test(token)) return json({ error: "invalid_body" }, 400);

    const { data: vacancy, error } = await admin
      .from("vacancies")
      .select("id, title, location, is_remote, client_share_enabled, client_show_strategy, client_show_progress, client_show_shortlist, client_show_longlist")
      .eq("client_token", token)
      .maybeSingle();
    if (error) { console.error("client-portal lookup:", error.message); return json({ error: "server_error" }, 500); }
    const v = vacancy as unknown as {
      id: string; title: string; location: string | null; is_remote: boolean;
      client_share_enabled: boolean; client_show_strategy: boolean; client_show_progress: boolean;
      client_show_shortlist: boolean; client_show_longlist: boolean;
    } | null;
    if (!v || !v.client_share_enabled) return json({ error: "not_found" }, 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sections: Record<string, any> = {};

    // ── strategy ──
    if (v.client_show_strategy) {
      const { data: s } = await admin.from("vacancy_search_strategies")
        .select("focus, industries, target_companies, target_titles, profile_musts, out_of_scope, notes")
        .eq("vacancy_id", v.id).maybeSingle();
      if (s) {
        const st = s as Record<string, unknown>;
        sections.strategy = {
          focus: typeof st.focus === "string" ? st.focus : "",
          industries: Array.isArray(st.industries)
            ? (st.industries as Array<Record<string, unknown>>).filter((i) => typeof i?.name === "string").map((i) => ({ name: String(i.name), share: Number(i.share) || 0 }))
            : [],
          target_companies: arr(st.target_companies),
          target_titles: arr(st.target_titles),
          profile_musts: arr(st.profile_musts),
          out_of_scope: typeof st.out_of_scope === "string" ? st.out_of_scope : "",
          notes: typeof st.notes === "string" ? st.notes : "",
        };
      }
    }

    // ── applications (для progress / shortlist / longlist) ──
    const needApps = v.client_show_progress || v.client_show_shortlist || v.client_show_longlist;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apps: any[] = [];
    if (needApps) {
      const { data } = await admin.from("applications")
        .select("id, current_stage_id, list_state, status, candidate:ats_candidates(full_name, headline, location, resume_text)")
        .eq("vacancy_id", v.id);
      apps = data ?? [];
    }

    // ── progress ──
    if (v.client_show_progress) {
      const { data: stages } = await admin.from("pipeline_stages")
        .select("id, name, position").eq("vacancy_id", v.id).order("position", { ascending: true });
      const counts = new Map<string, number>();
      for (const a of apps) {
        if (a.status === "rejected") continue;
        if (a.current_stage_id) counts.set(a.current_stage_id, (counts.get(a.current_stage_id) ?? 0) + 1);
      }
      sections.progress = {
        stages: (stages ?? []).map((s) => ({ name: (s as { name: string }).name, count: counts.get((s as { id: string }).id) ?? 0 })),
        long_list: apps.filter((a) => a.list_state === "long_list").length,
        short_list: apps.filter((a) => a.list_state === "short_list").length,
        total: apps.length,
      };
    }

    // ── shortlist (зі звітами) ──
    if (v.client_show_shortlist) {
      const shortApps = apps.filter((a) => a.list_state === "short_list");
      const appIds = shortApps.map((a) => a.id);
      const reportByApp = new Map<string, string>();
      if (appIds.length) {
        const { data: reports } = await admin.from("candidate_reports")
          .select("application_id, content_md, status, created_at")
          .eq("vacancy_id", v.id).in("application_id", appIds).order("created_at", { ascending: false });
        for (const r of reports ?? []) {
          const rr = r as { application_id: string | null; content_md: string | null; status: string };
          if (rr.application_id && !reportByApp.has(rr.application_id) && rr.status !== "error" && rr.content_md) {
            reportByApp.set(rr.application_id, rr.content_md);
          }
        }
      }
      sections.shortlist = shortApps.map((a) => ({
        name: a.candidate?.full_name ?? "Кандидат",
        title: a.candidate?.headline ?? "",
        location: a.candidate?.location ?? "",
        report: reportByApp.get(a.id) ?? null,
        summary: reportByApp.get(a.id) ? null : (a.candidate?.resume_text ?? "").slice(0, 1500),
      }));
    }

    // ── longlist («чистий»: досвід без приміток і ПІБ) ──
    if (v.client_show_longlist) {
      const longApps = apps.filter((a) => a.list_state === "long_list");
      sections.longlist = longApps.map((a, i) => ({
        label: `Кандидат ${i + 1}`,
        title: a.candidate?.headline ?? "",
        location: a.candidate?.location ?? "",
        experience: (a.candidate?.resume_text ?? "").slice(0, 2000),
      })).filter((c) => c.title || c.experience);
    }

    return json({
      vacancy: { title: v.title, location: v.location, is_remote: v.is_remote },
      sections,
    });
  } catch (error) {
    console.error("public-client-portal unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
