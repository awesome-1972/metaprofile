-- ============================================================
-- ATS: RBAC — крок 2/2 (ролі з правами + кастомні ролі)
-- ============================================================
-- Гібрид (рішення власника): системні ролі (owner/admin/recruiter/assistant/
-- visitor) лишаються технічними, ПЛЮС кастомні ролі під запит. Право = флаг
-- `домен.дія`. Роль = набір флагів. Два виміри: роль = ЩО можна, access_grants
-- = НАД ЧИМ (scope). Ця міграція додає вимір «ЩО»; scope не чіпає.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Таблиця ролей (системні + кастомні, per tenant)
-- ------------------------------------------------------------
create table public.roles (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  -- key для системних ролей = значення app_role (owner/admin/...); NULL — кастомна.
  key         text,
  name        text not null,
  is_system   boolean not null default false,
  permissions text[] not null default '{}',
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index uq_roles_tenant_key on public.roles (tenant_id, key) where key is not null;
create index idx_roles_tenant on public.roles (tenant_id);

alter table public.roles enable row level security;

create trigger set_updated_at_roles
  before update on public.roles
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_stamp_tenant on public.roles;
create trigger trg_stamp_tenant before insert on public.roles
  for each row execute function public.mp_stamp_tenant();

-- Читати ролі — будь-який внутрішній користувач; керувати — лише хто має право
-- roles.manage (перевірка у застосунку/адмін-UI; тут базова гілка admin).
create policy roles_select on public.roles
  for select to authenticated
  using (public.mp_is_internal());

create policy roles_write on public.roles
  for all to authenticated
  using (public.mp_is_workspace_admin())
  with check (public.mp_is_workspace_admin());

create policy roles_tenant_isolation on public.roles
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

-- ------------------------------------------------------------
-- 2. Seed системних ролей для MetaVision (пресети прав)
-- ------------------------------------------------------------
insert into public.roles (tenant_id, key, name, is_system, permissions) values
  ('11111111-1111-1111-1111-111111111111', 'admin', 'Адмін', true, array[
    'clients.view','clients.edit','clients.archive',
    'projects.view','projects.edit','projects.archive',
    'vacancies.view','vacancies.edit','vacancies.create',
    'funnel.edit','candidates.view','candidates.edit','candidates.erase',
    'applications.manage','communications.send','financials.view',
    'reports.generate','files.manage','users.manage','roles.manage','tenant.settings'
  ]),
  ('11111111-1111-1111-1111-111111111111', 'owner', 'Партнер', true, array[
    'clients.view','clients.edit','clients.archive',
    'projects.view','projects.edit','projects.archive',
    'vacancies.view','vacancies.edit','vacancies.create',
    'funnel.edit','candidates.view','candidates.edit','candidates.erase',
    'applications.manage','communications.send','financials.view',
    'reports.generate','files.manage','users.manage'
  ]),
  ('11111111-1111-1111-1111-111111111111', 'recruiter', 'Рекрутер', true, array[
    'clients.view','projects.view',
    'vacancies.view','vacancies.edit','vacancies.create',
    'funnel.edit','candidates.view','candidates.edit',
    'applications.manage','communications.send','reports.generate','files.manage'
  ]),
  ('11111111-1111-1111-1111-111111111111', 'assistant', 'Асистент', true, array[
    'clients.view','projects.view','vacancies.view','candidates.view',
    'applications.manage','communications.send','files.manage'
  ]),
  ('11111111-1111-1111-1111-111111111111', 'visitor', 'Відвідувач', true, array[
    'clients.view','projects.view','vacancies.view','candidates.view'
  ]);

-- ------------------------------------------------------------
-- 3. Звʼязок користувач ↔ роль (гібрид: enum АБО кастомна role_id)
-- ------------------------------------------------------------
alter table public.user_roles
  add column if not exists role_id uuid references public.roles(id) on delete cascade;

-- ------------------------------------------------------------
-- 4. Helper'и прав
-- ------------------------------------------------------------
-- Чи має поточний користувач право `perm` через будь-яку зі своїх ролей
-- (системну — за enum-ключем, або кастомну — за role_id), у межах свого тенанта.
create or replace function public.mp_has_permission(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r
      on r.tenant_id = ur.tenant_id
     and (r.key = ur.role::text or r.id = ur.role_id)
    where ur.user_id = auth.uid()
      and ur.tenant_id = public.mp_current_tenant()
      and p_perm = any(r.permissions)
  )
$$;

grant execute on function public.mp_has_permission(text) to authenticated;

-- Усі права поточного користувача (для UI-гейтингу — один запит).
create or replace function public.mp_my_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct p), '{}')
  from (
    select unnest(r.permissions) as p
    from public.user_roles ur
    join public.roles r
      on r.tenant_id = ur.tenant_id
     and (r.key = ur.role::text or r.id = ur.role_id)
    where ur.user_id = auth.uid()
      and ur.tenant_id = public.mp_current_tenant()
  ) perms
$$;

grant execute on function public.mp_my_permissions() to authenticated;

comment on table public.roles is
  'Ролі RBAC: системні (key=app_role, is_system) + кастомні під запит. '
  'permissions — масив флагів домен.дія. Роль = ЩО можна; scope (access_grants) = НАД ЧИМ.';
