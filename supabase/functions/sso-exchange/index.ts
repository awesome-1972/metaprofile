// supabase/functions/sso-exchange/index.ts  (репо metaprofile — ПРИЙМАЧ SSO)
//
// Етап 1 федеративного SSO (ADR-012): оболонка studio видає короткоживучий
// підписаний «квиток» {email, exp, nonce, name, sig}. Ця функція перевіряє
// підпис і термін, знаходить/створює користувача за email у ЦІЙ базі й повертає
// одноразовий token_hash (magic-link OTP), яким клієнт піднімає сесію на
// сторінці /sso. Фолбек — звичайний логін (якщо квиток недійсний).
//
// БЕЗПЕКА: спільний секрет SSO_SHARED_SECRET (лише Edge-секрет, той самий у
// studio). Квиток короткоживучий (≤120с). verify_jwt=false (це публічний вхід).
//
// Deploy: supabase functions deploy sso-exchange · config: verify_jwt=false.

import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const SSO_SECRET = (Deno.env.get("SSO_SHARED_SECRET") ?? "").trim();
const MAX_AGE_MS = 120_000; // квиток дійсний ≤2 хв

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(msg: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return bytesToB64url(new Uint8Array(sig));
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    if (!SSO_SECRET) return json({ error: "sso_not_configured" }, 503);
    let body: Record<string, unknown>;
    try { body = await req.json(); } catch { return json({ error: "invalid_body" }, 400); }
    const token = typeof body.token === "string" ? body.token : "";
    // Формат квитка: <payloadB64url>.<sigB64url>
    const parts = token.split(".");
    if (parts.length !== 2) return json({ error: "bad_token" }, 401);
    const [payloadB64, sigB64] = parts;
    const expectedSig = await hmac(payloadB64, SSO_SECRET);
    if (!timingSafeEqual(sigB64, expectedSig)) return json({ error: "bad_signature" }, 401);

    let payload: { email?: string; exp?: number; name?: string; nonce?: string };
    try { payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64))); } catch { return json({ error: "bad_payload" }, 401); }
    const email = (payload.email ?? "").toString().trim().toLowerCase();
    if (!email || !email.includes("@")) return json({ error: "no_email" }, 401);
    if (!payload.exp || Date.now() > payload.exp) return json({ error: "expired" }, 401);
    if (payload.exp - Date.now() > MAX_AGE_MS + 5000) return json({ error: "exp_too_far" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Переконатись, що користувач існує (створити за email, якщо нема).
    // getUserByEmail немає у SDK — шукаємо через listUsers (пілот: до 200 юзерів;
    // для масштабу — окремий індекс/таблиця e-mail→id).
    let exists = false;
    try {
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      exists = !!list?.users?.some((u) => (u.email ?? "").toLowerCase() === email);
    } catch { /* ignore, спробуємо створити */ }
    if (!exists) {
      const { error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: true });
      // 422 = вже існує (гонка) — не критично
      if (cErr && !/already/i.test(cErr.message)) {
        console.error("sso-exchange createUser:", cErr.message);
      }
    }

    // Одноразовий OTP для підняття сесії клієнтом.
    const { data: link, error: lErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (lErr || !link?.properties?.hashed_token) {
      console.error("sso-exchange generateLink:", lErr?.message);
      return json({ error: "link_failed", detail: lErr?.message }, 502);
    }
    return json({ ok: true, email, token_hash: link.properties.hashed_token, verify_type: "email" });
  } catch (error) {
    console.error("sso-exchange unhandled:", (error as Error).message);
    return json({ error: "server_error" }, 500);
  }
});
