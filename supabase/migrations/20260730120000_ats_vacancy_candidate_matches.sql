-- ============================================================
-- Фіча: рекомендовані кандидати під бріф (matching)
-- ============================================================
-- Матеріалізовані результати матчингу кандидат↔вакансія зі скором 0–100.
-- Рахує Edge `recommend-candidates` (pre-filter по базі тенанта + LLM re-rank),
-- кешує за brief_fingerprint. Клієнт лише читає. Запис — service_role.
-- ============================================================

create table if not exists public.vacancy_candidate_matches (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants(id) on delete restrict,
  vacancy_id      uuid not null references public.vacancies(id) on delete cascade,
  candidate_id    uuid not null references public.ats_candidates(id) on delete cascade,
  score           int not null default 0,
  breakdown       jsonb not null default '{}'::jsonb,  -- {matched_skills[], gaps[], rationale, model}
  brief_fingerprint text,
  computed_at     timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  unique (vacancy_id, candidate_id)
);
create index if not exists idx_vcm_vacancy_score on public.vacancy_candidate_matches (vacancy_id, score desc);
create index if not exists idx_vcm_candidate on public.vacancy_candidate_matches (candidate_id);

update public.vacancy_candidate_matches set tenant_id = '11111111-1111-1111-1111-111111111111'
 where tenant_id is null;
create index if not exists idx_vcm_tenant on public.vacancy_candidate_matches (tenant_id);
drop trigger if exists trg_stamp_tenant on public.vacancy_candidate_matches;
create trigger trg_stamp_tenant before insert on public.vacancy_candidate_matches
  for each row execute function public.mp_stamp_tenant();

alter table public.vacancy_candidate_matches enable row level security;

-- Читає/керує той, хто веде вакансію (vacancy_id — пряма колонка, RETURNING-safe).
drop policy if exists vcm_select on public.vacancy_candidate_matches;
create policy vcm_select on public.vacancy_candidate_matches
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists vcm_write on public.vacancy_candidate_matches;
create policy vcm_write on public.vacancy_candidate_matches
  for all to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

-- RESTRICTIVE tenant-gate.
drop policy if exists vcm_tenant_isolation on public.vacancy_candidate_matches;
create policy vcm_tenant_isolation on public.vacancy_candidate_matches
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.vacancy_candidate_matches is
  'Матчинг кандидат↔вакансія (score 0–100 + breakdown), кеш за brief_fingerprint. '
  'Рахує Edge recommend-candidates; клієнт лише читає.';
