// supabase/functions/public-brief/index.ts
//
// Публічна видача бріфу кандидата за токеном (/brief/:token). Без авторизації
// (verify_jwt=false). Віддає ЛИШЕ бріф + позицію/локацію; назва клієнта в
// публіку НЕ потрапляє (конфіденційність уже врахована в тексті бріфу).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST { token: uuid }
//   200 { brief: { title, intro, sections[] },
//         position: { title, location, is_remote } }
//   404 { error: "not_found" }  — токен невідомий або посилання вимкнено
//   400 { error: "invalid_body" } · 500 server_error
//
// Deploy:  supabase functions deploy public-brief
// config:  verify_jwt = false  (публічний доступ за секретним токеном).

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
    // service_role — читаємо повз RLS, але віддаємо лише дозволені поля.
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!UUID_RE.test(token)) return json({ error: "invalid_body" }, 400);

    const { data: brief, error } = await admin
      .from("vacancy_public_briefs")
      .select("title, intro, sections, is_link_enabled, vacancy:vacancies(title, location, is_remote)")
      .eq("public_token", token)
      .maybeSingle();
    if (error) { console.error("public-brief lookup error:", error.message); return json({ error: "server_error" }, 500); }
    if (!brief || !(brief as { is_link_enabled?: boolean }).is_link_enabled) return json({ error: "not_found" }, 404);

    const b = brief as unknown as {
      title: string | null;
      intro: string | null;
      sections: unknown;
      vacancy: { title: string; location: string | null; is_remote: boolean } | null;
    };
    const sections = Array.isArray(b.sections) ? b.sections : [];

    return json({
      brief: { title: b.title, intro: b.intro, sections },
      position: {
        title: b.vacancy?.title ?? b.title ?? "Вакансія",
        location: b.vacancy?.location ?? null,
        is_remote: b.vacancy?.is_remote ?? false,
      },
    });
  } catch (error) {
    console.error("public-brief unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
