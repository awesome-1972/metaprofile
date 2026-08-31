-- Кандидатський дашборд: запити від компаній + резюме (файл).

-- ── Резюме файлом ────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists resume_url text;

insert into storage.buckets (id, name, public)
values ('resumes', 'resumes', true)
on conflict (id) do nothing;

drop policy if exists "resumes_public_read"   on storage.objects;
drop policy if exists "resumes_authed_insert" on storage.objects;
drop policy if exists "resumes_authed_update" on storage.objects;
create policy "resumes_public_read"   on storage.objects for select using (bucket_id = 'resumes');
create policy "resumes_authed_insert" on storage.objects for insert to authenticated with check (bucket_id = 'resumes');
create policy "resumes_authed_update" on storage.objects for update to authenticated using (bucket_id = 'resumes');

-- ── Запити від компаній до кандидата ─────────────────────────────────────────
create table if not exists public.candidate_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade, -- кандидат-отримувач
  company_id   uuid,
  company_name text,
  type         text not null,                 -- case | contact | interview
  message      text,
  proposed_at  timestamptz,                   -- запропонована дата (для інтервʼю)
  status       text not null default 'new',   -- new | accepted | declined
  created_at   timestamptz not null default now()
);
create index if not exists idx_creq_user on public.candidate_requests (user_id, created_at desc);

alter table public.candidate_requests enable row level security;

drop policy if exists "creq_self_read"   on public.candidate_requests;
drop policy if exists "creq_self_update" on public.candidate_requests;
drop policy if exists "creq_authed_insert" on public.candidate_requests;
-- кандидат бачить і відповідає на свої запити
create policy "creq_self_read"   on public.candidate_requests for select to authenticated using (user_id = auth.uid());
create policy "creq_self_update" on public.candidate_requests for update to authenticated using (user_id = auth.uid());
-- компанії (автентифіковані) можуть створювати запити (демо-спрощення)
create policy "creq_authed_insert" on public.candidate_requests for insert to authenticated with check (true);
