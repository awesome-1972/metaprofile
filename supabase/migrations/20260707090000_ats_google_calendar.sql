-- 20260707090000_ats_google_calendar.sql
--
-- Metaprofile ATS — Google Workspace інтеграція (Calendar + Meet transcript).
--
-- Контекст: interviews вже існує (20260704090200_ats_core_tables.sql) з
-- колонками id, application_id, interviewer_id, interview_type, scheduled_at,
-- completed_at, outcome, rating, notes, created_by, created_at, updated_at.
-- scheduled_at ВЖЕ Є — цю колонку НЕ додаємо повторно.
--
-- Ця міграція лише РОЗШИРЮЄ interviews колонками, яких бракує для:
--   (1) призначення інтервʼю з Google Meet-лінком з системи (Edge
--       `schedule-interview`, Calendar API v3);
--   (2) підтягування готового транскрипта Google Meet (Google Doc, який Meet
--       створює функцією Transcripts) у систему (Edge `fetch-meet-transcript`,
--       Docs API v1). БЕЗ speech-to-text — лише читання вже готового
--       документа-транскрипта; аудіо-транскрибація — окремий, ще не
--       реалізований етап.
--
-- RLS на interviews УЖЕ увімкнено і має політики interviews_select/insert/
-- update/delete (20260704090500_ats_rls_policies.sql) — ця міграція їх НЕ
-- чіпає, лише ALTER TABLE ADD COLUMN IF NOT EXISTS (нові колонки автоматично
-- підпадають під ті самі row-level політики, бо це той самий рядок).
--
-- ============================================================

-- duration_minutes — тривалість запланованої зустрічі (хвилини), дефолт 60.
alter table public.interviews
  add column if not exists duration_minutes integer not null default 60
    check (duration_minutes > 0 and duration_minutes <= 480);

-- calendar_event_id — ID події в Google Calendar організатора (events.insert
-- response.id), потрібен для майбутнього оновлення/скасування події.
alter table public.interviews
  add column if not exists calendar_event_id text;

-- meet_link — hangoutLink / conferenceData.entryPoints[].uri з відповіді
-- Calendar API (conferenceDataVersion=1, conferenceData.createRequest).
alter table public.interviews
  add column if not exists meet_link text;

-- organizer_email — email користувача-організатора (impersonation subject),
-- з auth.users викликача на момент schedule-interview; денормалізовано для
-- відображення в UI без додаткового join на auth.users.
alter table public.interviews
  add column if not exists organizer_email text;

-- transcript — plain-text, зібраний із body.content Google Docs API
-- (документ Transcripts, який Meet автоматично створює в Drive організатора/
-- Workspace-акаунта, за умови увімкнених Host controls → Meeting records).
-- Обмеження: лише ГОТОВИЙ транскрипт-документ; жодного speech-to-text тут
-- немає і не планується цією функцією.
alter table public.interviews
  add column if not exists transcript text;

-- transcript_doc_id — Google Docs document ID, з якого востаннє підтягнуто
-- transcript (для повторного fetch/аудиту джерела).
alter table public.interviews
  add column if not exists transcript_doc_id text;

-- transcript_fetched_at — коли транскрипт востаннє успішно підтягнуто.
alter table public.interviews
  add column if not exists transcript_fetched_at timestamptz;

-- Обмеження розміру транскрипта (узгоджено з лімітом 300k символів у
-- fetch-meet-transcript Edge Function) — захист від аномально великих
-- документів/помилкового парсингу.
alter table public.interviews
  drop constraint if exists interviews_transcript_length_check;
alter table public.interviews
  add constraint interviews_transcript_length_check
    check (transcript is null or char_length(transcript) <= 300000);

-- Індекс для пошуку майбутніх запланованих зустрічей по заявці (використовує
-- УЖЕ ІСНУЮЧУ scheduled_at) — прискорює бейдж "найближча зустріч" на
-- kanban-картці (запит: application_id = ? and scheduled_at > now()).
create index if not exists idx_interviews_application_scheduled
  on public.interviews (application_id, scheduled_at);
