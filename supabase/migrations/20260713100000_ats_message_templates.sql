-- ============================================================
-- ATS: Шаблони повідомлень кандидатам (відмова / запрошення)
-- ============================================================
-- На кожному етапі пошуку рекрутер має дві типові дії з кандидатом:
--   • «Відмовити»            → лист-відмова за шаблоном + запис у rejections;
--   • «Запросити далі»       → лист-запрошення на наступний етап + перенесення.
--
-- Рішення власника (13.07):
--   • шаблони ГЛОБАЛЬНІ, з можливістю перевизначення на конкретній вакансії
--     (vacancy_id IS NULL → глобальний; заповнений → вакансійний);
--   • відмова закриває заявку і ВИМАГАЄ причину — зі списку rejection_reasons
--     або кастомну (текст у rejections.comment); текст листа можна згенерувати AI;
--   • відмова БЕЗ листа дозволена (чекбокс) — тоді пишеться лише статус+причина;
--   • канал зараз — email (Resend). Інші канали лишаються в enum на майбутнє.
-- ============================================================

create type public.message_template_kind as enum ('rejection', 'invitation');

create table public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  -- NULL = глобальний шаблон агенції; заповнений = перевизначення на вакансії.
  vacancy_id uuid references public.vacancies(id) on delete cascade,
  kind       public.message_template_kind not null,
  -- NULL = універсальний (підходить будь-якому етапу).
  phase_kind public.search_phase_kind,
  channel    public.comm_channel not null default 'email',
  name       text not null,
  subject    text,
  body       text not null,
  is_active  boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_message_templates_vacancy on public.message_templates (vacancy_id);
create index idx_message_templates_lookup  on public.message_templates (kind, phase_kind, is_active);

alter table public.message_templates enable row level security;

create trigger set_updated_at_message_templates
  before update on public.message_templates
  for each row execute function public.update_updated_at_column();

-- Читає: глобальні — будь-який внутрішній користувач; вакансійні — той, хто
-- бачить вакансію. Пише: глобальні — owner/admin; вакансійні — редактор вакансії.
create policy message_templates_select on public.message_templates
  for select to authenticated
  using (
    (vacancy_id is null and public.mp_is_internal())
    or (vacancy_id is not null and public.mp_can_access_vacancy(vacancy_id))
  );

create policy message_templates_insert on public.message_templates
  for insert to authenticated
  with check (
    (vacancy_id is null and public.mp_is_workspace_admin())
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  );

create policy message_templates_update on public.message_templates
  for update to authenticated
  using (
    (vacancy_id is null and public.mp_is_workspace_admin())
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  )
  with check (
    (vacancy_id is null and public.mp_is_workspace_admin())
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  );

create policy message_templates_delete on public.message_templates
  for delete to authenticated
  using (
    (vacancy_id is null and public.mp_is_workspace_admin())
    or (vacancy_id is not null and public.mp_can_edit_vacancy(vacancy_id))
  );

-- ------------------------------------------------------------
-- Базові глобальні шаблони
-- ------------------------------------------------------------
-- Змінні підставляються клієнтом перед відправкою:
--   {{name}} — імʼя кандидата, {{vacancy}} — назва вакансії,
--   {{company}} — компанія-клієнт, {{stage}} — стадія/етап,
--   {{recruiter}} — імʼя рекрутера, {{date}} — дата/час зустрічі.
insert into public.message_templates (vacancy_id, kind, phase_kind, channel, name, subject, body) values
  -- Відмови по етапах
  (null, 'rejection', 'longlist', 'email',
   'Відмова після скринінгу',
   'Щодо позиції {{vacancy}}',
   E'Доброго дня, {{name}}!\n\nДякуємо за інтерес до позиції {{vacancy}} та за час, який Ви приділили спілкуванню з нами.\n\nНа цьому етапі ми зупинили вибір на кандидатах, чий досвід ближчий до профілю ролі. Ваше резюме залишається в нашій базі — за Вашої згоди повернемось із релевантними пропозиціями.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'rejection', 'shortlist', 'email',
   'Відмова після інтервʼю по компетенціях',
   'Щодо позиції {{vacancy}}',
   E'Доброго дня, {{name}}!\n\nДякуємо за розгорнуту розмову та за час, присвячений нашій зустрічі щодо позиції {{vacancy}}.\n\nПісля оцінки за матрицею компетенцій ми прийняли рішення продовжити роботу з іншими кандидатами — їхній профіль ближчий до пріоритетів клієнта на цій ролі. Це рішення не про Ваш професійний рівень, а про специфіку конкретного запиту.\n\nБудемо раді повернутись до Вас із релевантними проектами.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'rejection', 'client_interviews', 'email',
   'Відмова після співбесіди з замовником',
   'Щодо позиції {{vacancy}}',
   E'Доброго дня, {{name}}!\n\nДякуємо за участь у співбесіді з замовником щодо позиції {{vacancy}}.\n\nКлієнт прийняв рішення продовжити процес з іншим кандидатом. Ваша кандидатура була сильною, і ми хотіли б лишатись на звʼязку щодо майбутніх ролей відповідного рівня.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'rejection', 'final', 'email',
   'Відмова на фінальному етапі',
   'Щодо позиції {{vacancy}}',
   E'Доброго дня, {{name}}!\n\nДякуємо за проходження фінального етапу щодо позиції {{vacancy}} — за вирішення кейсу та фінальну зустріч.\n\nВибір був складним: клієнт зупинився на іншому фіналісті. Ми високо оцінюємо Ваш рівень і хотіли б запропонувати Вам інші релевантні ролі, щойно вони зʼявляться.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'rejection', null, 'email',
   'Відмова — універсальна',
   'Щодо позиції {{vacancy}}',
   E'Доброго дня, {{name}}!\n\nДякуємо за інтерес до позиції {{vacancy}}.\n\nНа цьому етапі ми продовжуємо роботу з іншими кандидатами. Дякуємо за Ваш час і будемо раді повернутись із релевантними пропозиціями.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  -- Запрошення на наступний етап
  (null, 'invitation', 'longlist', 'email',
   'Запрошення на скринінг',
   'Позиція {{vacancy}} — запрошення до розмови',
   E'Доброго дня, {{name}}!\n\nМи шукаємо кандидатів на позицію {{vacancy}} і Ваш профіль виглядає релевантним.\n\nПропоную коротку розмову (20–30 хв), щоб я розповів деталі ролі, а Ви — про свій досвід. Підкажіть, будь ласка, зручний час.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'invitation', 'shortlist', 'email',
   'Запрошення на інтервʼю по компетенціях',
   'Позиція {{vacancy}} — інтервʼю по компетенціях',
   E'Доброго дня, {{name}}!\n\nДякую за розмову. Запрошую Вас на наступний етап — структуроване інтервʼю по компетенціях щодо позиції {{vacancy}}.\n\nЗустріч триває близько 60–90 хв. Запропонований час: {{date}}. Підтвердіть, будь ласка, або запропонуйте альтернативу.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'invitation', 'client_interviews', 'email',
   'Запрошення на співбесіду з замовником',
   'Позиція {{vacancy}} — зустріч із замовником',
   E'Доброго дня, {{name}}!\n\nРадий повідомити: Вашу кандидатуру на позицію {{vacancy}} представлено клієнту, і замовник хоче зустрітись особисто.\n\nЗапропонований час: {{date}}. Перед зустріччю надішлю коротку довідку про компанію та формат розмови.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'invitation', 'final', 'email',
   'Запрошення на фінальний етап (кейс)',
   'Позиція {{vacancy}} — фінальний етап',
   E'Доброго дня, {{name}}!\n\nВи проходите до фінального етапу щодо позиції {{vacancy}}: розвʼязання кейсу та фінальна зустріч.\n\nДеталі кейсу та терміни надішлю окремим листом. Орієнтовний час фінальної зустрічі: {{date}}.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'invitation', 'offer', 'email',
   'Офер — запрошення до обговорення умов',
   'Позиція {{vacancy}} — пропозиція',
   E'Доброго дня, {{name}}!\n\nМаю гарну новину: клієнт готовий зробити Вам пропозицію щодо позиції {{vacancy}}.\n\nПропоную обговорити умови — компенсацію, дату старту та деталі оформлення. Коли Вам зручно поговорити?\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting'),

  (null, 'invitation', null, 'email',
   'Запрошення — універсальне',
   'Позиція {{vacancy}} — наступний етап',
   E'Доброго дня, {{name}}!\n\nЗапрошуємо Вас на наступний етап відбору щодо позиції {{vacancy}} — {{stage}}.\n\nЗапропонований час: {{date}}. Підтвердіть, будь ласка, або запропонуйте зручну альтернативу.\n\nЗ повагою,\n{{recruiter}}\nMetaVision Consulting');

comment on table public.message_templates is
  'Шаблони листів кандидатам: відмова / запрошення на наступний етап. '
  'vacancy_id IS NULL — глобальний шаблон агенції; заповнений — перевизначення '
  'на вакансії. phase_kind NULL — універсальний шаблон.';
