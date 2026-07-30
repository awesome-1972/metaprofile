# Архітектурний план: матчинг кандидатів, рейтинг збігу, магічний імпорт вакансії

**Дата:** 2026-07-30. Джерело ідей: конкурентний аналіз The AIHA (`competitive-brief-the-aiha.md`).

## Наявні будівельні блоки
- **Кандидати** `ats_candidates.resume_parsed` (Json): `{summary, positions:[{title,company,from,to,description}], education[], skills[], languages[], messengers}`. Є `tenant_id`, `is_anonymized`.
- **RLS доступу до кандидата** `mp_can_access_candidate(id)`: admin АБО `created_by=uid` АБО через `applications` до доступної вакансії. Тобто рекрутер **не бачить увесь пул тенанта** без адмінства/авторства — центральний нюанс Фічі 1.
- **Бріф/компетенції**: `vacancy_briefs.answers` (jsonb), `vacancy_competencies` (вага), `competency_scores` (1–3 на заявку; пороги 2.34/1.67 — `use-competency-scores.ts`). Це **людська пост-інтерв'ю оцінка**, не перед-скрин.
- **Edge-контракт** (еталон `parse-resume`/`parse-cv-preview`): `verify_jwt`, `getUser(jwt)`, service_role bypass, `asCaller.rpc` для scope, Anthropic forced tool-use, temperature 0, типізовані помилки. Anthropic **без ембедингів**.
- БД: default FTS Postgres; `pg_trgm`/`pgvector` ще НЕ підключені; укр-словника FTS немає (лише `simple`).

## Фіча 1 — «Рекомендовані кандидати з бази під бріф» (головна)

**Підхід — гібрид, поетапно:**
- **Фаза 1 (без нових розширень):** з брифу+компетенцій збираємо «профіль ролі» (обов'язкові/бажані навички, тайтли, рівень) → детермінований pre-filter по тенанту в Edge (токен-overlap над `resume_parsed.skills`/`positions.title`/`summary`, за потреби FTS/`pg_trgm`, виключаючи `is_anonymized`) → топ-20–30 у Anthropic (forced tool-use) для скору ролі 0–100 + `matched_skills/gaps/rationale`.
- **Фаза 2 (за потреби):** `pgvector` + зовнішні ембединги (Voyage) для семантичного retrieval, LLM-re-rank лишається.
- Для 1 тенанта й сотень кандидатів Фаза 1 дає семантичну якість негайно й переви­користовує вже підключений Anthropic; ембединги виправдані на тисячах+.

**Де рахувати:** нова Edge `recommend-candidates` (дзеркалить `parse-resume`): scope `mp_can_edit_vacancy`, читання кандидатів під service_role строго з `tenant_id` вакансії, Anthropic forced tool-use → масив `{candidate_id, score, matched_skills[], gaps[], rationale}`.

**Модель даних (матеріалізація з кешем):** таблиця `vacancy_candidate_matches` (`vacancy_id`, `candidate_id`, `tenant_id`, `score int 0–100`, `breakdown jsonb`, `brief_fingerprint text`, `computed_at`, `created_by`; `unique(vacancy_id,candidate_id)`, індекси `(vacancy_id,score desc)`,`(tenant_id)`). Перерахунок — кнопкою або коли `brief_fingerprint` застарів. RLS: `mp_can_access_vacancy` + `tenant_id=mp_current_tenant()`. Клієнт лише читає — жодного LLM на read-path.

**Ключове рішення (ризик видимості):** рекомендації відкривають кандидатів поза scope рекрутера. MVP: функція повертає **обмежене превʼю** (ПІБ/skills/score) під service_role; повний доступ до картки — лише після «додати у воронку» (створення application легітимізує доступ через наявний RLS).

**UI:** новий таб **«Рекомендовані»** у `VacancyDetailPage`; хук `use-candidate-matches.ts` (за зразком `use-competency-scores.ts`). Тригер — коли бріф/компетенції заповнені.

## Фіча 2 — «Рейтинг збігу 0–100%» як фільтр воронки
- **Не змішувати** match% (авто перед-скрин, Фіча 1) і вердикт компетенцій (людський пост-інтерв'ю). Показуємо обидва.
- При «додати у воронку» знімок скору → `applications.match_score int`, `match_breakdown jsonb`, `match_computed_at`. Світлофор: зелений ≥75, жовтий 50–74, червоний <50. Фільтр/сорт воронки по `match_score` (індекс `(vacancy_id, match_score desc)`).
- RLS-поверхня не зростає (`applications` вже tenantована); read-path без LLM. Ручні кандидати → `match_score=null` (нейтральний бейдж).

## Фіча 3 — «Магічний імпорт вакансії»
Edge `import-vacancy` (preview-only, як `parse-cv-preview`):
```
POST { source: { url?, text? }, hiring_project_id? }
 200 { parsed: { title, seniority, employment_type, location, remote,
        responsibilities[], requirements[], nice_to_have[], skills[],
        languages[], salary_range?, raw_description }, source_chars }
 401/403/422(no_source|fetch_failed|empty_text)/429/502/503/500
```
- Auth `verify_jwt`+`getUser`; scope `mp_is_internal`.
- URL-шлях — server-side fetch із **SSRF-захистом** (тільки https, блок localhost/приватних IP/редіректів, ліміт, таймаут), HTML→текст → Anthropic forced tool-use. Text-шлях — напряму.
- Preview → рекрутер редагує → створення вакансії наявним шляхом. Вхід — кнопка «Магічний імпорт» на `VacanciesListPage`/у діалозі створення.

## Послідовність впровадження
1. **Фіча 3 (магічний імпорт)** — найменша, дзеркалить `parse-cv-preview`; ризик — SSRF.
2. **Фіча 1 Фаза 1** — Edge `recommend-candidates` + `vacancy_candidate_matches` + таб «Рекомендовані». Головна.
3. **Фіча 2** — `match_score` на `applications` + світлофор + фільтр воронки. Залежить від Фічі 1.
4. **Фіча 1 Фаза 2 (пізніше)** — pgvector + ембединги, якщо повноти бракує.

## Головні ризики
- **Розширення видимості кандидатів** поза `mp_can_access_candidate` (топ) — MVP обмежене превʼю, повний доступ після додавання у воронку.
- Слабка українська FTS — `simple`-конфіг + `pg_trgm`, або покладаємось на LLM.
- Немає ембедингів в Anthropic — pgvector потребує Voyage/OpenAI; не блокуємо ним Фазу 1.
- Вартість/латентність/недетермінізм LLM — кеш за `brief_fingerprint`, temperature 0, forced tool-use.
- PII/фінанси — виключати `is_anonymized`; фінансові поля НІКОЛИ не в матч-промт.
