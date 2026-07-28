-- ============================================================
-- ATS: Призначення кастомних ролей користувачам
-- ============================================================
-- Кастомна роль призначається окремим рядком user_roles з role_id (посилання
-- на roles), БЕЗ enum-значення role. Тому role стає nullable: рядок = або
-- системна роль (role enum, role_id NULL), або кастомна (role NULL, role_id set).
-- mp_has_permission/mp_my_permissions уже join'ять `r.key = ur.role::text OR
-- r.id = ur.role_id` — обидва варіанти рядка резолвляться коректно.
-- ============================================================

alter table public.user_roles alter column role drop not null;

-- Унікальність кастомної ролі на користувача (щоб не дублювати призначення).
create unique index if not exists uq_user_roles_custom
  on public.user_roles (user_id, role_id) where role_id is not null;

-- Admin/owner мають бачити ролі ВСІХ користувачів (для картки користувача).
-- Наявна політика user_roles_select дозволяє лише свій рядок (user_id=auth.uid).
drop policy if exists user_roles_admin_select on public.user_roles;
create policy user_roles_admin_select on public.user_roles
  for select to authenticated
  using (public.mp_is_workspace_admin());

comment on column public.user_roles.role_id is
  'Кастомна роль (FK roles). Заповнена → рядок кастомної ролі (role NULL). '
  'Порожня → рядок системної ролі (role enum).';
