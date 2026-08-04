// supabase/functions/public-jobs/index.ts
//
// Публічний список відкритих вакансій (/jobs) — усі бріфи з увімкненим публічним
// посиланням. Без авторизації (verify_jwt=false). Віддає лише публічні поля;
// назва клієнта в публіку НЕ потрапляє. Деталі вакансії відкриваються за токеном
// через уже наявний public-brief (/brief/:token).
//
// ── CONTRACT ──────────────────────────────────────────────────────────────
//   POST {}  (або GET)
//   200 { jobs: [{ token, title, location, is_remote, work_style, published_at }] }
//   500 server_error
//
// Deploy:  supabase functions deploy public-jobs   ·   config: verify_jwt = false.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data, error } = await admin
      .from("vacancy_public_briefs")
      .select("public_token, title, published_at, is_link_enabled, vacancy:vacancies(title, location, is_remote, work_style, status)")
      .eq("is_link_enabled", true)
      .order("published_at", { ascending: false });
    if (error) { console.error("public-jobs lookup error:", error.message); return json({ error: "server_error" }, 500); }

    const CLOSED = new Set(["filled", "closed", "cancelled"]);
    const jobs = (data ?? [])
      .map((r) => {
        const row = r as unknown as {
          public_token: string | null;
          title: string | null;
          published_at: string | null;
          vacancy: { title: string; location: string | null; is_remote: boolean; work_style: string | null; status: string } | null;
        };
        return row;
      })
      // Закриті/скасовані вакансії не показуємо, навіть якщо посилання лишилось увімкненим.
      .filter((row) => row.public_token && (!row.vacancy || !CLOSED.has(row.vacancy.status)))
      .map((row) => ({
        token: row.public_token,
        title: row.vacancy?.title ?? row.title ?? "Вакансія",
        location: row.vacancy?.location ?? null,
        is_remote: row.vacancy?.is_remote ?? false,
        work_style: row.vacancy?.work_style ?? null,
        published_at: row.published_at,
      }));

    return json({ jobs });
  } catch (error) {
    console.error("public-jobs unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
