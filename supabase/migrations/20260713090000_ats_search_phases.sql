-- ============================================================
-- ATS: Етапи пошуку (search_phases) — двоповерхова воронка
-- ============================================================
-- Процес MetaVision: пошук ділиться на 6 етапів, і всередині КОЖНОГО
-- етапу — власна воронка (стадії). Раніше стадії були пласким списком
-- на вакансію; тепер кожна стадія належить етапу.
--
-- Етап 1 «Підготовка» — без кандидатів (бріф, стратегія пошуку, план
-- проекту, публічний бріф для кандидатів, матриця компетенцій).
-- Етапи 2–6 — містять кандидатів.
--
-- Гейт між етапами — МʼЯКИЙ: БД нічого не блокує, попередження в UI
-- (рішення власника 13.07). Тому тут немає guard-тригерів — лише модель.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Доменні enum-типи
-- ------------------------------------------------------------
-- Вид етапу. Прив'язаний до змісту, а не до назви: назву етапу можна
-- перейменувати на вакансії, а kind лишається машинним ключем (по ньому
-- працюють чеклист етапу 1, шаблони листів і аналітика).
create type public.search_phase_kind as enum (
  'preparation',        -- 1. Підготовка: бріф, стратегія, план, матриця
  'longlist',           -- 2. Лонг-лист і скринінг
  'shortlist',          -- 3. Шорт-лист: інтерв'ю по компетенціях, рекомендації
  'client_interviews',  -- 4. Співбесіди з замовником, фідбек, фіналісти
  'final',              -- 5. Кейси, фінальні інтерв'ю, вибір кандидата
  'offer'               -- 6. Офер: підготовка, узгодження, відправка
);

create type public.search_phase_status as enum ('pending', 'active', 'done');

-- ------------------------------------------------------------
-- 2. Таблиця етапів пошуку
-- ------------------------------------------------------------
create table public.search_phases (
  id            uuid primary key default gen_random_uuid(),
  vacancy_id    uuid not null references public.vacancies(id) on delete cascade,
  kind          public.search_phase_kind not null,
  name          text not null,
  position      integer not null,
  status        public.search_phase_status not null default 'pending',
  -- План проекту = дедлайни етапів (окремої таблиці плану не заводимо).
  planned_start date,
  planned_end   date,
  started_at    timestamptz,
  completed_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (vacancy_id, position),
  unique (vacancy_id, kind)
);
create index idx_search_phases_vacancy on public.search_phases (vacancy_id);

alter table public.search_phases enable row level security;

create trigger set_updated_at_search_phases
  before update on public.search_phases
  for each row execute function public.update_updated_at_column();

-- Дзеркалимо політики pipeline_stages: читає той, хто бачить вакансію;
-- пише той, хто має право редагувати вакансію.
create policy search_phases_select on public.search_phases
  for select to authenticated
  using (public.mp_can_access_vacancy(vacancy_id));

create policy search_phases_insert on public.search_phases
  for insert to authenticated
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy search_phases_update on public.search_phases
  for update to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id))
  with check (public.mp_can_edit_vacancy(vacancy_id));

create policy search_phases_delete on public.search_phases
  for delete to authenticated
  using (public.mp_can_edit_vacancy(vacancy_id));

-- Автопроставляння started_at/completed_at при зміні статусу етапу
-- (клієнт шле лише status — сервер фіксує час).
create or replace function public.mp_search_phase_timestamps()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'active' and new.started_at is null then
      new.started_at := now();
    end if;
    if new.status = 'done' then
      new.completed_at := coalesce(new.completed_at, now());
      new.started_at   := coalesce(new.started_at, now());
    else
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_search_phase_timestamps
  before update on public.search_phases
  for each row execute function public.mp_search_phase_timestamps();

-- ------------------------------------------------------------
-- 3. Стадія належить етапу
-- ------------------------------------------------------------
-- phase_id nullable: історичні стадії до backfill-у та «сирі» стадії, створені
-- напряму API, лишаються валідними (UI показує їх у групі «Без етапу»).
alter table public.pipeline_stages
  add column phase_id uuid references public.search_phases(id) on delete set null;
create index idx_pipeline_stages_phase on public.pipeline_stages (phase_id);

-- ------------------------------------------------------------
-- 4. Шаблон воронки знає про етапи
-- ------------------------------------------------------------
alter table public.pipeline_stage_template_items
  add column phase_kind     public.search_phase_kind not null default 'longlist',
  add column phase_name     text,
  add column phase_position integer not null default 2;

-- ------------------------------------------------------------
-- 5. Дефолтний шаблон MetaVision: 6 етапів
-- ------------------------------------------------------------
-- Старий плаский шаблон лишається в таблиці (історія), але дефолт — новий.
update public.pipeline_stage_templates set is_default = false where is_default;

insert into public.pipeline_stage_templates (id, name, is_default)
values ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'MetaVision — 6 етапів пошуку', true);

-- Етап 1 «Підготовка» кандидатів не містить — стадій у шаблоні для нього
-- немає; сам етап створюється функцією засіву окремо (див. п.6).
insert into public.pipeline_stage_template_items
  (template_id, name, stage_type, position, is_terminal, phase_kind, phase_name, phase_position)
values
  -- Етап 2. Лонг-лист і скринінг
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Ідентифікований',        'sourced',    1,  false, 'longlist',          'Лонг-лист і скринінг',      2),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Контакт встановлено',    'sourced',    2,  false, 'longlist',          'Лонг-лист і скринінг',      2),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Скринінг',               'screening',  3,  false, 'longlist',          'Лонг-лист і скринінг',      2),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Пройшов скринінг',       'screening',  4,  false, 'longlist',          'Лонг-лист і скринінг',      2),
  -- Етап 3. Шорт-лист
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Інтервʼю по компетенціях','interview', 5,  false, 'shortlist',         'Шорт-лист',                 3),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Оцінка і звіт',          'interview',  6,  false, 'shortlist',         'Шорт-лист',                 3),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Збір рекомендацій',      'interview',  7,  false, 'shortlist',         'Шорт-лист',                 3),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'У шорт-листі',           'interview',  8,  false, 'shortlist',         'Шорт-лист',                 3),
  -- Етап 4. Співбесіди з замовником
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Надіслано клієнту',      'interview',  9,  false, 'client_interviews', 'Співбесіди з замовником',   4),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Інтервʼю заплановано',   'interview',  10, false, 'client_interviews', 'Співбесіди з замовником',   4),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Інтервʼю проведено',     'interview',  11, false, 'client_interviews', 'Співбесіди з замовником',   4),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Фідбек клієнта',         'interview',  12, false, 'client_interviews', 'Співбесіди з замовником',   4),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Фіналіст',               'interview',  13, false, 'client_interviews', 'Співбесіди з замовником',   4),
  -- Етап 5. Кейси і фінальні інтервʼю
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Кейс надіслано',         'assessment', 14, false, 'final',             'Кейси і фінал',             5),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Кейс оцінено',           'assessment', 15, false, 'final',             'Кейси і фінал',             5),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Фінальне інтервʼю',      'interview',  16, false, 'final',             'Кейси і фінал',             5),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Обраний кандидат',       'assessment', 17, false, 'final',             'Кейси і фінал',             5),
  -- Етап 6. Офер
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Офер готується',         'offer',      18, false, 'offer',             'Офер',                      6),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Узгоджено з клієнтом',   'offer',      19, false, 'offer',             'Офер',                      6),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Офер надіслано',         'offer',      20, false, 'offer',             'Офер',                      6),
  ('4f6a2c10-7f31-4f2e-9a3e-6c1d5b0a1001', 'Прийнято',               'hired',      21, true,  'offer',             'Офер',                      6);

-- ------------------------------------------------------------
-- 6. Засів воронки вакансії: етапи + стадії з шаблону
-- ------------------------------------------------------------
-- security invoker (за замовчуванням) — усі вставки під RLS того, хто
-- викликає; редагувати вакансію може лише mp_can_edit_vacancy. Ідемпотентна:
-- якщо етапи вже є — повертає 0.
create or replace function public.mp_seed_vacancy_pipeline(
  p_vacancy_id  uuid,
  p_template_id uuid default null
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_template_id uuid;
  v_phases      integer := 0;
  v_stages      integer := 0;
  v_rows        integer := 0;
  v_first_stage uuid;
begin
  if exists (select 1 from public.search_phases where vacancy_id = p_vacancy_id) then
    return jsonb_build_object('ok', true, 'phases_created', 0, 'stages_created', 0);
  end if;

  select coalesce(
           p_template_id,
           (select id from public.pipeline_stage_templates order by is_default desc, created_at limit 1)
         )
    into v_template_id;

  if v_template_id is null then
    raise exception 'Немає жодного шаблону воронки';
  end if;

  -- 6.1 Етап «Підготовка» є завжди — навіть якщо шаблон його не описує
  -- (кандидатів у ньому немає, отже стадій у шаблоні для нього теж немає).
  insert into public.search_phases (vacancy_id, kind, name, position, status)
  values (p_vacancy_id, 'preparation', 'Підготовка', 1, 'active');
  v_phases := 1;

  -- 6.2 Решта етапів — з унікальних (phase_kind, phase_position) шаблону.
  insert into public.search_phases (vacancy_id, kind, name, position, status)
  select distinct on (i.phase_kind)
         p_vacancy_id,
         i.phase_kind,
         coalesce(i.phase_name, i.phase_kind::text),
         i.phase_position,
         'pending'
    from public.pipeline_stage_template_items i
   where i.template_id = v_template_id
     and i.phase_kind <> 'preparation'
   order by i.phase_kind, i.position;
  get diagnostics v_rows = row_count;
  v_phases := v_phases + v_rows;

  -- 6.3 Стадії шаблону → стадії вакансії, прив'язані до свого етапу.
  insert into public.pipeline_stages (vacancy_id, phase_id, name, stage_type, position, is_terminal)
  select p_vacancy_id,
         ph.id,
         i.name,
         i.stage_type,
         i.position,
         i.is_terminal
    from public.pipeline_stage_template_items i
    join public.search_phases ph
      on ph.vacancy_id = p_vacancy_id
     and ph.kind = i.phase_kind
   where i.template_id = v_template_id
   order by i.position;
  get diagnostics v_stages = row_count;

  -- 6.4 Заявки без стадії (створені до засіву) → на першу стадію воронки.
  select id into v_first_stage
    from public.pipeline_stages
   where vacancy_id = p_vacancy_id
   order by position
   limit 1;

  if v_first_stage is not null then
    update public.applications
       set current_stage_id = v_first_stage
     where vacancy_id = p_vacancy_id
       and current_stage_id is null;
  end if;

  return jsonb_build_object('ok', true, 'phases_created', v_phases, 'stages_created', v_stages);
end;
$$;

grant execute on function public.mp_seed_vacancy_pipeline(uuid, uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. BACKFILL: наявні вакансії з плаcкою воронкою → етапи
-- ------------------------------------------------------------
-- Для кожної вакансії, де вже є стадії: створюємо 6 етапів і розкладаємо
-- наявні стадії по етапах за stage_type. Кандидати не рухаються — вони
-- лишаються на своїх стадіях, які тепер просто мають етап-батька.
-- Етап 1 позначаємо done: якщо пошук уже йде, підготовка де-факто відбулась.
insert into public.search_phases (vacancy_id, kind, name, position, status)
select v.id, k.kind, k.name, k.position,
       case when k.position = 1 then 'done'::public.search_phase_status
            else 'pending'::public.search_phase_status end
  from public.vacancies v
 cross join (values
   ('preparation'::public.search_phase_kind,       'Підготовка',              1),
   ('longlist'::public.search_phase_kind,          'Лонг-лист і скринінг',    2),
   ('shortlist'::public.search_phase_kind,         'Шорт-лист',               3),
   ('client_interviews'::public.search_phase_kind, 'Співбесіди з замовником', 4),
   ('final'::public.search_phase_kind,             'Кейси і фінал',           5),
   ('offer'::public.search_phase_kind,             'Офер',                    6)
 ) as k(kind, name, position)
 where exists (select 1 from public.pipeline_stages s where s.vacancy_id = v.id)
   and not exists (select 1 from public.search_phases p where p.vacancy_id = v.id);

-- Мапимо наявні стадії на етапи за stage_type:
--   sourced/screening → лонг-лист; interview → шорт-лист;
--   assessment → фінал; offer/hired/rejected → офер (термінальні хвости).
update public.pipeline_stages s
   set phase_id = p.id
  from public.search_phases p
 where p.vacancy_id = s.vacancy_id
   and s.phase_id is null
   and p.kind = case s.stage_type
                  when 'sourced'    then 'longlist'
                  when 'screening'  then 'longlist'
                  when 'interview'  then 'shortlist'
                  when 'assessment' then 'final'
                  when 'offer'      then 'offer'
                  when 'hired'      then 'offer'
                  when 'rejected'   then 'offer'
                end::public.search_phase_kind;

-- Етап, у якому реально стоять кандидати, робимо активним (перший такий).
update public.search_phases p
   set status = 'active'
 where p.status = 'pending'
   and p.id = (
     select s.phase_id
       from public.pipeline_stages s
       join public.applications a on a.current_stage_id = s.id and a.status = 'active'
      where s.vacancy_id = p.vacancy_id
        and s.phase_id is not null
      order by s.position
      limit 1
   );

comment on table public.search_phases is
  'Етапи пошуку (6) на вакансію. Кожен етап має власну воронку стадій '
  '(pipeline_stages.phase_id). Етап 1 «Підготовка» — без кандидатів.';
