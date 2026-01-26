// Virtual interview data types and mock data

export interface InterviewerAvatar {
  id: string;
  name: string;
  role: string;
  department: string;
  photo: string;
  personality: string;
  interviewStyle: string;
}

export interface InterviewQuestion {
  id: string;
  type: "behavioral" | "technical" | "situational" | "competency";
  category: string;
  question: string;
  followUp?: string;
  competencyTargeted: string;
  expectedStarElements: ("Situation" | "Task" | "Action" | "Result")[];
  hardSkillsChecked?: string[];
  softSkillsChecked?: string[];
  weight: number;
}

export interface MetaprogramProfile {
  motivation: { value: number; label: string }; // До/Від
  reference: { value: number; label: string }; // Внутрішня/Зовнішня
  scale: { value: number; label: string }; // Загальне/Деталі
  time: { value: number; label: string }; // Минуле/Майбутнє
  activity: { value: number; label: string }; // Проактивний/Реактивний
  decisions: { value: number; label: string }; // Варіанти/Процедури
}

export interface CompetencyModelForInterview {
  id: string;
  positionTitle: string;
  competencies: {
    name: string;
    category: "hard" | "soft";
    weight: number;
    description: string;
    indicators: string[];
  }[];
  idealMetaprofile: MetaprogramProfile;
}

export interface InterviewResult {
  overallScore: number;
  competencyScores: { name: string; score: number; feedback: string }[];
  metaprogramMatch: number;
  metaprogramAnalysis: { dimension: string; candidate: number; ideal: number; gap: number }[];
  starAnalysis: {
    questionId: string;
    situationScore: number;
    taskScore: number;
    actionScore: number;
    resultScore: number;
    feedback: string;
  }[];
  recommendation: "strong_hire" | "hire" | "maybe" | "no_hire";
  recommendationRationale: string;
  strengths: string[];
  weaknesses: string[];
  developmentSuggestions: string[];
}

export interface VirtualInterview {
  id: string;
  companyId: string;
  companyName: string;
  positionTitle: string;
  interviewer: InterviewerAvatar;
  competencyModel: CompetencyModelForInterview;
  questions: InterviewQuestion[];
  duration: number; // minutes
  isActive: boolean;
  createdAt: string;
}

// Mock interviewers
export const mockInterviewers: InterviewerAvatar[] = [
  {
    id: "int-1",
    name: "Олена Петренко",
    role: "Head of HR",
    department: "Human Resources",
    photo: "/placeholder.svg",
    personality: "Дружня, уважна до деталей, фокусується на soft skills",
    interviewStyle: "Структуроване інтерв'ю з акцентом на поведінкові запитання",
  },
  {
    id: "int-2",
    name: "Андрій Коваль",
    role: "Tech Lead",
    department: "Engineering",
    photo: "/placeholder.svg",
    personality: "Технічний, прямолінійний, цінує глибину знань",
    interviewStyle: "Технічне інтерв'ю з практичними задачами",
  },
  {
    id: "int-3",
    name: "Марія Шевченко",
    role: "Product Director",
    department: "Product",
    photo: "/placeholder.svg",
    personality: "Стратегічна, орієнтована на результат, цікавиться баченням",
    interviewStyle: "Кейс-інтерв'ю з обговоренням продуктових рішень",
  },
  {
    id: "int-4",
    name: "Дмитро Бондаренко",
    role: "CEO",
    department: "Executive",
    photo: "/placeholder.svg",
    personality: "Харизматичний, фокусується на культурній відповідності",
    interviewStyle: "Неформальна розмова про цінності та мотивацію",
  },
];

// Mock competency models for different positions
export const mockCompetencyModels: CompetencyModelForInterview[] = [
  {
    id: "cm-frontend",
    positionTitle: "Frontend Developer",
    competencies: [
      {
        name: "React/TypeScript",
        category: "hard",
        weight: 9,
        description: "Глибоке знання React екосистеми та TypeScript",
        indicators: ["Hooks", "State management", "Performance optimization"],
      },
      {
        name: "UI/UX Implementation",
        category: "hard",
        weight: 8,
        description: "Здатність імплементувати складні інтерфейси",
        indicators: ["Responsive design", "Accessibility", "Animation"],
      },
      {
        name: "Problem Solving",
        category: "soft",
        weight: 8,
        description: "Аналітичне мислення та вирішення проблем",
        indicators: ["Debugging", "Architecture decisions", "Trade-offs"],
      },
      {
        name: "Communication",
        category: "soft",
        weight: 7,
        description: "Ефективна комунікація в команді",
        indicators: ["Code reviews", "Documentation", "Collaboration"],
      },
    ],
    idealMetaprofile: {
      motivation: { value: 80, label: "До цілі" },
      reference: { value: 60, label: "Збалансована" },
      scale: { value: 75, label: "Деталі" },
      time: { value: 70, label: "Майбутнє" },
      activity: { value: 85, label: "Проактивний" },
      decisions: { value: 65, label: "Варіанти" },
    },
  },
  {
    id: "cm-pm",
    positionTitle: "Product Manager",
    competencies: [
      {
        name: "Product Strategy",
        category: "hard",
        weight: 9,
        description: "Розробка та реалізація продуктової стратегії",
        indicators: ["Vision", "Roadmapping", "Prioritization"],
      },
      {
        name: "Data Analysis",
        category: "hard",
        weight: 8,
        description: "Аналіз даних для прийняття рішень",
        indicators: ["Metrics", "A/B testing", "User research"],
      },
      {
        name: "Leadership",
        category: "soft",
        weight: 9,
        description: "Лідерство та вплив без прямої влади",
        indicators: ["Stakeholder management", "Team motivation", "Conflict resolution"],
      },
      {
        name: "Communication",
        category: "soft",
        weight: 8,
        description: "Ефективна комунікація на всіх рівнях",
        indicators: ["Presentations", "Written communication", "Active listening"],
      },
    ],
    idealMetaprofile: {
      motivation: { value: 85, label: "До цілі" },
      reference: { value: 55, label: "Збалансована" },
      scale: { value: 60, label: "Загальне" },
      time: { value: 80, label: "Майбутнє" },
      activity: { value: 90, label: "Проактивний" },
      decisions: { value: 70, label: "Варіанти" },
    },
  },
];

// Mock interview questions
export const mockInterviewQuestions: InterviewQuestion[] = [
  // Behavioral - STAR focused
  {
    id: "q-1",
    type: "behavioral",
    category: "Problem Solving",
    question: "Розкажіть про ситуацію, коли ви стикнулися зі складною технічною проблемою, яку ніхто не міг вирішити. Як ви підійшли до її вирішення?",
    followUp: "Що б ви зробили інакше, якби мали можливість?",
    competencyTargeted: "Problem Solving",
    expectedStarElements: ["Situation", "Task", "Action", "Result"],
    softSkillsChecked: ["Аналітичне мислення", "Наполегливість"],
    weight: 9,
  },
  {
    id: "q-2",
    type: "behavioral",
    category: "Teamwork",
    question: "Опишіть випадок, коли вам довелося працювати з колегою, з яким було важко знайти спільну мову. Як ви впоралися з цією ситуацією?",
    competencyTargeted: "Communication",
    expectedStarElements: ["Situation", "Task", "Action", "Result"],
    softSkillsChecked: ["Емпатія", "Конфлікт-менеджмент"],
    weight: 8,
  },
  {
    id: "q-3",
    type: "behavioral",
    category: "Leadership",
    question: "Наведіть приклад, коли ви взяли на себе ініціативу в проєкті без офіційного доручення. Що вас мотивувало і який був результат?",
    competencyTargeted: "Leadership",
    expectedStarElements: ["Situation", "Task", "Action", "Result"],
    softSkillsChecked: ["Ініціативність", "Відповідальність"],
    weight: 8,
  },
  // Technical
  {
    id: "q-4",
    type: "technical",
    category: "Architecture",
    question: "Як би ви спроектували систему для обробки 10 мільйонів запитів на добу? Опишіть архітектурні рішення.",
    competencyTargeted: "System Design",
    expectedStarElements: ["Action", "Result"],
    hardSkillsChecked: ["Scalability", "Architecture", "Performance"],
    weight: 9,
  },
  {
    id: "q-5",
    type: "technical",
    category: "React",
    question: "Поясніть різницю між useMemo та useCallback. В яких ситуаціях ви б використовували кожен з них?",
    competencyTargeted: "React/TypeScript",
    expectedStarElements: ["Action"],
    hardSkillsChecked: ["React Hooks", "Performance optimization"],
    weight: 8,
  },
  // Situational
  {
    id: "q-6",
    type: "situational",
    category: "Decision Making",
    question: "Уявіть, що ви маєте дедлайн через тиждень, але розумієте, що не встигнете завершити всі функції. Як ви вчините?",
    competencyTargeted: "Problem Solving",
    expectedStarElements: ["Action", "Result"],
    softSkillsChecked: ["Пріоритизація", "Комунікація"],
    weight: 7,
  },
  {
    id: "q-7",
    type: "situational",
    category: "Ethics",
    question: "Що б ви зробили, якби помітили, що колега допустив серйозну помилку в коді, яка може вплинути на продакшн?",
    competencyTargeted: "Communication",
    expectedStarElements: ["Action"],
    softSkillsChecked: ["Чесність", "Командна робота"],
    weight: 7,
  },
  // Competency-based
  {
    id: "q-8",
    type: "competency",
    category: "Learning",
    question: "Як ви підтримуєте свої технічні знання актуальними? Розкажіть про останню технологію, яку ви вивчили самостійно.",
    competencyTargeted: "Continuous Learning",
    expectedStarElements: ["Situation", "Action", "Result"],
    softSkillsChecked: ["Самомотивація", "Допитливість"],
    weight: 6,
  },
];

// Companies offering interviews
export const companiesWithInterviews = [
  {
    id: "comp-1",
    name: "TechCorp Ukraine",
    industry: "IT / Software Development",
    logo: "/placeholder.svg",
    positions: ["Frontend Developer", "Backend Developer", "Product Manager"],
    interviewsAvailable: 3,
  },
  {
    id: "comp-2",
    name: "FinTech Solutions",
    industry: "Фінансові технології",
    logo: "/placeholder.svg",
    positions: ["Data Analyst", "Solution Architect", "Project Manager"],
    interviewsAvailable: 2,
  },
  {
    id: "comp-3",
    name: "Marketing Pro Agency",
    industry: "Маркетинг та реклама",
    logo: "/placeholder.svg",
    positions: ["Marketing Manager", "Content Strategist", "SMM Specialist"],
    interviewsAvailable: 4,
  },
  {
    id: "comp-4",
    name: "GreenEnergy Corp",
    industry: "Енергетика",
    logo: "/placeholder.svg",
    positions: ["Project Engineer", "Sustainability Manager", "Operations Lead"],
    interviewsAvailable: 2,
  },
];
