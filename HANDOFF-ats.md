# Хендоф — ATS Metaprofile (стан на 2026-07-06, вечір)

**Прод**: фронтенд https://metaprofile.pages.dev (Cloudflare Pages, авто з `main`, npm build; bun-локфайли видалені — не повертати). Вхід: /v2/auth → /ats/clients. Корінь `/` веде на V1-демо — свідомо, до переїзду на єдиний домен.
**Supabase**: `mnpcevhzqgcrllymdmil`. Хаб: `vpgdjffmcnkqgwqdrsyd` (деплой функцій — з відповідної папки!).
**Пастки середовища**: PowerShell `>` пише UTF-16 (типи генерувати через `cmd /c "... > ..."`); `&&` нема (використовувати `;`); пісочниця Claude віддає стейл-копії файлів — реальний стан через Read/host.

## Зроблено (все в main)
- Повний ATS: клієнти → проекти → вакансії (вкладки: Воронка/Бріф/Компетенції/Звіти) → kanban з DnD → кандидати (з бейджами вакансій) → комунікації (Resend, масові з batch/cancel) → резюме-парсинг (AI) → скоринг компетенцій 1–3 → AI-звіти (по кандидату + порівняльний, промти per-vacancy).
- Онбординг: /ats/users (запрошення+ролі: owner/recruiter/assistant/admin), картка користувача (редагування імені, відповідальні вакансії, гранти, повторне запрошення, скидання пароля), /ats/access (гранти клієнт/проект/вакансія, фін-гейт), призначення відповідального рекрутера.
- Auth: інвайти через Resend SMTP, форма встановлення пароля (invite/recovery), редіректи за ролями.
- Edge задеплоєні (8): admin-invite-user, grant-management, send-communication, parse-resume, log-application-event, generate-candidate-report, erase-candidate (+ старі). НЕ задеплоєні: schedule-interview, fetch-meet-transcript (чекають Google Workspace), ref-replicator (чекає фасад хаба), seed-vacancy-stages (не потрібна — прямий шлях).

## Перше завтра / чекає користувача
1. Прод-верифікація: чи виконані auth URL-и (Site URL/Redirect https://metaprofile.pages.dev/**) + `supabase secrets set APP_ORIGIN=https://metaprofile.pages.dev`; тест повторного запрошення на проді (потрібен деплой admin-invite-user + build/push останніх правок, якщо не зроблені ввечері).
2. **Лого агенції** → public/logo.png (для брендованого звіту).
3. **Google Workspace** за docs/google-workspace-setup.md → потім deploy schedule-interview + fetch-meet-transcript.
4. Тест AI-звіту на реальному кандидаті (транскрипти є в Drive користувача).

## Черга далі
- Заглушка Metaprofile у хабі → перехід на metaprofile.pages.dev (дрібне, у хабі).
- Брендований docx/pdf звіт (зараз HTML-друк «Версія для клієнта»).
- Telegram-відправка через бота; пресейл V1 demo-форма (падає на RLS demo_registrations).
- Хаб-фасад довідника (ADR-009 Рішення 7) + ref-replicator.
- Переїзд на власний домен (обхід блокувань *.pages.dev; єдиний домен із хабом — рішення власника).

## Хаб (паралельні хвости)
- 360 «мʼяке закриття»: код ГОТОВИЙ у робочій копії хаба, але НЕ задеплоєний (build+push+db push+deploy 2 функцій+cron — інструкція в чаті 06.07). Дедлайни 6 запусків продовжені до 2026-07-13 SQL-ом.
- 360 кампанія: Людмилі лишилась самооцінка; Марині — всі 6 її анкет (переплутані відповіді перенесені SQL-хірургією 06.07). Після завершення — фінальна перевірка і закриття.
- Ідея з інциденту: у 360-анкеті показувати імʼя оцінювача + «це не я»; валідація «1 керівник/1 self».
- C2C: закритий повністю; опційно «Канва/Дерево».
