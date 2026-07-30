-- ============================================================
-- Фаза 3, крок 3: авто-структура папок вакансії в Google Drive
-- ============================================================
-- Зберігаємо на вакансії id/лінк кореневої папки вакансії в Drive та мапу
-- підпапок-категорій (щоб не створювати повторно й щоб імпорт міг цілити в
-- правильну підпапку). Структуру створює Edge `create-vacancy-folders`
-- (сервісний акаунт, scope drive) — сама вставка значень іде під service_role.
-- ============================================================

alter table public.vacancies add column if not exists drive_folder_id   text;
alter table public.vacancies add column if not exists drive_folder_link text;
-- Мапа: { "<category_key>": { "id": "...", "link": "..." }, "_root": {...},
--         "_client": {...}, "_project": {...} }
alter table public.vacancies add column if not exists drive_folders jsonb not null default '{}'::jsonb;

comment on column public.vacancies.drive_folder_id is
  'ID кореневої папки вакансії в Google Drive (auto: create-vacancy-folders).';
comment on column public.vacancies.drive_folders is
  'Мапа підпапок-категорій вакансії в Drive: category_key → {id, link}.';
