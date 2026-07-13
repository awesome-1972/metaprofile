-- ============================================================
-- ATS: Імпорт лонг-листа з Excel — поле «поточна компанія»
-- ============================================================
-- Лонг-лист MetaVision ведеться в Excel із колонками:
--   Компанія | ПІБ | Посада | Досвід | Соцмережі | Status | Коментарі
-- «Посада» лягає в наявний headline, соцмережі — в messengers/linkedin_url,
-- коментарі — в notes. Бракує лише поточної компанії — додаємо колонку.
--
-- Дедуплікація при імпорті (рішення власника): за email; якщо email порожній —
-- за точним ПІБ. Індекси нижче роблять цей пошук дешевим.
-- ============================================================

alter table public.ats_candidates
  add column if not exists current_company text;

-- Пошук дублів при імпорті (case-insensitive).
create index if not exists idx_ats_candidates_email_lower
  on public.ats_candidates (lower(email)) where email is not null;

create index if not exists idx_ats_candidates_name_lower
  on public.ats_candidates (lower(full_name));

comment on column public.ats_candidates.current_company is
  'Поточна (або остання) компанія кандидата — колонка «Компанія» лонг-листа.';
