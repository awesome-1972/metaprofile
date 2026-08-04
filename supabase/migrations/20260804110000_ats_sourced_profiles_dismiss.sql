-- ============================================================
-- Сорсинг: «Відхилити» знайдений профіль
-- ============================================================
-- dismissed_at — м'яке приховування профілю зі списку сорсингу (не видаляємо рядок,
-- щоб повторний пошук його не повертав як «новий» і щоб лишалась історія).
-- ============================================================

alter table public.sourced_profiles
  add column if not exists dismissed_at timestamptz;

create index if not exists idx_sourced_profiles_active
  on public.sourced_profiles (vacancy_id) where dismissed_at is null;

comment on column public.sourced_profiles.dismissed_at is 'Коли профіль відхилено (приховано зі списку сорсингу).';
