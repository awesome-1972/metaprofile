// Virtual companies data for internship simulation

export interface VirtualEmployee {
  id: string;
  name: string;
  position: string;
  department: string;
  avatar: string;
  role: "manager" | "buddy" | "colleague";
  personality: string;
  communicationStyle: string;
}

export interface VirtualMeeting {
  id: string;
  title: string;
  duration: string;
  type: "standup" | "planning" | "review" | "1on1" | "team";
  description: string;
  participants: string[];
}

export interface VirtualTask {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  estimatedTime: string;
  skills: string[];
}

export interface VirtualOffice {
  id: string;
  name: string;
  type: "headquarters" | "branch" | "department";
  employees: VirtualEmployee[];
  meetings: VirtualMeeting[];
  tasks: VirtualTask[];
  culture: {
    values: string[];
    dresscode: string;
    communication: string;
    workStyle: string;
  };
  processes: string[];
}

export interface VirtualCompany {
  id: string;
  name: string;
  logo: string;
  industry: string;
  size: "startup" | "medium" | "enterprise";
  description: string;
  culture: {
    values: string[];
    mission: string;
    atmosphere: string;
  };
  offices: VirtualOffice[];
  availableRoles: string[];
  internshipDuration: string;
  rating: number;
  reviewsCount: number;
}

export const virtualCompanies: VirtualCompany[] = [
  {
    id: "techwave",
    name: "TechWave Solutions",
    logo: "🚀",
    industry: "IT / Розробка ПЗ",
    size: "medium",
    description: "Інноваційна IT-компанія, що спеціалізується на веб та мобільній розробці. Працюємо з клієнтами по всьому світу.",
    culture: {
      values: ["Інновації", "Командна робота", "Постійне навчання", "Work-life balance"],
      mission: "Створювати технологічні рішення, що змінюють світ на краще",
      atmosphere: "Дружня, неформальна атмосфера з фокусом на результат"
    },
    offices: [
      {
        id: "techwave-dev",
        name: "Відділ розробки",
        type: "department",
        employees: [
          {
            id: "tm1",
            name: "Олексій Савченко",
            position: "Tech Lead",
            department: "Розробка",
            avatar: "👨‍💻",
            role: "manager",
            personality: "Досвідчений, терплячий, любить ділитися знаннями",
            communicationStyle: "Прямий, але підтримуючий. Дає конструктивний фідбек."
          },
          {
            id: "tm2",
            name: "Марина Коваль",
            position: "Senior Developer",
            department: "Розробка",
            avatar: "👩‍💻",
            role: "buddy",
            personality: "Дружелюбна, енергійна, завжди готова допомогти",
            communicationStyle: "Неформальний, з гумором. Пояснює складне простими словами."
          },
          {
            id: "tm3",
            name: "Денис Мельник",
            position: "Middle Developer",
            department: "Розробка",
            avatar: "🧑‍💻",
            role: "colleague",
            personality: "Сфокусований, трохи інтровертний, експерт у своїй області",
            communicationStyle: "Лаконічний, по справі, але завжди допоможе якщо попросити."
          }
        ],
        meetings: [
          {
            id: "m1",
            title: "Daily Standup",
            duration: "15 хв",
            type: "standup",
            description: "Щоденна синхронізація команди: що зробив, що планую, які блокери",
            participants: ["Олексій Савченко", "Марина Коваль", "Денис Мельник"]
          },
          {
            id: "m2",
            title: "Sprint Planning",
            duration: "1 год",
            type: "planning",
            description: "Планування завдань на тиждень, оцінка складності, розподіл задач",
            participants: ["Олексій Савченко", "Марина Коваль"]
          },
          {
            id: "m3",
            title: "1-on-1 з наставником",
            duration: "30 хв",
            type: "1on1",
            description: "Персональна зустріч з buddy для обговорення прогресу та питань",
            participants: ["Марина Коваль"]
          }
        ],
        tasks: [
          {
            id: "t1",
            title: "Виправити баг у формі авторизації",
            description: "Користувачі скаржаться, що форма не валідує email правильно",
            priority: "high",
            estimatedTime: "2 години",
            skills: ["React", "Валідація", "Дебагінг"]
          },
          {
            id: "t2",
            title: "Додати новий компонент карточки",
            description: "Створити переиспользуемий компонент для відображення товару",
            priority: "medium",
            estimatedTime: "3 години",
            skills: ["React", "CSS", "Компонентний підхід"]
          },
          {
            id: "t3",
            title: "Написати unit-тести",
            description: "Покрити тестами утилітарні функції модуля оплати",
            priority: "medium",
            estimatedTime: "2 години",
            skills: ["Jest", "Testing", "JavaScript"]
          }
        ],
        culture: {
          values: ["Код-рев'ю обов'язкове", "Документація важлива", "Питання вітаються"],
          dresscode: "Casual (джинси, футболки)",
          communication: "Slack для швидких питань, Jira для задач",
          workStyle: "Гнучкий графік, можливість віддаленої роботи"
        },
        processes: [
          "Agile/Scrum методологія",
          "Код-рев'ю перед мержем",
          "CI/CD пайплайн",
          "Щотижневі ретроспективи"
        ]
      }
    ],
    availableRoles: ["Frontend Developer", "Backend Developer", "QA Engineer", "DevOps"],
    internshipDuration: "4-6 годин",
    rating: 4.8,
    reviewsCount: 156
  },
  {
    id: "greenfinance",
    name: "GreenFinance Bank",
    logo: "🏦",
    industry: "Фінанси / Банкінг",
    size: "enterprise",
    description: "Один з провідних банків України з фокусом на діджитал-трансформацію та екологічні ініціативи.",
    culture: {
      values: ["Надійність", "Інновації", "Клієнтоорієнтованість", "Сталий розвиток"],
      mission: "Робити фінансові послуги доступними та екологічними",
      atmosphere: "Професійна, структурована, з елементами сучасної корпоративної культури"
    },
    offices: [
      {
        id: "gf-analytics",
        name: "Департамент аналітики",
        type: "department",
        employees: [
          {
            id: "gf1",
            name: "Ірина Бондаренко",
            position: "Head of Analytics",
            department: "Аналітика",
            avatar: "👩‍💼",
            role: "manager",
            personality: "Стратегічне мислення, вимоглива до якості, але справедлива",
            communicationStyle: "Формальний у робочих питаннях, підтримуюча в розвитку"
          },
          {
            id: "gf2",
            name: "Андрій Кравченко",
            position: "Senior Data Analyst",
            department: "Аналітика",
            avatar: "👨‍💼",
            role: "buddy",
            personality: "Методичний, уважний до деталей, відмінний наставник",
            communicationStyle: "Терплячий, готовий пояснювати складні концепції"
          },
          {
            id: "gf3",
            name: "Олена Сидоренко",
            position: "Business Analyst",
            department: "Аналітика",
            avatar: "👩‍💼",
            role: "colleague",
            personality: "Комунікабельна, добре розуміє бізнес-процеси",
            communicationStyle: "Дружелюбна, часто ініціює обговорення"
          }
        ],
        meetings: [
          {
            id: "gfm1",
            title: "Weekly Analytics Review",
            duration: "45 хв",
            type: "review",
            description: "Огляд ключових метрик та KPI за тиждень",
            participants: ["Ірина Бондаренко", "Андрій Кравченко", "Олена Сидоренко"]
          },
          {
            id: "gfm2",
            title: "Data Quality Check",
            duration: "30 хв",
            type: "team",
            description: "Перевірка якості даних та обговорення знайдених аномалій",
            participants: ["Андрій Кравченко", "Олена Сидоренко"]
          }
        ],
        tasks: [
          {
            id: "gft1",
            title: "Аналіз відтоку клієнтів",
            description: "Проаналізувати дані за квартал та визначити основні причини відтоку",
            priority: "high",
            estimatedTime: "3 години",
            skills: ["SQL", "Excel", "Аналітичне мислення"]
          },
          {
            id: "gft2",
            title: "Підготовка дашборду",
            description: "Створити візуалізацію ключових метрик для керівництва",
            priority: "medium",
            estimatedTime: "2 години",
            skills: ["Power BI", "Візуалізація даних", "Презентація"]
          }
        ],
        culture: {
          values: ["Точність даних критична", "Конфіденційність", "Командна робота"],
          dresscode: "Business casual",
          communication: "Email для формальних питань, Teams для оперативних",
          workStyle: "Гібридний формат: 3 дні офіс, 2 дні віддалено"
        },
        processes: [
          "Щоденні звіти керівництву",
          "Тижневі стратегічні сесії",
          "Квартальне планування"
        ]
      }
    ],
    availableRoles: ["Data Analyst", "Business Analyst", "Financial Analyst", "Product Manager"],
    internshipDuration: "4-6 годин",
    rating: 4.5,
    reviewsCount: 89
  },
  {
    id: "creativespace",
    name: "CreativeSpace Agency",
    logo: "🎨",
    industry: "Маркетинг / Реклама",
    size: "startup",
    description: "Креативне агентство повного циклу: від стратегії до реалізації. Працюємо з топ-брендами України.",
    culture: {
      values: ["Креативність", "Сміливість", "Якість", "Колаборація"],
      mission: "Створювати кампанії, про які говорять",
      atmosphere: "Творча, динамічна, з відкритим простором для ідей"
    },
    offices: [
      {
        id: "cs-creative",
        name: "Креативний відділ",
        type: "department",
        employees: [
          {
            id: "cs1",
            name: "Максим Литвиненко",
            position: "Creative Director",
            department: "Креатив",
            avatar: "🧑‍🎨",
            role: "manager",
            personality: "Візіонер, натхненний, вимогливий до якості ідей",
            communicationStyle: "Емоційний, надихаючий, любить брейнстормінги"
          },
          {
            id: "cs2",
            name: "Софія Ткаченко",
            position: "Art Director",
            department: "Креатив",
            avatar: "👩‍🎨",
            role: "buddy",
            personality: "Перфекціоністка з чудовим смаком, терпляча наставниця",
            communicationStyle: "Конструктивна, візуально орієнтована, показує приклади"
          },
          {
            id: "cs3",
            name: "Богдан Шевченко",
            position: "Copywriter",
            department: "Креатив",
            avatar: "✍️",
            role: "colleague",
            personality: "Креативний, з гострим розумом та чудовим почуттям гумору",
            communicationStyle: "Неформальний, любить обговорювати ідеї за кавою"
          }
        ],
        meetings: [
          {
            id: "csm1",
            title: "Creative Brainstorm",
            duration: "1.5 год",
            type: "team",
            description: "Генерація ідей для нового проекту, без критики, всі ідеї записуються",
            participants: ["Максим Литвиненко", "Софія Ткаченко", "Богдан Шевченко"]
          },
          {
            id: "csm2",
            title: "Design Review",
            duration: "45 хв",
            type: "review",
            description: "Огляд готових макетів, фідбек, правки",
            participants: ["Софія Ткаченко"]
          }
        ],
        tasks: [
          {
            id: "cst1",
            title: "Концепція банерів для кампанії",
            description: "Розробити 3 варіанти візуальних концепцій для рекламної кампанії",
            priority: "high",
            estimatedTime: "3 години",
            skills: ["Figma", "Креативне мислення", "Візуальний дизайн"]
          },
          {
            id: "cst2",
            title: "Написати текст для лендінгу",
            description: "Створити продаючий текст для нової посадкової сторінки клієнта",
            priority: "medium",
            estimatedTime: "2 години",
            skills: ["Копірайтинг", "UX Writing", "Маркетинг"]
          }
        ],
        culture: {
          values: ["Немає поганих ідей", "Фідбек - це подарунок", "Дедлайни святі"],
          dresscode: "Вільний (self-expression вітається)",
          communication: "Slack, Figma коментарі, особисті обговорення",
          workStyle: "Гнучкий, результат важливіший за процес"
        },
        processes: [
          "Брейнстормінг перед кожним проектом",
          "Внутрішній пітчинг ідей",
          "Клієнтські презентації разом"
        ]
      }
    ],
    availableRoles: ["UI/UX Designer", "Graphic Designer", "Copywriter", "SMM Manager"],
    internshipDuration: "3-5 годин",
    rating: 4.9,
    reviewsCount: 234
  },
  {
    id: "logisticspro",
    name: "LogisticsPro",
    logo: "🚛",
    industry: "Логістика / Транспорт",
    size: "medium",
    description: "Провайдер комплексних логістичних рішень для e-commerce та рітейлу по всій Україні.",
    culture: {
      values: ["Швидкість", "Надійність", "Ефективність", "Безпека"],
      mission: "Доставляти вчасно, завжди",
      atmosphere: "Динамічна, орієнтована на результат"
    },
    offices: [
      {
        id: "lp-ops",
        name: "Операційний відділ",
        type: "department",
        employees: [
          {
            id: "lp1",
            name: "Віктор Петренко",
            position: "Operations Manager",
            department: "Операції",
            avatar: "👨‍💼",
            role: "manager",
            personality: "Організований, стресостійкий, швидко приймає рішення",
            communicationStyle: "Чіткий, конкретний, цінує ефективність"
          },
          {
            id: "lp2",
            name: "Наталія Гончар",
            position: "Senior Logistics Coordinator",
            department: "Операції",
            avatar: "👩‍💼",
            role: "buddy",
            personality: "Уважна до деталей, спокійна під тиском",
            communicationStyle: "Підтримуюча, пояснює нюанси роботи"
          }
        ],
        meetings: [
          {
            id: "lpm1",
            title: "Ранковий брифінг",
            duration: "20 хв",
            type: "standup",
            description: "Огляд замовлень на день, розподіл маршрутів, проблемні зони",
            participants: ["Віктор Петренко", "Наталія Гончар"]
          }
        ],
        tasks: [
          {
            id: "lpt1",
            title: "Оптимізація маршруту доставки",
            description: "Знайти оптимальний маршрут для 15 точок доставки в Києві",
            priority: "high",
            estimatedTime: "1.5 години",
            skills: ["Логістика", "Аналітика", "Оптимізація"]
          }
        ],
        culture: {
          values: ["Клієнт завжди знає статус", "Проблеми вирішуються миттєво"],
          dresscode: "Уніформа компанії",
          communication: "Рація, CRM система, телефон",
          workStyle: "Позмінний графік, чіткі процедури"
        },
        processes: [
          "Трекінг кожного замовлення",
          "Ескалація проблем за 15 хвилин",
          "Щоденна звітність"
        ]
      }
    ],
    availableRoles: ["Logistics Coordinator", "Operations Analyst", "Supply Chain Specialist"],
    internshipDuration: "3-4 години",
    rating: 4.3,
    reviewsCount: 67
  },
  {
    id: "healthtech",
    name: "HealthTech Innovations",
    logo: "🏥",
    industry: "Медицина / HealthTech",
    size: "startup",
    description: "Стартап, що розробляє цифрові рішення для медичних закладів та пацієнтів.",
    culture: {
      values: ["Інновації заради здоров'я", "Етика", "Доказовий підхід", "Емпатія"],
      mission: "Зробити якісну медицину доступною через технології",
      atmosphere: "Місійна, орієнтована на вплив"
    },
    offices: [
      {
        id: "ht-product",
        name: "Продуктова команда",
        type: "department",
        employees: [
          {
            id: "ht1",
            name: "Оксана Білецька",
            position: "Product Owner",
            department: "Продукт",
            avatar: "👩‍⚕️",
            role: "manager",
            personality: "Емпатична, з медичним бекграундом, стратегічне бачення",
            communicationStyle: "Залучаюча, цінує думку кожного члена команди"
          },
          {
            id: "ht2",
            name: "Артем Левченко",
            position: "UX Researcher",
            department: "Продукт",
            avatar: "🧑‍💻",
            role: "buddy",
            personality: "Допитливий, орієнтований на користувача",
            communicationStyle: "Запитує багато питань, допомагає думати про юзера"
          }
        ],
        meetings: [
          {
            id: "htm1",
            title: "User Research Debrief",
            duration: "1 год",
            type: "review",
            description: "Обговорення результатів інтерв'ю з користувачами",
            participants: ["Оксана Білецька", "Артем Левченко"]
          }
        ],
        tasks: [
          {
            id: "htt1",
            title: "Аналіз user journey пацієнта",
            description: "Змапити шлях користувача від симптому до лікування в додатку",
            priority: "high",
            estimatedTime: "2.5 години",
            skills: ["UX Research", "Емпатія", "Аналіз"]
          }
        ],
        culture: {
          values: ["Пацієнт у центрі", "Дані важливі", "Етика понад усе"],
          dresscode: "Smart casual",
          communication: "Notion, Slack, регулярні sync-и",
          workStyle: "Гнучкий, з фокусом на deep work"
        },
        processes: [
          "User research перед кожною фічею",
          "Медична експертиза контенту",
          "A/B тестування"
        ]
      }
    ],
    availableRoles: ["Product Manager", "UX Designer", "UX Researcher", "Medical Content Writer"],
    internshipDuration: "4-5 годин",
    rating: 4.7,
    reviewsCount: 45
  },
  {
    id: "ecoretail",
    name: "EcoRetail Ukraine",
    logo: "🌱",
    industry: "Рітейл / E-commerce",
    size: "medium",
    description: "Мережа еко-магазинів та онлайн-платформа для екологічних товарів.",
    culture: {
      values: ["Екологічність", "Прозорість", "Спільнота", "Якість"],
      mission: "Зробити екологічний вибір простим для кожного",
      atmosphere: "Дружня, місійна, з сильною командною культурою"
    },
    offices: [
      {
        id: "er-ecom",
        name: "E-commerce команда",
        type: "department",
        employees: [
          {
            id: "er1",
            name: "Катерина Вовк",
            position: "E-commerce Manager",
            department: "E-commerce",
            avatar: "👩‍💼",
            role: "manager",
            personality: "Енергійна, результат-орієнтована, з чудовим розумінням клієнта",
            communicationStyle: "Відкрита, дає багато автономії, чекає ініціативи"
          },
          {
            id: "er2",
            name: "Ігор Полтавець",
            position: "Digital Marketing Specialist",
            department: "E-commerce",
            avatar: "👨‍💻",
            role: "buddy",
            personality: "Креативний, аналітичний, любить експерименти",
            communicationStyle: "Неформальний, ділиться інсайтами та кейсами"
          }
        ],
        meetings: [
          {
            id: "erm1",
            title: "Marketing Sync",
            duration: "30 хв",
            type: "team",
            description: "Обговорення поточних кампаній та результатів",
            participants: ["Катерина Вовк", "Ігор Полтавець"]
          }
        ],
        tasks: [
          {
            id: "ert1",
            title: "Аналіз ефективності email-розсилки",
            description: "Проаналізувати open rate та конверсію останніх 5 розсилок",
            priority: "medium",
            estimatedTime: "1.5 години",
            skills: ["Email Marketing", "Аналітика", "A/B тестування"]
          }
        ],
        culture: {
          values: ["Дані керують рішеннями", "Тестуй швидко", "Вчись на помилках"],
          dresscode: "Casual (еко-френдлі вітається)",
          communication: "Slack, Google Meet, Trello",
          workStyle: "Гібрид, багато крос-функціональної роботи"
        },
        processes: [
          "Тижневі A/B тести",
          "Місячні огляди метрик",
          "Квартальне планування кампаній"
        ]
      }
    ],
    availableRoles: ["Digital Marketer", "Content Manager", "E-commerce Analyst", "SMM Specialist"],
    internshipDuration: "3-5 годин",
    rating: 4.6,
    reviewsCount: 112
  }
];

export const industryCategories = [
  { id: "it", name: "IT / Розробка ПЗ", icon: "💻", companies: ["techwave"] },
  { id: "finance", name: "Фінанси / Банкінг", icon: "🏦", companies: ["greenfinance"] },
  { id: "marketing", name: "Маркетинг / Реклама", icon: "🎨", companies: ["creativespace"] },
  { id: "logistics", name: "Логістика / Транспорт", icon: "🚛", companies: ["logisticspro"] },
  { id: "health", name: "Медицина / HealthTech", icon: "🏥", companies: ["healthtech"] },
  { id: "retail", name: "Рітейл / E-commerce", icon: "🌱", companies: ["ecoretail"] }
];

export const getCompanyById = (id: string): VirtualCompany | undefined => {
  return virtualCompanies.find(c => c.id === id);
};

export const getCompaniesByIndustry = (industryId: string): VirtualCompany[] => {
  const category = industryCategories.find(c => c.id === industryId);
  if (!category) return [];
  return virtualCompanies.filter(c => category.companies.includes(c.id));
};
