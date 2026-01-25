import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { 
  ArrowRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Question {
  id: number;
  question: string;
  options: {
    id: string;
    text: string;
    traits: {
      analytical: number;
      creative: number;
      social: number;
      technical: number;
      leadership: number;
    };
  }[];
}

const questions: Question[] = [
  {
    id: 1,
    question: "Що більше вас мотивує у роботі?",
    options: [
      { id: "a", text: "Досягнення конкретних результатів та цілей", traits: { analytical: 2, creative: 0, social: 0, technical: 1, leadership: 2 } },
      { id: "b", text: "Створення чогось нового та унікального", traits: { analytical: 0, creative: 3, social: 0, technical: 1, leadership: 0 } },
      { id: "c", text: "Допомога іншим людям та командна робота", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 1 } },
    ],
  },
  {
    id: 2,
    question: "Як ви приймаєте важливі рішення?",
    options: [
      { id: "a", text: "Аналізую факти та дані", traits: { analytical: 3, creative: 0, social: 0, technical: 2, leadership: 0 } },
      { id: "b", text: "Довіряю інтуїції та внутрішньому відчуттю", traits: { analytical: 0, creative: 2, social: 1, technical: 0, leadership: 1 } },
      { id: "c", text: "Раджуся з іншими та враховую їхню думку", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 1 } },
    ],
  },
  {
    id: 3,
    question: "Яке робоче середовище вам ближче?",
    options: [
      { id: "a", text: "Тиха робота за комп'ютером", traits: { analytical: 2, creative: 1, social: 0, technical: 3, leadership: 0 } },
      { id: "b", text: "Творча студія або майстерня", traits: { analytical: 0, creative: 3, social: 1, technical: 1, leadership: 0 } },
      { id: "c", text: "Офіс з активною комунікацією", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 2 } },
    ],
  },
  {
    id: 4,
    question: "Що вас найбільше цікавить у вільний час?",
    options: [
      { id: "a", text: "Читання технічної літератури, вивчення нових технологій", traits: { analytical: 2, creative: 0, social: 0, technical: 3, leadership: 0 } },
      { id: "b", text: "Малювання, музика, дизайн або інші творчі заняття", traits: { analytical: 0, creative: 3, social: 0, technical: 0, leadership: 0 } },
      { id: "c", text: "Зустрічі з друзями, волонтерство, соціальні активності", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 1 } },
    ],
  },
  {
    id: 5,
    question: "Як ви ставитесь до роботи з числами та даними?",
    options: [
      { id: "a", text: "Це захоплює мене, я люблю аналізувати статистику", traits: { analytical: 3, creative: 0, social: 0, technical: 2, leadership: 0 } },
      { id: "b", text: "Можу працювати, але не є моєю пристрастю", traits: { analytical: 1, creative: 1, social: 1, technical: 1, leadership: 1 } },
      { id: "c", text: "Надаю перевагу роботі з людьми або ідеями", traits: { analytical: 0, creative: 2, social: 2, technical: 0, leadership: 1 } },
    ],
  },
  {
    id: 6,
    question: "Яку роль ви зазвичай берете у командних проєктах?",
    options: [
      { id: "a", text: "Лідер або координатор", traits: { analytical: 1, creative: 0, social: 2, technical: 0, leadership: 3 } },
      { id: "b", text: "Генератор ідей та креативних рішень", traits: { analytical: 0, creative: 3, social: 1, technical: 0, leadership: 0 } },
      { id: "c", text: "Виконавець, який доводить справи до кінця", traits: { analytical: 2, creative: 0, social: 0, technical: 2, leadership: 0 } },
    ],
  },
  {
    id: 7,
    question: "Що для вас важливіше у майбутній кар'єрі?",
    options: [
      { id: "a", text: "Стабільність та зрозумілий кар'єрний шлях", traits: { analytical: 2, creative: 0, social: 0, technical: 2, leadership: 1 } },
      { id: "b", text: "Можливість самовираження та творчості", traits: { analytical: 0, creative: 3, social: 0, technical: 0, leadership: 0 } },
      { id: "c", text: "Соціальний вплив та допомога суспільству", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 2 } },
    ],
  },
  {
    id: 8,
    question: "Як ви реагуєте на нові технології?",
    options: [
      { id: "a", text: "Завжди першим пробую та досліджую", traits: { analytical: 1, creative: 1, social: 0, technical: 3, leadership: 0 } },
      { id: "b", text: "Цікавлюся, як їх можна використати креативно", traits: { analytical: 0, creative: 3, social: 0, technical: 2, leadership: 0 } },
      { id: "c", text: "Більше цікавить як технології впливають на людей", traits: { analytical: 1, creative: 0, social: 3, technical: 0, leadership: 1 } },
    ],
  },
  {
    id: 9,
    question: "Яке завдання здається вам найцікавішим?",
    options: [
      { id: "a", text: "Розв'язати складну логічну задачу", traits: { analytical: 3, creative: 0, social: 0, technical: 2, leadership: 0 } },
      { id: "b", text: "Створити візуальний дизайн або контент", traits: { analytical: 0, creative: 3, social: 0, technical: 1, leadership: 0 } },
      { id: "c", text: "Провести презентацію або навчити когось", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 2 } },
    ],
  },
  {
    id: 10,
    question: "Як ви уявляєте свій ідеальний робочий день?",
    options: [
      { id: "a", text: "Глибока робота над технічними завданнями", traits: { analytical: 2, creative: 0, social: 0, technical: 3, leadership: 0 } },
      { id: "b", text: "Брейнштормінг та робота над креативними проєктами", traits: { analytical: 0, creative: 3, social: 1, technical: 0, leadership: 0 } },
      { id: "c", text: "Зустрічі, переговори та робота з клієнтами", traits: { analytical: 0, creative: 0, social: 3, technical: 0, leadership: 3 } },
    ],
  },
];

interface ProfessionRecommendation {
  name: string;
  match: number;
  description: string;
}

const calculateResults = (answers: Record<number, string>) => {
  const traits = {
    analytical: 0,
    creative: 0,
    social: 0,
    technical: 0,
    leadership: 0,
  };

  // Calculate trait scores
  Object.entries(answers).forEach(([questionIndex, answerId]) => {
    const question = questions[parseInt(questionIndex)];
    const selectedOption = question?.options.find(opt => opt.id === answerId);
    if (selectedOption) {
      traits.analytical += selectedOption.traits.analytical;
      traits.creative += selectedOption.traits.creative;
      traits.social += selectedOption.traits.social;
      traits.technical += selectedOption.traits.technical;
      traits.leadership += selectedOption.traits.leadership;
    }
  });

  // Normalize to percentage
  const maxPossible = 30; // max score per trait
  const normalized = {
    analytical: Math.round((traits.analytical / maxPossible) * 100),
    creative: Math.round((traits.creative / maxPossible) * 100),
    social: Math.round((traits.social / maxPossible) * 100),
    technical: Math.round((traits.technical / maxPossible) * 100),
    leadership: Math.round((traits.leadership / maxPossible) * 100),
  };

  // Determine professions based on traits
  const professions: ProfessionRecommendation[] = [];

  if (normalized.technical >= 60 && normalized.analytical >= 50) {
    professions.push({
      name: "Розробник програмного забезпечення",
      match: Math.round((normalized.technical + normalized.analytical) / 2),
      description: "Створення програм, веб-додатків та мобільних застосунків"
    });
  }

  if (normalized.analytical >= 60) {
    professions.push({
      name: "Data Analyst / Data Scientist",
      match: Math.round((normalized.analytical * 0.7 + normalized.technical * 0.3)),
      description: "Аналіз даних, виявлення закономірностей та прогнозування"
    });
  }

  if (normalized.creative >= 60) {
    professions.push({
      name: "UX/UI Дизайнер",
      match: Math.round((normalized.creative * 0.6 + normalized.technical * 0.2 + normalized.social * 0.2)),
      description: "Проєктування користувацького досвіду та інтерфейсів"
    });
  }

  if (normalized.creative >= 50 && normalized.technical >= 40) {
    professions.push({
      name: "Frontend Developer",
      match: Math.round((normalized.creative * 0.4 + normalized.technical * 0.6)),
      description: "Розробка візуальної частини веб-сайтів та додатків"
    });
  }

  if (normalized.social >= 60 && normalized.leadership >= 40) {
    professions.push({
      name: "Product Manager",
      match: Math.round((normalized.social * 0.4 + normalized.leadership * 0.4 + normalized.analytical * 0.2)),
      description: "Управління розвитком продуктів та координація команд"
    });
  }

  if (normalized.social >= 50 && normalized.creative >= 40) {
    professions.push({
      name: "Маркетолог / SMM-спеціаліст",
      match: Math.round((normalized.social * 0.5 + normalized.creative * 0.5)),
      description: "Просування брендів та комунікація з аудиторією"
    });
  }

  if (normalized.leadership >= 60) {
    professions.push({
      name: "Project Manager",
      match: Math.round((normalized.leadership * 0.5 + normalized.social * 0.3 + normalized.analytical * 0.2)),
      description: "Планування та управління проєктами"
    });
  }

  if (normalized.social >= 70) {
    professions.push({
      name: "HR-спеціаліст",
      match: Math.round((normalized.social * 0.7 + normalized.leadership * 0.3)),
      description: "Робота з персоналом, рекрутинг та розвиток команди"
    });
  }

  // If no strong matches, add general recommendations
  if (professions.length < 3) {
    if (!professions.find(p => p.name.includes("Analyst"))) {
      professions.push({
        name: "Бізнес-аналітик",
        match: Math.round((normalized.analytical * 0.5 + normalized.social * 0.3 + normalized.leadership * 0.2)),
        description: "Аналіз бізнес-процесів та оптимізація рішень"
      });
    }
    if (!professions.find(p => p.name.includes("QA"))) {
      professions.push({
        name: "QA Engineer",
        match: Math.round((normalized.analytical * 0.5 + normalized.technical * 0.5)),
        description: "Забезпечення якості програмного забезпечення"
      });
    }
  }

  // Sort by match and take top 5
  professions.sort((a, b) => b.match - a.match);
  
  return {
    traits: normalized,
    professions: professions.slice(0, 5),
  };
};

const getInsightText = (traits: Record<string, number>) => {
  const sorted = Object.entries(traits).sort(([, a], [, b]) => b - a);
  const top = sorted[0][0];
  const second = sorted[1][0];
  
  const traitLabels: Record<string, string> = {
    analytical: "аналітичного мислення",
    creative: "креативності",
    social: "соціальної взаємодії",
    technical: "технічних навичок",
    leadership: "лідерства",
  };

  return `На основі ваших відповідей, ви демонструєте високий рівень ${traitLabels[top]} та ${traitLabels[second]}. Ваш профіль найкраще відповідає ролям, де ці якості є ключовими для успіху.`;
};

const StudentOrientation = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const progress = ((Object.keys(answers).length) / questions.length) * 100;

  const results = useMemo(() => {
    if (isCompleted) {
      return calculateResults(answers);
    }
    return null;
  }, [isCompleted, answers]);

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsCompleted(true);
    }
  };

  if (isCompleted && results) {
    const traitFactors = [
      { label: "Аналітичне мислення", value: results.traits.analytical >= 60 ? "Високий" : results.traits.analytical >= 40 ? "Середній" : "Базовий", weight: results.traits.analytical },
      { label: "Креативність", value: results.traits.creative >= 60 ? "Високий" : results.traits.creative >= 40 ? "Середній" : "Базовий", weight: results.traits.creative },
      { label: "Соціальна взаємодія", value: results.traits.social >= 60 ? "Високий" : results.traits.social >= 40 ? "Середній" : "Базовий", weight: results.traits.social },
      { label: "Технічні навички", value: results.traits.technical >= 60 ? "Високий" : results.traits.technical >= 40 ? "Середній" : "Базовий", weight: results.traits.technical },
      { label: "Лідерство", value: results.traits.leadership >= 60 ? "Високий" : results.traits.leadership >= 40 ? "Середній" : "Базовий", weight: results.traits.leadership },
    ];

    return (
      <AppLayout role="student">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Тест завершено
            </h1>
            <p className="text-muted-foreground">
              Ваші результати готові для аналізу
            </p>
          </div>

          <AIInsightCard
            title="Персональний висновок"
            insight={getInsightText(results.traits)}
            factors={traitFactors}
            methodology="Тест базується на методології метапрограм та оцінює 5 ключових параметрів: аналітичне мислення, креативність, соціальну взаємодію, технічні схильності та лідерські якості."
            className="mb-6"
          />

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <h3 className="font-medium text-foreground mb-4">Рекомендовані професії</h3>
            <div className="space-y-3">
              {results.professions.map((profession, index) => (
                <div key={index} className="p-4 rounded-md bg-accent/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{profession.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-medium">{profession.match}%</span>
                      <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${profession.match}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{profession.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/student">Повернутись</Link>
            </Button>
            <Button asChild>
              <Link to="/student/professions">
                Переглянути професії
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const question = questions[currentQuestion];

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Профорієнтування
          </h1>
          <p className="text-muted-foreground">
            Відповідайте інтуїтивно, немає правильних чи неправильних відповідей
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Питання {currentQuestion + 1} з {questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {Math.round(progress)}% завершено
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question indicators */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => setCurrentQuestion(index)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                answers[index]
                  ? "bg-primary text-primary-foreground"
                  : index === currentQuestion
                  ? "border-2 border-primary text-primary"
                  : "bg-accent text-muted-foreground hover:bg-accent/80"
              }`}
            >
              {answers[index] ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm">{index + 1}</span>
              )}
            </button>
          ))}
        </div>

        {/* Question */}
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <h2 className="text-lg font-medium text-foreground mb-6">
            {question.question}
          </h2>

          <RadioGroup
            value={answers[currentQuestion]}
            onValueChange={(value) => setAnswers({ ...answers, [currentQuestion]: value })}
            className="space-y-4"
          >
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                  answers[currentQuestion] === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <RadioGroupItem value={option.id} id={`${question.id}-${option.id}`} />
                <Label htmlFor={`${question.id}-${option.id}`} className="flex-1 cursor-pointer text-foreground">
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Назад
          </Button>
          <Button
            onClick={handleNext}
            disabled={!answers[currentQuestion]}
          >
            {currentQuestion === questions.length - 1 ? "Завершити" : "Далі"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Info note */}
        <div className="mt-8 rounded-lg border border-border bg-accent/30 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">
                Цей тест допоможе визначити ваші схильності та рекомендувати професійні напрямки. 
                Результати є орієнтовними та не є остаточним вердиктом.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentOrientation;
