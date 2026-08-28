// supabase/functions/competency-master/index.ts  (репо metaprofile — СПОЖИВАЧ довідника)
//
// Фаза 4 слайс 3 (ADR-013). ATS тягне спільний майстер-довідник компетенцій зі
// studio, щоб рекрутер міг обрати компетенції у матрицю вакансії, а не набирати
// вручну. Підписує HMAC-квиток спільним секретом і звертається до studio
// `competency-export`. verify_jwt лишаємо true (тягне лише залогінений користувач).
//
// Секрети: SSO_SHARED_SECRET (той самий, що для SSO), STUDIO_EXPORT_URL (за замовч.
// нижче), STUDIO_ANON_KEY (anon/publishable ключ studio для apikey гейтвею).

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const SSO_SECRET = (Deno.env.get("SSO_SHARED_SECRET") ?? "").trim();
const STUDIO_EXPORT_URL = (Deno.env.get("STUDIO_EXPORT_URL") ??
  "https://vpgdjffmcnkqgwqdrsyd.supabase.co/functions/v1/competency-export").trim();
const STUDIO_ANON_KEY = (Deno.env.get("STUDIO_ANON_KEY") ?? "").trim();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function bytesToB64url(b: Uint8Array): string {
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function strToB64url(s: string): string { return bytesToB64url(new TextEncoder().encode(s)); }
async function hmac(msg: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToB64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg))));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (!SSO_SECRET) return json({ error: "not_configured" }, 503);
    const payload = { exp: Date.now() + 90_000, nonce: crypto.randomUUID() };
    const payloadB64 = strToB64url(JSON.stringify(payload));
    const token = `${payloadB64}.${await hmac(payloadB64, SSO_SECRET)}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (STUDIO_ANON_KEY) { headers["apikey"] = STUDIO_ANON_KEY; headers["Authorization"] = `Bearer ${STUDIO_ANON_KEY}`; }

    let resp: Response, text: string;
    try {
      resp = await fetch(STUDIO_EXPORT_URL, { method: "POST", headers, body: JSON.stringify({ token }) });
      text = await resp.text();
    } catch (e) { return json({ error: `Не вдалось звернутись до studio: ${(e as Error).message}` }); }
    if (!resp.ok) return json({ error: `studio відповів ${resp.status}: ${text.slice(0, 200)}${STUDIO_ANON_KEY ? "" : " · не задано STUDIO_ANON_KEY"}` });
    try { return json(JSON.parse(text)); } catch { return json({ error: `studio повернув не-JSON: ${text.slice(0, 200)}` }); }
  } catch (error) {
    return json({ error: `server_error: ${(error as Error).message}` });
  }
});
