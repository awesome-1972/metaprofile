-- Живий профіль #1: лог доказів/досягнень кандидата (фундамент динамічного профілю).
-- Кожен запис — верифікована подія (виконаний кейс, завершений курс, оцінювання) з датою.

create table if not exists public.candidate_skill_evidence (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null,            -- case_completed | course_completed | assessment | skill_verified
  skill        text,                     -- опційно: конкретна навичка
  title        text not null,
  detail       text,
  score        numeric,                  -- опційно (коли зʼявиться оцінювання)
  source_type  text,                     -- case | course | assessment
  source_id    uuid,
  evidenced_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

create index if not exists idx_cse_user on public.candidate_skill_evidence (user_id, evidenced_at desc);

alter table public.candidate_skill_evidence enable row level security;

drop policy if exists "cse_self_read" on public.candidate_skill_evidence;
create policy "cse_self_read" on public.candidate_skill_evidence
  for select to authenticated using (user_id = auth.uid());
-- запис — лише через SECURITY DEFINER тригер/сервіс (звичайним юзерам insert не даємо).

-- ── Тригер: виконаний кейс → запис у стрічку досягнень ────────────────────────
create or replace function public.log_case_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user  uuid;
  v_title text;
begin
  select c.user_id into v_user from public.candidates c where c.id = new.candidate_id;
  if v_user is null then return new; end if;
  select title into v_title from public.cases where id = new.case_id;

  insert into public.candidate_skill_evidence
    (user_id, kind, title, detail, source_type, source_id, evidenced_at)
  values
    (v_user, 'case_completed', coalesce(v_title, 'Кейс'), 'Практичний кейс виконано',
     'case', new.case_id, coalesce(new.submitted_at, now()));

  return new;
end;
$$;

drop trigger if exists on_case_submission_evidence on public.case_submissions;
create trigger on_case_submission_evidence
  after insert on public.case_submissions
  for each row execute function public.log_case_evidence();
