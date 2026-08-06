// supabase/functions/public-report/index.ts
//
// Публічна видача звіту по кандидату за токеном (/report/:token). Без авторизації
// (verify_jwt=false). Віддає лише текст звіту + назву позиції — рівно те, що
// рекрутер вирішив показати клієнту (is_shared=true).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { token: uuid }
//   200 { title, content_md, position: { title } }
//   404 { error: "not_found" }  — токен невідомий або доступ вимкнено / звіт не готовий
//   400 invalid_body · 500 server_error
//
// Deploy:  supabase functions deploy public-report   ·   config: verify_jwt = false.

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!UUID_RE.test(token)) return json({ error: "invalid_body" }, 400);

    const { data, error } = await admin
      .from("candidate_reports")
      .select("content_md, status, is_shared, vacancy:vacancies(title)")
      .eq("public_token", token)
      .maybeSingle();
    if (error) { console.error("public-report lookup error:", error.message); return json({ error: "server_error" }, 500); }
    const r = data as unknown as { content_md: string | null; status: string; is_shared: boolean; vacancy: { title: string } | null } | null;
    if (!r || !r.is_shared || r.status !== "ready" || !r.content_md) return json({ error: "not_found" }, 404);

    return json({
      title: "Висновок щодо кандидата",
      content_md: r.content_md,
      position: { title: r.vacancy?.title ?? "Вакансія" },
    });
  } catch (error) {
    console.error("public-report unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
