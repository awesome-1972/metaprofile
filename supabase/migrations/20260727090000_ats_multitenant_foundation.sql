-- ============================================================
-- ATS: Мультитенант — Фаза 1a (структура БЕЗ ізоляції RLS)
-- ============================================================
-- Рішення власника (ADR adr-multitenant-platform.md):
--   • тенант = агенція; MetaVision Consulting — перший і поки єдиний;
--   • ізоляція МІЖ тенантами (продаж платформи іншим агенціям ~01.2027);
--   • кандидати — СПІЛЬНА база в межах тенанта (крос-вакансійний пошук),
--     ізольована лише між тенантами.
--
-- ⚠️ Ця міграція НЕ вмикає ізоляцію: RLS-політики не змінюються. Тенант поки
-- один, тому поведінка не змінюється — нульовий ризик регресу. Ізоляція
-- (tenant-предикати в RLS + аудит security) — окрема Фаза 1b перед 2-м тенантом.
--
-- Тут: таблиця tenants, tenant_id на КОРЕНЕВИХ сутностях, helper
-- mp_current_tenant(), BEFORE-INSERT тригер mp_stamp_tenant (авто-проставляння),
-- backfill усього в MetaVision. Денормалізація гарячих (vacancies/applications)
-- і RLS — Фаза 1b.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Таблиця тенантів + MetaVision
-- ------------------------------------------------------------
create table if not exists public.tenants (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenants enable row level security;

-- Фіксований UUID MetaVision — щоб backfill і код мали стабільний якір.
insert into public.tenants (id, name, slug)
values ('11111111-1111-1111-1111-111111111111', 'MetaVision Consulting', 'metavision')
on conflict (id) do nothing;

-- Читати тенанти може будь-який автентифікований (у Фазі 1b звузимо до свого).
-- Поки — DENY на запис клієнтом (лише service_role/admin через майбутній UI).
create policy tenants_select on public.tenants
  for select to authenticated using (true);

-- ------------------------------------------------------------
-- 2. Хто у якому тенанті — на profiles
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

update public.profiles
   set tenant_id = '11111111-1111-1111-1111-111111111111'
 where tenant_id is null;

-- ------------------------------------------------------------
-- 3. mp_current_tenant() — тенант поточного користувача
-- ------------------------------------------------------------
-- STABLE + security definer: читає profiles повз RLS (щоб не було рекурсії
-- політик). Використовуватиметься в RLS-предикатах Фази 1b.
create or replace function public.mp_current_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where user_id = auth.uid() limit 1;
$$;

grant execute on function public.mp_current_tenant() to authenticated;

-- ------------------------------------------------------------
-- 4. Тригер авто-проставляння tenant_id на нові рядки
-- ------------------------------------------------------------
-- Щоб не переписувати всі хуки/Edge одразу: якщо tenant_id не задано при
-- вставці — підставляємо тенант поточного користувача. Наявні клієнтські
-- INSERT-и (без tenant_id) працюють як раніше.
create or replace function public.mp_stamp_tenant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := public.mp_current_tenant();
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. tenant_id на КОРЕНЕВИХ сутностях + backfill + stamp-тригер
-- ------------------------------------------------------------
-- Кореневі: clients (корінь ланцюга проектів/вакансій), ats_candidates
-- (спільна база тенанта), довідники й шаблони. Дочірні (hiring_projects,
-- vacancies, applications, артефакти) успадкують тенант через FK-ланцюг —
-- денормалізація й RLS у Фазі 1b.
do $$
declare
  t text;
  roots text[] := array[
    'clients', 'ats_candidates', 'candidate_sources', 'rejection_reasons',
    'message_templates', 'pipeline_stage_templates'
  ];
begin
  foreach t in array roots loop
    execute format(
      'alter table public.%I add column if not exists tenant_id uuid references public.tenants(id) on delete restrict',
      t
    );
    execute format(
      'update public.%I set tenant_id = %L where tenant_id is null',
      t, '11111111-1111-1111-1111-111111111111'
    );
    execute format('drop trigger if exists trg_stamp_tenant on public.%I', t);
    execute format(
      'create trigger trg_stamp_tenant before insert on public.%I for each row execute function public.mp_stamp_tenant()',
      t
    );
  end loop;
end;
$$;

comment on table public.tenants is
  'Тенант = агенція. MetaVision Consulting — перший. Ізоляція між тенантами '
  'вмикається у Фазі 1b (tenant-предикати в RLS). Фаза 1a — лише структура.';
comment on function public.mp_current_tenant() is
  'Тенант поточного користувача (з profiles). Для RLS-предикатів Фази 1b.';
