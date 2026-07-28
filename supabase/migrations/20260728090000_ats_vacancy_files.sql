-- ============================================================
-- Metaprofile ATS — Фаза 3, крок 1: сховище файлів вакансії
-- ============================================================
-- Модель (рішення власника): Google Drive — сховище файлів, Postgres —
-- джерело правди (метадані + лінки). Структура папок вакансії дзеркалить
-- реальні проєкти агенції: Long List, CVs, Матриця компетенцій, Reports,
-- Presentation to Client, Contracts, From Client, Voice-to-Text.
--
-- Крок 1 (цей): таблиця метаданих + прив'язка Drive-лінків до вакансії за
-- категоріями. Авто-створення папок Drive сервісним акаунтом — крок 3.
--
-- Категорія (folder) — text, не enum: категорії гнучкі, редагуються з коду
-- (TS-каталог), без міграції під кожну нову папку.
-- Дедуп: унікальність за drive_file_id у межах вакансії (той самий файл
-- Drive не реєструється двічі); збіг за іменем — м'яке попередження в UI.
-- ============================================================

create table if not exists public.vacancy_files (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete restrict,
  vacancy_id    uuid not null references public.vacancies(id) on delete cascade,
  category      text not null default 'other',
  name          text not null,
  drive_file_id text,
  web_view_link text,
  mime_type     text,
  size_bytes    bigint,
  content_hash  text,
  note          text,
  uploaded_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_vacancy_files_vacancy on public.vacancy_files (vacancy_id);
create index if not exists idx_vacancy_files_category on public.vacancy_files (vacancy_id, category);
-- Дедуп: один і той самий файл Drive у межах вакансії — лише раз.
create unique index if not exists uq_vacancy_files_drive
  on public.vacancy_files (vacancy_id, drive_file_id)
  where drive_file_id is not null;

-- Backfill tenant (єдиний тенант) + авто-проставляння на нові рядки.
update public.vacancy_files set tenant_id = '11111111-1111-1111-1111-111111111111'
 where tenant_id is null;
create index if not exists idx_vacancy_files_tenant on public.vacancy_files (tenant_id);
drop trigger if exists trg_stamp_tenant on public.vacancy_files;
create trigger trg_stamp_tenant before insert on public.vacancy_files
  for each row execute function public.mp_stamp_tenant();

alter table public.vacancy_files enable row level security;

-- Читає той, хто бачить вакансію; пише/видаляє — редактор вакансії. Дзеркалить
-- pipeline_stages / vacancy_stop_list.
drop policy if exists vacancy_files_select on public.vacancy_files;
create policy vacancy_files_select on public.vacancy_files
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

drop policy if exists vacancy_files_insert on public.vacancy_files;
create policy vacancy_files_insert on public.vacancy_files
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists vacancy_files_update on public.vacancy_files;
create policy vacancy_files_update on public.vacancy_files
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

drop policy if exists vacancy_files_delete on public.vacancy_files;
create policy vacancy_files_delete on public.vacancy_files
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- RESTRICTIVE tenant-gate (ізоляція між тенантами).
drop policy if exists vacancy_files_tenant_isolation on public.vacancy_files;
create policy vacancy_files_tenant_isolation on public.vacancy_files
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.vacancy_files is
  'Файли вакансії: метадані + лінки на Google Drive за категоріями-папками. '
  'Drive — сховище, Postgres — джерело правди. Дедуп за drive_file_id у межах вакансії.';
