-- ============================================================
-- Клієнтський портал вакансії: зовнішнє посилання /client/:token
-- ============================================================
-- Рекрутер вмикає посилання → генерується client_token (uuid). Публічний Edge
-- public-client-portal віддає за токеном обрані розділи: стратегія пошуку,
-- прогрес воронки, шорт-лист (зі звітами), «чистий» лонг-лист (досвід без
-- приміток рекрутера). Прапорці керують видимістю кожного розділу.
-- ============================================================

alter table public.vacancies
  add column if not exists client_token           uuid,
  add column if not exists client_share_enabled   boolean not null default false,
  add column if not exists client_show_strategy   boolean not null default true,
  add column if not exists client_show_progress   boolean not null default true,
  add column if not exists client_show_shortlist  boolean not null default true,
  add column if not exists client_show_longlist   boolean not null default true;

create unique index if not exists uq_vacancies_client_token
  on public.vacancies (client_token)
  where client_token is not null;

comment on column public.vacancies.client_token is
  'Секретний токен клієнтського порталу /client/:token. Активний лише коли client_share_enabled.';
