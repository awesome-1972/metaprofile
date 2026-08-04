-- ============================================================
-- Стоп-лист із зовнішнього джерела (Google Doc/Sheet) з автосинхронізацією
-- ============================================================
-- Клієнт часто веде стоп-лист у Google-документі. Прив'язуємо посилання до вакансії,
-- і Edge `sync-stoplist` періодично/за запитом читає документ і оновлює записи —
-- щоб не пропустити нового кандидата, доданого клієнтом у документ.
--   • vacancies.stop_list_source_url — посилання на Google Doc/Sheet.
--   • vacancies.stop_list_synced_at  — час останньої синхронізації.
--   • vacancy_stop_list.source       — 'manual' | 'gdoc' (щоб синк не чіпав ручні записи).
-- ============================================================

alter table public.vacancies
  add column if not exists stop_list_source_url text,
  add column if not exists stop_list_synced_at  timestamptz;

alter table public.vacancy_stop_list
  add column if not exists source text not null default 'manual';

comment on column public.vacancies.stop_list_source_url is 'Посилання на Google Doc/Sheet зі стоп-листом клієнта.';
comment on column public.vacancy_stop_list.source is 'Джерело запису стоп-листа: manual (вручну) | gdoc (із Google-документа).';
