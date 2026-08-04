-- ============================================================
-- AI-сорсинг із зовнішніх джерел (SPEC-ENGINEERING Розділ 13)
-- ============================================================
-- sourcing_searches — запуск пошуку під вакансію (набір провайдерів + запит).
-- sourced_profiles  — знайдені зовнішні профілі (GitHub / PDL / Apollo / Proxycurl),
--                     нормалізовані, з опційним лінком на ats_candidates після імпорту.
-- Пише Edge `sourcing-search` (service_role); клієнт читає й імпортує в базу.
-- Мультитенант: tenant_id + stamp-тригер + RESTRICTIVE gate; SELECT — по прямій
-- колонці vacancy_id (RETURNING-safe, урок RLS-403).
-- ============================================================

create table if not exists public.sourcing_searches (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete restrict,
  vacancy_id   uuid not null references public.vacancies(id) on delete cascade,
  query        jsonb not null default '{}'::jsonb,   -- {titles[], skills[], locations[], keywords}
  providers    text[] not null default '{}',         -- ['github','pdl','apollo','proxycurl']
  status       text not null default 'running',      -- running|done|error
  error        text,
  result_count int not null default 0,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_sourcing_searches_vacancy on public.sourcing_searches (vacancy_id, created_at desc);

create table if not exists public.sourced_profiles (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete restrict,
  search_id     uuid not null references public.sourcing_searches(id) on delete cascade,
  vacancy_id    uuid not null references public.vacancies(id) on delete cascade,  -- денорм. для RLS
  provider      text not null,                        -- github|pdl|apollo|proxycurl
  external_id   text not null,                        -- id профілю у провайдера
  full_name     text,
  title         text,
  company       text,
  location      text,
  skills        text[] not null default '{}',
  profile_url   text,
  raw           jsonb not null default '{}'::jsonb,   -- сира відповідь провайдера
  match_score   int not null default 0,               -- 0–100 (ранжування під бріф)
  breakdown     jsonb not null default '{}'::jsonb,
  contact       jsonb,                                -- email/phone після enrich-contact
  consent_basis text,                                 -- законна підстава обробки ПД
  candidate_id  uuid references public.ats_candidates(id) on delete set null,  -- лінк після імпорту
  created_at    timestamptz not null default now(),
  unique (tenant_id, provider, external_id)
);
create index if not exists idx_sourced_profiles_search on public.sourced_profiles (search_id, match_score desc);
create index if not exists idx_sourced_profiles_vacancy on public.sourced_profiles (vacancy_id);

-- Бекфіл tenant_id для існуючих рядків (їх нема, але тримаємо шаблон однаковим).
update public.sourcing_searches set tenant_id = '11111111-1111-1111-1111-111111111111' where tenant_id is null;
update public.sourced_profiles  set tenant_id = '11111111-1111-1111-1111-111111111111' where tenant_id is null;
create index if not exists idx_sourcing_searches_tenant on public.sourcing_searches (tenant_id);
create index if not exists idx_sourced_profiles_tenant on public.sourced_profiles (tenant_id);

drop trigger if exists trg_stamp_tenant on public.sourcing_searches;
create trigger trg_stamp_tenant before insert on public.sourcing_searches
  for each row execute function public.mp_stamp_tenant();
drop trigger if exists trg_stamp_tenant on public.sourced_profiles;
create trigger trg_stamp_tenant before insert on public.sourced_profiles
  for each row execute function public.mp_stamp_tenant();

alter table public.sourcing_searches enable row level security;
alter table public.sourced_profiles  enable row level security;

-- sourcing_searches: читає той, хто веде вакансію; запускає — хто може її редагувати.
drop policy if exists sourcing_searches_select on public.sourcing_searches;
create policy sourcing_searches_select on public.sourcing_searches
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists sourcing_searches_write on public.sourcing_searches;
create policy sourcing_searches_write on public.sourcing_searches
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

-- sourced_profiles: те саме через денормалізований vacancy_id (RETURNING-safe).
drop policy if exists sourced_profiles_select on public.sourced_profiles;
create policy sourced_profiles_select on public.sourced_profiles
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists sourced_profiles_write on public.sourced_profiles;
create policy sourced_profiles_write on public.sourced_profiles
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

-- RESTRICTIVE tenant-gate на обидві таблиці.
drop policy if exists sourcing_searches_tenant_isolation on public.sourcing_searches;
create policy sourcing_searches_tenant_isolation on public.sourcing_searches
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

drop policy if exists sourced_profiles_tenant_isolation on public.sourced_profiles;
create policy sourced_profiles_tenant_isolation on public.sourced_profiles
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.sourcing_searches is 'Запуск AI-сорсингу під вакансію: провайдери + запит + статус.';
comment on table public.sourced_profiles is 'Знайдені зовнішні профілі (нормалізовані), з лінком на ats_candidates після імпорту.';
