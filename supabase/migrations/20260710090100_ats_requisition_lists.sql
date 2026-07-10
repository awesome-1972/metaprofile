-- ============================================================
-- Metaprofile ATS — MVP+ (roadmap-ATS-platform.md розділ 2):
--   1) Requisition + approval flow (draft→approve) на ОБОХ рівнях —
--      hiring_projects (замовлення клієнта) і vacancies (окрема позиція).
--   2) Long list / Short list як СТАНИ заявки (applications.list_state),
--      ортогональні до стадії воронки (current_stage_id) і status.
--
-- Порядок (важливо для backfill vs тригери): enum → колонки → BACKFILL →
-- індекси → helper-функції → guard-тригери. BACKFILL має відпрацювати ДО
-- створення guard-тригерів, інакше масовий UPDATE існуючих рядків спрацював
-- би під service_role (auth.uid()=NULL) і guard кинув би 42501.
--
-- Стиль дзеркалить 20260704*/20260706090000: security definer + stable +
-- search_path=public helper-функції; guard-тригери за зразком
-- mp_applications_immutable_scope; RLS не змінюється (нові колонки підпадають
-- під наявні row-level політики — див. коментар у кінці).
-- Нове значення application_event_type='list_state_changed' додане окремою
-- попередньою міграцією 20260710090000_ats_requisition_lists_enum.sql.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Доменні enum-типи (нові CREATE TYPE — безпечно в одній транзакції з
--    подальшим використанням; обмеження стосується лише ALTER TYPE ADD VALUE).
-- ------------------------------------------------------------
create type public.requisition_approval_status as enum
  ('draft','pending_approval','approved','changes_requested','rejected');

create type public.list_state as enum ('none','long_list','short_list');

-- ------------------------------------------------------------
-- 2. Approval-колонки на hiring_projects і vacancies (однакова форма)
-- ------------------------------------------------------------
-- Requisition = формальна заявка на підбір із зафіксованим замовником і
-- слідом затвердження. approval_status незалежний від status: спершу
-- requisition проходить draft→pending_approval→approved, і лише approved
-- дозволяє перевести робочий status у 'active' (проект) / 'open' (вакансія) —
-- див. guard-тригери нижче.
alter table public.hiring_projects
  add column approval_status public.requisition_approval_status not null default 'draft',
  add column requested_by    uuid references auth.users(id) on delete set null,
  add column submitted_at     timestamptz,
  add column approved_by      uuid references auth.users(id) on delete set null,
  add column approved_at      timestamptz,
  add column approval_note    text;

alter table public.vacancies
  add column approval_status public.requisition_approval_status not null default 'draft',
  add column requested_by    uuid references auth.users(id) on delete set null,
  add column submitted_at     timestamptz,
  add column approved_by      uuid references auth.users(id) on delete set null,
  add column approved_at      timestamptz,
  add column approval_note    text;

comment on column public.vacancies.approval_status is
  'Стан requisition вакансії: draft→pending_approval→approved (або '
  'changes_requested/rejected). Тільки approved (І approved проект-батько) '
  'дозволяє status→open (guard mp_vacancies_requisition_guard).';
comment on column public.hiring_projects.approval_status is
  'Стан requisition проекту найму: draft→pending_approval→approved. Тільки '
  'approved дозволяє status→active (guard mp_hiring_projects_requisition_guard).';

-- ------------------------------------------------------------
-- 3. list_state на applications (Long/Short list як стани)
-- ------------------------------------------------------------
-- 'none' — заявка в роботі у воронці, ще не винесена в списки; 'long_list' —
-- маса на розгляді; 'short_list' — фінал для клієнта. Ортогонально до
-- current_stage_id (стадія процесу) — кандидат може бути на стадії
-- 'interview' І в short_list одночасно.
alter table public.applications
  add column list_state public.list_state not null default 'none',
  add column listed_at  timestamptz,
  add column listed_by  uuid references auth.users(id) on delete set null;

comment on column public.applications.list_state is
  'Стан списку заявки (none/long_list/short_list) — ортогональний до '
  'current_stage_id. Промоушен фіксується listed_at/listed_by і подією '
  'application_events.list_state_changed (metadata {from,to}).';

-- ------------------------------------------------------------
-- 4. BACKFILL існуючих рядків (ДО створення guard-тригерів!)
-- ------------------------------------------------------------
-- Уже "живі" (не-draft) проекти/вакансії логічно вважати затвердженими —
-- інакше guard заблокував би будь-який їх подальший перехід у active/open.
-- Draft/cancelled лишаються 'draft' (approval ще не проходило).
update public.hiring_projects
   set approval_status = 'approved',
       approved_at = coalesce(approved_at, updated_at),
       approved_by = coalesce(approved_by, created_by)
 where status in ('active','on_hold','closed');

update public.vacancies
   set approval_status = 'approved',
       approved_at = coalesce(approved_at, updated_at),
       approved_by = coalesce(approved_by, created_by)
 where status in ('open','on_hold','filled','closed');

-- ------------------------------------------------------------
-- 5. Індекси (черга "на затвердження" + фільтр списків)
-- ------------------------------------------------------------
create index idx_hiring_projects_approval on public.hiring_projects (approval_status);
create index idx_vacancies_approval       on public.vacancies (approval_status);
create index idx_applications_list_state  on public.applications (vacancy_id, list_state);

-- ------------------------------------------------------------
-- 6. Helper-функції: ХТО МОЖЕ ЗАТВЕРДЖУВАТИ requisition
-- ------------------------------------------------------------
-- Рішення власника: owner/admin АБО відповідальна особа. Для вакансії
-- відповідальний = assigned_recruiter_id / hiring_manager_id / creator;
-- для проекту = creator (ведучий, хто завів замовлення). Подати на
-- затвердження (draft→pending_approval) може будь-який редактор (RLS
-- update = mp_can_edit_*) — ці функції гейтять ЛИШЕ decision-переходи
-- (approved/changes_requested/rejected) у guard-тригерах нижче.
create or replace function public.mp_can_approve_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.vacancies v
        where v.id = p_vacancy_id
          and auth.uid() in (v.assigned_recruiter_id, v.hiring_manager_id, v.created_by)
      )
$$;

create or replace function public.mp_can_approve_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.hiring_projects hp
        where hp.id = p_project_id
          and auth.uid() = hp.created_by
      )
$$;

-- ------------------------------------------------------------
-- 7. Guard-тригер вакансії: авторизація рішення + серверний stamp +
--    гейт status→open (both-level ієрархія: вакансія І її проект approved).
-- ------------------------------------------------------------
create or replace function public.mp_vacancies_requisition_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_decision constant public.requisition_approval_status[] :=
    array['approved','changes_requested','rejected']::public.requisition_approval_status[];
begin
  if new.approval_status is distinct from old.approval_status then
    -- Decision-переходи — лише owner/admin або відповідальний.
    if new.approval_status = any (v_decision)
       and not public.mp_can_approve_vacancy(new.id) then
      raise exception 'only owner/admin or the responsible person can decide requisition for vacancy %', new.id
        using errcode = '42501';
    end if;

    -- Серверний stamp (клієнту достатньо виставити approval_status + note).
    if new.approval_status = 'pending_approval' then
      new.submitted_at := now();
      new.requested_by := coalesce(new.requested_by, auth.uid());
    elsif new.approval_status = any (v_decision) then
      new.approved_by := auth.uid();
      new.approved_at := now();
    elsif new.approval_status = 'draft' then
      -- Повернення в чернетку (редагування після changes_requested) — чистимо слід рішення.
      new.approved_by := null;
      new.approved_at := null;
      new.submitted_at := null;
    end if;
  end if;

  -- Вакансію не можна ВІДКРИТИ, доки її requisition НЕ approved І проект-батько НЕ approved.
  if new.status = 'open' and old.status is distinct from 'open' then
    if new.approval_status <> 'approved' then
      raise exception 'vacancy % cannot be opened before its requisition is approved (current: %)',
        new.id, new.approval_status using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.hiring_projects hp
      where hp.id = new.hiring_project_id and hp.approval_status = 'approved'
    ) then
      raise exception 'vacancy % cannot be opened before its hiring project requisition is approved', new.id
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_vacancies_requisition_guard
  before update on public.vacancies
  for each row execute function public.mp_vacancies_requisition_guard();

-- ------------------------------------------------------------
-- 8. Guard-тригер проекту: авторизація рішення + stamp + гейт status→active.
-- ------------------------------------------------------------
create or replace function public.mp_hiring_projects_requisition_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  v_decision constant public.requisition_approval_status[] :=
    array['approved','changes_requested','rejected']::public.requisition_approval_status[];
begin
  if new.approval_status is distinct from old.approval_status then
    if new.approval_status = any (v_decision)
       and not public.mp_can_approve_project(new.id) then
      raise exception 'only owner/admin or the responsible person can decide requisition for project %', new.id
        using errcode = '42501';
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

  if new.status = 'active' and old.status is distinct from 'active'
     and new.approval_status <> 'approved' then
    raise exception 'hiring project % cannot be activated before its requisition is approved (current: %)',
      new.id, new.approval_status using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger trg_hiring_projects_requisition_guard
  before update on public.hiring_projects
  for each row execute function public.mp_hiring_projects_requisition_guard();

-- ------------------------------------------------------------
-- 9. list_state: серверний stamp (BEFORE) + аудит-подія (AFTER)
-- ------------------------------------------------------------
create or replace function public.mp_applications_list_state_stamp()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.list_state is distinct from old.list_state then
    new.listed_at := now();
    new.listed_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger trg_applications_list_state_stamp
  before update of list_state on public.applications
  for each row execute function public.mp_applications_list_state_stamp();

-- Аудит у append-only журнал (roadmap §5 — усі "list" операції під audit log).
-- actor_id=auth.uid(); metadata {from,to} за аналогією зі stage_changed.
create or replace function public.mp_log_list_state_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.list_state is distinct from old.list_state then
    insert into public.application_events (application_id, event_type, actor_id, metadata)
    values (
      new.id, 'list_state_changed', auth.uid(),
      jsonb_build_object('from', old.list_state::text, 'to', new.list_state::text)
    );
  end if;
  return new;
end;
$$;

create trigger trg_log_list_state_change
  after update of list_state on public.applications
  for each row execute function public.mp_log_list_state_change();

-- ------------------------------------------------------------
-- 10. RLS — БЕЗ ЗМІН
-- ------------------------------------------------------------
-- Нові колонки підпадають під наявні row-level політики:
--   • hiring_projects_update / vacancies_update → mp_can_edit_project /
--     mp_can_edit_vacancy (submit requisition, редагування);
--   • applications_update → mp_can_edit_vacancy (зміна list_state).
-- Тонше правило "хто може ПРИЙМАТИ рішення по requisition" накладається
-- guard-тригерами (mp_can_approve_*), а не RLS — RLS дозволяє UPDATE рядка,
-- тригер відхиляє неавторизований decision-перехід. Нових/змінених policy
-- не потрібно (row-level, не column-level RLS).
