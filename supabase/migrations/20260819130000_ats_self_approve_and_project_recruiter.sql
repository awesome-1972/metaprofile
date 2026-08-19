-- ============================================================
-- Requisition: дозволити owner/admin самозатвердження + рекрутер на проект
-- ============================================================
-- 1) Рішення власника: owner/admin (Партнер) МОЖЕ затверджувати власну заявку
--    (прибираємо м'яку сегрегацію «подавач ≠ погоджувач»). Пул погоджувачів
--    лишається owner/admin. Функція mp_other_approver_exists більше не потрібна
--    у guard, але лишаємо її в БД (можливе повторне використання).
-- 2) hiring_projects.assigned_recruiter_id — відповідальний рекрутер на проект
--    (денормалізація для UI/фільтрів, як у vacancies).
-- ============================================================

-- ── Guard вакансії: owner/admin, без самосегрегації ─────────────────────────
create or replace function public.mp_vacancies_requisition_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_decision constant public.requisition_approval_status[] :=
    array['approved','changes_requested','rejected']::public.requisition_approval_status[];
begin
  if new.approval_status is distinct from old.approval_status then
    if new.approval_status = any (v_decision) then
      if not public.mp_can_approve_vacancy(new.id) then
        raise exception 'лише owner/admin (Партнер) може ухвалювати рішення по заявці вакансії %', new.id
          using errcode = '42501';
      end if;
      -- Самозатвердження owner/admin дозволено (сегрегацію знято).
    end if;

    if new.approval_status = 'pending_approval' then
      new.submitted_at := now();
      new.requested_by := coalesce(new.requested_by, auth.uid());
    elsif new.approval_status = any (v_decision) then
      new.approved_by := auth.uid();
      new.approved_at := now();
    elsif new.approval_status = 'draft' then
      new.approved_by := null;
      new.approved_at := null;
      new.submitted_at := null;
    end if;
  end if;

  if new.status = 'open' and old.status is distinct from 'open' then
    if new.approval_status <> 'approved' then
      raise exception 'вакансію % не можна відкрити, доки її requisition не approved (зараз: %)',
        new.id, new.approval_status using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.hiring_projects hp
      where hp.id = new.hiring_project_id and hp.approval_status = 'approved'
    ) then
      raise exception 'вакансію % не можна відкрити, доки не approved проект-батько', new.id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

-- ── Guard проекту: owner/admin, без самосегрегації ──────────────────────────
create or replace function public.mp_hiring_projects_requisition_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_decision constant public.requisition_approval_status[] :=
    array['approved','changes_requested','rejected']::public.requisition_approval_status[];
begin
  if new.approval_status is distinct from old.approval_status then
    if new.approval_status = any (v_decision) then
      if not public.mp_can_approve_project(new.id) then
        raise exception 'лише owner/admin (Партнер) може ухвалювати рішення по заявці проекту %', new.id
          using errcode = '42501';
      end if;
      -- Самозатвердження owner/admin дозволено (сегрегацію знято).
    end if;

    if new.approval_status = 'pending_approval' then
      new.submitted_at := now();
      new.requested_by := coalesce(new.requested_by, auth.uid());
    elsif new.approval_status = any (v_decision) then
      new.approved_by := auth.uid();
      new.approved_at := now();
    elsif new.approval_status = 'draft' then
      new.approved_by := null;
      new.approved_at := null;
      new.submitted_at := null;
    end if;
  end if;

  if new.status = 'active' and old.status is distinct from 'active' then
    if new.approval_status <> 'approved' then
      raise exception 'проект % не можна активувати, доки його requisition не approved (зараз: %)',
        new.id, new.approval_status using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

-- ── Рекрутер на проект найму ────────────────────────────────────────────────
alter table public.hiring_projects
  add column if not exists assigned_recruiter_id uuid references auth.users(id) on delete set null;

create index if not exists idx_hiring_projects_assigned_recruiter
  on public.hiring_projects (assigned_recruiter_id);

comment on column public.hiring_projects.assigned_recruiter_id is
  'Відповідальний рекрутер проекту (денормалізація для UI/фільтрів; грант — access_grants scope_type=hiring_project).';
