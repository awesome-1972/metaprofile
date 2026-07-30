-- ============================================================
-- Fix: INSERT ... RETURNING на ats_candidates падав з 42501
-- ("new row violates row-level security policy")
-- ============================================================
-- Симптом: клієнтська вставка кандидата (supabase .insert().select()) —
-- 403/42501. Діагностика: вставка БЕЗ returning проходить, З returning —
-- падає; усі WITH CHECK-предикати (mp_is_internal, tenant=mp_current_tenant)
-- окремо true.
--
-- Першопричина: при INSERT ... RETURNING Postgres застосовує SELECT-політику
-- до щойно вставленого рядка. SELECT-політика викликала mp_can_access_candidate(id),
-- яка САМА робить (select tenant_id from ats_candidates where id = ...). Ця
-- STABLE security-definer функція бачить snapshot на початок стейтменту, де
-- новий рядок ще НЕ існує → підзапит повертає NULL → верхній предикат
-- (tenant = mp_current_tenant()) стає NULL/false → рядок «невидимий» →
-- RETURNING кидає RLS-violation. Явний tenant_id не рятує, бо ламається саме
-- самопосилальний lookup, а не значення колонки. Edge (service_role, без
-- self-select) тому й працює.
--
-- Виправлення: тенант-ізоляцію вже гарантує RESTRICTIVE-політика
-- ats_candidates_tenant_isolation (tenant_id = mp_current_tenant() —
-- посилання на КОЛОНКУ рядка напряму, працює і на RETURNING). Тож у
-- PERMISSIVE SELECT-політиці прибираємо дубльований самопосилальний
-- tenant-lookup і посилаємось на колонки рядка (created_by, id) напряму.
-- Сумарна семантика (permissive AND restrictive) = та сама:
--   tenant AND (admin OR creator OR доступ через заявку). Безпека не слабшає.
--
-- Плюс: created_by за замовчуванням = auth.uid(), щоб автор одразу бачив свій
-- новий рядок (гілка created_by = auth.uid()) — важливо для рекрутерів, не лише
-- admin. mp_can_access_candidate(id) НЕ чіпаємо (використовується деінде).
-- ============================================================

alter table public.ats_candidates alter column created_by set default auth.uid();

drop policy if exists ats_candidates_select on public.ats_candidates;
create policy ats_candidates_select on public.ats_candidates
  for select to authenticated
  using (
    public.mp_is_workspace_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.applications a
      where a.candidate_id = ats_candidates.id
        and public.mp_can_access_vacancy(a.vacancy_id)
    )
  );

comment on policy ats_candidates_select on public.ats_candidates is
  'Доступ до кандидата: admin / автор / через заявку до доступної вакансії. '
  'Тенант-ізоляція — RESTRICTIVE ats_candidates_tenant_isolation. Посилання на '
  'колонки напряму (не через mp_can_access_candidate), щоб не ламати INSERT...RETURNING.';
