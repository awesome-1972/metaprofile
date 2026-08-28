// supabase/functions/tester-feedback/index.ts
// Приймає відповіді чек-листа тестувальника ATS і пише в public.tester_feedback.
// Публічний (verify_jwt=false): викликає статичний HTML-чек-лист без логіну.
// Запис — service_role (обходить RLS); читання — лише автентифіковані (політика в міграції).

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const str = (v: unknown) => (v == null ? null : String(v).slice(0, 5000));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    let b: Record<string, unknown>;
    try { b = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("tester_feedback").insert({
      tester: str(b.tester),
      tester_date: str(b.tester_date),
      role: str(b.role),
      overall_score: str(b.overall_score),
      ready: str(b.ready),
      critical: str(b.critical),
      likes: str(b.likes),
      answers: (b.answers ?? {}) as unknown,
      user_agent: str(req.headers.get("user-agent")),
    });
    if (error) { console.error("tester-feedback insert:", error.message); return json({ error: error.message }, 400); }
    return json({ ok: true });
  } catch (e) {
    return json({ error: `server_error: ${(e as Error).message}` }, 500);
  }
});
