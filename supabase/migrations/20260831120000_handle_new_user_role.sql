-- Призначення ролі/профілю при реєстрації (виправляє «вхід викидає назад на форму»).
-- Роль присвоюється серверним тригером (SECURITY DEFINER, обходить RLS) з raw_user_meta_data,
-- який передає форма реєстрації (options.data.role). Плюс бекфіл для вже створених користувачів.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
  v_full text := new.raw_user_meta_data->>'full_name';
  v_company text := new.raw_user_meta_data->>'company_name';
begin
  v_role := case new.raw_user_meta_data->>'role'
              when 'company' then 'company'::public.app_role
              when 'admin'   then 'admin'::public.app_role
              else 'candidate'::public.app_role
            end;

  insert into public.profiles (user_id, email, full_name)
  values (new.id, new.email, v_full)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, v_role)
  on conflict (user_id, role) do nothing;

  if v_role = 'company' and coalesce(v_company, '') <> '' then
    insert into public.companies (owner_id, name)
    values (new.id, v_company);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Бекфіл: ролі для вже створених користувачів без ролі ─────────────────────
insert into public.user_roles (user_id, role)
select u.id,
       case u.raw_user_meta_data->>'role'
         when 'company' then 'company'::public.app_role
         when 'admin'   then 'admin'::public.app_role
         else 'candidate'::public.app_role
       end
from auth.users u
left join public.user_roles r on r.user_id = u.id
where r.user_id is null
on conflict (user_id, role) do nothing;

-- профілі для тих, у кого їх немає
insert into public.profiles (user_id, email, full_name)
select u.id, u.email, u.raw_user_meta_data->>'full_name'
from auth.users u
left join public.profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;
