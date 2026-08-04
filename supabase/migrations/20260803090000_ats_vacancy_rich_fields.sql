-- ============================================================
-- Багатші поля вакансії: пріоритет, стиль роботи, графік, гео-обмеження
-- ============================================================
-- priority: normal|high|urgent (керує сортуванням/бейджем).
-- work_style: remote|office|hybrid (доповнює is_remote).
-- work_schedule: вільний текст (напр. «гнучкий старт 9–11»).
-- candidates_geo: «кандидати тільки з» (для сорсингу/порталу).
-- ============================================================

alter table public.vacancies
  add column if not exists priority       text not null default 'normal',
  add column if not exists work_style      text,
  add column if not exists work_schedule   text,
  add column if not exists candidates_geo  text;

create index if not exists idx_vacancies_priority on public.vacancies (priority);

comment on column public.vacancies.priority is 'Пріоритет: normal|high|urgent.';
comment on column public.vacancies.work_style is 'Стиль роботи: remote|office|hybrid.';
comment on column public.vacancies.candidates_geo is 'Гео-обмеження «кандидати тільки з» — для сорсингу/порталу.';
