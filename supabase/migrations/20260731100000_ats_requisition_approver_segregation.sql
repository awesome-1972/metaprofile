-- ============================================================
-- Requisition: пул затвердження = owner/admin (Партнер) + м'яка сегрегація
-- ============================================================
-- Рішення власника: затверджувати requisition можуть ЛИШЕ owner/admin (роль
-- «Партнер» має ключ 'owner'); «відповідальний рекрутер/creator» більше НЕ
-- затверджує (прибираємо гілку). М'яке розділення ролей: подавач НЕ затверджує
-- сам, ЯКЩО існує інший погоджувач (owner/admin, окрім нього); якщо він єдиний —
-- дозволяємо (щоб не блокувати роботу соло-власника).
-- ============================================================

-- Пул погоджувачів: лише owner/admin.
create or replace function public.mp_can_approve_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
$$;

create or replace function public.mp_can_approve_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
$$;

-- Чи існує ІНШИЙ погоджувач (owner/admin), окрім заданого користувача.
create or replace function public.mp_other_approver_exists(p_user uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.role in ('owner','admin')
      and ur.user_id is distinct from p_user
      and ur.tenant_id = public.mp_current_tenant()
  );
$$;

-- ── Guard вакансії: owner/admin + м'яка сегрегація ──────────────────────────
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
      -- М'яка сегрегація: подавач не затверджує сам, якщо є інший погоджувач.
      if auth.uid() is not distinct from old.requested_by
         and public.mp_other_approver_exists(auth.uid()) then
        raise exception 'Розділення ролей: цю заявку подали ви — рішення має ухвалити інший погоджувач (owner/admin).';
      end if;
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

-- ── Guard проекту: owner/admin + м'яка сегрегація ───────────────────────────
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
      if auth.uid() is not distinct from old.requested_by
         and public.mp_other_approver_exists(auth.uid()) then
        raise exception 'Розділення ролей: цю заявку подали ви — рішення має ухвалити інший погоджувач (owner/admin).';
      end if;
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
