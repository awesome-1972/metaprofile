-- ============================================================
-- Fix: INSERT ... RETURNING на vacancies / hiring_projects давав 42501
-- ============================================================
-- Той самий клас, що й ats_candidates (міграція 20260730090000): SELECT-політики
-- викликали mp_can_access_vacancy(id) / mp_can_access_project(id), які САМІ
-- роблять (select ... from vacancies/hiring_projects where id=...). Під час
-- INSERT ... RETURNING (клієнтський .insert().select()) щойно вставлений рядок
-- ще не в snapshot цих STABLE-функцій → self-select повертає NULL/порожньо →
-- предикат false → рядок «невидимий» → RLS-violation (створення вакансії/проекту
-- падало з «Немає доступу»).
--
-- Виправлення: переписуємо PERMISSIVE SELECT-політики на ПРЯМІ посилання на
-- колонки рядка (hiring_project_id / client_id / id) замість самопосилальних
-- функцій. Тенант-ізоляцію гарантує RESTRICTIVE *_tenant_isolation. Сумарна
-- семантика (permissive AND restrictive) не змінюється. Функції
-- mp_can_access_vacancy/project НЕ чіпаємо (використовуються деінде за значенням
-- колонки, де self-select працює коректно).
-- ============================================================

-- ── vacancies: admin OR доступ до проєкту-батька (hiring_project_id — пряма колонка)
drop policy if exists vacancies_select on public.vacancies;
create policy vacancies_select on public.vacancies
  for select to authenticated
  using (
    public.mp_is_workspace_admin()
    or public.mp_can_access_project(hiring_project_id)
  );

comment on policy vacancies_select on public.vacancies is
  'admin / доступ до проєкту-батька (через пряму колонку hiring_project_id). '
  'Тенант — RESTRICTIVE vacancies_tenant_isolation. Прямі колонки, щоб не ламати INSERT...RETURNING.';

-- ── hiring_projects: admin OR грант на проєкт/клієнта (id / client_id — прямі колонки)
drop policy if exists hiring_projects_select on public.hiring_projects;
create policy hiring_projects_select on public.hiring_projects
  for select to authenticated
  using (
    public.mp_is_workspace_admin()
    or exists (
      select 1 from public.access_grants g
      where g.user_id = auth.uid()
        and g.is_active
        and (
          (g.scope_type = 'hiring_project' and g.scope_id = hiring_projects.id)
          or (g.scope_type = 'client' and g.scope_id = hiring_projects.client_id)
        )
    )
  );

comment on policy hiring_projects_select on public.hiring_projects is
  'admin / грант на проєкт або клієнта (прямі колонки id/client_id). '
  'Тенант — RESTRICTIVE hiring_projects_tenant_isolation. Прямі колонки — безпечно для INSERT...RETURNING.';
