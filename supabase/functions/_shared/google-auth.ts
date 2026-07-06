// supabase/functions/_shared/google-auth.ts
//
// Спільний хелпер: отримання Google OAuth2 access token через сервісний
// акаунт + domain-wide delegation (RFC 7523 JWT Bearer flow), Deno WebCrypto
// (без npm-залежностей на кшталт google-auth-library — Deno Edge Runtime).
//
// Модель (рішення власника): один сервісний акаунт Google Workspace,
// авторизований на domain-wide delegation з набором scopes (Calendar,
// Docs, Drive readonly). Кожен виклик ІМПЕРСОНУЄ конкретного користувача
// Workspace (поле `sub` у JWT) — тобто дії виконуються "від імені" людини,
// що ініціювала дію в системі (організатор інтервʼю), а не від імені
// сервісного акаунта самого по собі. Це дає:
//   • правильний "organizer" у Google Calendar (не сервісний бот);
//   • доступ до документа транскрипта, що лежить у Drive цього користувача.
//
// ── ENV ──────────────────────────────────────────────────────────────────
//   GOOGLE_SA_EMAIL        — client_email сервісного акаунта (з JSON-ключа).
//   GOOGLE_SA_PRIVATE_KEY  — private_key з JSON-ключа, PEM, рядки розділені
//                            буквальним "\n" (як зберігається в env/secrets;
//                            ця функція сама конвертує "\n" → реальний
//                            перевід рядка перед importKey).
//
// ── ПУБЛІЧНЕ API ─────────────────────────────────────────────────────────
//   getGoogleAccessToken(subjectEmail: string, scopes: string[]): Promise<string>
//     Повертає короткоживучий access token, імперсонуючи subjectEmail, з
//     запитаними scopes. Кешується в памʼяті модуля (ключ = subject+scopes),
//     повторно використовується, поки не спливе (з запасом 60с).
//
// ── ПОМИЛКИ ──────────────────────────────────────────────────────────────
//   Кидає GoogleAuthError(message, status?) якщо:
//     • відсутні GOOGLE_SA_EMAIL / GOOGLE_SA_PRIVATE_KEY;
//     • підпис JWT не вдався (invalid PEM);
//     • POST https://oauth2.googleapis.com/token повернув помилку (напр.
//       401/403 — найчастіше означає, що domain-wide delegation не
//       налаштовано для цього client_id+scopes, або subjectEmail поза
//       організацією Workspace).
//
// Викликається з Edge Functions schedule-interview / fetch-meet-transcript.

export class GoogleAuthError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "GoogleAuthError";
    this.status = status;
  }
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// Кеш токенів у памʼяті цього isolate (module-level Map, живе між викликами
// Deno.serve у межах одного "теплого" інстансу функції — не персистентний
// сховище, лише оптимізація повторних викликів у тому самому isolate).
const tokenCache = new Map<string, CachedToken>();

function cacheKey(subjectEmail: string, scopes: string[]): string {
  return `${subjectEmail}::${[...scopes].sort().join(",")}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(s: string): string {
  return base64UrlEncode(new TextEncoder().encode(s));
}

/**
 * Парсить PEM (PKCS8 private key) у форматі, як він зберігається в env
 * secrets: рядки розділені буквальним "\n" (два символи), а не реальним
 * переводом рядка. Повертає ArrayBuffer DER-байтів, готовий для
 * crypto.subtle.importKey.
 */
function pemToDer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n");
  const stripped = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  if (!stripped) {
    throw new GoogleAuthError("GOOGLE_SA_PRIVATE_KEY: порожній або некоректний PEM після нормалізації");
  }
  const binary = atob(stripped);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

let importedKeyCache: CryptoKey | null = null;
let importedKeyCacheForPem: string | null = null;

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Ключ не міняється між викликами в межах isolate — кешуємо саму
  // importKey-операцію (WebCrypto importKey не є надто дорогою, але
  // уникнути повторного base64/atob-парсингу на кожен запит доцільно).
  if (importedKeyCache && importedKeyCacheForPem === pem) return importedKeyCache;
  const der = pemToDer(pem);
  try {
    const key = await crypto.subtle.importKey(
      "pkcs8",
      der,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    );
    importedKeyCache = key;
    importedKeyCacheForPem = pem;
    return key;
  } catch (err) {
    throw new GoogleAuthError(
      `GOOGLE_SA_PRIVATE_KEY: не вдалося імпортувати PKCS8-ключ (${(err as Error).message}). ` +
        `Перевірте, що ключ скопійовано повністю (включно з BEGIN/END PRIVATE KEY) і переноси рядків передані як \\n.`,
    );
  }
}

/**
 * Формує та підписує JWT (RS256) для grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer,
 * з sub=subjectEmail (domain-wide delegation impersonation) і запитаними scopes.
 */
async function buildSignedJwt(subjectEmail: string, scopes: string[]): Promise<string> {
  const saEmail = Deno.env.get("GOOGLE_SA_EMAIL");
  const saPrivateKey = Deno.env.get("GOOGLE_SA_PRIVATE_KEY");
  if (!saEmail) throw new GoogleAuthError("Відсутній env GOOGLE_SA_EMAIL");
  if (!saPrivateKey) throw new GoogleAuthError("Відсутній env GOOGLE_SA_PRIVATE_KEY");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: saEmail,
    scope: scopes.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    sub: subjectEmail, // domain-wide delegation: імперсонація цього користувача Workspace
    iat: now,
    exp: now + 3600, // максимум, дозволений Google для цього flow
  };

  const encodedHeader = base64UrlEncodeString(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncodeString(JSON.stringify(claimSet));
  const signingInput = `${encodedHeader}.${encodedClaimSet}`;

  const cryptoKey = await importPrivateKey(saPrivateKey);
  const signatureBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuf));

  return `${signingInput}.${encodedSignature}`;
}

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

/**
 * Отримує (з кешу або нове) короткоживучий Google OAuth2 access token,
 * імперсонуючи subjectEmail через domain-wide delegation, зі scopes.
 *
 * @throws GoogleAuthError — конфігурація/підпис/HTTP-помилка Google.
 *   status=401|403 від Google найчастіше означає, що domain-wide delegation
 *   не налаштовано (Client ID сервісного акаунта + ці scopes мають бути
 *   додані в Google Workspace Admin → Security → API Controls → Domain-wide
 *   Delegation), або subjectEmail не належить цій Workspace-організації.
 */
export async function getGoogleAccessToken(subjectEmail: string, scopes: string[]): Promise<string> {
  const key = cacheKey(subjectEmail, scopes);
  const cached = tokenCache.get(key);
  const nowMs = Date.now();
  if (cached && cached.expiresAt - 60_000 > nowMs) {
    return cached.accessToken;
  }

  const jwt = await buildSignedJwt(subjectEmail, scopes);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  let body: GoogleTokenResponse;
  try {
    body = await response.json();
  } catch {
    throw new GoogleAuthError(`Google token endpoint повернув невалідний JSON (HTTP ${response.status})`, response.status);
  }

  if (!response.ok || !body.access_token) {
    const detail = body.error_description || body.error || `HTTP ${response.status}`;
    let hint = "";
    if (response.status === 401 || response.status === 403) {
      hint =
        " Підказка: перевірте domain-wide delegation для цього сервісного акаунта " +
        "(Google Workspace Admin → Security → API Controls → Domain-wide Delegation) " +
        "і що scopes у делегації точно збігаються із запитаними.";
    }
    throw new GoogleAuthError(`Не вдалося отримати Google access token: ${detail}.${hint}`, response.status);
  }

  const expiresInMs = (body.expires_in ?? 3600) * 1000;
  tokenCache.set(key, { accessToken: body.access_token, expiresAt: nowMs + expiresInMs });

  return body.access_token;
}

/** Скидає кеш токенів (для тестів). */
export function _resetGoogleAuthCacheForTests(): void {
  tokenCache.clear();
  importedKeyCache = null;
  importedKeyCacheForPem = null;
}
