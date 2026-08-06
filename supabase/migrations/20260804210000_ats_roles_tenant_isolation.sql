-- ============================================================
-- Tenant-ізоляція таблиці кастомних ролей (roles)
-- ============================================================
-- Гейт знімався разом з identity (096000). Повертаємо тим самим безпечним
-- патерном: бекфіл NULL → MetaVision, DEFAULT, RESTRICTIVE gate. roles читається
-- напряму під RLS (useRoles), тож гейта достатньо — Edge не задіяний.
-- ============================================================

update public.roles set tenant_id = '11111111-1111-1111-1111-111111111111' where tenant_id is null;
alter table public.roles alter column tenant_id set default '11111111-1111-1111-1111-111111111111';

drop policy if exists roles_tenant_isolation on public.roles;
create policy roles_tenant_isolation on public.roles
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());
