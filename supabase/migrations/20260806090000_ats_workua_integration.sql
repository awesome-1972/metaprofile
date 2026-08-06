-- ============================================================
-- Інтеграція Work.ua: лінк вакансії до job_id + дедуп відгуків
-- ============================================================
-- Basic Auth (email+пароль роботодавця, у секретах Edge). Читання відгуків
-- безкоштовне. Прив'язуємо нашу вакансію до work.ua job_id і підтягуємо відгуки
-- у воронку. Дедуп — таблиця workua_synced_responses (унікальність по vacancy+response).
-- ============================================================

alter table public.vacancies
  add column if not exists workua_job_id text;

-- Джерело кандидата «Work.ua».
insert into public.candidate_sources (name, category)
select 'Work.ua', 'job_board'
where not exists (select 1 from public.candidate_sources where name = 'Work.ua');

create table if not exists public.workua_synced_responses (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete restrict,
  vacancy_id   uuid not null references public.vacancies(id) on delete cascade,
  response_id  text not null,
  candidate_id uuid references public.ats_candidates(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (vacancy_id, response_id)
);
create index if not exists idx_workua_synced_vacancy on public.workua_synced_responses (vacancy_id);
create index if not exists idx_workua_synced_tenant on public.workua_synced_responses (tenant_id);

drop trigger if exists trg_stamp_tenant on public.workua_synced_responses;
create trigger trg_stamp_tenant before insert on public.workua_synced_responses
  for each row execute function public.mp_stamp_tenant();

alter table public.workua_synced_responses enable row level security;

drop policy if exists workua_synced_select on public.workua_synced_responses;
create policy workua_synced_select on public.workua_synced_responses
  for select to authenticated using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists workua_synced_write on public.workua_synced_responses;
create policy workua_synced_write on public.workua_synced_responses
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists workua_synced_tenant_isolation on public.workua_synced_responses;
create policy workua_synced_tenant_isolation on public.workua_synced_responses
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.workua_synced_responses is 'Дедуп імпортованих відгуків Work.ua (vacancy_id + response_id).';
