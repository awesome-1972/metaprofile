-- ============================================================
-- Metaprofile ATS — фаза M4b, крок 0/2: розширення enum-типів.
-- Спец.: docs/requirements/ats-agency-features.md (вимога 3 — гібрид V3 +
-- Додаток B — уточнення власника: третя роль «Асистент», не «адміністратор»).
-- ------------------------------------------------------------
-- КРИТИЧНО (як і 20260704090000_ats_enum_role_extension.sql): ALTER TYPE ...
-- ADD VALUE не можна виконати в одній транзакції разом із подальшим
-- використанням нового значення (PostgreSQL обмеження) — тому це ОКРЕМА,
-- найперша міграція фази M4b. Наступна міграція
-- (20260706090000_ats_m4b_grants_comms_resume.sql), що використовує
-- 'vacancy' і 'assistant', застосовується окремою подальшою транзакцією,
-- де нові значення enum вже видимі.
--
-- Вимога 3 / Додаток B (гібрид V3, docs/requirements/ats-agency-features.md):
--   • «ведучий партнер — до всіх» → наявний client-scope грант (без змін).
--   • «виділений рекрутер» і «Асистент — до своїх вакансій» → НОВИЙ третій
--     scope_type='vacancy' в access_grants (гранулярний грант на 1 вакансію) +
--     денормалізоване vacancies.assigned_recruiter_id для UI/фільтрів (див.
--     наступну міграцію, розділ 1).
--   • «Асистент» — НЕ глобальна роль admin/owner (яка залишається bypass-us-
--     everything за ADR-010 B2) — це третя внутрішня роль app_role, вужча за
--     recruiter лише семантично назви посади; фактичний доступ визначається
--     виключно грантами (client/hiring_project/vacancy), як і в recruiter.
--     Додається в mp_is_internal() у наступній міграції.
-- ============================================================

alter type public.grant_scope add value if not exists 'vacancy';
alter type public.app_role    add value if not exists 'assistant';

-- Порядок значень для довідки (НЕ покладатися на нього в коді):
--   grant_scope: client, hiring_project, vacancy
--   app_role:    admin, company, candidate, owner, recruiter, assistant
