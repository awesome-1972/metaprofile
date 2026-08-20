-- ============================================================
-- Інтеграція Djinni (djinni.co/api/v2): лінк вакансії + дедуп відгуків
-- ============================================================
-- Auth: X-API-Key (секрет Edge DJINNI_API_KEY). Прив'язуємо нашу вакансію до
-- Djinni job_id і підтягуємо відгуки (GET /jobs/{id}/candidates) у воронку.
-- Дедуп — таблиця djinni_synced_responses (унікальність по vacancy+application).
-- ============================================================

alter table public.vacancies
  add column if not exists djinni_job_id text;

insert into public.candidate_sources (name, category)
select 'Djinni', 'job_board'
where not exists (select 1 from public.candidate_sources where name = 'Djinni');

create table if not exists public.djinni_synced_responses (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete restrict,
  vacancy_id   uuid not null references public.vacancies(id) on delete cascade,
  response_id  text not null,
  candidate_id uuid references public.ats_candidates(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (vacancy_id, response_id)
);
create index if not exists idx_djinni_synced_vacancy on public.djinni_synced_responses (vacancy_id);
create index if not exists idx_djinni_synced_tenant on public.djinni_synced_responses (tenant_id);

drop trigger if exists trg_stamp_tenant on public.djinni_synced_responses;
create trigger trg_stamp_tenant before insert on public.djinni_synced_responses
  for each row execute function public.mp_stamp_tenant();

alter table public.djinni_synced_responses enable row level security;

drop policy if exists djinni_synced_select on public.djinni_synced_responses;
create policy djinni_synced_select on public.djinni_synced_responses
  for select to authenticated using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists djinni_synced_write on public.djinni_synced_responses;
create policy djinni_synced_write on public.djinni_synced_responses
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists djinni_synced_tenant_isolation on public.djinni_synced_responses;
create policy djinni_synced_tenant_isolation on public.djinni_synced_responses
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.djinni_synced_responses is 'Дедуп імпортованих відгуків Djinni (vacancy_id + application_id).';
