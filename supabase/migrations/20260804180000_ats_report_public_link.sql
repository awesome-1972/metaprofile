-- ============================================================
-- Захищене посилання на звіт по кандидату (доставка клієнту)
-- ============================================================
-- Після редагування рекрутер вмикає доступ за токеном — клієнт відкриває
-- /report/:token (без входу) і може зберегти PDF (друк). Аналог публічного бріфу.
-- ============================================================

alter table public.candidate_reports
  add column if not exists public_token uuid,
  add column if not exists is_shared boolean not null default false,
  add column if not exists shared_at timestamptz;

create index if not exists idx_candidate_reports_public_token
  on public.candidate_reports (public_token) where public_token is not null;

comment on column public.candidate_reports.public_token is 'Токен публічного доступу до звіту (/report/:token).';
comment on column public.candidate_reports.is_shared is 'Чи відкрито доступ клієнту за посиланням.';
