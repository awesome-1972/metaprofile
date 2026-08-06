-- ============================================================
-- Повернути tenant-ізоляцію на identity-таблиці (profiles / user_roles)
-- ============================================================
-- Раніше гейт зняли (096000), бо mp_current_tenant повертав NULL до встановлення
-- контексту й ховав власний рядок → ламався вхід. Тепер mp_current_tenant =
-- coalesce(profiles.tenant_id власного профілю, MetaVision) через SECURITY DEFINER
-- (обходить RLS), тож користувач ЗАВЖДИ бачить свій рядок (tenant = свій tenant)
-- → вхід не ламається, але чужих тенантів більше не видно.
--
-- Передумови безпеки (виконуються тут же):
--   1) бекфіл усіх NULL tenant_id → MetaVision (щоб ніхто не лишився «сиротою»);
--   2) DEFAULT tenant_id = MetaVision (нові signup ніколи не NULL).
-- ============================================================

do $$
declare meta constant uuid := '11111111-1111-1111-1111-111111111111';
begin
  update public.profiles   set tenant_id = meta where tenant_id is null;
  update public.user_roles set tenant_id = meta where tenant_id is null;
end $$;

alter table public.profiles   alter column tenant_id set default '11111111-1111-1111-1111-111111111111';
alter table public.user_roles alter column tenant_id set default '11111111-1111-1111-1111-111111111111';

-- RESTRICTIVE tenant-gate (комбінується AND з наявними permissive-політиками).
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
