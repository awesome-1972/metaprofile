-- ============================================================
-- Metaprofile ATS — фаза M4c: бріф клієнта, матриця компетенцій,
-- competency scoring, AI-звіти по кандидату/порівняльні.
-- Джерело вимог: docs/requirements/ats-agency-features.md (Epic E повністю,
-- Додаток A — форма власника: 4 групи компетенцій по 25%, шкала оцінки 1–3,
-- пороги відповідності 2.34–3.00 висока / 1.67–2.33 середня / 1.00–1.66 низька;
-- Додаток C — бріф-опитувальник клієнта, 68 питань / 15 секцій, секція 12
-- «Умови» містить фінансово-чутливі поля (компенсація/бонуси) під
-- can_view_financials-гейт).
--
-- Стиль/патерни — дзеркалить наявні ATS-міграції 20260704*:
--   • security definer helper-функції mp_can_access_vacancy / mp_can_edit_vacancy /
--     mp_is_workspace_admin / mp_can_view_vacancy_financials (з 20260704090100,
--     20260704090300) — НЕ дублюються, лише використовуються в RLS.
--   • update_updated_at_column() (з 20260704090100) — тригер на кожній таблиці
--     з updated_at.
--   • RLS: default DENY (fail-closed), owner/admin — bypass через
--     mp_is_workspace_admin(); write — через mp_can_edit_vacancy(vacancy_id);
--     фінансово-чутлива частина брифу — окрема таблиця під окремий гейт
--     mp_can_view_vacancy_financials (за аналогією з vacancy_financials, Fin-4).
--   • Індекси під усі FK (гарячий шлях RLS-предикатів — join до vacancies).
--
-- MVP-рамки цієї міграції (свідомі спрощення, задокументовані як TODO нижче):
--   • Бріф заповнює РЕКРУТЕР (can_edit на вакансію). Публічна форма для
--     заповнення клієнтом напряму — поза скоупом (Epic D, US-D02, окрема фаза).
--   • competency_scores — один рядок на (application_id, competency_id):
--     якщо потрібна підтримка кількох незалежних оцінок від різних
--     інтерв'юерів з подальшою агрегацією (Q5 з ATS-вимог, ще не відповіли
--     власником) — знадобиться зняти unique і додати агрегуючу VIEW.
--     Наразі upsert одного бала на компетенцію відповідає зразку власника
--     (Додаток A: один бал 1–3 на компетенцію в таблиці).
--   • Транскрипція інтерв'ю НЕ зберігається окремою колонкою/таблицею в цій
--     міграції (interviews.transcript відсутній у поточній схемі,
--     20260704090200) — Edge Function приймає transcript як вхідний параметр
--     запиту (вставлений рекрутером вручну, Q3 ATS-вимог ще відкрите).
--     Якщо власник підтвердить постійне зберігання транскрипту — окрема
--     міграція додасть колонку/таблицю, не ця.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Enum-типи
-- ------------------------------------------------------------
create type public.vacancy_brief_status as enum ('draft', 'completed');
create type public.vacancy_prompt_kind  as enum ('candidate_report', 'comparative_report');
create type public.candidate_report_status as enum ('generating', 'ready', 'failed');

-- ------------------------------------------------------------
-- 1a. vacancy_briefs — бріф клієнта per-vacancy (Додаток C, без фінансів)
-- ------------------------------------------------------------
-- answers jsonb структура: { "<section_key>": { "<question_key>": <answer> } }
-- 15 секцій опитувальника (Додаток C), КРІМ фінансово-чутливих полів секції
-- «Умови» (компенсація/бонуси) — ті йдуть окремо в vacancy_brief_financials.
create table public.vacancy_briefs (
  id          uuid primary key default gen_random_uuid(),
  vacancy_id  uuid not null unique references public.vacancies(id) on delete cascade,
  answers     jsonb not null default '{}'::jsonb,
  status      public.vacancy_brief_status not null default 'draft',
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_vacancy_briefs_vacancy on public.vacancy_briefs (vacancy_id);

create trigger set_updated_at_vacancy_briefs
  before update on public.vacancy_briefs
  for each row execute function public.update_updated_at_column();

alter table public.vacancy_briefs enable row level security;

-- ------------------------------------------------------------
-- 1b. vacancy_brief_financials — фін.-чутлива частина брифу (Fin-4-подібний гейт)
-- ------------------------------------------------------------
-- Секція 12 «Умови» опитувальника: компенсація, бонуси (💰 у Додатку C).
-- Окрема таблиця (не колонка в vacancy_briefs) — щоб RLS-гейт
-- mp_can_view_vacancy_financials міг ізолювати ЛИШЕ ці відповіді, а решта
-- брифу (14 секцій) лишалась доступною звичайному can_edit-скоупу.
create table public.vacancy_brief_financials (
  id                 uuid primary key default gen_random_uuid(),
  vacancy_brief_id   uuid not null unique references public.vacancy_briefs(id) on delete cascade,
  answers            jsonb not null default '{}'::jsonb,
  created_by         uuid references auth.users(id) on delete set null,
  updated_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index idx_vacancy_brief_financials_brief on public.vacancy_brief_financials (vacancy_brief_id);

create trigger set_updated_at_vacancy_brief_financials
  before update on public.vacancy_brief_financials
  for each row execute function public.update_updated_at_column();

alter table public.vacancy_brief_financials enable row level security;

-- HARD RULE (за аналогією SEC-04/Fin-4): фінансові відповіді брифу НІКОЛИ не
-- потрапляють у vacancy_briefs.answers, ні в промт AI-звіту без явної
-- перевірки mp_can_view_vacancy_financials у Edge Function.

-- ------------------------------------------------------------
-- 2. vacancy_competencies — матриця компетенцій per-vacancy (Додаток A)
-- ------------------------------------------------------------
-- Форма власника: 4 групи ваг по 25% (Ціннісні/Професійні/Лідерські/Особисті),
-- кожна компетенція = назва (укр+англ) + 2–3 готові питання для інтерв'ю
-- (questions jsonb-масив рядків) + вага (0.20 у прикладі) + оцінка 1–3.
-- group_weight дублюється на кожному рядку групи (денормалізація свідома —
-- спрощує читання матриці однією вибіркою; валідація суми ваг — рівень UI/
-- Edge, не БД-constraint, оскільки власник ще не підтвердив точну формулу
-- (US-E01 сценарій 2 ATS-вимог, ⏳ очікує уточнення).
create table public.vacancy_competencies (
  id            uuid primary key default gen_random_uuid(),
  vacancy_id    uuid not null references public.vacancies(id) on delete cascade,
  group_name    text not null,
  group_weight  numeric(5,4) not null check (group_weight > 0 and group_weight <= 1),
  name          text not null,
  name_en       text,
  questions     jsonb not null default '[]'::jsonb,
  weight        numeric(5,4) not null check (weight > 0 and weight <= 1),
  position      integer not null default 0,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_vacancy_competencies_vacancy on public.vacancy_competencies (vacancy_id);
create index idx_vacancy_competencies_position on public.vacancy_competencies (vacancy_id, position);

create trigger set_updated_at_vacancy_competencies
  before update on public.vacancy_competencies
  for each row execute function public.update_updated_at_column();

alter table public.vacancy_competencies enable row level security;

-- ------------------------------------------------------------
-- 3. competency_scores — бали по компетенціях за заявкою (шкала 1–3, Додаток A)
-- ------------------------------------------------------------
create table public.competency_scores (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  competency_id  uuid not null references public.vacancy_competencies(id) on delete cascade,
  score          integer not null check (score between 1 and 3),
  note           text,
  scored_by      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (application_id, competency_id)
);
create index idx_competency_scores_application on public.competency_scores (application_id);
create index idx_competency_scores_competency  on public.competency_scores (competency_id);

create trigger set_updated_at_competency_scores
  before update on public.competency_scores
  for each row execute function public.update_updated_at_column();

alter table public.competency_scores enable row level security;

-- TODO(spec-open-question): competency_scores.competency_id референсить
-- vacancy_competencies, а не applications.vacancy_id напряму — цілісність
-- «компетенція належить тій самій вакансії, що й заявка» НЕ гарантована
-- декларативним FK (як і current_stage_id у applications, розв'язано там
-- тригером mp_applications_immutable_scope). Якщо в майбутньому знадобиться
-- аналогічний guard і для competency_scores — окрема миграція; для MVP RLS
-- (нижче) вже унеможливлює цей стан для звичайного клієнта, бо
-- INSERT/UPDATE вимагає mp_can_edit_vacancy(vacancy_id) отриманого через
-- join application → vacancy, а не довільний vacancy_id з тіла запиту.

-- ------------------------------------------------------------
-- 4. vacancy_prompts — промт AI-звіту per-vacancy (Додаток A, п.2)
-- ------------------------------------------------------------
create table public.vacancy_prompts (
  id          uuid primary key default gen_random_uuid(),
  vacancy_id  uuid not null references public.vacancies(id) on delete cascade,
  kind        public.vacancy_prompt_kind not null,
  prompt      text not null,
  created_by  uuid references auth.users(id) on delete set null,
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (vacancy_id, kind)
);
create index idx_vacancy_prompts_vacancy on public.vacancy_prompts (vacancy_id);

create trigger set_updated_at_vacancy_prompts
  before update on public.vacancy_prompts
  for each row execute function public.update_updated_at_column();

alter table public.vacancy_prompts enable row level security;

-- ------------------------------------------------------------
-- 5. candidate_reports — згенеровані AI-звіти (по кандидату / порівняльні)
-- ------------------------------------------------------------
-- application_id NULL для kind='comparative_report' (звіт по всіх кандидатах
-- вакансії одразу — немає єдиної заявки-власника). vacancy_id завжди NOT NULL
-- (денормалізація навмисна — дозволяє RLS через mp_can_access_vacancy(vacancy_id)
-- без join до applications навіть для порівняльного звіту).
create table public.candidate_reports (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications(id) on delete cascade,
  vacancy_id     uuid not null references public.vacancies(id) on delete cascade,
  kind           public.vacancy_prompt_kind not null,
  content_md     text,
  model          text,
  status         public.candidate_report_status not null default 'generating',
  error          text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (kind <> 'candidate_report' or application_id is not null)
);
create index idx_candidate_reports_application on public.candidate_reports (application_id);
create index idx_candidate_reports_vacancy     on public.candidate_reports (vacancy_id);
create index idx_candidate_reports_kind        on public.candidate_reports (vacancy_id, kind, created_at desc);

create trigger set_updated_at_candidate_reports
  before update on public.candidate_reports
  for each row execute function public.update_updated_at_column();

alter table public.candidate_reports enable row level security;

-- HARD RULE (за аналогією SEC-04/SEC-05, Epic E сценарій 5 ATS-вимог):
-- candidate_reports.content_md НЕ повинен містити фінансових полів
-- (vacancy_financials / vacancy_brief_financials) — Edge Function
-- generate-candidate-report явно не додає ці джерела в промт.

-- Файл із лого агенції (docx/pdf) — ПОЗА скоупом цієї міграції/фази M4c.
-- MVP віддає лише content_md (markdown); брендований файл — наступний крок
-- (окрема Edge Function рендерингу + Supabase Storage bucket для звітів,
-- за аналогією з майбутнім resume-storage з Epic C).

-- ============================================================
-- RLS-політики
-- Патерн ідентичний 20260704090500_ats_rls_policies.sql:
--   select → mp_can_access_vacancy(vacancy_id) [напряму або через join]
--   insert/update/delete → mp_can_edit_vacancy(vacancy_id)
--   vacancy_brief_financials.select — додатково під mp_can_view_vacancy_financials
-- ============================================================

-- ------------------------------------------------------------
-- 6.1 vacancy_briefs
-- ------------------------------------------------------------
create policy vacancy_briefs_select on public.vacancy_briefs
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy vacancy_briefs_insert on public.vacancy_briefs
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_briefs_update on public.vacancy_briefs
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_briefs_delete on public.vacancy_briefs
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 6.2 vacancy_brief_financials (фін-гейт на READ; write — can_edit, як і решта
-- фінансових write-шляхів агенції веде до owner/admin/recruiter з can_edit —
-- узгоджено з тим, що заповнює бріф РЕКРУТЕР, а не лише owner/admin;
-- на відміну від vacancy_financials, де WRITE обмежено лише owner/admin,
-- бо тут це відповідь клієнта в опитувальнику, яку рекрутер документує)
-- ------------------------------------------------------------
create policy vacancy_brief_financials_select on public.vacancy_brief_financials
  for select to authenticated
  using (
    exists (
      select 1 from public.vacancy_briefs b
      where b.id = vacancy_brief_id
        and public.mp_can_view_vacancy_financials(b.vacancy_id)
    )
  );

create policy vacancy_brief_financials_insert on public.vacancy_brief_financials
  for insert to authenticated
  with check (
    exists (
      select 1 from public.vacancy_briefs b
      where b.id = vacancy_brief_id
        and public.mp_can_view_vacancy_financials(b.vacancy_id)
        and public.mp_can_edit_vacancy(b.vacancy_id)
    )
  );

create policy vacancy_brief_financials_update on public.vacancy_brief_financials
  for update to authenticated
  using (
    exists (
      select 1 from public.vacancy_briefs b
      where b.id = vacancy_brief_id
        and public.mp_can_view_vacancy_financials(b.vacancy_id)
        and public.mp_can_edit_vacancy(b.vacancy_id)
    )
  )
  with check (
    exists (
      select 1 from public.vacancy_briefs b
      where b.id = vacancy_brief_id
        and public.mp_can_view_vacancy_financials(b.vacancy_id)
        and public.mp_can_edit_vacancy(b.vacancy_id)
    )
  );

create policy vacancy_brief_financials_delete on public.vacancy_brief_financials
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 6.3 vacancy_competencies
-- ------------------------------------------------------------
create policy vacancy_competencies_select on public.vacancy_competencies
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy vacancy_competencies_insert on public.vacancy_competencies
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_competencies_update on public.vacancy_competencies
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_competencies_delete on public.vacancy_competencies
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- ------------------------------------------------------------
-- 6.4 competency_scores (scope через join application → vacancy)
-- ------------------------------------------------------------
create policy competency_scores_select on public.competency_scores
  for select to authenticated
  using (public.mp_can_access_application(application_id));

create policy competency_scores_insert on public.competency_scores
  for insert to authenticated
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)
    )
    and exists (
      select 1 from public.vacancy_competencies c
      join public.applications a on a.id = application_id
      where c.id = competency_id and c.vacancy_id = a.vacancy_id
    )
  );

create policy competency_scores_update on public.competency_scores
  for update to authenticated
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)
    )
  )
  with check (
    exists (
      select 1 from public.applications a
      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)
    )
    and exists (
      select 1 from public.vacancy_competencies c
      join public.applications a on a.id = application_id
      where c.id = competency_id and c.vacancy_id = a.vacancy_id
    )
  );

create policy competency_scores_delete on public.competency_scores
  for delete to authenticated
  using (
    public.mp_is_workspace_admin()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)
    )
  );

-- ------------------------------------------------------------
-- 6.5 vacancy_prompts
-- ------------------------------------------------------------
create policy vacancy_prompts_select on public.vacancy_prompts
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy vacancy_prompts_insert on public.vacancy_prompts
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_prompts_update on public.vacancy_prompts
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_prompts_delete on public.vacancy_prompts
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- ------------------------------------------------------------
-- 6.6 candidate_reports
-- ------------------------------------------------------------
-- SELECT: denormalized vacancy_id — прямий mp_can_access_vacancy без join,
-- працює однаково для candidate_report (application_id заповнено) і
-- comparative_report (application_id NULL).
create policy candidate_reports_select on public.candidate_reports
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

-- WRITE (генерація/статус) — виконується Edge Function generate-candidate-report
-- під service_role (RLS bypass) АБО клієнтом з can_edit (напр. видалення
-- застарілого звіту). INSERT з клієнта теоретично можливий (наприклад, ручний
-- запис метаданих), тому лишаємо can_edit-гейт, а не повний DENY.
create policy candidate_reports_insert on public.candidate_reports
  for insert to authenticated
  with check (
    public.mp_can_edit_vacancy(vacancy_id)
    and (
      application_id is null
      or exists (
        select 1 from public.applications a
        where a.id = application_id and a.vacancy_id = candidate_reports.vacancy_id
      )
    )
  );

create policy candidate_reports_update on public.candidate_reports
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy candidate_reports_delete on public.candidate_reports
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));
