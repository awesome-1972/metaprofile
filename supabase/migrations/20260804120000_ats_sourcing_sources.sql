-- ============================================================
-- Джерела кандидатів для AI-сорсингу
-- ============================================================
-- Довідник candidate_sources — глобальний. Додаємо записи під провайдерів сорсингу,
-- щоб імпортований профіль показував конкретне джерело (GitHub тощо), а не «невідоме».
-- Ідемпотентно: вставляємо лише якщо назви ще немає.
-- ============================================================

insert into public.candidate_sources (name, category)
select v.name, 'sourcing'
from (values ('GitHub'), ('People Data Labs'), ('Apollo'), ('Proxycurl')) as v(name)
where not exists (
  select 1 from public.candidate_sources cs where cs.name = v.name
);
