// relay/server.mjs
//
// Metaprofile ATS — універсальний захищений релей (forward-proxy).
//
// НАВІЩО: деякі джерела (robota.ua, jooble.org) за Cloudflare блокують серверний
// IP Supabase Edge. Релей запускається на машині зі «звичайним» IP (офісний
// статичний IP або VPS) і ходить у ці API замість Edge. Edge-функція шле сюди
// POST /fetch із секретом, релей форвардить запит на дозволений хост і повертає
// відповідь.
//
// ЗАПУСК:
//   RELAY_SECRET=довгий_секрет node relay/server.mjs           (порт за замовч. 8787)
//   RELAY_SECRET=... PORT=9000 node relay/server.mjs
//
// Потрібен Node.js 18+ (вбудований fetch). Зробити релей доступним з інтернету:
//   • Cloudflare Tunnel:  cloudflared tunnel --url http://localhost:8787
//   • або ngrok:          ngrok http 8787
// Публічний URL із тунелю → у секрет Supabase RELAY_URL (+ RELAY_SECRET).
//
// БЕЗПЕКА: приймаємо лише POST /fetch із правильним заголовком x-relay-secret і
// лише на хости з ALLOW_HOSTS (щоб релей не став відкритим проксі).

import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const SECRET = (process.env.RELAY_SECRET || "").trim();
if (!SECRET) {
  console.error("RELAY_SECRET не заданий. Приклад: RELAY_SECRET=xxxx node relay/server.mjs");
  process.exit(1);
}

// Дозволені хости (щоб релей не був відкритим проксі). Додавайте за потреби.
const ALLOW_HOSTS = new Set([
  "employer-api.robota.ua",
  "auth-api.robota.ua",
  "jooble.org",
  "api.work.ua",
  "jobs.dou.ua",
]);

// Реалістичний User-Agent (легітимний клієнт, не спуф браузера для обходу капчі).
const DEFAULT_UA = "MetaprofileATS-Relay/1.0";

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") return send(res, 200, { ok: true });
  if (req.method !== "POST" || !req.url.startsWith("/fetch")) return send(res, 404, { error: "not_found" });
  if ((req.headers["x-relay-secret"] || "") !== SECRET) return send(res, 401, { error: "unauthorized" });

  let raw = "";
  req.on("data", (c) => { raw += c; if (raw.length > 2_000_000) req.destroy(); });
  req.on("end", async () => {
    let payload;
    try { payload = JSON.parse(raw); } catch { return send(res, 400, { error: "invalid_body" }); }
    const { url, method = "GET", headers = {}, body = null } = payload || {};
    let target;
    try { target = new URL(url); } catch { return send(res, 400, { error: "invalid_url" }); }
    if (target.protocol !== "https:") return send(res, 400, { error: "https_only" });
    if (!ALLOW_HOSTS.has(target.hostname)) return send(res, 403, { error: "host_not_allowed", detail: target.hostname });

    try {
      const upstream = await fetch(url, {
        method,
        headers: { "User-Agent": DEFAULT_UA, ...headers },
        body: body != null && method !== "GET" && method !== "HEAD" ? body : undefined,
        redirect: "follow",
      });
      const text = await upstream.text();
      return send(res, 200, {
        status: upstream.status,
        content_type: upstream.headers.get("content-type") || "",
        body: text.slice(0, 1_500_000),
      });
    } catch (e) {
      return send(res, 502, { error: "relay_fetch_failed", detail: String(e && e.message ? e.message : e) });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Metaprofile relay слухає http://localhost:${PORT}  (дозволені хости: ${[...ALLOW_HOSTS].join(", ")})`);
  console.log("Зробіть його публічним: cloudflared tunnel --url http://localhost:" + PORT + "   або   ngrok http " + PORT);
});
