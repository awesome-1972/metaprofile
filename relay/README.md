# Metaprofile Relay

Маленький захищений посередник для обходу Cloudflare-блоку серверного IP Supabase.
Edge-функції (robota-connector, jooble-market) можуть ходити в зовнішні API **через цей релей**,
який ти запускаєш на машині зі «звичайним» (не хмарним) IP — офісний ПК зі статичним IP.

## 1. Запуск релея

Потрібен Node.js 18+.

```powershell
# у папці проєкту
$env:RELAY_SECRET="ПРИДУМАЙ_ДОВГИЙ_СЕКРЕТ"
node relay/server.mjs
```

Побачиш: `Metaprofile relay слухає http://localhost:8787`.

## 2. Зробити релей доступним з інтернету

Edge-функція має дістатися до релея, тож потрібен публічний URL. Найпростіше — тунель
(без відкриття портів на роутері):

```powershell
# Варіант А — Cloudflare Tunnel (безкоштовно)
cloudflared tunnel --url http://localhost:8787

# Варіант Б — ngrok
ngrok http 8787
```

Тунель видасть публічний URL, напр. `https://abc-123.trycloudflare.com`. Це і є `RELAY_URL`.

## 3. Підключити релей до Supabase

```powershell
cd C:\Projects\metaprofile
npx supabase secrets set RELAY_URL=https://твій-тунель.trycloudflare.com
npx supabase secrets set RELAY_SECRET=ТОЙ_САМИЙ_СЕКРЕТ_ЩО_В_КРОЦІ_1
npx supabase functions deploy jooble-market
npx supabase functions deploy robota-connector
```

Готово. Тепер запити robota/jooble йдуть через твій релей. Якщо `RELAY_URL`/`RELAY_SECRET`
не задані — Edge ходить напряму (як раніше).

## Перевірка

- `GET https://твій-тунель/health` → `{ "ok": true }`.
- У застосунку: «Ринок вакансій (Jooble)» → «Показати ринок». Якщо релей на не-хмарному IP —
  Cloudflare пропустить, і з'являться вакансії.

## Застереження

- **robota.ua** challeng-ить навіть не-браузерні запити з residential IP — релей може НЕ пробити
  (тоді потрібен whitelist від robota або справжній браузер). **Jooble** блокує радше по IP —
  через релей на офісному IP має спрацювати.
- Тримай релей увімкненим (машина має працювати). Для стабільності можна тримати його на
  VPS — але хмарний IP може так само ловити Cloudflare-челендж; надійніше — офісний/статичний IP.
- Секрет `RELAY_SECRET` — довгий і таємний; релей приймає лише запити з ним і лише на дозволені
  хости (див. `ALLOW_HOSTS` у `server.mjs`).
