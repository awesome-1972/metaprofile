-- ============================================================
-- Metaprofile ATS — крок 2/7: доменні enum-типи + базові helper-функції
-- Спец.: docs/specs/metaprofile-ats-schema.md (розділи 2.2, 3.1, 3.2)
-- Порядок міграцій (розділ 8): кроки 2 (enum) + 3 (updated_at) + частина 20
--   (mp_is_workspace_admin / mp_is_internal — не залежать від ATS-таблиць,
--   тому їх безпечно створити тут, а не відкладати до кроку 20).
-- ============================================================

-- ------------------------------------------------------------
-- 2.2 Доменні enum-типи ATS
-- ------------------------------------------------------------
create type public.client_status        as enum ('active','prospect','archived');
create type public.hiring_project_status as enum ('draft','active','on_hold','closed','cancelled');
create type public.vacancy_status        as enum ('draft','open','on_hold','filled','closed','cancelled');
create type public.employment_type       as enum ('full_time','part_time','contract','internship','temporary');

-- 'assessment' — міст до Metaprofile-оцінки (M4a.8, case_assignments).
create type public.stage_type as enum (
  'sourced','screening','interview','assessment','offer','hired','rejected'
);

create type public.application_status as enum ('active','hired','rejected','withdrawn','on_hold');

create type public.application_event_type as enum (
  'created','stage_changed','note_added','interview_scheduled','interview_completed',
  'offer_made','offer_accepted','offer_declined','rejected','withdrawn','reactivated','assessment_linked'
);

create type public.interview_type    as enum ('phone_screen','technical','behavioral','culture_fit','final','other');
create type public.interview_outcome as enum ('pending','strong_yes','yes','no_decision','no','strong_no');

create type public.offer_status as enum ('draft','sent','accepted','declined','expired','rescinded');
create type public.grant_scope  as enum ('client','hiring_project');

create type public.rejection_category as enum (
  'candidate_withdrew','failed_screening','failed_interview','failed_assessment',
  'compensation_mismatch','position_closed','better_candidate','no_show','other'
);

-- ------------------------------------------------------------
-- 3.1 updated_at-тригер
-- ------------------------------------------------------------
-- TODO(spec-conflict): репо вже має два аналоги (`update_competency_model_timestamp`,
-- `set_updated_at` з попередніх V2/MVP міграцій), але жоден не називається
-- `update_updated_at_column`, як очікує специфікація (розділ 3.1, крок 3 розділу 8).
-- Найбезпечніший варіант: створити ОКРЕМУ функцію з іменем зі специфікації замість
-- реюзу V2-функцій з іншим неймспейсом призначення (щоб не змішувати домени
-- competency/case з ATS і не ризикувати ламати наявні тригери при рефакторингу).
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3.2 Глобальна роль — обгортки над наявним has_role()
-- ------------------------------------------------------------
-- owner АБО admin = глобальний bypass (ADR шар 1).
create or replace function public.mp_is_workspace_admin()
returns boolean language sql stable security definer
set search_path = public as $$
  select public.has_role(auth.uid(), 'owner')
      or public.has_role(auth.uid(), 'admin')
$$;

-- внутрішній автентифікований користувач воркспейсу (owner/admin/recruiter).
create or replace function public.mp_is_internal()
returns boolean language sql stable security definer
set search_path = public as $$
  select public.has_role(auth.uid(), 'owner')
      or public.has_role(auth.uid(), 'admin')
      or public.has_role(auth.uid(), 'recruiter')
$$;
