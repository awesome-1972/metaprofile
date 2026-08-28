-- Збір відповідей чек-листа тестувальників ATS у єдину таблицю.
-- Запис — лише через Edge `tester-feedback` (service_role); публічного доступу немає.
create table if not exists public.tester_feedback (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  tester        text,
  tester_date   text,
  role          text,
  overall_score text,
  ready         text,
  critical      text,
  likes         text,
  answers       jsonb not null default '{}'::jsonb,
  user_agent    text
);

alter table public.tester_feedback enable row level security;

-- Читання — будь-який автентифікований користувач застосунку (внутрішній фідбек).
do $$ begin
  create policy "authenticated read tester_feedback"
    on public.tester_feedback for select
    using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;

-- INSERT робить лише service_role (Edge). Жодних public/anon політик на запис.
create index if not exists idx_tester_feedback_created on public.tester_feedback(created_at desc);
