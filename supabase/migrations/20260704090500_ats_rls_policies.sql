-- ============================================================
-- Metaprofile ATS — крок 6/7: RLS-політики (розділ 5 специфікації)
-- Порядок міграцій крок 21: ОСТАННІ (після усіх таблиць і helper-функцій).
-- Принципи: default DENY (fail-closed); owner/admin — bypass через
-- mp_is_workspace_admin(); recruiter — лише за активними грантами;
-- application_events — append-only (без клієнтського write); vacancy_financials
-- — can_view_financials-гейт; ref_* — read усім внутрішнім, write лише
-- service_role; access_grants write — лише owner/admin. Усі політики —
-- to authenticated.
-- ============================================================

-- ------------------------------------------------------------
-- 5.1 access_grants
-- ------------------------------------------------------------
create policy access_grants_select on public.access_grants
  for select to authenticated
  using (public.mp_is_workspace_admin() or user_id = auth.uid());

-- SEC-09: granted_by примусово = auth.uid() на INSERT.
create policy access_grants_insert on public.access_grants
  for insert to authenticated
  with check (public.mp_is_workspace_admin() and granted_by = auth.uid());
create policy access_grants_update on public.access_grants
  for update to authenticated
  using (public.mp_is_workspace_admin())
  with check (public.mp_is_workspace_admin());
create policy access_grants_delete on public.access_grants
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.2 clients
-- ------------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated
  using (public.mp_can_access_client(id));

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.mp_is_workspace_admin());
create policy clients_update on public.clients
  for update to authenticated
  using (public.mp_is_workspace_admin())
  with check (public.mp_is_workspace_admin());
create policy clients_delete on public.clients
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.3 hiring_projects
-- ------------------------------------------------------------
create policy hiring_projects_select on public.hiring_projects
  for select to authenticated
  using (public.mp_can_access_project(id));

-- INSERT: owner/admin, або recruiter з can_edit на клієнта (client-scope грант).
create policy hiring_projects_insert on public.hiring_projects
  for insert to authenticated
  with check (
    public.mp_is_workspace_admin()
    or exists (
      select 1 from public.access_grants g
      where g.user_id = auth.uid() and g.is_active and g.can_edit
        and g.scope_type = 'client' and g.scope_id = client_id
    )
  );

create policy hiring_projects_update on public.hiring_projects
  for update to authenticated
  using (public.mp_can_edit_project(id))
  with check (public.mp_can_edit_project(id));

create policy hiring_projects_delete on public.hiring_projects
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.4 vacancies
-- ------------------------------------------------------------
create policy vacancies_select on public.vacancies
  for select to authenticated
  using (public.mp_can_access_vacancy(id));

create policy vacancies_insert on public.vacancies
  for insert to authenticated
  with check (public.mp_can_edit_project(hiring_project_id));

create policy vacancies_update on public.vacancies
  for update to authenticated
  using (public.mp_can_edit_vacancy(id))
  with check (public.mp_can_edit_vacancy(id));

create policy vacancies_delete on public.vacancies
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.5 vacancy_financials (Fin-4)
-- ------------------------------------------------------------
create policy vacancy_financials_select on public.vacancy_financials
  for select to authenticated
  using (public.mp_can_view_vacancy_financials(vacancy_id));

-- WRITE: комерційні умови веде агенція → тільки owner/admin.
create policy vacancy_financials_insert on public.vacancy_financials
  for insert to authenticated
  with check (public.mp_is_workspace_admin());
create policy vacancy_financials_update on public.vacancy_financials
  for update to authenticated
  using (public.mp_is_workspace_admin())
  with check (public.mp_is_workspace_admin());
create policy vacancy_financials_delete on public.vacancy_financials
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.6 pipeline_stages
-- ------------------------------------------------------------
create policy pipeline_stages_select on public.pipeline_stages
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy pipeline_stages_insert on public.pipeline_stages
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));
create policy pipeline_stages_update on public.pipeline_stages
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));
create policy pipeline_stages_delete on public.pipeline_stages
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- ------------------------------------------------------------
-- 5.7 pipeline_stage_templates + pipeline_stage_template_items
-- ------------------------------------------------------------
create policy stage_templates_select on public.pipeline_stage_templates
  for select to authenticated using (public.mp_is_internal());
create policy stage_templates_write on public.pipeline_stage_templates
  for all to authenticated
  using (public.mp_is_workspace_admin()) with check (public.mp_is_workspace_admin());

create policy stage_template_items_select on public.pipeline_stage_template_items
  for select to authenticated using (public.mp_is_internal());
create policy stage_template_items_write on public.pipeline_stage_template_items
  for all to authenticated
  using (public.mp_is_workspace_admin()) with check (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.8 ats_candidates (scope виводиться з applications)
-- TODO(spec-conflict): політики застосовано до public.ats_candidates
-- (перейменування через колізію з наявною V2 public.candidates — див.
-- TODO у 20260704090200_ats_core_tables.sql).
-- ------------------------------------------------------------
create policy ats_candidates_select on public.ats_candidates
  for select to authenticated
  using (public.mp_can_access_candidate(id));

-- SEC-13 (Low, свідомо прийнято для MVP): активний грант для INSERT не вимагається.
create policy ats_candidates_insert on public.ats_candidates
  for insert to authenticated
  with check (public.mp_is_internal());

create policy ats_candidates_update on public.ats_candidates
  for update to authenticated
  using (public.mp_can_edit_candidate(id))
  with check (public.mp_can_edit_candidate(id));

-- DELETE: SEC-01 — ТІЛЬКИ owner/admin (created_by прибрано навмисно).
create policy ats_candidates_delete on public.ats_candidates
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.9 candidate_sources
-- ------------------------------------------------------------
create policy candidate_sources_select on public.candidate_sources
  for select to authenticated using (public.mp_is_internal());
create policy candidate_sources_write on public.candidate_sources
  for all to authenticated
  using (public.mp_is_workspace_admin()) with check (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.10 applications
-- ------------------------------------------------------------
create policy applications_select on public.applications
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy applications_insert on public.applications
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));
create policy applications_update on public.applications
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));
create policy applications_delete on public.applications
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.11 application_events (append-only)
-- ------------------------------------------------------------
create policy application_events_select on public.application_events
  for select to authenticated
  using (public.mp_can_access_application(application_id));

-- WRITE: клієнтський запис ЗАБОРОНЕНО. Пише лише тригер mp_log_stage_change
-- (security definer — обходить RLS) або service_role (Edge). Тому НЕ
-- створюємо INSERT/UPDATE/DELETE-політик для authenticated → повний DENY
-- (enable row level security без політики = заборона операції).

-- ------------------------------------------------------------
-- 5.12 interviews
-- ------------------------------------------------------------
create policy interviews_select on public.interviews
  for select to authenticated
  using (
    public.mp_can_access_application(application_id)
    or interviewer_id = auth.uid()
  );

-- SEC-08: read-only грант НЕ пише інтервʼю (гілку самопризначення прибрано).
create policy interviews_insert on public.interviews
  for insert to authenticated
  with check (
    public.mp_can_access_application(application_id)
    and (
      public.mp_is_workspace_admin()
      or exists (select 1 from public.applications a
                 where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id))
    )
  );

create policy interviews_update on public.interviews
  for update to authenticated
  using (
    public.mp_is_workspace_admin()
    or interviewer_id = auth.uid()
    or exists (select 1 from public.applications a
               where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id))
  )
  with check (
    public.mp_is_workspace_admin()
    or interviewer_id = auth.uid()
    or exists (select 1 from public.applications a
               where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id))
  );

create policy interviews_delete on public.interviews
  for delete to authenticated
  using (
    public.mp_is_workspace_admin()
    or interviewer_id = auth.uid()
  );

-- ------------------------------------------------------------
-- 5.13 offers
-- ------------------------------------------------------------
create policy offers_select on public.offers
  for select to authenticated
  using (public.mp_can_access_application(application_id));

create policy offers_insert on public.offers
  for insert to authenticated
  with check (exists (select 1 from public.applications a
                      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)));
create policy offers_update on public.offers
  for update to authenticated
  using (exists (select 1 from public.applications a
                 where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)))
  with check (exists (select 1 from public.applications a
                      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)));
create policy offers_delete on public.offers
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.14 rejections + rejection_reasons
-- ------------------------------------------------------------
create policy rejection_reasons_select on public.rejection_reasons
  for select to authenticated using (public.mp_is_internal());
create policy rejection_reasons_write on public.rejection_reasons
  for all to authenticated
  using (public.mp_is_workspace_admin()) with check (public.mp_is_workspace_admin());

create policy rejections_select on public.rejections
  for select to authenticated
  using (public.mp_can_access_application(application_id));
create policy rejections_insert on public.rejections
  for insert to authenticated
  with check (exists (select 1 from public.applications a
                      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)));
create policy rejections_update on public.rejections
  for update to authenticated
  using (exists (select 1 from public.applications a
                 where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)))
  with check (exists (select 1 from public.applications a
                      where a.id = application_id and public.mp_can_edit_vacancy(a.vacancy_id)));
create policy rejections_delete on public.rejections
  for delete to authenticated
  using (public.mp_is_workspace_admin());

-- ------------------------------------------------------------
-- 5.15 ref_positions / ref_grades / ref_competencies (readonly-кеш)
-- ------------------------------------------------------------
create policy ref_positions_select    on public.ref_positions
  for select to authenticated using (public.mp_is_internal());
create policy ref_grades_select       on public.ref_grades
  for select to authenticated using (public.mp_is_internal());
create policy ref_competencies_select on public.ref_competencies
  for select to authenticated using (public.mp_is_internal());

-- WRITE: тільки service_role (Edge-реплікатор) → жодної write-політики
-- для authenticated (повний DENY на write, ADR E3).
