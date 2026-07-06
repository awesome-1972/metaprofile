# Хендоф — ATS Metaprofile (стан на 2026-07-05)

**Репо**: github.com/awesome-1972/metaprofile · гілка `main` · локально `npm run dev` → :8080
**Supabase (прод)**: `mnpcevhzqgcrllymdmil` («MetaProfile Project»; старий Lovable-проєкт `qzmjeftxpaseobkexekg` недоступний, не використовувати). CLI: `supabase link --project-ref mnpcevhzqgcrllymdmil`; при глюку login-ролі — `$env:SUPABASE_DB_PASSWORD`.
**Ключі**: нові формати `sb_publishable_...` у `.env` (поза git). Типи: `cmd /c "supabase gen types typescript --project-id mnpcevhzqgcrllymdmil > src\integrations\supabase\types.ts"` (не `>` у PowerShell — дасть UTF-16!).

## Що ПРАЦЮЄ (все локально, задеплоєна лише БД)
- Схема ATS: 22 таблиці (міграції `20260704*` + `20260705100000`), RLS повністю, seed.
- `/ats/*` (ролі admin/owner/recruiter): клієнти → проекти → вакансії → kanban з drag-and-drop → кандидати. Вкладки вакансії: Воронка / Бріф (68 дослівних питань, фінансові окремо під гейтом) / Компетенції (матриця з вагами) / Звіти (промти per-vacancy + генерація).
- Скоринг компетенцій 1–3 у діалозі заявки, зважені бали, пороги 2.34/1.67.
- Стадії воронки сіються з шаблону НАПРЯМУ під RLS (`seedVacancyStagesDirect`) — Edge не потрібна.
- Користувач: v.poddubny@metavision.ua (admin через user_roles).

## НЕ задеплоєно (свідомо — «все локально, потім деплой»)
- 6 Edge Functions (написані): grant-management, ref-replicator, log-application-event, erase-candidate, seed-vacancy-stages, generate-candidate-report.
- Фронтенд ніде не хоститься (нема Cloudflare Pages проєкту).
- Для тесту AI-звітів мінімум: `supabase secrets set ANTHROPIC_API_KEY=...` + `supabase functions deploy generate-candidate-report`.

## Наступні кроки (узгоджено)
1. Деплой AI-функції + тест генерації звіту (по кандидату + порівняльний).
2. M4b: резюме-парсинг (AI), комунікації з кандидатом (email/месенджери/SMS), Google Calendar, транскрибація з запису Google Meet.
3. Vacancy-scope доступи: «виділений рекрутер» + роль «Асистент» (вимога 3; аналіз варіантів у docs/requirements/ats-agency-features.md хаба).
4. Брендований файл звіту (лого) замість markdown.
5. Фінальний деплой: Cloudflare Pages (субдомен) + всі Edge + секрети; заглушка Metaprofile у хабі → крос-лінк.

## Документи (в репо ХАБА studio-performance-hub)
- ADR-010 (Accepted) — архітектура, агенційна модель.
- docs/specs/metaprofile-ats-schema.md v2 (після security-аудиту, вердикт закрито).
- docs/security/review-metaprofile-ats.md.
- docs/requirements/ats-agency-features.md v2 — 8 вимог, Додатки A–C (артефакти Drive: матриця/промт/звіти; «Асистент»; бріф-форма).
- docs/research/qwaybe-ideas.md — ідеї для survey/360 хаба.

## C2C (хаб) — на паузі, стан
Скоуп хендофа закритий повністю: Етап 2 (файли docx/xlsx/pdf у браузері, PII-псевдонімізація, verify-стадія з evidence) + стилі (легенда, MiniMap, skeleton) — усе на проді. Відкрите: опційний режим «Канва/Дерево»; поза-C2C — валідація 360 «1 керівник/1 self».

## Застереження середовища (успадковані)
- Пісочниця інколи віддає усічені копії щойно змінених файлів → хибні «end of file»; реальний стан — через Read/host або build.
- EOL-шум LF↔CRLF — нешкідливий. PowerShell 5.1 не знає `&&` (використовувати `;`).
