-- ============================================================
-- Metaprofile ATS — Interview Kit + Comparison Matrix (MVP+, roadmap
-- docs/roadmap-ATS-platform.md розділ 2 "MVP+"):
--   • Interview Kit — розширення vacancy_competencies питаннями-підказками
--     (probes), ознаками невідповідності (red_flags), рубрикою опису балів
--     1/2/3 (rubric) і прапорцем "must-have" (is_must_have) для gate у
--     comparison matrix.
--   • Comparison matrix — ручний override short-list-рішення на applications
--     (shortlist_override / shortlist_override_reason), коли рекрутер
--     свідомо відхиляється від автоматичного вердикту (напр. кандидат не
--     проходить must-have gate, але є підстава розглянути далі).
--
-- НЕ дублює наявні таблиці (20260705100000_ats_m4c_brief_competencies_reports.sql):
-- vacancy_competencies і competency_scores лишаються тими самими таблицями,
-- лише отримують нові колонки. RLS на обох таблицях уже є і НЕ змінюється —
-- vacancy_competencies_update/applications_update вже гейтуються через
-- mp_can_edit_vacancy(vacancy_id), тому нові колонки автоматично підпадають
-- під той самий scope без нових політик.
-- ============================================================

-- ------------------------------------------------------------
-- 1. vacancy_competencies — Interview Kit
-- ------------------------------------------------------------

-- is_must_have: компетенція, без якої кандидат не може пройти в short list
-- автоматично (Comparison matrix "must-have gate" — розділ 16 бачення
-- advanced_ats_platform_structure.md). Дефолт false — існуючі рядки
-- лишаються "звичайними" компетенціями без gate-ефекту.
alter table public.vacancy_competencies
  add column if not exists is_must_have boolean not null default false;

comment on column public.vacancy_competencies.is_must_have is
  'Must-have компетенція: бал < 2 (нижче "часткової відповідності") у будь-якій '
  'is_must_have=true компетенції блокує кандидата від автоматичного short list '
  '(Comparison matrix must-have gate) — потрібен явний human override.';

-- probes: масив рядків — уточнюючі питання, які інтервʼюер задає ПІСЛЯ
-- основного питання (questions), якщо відповідь неповна/неоднозначна.
-- Окремо від questions (готові стартові питання) — probes саме
-- "поглиблюючі", застосовуються за потреби, не завжди.
alter table public.vacancy_competencies
  add column if not exists probes jsonb not null default '[]'::jsonb;

comment on column public.vacancy_competencies.probes is
  'jsonb-масив рядків: уточнюючі питання ("probes") для інтервʼюера — '
  'задаються за потреби, якщо відповідь на основне питання (questions) '
  'неповна або неоднозначна.';

-- red_flags: масив рядків — конкретні ознаки в відповіді кандидата, що
-- сигналізують про невідповідність цій компетенції. Показуються
-- інтервʼюеру як попередження під час оцінки (CompetencyScoreDialog).
alter table public.vacancy_competencies
  add column if not exists red_flags jsonb not null default '[]'::jsonb;

comment on column public.vacancy_competencies.red_flags is
  'jsonb-масив рядків: ознаки невідповідності компетенції в відповіді '
  'кандидата — відображаються інтервʼюеру як попередження під час оцінки.';

-- rubric: мапа рівень(1..3, як текстовий ключ)→опис — "що саме означає цей
-- бал" для цієї конкретної компетенції, щоб різні інтервʼюери оцінювали
-- відносно однакового критерію (доказовість оцінки, Додаток A).
alter table public.vacancy_competencies
  add column if not exists rubric jsonb not null default '{}'::jsonb;

comment on column public.vacancy_competencies.rubric is
  'jsonb-об''єкт {"1": "опис балу 1", "2": "опис балу 2", "3": "опис балу 3"} — '
  'рубрика для узгодженої оцінки різними інтервʼюерами (шкала 1..3, Додаток A).';

-- ------------------------------------------------------------
-- 2. applications — human override short-list-рішення (Comparison matrix)
-- ------------------------------------------------------------

-- shortlist_override: ручний вибір рекрутера "все одно в short list",
-- незалежно від автоматичного вердикту зваженого бала / must-have gate.
alter table public.applications
  add column if not exists shortlist_override boolean not null default false;

comment on column public.applications.shortlist_override is
  'Ручний вибір рекрутера "у short list" у Comparison matrix, що перекриває '
  'автоматичний вердикт (зважений бал / must-have gate). Завжди йде разом '
  'із заповненим shortlist_override_reason (UI вимагає причину, БД — не '
  'форсує NOT NULL, щоб не блокувати старі/автоматичні записи).';

-- shortlist_override_reason: обовʼязкове (на рівні UI) обґрунтування
-- override — чому кандидат розглядається попри автоматичний вердикт.
alter table public.applications
  add column if not exists shortlist_override_reason text;

comment on column public.applications.shortlist_override_reason is
  'Причина ручного override short-list-рішення (заповнюється разом із '
  'shortlist_override=true) — UI Comparison matrix вимагає непорожній текст '
  'перед збереженням override, БД-constraint свідомо не додається (внутрішній '
  'інструмент, той самий підхід, що й до note в competency_scores).';

-- RLS: обидві таблиці вже мають політики (20260704090500_ats_rls_policies.sql
-- для applications, 20260705100000_ats_m4c_brief_competencies_reports.sql для
-- vacancy_competencies) — SELECT через mp_can_access_vacancy(vacancy_id) (або
-- напряму на applications), INSERT/UPDATE через mp_can_edit_vacancy(vacancy_id).
-- Нові колонки автоматично підпадають під ці ж політики (row-level, не
-- column-level RLS) — жодних нових/змінених policy не потрібно.
