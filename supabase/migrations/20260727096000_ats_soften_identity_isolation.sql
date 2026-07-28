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
