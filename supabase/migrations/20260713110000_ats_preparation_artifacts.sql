-- ============================================================
-- ATS: Артефакти етапу 1 «Підготовка»
-- ============================================================
-- Рішення власника: артефакти зберігаються СТРУКТУРОВАНО в БД (не як
-- завантажені файли) — щоб їх могли перевикористати AI-звіти, матриця та
-- публікації. Експорт у PDF — друком із брендованого HTML (як «Версія для
-- клієнта» у звітах).
--
-- Дві сутності 1:1 з вакансією:
--   • vacancy_search_strategies — стратегія пошуку (внутрішній документ):
--     фокус, галузі з частками, цільові компанії, цільові посади, профіль,
--     що поза скоупом;
--   • vacancy_public_briefs — бріф для КАНДИДАТІВ (зовнішній документ):
--     секції тексту, які йдуть у PDF. Генерується AI з внутрішнього брифу
--     (68 питань) + компетенцій, далі редагується людиною.
--
-- Внутрішній бріф (vacancy_briefs) лишається джерелом правди про замовника;
-- публічний бріф — його очищена від конфіденційного проекція (dual job profile).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Стратегія пошуку
-- ------------------------------------------------------------
create table public.vacancy_search_strategies (
  id               uuid primary key default gen_random_uuid(),
  vacancy_id       uuid not null unique references public.vacancies(id) on delete cascade,
  -- Коротке формулювання фокусу («ритейл, FMCG, продуктовий бізнес, аптеки, fast food»).
  focus            text,
  -- [{ "name": "продуктовий ритейл", "share": 50 }, ...] — частки в % (сума ≈ 100).
  industries       jsonb not null default '[]'::jsonb,
  -- ["Метро", "McDonald's", ...]
  target_companies jsonb not null default '[]'::jsonb,
  -- ["CFO", "Finance Director", "Head of Finance", ...]
  target_titles    jsonb not null default '[]'::jsonb,
  -- ["досвід у мережевому бізнесі", "P&L повна відповідальність", ...]
  profile_musts    jsonb not null default '[]'::jsonb,
  out_of_scope     text,
  notes            text,
  updated_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_search_strategies_vacancy on public.vacancy_search_strategies (vacancy_id);

alter table public.vacancy_search_strategies enable row level security;

create trigger set_updated_at_vacancy_search_strategies
  before update on public.vacancy_search_strategies
  for each row execute function public.update_updated_at_column();

create policy vacancy_search_strategies_select on public.vacancy_search_strategies
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy vacancy_search_strategies_insert on public.vacancy_search_strategies
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_search_strategies_update on public.vacancy_search_strategies
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_search_strategies_delete on public.vacancy_search_strategies
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- ------------------------------------------------------------
-- 2. Бріф для кандидатів (публічний)
-- ------------------------------------------------------------
create table public.vacancy_public_briefs (
  id           uuid primary key default gen_random_uuid(),
  vacancy_id   uuid not null unique references public.vacancies(id) on delete cascade,
  title        text,
  -- Секції документа: [{ "heading": "Мета посади", "body": "..." }, ...]
  -- Markdown у body — рендериться і в UI, і в PDF-друк.
  sections     jsonb not null default '[]'::jsonb,
  -- Вступ («Наш Клієнт — масштабний регіональний гравець...») — окремо, бо в
  -- PDF він іде до заголовків і без heading.
  intro        text,
  status       public.vacancy_brief_status not null default 'draft',
  -- Слід AI (EU AI Act: якою моделлю/промтом згенеровано чернетку).
  ai_model     text,
  generated_at timestamptz,
  updated_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_public_briefs_vacancy on public.vacancy_public_briefs (vacancy_id);

alter table public.vacancy_public_briefs enable row level security;

create trigger set_updated_at_vacancy_public_briefs
  before update on public.vacancy_public_briefs
  for each row execute function public.update_updated_at_column();

create policy vacancy_public_briefs_select on public.vacancy_public_briefs
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy vacancy_public_briefs_insert on public.vacancy_public_briefs
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_public_briefs_update on public.vacancy_public_briefs
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy vacancy_public_briefs_delete on public.vacancy_public_briefs
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

comment on table public.vacancy_search_strategies is
  'Стратегія пошуку (етап 1, внутрішній документ): фокус, галузі з частками, '
  'цільові компанії та посади, профіль, поза скоупом.';
comment on table public.vacancy_public_briefs is
  'Бріф для кандидатів (етап 1, зовнішній документ). AI-чернетка з внутрішнього '
  'брифу 68 питань + компетенцій; редагується людиною; експорт у PDF друком.';
