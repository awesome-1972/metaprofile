-- ============================================================
-- Metaprofile ATS — isolation tests (розділ 9 + 9.1 специфікації)
-- docs/specs/metaprofile-ats-schema.md
-- ------------------------------------------------------------
-- ПРИЗНАЧЕННЯ: ручний або CI прогін. НЕ виконується автоматично цією
-- міграцією/тулінгом — послідовність SQL з коментарями-очікуваннями.
--
-- Як запускати: під сесією конкретного користувача (Supabase: локально —
-- `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}';`
-- або через окремі логіни в інтеграційному тесті / pgTAP). Значення :A, :B,
-- :P1, :P2, :R, :app, :app_B, :V, :V2_id, :stage_with_apps, :grant, :other_cand
-- підставляються з реального seed-набору перед прогоном.
--
-- ПРЕСЕТ (мінімум для прогону):
--   - клієнти A та B (public.clients, is_internal=false)
--   - у A: hiring_projects P1, P2
--   - вакансія V у P1 (public.vacancies), вакансія V2 у проекті клієнта B
--   - vacancy_financials для V і V2
--   - рекрутер R: auth.users + user_roles(R,'recruiter')
--   - кандидат C (ats_candidates), заявка app (candidate=C, vacancy=V)
--   - заявка app_B (клієнт B) для сценарію 9
--   - стадії pipeline_stages(V), pipeline_stages(V2) — зокрема stageV2
-- ============================================================

-- ============================================================
-- СЦЕНАРІЙ 1 — грант scope=client на A: бачить усе A, нуль B.
-- ============================================================
-- setup (as owner/admin):
-- insert into access_grants (user_id, scope_type, scope_id, can_edit, can_view_financials, granted_by)
--   values (:R, 'client', :A, false, false, auth.uid());
-- as R:
select count(*) from public.hiring_projects where client_id = :A;  -- ОЧІКУВАНО: усі проекти A (>0)
select count(*) from public.hiring_projects where client_id = :B;  -- ОЧІКУВАНО: 0
select count(*) from public.vacancies v join public.hiring_projects hp on hp.id=v.hiring_project_id
  where hp.client_id = :B;                                          -- ОЧІКУВАНО: 0
select count(*) from public.clients where id = :B;                 -- ОЧІКУВАНО: 0

-- ============================================================
-- СЦЕНАРІЙ 2 — грант scope=hiring_project=P1: бачить лише P1, не P2 (той самий клієнт).
-- ============================================================
-- setup: grant(R, 'hiring_project', P1, ...)
-- as R:
select count(*) from public.hiring_projects where id = :P1;  -- ОЧІКУВАНО: 1
select count(*) from public.hiring_projects where id = :P2;  -- ОЧІКУВАНО: 0 (той самий клієнт A, точковий грант)
select count(*) from public.vacancies where hiring_project_id = :P2; -- ОЧІКУВАНО: 0

-- ============================================================
-- СЦЕНАРІЙ 3 — can_view_financials=false: пайплайн видно, фінанси = 0 рядків.
-- ============================================================
-- setup: grant(R, 'client', A, can_edit=true, can_view_financials=false)
-- as R:
select count(*) from public.applications a join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: >0 (пайплайн)
select count(*) from public.vacancy_financials vf join public.vacancies v on v.id=vf.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: 0 (фінанси приховані)

-- ============================================================
-- СЦЕНАРІЙ 4 — can_view_financials=true на A: фінанси по всіх проектах A, не по B.
-- ============================================================
-- setup: grant(R, 'client', A, can_view_financials=true)
-- as R:
select count(*) from public.vacancy_financials vf join public.vacancies v on v.id=vf.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: >0 (усі фінанси A)
select count(*) from public.vacancy_financials vf join public.vacancies v on v.id=vf.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:B;  -- ОЧІКУВАНО: 0

-- ============================================================
-- СЦЕНАРІЙ 5 — відкликання гранта (is_active=false): миттєва втрата доступу.
-- ============================================================
-- setup: грант активний → перевірити доступ (>0)
-- action (owner/admin): update access_grants set is_active=false where id=:grant;
-- as R (повторно):
select count(*) from public.hiring_projects where client_id = :A;  -- ОЧІКУВАНО: 0 (доступ втрачено)
select count(*) from public.vacancies v join public.hiring_projects hp on hp.id=v.hiring_project_id
  where hp.client_id=:A;                                            -- ОЧІКУВАНО: 0

-- ============================================================
-- СЦЕНАРІЙ 6 — owner/admin bypass: усе без грантів.
-- ============================================================
-- as owner (жодного гранта):
select count(*) from public.clients;              -- ОЧІКУВАНО: усі клієнти
select count(*) from public.vacancy_financials;   -- ОЧІКУВАНО: усі фінанси
select count(*) from public.hiring_projects;      -- ОЧІКУВАНО: усі проекти

-- ============================================================
-- ДОДАТКОВІ ПЕРЕВІРКИ ІНВАРІАНТІВ (поза 6 базовими сценаріями)
-- ============================================================
-- append-only: клієнтський write у журнал заборонено.
-- as R (з can_edit): insert into application_events(application_id, event_type)
--   values (:app, 'note_added');
-- ОЧІКУВАНО: RLS violation / 0 рядків (немає INSERT-політики для authenticated)

-- рух стадії пише подію автоматично:
-- as R: update applications set current_stage_id=:next where id=:app;
-- → в application_events зʼявляється рядок event_type='stage_changed' (actor_id=R)
select event_type, actor_id from public.application_events
  where application_id = :app order by created_at desc limit 1;
-- ОЧІКУВАНО: event_type='stage_changed', actor_id = R

-- фінанси фізично відсутні у vacancies:
select column_name from information_schema.columns
  where table_name='vacancies' and column_name ilike any(array['%salary%','%fee%','%financ%']);
-- ОЧІКУВАНО: 0 рядків (жодного фінансового поля у vacancies)

-- ============================================================
-- СЦЕНАРІЙ 7 — SEC-02: заборона переміщення заявки у чужу вакансію / стадію.
-- ============================================================
-- setup: grant(R,'client',A,can_edit=true); заявка app у вакансії V(A).
--        Вакансія V2(B) поза scope; стадія stageV2 належить V2.
-- as R:
update public.applications set vacancy_id = :V2_id where id = :app;
-- ОЧІКУВАНО: помилка «immutable scope key: applications.vacancy_id» (тригер 3.4)
update public.applications set candidate_id = :other_cand where id = :app;
-- ОЧІКУВАНО: помилка «immutable scope key: applications.candidate_id»
update public.applications set current_stage_id = :stageV2 where id = :app;
-- ОЧІКУВАНО: помилка «current_stage_id ... does not belong to vacancy ...» (тригер 3.4)

-- ============================================================
-- СЦЕНАРІЙ 8 — SEC-03: заборона репарентингу проекту/вакансії у чужий scope.
-- ============================================================
-- setup: grant(R,'client',A,can_edit=true) і grant(R,'client',B,can_edit=true).
--        Проект P1(A), вакансія V(P1).
-- as R:
update public.hiring_projects set client_id = :B where id = :P1;
-- ОЧІКУВАНО: помилка «immutable scope key: hiring_projects.client_id» (тригер 3.4)
update public.vacancies set hiring_project_id = :project_of_B where id = :V;
-- ОЧІКУВАНО: помилка «immutable scope key: vacancies.hiring_project_id»
-- (owner/admin — той самий UPDATE МАЄ проходити: перевірити окремо під owner.)

-- ============================================================
-- СЦЕНАРІЙ 9 — SEC-01: рекрутер не видаляє кандидата з чужими заявками.
-- ============================================================
-- setup: R створив кандидата C (created_by=R, у public.ats_candidates);
--        C має заявку app_B у клієнта B (поза scope R).
-- as R:
delete from public.ats_candidates where id = :C;
-- ОЧІКУВАНО: 0 рядків / RLS violation (DELETE лише owner/admin — created_by прибрано, 5.8)
-- перевірка збереження чужого scope:
-- as owner: select count(*) from public.applications where id = :app_B;  -- ОЧІКУВАНО: 1 (заявка жива)

-- ============================================================
-- СЦЕНАРІЙ 10 — SEC-04/SEC-05: фін-гейт не обходиться через offers/events.
-- ============================================================
-- setup: grant(R,'client',A,can_edit=true,can_view_financials=FALSE). Офер з узгодженою сумою.
-- as R:
select terms_note from public.offers o join public.applications a on a.id=o.application_id
  join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;
-- ОЧІКУВАНО: terms_note НЕ містить сум (enforced на write: Edge-валідація + інваріант колонок)
select note, metadata from public.application_events e
  join public.applications a on a.id=e.application_id where a.vacancy_id in
  (select v.id from public.vacancies v join public.hiring_projects hp on hp.id=v.hiring_project_id
   where hp.client_id=:A);
-- ОЧІКУВАНО: жодних фін-даних у note/metadata (allow-list + fin-regex у log-application-event)
select count(*) from public.vacancy_financials vf join public.vacancies v on v.id=vf.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;
-- ОЧІКУВАНО: 0 (agreed_salary під фін-гейтом недоступна)

-- ============================================================
-- СЦЕНАРІЙ 11 — SEC-08: read-only рекрутер НЕ пише інтервʼю.
-- ============================================================
-- setup: grant(R,'client',A,can_edit=FALSE). Заявка app у scope A.
-- as R:
insert into public.interviews(application_id, interviewer_id) values(:app, auth.uid());
-- ОЧІКУВАНО: RLS violation (interviews_insert вимагає can_edit/admin; гілку self-assign прибрано)

-- ============================================================
-- СЦЕНАРІЙ 12 — SEC-06/SEC-07: Edge перевіряє роль/scope, не лише підпис JWT.
-- (Виконується поза SQL — інтеграційний/HTTP тест Edge Functions.)
-- ============================================================
-- - grant-management з JWT рекрутера (валідний підпис, роль=recruiter) → 403 forbidden
--   (getUser + has_role, не body).
-- - log-application-event з JWT рекрутера без доступу до заявки → 403 forbidden
--   (mp_can_access_application=false).
-- - log-application-event з фін-сумою у note/metadata → 422 financial_data_forbidden.
-- - ref-replicator без x-internal-secret / з клієнтським JWT → 403 (не 200).
-- - erase-candidate рекрутером, у якого не всі заявки кандидата у scope → 403.
-- - CORS: preflight з чужого origin → без Access-Control-Allow-Origin (не '*').

-- ============================================================
-- СЦЕНАРІЙ 13 — SEC-12: DELETE стадії з активними заявками заборонено.
-- ============================================================
-- as R (can_edit у scope):
delete from public.pipeline_stages where id=:stage_with_apps;
-- ОЧІКУВАНО: помилка «cannot delete stage ...: applications still reference it» (тригер 3.5)
-- Порожня стадія (без заявок) — DELETE проходить.

-- ============================================================
-- СЦЕНАРІЙ 14 — SEC-14 (розширення сценарію 5): відкликаний грант каскадить
-- у ВСІ похідні сутності.
-- ============================================================
-- після: update access_grants set is_active=false where id=:grant — перевірити 0 рядків ВСЮДИ:
select count(*) from public.vacancies v join public.hiring_projects hp on hp.id=v.hiring_project_id
  where hp.client_id=:A;                                                    -- ОЧІКУВАНО: 0
select count(*) from public.applications a join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: 0
select count(*) from public.application_events e join public.applications a on a.id=e.application_id
  join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: 0
select count(*) from public.interviews i join public.applications a on a.id=i.application_id
  join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: 0
select count(*) from public.offers o join public.applications a on a.id=o.application_id
  join public.vacancies v on v.id=a.vacancy_id
  join public.hiring_projects hp on hp.id=v.hiring_project_id where hp.client_id=:A;  -- ОЧІКУВАНО: 0
-- кандидат, видимий лише через заявки A (не created_by=R): теж 0 через mp_can_access_candidate.
select count(*) from public.ats_candidates c where c.id = :C and c.created_by is distinct from :R;
-- ОЧІКУВАНО: 0 (якщо C не created_by R і доступний лише через заявки A)

-- ============================================================
-- ІНВАРІАНТ — жодного фінансового поля поза vacancy_financials.
-- ============================================================
select table_name, column_name from information_schema.columns
 where table_schema='public'
   and table_name in ('offers','applications','application_events','vacancies')
   and column_name ilike any(array['%salary%','%fee%','%amount%','%financ%','%comp%']);
-- ОЧІКУВАНО: 0 рядків
