-- ============================================================
-- Metaprofile ATS — крок 1/7: розширення app_role
-- Спец.: docs/specs/metaprofile-ats-schema.md (розділ 2.1, ADR-010 шар 1)
-- ------------------------------------------------------------
-- Наявний app_role (з 20260205075826): 'admin' | 'company' | 'candidate'.
-- ADR-010 додає 'owner' (над admin) і 'recruiter' (внутрішня fail-closed роль).
--
-- КРИТИЧНО: ALTER TYPE ... ADD VALUE не можна виконати в одній транзакції
-- разом із подальшим використанням нового значення (PostgreSQL обмеження) —
-- тому це ОКРЕМА, найперша ATS-міграція. Наступні міграції (helpers/RLS),
-- що використовують 'owner'/'recruiter', застосовуються окремими подальшими
-- транзакціями, де нові значення enum вже видимі.
-- ============================================================

alter type public.app_role add value if not exists 'owner';
alter type public.app_role add value if not exists 'recruiter';

-- Порядок значень для довідки (НЕ покладатися на нього в коді):
--   admin, company, candidate, owner, recruiter
