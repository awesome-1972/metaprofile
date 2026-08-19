-- ============================================================
-- Інтеграція Robota.ua: публікація вакансій + лінк + дедуп відгуків
-- ============================================================
-- Auth: X-Api-Key (у секретах Edge). Публікація двокрокова:
-- POST /vacancy/add (id=0 нова / id існуючий — редагування) → POST /vacancy/state/{id}?state=Publicated.
-- Прив'язуємо нашу вакансію до robota.ua vacancy_id і підтягуємо відгуки (/apply/list) у воронку.
-- Дедуп — таблиця robotaua_synced_responses (унікальність по vacancy+apply).
-- ============================================================

alter table public.vacancies
  add column if not exists robotaua_vacancy_id text;

-- Джерело кандидата «Robota.ua».
insert into public.candidate_sources (name, category)
select 'Robota.ua', 'job_board'
where not exists (select 1 from public.candidate_sources where name = 'Robota.ua');

create table if not exists public.robotaua_synced_responses (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid references public.tenants(id) on delete restrict,
  vacancy_id   uuid not null references public.vacancies(id) on delete cascade,
  response_id  text not null,
  candidate_id uuid references public.ats_candidates(id) on delete set null,
  created_at   timestamptz not null default now(),
  unique (vacancy_id, response_id)
);
create index if not exists idx_robotaua_synced_vacancy on public.robotaua_synced_responses (vacancy_id);
create index if not exists idx_robotaua_synced_tenant on public.robotaua_synced_responses (tenant_id);

drop trigger if exists trg_stamp_tenant on public.robotaua_synced_responses;
create trigger trg_stamp_tenant before insert on public.robotaua_synced_responses
  for each row execute function public.mp_stamp_tenant();

alter table public.robotaua_synced_responses enable row level security;

drop policy if exists robotaua_synced_select on public.robotaua_synced_responses;
create policy robotaua_synced_select on public.robotaua_synced_responses
  for select to authenticated using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists robotaua_synced_write on public.robotaua_synced_responses;
create policy robotaua_synced_write on public.robotaua_synced_responses
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists robotaua_synced_tenant_isolation on public.robotaua_synced_responses;
create policy robotaua_synced_tenant_isolation on public.robotaua_synced_responses
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.robotaua_synced_responses is 'Дедуп імпортованих відгуків Robota.ua (vacancy_id + response_id).';
