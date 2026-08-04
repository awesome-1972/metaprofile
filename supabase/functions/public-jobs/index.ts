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

    // База — вакансії, опубліковані на порталі (board_published_at). Приватний лінк на
    // бріф сам по собі вакансію на портал НЕ виводить. Токен деталі беремо з публічного
    // бріфу (публікація на порталі гарантує його увімкнення).
    const CLOSED = new Set(["filled", "closed", "cancelled"]);
    const { data, error } = await admin
      .from("vacancies")
      .select("id, title, location, is_remote, work_style, status, board_published_at, public_brief:vacancy_public_briefs(public_token, is_link_enabled)")
      .not("board_published_at", "is", null)
      .order("board_published_at", { ascending: false });
    if (error) { console.error("public-jobs lookup error:", error.message); return json({ error: "server_error" }, 500); }

    const jobs = (data ?? [])
      .map((r) => r as unknown as {
        title: string;
        location: string | null;
        is_remote: boolean;
        work_style: string | null;
        status: string;
        board_published_at: string | null;
        public_brief: { public_token: string | null; is_link_enabled: boolean } | Array<{ public_token: string | null; is_link_enabled: boolean }> | null;
      })
      .map((row) => {
        const pb = Array.isArray(row.public_brief) ? row.public_brief[0] : row.public_brief;
        return { row, token: pb?.public_token ?? null, enabled: pb?.is_link_enabled ?? false };
      })
      // Показуємо лише не-закриті вакансії з робочим публічним токеном.
      .filter(({ row, token, enabled }) => token && enabled && !CLOSED.has(row.status))
      .map(({ row, token }) => ({
        token,
        title: row.title,
        location: row.location,
        is_remote: row.is_remote,
        work_style: row.work_style,
        published_at: row.board_published_at,
      }));

    return json({ jobs });
  } catch (error) {
    console.error("public-jobs unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
