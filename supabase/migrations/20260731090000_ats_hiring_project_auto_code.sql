-- ============================================================
-- Авто-код замовлення проекту найму (per-client, hard)
-- ============================================================
-- Рішення власника: код генерується автоматично, окрема нумерація під кожного
-- клієнта, не редагується вручну. Префікс — з назви клієнта (ініціали слів або
-- перші літери одного слова), номер — послідовний у межах клієнта (за наявними
-- кодами цього префікса): напр. «Confidential Retail» → CR-001, CR-002;
-- «MetaVision» → MET-001.
--
-- BEFORE INSERT тригер: якщо code не заданий — обчислюємо. (Явно переданий код
-- лишаємо — щоб не ламати можливий імпорт; застосунок код НЕ надсилає.)
-- ============================================================

create or replace function public.mp_hiring_project_code()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_name   text;
  v_words  text[];
  v_prefix text;
  v_seq    int;
begin
  if new.code is not null and length(trim(new.code)) > 0 then
    return new; -- код заданий явно — не чіпаємо
  end if;

  select name into v_name from public.clients where id = new.client_id;
  v_name := coalesce(trim(v_name), '');
  v_words := regexp_split_to_array(v_name, '\s+');

  if v_name = '' or v_words is null or array_length(v_words, 1) is null then
    v_prefix := 'PRJ';
  elsif array_length(v_words, 1) = 1 then
    -- одне слово → перші 3 літери/цифри
    v_prefix := upper(substring(regexp_replace(v_words[1], '[^[:alnum:]]', '', 'g') from 1 for 3));
  else
    -- ініціали перших 3 слів
    select upper(string_agg(left(w, 1), ''))
      into v_prefix
      from (select unnest(v_words[1:3]) as w) t
     where w <> '';
  end if;
  if v_prefix is null or v_prefix = '' then v_prefix := 'PRJ'; end if;

  -- наступний номер у межах клієнта (за наявними кодами цього префікса)
  select coalesce(max((regexp_match(code, '(\d+)$'))[1]::int), 0) + 1
    into v_seq
    from public.hiring_projects
   where client_id = new.client_id
     and code ~ ('^' || v_prefix || '-[0-9]+$');

  new.code := v_prefix || '-' || lpad(v_seq::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists trg_hiring_project_code on public.hiring_projects;
create trigger trg_hiring_project_code
  before insert on public.hiring_projects
  for each row execute function public.mp_hiring_project_code();

comment on function public.mp_hiring_project_code() is
  'Авто-код замовлення проекту: префікс з назви клієнта + послідовний номер у межах клієнта.';
