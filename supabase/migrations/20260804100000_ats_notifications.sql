-- ============================================================
-- Сповіщення в застосунку (approval flow Фаза 2)
-- ============================================================
-- notifications — стрічка сповіщень для конкретного користувача (in-app «дзвіночок»).
-- Пише Edge `notify` (service_role) на події затвердження requisition:
--   • подано на затвердження → сповіщення всім адмінам-затверджувачам тенанта;
--   • рішення (approved/changes_requested/rejected) → сповіщення авторові вакансії.
-- Читає/позначає прочитаним — лише сам отримувач.
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid references public.tenants(id) on delete restrict,
  user_id     uuid not null references auth.users(id) on delete cascade,  -- отримувач
  kind        text not null,                       -- approval_submitted|approval_decision|...
  title       text not null,
  body        text,
  link        text,                                -- напр. /ats/vacancies/<id>
  entity_type text,                                -- vacancy|project|...
  entity_id   uuid,
  read_at     timestamptz,
  created_by  uuid references auth.users(id) on delete set null,  -- ініціатор події
  created_at  timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read_at is null;
create index if not exists idx_notifications_tenant on public.notifications (tenant_id);

drop trigger if exists trg_stamp_tenant on public.notifications;
create trigger trg_stamp_tenant before insert on public.notifications
  for each row execute function public.mp_stamp_tenant();

alter table public.notifications enable row level security;

-- Отримувач бачить і позначає прочитаним лише свої сповіщення.
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Вставку робить лише service_role (Edge notify) — окремої authenticated-insert
-- політики немає, тож клієнт не може створювати сповіщення іншим.

-- RESTRICTIVE tenant-gate.
drop policy if exists notifications_tenant_isolation on public.notifications;
create policy notifications_tenant_isolation on public.notifications
  as restrictive for all to authenticated
  using (tenant_id = public.mp_current_tenant())
  with check (tenant_id = public.mp_current_tenant());

comment on table public.notifications is 'In-app сповіщення користувача. Пише Edge notify (service_role); читає/позначає лише отримувач.';
