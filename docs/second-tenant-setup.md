# Заведення другого (тестового) тенанта — покроково

Мета: перевірити ізоляцію мультитенанта (доступи/клієнти/проєкти не течуть між тенантами).
Тенант користувача визначається `profiles.tenant_id`. MetaVision = `11111111-1111-1111-1111-111111111111`,
тестовий = `22222222-2222-2222-2222-222222222222` (створюється міграцією `20260804190000`).

> Безпека входу: identity-таблиці (profiles/user_roles/roles) НЕ мають tenant-gate, тож вхід
> не залежить від тенант-контексту. Головне — коректно проставити `profiles.tenant_id` тестовому
> користувачу. Обліковий запис MetaVision НЕ чіпаємо.

## Крок 1. Накотити міграцію (додає тенант «Тестова агенція»)
```
npx supabase db push
```

## Крок 2. Створити тестового користувача (Supabase Dashboard)
Authentication → Users → **Add user** → email напр. `test-agency@metavision.ua` + пароль.
(Це має зробити людина — створення акаунтів автоматизувати не можна.)

## Крок 3. Прив'язати цього користувача до тестового тенанта (SQL Editor)
Підставте email тестового користувача. Виконати як є (SQL Editor працює повз RLS):
```sql
-- профіль → тестовий тенант (UPDATE; якщо 0 рядків — профіль ще не створено, див. нижче)
update public.profiles
   set tenant_id = '22222222-2222-2222-2222-222222222222'
 where user_id = (select id from auth.users where email = 'test-agency@metavision.ua');

-- якщо UPDATE оновив 0 рядків — створити профіль:
insert into public.profiles (user_id, email, tenant_id)
select id, email, '22222222-2222-2222-2222-222222222222'
  from auth.users where email = 'test-agency@metavision.ua'
on conflict (user_id) do update set tenant_id = excluded.tenant_id;

-- роль owner у тестовому тенанті (щоб бачив свій робочий простір)
insert into public.user_roles (user_id, role, tenant_id)
select id, 'owner', '22222222-2222-2222-2222-222222222222'
  from auth.users where email = 'test-agency@metavision.ua'
on conflict (user_id, role) do update set tenant_id = excluded.tenant_id;
```

## Крок 4. Перевірка (обов'язково — саме заради цього)
1. Увійти як **власник MetaVision** (`v.poddubny@metavision.ua`) → відкрити ATS: клієнти/проєкти/вакансії
   на місці, вхід і дані НЕ зламані. ✅
2. Вийти, увійти як **тестовий користувач** → ATS порожній (новий тенант, своїх даних ще нема). ✅
3. Тестовим користувачем створити клієнта («Тест-клієнт») → він з'явиться лише в тестовому тенанті.
4. Знову увійти власником MetaVision → «Тест-клієнта» **НЕ видно** (ізоляція працює). ✅
   І навпаки — тестовий не бачить клієнтів MetaVision.

> Примітка: наскрізного «супер-адмін» перегляду ВСІХ тенантів немає навмисно — RESTRICTIVE
> tenant-gate не пробиває навіть admin (fail-closed). Розподіл кожного тенанта дивимось,
> увійшовши в нього (сторінка «Розподіл»).

## Відкат (прибрати тестовий тенант)
```sql
-- повернути тестового користувача (або просто видалити його в Auth)
update public.profiles set tenant_id = '11111111-1111-1111-1111-111111111111'
 where user_id = (select id from auth.users where email = 'test-agency@metavision.ua');
delete from public.user_roles
 where user_id = (select id from auth.users where email = 'test-agency@metavision.ua')
   and tenant_id = '22222222-2222-2222-2222-222222222222';
-- (за потреби) прибрати сам тенант, якщо в ньому немає даних:
-- delete from public.tenants where id = '22222222-2222-2222-2222-222222222222';
```
