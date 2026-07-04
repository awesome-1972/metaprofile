-- ============================================================
-- Metaprofile ATS — крок 4/7: helper-функції ефективного scope (розділ 3.3)
-- Порядок міграцій крок 20: ПІСЛЯ таблиць (тіла посилаються на access_grants,
-- hiring_projects, vacancies, applications, ats_candidates).
-- Усі security definer + set search_path = public (проти search-path-ін'єкції),
-- stable де можливо (кешуються в межах запиту, не рекурсують у власні RLS).
-- ============================================================

-- ── Доступ до КЛІЄНТА ─────────────────────────────────────────────────────
create or replace function public.mp_can_access_client(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.access_grants g
        where g.user_id = auth.uid()
          and g.is_active
          and (
            (g.scope_type = 'client'         and g.scope_id = p_client_id)
            or
            (g.scope_type = 'hiring_project' and g.scope_id in
              (select hp.id from public.hiring_projects hp where hp.client_id = p_client_id))
          )
      )
$$;

-- ── Доступ до ПРОЕКТУ НАЙМУ ───────────────────────────────────────────────
create or replace function public.mp_can_access_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1
        from public.hiring_projects hp
        join public.access_grants   g on g.user_id = auth.uid() and g.is_active
        where hp.id = p_project_id
          and (
            (g.scope_type = 'hiring_project' and g.scope_id = hp.id)
            or
            (g.scope_type = 'client'         and g.scope_id = hp.client_id)
          )
      )
$$;

-- ── Доступ до ВАКАНСІЇ ────────────────────────────────────────────────────
create or replace function public.mp_can_access_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.vacancies v
        where v.id = p_vacancy_id
          and public.mp_can_access_project(v.hiring_project_id)
      )
$$;

-- ── Доступ до ЗАЯВКИ ──────────────────────────────────────────────────────
create or replace function public.mp_can_access_application(p_application_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.applications a
        where a.id = p_application_id
          and public.mp_can_access_vacancy(a.vacancy_id)
      )
$$;

-- ── ФІНАНСОВИЙ scope (окреме право can_view_financials) ──────────────────
create or replace function public.mp_can_view_financials_for_client(p_client_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.access_grants g
        where g.user_id = auth.uid()
          and g.is_active
          and g.can_view_financials
          and (
            (g.scope_type = 'client'         and g.scope_id = p_client_id)
            or
            (g.scope_type = 'hiring_project' and g.scope_id in
              (select hp.id from public.hiring_projects hp where hp.client_id = p_client_id))
          )
      )
$$;

create or replace function public.mp_can_view_vacancy_financials(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1
        from public.vacancies v
        join public.hiring_projects hp on hp.id = v.hiring_project_id
        where v.id = p_vacancy_id
          and public.mp_can_view_financials_for_client(hp.client_id)
      )
$$;

-- ── Право РЕДАГУВАННЯ (can_edit) у scope вакансії ─────────────────────────
create or replace function public.mp_can_edit_vacancy(p_vacancy_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1
        from public.vacancies v
        join public.hiring_projects hp on hp.id = v.hiring_project_id
        join public.access_grants   g  on g.user_id = auth.uid() and g.is_active and g.can_edit
        where v.id = p_vacancy_id
          and (
            (g.scope_type = 'hiring_project' and g.scope_id = hp.id)
            or
            (g.scope_type = 'client'         and g.scope_id = hp.client_id)
          )
      )
$$;

-- can_edit на рівні проекту (для write у hiring_projects / vacancies-створення).
create or replace function public.mp_can_edit_project(p_project_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1
        from public.hiring_projects hp
        join public.access_grants g on g.user_id = auth.uid() and g.is_active and g.can_edit
        where hp.id = p_project_id
          and (
            (g.scope_type = 'hiring_project' and g.scope_id = hp.id)
            or
            (g.scope_type = 'client'         and g.scope_id = hp.client_id)
          )
      )
$$;

-- ── Доступ до КАНДИДАТА (SEC-14: єдиний резолв) ───────────────────────────
-- TODO(spec-conflict): резолвиться проти public.ats_candidates (не public.candidates,
-- див. TODO у 20260704090200_ats_core_tables.sql щодо назви таблиці).
create or replace function public.mp_can_access_candidate(p_candidate_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.ats_candidates c
        where c.id = p_candidate_id and c.created_by = auth.uid()
      )
      or exists (
        select 1 from public.applications a
        where a.candidate_id = p_candidate_id
          and public.mp_can_access_vacancy(a.vacancy_id)
      )
$$;

-- can_edit на рівні кандидата (для UPDATE картки).
create or replace function public.mp_can_edit_candidate(p_candidate_id uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select public.mp_is_workspace_admin()
      or exists (
        select 1 from public.ats_candidates c
        where c.id = p_candidate_id and c.created_by = auth.uid()
      )
      or exists (
        select 1 from public.applications a
        where a.candidate_id = p_candidate_id
          and public.mp_can_edit_vacancy(a.vacancy_id)
      )
$$;
