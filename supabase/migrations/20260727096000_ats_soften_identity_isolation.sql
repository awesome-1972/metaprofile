-- ============================================================
-- ATS: Мультитенант — послаблення ізоляції для identity-таблиць
-- ============================================================
-- Під час накатки виявилось: RESTRICTIVE tenant-gate на profiles/user_roles/roles
-- замикає САМ вхід у застосунок. Причина: useAuthV2 читає profiles+user_roles ще
-- ДО того, як tenant-контекст повністю встановлено, і `tenant_id = mp_current_tenant()`
-- дає false (mp_current_tenant() ще NULL) → роль не видно → редірект на /v2/auth.
--
-- Рішення: identity-таблиці (profiles, user_roles, roles) НЕ ізолюємо жорстким
-- tenant-gate. Їхня безпека тримається на наявних PERMISSIVE-політиках:
--   • profiles/user_roles — «користувач бачить лише свій рядок» (user_id=auth.uid);
--   • roles — читає internal, керує admin.
-- Для одного тенанта це повна ізоляція. Для МАЙБУТНЬОГО 2-го тенанта ізоляцію цих
-- таблиць треба вводити інакше (напр. фільтр у застосунку/Edge, або gate, що
-- толерує NULL-tenant на етапі логіну) — окремою задачею перед продажем платформи.
--
-- Ця міграція фіксує в коді те, що вже зроблено руками в проді (drop 3 політик),
-- щоб чистий передеплой не повернув пастку входу. Ідемпотентна.
-- ============================================================

drop policy if exists profiles_tenant_isolation   on public.profiles;
drop policy if exists user_roles_tenant_isolation  on public.user_roles;
drop policy if exists roles_tenant_isolation       on public.roles;

-- ------------------------------------------------------------
-- mp_current_tenant() з fallback на MetaVision
-- ------------------------------------------------------------
-- Пастка: якщо auth-акаунт не має рядка в profiles (напр. створений поза
-- інвайт-флоу), mp_current_tenant() = NULL → RLS ховає ВСІ дані. Поки тенант
-- один, робимо запобіжник: немає профілю → MetaVision. Прибрати fallback перед
-- 2-м тенантом (тоді відсутність профілю має fail-closed, а не default-tenant).
create or replace function public.mp_current_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select tenant_id from public.profiles where user_id = auth.uid() limit 1),
    '11111111-1111-1111-1111-111111111111'::uuid
  );
$$;
