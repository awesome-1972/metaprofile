-- ============================================================
-- ATS: Стоп-лист вакансії (заборонені кандидати від клієнта)
-- ============================================================
-- Клієнт може заборонити розглядати певних кандидатів на КОНКРЕТНУ вакансію
-- (напр. власні співробітники, попередньо відхилені, конфлікт інтересів).
-- Рішення власника: стоп-лист прив'язаний ВИКЛЮЧНО до вакансії (не до клієнта,
-- не глобально). Вноситься на етапі «Підготовка».
--
-- Порівняння нового кандидата зі стоп-листом — за нормалізованим ПІБ (+компанія
-- як додатковий сигнал). При збігу — ПОПЕРЕДЖЕННЯ (не жорсткий блок): тезки
-- можливі, рішення за рекрутером.
-- ============================================================

create table if not exists public.vacancy_stop_list (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid references public.tenants(id) on delete restrict,
  vacancy_id uuid not null references public.vacancies(id) on delete cascade,
  full_name  text not null,
  company    text,
  reason     text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_vacancy_stop_list_vacancy on public.vacancy_stop_list (vacancy_id);
-- Нормалізований пошук за ПІБ (для порівняння з кандидатом).
create index if not exists idx_vacancy_stop_list_name on public.vacancy_stop_list (vacancy_id, lower(full_name));

-- Backfill tenant (єдиний тенант) + авто-проставляння на нові рядки.
update public.vacancy_stop_list set tenant_id = '11111111-1111-1111-1111-111111111111'
 where tenant_id is null;
create index if not exists idx_vacancy_stop_list_tenant on public.vacancy_stop_list (tenant_id);
drop trigger if exists trg_stamp_tenant on public.vacancy_stop_list;
create trigger trg_stamp_tenant before insert on public.vacancy_stop_list
  for each row execute function public.mp_stamp_tenant();

alter table public.vacancy_stop_list enable row level security;

-- Читає той, хто бачить вакансію; пише — редактор вакансії. Дзеркалить
-- pipeline_stages/artefacts.
drop policy if exists vacancy_stop_list_select on public.vacancy_stop_list;
create policy vacancy_stop_list_select on public.vacancy_stop_list
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists vacancy_stop_list_insert on public.vacancy_stop_list;
create policy vacancy_stop_list_insert on public.vacancy_stop_list
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists vacancy_stop_list_delete on public.vacancy_stop_list;
create policy vacancy_stop_list_delete on public.vacancy_stop_list
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- RESTRICTIVE tenant-gate (ізоляція між тенантами).
drop policy if exists vacancy_stop_list_tenant_isolation on public.vacancy_stop_list;
create policy vacancy_stop_list_tenant_isolation on public.vacancy_stop_list
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.vacancy_stop_list is
  'Стоп-лист заборонених кандидатів, прив''язаний ВИКЛЮЧНО до вакансії. '
  'Порівняння нового кандидата — за нормалізованим ПІБ; при збігу попередження.';
