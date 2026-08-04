-- ============================================================
-- Talent CRM: теги кандидатів (приватний пул)
-- ============================================================
-- tags — довільні мітки для організації пулу кандидатів (напр. «senior», «python»,
-- «passive», «rehire»). Для швидкого пошуку/фільтрації — GIN-індекс.
-- ============================================================

alter table public.ats_candidates
  add column if not exists tags text[] not null default '{}';

create index if not exists idx_ats_candidates_tags on public.ats_candidates using gin (tags);

comment on column public.ats_candidates.tags is 'Довільні мітки для Talent CRM (пул кандидатів).';
