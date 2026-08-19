-- ============================================================
-- Свої шаблони матриці компетенцій (competency_templates)
-- ============================================================
-- Рекрутер зберігає поточну матрицю вакансії як іменований шаблон і застосовує
-- його до інших вакансій одним кліком. groups jsonb містить повну структуру:
-- [{ group_name, group_weight, competencies:[{ name, name_en, weight,
--    questions[], probes[], red_flags[], rubric{}, is_must_have }] }].
-- Ізоляція по tenant (RESTRICTIVE gate + stamp trigger), як решта даних.
-- ============================================================

create table if not exists public.competency_templates (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete restrict,
  name          text not null,
  description   text,
  groups        jsonb not null default '[]'::jsonb,
  source_vacancy_id uuid references public.vacancies(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_competency_templates_tenant on public.competency_templates (tenant_id);

drop trigger if exists trg_stamp_tenant on public.competency_templates;
create trigger trg_stamp_tenant before insert on public.competency_templates
  for each row execute function public.mp_stamp_tenant();

drop trigger if exists set_updated_at_competency_templates on public.competency_templates;
create trigger set_updated_at_competency_templates
  before update on public.competency_templates
  for each row execute function public.update_updated_at_column();

alter table public.competency_templates enable row level security;

-- Читання/запис — будь-який автентифікований у межах свого tenant (шаблони
-- спільні для воркспейсу; редагувати/видаляти може будь-який внутрішній
-- користувач — це довідник, не чутливі дані).
drop policy if exists competency_templates_select on public.competency_templates;
create policy competency_templates_select on public.competency_templates
  for select to authenticated using (true);

drop policy if exists competency_templates_write on public.competency_templates;
create policy competency_templates_write on public.competency_templates
  for all to authenticated using (true) with check (true);

drop policy if exists competency_templates_tenant_isolation on public.competency_templates;
create policy competency_templates_tenant_isolation on public.competency_templates
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.competency_templates is 'Іменовані шаблони матриці компетенцій (groups jsonb) для повторного застосування у вакансіях. Ізоляція по tenant.';
