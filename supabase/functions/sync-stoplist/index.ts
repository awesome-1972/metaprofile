// supabase/functions/sync-stoplist/index.ts
//
// Metaprofile ATS — синхронізація стоп-листа вакансії з Google-документа.
//
// Клієнт веде стоп-лист у Google Doc/Sheet. Функція читає документ через сервісний
// акаунт (domain-wide delegation, імперсонація викликача), парсить рядки у записи
// {ПІБ, компанія, причина} і оновлює записи джерела 'gdoc' у vacancy_stop_list —
// ручні записи ('manual') не чіпає. Так новий кандидат, доданий клієнтом у документ,
// підтягується в портал і не буде пропущений.
//
// ── AUTH ────────────────────────────────────────────────────────────────────
//   verify_jwt=true; getUser(jwt); scope mp_can_edit_vacancy. Google — drive.readonly.
//
// ── CONTRACT ────────────────────────────────────────────────────────────────
//   POST { vacancy_id: uuid }
//   200 { count, synced_at }   ·   400/401/403/404/422/502(google)/500
//
// Deploy:  supabase functions deploy sync-stoplist   ·   config: verify_jwt = true.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGoogleAccessToken, GoogleAuthError } from "../_shared/google-auth.ts";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function isUuid(v: unknown): v is string { return typeof v === "string" && UUID_RE.test(v); }

// Витягнути тип+id Google-документа з посилання.
function parseGoogleUrl(url: string): { kind: "document" | "spreadsheets"; id: string } | null {
  const m = url.match(/\/(document|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  return { kind: m[1] as "document" | "spreadsheets", id: m[2] };
}

interface StopEntry { full_name: string; company: string | null; reason: string | null }

// Парсинг рядків документа/таблиці у записи. Роздільники: tab | ; , « - » « — ».
function parseLines(text: string): StopEntry[] {
  const out: StopEntry[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  const SEP = /\t|\s+[—-]\s+|;|\|/; // спершу «сильні» роздільники, кома — окремо нижче
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // Пропустити ймовірний заголовок таблиці.
    if (/^(піб|прізвище|full[_\s]?name|name|кандидат|компан|company|причин|reason)\b/i.test(line) && out.length === 0) continue;
    let parts = line.split(SEP).map((p) => p.trim()).filter(Boolean);
    if (parts.length === 1) parts = line.split(",").map((p) => p.trim()).filter(Boolean);
    const full_name = (parts[0] ?? "").trim();
    if (full_name.length < 2) continue;
    const key = full_name.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      full_name,
      company: parts[1]?.trim() || null,
      reason: parts.slice(2).join(", ").trim() || null,
    });
  }
  return out.slice(0, 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? srk;
    const admin = createClient(url, srk);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user: caller }, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller) return json({ error: "unauthorized" }, 401);
    if (!caller.email) return json({ error: "no_email" }, 422);
    const asCaller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jwt}` } } });

    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const vacancyId = body.vacancy_id;
    if (!isUuid(vacancyId)) return json({ error: "invalid_body", detail: "vacancy_id" }, 422);

    const { data: canEdit, error: scopeErr } = await asCaller.rpc("mp_can_edit_vacancy", { p_vacancy_id: vacancyId });
    if (scopeErr) { console.error("sync-stoplist scope error:", scopeErr.message); return json({ error: "server_error" }, 500); }
    if (!canEdit) return json({ error: "forbidden" }, 403);

    const { data: vacancy, error: vErr } = await admin
      .from("vacancies").select("id, tenant_id, stop_list_source_url").eq("id", vacancyId).maybeSingle();
    if (vErr) { console.error("sync-stoplist vacancy error:", vErr.message); return json({ error: "server_error" }, 500); }
    if (!vacancy) return json({ error: "vacancy_not_found" }, 404);
    const vac = vacancy as unknown as { tenant_id: string | null; stop_list_source_url: string | null };
    if (!vac.stop_list_source_url) return json({ error: "no_source", detail: "stop_list_source_url" }, 422);

    const parsed = parseGoogleUrl(vac.stop_list_source_url);
    if (!parsed) return json({ error: "invalid_source", detail: "Очікується посилання на Google Doc або Sheet" }, 422);

    // Google access token (імперсонація викликача) + експорт документа.
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(caller.email, DRIVE_SCOPES);
    } catch (e) {
      const detail = e instanceof GoogleAuthError ? e.message : "Google auth error";
      console.error("sync-stoplist google auth:", detail);
      return json({ error: "google_error", detail }, 502);
    }

    const mime = parsed.kind === "spreadsheets" ? "text/csv" : "text/plain";
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${parsed.id}/export?mimeType=${encodeURIComponent(mime)}`;
    let text = "";
    try {
      const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 200);
        return json({ error: "google_error", detail: `Export HTTP ${res.status}: ${detail}` }, 502);
      }
      text = await res.text();
    } catch (e) {
      return json({ error: "google_error", detail: `Fetch: ${(e as Error).message}` }, 502);
    }

    const entries = parseLines(text);

    // Реконсиляція: прибираємо старі gdoc-записи, вставляємо поточні (manual не чіпаємо).
    const { error: delErr } = await admin.from("vacancy_stop_list").delete().eq("vacancy_id", vacancyId).eq("source", "gdoc");
    if (delErr) console.error("sync-stoplist delete error:", delErr.message);
    if (entries.length > 0) {
      const rows = entries.map((e) => ({
        vacancy_id: vacancyId, tenant_id: vac.tenant_id, source: "gdoc",
        full_name: e.full_name, company: e.company, reason: e.reason,
      }));
      const { error: insErr } = await admin.from("vacancy_stop_list").insert(rows);
      if (insErr) { console.error("sync-stoplist insert error:", insErr.message); return json({ error: "server_error" }, 500); }
    }

    const syncedAt = new Date().toISOString();
    await admin.from("vacancies").update({ stop_list_synced_at: syncedAt } as never).eq("id", vacancyId);

    return json({ count: entries.length, synced_at: syncedAt });
  } catch (error) {
    console.error("sync-stoplist unhandled error:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
