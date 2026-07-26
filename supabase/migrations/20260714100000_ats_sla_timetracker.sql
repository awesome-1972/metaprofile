-- ============================================================
-- ATS: Тайм-трекер SLA — світлофор зелений/жовтий/червоний
-- ============================================================
-- Дві осі часу (рішення власника):
--   1) КАНДИДАТ на стадії — скільки днів заявка стоїть без руху. Прапорець на
--      картці. Пороги — на стадії (nullable), fallback на глобальний дефолт.
--   2) ЕТАП vs план — search_phases.planned_end (уже є) проти сьогодні. Прапорець
--      на заголовку етапу. Тут нових колонок не треба.
--
-- «Днів на стадії» рахуємо з applications.stage_entered_at (нова колонка), яку
-- проставляє BEFORE-тригер при зміні current_stage_id — дешевше за агрегацію
-- application_events на кожен рендер.
-- ============================================================

-- ------------------------------------------------------------
-- 1. SLA-пороги на стадію (nullable → глобальний дефолт на клієнті)
-- ------------------------------------------------------------
alter table public.pipeline_stages
  add column if not exists sla_yellow_days integer,
  add column if not exists sla_red_days    integer;

comment on column public.pipeline_stages.sla_yellow_days is
  'Днів на стадії до жовтого прапорця. NULL → глобальний дефолт клієнта.';
comment on column public.pipeline_stages.sla_red_days is
  'Днів на стадії до червоного прапорця. NULL → глобальний дефолт клієнта.';

-- ------------------------------------------------------------
-- 2. Час входу заявки на поточну стадію
-- ------------------------------------------------------------
alter table public.applications
  add column if not exists stage_entered_at timestamptz;

-- BEFORE-тригер: проставляє stage_entered_at при створенні й при кожній зміні
-- стадії. AFTER-тригер mp_log_stage_change лишається для журналу подій.
create or replace function public.mp_stamp_stage_entered()
returns trigger language plpgsql
set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.stage_entered_at := coalesce(new.stage_entered_at, now());
  elsif tg_op = 'UPDATE' and new.current_stage_id is distinct from old.current_stage_id then
    new.stage_entered_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_stage_entered on public.applications;
create trigger trg_stamp_stage_entered
  before insert or update of current_stage_id on public.applications
  for each row execute function public.mp_stamp_stage_entered();

-- ------------------------------------------------------------
-- 3. BACKFILL: для наявних заявок — час останньої зміни стадії з журналу,
--    інакше applied_at.
-- ------------------------------------------------------------
update public.applications a
   set stage_entered_at = coalesce(
     (select max(e.created_at)
        from public.application_events e
       where e.application_id = a.id
         and e.event_type in ('stage_changed', 'created')),
     a.applied_at
   )
 where a.stage_entered_at is null;
