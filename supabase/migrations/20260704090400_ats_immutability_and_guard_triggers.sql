-- ============================================================
-- Metaprofile ATS — крок 5/7: тригери іммутабельності scope-ключів,
-- delete-guard стадій, автологування зміни стадії (розділи 3.4, 3.5, 4.10)
-- Порядок міграцій: кроки 20a/20b — ПІСЛЯ mp_is_workspace_admin (крок 20,
-- цей проєкт: файл 090100) і таблиць (посилаються на pipeline_stages).
-- ============================================================

-- ------------------------------------------------------------
-- 3.4 Універсальний хелпер заборони зміни scope-ключа
-- ------------------------------------------------------------
create or replace function public.mp_reject_scope_key_change(p_column text)
returns void language plpgsql stable security definer
set search_path = public as $$
begin
  if not public.mp_is_workspace_admin() then
    raise exception 'immutable scope key: % cannot be changed (owner/admin only)', p_column
      using errcode = '42501';  -- insufficient_privilege
  end if;
end;
$$;

-- ── applications: vacancy_id і candidate_id IMMUTABLE (SEC-02) ────────────
create or replace function public.mp_applications_immutable_scope()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.vacancy_id   is distinct from old.vacancy_id   then
    perform public.mp_reject_scope_key_change('applications.vacancy_id');
  end if;
  if new.candidate_id is distinct from old.candidate_id then
    perform public.mp_reject_scope_key_change('applications.candidate_id');
  end if;
  -- current_stage_id має належати ТІЙ САМІЙ вакансії заявки (SEC-02 + SEC-11).
  if new.current_stage_id is not null
     and new.current_stage_id is distinct from old.current_stage_id
     and not exists (
       select 1 from public.pipeline_stages s
       where s.id = new.current_stage_id and s.vacancy_id = new.vacancy_id
     ) then
    raise exception 'current_stage_id % does not belong to vacancy %',
      new.current_stage_id, new.vacancy_id using errcode = '23514';  -- check_violation
  end if;
  return new;
end;
$$;

create trigger trg_applications_immutable_scope
  before update on public.applications
  for each row execute function public.mp_applications_immutable_scope();

-- ── hiring_projects: client_id IMMUTABLE (SEC-03) ─────────────────────────
create or replace function public.mp_hiring_projects_immutable_scope()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.client_id is distinct from old.client_id then
    perform public.mp_reject_scope_key_change('hiring_projects.client_id');
  end if;
  return new;
end;
$$;

create trigger trg_hiring_projects_immutable_scope
  before update on public.hiring_projects
  for each row execute function public.mp_hiring_projects_immutable_scope();

-- ── vacancies: hiring_project_id IMMUTABLE (SEC-03) ───────────────────────
create or replace function public.mp_vacancies_immutable_scope()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if new.hiring_project_id is distinct from old.hiring_project_id then
    perform public.mp_reject_scope_key_change('vacancies.hiring_project_id');
  end if;
  return new;
end;
$$;

create trigger trg_vacancies_immutable_scope
  before update on public.vacancies
  for each row execute function public.mp_vacancies_immutable_scope();

-- ------------------------------------------------------------
-- 3.5 Заборона DELETE стадії з активними заявками (SEC-12)
-- ------------------------------------------------------------
create or replace function public.mp_pipeline_stage_delete_guard()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if exists (select 1 from public.applications a where a.current_stage_id = old.id) then
    raise exception 'cannot delete stage %: applications still reference it', old.id
      using errcode = '23503';  -- foreign_key_violation
  end if;
  return old;
end;
$$;

create trigger trg_pipeline_stage_delete_guard
  before delete on public.pipeline_stages
  for each row execute function public.mp_pipeline_stage_delete_guard();

-- ------------------------------------------------------------
-- 4.10 Автологування зміни стадії в append-only журнал
-- ------------------------------------------------------------
-- SEC-11: перехід уже валідований тригером mp_applications_immutable_scope
-- (BEFORE UPDATE, виконується раніше і кидає помилку до цього AFTER-тригера) —
-- у журнал не потрапить невалідний current_stage_id (стадія чужої вакансії).
-- actor_id = auth.uid(): при серверному виклику під service_role буде NULL —
-- ОЧІКУВАНА атрибуція «системна подія». Іменовані ручні події пише Edge
-- log-application-event з відомим user_id, а не цей тригер.
create or replace function public.mp_log_stage_change()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.application_events (application_id, event_type, to_stage_id, actor_id)
    values (new.id, 'created', new.current_stage_id, auth.uid());
  elsif (tg_op = 'UPDATE' and new.current_stage_id is distinct from old.current_stage_id) then
    insert into public.application_events (application_id, event_type, from_stage_id, to_stage_id, actor_id)
    values (new.id, 'stage_changed', old.current_stage_id, new.current_stage_id, auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_log_stage_change
  after insert or update of current_stage_id on public.applications
  for each row execute function public.mp_log_stage_change();
