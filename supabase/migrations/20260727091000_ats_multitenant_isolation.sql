-- ============================================================
-- ATS: Мультитенант — Фаза 1b (ІЗОЛЯЦІЯ між тенантами)
-- ============================================================
-- Вмикає горизонтальну ізоляцію: користувач одного тенанта не бачить даних
-- іншого. Підхід — RESTRICTIVE tenant-gate політика на кожну ізольовану таблицю.
--
-- ЧОМУ RESTRICTIVE, а не переписування 25+ наявних політик:
--   Наявні PERMISSIVE-політики (scope через mp_can_* + admin-bypass) лишаються
--   недоторканими. RESTRICTIVE-політика комбінується з ними через AND — тобто
--   є ОБОВʼЯЗКОВИМ додатковим фільтром. Навіть глобальний admin-bypass
--   (mp_is_workspace_admin) НЕ пробʼє чужий тенант: RESTRICTIVE tenant-gate
--   відсіче рядки з іншим tenant_id. Мінімально інвазивно й безпечно.
--
-- Backfill тривіальний: тенант поки один (MetaVision), тому кожен рядок кожної
-- таблиці → MetaVision. Складні FK-ланцюги не потрібні; для МАЙБУТНІХ тенантів
-- нові рядки проставляє BEFORE-тригер mp_stamp_tenant (від mp_current_tenant).
--
-- ref_positions/ref_grades/ref_competencies — НЕ ізолюємо (глобальні довідники,
-- без PII, спільні між тенантами). tenants — корінь, має власну політику.
-- ============================================================

do $$
declare
  t text;
  meta constant uuid := '11111111-1111-1111-1111-111111111111';
  -- Усі таблиці з RLS, що містять дані тенанта. Кореневі 6 уже отримали
  -- tenant_id у Фазі 1a — для них `add column if not exists` — no-op.
  isolated text[] := array[
    'clients', 'ats_candidates', 'candidate_sources', 'rejection_reasons',
    'message_templates', 'pipeline_stage_templates', 'pipeline_stage_template_items',
    'hiring_projects', 'vacancies', 'applications', 'pipeline_stages', 'search_phases',
    'vacancy_briefs', 'vacancy_public_briefs', 'vacancy_brief_financials',
    'vacancy_financials', 'vacancy_competencies', 'vacancy_prompts',
    'vacancy_search_strategies', 'competency_scores', 'interviews',
    'candidate_reports', 'application_events', 'rejections', 'offers',
    'candidate_communications', 'access_grants'
  ];
begin
  foreach t in array isolated loop
    -- 1. Колонка tenant_id (денормалізація для простого й швидкого RLS-предиката).
    execute format(
      'alter table public.%I add column if not exists tenant_id uuid references public.tenants(id) on delete restrict',
      t
    );

    -- 2. Backfill: усе в MetaVision (тенант поки один).
    execute format('update public.%I set tenant_id = %L where tenant_id is null', t, meta);

    -- 3. Індекс для RLS-предиката.
    execute format(
      'create index if not exists idx_%I_tenant on public.%I (tenant_id)', t, t
    );

    -- 4. BEFORE-INSERT тригер авто-проставляння (ідемпотентно).
    execute format('drop trigger if exists trg_stamp_tenant on public.%I', t);
    execute format(
      'create trigger trg_stamp_tenant before insert on public.%I for each row execute function public.mp_stamp_tenant()',
      t
    );

    -- 5. RESTRICTIVE tenant-gate: обовʼязковий фільтр поверх наявних політик.
    --    Комбінується через AND — жоден bypass не пробʼє чужий тенант.
    execute format('drop policy if exists %I on public.%I', t || '_tenant_isolation', t);
    execute format(
      'create policy %I on public.%I as restrictive for all to authenticated '
      'using (tenant_id = public.mp_current_tenant()) '
      'with check (tenant_id = public.mp_current_tenant())',
      t || '_tenant_isolation', t
    );
  end loop;
end;
$$;

-- tenants: користувач бачить лише свій тенант (звужуємо політику 1a).
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated
  using (id = public.mp_current_tenant());

comment on schema public is
  'Мультитенант Фаза 1b: RESTRICTIVE tenant-gate на ізольованих таблицях. '
  'ref_* — глобальні довідники (спільні між тенантами).';
