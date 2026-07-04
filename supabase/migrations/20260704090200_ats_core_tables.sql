-- ============================================================
-- Metaprofile ATS — крок 3/7: core-таблиці (розділ 4 специфікації)
-- Порядок створення відповідає розділу 8 (кроки 4–19).
-- RLS увімкнено одразу після CREATE TABLE (політики — окремою міграцією 5).
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 access_grants — гранулярні гранти (крок 4, без FK на clients)
-- ------------------------------------------------------------
create table public.access_grants (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  scope_type          public.grant_scope not null,
  scope_id            uuid not null,            -- clients.id АБО hiring_projects.id (за scope_type)
  can_edit            boolean not null default false,
  can_view_financials boolean not null default false,
  permissions         jsonb  not null default '{}'::jsonb,
  is_active           boolean not null default true,
  granted_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, scope_type, scope_id)
);

-- КЛЮЧОВІ індекси під RLS-предикати (грант-резолв — гарячий шлях).
create index idx_access_grants_lookup
  on public.access_grants (user_id, is_active, scope_type, scope_id);
create index idx_access_grants_active
  on public.access_grants (user_id, scope_type, scope_id)
  where is_active;
create index idx_access_grants_financials
  on public.access_grants (user_id, scope_type, scope_id)
  where is_active and can_view_financials;
create index idx_access_grants_scope on public.access_grants (scope_type, scope_id);

create trigger set_updated_at_access_grants
  before update on public.access_grants
  for each row execute function public.update_updated_at_column();

alter table public.access_grants enable row level security;

-- Цілісність scope_id (FK на дві різні таблиці недосяжний декларативно)
-- гарантується Edge Function grant-management (service_role, єдиний записувач).
-- Осиротілі гранти нешкідливі — mp_can_access_* просто не знайдуть відповідності
-- (fail-closed).

-- ------------------------------------------------------------
-- 4.2 clients (крок 5)
-- ------------------------------------------------------------
create table public.clients (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  status             public.client_status not null default 'active',
  is_internal        boolean not null default false,
  industry           text,
  website            text,
  contact_name       text,
  contact_email      text,
  contact_phone      text,
  notes              text,
  -- 🔺 міст на майбутнє (self-serve портал клієнта, V2 companies). FK НЕ ставимо:
  -- companies V2 — dormant; TODO(spec-conflict): companies.id у V2 наявна (owner_id
  -- модель), але зв'язок навмисно без FK за рішенням специфікації (розділ 10 п.4).
  company_account_id uuid,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create unique index uq_clients_single_internal on public.clients (is_internal) where is_internal;

create trigger set_updated_at_clients
  before update on public.clients
  for each row execute function public.update_updated_at_column();

alter table public.clients enable row level security;

-- ------------------------------------------------------------
-- 4.3 hiring_projects (крок 6, → clients)
-- ------------------------------------------------------------
create table public.hiring_projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  name         text not null,
  code         text,
  status       public.hiring_project_status not null default 'draft',
  description  text,
  start_date   date,
  target_date  date,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, code)
);
create index idx_hiring_projects_client on public.hiring_projects (client_id);
create index idx_hiring_projects_status on public.hiring_projects (status);

create trigger set_updated_at_hiring_projects
  before update on public.hiring_projects
  for each row execute function public.update_updated_at_column();

alter table public.hiring_projects enable row level security;

-- ------------------------------------------------------------
-- 4.4 ref_positions / ref_grades / ref_competencies (крок 7, незалежні)
-- Readonly-кеш довідника хаба (E2+E3). Write лише service_role.
-- ------------------------------------------------------------
create table public.ref_positions (
  id          uuid primary key default gen_random_uuid(),
  hub_id      text not null unique,
  code        text,
  name        text not null,
  is_active   boolean not null default true,
  synced_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_ref_positions_hub on public.ref_positions (hub_id);
alter table public.ref_positions enable row level security;

create table public.ref_grades (
  id          uuid primary key default gen_random_uuid(),
  hub_id      text not null unique,
  code        text,
  name        text not null,
  rank        integer,
  is_active   boolean not null default true,
  synced_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_ref_grades_hub on public.ref_grades (hub_id);
alter table public.ref_grades enable row level security;

create table public.ref_competencies (
  id          uuid primary key default gen_random_uuid(),
  hub_id      text not null unique,
  code        text,
  name        text not null,
  category    text,
  is_active   boolean not null default true,
  synced_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_ref_competencies_hub on public.ref_competencies (hub_id);
alter table public.ref_competencies enable row level security;

create trigger set_updated_at_ref_positions    before update on public.ref_positions
  for each row execute function public.update_updated_at_column();
create trigger set_updated_at_ref_grades       before update on public.ref_grades
  for each row execute function public.update_updated_at_column();
create trigger set_updated_at_ref_competencies before update on public.ref_competencies
  for each row execute function public.update_updated_at_column();

-- ------------------------------------------------------------
-- 4.5 vacancies (крок 8, → hiring_projects, ref_*)
-- ------------------------------------------------------------
create table public.vacancies (
  id                uuid primary key default gen_random_uuid(),
  hiring_project_id uuid not null references public.hiring_projects(id) on delete cascade,
  title             text not null,
  status            public.vacancy_status not null default 'draft',
  position_ref      uuid references public.ref_positions(id) on delete set null,
  grade_ref         uuid references public.ref_grades(id)    on delete set null,
  employment_type   public.employment_type not null default 'full_time',
  headcount         integer not null default 1 check (headcount >= 1),
  location          text,
  is_remote         boolean not null default false,
  -- внутрішній інтервʼюер (не окрема глобальна роль hiring_manager — розд. 2.1 🔺).
  hiring_manager_id uuid references auth.users(id) on delete set null,
  description       text,
  opened_at         date,
  closed_at         date,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_vacancies_project  on public.vacancies (hiring_project_id);
create index idx_vacancies_status   on public.vacancies (status);
create index idx_vacancies_position on public.vacancies (position_ref);
create index idx_vacancies_grade    on public.vacancies (grade_ref);
create index idx_vacancies_hm       on public.vacancies (hiring_manager_id);

create trigger set_updated_at_vacancies
  before update on public.vacancies
  for each row execute function public.update_updated_at_column();

alter table public.vacancies enable row level security;

-- ------------------------------------------------------------
-- 4.6 vacancy_financials (крок 9, → vacancies) — Fin-4, окрема RLS
-- ------------------------------------------------------------
create table public.vacancy_financials (
  id                  uuid primary key default gen_random_uuid(),
  vacancy_id          uuid not null unique references public.vacancies(id) on delete cascade,
  currency            char(3) not null default 'USD',
  salary_min          numeric(14,2),
  salary_max          numeric(14,2),
  fee_type            text check (fee_type in ('percent','fixed')),
  fee_percent         numeric(5,2),
  fee_fixed_amount    numeric(14,2),
  -- SEC-04/SEC-16: ЄДИНЕ місце суми офера (під фін-гейтом).
  agreed_salary       numeric(14,2),
  agreed_currency     char(3),
  commercial_terms    text,
  invoice_notes       text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max),
  check (agreed_currency is null or agreed_currency = currency)
);
create index idx_vacancy_financials_vacancy on public.vacancy_financials (vacancy_id);

create trigger set_updated_at_vacancy_financials
  before update on public.vacancy_financials
  for each row execute function public.update_updated_at_column();

alter table public.vacancy_financials enable row level security;

-- HARD RULE (SEC-04): жодних фінансових значень поза цією таблицею —
-- ні в offers.terms_note, ні в application_events.note/metadata, ні у vacancies.

-- ------------------------------------------------------------
-- 4.7 pipeline_stage_templates + items + pipeline_stages (крок 10–11)
-- ------------------------------------------------------------
create table public.pipeline_stage_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index uq_stage_template_single_default
  on public.pipeline_stage_templates (is_default) where is_default;
alter table public.pipeline_stage_templates enable row level security;

create trigger set_updated_at_pipeline_stage_templates
  before update on public.pipeline_stage_templates
  for each row execute function public.update_updated_at_column();

create table public.pipeline_stage_template_items (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.pipeline_stage_templates(id) on delete cascade,
  name        text not null,
  stage_type  public.stage_type not null default 'screening',
  position    integer not null,
  is_terminal boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (template_id, position)
);
create index idx_stage_template_items_template on public.pipeline_stage_template_items (template_id);
alter table public.pipeline_stage_template_items enable row level security;

create table public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  vacancy_id  uuid not null references public.vacancies(id) on delete cascade,
  name        text not null,
  stage_type  public.stage_type not null default 'screening',
  position    integer not null,
  is_terminal boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (vacancy_id, position)
);
create index idx_pipeline_stages_vacancy on public.pipeline_stages (vacancy_id);

create trigger set_updated_at_pipeline_stages
  before update on public.pipeline_stages
  for each row execute function public.update_updated_at_column();

alter table public.pipeline_stages enable row level security;

-- ------------------------------------------------------------
-- 4.8 candidate_sources + ats_candidates (крок 12–13)
-- ------------------------------------------------------------
-- TODO(spec-conflict): специфікація називає ATS-сутність кандидата `candidates`,
-- але в репо ВЖЕ існує `public.candidates` (V2, з 20260205075826) — окрема
-- сутність кандидата-З-логіном (user_id NOT NULL UNIQUE → auth.users), що не
-- відповідає домену ATS C1 («кандидат без логіну», candidate_account_id NULL
-- як міст на майбутнє — розд. 4.8 і розд. 10 п.4 специфікації). Це різні
-- сутності з несумісною формою PK/FK. Перейменування або ALTER наявної
-- V2-таблиці зруйнували б candidate-login-функціонал V2 (case_assignments,
-- interview_sessions FK на неї). Найбезпечніший варіант: НОВА таблиця
-- `public.ats_candidates`, що відповідає DDL специфікації 1:1 (колонки/
-- поведінка), а `candidate_account_id uuid` (без FK) лишається мостом на
-- наявну `public.candidates` (V2 candidate-login), як і задумано розділом 10.
create table public.candidate_sources (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger set_updated_at_candidate_sources
  before update on public.candidate_sources
  for each row execute function public.update_updated_at_column();
alter table public.candidate_sources enable row level security;

create table public.ats_candidates (
  id                   uuid primary key default gen_random_uuid(),
  full_name            text not null,
  email                text,
  phone                text,
  linkedin_url         text,
  location             text,
  headline             text,
  source_id            uuid references public.candidate_sources(id) on delete set null,
  -- 🔺 міст на майбутнє (портал кандидата = наявна V2 public.candidates). FK НЕ
  -- ставимо навмисно (див. TODO(spec-conflict) вище і розд. 10 п.4 специфікації).
  candidate_account_id uuid,
  notes                text,
  -- SEC-01/SEC-10/SEC-15: GDPR-анонімізація без руйнування append-only журналу.
  is_anonymized        boolean not null default false,
  anonymized_at        timestamptz,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_ats_candidates_source on public.ats_candidates (source_id);
create index idx_ats_candidates_email  on public.ats_candidates (lower(email));

create trigger set_updated_at_ats_candidates
  before update on public.ats_candidates
  for each row execute function public.update_updated_at_column();

alter table public.ats_candidates enable row level security;

-- ------------------------------------------------------------
-- 4.9 applications (крок 14, → ats_candidates, vacancies, pipeline_stages)
-- ------------------------------------------------------------
create table public.applications (
  id                 uuid primary key default gen_random_uuid(),
  candidate_id       uuid not null references public.ats_candidates(id) on delete cascade,
  vacancy_id         uuid not null references public.vacancies(id)  on delete cascade,
  current_stage_id   uuid references public.pipeline_stages(id) on delete set null,
  status             public.application_status not null default 'active',
  -- 🔺 міст до Metaprofile-оцінки (стадія assessment, M4a.8). FK на case_assignments
  -- додається окремою міграцією в M4a.8 (case_assignments вже існує в репо, але
  -- звʼязок навмисно відкладено — не частина цієї специфікації v2).
  case_assignment_id uuid,
  applied_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (candidate_id, vacancy_id)
);
create index idx_applications_vacancy   on public.applications (vacancy_id);
create index idx_applications_candidate on public.applications (candidate_id);
create index idx_applications_stage     on public.applications (current_stage_id);
create index idx_applications_status    on public.applications (status);

create trigger set_updated_at_applications
  before update on public.applications
  for each row execute function public.update_updated_at_column();

alter table public.applications enable row level security;

-- ------------------------------------------------------------
-- 4.10 application_events — append-only журнал (крок 15)
-- ------------------------------------------------------------
create table public.application_events (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  event_type     public.application_event_type not null,
  from_stage_id  uuid references public.pipeline_stages(id) on delete set null,
  to_stage_id    uuid references public.pipeline_stages(id) on delete set null,
  actor_id       uuid references auth.users(id) on delete set null,
  note           text,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
  -- НЕМАЄ updated_at: журнал незмінний (append-only).
);
create index idx_application_events_application on public.application_events (application_id, created_at);
create index idx_application_events_type        on public.application_events (event_type);

alter table public.application_events enable row level security;

-- Тригер mp_log_stage_change (автологування) — окремою міграцією 4 (розділ 3.4/4.10
-- посилаються на pipeline_stages, тому логічно згруповано з тригерами immutable-scope).

-- ------------------------------------------------------------
-- 4.11 interviews (крок 16, → applications)
-- ------------------------------------------------------------
create table public.interviews (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  interviewer_id uuid references auth.users(id) on delete set null,
  interview_type public.interview_type not null default 'other',
  scheduled_at   timestamptz,
  completed_at   timestamptz,
  outcome        public.interview_outcome not null default 'pending',
  rating         integer check (rating between 1 and 5),
  notes          text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_interviews_application on public.interviews (application_id);
create index idx_interviews_interviewer on public.interviews (interviewer_id);

create trigger set_updated_at_interviews
  before update on public.interviews
  for each row execute function public.update_updated_at_column();

alter table public.interviews enable row level security;

-- ------------------------------------------------------------
-- 4.12 offers (крок 17, → applications) — нефінансова частина
-- ------------------------------------------------------------
create table public.offers (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status         public.offer_status not null default 'draft',
  start_date     date,
  offer_sent_at  timestamptz,
  responded_at   timestamptz,
  -- SEC-04: ЛИШЕ нефінансові умови. Суми офера — виключно
  -- vacancy_financials.agreed_salary під фін-гейтом.
  terms_note     text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index idx_offers_application on public.offers (application_id);
create index idx_offers_status      on public.offers (status);

create trigger set_updated_at_offers
  before update on public.offers
  for each row execute function public.update_updated_at_column();

alter table public.offers enable row level security;

-- ------------------------------------------------------------
-- 4.13 rejection_reasons + rejections (крок 18–19)
-- ------------------------------------------------------------
create table public.rejection_reasons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null,
  category    public.rejection_category not null default 'other',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger set_updated_at_rejection_reasons
  before update on public.rejection_reasons
  for each row execute function public.update_updated_at_column();
alter table public.rejection_reasons enable row level security;

create table public.rejections (
  id                     uuid primary key default gen_random_uuid(),
  application_id         uuid not null unique references public.applications(id) on delete cascade,
  reason_id              uuid references public.rejection_reasons(id) on delete set null,
  reason_code            public.rejection_category not null default 'other',
  is_candidate_initiated boolean not null default false,
  comment                text,
  rejected_by            uuid references auth.users(id) on delete set null,
  rejected_at            timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index idx_rejections_application on public.rejections (application_id);
create index idx_rejections_reason      on public.rejections (reason_id);

create trigger set_updated_at_rejections
  before update on public.rejections
  for each row execute function public.update_updated_at_column();

alter table public.rejections enable row level security;
