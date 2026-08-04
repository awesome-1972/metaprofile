-- ============================================================
-- Fix: створення клієнта падало «Немає доступу» (42501 на INSERT ... RETURNING)
-- ============================================================
-- Той самий клас, що ats_candidates / vacancies / hiring_projects (міграції
-- 20260730090000 і 20260730110000), але clients тоді НЕ переписали. Після
-- мультитенант-харденінгу (20260727092000) функцію mp_can_access_client
-- переписали так, що вона сама робить (select c.tenant_id from clients c
-- where c.id = p_client_id) — тобто SELECT-політика clients знову
-- САМОПОСИЛАЄТЬСЯ на clients. Під час INSERT ... RETURNING (клієнтський
-- .insert().select()) щойно вставлений рядок ще не в snapshot цієї STABLE-
-- функції → self-select порожній → предикат false → рядок «невидимий» →
-- RLS-violation → «Немає доступу» навіть для owner/admin.
--
-- Виправлення (як для vacancies/projects): PERMISSIVE clients_select на ПРЯМІ
-- колонки рядка (clients.id) + гранти по access_grants/hiring_projects (інші
-- таблиці — self-select clients зникає). Тенант-ізоляцію й далі гарантує
-- RESTRICTIVE clients_tenant_isolation. Функцію mp_can_access_client НЕ чіпаємо
-- (використовується деінде за значенням колонки, де self-select коректний).
-- ============================================================

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select to authenticated
  using (
    public.mp_is_workspace_admin()
    or exists (
      select 1 from public.access_grants g
      where g.user_id = auth.uid()
        and g.is_active
        and (
          (g.scope_type = 'client' and g.scope_id = clients.id)
          or (g.scope_type = 'hiring_project' and g.scope_id in
              (select hp.id from public.hiring_projects hp where hp.client_id = clients.id))
        )
    )
  );

comment on policy clients_select on public.clients is
  'admin / грант на клієнта чи його проєкт (прямі колонки clients.id). '
  'Тенант — RESTRICTIVE clients_tenant_isolation. Прямі колонки — безпечно для INSERT...RETURNING.';
