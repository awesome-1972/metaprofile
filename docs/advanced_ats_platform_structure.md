# Просунута ATS-платформа нового покоління

**Робоча назва:** Recruitment Operating Platform  
**Формат:** ATS + CRM + AI Sourcing + Assessment + Candidate Experience + Client Portal + Analytics + Compliance  
**Версія:** 0.1  
**Дата:** 2026-07-09

---

# 1. Базова ідея платформи

Просунута ATS має бути не просто системою обліку кандидатів, а повною **Recruitment Operating Platform**.

Її логіка:

```text
ATS + CRM + AI sourcing + project management + assessment + candidate experience + client portal + analytics + compliance
```

Тобто система повинна керувати не лише “воронкою кандидатів”, а всім циклом пошуку: від заявки замовника до оферу, рекомендацій, звітів, аналітики якості підбору та повторного використання бази талантів.

Звичайна ATS відповідає на питання:

> Де зараз кандидат?

Просунута ATS відповідає на питання:

> Чому саме цей кандидат відповідає або не відповідає ролі, якими доказами це підтверджено, хто це перевірив, які ризики залишаються, що думає замовник і як це впливає на рішення?

---

# 2. Основні рівні платформи

## 2.1. Tenant layer / рівень компанії

Перший об’єкт системи — **кабінет компанії**.

У ньому налаштовуються:

- назва компанії;
- тип акаунту: внутрішній рекрутинг, рекрутингова агенція, RPO, консалтингова компанія;
- юридичні дані;
- брендовані career pages;
- мови інтерфейсу;
- політики конфіденційності;
- шаблони email, SMS, WhatsApp;
- SLA по процесу;
- ролі користувачів;
- інтеграції;
- бібліотека компетенцій;
- бібліотека посад;
- бібліотека scorecards;
- шаблони звітів;
- правила AI-оцінки;
- правила доступу до кандидатів;
- retention policy для персональних даних.

Для агенційної моделі потрібен додатковий рівень — **клієнт / замовник**.

Одна платформа може мати багато клієнтів. У кожного клієнта — власні проєкти, вакансії, команди, звіти, кандидати й обмеження доступу.

---

# 3. Ролі в системі

## 3.1. Super Admin

Керує всією платформою, тарифами, глобальними налаштуваннями, безпекою, інтеграціями, AI-моделями.

## 3.2. Company Admin

Керує акаунтом компанії, користувачами, ролями, шаблонами, бібліотеками, інтеграціями.

## 3.3. Client Admin / Замовник

Створює заявки, погоджує профіль посади, переглядає short list, залишає фідбек, затверджує кандидатів.

## 3.4. Hiring Manager

Власник бізнес-потреби. Погоджує опис ролі, must-have criteria, scorecard, бере участь в інтерв’ю, приймає рішення.

## 3.5. Project Lead / Lead Recruiter

Веде проєкт пошуку, відповідає за intake, план, команду, SLA, якість long list / short list, комунікацію із замовником.

## 3.6. Sourcer

Шукає кандидатів, будує market map, формує long list, проводить enrichment профілів, запускає outreach.

## 3.7. Recruiter

Проводить screening, комунікацію, інтерв’ю, веде пайплайн, готує кандидатів до етапів, збирає фідбек.

## 3.8. Researcher

Працює з ринком, компаніями-донорами, competitor mapping, talent pools.

## 3.9. Interviewer / Assessor

Проводить структуроване інтерв’ю або оцінювальний етап, виставляє бали по competency matrix.

## 3.10. Coordinator

Організовує зустрічі, нагадування, документи, календарі, логістику.

## 3.11. Compliance / DPO role

Контролює GDPR, AI compliance, згоду кандидатів, строки зберігання даних, аудит дій.

---

# 4. Повний процес роботи ATS

## 4.1. Створення кабінету компанії

Компанія створює workspace.

У процесі onboarding система збирає:

- тип організації;
- галузь;
- кількість співробітників;
- географію найму;
- типові ролі;
- канали пошуку;
- мови кандидатів;
- структуру команди підбору;
- інтеграції: email, календар, job boards, LinkedIn, HRIS, месенджери;
- правила доступу;
- шаблони процесу.

AI може одразу запропонувати:

- типову структуру hiring pipeline;
- базовий набір компетенцій;
- шаблони посад;
- шаблони scorecards;
- шаблони листів кандидатам;
- шаблони звітів для замовника.

---

## 4.2. Прийняття заявки від замовника

Заявка може надходити від:

- внутрішнього hiring manager;
- HRBP;
- зовнішнього клієнта;
- керівника бізнес-напряму;
- рекрутингової агенції-партнера.

У системі створюється **Recruitment Request / Hiring Requisition**.

Поля заявки:

- назва посади;
- підрозділ;
- локація;
- формат роботи;
- тип зайнятості;
- причина відкриття вакансії;
- кількість позицій;
- рівень ролі;
- бюджет;
- reporting line;
- дата бажаного виходу;
- criticality;
- replacement / new role;
- approval chain;
- відповідальний hiring manager;
- очікуваний SLA;
- пріоритет;
- конфіденційність пошуку;
- тип пошуку: inbound / outbound / executive search / mass hiring / RPO.

Після створення заявка проходить approval flow:

1. Draft.
2. Hiring Manager review.
3. HR / TA approval.
4. Finance approval.
5. Final approval.
6. Project launch.

---

## 4.3. Intake meeting

Після погодження заявки система автоматично створює **intake meeting**.

На цьому етапі фіксуються:

- бізнес-контекст ролі;
- цілі позиції;
- ключові задачі на 3, 6 і 12 місяців;
- expected outcomes;
- must-have criteria;
- nice-to-have criteria;
- deal breakers;
- compensation range;
- companies to target;
- companies to avoid;
- рівень seniority;
- стиль керівника;
- культура команди;
- причини, чому кандидати можуть погодитися;
- ризики ролі;
- типові причини відмов кандидатів.

AI intake assistant може на основі розмови автоматично створити:

- summary intake meeting;
- job description;
- candidate persona;
- Boolean search strings;
- LinkedIn search strategy;
- competency model;
- scorecard;
- interview plan;
- outreach messages;
- market map hypothesis.

---

# 5. Опис посади

## 5.1. Job Profile

Опис посади має існувати у двох версіях.

**Внутрішній job profile** — повний документ для рекрутерів і hiring team.

**Публічний job posting** — адаптований текст для кандидатів і job boards.

Внутрішній job profile включає:

- purpose of the role;
- місце ролі в організації;
- ключові задачі;
- expected outcomes;
- зона відповідальності;
- KPI / success metrics;
- decision-making authority;
- internal stakeholders;
- external stakeholders;
- hard skills;
- domain expertise;
- soft skills;
- leadership expectations;
- required experience;
- education / certificates;
- language requirements;
- compensation range;
- benefits;
- risk factors;
- selling points.

Публічний job posting має бути коротшим, простішим і більше орієнтованим на кандидата:

- чому роль існує;
- чим кандидат буде займатися;
- чого очікують;
- що компанія пропонує;
- як виглядає процес відбору;
- скільки етапів;
- як швидко буде фідбек.

---

# 6. Модель компетенцій

## 6.1. Структура competency model

Кожна вакансія повинна мати не просто опис, а **матрицю оцінки**.

| Блок | Компетенція | Вага | Поведінкові індикатори | Метод перевірки |
|---|---:|---:|---|---|
| Професійний досвід | Domain expertise | 25% | Працював із релевантними задачами | CV, screening, case |
| Технічні навички | Tool stack | 15% | Володіє потрібними інструментами | test, case |
| Управління | Stakeholder management | 15% | Вміє узгоджувати інтереси | behavioral interview |
| Мислення | Problem solving | 15% | Структурує складні задачі | case interview |
| Культура | Values fit | 10% | Сумісний зі стилем команди | structured interview |
| Мотивація | Motivation fit | 10% | Розуміє роль і приймає контекст | screening |
| Ризики | Risk indicators | 10% | Є ознаки невідповідності | interview, references |

## 6.2. Шкала оцінки

Рекомендована шкала:

- **0** — немає даних;
- **1** — слабкий доказ;
- **2** — часткова відповідність;
- **3** — достатня відповідність;
- **4** — сильна відповідність;
- **5** — видатна відповідність.

Окремо має бути **confidence score**:

- **Low** — мало доказів;
- **Medium** — є кілька джерел;
- **High** — підтверджено різними методами.

Кандидат не повинен отримувати високий або низький бал лише через “враження” рекрутера. Кожна оцінка має спиратися на evidence.

---

# 7. Призначення команди підбору

У кожному search project система повинна створювати **project team**.

## 7.1. Project RACI

| Етап | Project Lead | Sourcer | Recruiter | Hiring Manager | Assessor | Coordinator |
|---|---|---|---|---|---|---|
| Intake | A/R | C | C | A/R | C | C |
| JD | A/R | C | R | A/R | C | I |
| Sourcing strategy | A/R | A/R | C | C | I | I |
| Long list | A | R | C | I | I | I |
| Screening | A | C | R | I | I | C |
| Interview | A | I | R | R | R | C |
| Short list | A/R | C | R | A/R | C | I |
| Offer | A | I | R | A/R | I | C |

Позначення:

- **A** — accountable;
- **R** — responsible;
- **C** — consulted;
- **I** — informed.

Система повинна показувати:

- хто блокує процес;
- де прострочені задачі;
- де відсутній фідбек;
- де кандидат завис у пайплайні;
- де порушено SLA.

---

# 8. Sourcing strategy

## 8.1. Стратегія пошуку

Для кожного проєкту система генерує sourcing plan:

- цільові компанії;
- альтернативні галузі;
- job titles;
- synonym titles;
- Boolean strings;
- LinkedIn filters;
- GitHub / Behance / Dribbble / Stack Overflow критерії;
- job board strategy;
- employee referral strategy;
- social media strategy;
- talent pool reuse;
- silver medalist search;
- competitor mapping;
- geography map;
- salary benchmark;
- outreach messaging.

## 8.2. Long list

Long list — це не просто список людей.

Картка кандидата в long list має містити:

- ім’я;
- поточну компанію;
- посаду;
- локацію;
- LinkedIn / public profile;
- джерело;
- email / phone, якщо законно отримано;
- matching score;
- evidence tags;
- salary assumption;
- availability assumption;
- seniority;
- reason to contact;
- risk flags;
- duplicate status;
- ownership;
- next action.

## 8.3. AI sourcing

AI sourcing agent повинен виконувати такі дії:

1. Розбирає job profile.
2. Виділяє must-have criteria.
3. Формує candidate persona.
4. Шукає кандидатів у зовнішніх джерелах.
5. Порівнює профілі з матрицею.
6. Видаляє дублікати.
7. Збагачує профіль.
8. Пояснює, чому кандидат релевантний.
9. Пропонує outreach message.
10. Запускає sequence.
11. Класифікує відповіді.
12. Передає зацікавлених кандидатів рекрутеру.

---

# 9. Candidate CRM

Просунута ATS повинна мати не лише applicant tracking, а й **candidate relationship management**.

CRM-шар потрібен для:

- passive candidates;
- talent communities;
- silver medalists;
- alumni;
- referrals;
- rejected but promising candidates;
- executive search;
- nurture campaigns;
- майбутніх вакансій.

Candidate CRM має підтримувати:

- сегменти кандидатів;
- теги;
- talent pools;
- engagement history;
- автоматичні sequences;
- open / click / reply tracking;
- candidate temperature;
- consent tracking;
- reactivation campaigns;
- matching candidates to new roles.

---

# 10. Інтерактивний кабінет кандидата

## 10.1. Candidate Portal

Кандидат повинен бачити:

- свої активні заявки;
- статус по кожній вакансії;
- наступний етап;
- очікувані строки;
- контактну особу;
- календар зустрічей;
- посилання на відеоінтерв’ю;
- тестові завдання;
- документи;
- consent settings;
- privacy settings;
- історію комунікації;
- можливість оновити CV;
- можливість додати portfolio;
- можливість обрати канали зв’язку;
- можливість відкликати заявку;
- можливість залишити candidate experience feedback.

## 10.2. Інтерактивні елементи

Сучасна взаємодія з кандидатом має включати:

- chat-based application;
- conversational screening;
- AI assistant для відповідей на питання;
- self-scheduling;
- instant rescheduling;
- WhatsApp / SMS / email / Telegram / Viber notifications;
- статус-трекер “де я в процесі”;
- асинхронне відеоінтерв’ю;
- інтерактивні кейси;
- realistic job preview;
- короткі мікроопитування після кожного етапу;
- автоматичний feedback після відмови, якщо політика компанії це дозволяє;
- candidate NPS.

---

# 11. Pipeline management

## 11.1. Типовий pipeline

Базові етапи:

1. Request created.
2. Request approved.
3. Intake completed.
4. JD approved.
5. Sourcing started.
6. Long list.
7. Outreach.
8. Interested.
9. Recruiter screening.
10. Long list review.
11. Short list.
12. Hiring manager review.
13. Interview 1.
14. Case / assessment.
15. Interview 2.
16. Panel interview.
17. Final interview.
18. Reference check.
19. Offer preparation.
20. Offer sent.
21. Offer accepted.
22. Preboarding.
23. Hired.
24. Rejected.
25. Talent pool.

## 11.2. Автоматизація pipeline

На кожному етапі мають працювати triggers:

- кандидат доданий у long list → assigned to sourcer;
- кандидат відповів позитивно → створити screening task;
- кандидат перейшов у interview stage → запропонувати слоти;
- інтерв’ю завершено → нагадати interviewer заповнити scorecard;
- фідбек не надано 24 години → escalation;
- кандидат без дії 5 днів → stale candidate alert;
- відмова → автоматичний лист + reason code;
- hired → передати в HRIS / onboarding.

---

# 12. Комунікація з кандидатами прямо з системи

Система повинна мати omnichannel inbox.

Канали:

- email;
- LinkedIn InMail;
- SMS;
- WhatsApp;
- Telegram;
- Viber;
- Messenger;
- web chat;
- phone logs;
- calendar invites;
- video interview links.

У картці кандидата має бути єдина історія:

- всі листи;
- всі повідомлення;
- всі дзвінки;
- всі нотатки;
- всі зустрічі;
- всі етапи;
- всі оцінки;
- всі файли;
- всі consent events.

AI communication assistant може:

- писати персоналізовані outreach messages;
- адаптувати тон;
- перекладати повідомлення;
- пропонувати follow-up;
- класифікувати відповіді;
- визначати intent: interested / not interested / ask salary / later / wrong person;
- створювати task для рекрутера;
- готувати коротке summary комунікації.

---

# 13. Scheduling

Scheduling має бути повністю інтегрованим.

Функції:

- синхронізація Google Calendar / Microsoft 365;
- availability pooling;
- self-scheduling links;
- автоматичне створення Google Meet / Zoom / Teams;
- rescheduling;
- reminders;
- interviewer load balancing;
- buffer time;
- time zone detection;
- panel interview coordination;
- автоматичне оновлення pipeline stage;
- candidate no-show tracking.

---

# 14. Інтерв’ю та оцінка по матриці компетенцій

## 14.1. Interview Kit

Для кожного інтерв’ю система має генерувати interview kit:

- мета інтерв’ю;
- компетенції, які перевіряються;
- питання;
- probes;
- red flags;
- scoring rubric;
- поле для evidence notes;
- поле для підсумку;
- decision recommendation.

## 14.2. Structured scorecard

Під час або після інтерв’ю interviewer виставляє бали.

| Компетенція | Вага | Бал | Evidence | Confidence |
|---|---:|---:|---|---|
| Strategic thinking | 20% | 4 | Приклад запуску нового напряму | High |
| Stakeholder management | 15% | 3 | Є досвід, але слабко описані конфлікти | Medium |
| Execution discipline | 20% | 5 | Чіткі метрики, строки, контроль | High |
| Culture fit | 10% | 3 | Потребує додаткової перевірки | Medium |

Обов’язкове правило:

> Бал без evidence не приймається системою.

## 14.3. AI interview copilot

AI може:

- транскрибувати інтерв’ю;
- виділяти відповіді по компетенціях;
- знаходити evidence;
- пропонувати попередній score;
- показувати missed questions;
- нагадувати про bias;
- генерувати interview summary;
- порівнювати відповіді з scorecard;
- готувати фідбек hiring manager.

AI не має самостійно приймати рішення про кандидата. Він має бути evidence assistant, а не decision-maker.

---

# 15. Assessment layer

Окремий модуль оцінки повинен підтримувати:

- structured interview;
- behavioral interview;
- case interview;
- role play;
- technical test;
- cognitive test;
- language test;
- portfolio review;
- work sample;
- assessment center exercises;
- async video interview;
- reference-based evidence;
- 180 / 270 / 360 для internal mobility;
- cultural fit / values interview.

---

# 16. Порівняння кандидатів

## 16.1. Candidate comparison matrix

Short list має формуватися не як “3 резюме”, а як порівняльна матриця.

| Критерій | Вага | Кандидат A | Кандидат B | Кандидат C |
|---|---:|---:|---:|---:|
| Must-have досвід | 25% | 5 | 4 | 3 |
| Domain expertise | 20% | 4 | 5 | 3 |
| Leadership | 15% | 3 | 4 | 5 |
| Problem solving | 15% | 4 | 3 | 4 |
| Motivation | 10% | 5 | 3 | 4 |
| Compensation fit | 5% | 4 | 5 | 2 |
| Risk level | 10% | Low | Medium | High |
| Total weighted score | 100% | 4.35 | 4.05 | 3.45 |

## 16.2. Fit score

Можна використовувати таку логіку:

```text
Candidate Fit Score = weighted competency score + motivation fit + compensation fit + availability fit – risk penalty
```

Окремо:

- **Must-have gate** — якщо критичний критерій не виконано, кандидат не може потрапити в short list без ручного override.
- **Evidence confidence** — система показує, наскільки оцінка підтверджена доказами.
- **Risk penalty** — червоні прапорці знижують рейтинг, але не блокують автоматично.
- **Human override** — hiring team може змінити рішення, але має пояснити причину.

---

# 17. Звіти по кандидатах

## 17.1. Candidate Report

Звіт по кандидату має включати:

1. Executive summary.
2. Current role.
3. Compensation expectations.
4. Availability.
5. Motivation.
6. Career logic.
7. Key strengths.
8. Key concerns.
9. Competency matrix.
10. Interview evidence.
11. Case / test results.
12. Reference summary.
13. Risk flags.
14. Recruiter recommendation.
15. Hiring manager feedback.
16. Suggested next step.

## 17.2. Формат executive summary

Приклад структури:

```text
Кандидат: Ім’я
Поточна роль: Head of Operations
Релевантність: висока
Ключова причина розгляду: має досвід масштабування операційної функції в подібному бізнес-контексті.
Основний ризик: обмежений досвід у міжнародному середовищі.
Рекомендація: запросити на фінальне інтерв’ю з CEO.
```

## 17.3. AI-generated report

AI може генерувати:

- short profile;
- structured candidate report;
- client-facing summary;
- interview summary;
- reference check summary;
- side-by-side comparison;
- shortlist rationale.

Звіт має мати маркування:

- AI draft;
- reviewed by recruiter;
- approved by project lead.

---

# 18. Client Portal

Для зовнішніх або внутрішніх замовників потрібен окремий портал.

Замовник бачить:

- активні проєкти;
- статус пошуку;
- SLA;
- funnel;
- long list, якщо дозволено;
- short list;
- candidate reports;
- interview schedule;
- feedback requests;
- pending approvals;
- market insights;
- compensation benchmark;
- project risks.

Замовник може:

- погодити заявку;
- погодити JD;
- погодити scorecard;
- залишити фідбек по кандидатах;
- запросити додаткових кандидатів;
- відхилити кандидата з reason code;
- затвердити interview;
- погодити offer;
- переглянути фінальний звіт.

---

# 19. Збір рекомендацій

Reference check має бути окремим workflow.

Функції:

- запит контактів рекомендацій;
- candidate consent;
- automated reference request;
- structured questionnaire;
- phone reference notes;
- AI summary;
- risk detection;
- comparison with candidate claims;
- reference confidence score.

Поля reference check:

- relationship to candidate;
- період співпраці;
- роль кандидата;
- сильні сторони;
- зони розвитку;
- управлінський стиль;
- надійність;
- конфлікти;
- причина завершення співпраці;
- willingness to rehire;
- final recommendation.

---

# 20. Candidate fraud / integrity layer

У 2026 році це вже окремий критичний модуль, особливо для remote hiring.

Система має перевіряти:

- дублікати кандидатів;
- proxy interview ризики;
- AI-generated resumes;
- deepfake ризики;
- підозрілу поведінку у формах;
- невідповідність локації;
- невідповідність особи між application / interview / onboarding;
- plagiarism у тестових завданнях;
- аномальні патерни відповідей.

---

# 21. Інтеграції

## 21.1. Job boards

Потрібні інтеграції з:

- LinkedIn Jobs;
- LinkedIn Recruiter;
- Indeed;
- Glassdoor;
- Jooble;
- Pracuj.pl;
- Work.ua;
- Robota.ua;
- Djinni;
- DOU;
- OLX Jobs;
- No Fluff Jobs;
- Wellfound;
- RemoteOK;
- WeWorkRemotely.

## 21.2. Social / professional networks

- LinkedIn;
- GitHub;
- Stack Overflow;
- Behance;
- Dribbble;
- Facebook;
- Instagram;
- X;
- Telegram channels;
- Reddit;
- professional communities.

## 21.3. Communication

- Gmail;
- Outlook;
- Microsoft Exchange;
- Google Calendar;
- Microsoft 365 Calendar;
- Zoom;
- Google Meet;
- Microsoft Teams;
- Slack;
- WhatsApp Business;
- Twilio SMS;
- Viber;
- Telegram.

## 21.4. Assessment

- HireVue;
- HackerRank;
- Codility;
- TestGorilla;
- SHL;
- Criteria;
- Mercer Mettl;
- Pymetrics / Harver;
- Hogan;
- Thomas;
- DISC-провайдери, якщо компанія їх використовує, але з методологічними обмеженнями.

## 21.5. HRIS / onboarding

- Workday;
- SAP SuccessFactors;
- BambooHR;
- HiBob;
- PeopleForce;
- Personio;
- Deel;
- Remote;
- Gusto.

## 21.6. E-sign / background check

- DocuSign;
- PandaDoc;
- Adobe Sign;
- Checkr;
- Sterling;
- HireRight;
- Certn.

---

# 22. AI agents у платформі

## 22.1. Intake Agent

Формує опис ролі, уточнюючі питання, ризики, must-have criteria, scorecard.

## 22.2. JD Agent

Створює job description, адаптує стиль під job board, перевіряє дискримінаційні формулювання.

## 22.3. Competency Agent

Будує competency model, behavioral indicators, interview questions, scoring rubric.

## 22.4. Sourcing Agent

Шукає кандидатів, будує Boolean strings, аналізує профілі, ранжує long list.

## 22.5. Outreach Agent

Готує персоналізовані повідомлення, follow-ups, класифікує відповіді.

## 22.6. Screening Agent

Порівнює CV, LinkedIn, відповіді кандидата, screening notes із матрицею посади.

## 22.7. Interview Copilot

Транскрибує інтерв’ю, витягує evidence, пропонує summary, допомагає заповнювати scorecard.

## 22.8. Assessment Agent

Порівнює результати кейсу, тесту, інтерв’ю й reference check.

## 22.9. Report Agent

Генерує candidate reports, shortlist reports, client reports.

## 22.10. Compliance Agent

Перевіряє:

- чи є consent;
- чи не прострочено retention period;
- чи AI не прийняв рішення самостійно;
- чи є human review;
- чи є audit trail;
- чи пояснювана оцінка;
- чи немає заборонених критеріїв.

---

# 23. Compliance by design

Для ЄС це критично.

AI-системи для recruitment / selection належать до high-risk категорій, якщо вони використовуються для таргетованих вакансій, аналізу заявок, фільтрації кандидатів або оцінки кандидатів.

Тому в архітектурі потрібні:

- candidate transparency notice;
- AI use disclosure;
- human final decision;
- explainable score;
- audit log;
- bias monitoring;
- adverse impact analysis;
- data minimization;
- consent management;
- retention rules;
- appeal / review mechanism;
- model versioning;
- prompt versioning;
- source traceability;
- ability to disable AI scoring;
- prohibition of emotion recognition in workplace context.

Принцип:

> AI може підтримувати експертне рішення, але не повинен підміняти відповідальність людини.

---

# 24. Аналітика

## 24.1. Project analytics

- кількість кандидатів у long list;
- contacted;
- response rate;
- interested rate;
- screening pass rate;
- interview pass rate;
- offer acceptance rate;
- time to long list;
- time to short list;
- time to hire;
- source effectiveness;
- recruiter workload;
- stage conversion;
- bottlenecks;
- замовник затримує / рекрутер затримує / кандидат затримує.

## 24.2. Quality analytics

- quality of shortlist;
- hiring manager satisfaction;
- candidate NPS;
- offer acceptance;
- probation pass rate;
- quality of hire;
- 90-day performance;
- source-to-quality correlation;
- interviewer calibration;
- scorecard consistency.

## 24.3. Market analytics

- кількість релевантних кандидатів на ринку;
- salary range;
- target companies;
- географія;
- response benchmark;
- competitor hiring activity;
- availability;
- talent scarcity index.

---

# 25. Мінімальна структура продукту

## 25.1. Core modules

1. Company workspace.
2. Client workspace.
3. User & roles management.
4. Recruitment request.
5. Job profile builder.
6. Competency model builder.
7. Project team assignment.
8. Candidate database.
9. Candidate CRM.
10. AI sourcing.
11. Long list.
12. Short list.
13. Pipeline.
14. Communication inbox.
15. Scheduling.
16. Interview scorecards.
17. Assessments.
18. Candidate reports.
19. Client portal.
20. Reference check.
21. Offer management.
22. Analytics.
23. Integrations.
24. Consent & compliance.
25. Audit log.

---

# 26. Референсні продукти на ринку

| Категорія | Продукти | Що брати як референс |
|---|---|---|
| All-in-one ATS | Ashby, Greenhouse, Workable, SmartRecruiters, Lever, Gem | ATS + CRM + workflows + analytics + AI |
| AI sourcing | SeekOut, hireEZ, LinkedIn Hiring Assistant, Gem | AI search, candidate ranking, outreach, rediscovery |
| Candidate experience | Paradox, Phenom, Teamtailor | conversational apply, chatbots, career sites, candidate engagement |
| Interview intelligence | BrightHire, HireVue, Metaview | structured interviews, AI notes, interview insights |
| Assessment | HireVue, HackerRank, Codility, TestGorilla, SHL | skills validation, tests, cases, structured scorecards |
| Candidate fraud | Sardine, Alex Verify, HackerRank integrity tools | identity, proxy interview, AI-generated content, plagiarism |
| Enterprise TA | iCIMS, SmartRecruiters, Workday Recruiting | enterprise integrations, CRM, onboarding, compliance |
| Agency / CRM-style recruiting | Bullhorn, Vincere, Recruit CRM, Loxo | client portal, sales + recruitment pipeline, agency workflows |

---

# 27. Логічна архітектура даних

```text
Tenant
 └── Company
      ├── Clients
      ├── Users
      ├── Roles & Permissions
      ├── Recruitment Projects
      │    ├── Requisition
      │    ├── Job Profile
      │    ├── Competency Model
      │    ├── Project Team
      │    ├── Pipeline
      │    ├── Long List
      │    ├── Short List
      │    ├── Candidate Reports
      │    └── Project Analytics
      ├── Candidate Database
      │    ├── Candidate Profile
      │    ├── Applications
      │    ├── Communications
      │    ├── Interviews
      │    ├── Assessments
      │    ├── References
      │    ├── Consent
      │    └── Audit History
      ├── Talent Pools
      ├── Templates
      ├── Integrations
      └── Compliance Logs
```

---

# 28. Оптимальна структура меню платформи

```text
Dashboard

Projects
  - Active Projects
  - New Request
  - Intake
  - Job Profiles
  - Project Team
  - Project Analytics

Candidates
  - All Candidates
  - Long Lists
  - Short Lists
  - Talent Pools
  - Duplicates
  - Archived Candidates

Sourcing
  - AI Search
  - Boolean Builder
  - Target Companies
  - Market Map
  - Outreach Campaigns
  - Source Analytics

Pipeline
  - Kanban View
  - Stage View
  - Candidate Status
  - Bottlenecks
  - SLA Alerts

Interviews
  - Calendar
  - Interview Kits
  - Scorecards
  - Interview Notes
  - AI Summaries

Assessments
  - Cases
  - Tests
  - Video Interviews
  - Work Samples
  - Assessment Results

Clients
  - Client Portal
  - Client Feedback
  - Shared Shortlists
  - Reports
  - Approvals

Reports
  - Candidate Reports
  - Shortlist Reports
  - Project Reports
  - Market Reports
  - Funnel Analytics

Communications
  - Inbox
  - Email
  - SMS / WhatsApp
  - Templates
  - Sequences

Settings
  - Company Profile
  - Users
  - Roles
  - Competency Library
  - Templates
  - Integrations
  - Compliance
  - AI Settings
```

---

# 29. End-to-end логіка процесу

```text
Recruitment Request
→ Intake
→ Role Model
→ Competency Matrix
→ Sourcing Strategy
→ AI Long List
→ Human Review
→ Outreach
→ Screening
→ Structured Interview
→ Assessment
→ Evidence-Based Scoring
→ Shortlist
→ Client Review
→ References
→ Offer
→ Hire
→ Quality-of-Hire Feedback
→ Talent Intelligence Reuse
```

---

# 30. Продуктова відмінність

Ключова відмінність такої системи — не автоматизація заради швидкості, а **керована доказовість підбору**.

Платформа повинна забезпечити:

- прозорість процесу;
- якісне intake;
- єдину модель ролі;
- структуровану оцінку;
- доказові scorecards;
- AI-підтримку без автоматичного прийняття рішень;
- інтерактивний candidate experience;
- зручний client portal;
- контроль SLA;
- повторне використання talent intelligence;
- compliance by design;
- аналітику не лише швидкості, а й якості найму.

Фінальна концепція:

> Це не ATS для рекрутерів. Це система управління якістю найму.

---

# 31. Джерела та референси для подальшого аналізу

## All-in-one ATS / Recruiting Platforms

- Ashby — ATS, CRM, sourcing, scheduling, analytics, AI recruiting.
- Greenhouse — structured hiring, candidate experience, integrations, AI recruiting.
- Workable — ATS, AI sourcing, job posting, candidate communication.
- SmartRecruiters — enterprise talent acquisition suite.
- Lever — ATS + CRM.
- Gem — AI-first recruiting platform, CRM, ATS, analytics.

## AI sourcing

- SeekOut — AI talent search, rediscovery, outreach.
- hireEZ — AI sourcing, automation, outreach, scheduling.
- LinkedIn Hiring Assistant — AI-supported candidate search and outreach.

## Candidate experience

- Paradox — conversational career site, conversational apply, scheduling, CRM.
- Phenom — talent experience, career site personalization, chatbot, engagement.
- Teamtailor — career site and candidate experience.

## Interview intelligence

- BrightHire — interview planning, AI notes, interview intelligence.
- HireVue — video interview, structured assessment, scheduling, skills validation.
- Metaview — AI interview notes and summaries.

## Assessment

- HireVue.
- HackerRank.
- Codility.
- TestGorilla.
- SHL.
- Criteria.
- Mercer Mettl.
- Harver.

## Candidate fraud / integrity

- Sardine Candidate Fraud.
- Alex Verify.
- HackerRank integrity tools.

## Agency recruiting

- Bullhorn.
- Vincere.
- Recruit CRM.
- Loxo.

---

# 32. Наступний рівень деталізації

Для перетворення цієї структури на технічне завдання потрібно окремо описати:

1. User stories.
2. Permissions matrix.
3. Data model.
4. API integrations.
5. Candidate lifecycle states.
6. Project lifecycle states.
7. Report templates.
8. AI prompt architecture.
9. Compliance logic.
10. MVP scope.
11. Production roadmap.
12. UX wireframes.
13. Admin panel.
14. Candidate portal.
15. Client portal.
16. Analytics dashboards.
