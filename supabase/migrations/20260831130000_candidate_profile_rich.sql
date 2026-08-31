-- Багатий профіль кандидата: додаткові поля + сховище для фото.

alter table public.profiles
  add column if not exists headline      text,
  add column if not exists location      text,
  add column if not exists about         text,
  add column if not exists experience    text,
  add column if not exists skills        text[],
  add column if not exists linkedin_url  text,
  add column if not exists github_url    text,
  add column if not exists portfolio_url text;

-- ── Сховище аватарів (публічне читання, завантаження — автентифікованим) ──────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read"   on storage.objects;
drop policy if exists "avatars_authed_insert" on storage.objects;
drop policy if exists "avatars_authed_update" on storage.objects;
drop policy if exists "avatars_authed_delete" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_authed_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

create policy "avatars_authed_update" on storage.objects
  for update to authenticated using (bucket_id = 'avatars');

create policy "avatars_authed_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars');
