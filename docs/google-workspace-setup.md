# Налаштування інтеграції з Google Workspace (Calendar + Meet-транскрипти)

Ця інструкція — для адміністратора Google Workspace організації, яка
використовує Metaprofile ATS. Мета: дозволити системі (1) створювати
Google Calendar-події з Meet-лінком від імені співробітників агенції та
(2) підтягувати вже готові Google Doc-транскрипти зустрічей Google Meet.

**Обмеження, яке важливо розуміти одразу**: система НЕ робить
аудіо-транскрибацію (speech-to-text). Вона лише читає документ-транскрипт,
який сам Google Meet автоматично створює у Google Docs (функція
"Transcripts"), якщо ця функція увімкнена для зустрічі. Якщо запис
транскрипта не був увімкнений під час зустрічі — документа не існує, і
підтягнути в систему нічого. Розпізнавання мовлення "з нуля" (з відео/аудіо)
— окремий, ще не реалізований етап.

Модель авторизації: **сервісний акаунт Google (Service Account) +
Domain-wide Delegation**. Це одноразове рішення власника організації — не
кожен користувач окремо авторизує застосунок через OAuth-consent, а
адміністратор Workspace один раз дозволяє сервісному акаунту діяти "від
імені" будь-якого користувача домену для конкретних API-scopes.

---

## Крок 1. Google Cloud Console — новий проєкт

1. Відкрийте [Google Cloud Console](https://console.cloud.google.com/).
2. Створіть новий проєкт (або оберіть існуючий, якщо агенція вже має
   виділений проєкт для внутрішніх інтеграцій): **Select a project → New
   Project** → назвіть, наприклад, `metaprofile-ats-integration`.

## Крок 2. Увімкнути потрібні API

У меню **APIs & Services → Library** увімкніть три API (для кожного:
знайти в пошуку → Enable):

- **Google Calendar API** — створення подій із Meet-посиланням.
- **Google Docs API** — читання вмісту документа-транскрипта.
- **Google Drive API** — потрібен опційно, як допоміжний scope
  (`drive.readonly`) для читання документів, розшарених через Drive-посилання;
  сам виклик системи йде через Docs API, але делегація scope drive.readonly
  підвищує надійність доступу до документів поза "домашнім" Drive викликача.

## Крок 3. Створити Service Account

1. **APIs & Services → Credentials → Create Credentials → Service Account**.
2. Назва, наприклад: `metaprofile-ats-google-integration`.
3. Роль на рівні проєкту — не обов'язкова (сервісний акаунт не звертається
   до ресурсів самого GCP-проєкту, лише діє через delegation до Workspace
   API), можна залишити без ролі або дати мінімальну (`Viewer`).
4. Завершіть створення.

## Крок 4. Створити JSON-ключ сервісного акаунта

1. Відкрийте щойно створений сервісний акаунт → вкладка **Keys**.
2. **Add Key → Create new key → JSON** → завантажиться `.json`-файл.
3. **Збережіть цей файл у надійному місці й не комітьте в git.** Він
   містить `private_key` — секрет, еквівалентний паролю.
4. З цього файлу знадобляться два поля:
   - `client_email` → стане `GOOGLE_SA_EMAIL`;
   - `private_key` → стане `GOOGLE_SA_PRIVATE_KEY`.
5. Також запишіть **Client ID** сервісного акаунта (числовий ID, поле
   `client_id` у тому ж JSON, або на сторінці Service Account в консолі) —
   він знадобиться на наступному кроці.

## Крок 5. Google Workspace Admin — Domain-wide Delegation

1. Увійдіть в [admin.google.com](https://admin.google.com) під обліковим
   записом Super Admin організації.
2. **Security → Access and data control → API Controls**.
3. Розділ **Domain-wide Delegation** → **Add new**.
4. Заповніть:
   - **Client ID**: числовий Client ID сервісного акаунта (крок 4.5).
   - **OAuth Scopes** (через кому, без пробілів між комами не обов'язково,
     Google приймає з пробілами теж):
     ```
     https://www.googleapis.com/auth/calendar.events,
     https://www.googleapis.com/auth/documents.readonly,
     https://www.googleapis.com/auth/drive.readonly
     ```
5. **Authorize**.

> Без цього кроку сервісний акаунт зможе отримати access token, але Google
> поверне `401`/`403` на будь-який виклик Calendar/Docs API з
> impersonation — у логах Edge Function це відображається як
> `google_error` з підказкою "перевірте domain-wide delegation".

## Крок 6. Передати секрети в Supabase

Значення `GOOGLE_SA_PRIVATE_KEY` — багаторядковий PEM. Найнадійніший спосіб
у PowerShell — **не** передавати його прямим аргументом команди (там легко
зламати переноси рядків при копіюванні), а через `.env`-файл і прапорець
`--env-file`.

1. Створіть локальний файл, наприклад `supabase/.secrets.env` (додайте його
   в `.gitignore`, якщо ще не додано — секрети НЕ комітяться):

   ```
   GOOGLE_SA_EMAIL=metaprofile-ats-google-integration@your-project.iam.gserviceaccount.com
   GOOGLE_SA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgk...\n-----END PRIVATE KEY-----\n"
   ```

   Ключове: у файлі `private_key` записується **в один рядок**, з
   буквальними символами `\n` замість реальних переносів рядків (саме так
   Google віддає це поле у вихідному JSON-ключі — можна скопіювати значення
   поля `private_key` з `.json`-файлу як є, без ручного редагування
   переносів). Код `_shared/google-auth.ts` сам конвертує `\n` → реальний
   перевід рядка перед імпортом ключа.

2. Застосуйте секрети:

   ```powershell
   supabase secrets set --env-file supabase/.secrets.env
   ```

3. Перевірте, що секрети встановлено:

   ```powershell
   supabase secrets list
   ```

   (значення не показуються, лише імена — це очікувано).

4. Видаліть/убезпечте локальний `.secrets.env` після використання (не
   лишайте секрети на диску розробника довше, ніж потрібно).

## Крок 7. Деплой Edge Functions

```powershell
supabase functions deploy schedule-interview
supabase functions deploy fetch-meet-transcript
```

Обидві функції очікують `verify_jwt = true` (вже прописано в
`supabase/config.toml`) — виклики йдуть із звичайним користувацьким JWT
сесії, роль/scope перевіряються всередині функції через
`mp_can_access_application`.

## Крок 8. Застосувати міграцію БД

Якщо ще не застосована:

```powershell
supabase db push
```

Міграція `20260707090000_ats_google_calendar.sql` додає до `interviews`
колонки `duration_minutes`, `calendar_event_id`, `meet_link`,
`organizer_email`, `transcript`, `transcript_doc_id`,
`transcript_fetched_at` (лише `ADD COLUMN IF NOT EXISTS` — існуючий RLS на
`interviews` не змінюється).

---

## Як увімкнути транскрипти в Meet

Функція підтягування транскрипта (`fetch-meet-transcript`) працює лише
тоді, коли Google Meet сам створив документ-транскрипт під час зустрічі.
Щоб це відбувалося:

1. **Доступність залежить від тарифу Google Workspace.** Функція
   "Transcripts" (запис розшифровки зустрічі в Google Docs) доступна на
   тарифах Workspace Business Standard/Plus, Enterprise Standard/Plus,
   Education Plus та деяких інших — перевірте актуальний перелік у
   [довідці Google Workspace](https://support.google.com/a/answer/) для
   вашого тарифу. На базових/безкоштовних тарифах ця функція недоступна
   взагалі, і жодні налаштування нижче не допоможуть.
2. Якщо тариф підтримує — увімкнути можна на двох рівнях:
   - **Рівень організації** (Admin Console): **Apps → Google Workspace →
     Google Meet → Meet video settings → Recording and meeting artifacts**
     (назва розділу може відрізнятись залежно від версії консолі) —
     переконайтесь, що **Transcription** дозволена для потрібних
     організаційних підрозділів.
   - **Рівень зустрічі** (для організатора): під час дзвінка в Google Meet
     → **Activities → Transcripts (Розшифровки)** → **Start transcript**.
     Учасники отримають сповіщення, що ведеться запис розшифровки.
3. Після завершення зустрічі транскрипт зʼявляється як Google Doc у папці
   **Meet Recordings** на Google Drive організатора (або спільному диску,
   якщо так налаштовано політикою організації), і посилання на нього також
   надсилається організатору електронною поштою.
4. Скопіюйте URL цього документа (`https://docs.google.com/document/d/...`)
   і вставте в поле «Google Doc транскрипта (URL)» у Metaprofile ATS
   (вкладка «Звіти» вакансії) → «Підтягнути».

**Важливо**: якщо у викликача (користувача Metaprofile, який натискає
«Підтягнути») немає доступу перегляду до цього конкретного Google-документа
у своєму Workspace-акаунті, Docs API поверне `403`, і в системі це
відобразиться як помилка `google_error`. Переконайтесь, що документ
розшарено на потрібних співробітників агенції (або що вони належать до
організаційного підрозділу, який Meet автоматично додає до транскрипта).
