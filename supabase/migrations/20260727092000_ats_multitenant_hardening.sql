-- ============================================================
-- ATS: Мультитенант — Фаза 1b-hardening (закриття дір аудиту)
-- ============================================================
-- Аудит безпеки виявив, що RESTRICTIVE tenant-gate (міграція 091000) захищає
-- ПРЯМІ запити authenticated, але лишає два вектори витоку між тенантами:
--
--   C1 (critical): усі mp_can_* helper-функції починаються з
--     `mp_is_workspace_admin() OR ...`, а admin-роль тенант-сліпа. Edge-функції
--     авторизуються через ці helper'и під JWT викликача, тому admin проходить на
--     ЧУЖИЙ ресурс за переданим id (helper повертає true, ігноруючи тенант).
--   C2 (high): profiles/user_roles не мали tenant-gate — прямий витік персоналу.
--
-- Фікс тут:
--   1) tenant-guard РЕСУРСУ в кожному mp_can_* — навіть admin не пройде на
--      ресурс іншого тенанта (перевірка tenant_id = mp_current_tenant() ЗАВЖДИ);
--   2) tenant_id + RESTRICTIVE gate на profiles і user_roles.
--
-- Поточну поведінку НЕ змінює: усі рядки й користувачі в MetaVision, тому
-- tenant_id = mp_current_tenant() завжди true. Ізоляція активується з 2-м тенантом.
--
-- Залишок (окремий крок перед 2-м тенантом): Edge-функції, що читають дані під
-- service_role ПІСЛЯ mp_can_* перевірки, тепер здебільшого закриті (helper
-- поверне false для чужого → forbidden). Прямі service_role-вибірки без mp_can_*
-- (grant-management list, erase-candidate) — окремий tenant-фільтр у коді функцій.
-- Див. TODO у docs/adr-multitenant-platform.md §7.
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles / user_roles — ізоляція (C2)
-- ------------------------------------------------------------
alter table public.user_roles
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

update public.user_roles set tenant_id = '11111111-1111-1111-1111-111111111111'
 where tenant_id is null;

create index if not exists idx_user_roles_tenant on public.user_roles (tenant_id);

drop trigger if exists trg_stamp_tenant on public.user_roles;
create trigger trg_stamp_tenant before insert on public.user_roles
  for each row execute function public.mp_stamp_tenant();

drop trigger if exists trg_stamp_tenant on public.profiles;
create trigger trg_stamp_tenant before insert on public.profiles
  for each row execute function public.mp_stamp_tenant();

-- RESTRICTIVE tenant-gate. profiles: користувач бачить лише профілі свого
-- тенанта (навіть глобальний admin). user_roles: так само.
drop policy if exists profiles_tenant_isolation on public.profiles;
create policy profiles_tenant_isolation on public.profiles
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

drop policy if exists user_roles_tenant_isolation on public.user_roles;
create policy user_roles_tenant_isolation on public.user_roles
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

-- ------------------------------------------------------------
-- 2. tenant-guard у mp_can_* helper-функціях (C1 корінь)
-- ------------------------------------------------------------
-- Патерн: результат = (ресурс належить моєму тенанту) AND (наявна scope-логіка).
-- Ресурс без tenant / неіснуючий → NULL/false → доступ false (fail-closed).

create or replace function public.mp_can_access_client(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select c.tenant_id from public.clients c where c.id = p_client_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.access_grants g
         where g.user_id = auth.uid() and g.is_active
           and (
             (g.scope_type = 'client'         and g.scope_id = p_client_id)
             or (g.scope_type = 'hiring_project' and g.scope_id in
                 (select hp.id from public.hiring_projects hp where hp.client_id = p_client_id))
           )
       )
     )
$$;

create or replace function public.mp_can_access_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select hp.tenant_id from public.hiring_projects hp where hp.id = p_project_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.hiring_projects hp
         join public.access_grants g on g.user_id = auth.uid() and g.is_active
         where hp.id = p_project_id
           and ((g.scope_type = 'hiring_project' and g.scope_id = hp.id)
             or (g.scope_type = 'client' and g.scope_id = hp.client_id))
       )
     )
$$;

create or replace function public.mp_can_access_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select v.tenant_id from public.vacancies v where v.id = p_vacancy_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.vacancies v
         where v.id = p_vacancy_id and public.mp_can_access_project(v.hiring_project_id)
       )
     )
$$;

create or replace function public.mp_can_access_application(p_application_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select a.tenant_id from public.applications a where a.id = p_application_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.applications a
         where a.id = p_application_id and public.mp_can_access_vacancy(a.vacancy_id)
       )
     )
$$;

create or replace function public.mp_can_view_financials_for_client(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select c.tenant_id from public.clients c where c.id = p_client_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.access_grants g
         where g.user_id = auth.uid() and g.is_active and g.can_view_financials
           and ((g.scope_type = 'client' and g.scope_id = p_client_id)
             or (g.scope_type = 'hiring_project' and g.scope_id in
                 (select hp.id from public.hiring_projects hp where hp.client_id = p_client_id)))
       )
     )
$$;

create or replace function public.mp_can_view_vacancy_financials(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select v.tenant_id from public.vacancies v where v.id = p_vacancy_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.vacancies v
         join public.hiring_projects hp on hp.id = v.hiring_project_id
         where v.id = p_vacancy_id and public.mp_can_view_financials_for_client(hp.client_id)
       )
     )
$$;

create or replace function public.mp_can_edit_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select v.tenant_id from public.vacancies v where v.id = p_vacancy_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.vacancies v
         join public.hiring_projects hp on hp.id = v.hiring_project_id
         join public.access_grants g on g.user_id = auth.uid() and g.is_active and g.can_edit
         where v.id = p_vacancy_id
           and ((g.scope_type = 'hiring_project' and g.scope_id = hp.id)
             or (g.scope_type = 'client' and g.scope_id = hp.client_id))
       )
     )
$$;

create or replace function public.mp_can_edit_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select hp.tenant_id from public.hiring_projects hp where hp.id = p_project_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (
         select 1 from public.hiring_projects hp
         join public.access_grants g on g.user_id = auth.uid() and g.is_active and g.can_edit
         where hp.id = p_project_id
           and ((g.scope_type = 'hiring_project' and g.scope_id = hp.id)
             or (g.scope_type = 'client' and g.scope_id = hp.client_id))
       )
     )
$$;

create or replace function public.mp_can_access_candidate(p_candidate_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select c.tenant_id from public.ats_candidates c where c.id = p_candidate_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (select 1 from public.ats_candidates c where c.id = p_candidate_id and c.created_by = auth.uid())
       or exists (
         select 1 from public.applications a
         where a.candidate_id = p_candidate_id and public.mp_can_access_vacancy(a.vacancy_id)
       )
     )
$$;

create or replace function public.mp_can_edit_candidate(p_candidate_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select (select c.tenant_id from public.ats_candidates c where c.id = p_candidate_id) = public.mp_current_tenant()
     and (
       public.mp_is_workspace_admin()
       or exists (select 1 from public.ats_candidates c where c.id = p_candidate_id and c.created_by = auth.uid())
       or exists (
         select 1 from public.applications a
         where a.candidate_id = p_candidate_id and public.mp_can_edit_vacancy(a.vacancy_id)
       )
     )
$$;
