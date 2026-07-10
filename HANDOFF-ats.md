# Хендоф — ATS Metaprofile (стан на 2026-07-10)

## Сесія 10.07 — Requisition + approval flow + Long/Short list стани (MVP+)

Реалізовано наступні два пункти roadmap (docs/roadmap-ATS-platform.md, розділ 2 «MVP+»).
Рішення власника по розвилках: **обидва рівні** requisition (проект + вакансія);
затверджує **owner/admin АБО відповідальний**; Long/Short list — **окрема вкладка «Списки»**.

### ⚠️ ПЕРШЕ ЗАВТРА (обовʼязково перед push)
1. **Build/lint/typecheck НЕ прогнані в цій сесії** — пісочниця віддавала пошкоджені
   (обрізані) копії навіть незмінених файлів (`use-competencies.ts` тощо) + індекс git
   у пісочниці був corrupt. Реальні файли на хості коректні (перевірено через Read).
   Перед комітом локально прогнати:
   ```
   npm run lint && npx tsc -p tsconfig.app.json --noEmit && npm run build
   ```
2. **Застосувати 2 нові міграції** (порядок критичний — enum окремо перший):
   ```
   supabase db push        # або migration up
   ```
   - `20260710090000_ats_requisition_lists_enum.sql` — `application_event_type += 'list_state_changed'`
     (ALTER TYPE ADD VALUE не можна в одній tx з використанням — тому окремо).
   - `20260710090100_ats_requisition_lists.sql` — enum `requisition_approval_status`/`list_state`,
     approval-колонки на hiring_projects+vacancies, `applications.list_state`+listed_at/by,
     guard-тригери (авторизація рішення + гейт open/active + both-level ієрархія),
     аудит-тригер list_state, **BACKFILL** існуючих не-draft рядків у `approved`.
3. **Перегенерувати типи БД** після застосування міграцій (я пропатчив `types.ts` вручну
   під нові колонки/enum, але краще звірити авто-генерацією):
   ```
   cmd /c "supabase gen types typescript --project-id mnpcevhzqgcrllymdmil > src/integrations/supabase/types.ts"
   ```
   (PowerShell `>` пише UTF-16 — тільки через `cmd /c`, як і раніше.)

### Що зроблено (файли)
- Міграції: 2 нові (див. вище).
- `types.ts`: додано колонки на applications/vacancies/hiring_projects, enum
  `requisition_approval_status`/`list_state`, подію `list_state_changed`.
- Хуки: `use-vacancies.ts` (`useSetVacancyApproval`, тип у VacancyWithProject +
  `hiring_project.approval_status` у select), `use-hiring-projects.ts`
  (`useSetProjectApproval`), `use-applications.ts` (`useSetListState`, тип `ListState`),
  `use-comparison.ts` (`listState` у колонці матриці).
- UI: `components/ats/RequisitionPanel.tsx` (submit/approve/changes/reject з нотаткою,
  спільний для проекту й вакансії), `components/ats/ListsTab.tsx` (3 колонки
  У воронці/Long/Short + promote/demote), вкладка «Списки» + панель requisition над
  табами у `VacancyDetailPage.tsx`, панель requisition у `ProjectDetailPage.tsx`,
  бейдж+швидкий promote list_state на картках воронки, «→ Short list» у матриці порівняння.

### Бізнес-правила (у guard-тригерах, не лише UI)
- Рішення (approve/changes_requested/rejected): вакансія — owner/admin або
  assigned_recruiter/hiring_manager/creator; проект — owner/admin або creator.
  Інакше 42501. UI ховає кнопки, але фінальний гейт — БД.
- `vacancy.status→open` лише коли **і вакансія, і проект-батько** approved.
- `hiring_project.status→active` лише коли проект approved.
- Submit (draft→pending_approval) — будь-який редактор scope (RLS mp_can_edit_*).
- Сервер сам проставляє submitted_at/requested_by/approved_by/approved_at (клієнт
  шле лише approval_status + note).
- list_state ортогональний до стадії воронки; зміна пише подію `list_state_changed`
  (metadata {from,to}) в append-only журнал.

### Тест наскрізь (після міграцій)
1. Проект у draft → «Подати на затвердження» → owner «Затвердити» → активувати проект.
2. Вакансія: спроба open до approve → помилка гейта; після approve вакансії+проекту → open.
3. Кандидати: воронка → «→ Long list» / «→ Short list»; вкладка «Списки» — переміщення;
   матриця порівняння «→ Short list»; перевірити подію в стрічці кандидата.

---

# Хендоф — ATS Metaprofile (стан на 2026-07-07, вечір)

## ⚠️ ПЕРШЕ ЗАВТРА: закоммітити останній фікс (лежить локально, НЕ в git)
```
cd C:\Projects\metaprofile
git add -A
git commit -m "fix(ats): заявка на першу стадію + auth Google-функцій + лого"
git push origin main
```
Файли поза git: `public/logo.png` (лого MetaVision), фікс `src/hooks/ats/use-applications.ts`
(нова заявка → перша стадія), фікс `supabase/functions/{schedule-interview,fetch-meet-transcript}`
(RPC-перевірки під JWT-клієнтом, не service_role), `supabase/.secrets.env.example`, `.gitignore`.
Google-функції ВЖЕ передеплоєні (supabase functions deploy) — лишилось лише git push фронтенду.

## Сесія 07.07 — що зроблено
- **Google Workspace ЖИВИЙ**: service account + Domain-wide Delegation налаштовані;
  `schedule-interview` (зустріч у Calendar з Meet-лінком — ПЕРЕВІРЕНО, подія створюється)
  і `fetch-meet-transcript` задеплоєні. Секрети GOOGLE_SA_EMAIL/GOOGLE_SA_PRIVATE_KEY встановлені.
  Обмеження: транскрибації аудіо НЕМАЄ — лише читання готового Google-Doc транскрипта Meet.
- Фікс: 2 Google-функції відхиляли все як forbidden (RPC під service_role, auth.uid()=NULL) → JWT-клієнт.
- Фікс: нові заявки мали current_stage_id=null і не показувались на kanban → тепер на першу стадію.
- Лого MetaVision → public/logo.png (брендований звіт «Версія для клієнта»).
- APP_ORIGIN=https://metaprofile.pages.dev виставлено; auth Site URL/Redirect — на прод.

## Чекає користувача (не код)
1. Git push останнього фіксу (див. вгорі).
2. Тест транскрипта: провести Meet із увімкненим Transcript → URL Google-Doc → вкладка «Звіти» → «Підтягнути».
3. Тест AI-звіту на реальному кандидаті (промт+компетенції+транскрипт → генерація).

---
# (попередній хендоф 2026-07-06)

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
