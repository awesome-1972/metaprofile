-- ============================================================
-- Metaprofile ATS — крок 7/7: seed-дані (розділ 8 «Seed-дані»)
-- ============================================================

-- 1) Внутрішній клієнт студії (вироджений випадок агенційної моделі — ADR).
insert into public.clients (name, status, is_internal)
values ('YODEZEEN (внутрішній найм)', 'active', true);

-- 2) Дефолтний шаблон воронки.
with t as (
  insert into public.pipeline_stage_templates (name, is_default)
  values ('Стандартна агенційна воронка', true) returning id
)
insert into public.pipeline_stage_template_items (template_id, name, stage_type, position, is_terminal)
select t.id, x.name, x.stage_type, x.position, x.is_terminal from t,
(values
  ('Sourced','sourced'::public.stage_type,1,false),
  ('Screening','screening'::public.stage_type,2,false),
  ('Interview','interview'::public.stage_type,3,false),
  ('Assessment','assessment'::public.stage_type,4,false),   -- міст до Metaprofile-оцінки (M4a.8)
  ('Offer','offer'::public.stage_type,5,false),
  ('Hired','hired'::public.stage_type,6,true),
  ('Rejected','rejected'::public.stage_type,7,true)
) as x(name,stage_type,position,is_terminal);

-- 3) Базові джерела кандидатів.
insert into public.candidate_sources (name, category) values
  ('Referral','referral'),('LinkedIn','social'),('Job board','job_board'),
  ('Direct application','direct'),('Agency database','agency');

-- 4) Причини відмов.
insert into public.rejection_reasons (code, label, category) values
  ('withdrew','Кандидат відкликав кандидатуру','candidate_withdrew'),
  ('failed_screen','Не пройшов скринінг','failed_screening'),
  ('failed_interview','Не пройшов інтервʼю','failed_interview'),
  ('failed_assessment','Не пройшов оцінку','failed_assessment'),
  ('comp_mismatch','Розбіжність по компенсації','compensation_mismatch'),
  ('position_closed','Вакансію закрито','position_closed'),
  ('better_candidate','Обрано іншого кандидата','better_candidate'),
  ('no_show','Не зʼявився','no_show'),
  ('other','Інше','other');
