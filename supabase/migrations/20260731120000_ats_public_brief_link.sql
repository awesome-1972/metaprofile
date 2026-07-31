-- ============================================================
-- Публічне посилання на бріф кандидата (/brief/:token)
-- ============================================================
-- Рекрутер вмикає посилання → генерується public_token (uuid). Публічний Edge
-- `public-brief` (anon) віддає бріф за токеном (тільки коли is_link_enabled).
-- Клієнт (назва компанії) у публічну видачу НЕ потрапляє — лише позиція,
-- локація й текст бріфу (який уже враховує конфіденційність).
-- ============================================================

alter table public.vacancy_public_briefs
  add column if not exists public_token     uuid,
  add column if not exists is_link_enabled  boolean not null default false,
  add column if not exists published_at      timestamptz;

create unique index if not exists uq_public_briefs_token
  on public.vacancy_public_briefs (public_token)
  where public_token is not null;

comment on column public.vacancy_public_briefs.public_token is
  'Секретний токен публічного посилання /brief/:token. Видача — лише коли is_link_enabled.';
