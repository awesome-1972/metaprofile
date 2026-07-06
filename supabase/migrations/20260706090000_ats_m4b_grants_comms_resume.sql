-- ============================================================
-- Metaprofile ATS — фаза M4b: vacancy-scope гранти, роль «Асистент»,
-- комунікації з кандидатами (Resend + масова розсилка), резюме + месенджери.
-- Спец.: docs/requirements/ats-agency-features.md
--   • Вимога 3 (Epic B) — гібрид V3: client/hiring_project-гранти (без змін)
--     + новий scope_type='vacancy' + vacancies.assigned_recruiter_id (UI-денорм).
--     Додаток B: третя роль — «Асистент» (не «адміністратор»), доступ як у
--     виділеного рекрутера — до своїх вакансій.
--   • Epic F (US-F01/US-F02) — рішення власника: Resend email-провайдер,
--     масова відправка (batch_id) з можливістю скасування до фактичної
--     відправки.
--   • Epic C (US-C01/US-C02) — резюме: ручний ввід (вже покрито) + парсинг
--     (нові колонки на ats_candidates: файл, витягнутий текст, структуроване
--     AI-поле) + месенджери кандидата (jsonb, довільні канали контакту).
--
-- Порядок: ПІСЛЯ 20260706085900_ats_m4b_enum.sql (нові значення enum
-- 'vacancy'/'assistant' мають бути видимі в цій транзакції).
-- Стиль — дзеркалить 20260704*/20260705100000: security definer + stable +
-- search_path=public helper-функції, update_updated_at_column() тригер,
-- RLS default DENY, індекси під усі FK і гарячі RLS-предикати.
-- ============================================================

-- ================================================================
-- 1. VACANCY-SCOPE ДОСТУП (вимога 3, гібрид V3)
-- ================================================================

-- ------------------------------------------------------------
-- 1.1 mp_is_internal() — додаємо 'assistant' до переліку внутрішніх ролей.
-- ------------------------------------------------------------
-- Асистент — внутрішній автентифікований користувач воркспейсу (як recruiter),
-- але БЕЗ жодного bypass: фактичний доступ — виключно через access_grants
-- (client/hiring_project/vacancy), так само як у recruiter. mp_is_internal()
-- використовується лише для read-гейтів довідників (ref_*, candidate_sources,
-- pipeline_stage_templates тощо), не для scope-доступу до даних.
create or replace function public.mp_is_internal()
returns boolean language sql stable security definer
set search_path = public as $$
  select public.has_role(auth.uid(), 'owner')
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'recruiter')
      or public.has_role(auth.uid(), 'assistant')
$$;

-- ------------------------------------------------------------
-- 1.2 vacancies.assigned_recruiter_id — денормалізоване поле для UI/фільтрів.
-- ------------------------------------------------------------
-- ВАЖЛИВО: це ЛИШЕ зручність для списків/фільтрів («мої вакансії»,
-- «вакансії без відповідального») — САМ ПО СОБІ це поле НЕ надає доступу.
-- Фактичний доступ «виділеного рекрутера»/«Асистента» до вакансії йде
-- ВИКЛЮЧНО через access_grants (scope_type='vacancy', scope_id=vacancy.id) —
-- див. mp_can_access_vacancy/mp_can_edit_vacancy нижче. При призначенні
-- відповідального фронт (або Edge Function grant-management) МАЄ атомарно
-- (1) виставити vacancies.assigned_recruiter_id і (2) створити/активувати
-- відповідний vacancy-грант користувачу — інакше поле стане лише візуальним
-- ярликом без реального доступу (не аварійна ситуація, але split-brain UX).
alter table public.vacancies
  add column assigned_recruiter_id uuid references auth.users(id) on delete set null;

create index idx_vacancies_assigned_recruiter on public.vacancies (assigned_recruiter_id);

-- ------------------------------------------------------------
-- 1.3 mp_can_access_vacancy / mp_can_edit_vacancy — third scope_type='vacancy'.
-- ------------------------------------------------------------
-- Повний новий текст (create or replace), search_path/security definer/stable
-- збережено з 20260704090300_ats_scope_helper_functions.sql. Додано третю
-- гілку EXISTS: прямий грант на саму вакансію (не через проект/клієнта).
create or replace function public.mp_can_access_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.vacancies v
        where v.id = p_vacancy_id
          and public.mp_can_access_project(v.hiring_project_id)
      )
      or exists (
        select 1 from public.access_grants g
        where g.user_id = auth.uid()
          and g.is_active
          and g.scope_type = 'vacancy'
          and g.scope_id = p_vacancy_id
      )
$$;

create or replace function public.mp_can_edit_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1
        from public.vacancies v
        join public.hiring_projects hp on hp.id = v.hiring_project_id
        join public.access_grants   g  on g.user_id = auth.uid() and g.is_active and g.can_edit
        where v.id = p_vacancy_id
          and (
            (g.scope_type = 'hiring_project' and g.scope_id = hp.id)
            or
            (g.scope_type = 'client'         and g.scope_id = hp.client_id)
          )
      )
      or exists (
        select 1 from public.access_grants g
        where g.user_id = auth.uid()
          and g.is_active
          and g.can_edit
          and g.scope_type = 'vacancy'
          and g.scope_id = p_vacancy_id
      )
$$;

-- TODO(open-question): US-B02 технічна примітка ATS-вимог — чи vacancy-грант
-- «за замовчуванням» дає can_edit, чи потрібен окремий прапорець? Ця міграція
-- НЕ вводить дефолт — access_grants.can_edit лишається явним булевим полем,
-- як і для client/hiring_project-грантів (узгоджено з існуючою моделлю:
-- «виділений» = READ за замовчуванням, EDIT — окремий грант-прапорець
-- can_edit=true на тому ж vacancy-грант-рядку). can_view_financials для
-- vacancy-scope грантів НЕ додається в mp_can_view_vacancy_financials у цій
-- міграції (Fin-4 залишається виключно client/hiring_project-рівня) —
-- узгоджено з US-B02 сценарієм 3 («виділений рекрутер не бачить фінанси
-- автоматично»). Якщо власник підтвердить, що vacancy-грант має також
-- нести can_view_financials — окрема наступна міграція розширить
-- mp_can_view_vacancy_financials третьою гілкою.

-- ================================================================
-- 2. КОМУНІКАЦІЇ З КАНДИДАТАМИ (Epic F, Resend + масова розсилка)
-- ================================================================

create type public.comm_channel   as enum
  ('email','telegram','viber','whatsapp','linkedin','facebook','phone','other');
create type public.comm_status    as enum
  ('draft','queued','sent','failed','cancelled');
create type public.comm_direction as enum ('out','in');

create table public.candidate_communications (
  id             uuid primary key default gen_random_uuid(),
  candidate_id   uuid not null references public.ats_candidates(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  -- Денормалізовано для RLS (уникнути join через applications у SELECT-політиці
  -- коли комунікація не привʼязана до конкретної заявки, лише до вакансії
  -- напряму — напр. масова розсилка по відгукнувшихся на вакансію).
  vacancy_id     uuid references public.vacancies(id) on delete set null,
  channel        public.comm_channel   not null,
  direction      public.comm_direction not null default 'out',
  subject        text,
  body           text not null,
  status         public.comm_status not null default 'draft',
  -- Масова розсилка: усі листи одного батчу поділяють batch_id (генерується
  -- Edge Function send-candidate-email на старті розсилки), що дозволяє
  -- групове скасування ще не надісланих листів batch'а одним UPDATE.
  batch_id       uuid,
  scheduled_at   timestamptz,
  sent_at        timestamptz,
  error          text,
  -- id листа в Resend (для webhook-статусів доставки/відкриття в майбутньому).
  external_id    text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_candidate_communications_candidate on public.candidate_communications (candidate_id);
create index idx_candidate_communications_vacancy    on public.candidate_communications (vacancy_id);
create index idx_candidate_communications_application on public.candidate_communications (application_id);
create index idx_candidate_communications_batch       on public.candidate_communications (batch_id);
create index idx_candidate_communications_queued
  on public.candidate_communications (status)
  where status = 'queued';

create trigger set_updated_at_candidate_communications
  before update on public.candidate_communications
  for each row execute function public.update_updated_at_column();

alter table public.candidate_communications enable row level security;

-- ------------------------------------------------------------
-- 2.1 Guard-тригер: скасування лише з draft/queued; повний lock після sent.
-- ------------------------------------------------------------
-- SEC-подібне правило (за аналогією mp_applications_immutable_scope):
--   • status -> 'cancelled' дозволено ЛИШЕ якщо OLD.status IN ('draft','queued').
--   • БУДЬ-ЯКИЙ UPDATE рядка зі status='sent' заборонено (immutable-after-send) —
--     запис про фактично надісланий лист — фактичний журнал, не редагується.
--     Виняток: службові поля, що фіксує сам провайдер асинхронно (external_id,
--     error) до моменту status='sent' — вже покрито тим, що це умова саме на
--     OLD.status='sent', а не на сам перехід у 'sent'.
create or replace function public.mp_comm_immutable_after_send()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if old.status = 'sent' then
    raise exception 'candidate_communications %: no updates allowed after status=sent (immutable log)', old.id
      using errcode = '42501';  -- insufficient_privilege
  end if;

  if new.status = 'cancelled' and old.status not in ('draft','queued') then
    raise exception 'candidate_communications %: cancel only allowed from draft/queued (current: %)', old.id, old.status
      using errcode = '42501';  -- insufficient_privilege
  end if;

  return new;
end;
$$;

create trigger trg_comm_immutable_after_send
  before update on public.candidate_communications
  for each row execute function public.mp_comm_immutable_after_send();

-- ------------------------------------------------------------
-- 2.2 RLS
-- ------------------------------------------------------------
-- SELECT: доступ до кандидата (mp_can_access_candidate — покриває created_by
-- і будь-яку заявку кандидата в доступній вакансії) АБО — коли комунікація
-- привʼязана напряму до вакансії (vacancy_id заповнено, напр. масова
-- розсилка ще без applications-звʼязку) — доступ до цієї вакансії.
create policy candidate_communications_select on public.candidate_communications
  for select to authenticated
  using (
    public.mp_can_access_candidate(candidate_id)
    or (vacancy_id is not null and public.mp_can_access_vacancy(vacancy_id))
  );

-- INSERT/UPDATE: той самий edit-хелпер, що й для картки кандидата
-- (mp_can_edit_candidate — created_by АБО can_edit на вакансію через
-- applications), розширено умовою прямого vacancy_id (масова розсилка).
create policy candidate_communications_insert on public.candidate_communications
  for insert to authenticated
  with check (
    public.mp_can_edit_candidate(candidate_id)
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  );

create policy candidate_communications_update on public.candidate_communications
  for update to authenticated
  using (
    public.mp_can_edit_candidate(candidate_id)
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  )
  with check (
    public.mp_can_edit_candidate(candidate_id)
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  );

-- DELETE: немає клієнтської delete-політики (append-only-подібний журнал,
-- аналогічно application_events) — скасування виконується через
-- status='cancelled' (UPDATE), не DELETE. owner/admin можуть видаляти лише
-- за потреби прямим service_role доступом (bypass RLS), без клієнтської дірки.

-- ================================================================
-- 3. РЕЗЮМЕ + МЕСЕНДЖЕРИ КАНДИДАТА (Epic C)
-- ================================================================

-- messengers: ключі telegram/viber/whatsapp/linkedin/facebook → рядок
-- контакту (username/номер/URL — довільний формат за каналом, валідація на
-- рівні UI/Edge, не БД-constraint, як і candidates.email/phone сьогодні).
-- resume_file_name / resume_text / resume_parsed / resume_uploaded_at —
-- MVP-рамки: ОДИН файл резюме на кандидата (без версійності — Q8 ATS-вимог
-- ще відкрите; якщо власник підтвердить потребу історії версій, знадобиться
-- окрема таблиця candidate_resumes, не ця колонка). Сам бінарний файл — у
-- Supabase Storage (bucket поза цією SQL-міграцією), ця колонка зберігає
-- лише оригінальну назву файлу для UI; шлях/URL у Storage конструюється
-- детерміновано з candidate_id (Edge Function parse-resume), тому окрема
-- колонка resume_file_path НЕ додається навмисно (уникнення дублювання
-- джерела істини шляху).
alter table public.ats_candidates
  add column messengers        jsonb not null default '{}'::jsonb,
  add column resume_file_name  text,
  add column resume_text       text,
  add column resume_parsed     jsonb,
  add column resume_uploaded_at timestamptz;

-- Існуючі RLS-політики ats_candidates (mp_can_access_candidate/
-- mp_can_edit_candidate, 20260704090500) уже покривають нові колонки —
-- RLS діє на рівні рядка, не колонки, додаткових політик не потрібно.
