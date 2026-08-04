-- ============================================================
-- Публікація вакансії на публічному порталі /jobs
-- ============================================================
-- board_published_at — окремий від приватного лінка на бріф прапорець: керує тим,
-- чи показується вакансія у відкритій вітрині /jobs. Приватне посилання на бріф
-- (vacancy_public_briefs.is_link_enabled) призначене для надсилання конкретному
-- кандидату й САМЕ ПО СОБІ вакансію на портал не виводить.
-- ============================================================

alter table public.vacancies
  add column if not exists board_published_at timestamptz;

create index if not exists idx_vacancies_board_published
  on public.vacancies (board_published_at) where board_published_at is not null;

comment on column public.vacancies.board_published_at is 'Коли вакансію опубліковано на публічному порталі /jobs (null = не опублікована).';
