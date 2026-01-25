import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback } from "react";
import { 
  Clock, Play, Pause, CheckCircle2, AlertCircle, 
  FileText, Send, ArrowRight, RotateCcw, Target,
  Lightbulb, TrendingUp, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AIInsightCard } from "@/components/ui/AIInsightCard";

type InternshipStage = "intro" | "working" | "submitted" | "feedback";

const caseData = {
  title: "Аналіз даних продажів",
  role: "Data Analyst",
  company: "TechCorp Solutions",
  duration: 30, // minutes
  description: "Ви отримали дані про продажі за останній квартал. Ваше завдання — проаналізувати тренди, виявити проблемні зони та надати рекомендації керівництву.",
  context: "Компанія TechCorp Solutions займається продажем SaaS-продуктів для бізнесу. За останній квартал спостерігається зниження конверсії на 15%, але загальний дохід виріс на 8%. Керівництво хоче зрозуміти причини та отримати план дій.",
  tasks: [
    "Проаналізуйте наведені дані та виявіть ключові тренди",
    "Визначте можливі причини зниження конверсії",
    "Запропонуйте 3-5 конкретних рекомендацій для покращення показників",
    "Обґрунтуйте пріоритетність ваших рекомендацій"
  ],
  data: [
    { metric: "Загальний дохід", q1: "€850,000", q2: "€920,000", change: "+8.2%" },
    { metric: "Кількість лідів", q1: "2,450", q2: "2,890", change: "+18%" },
    { metric: "Конверсія", q1: "12.5%", q2: "10.6%", change: "-15.2%" },
    { metric: "Середній чек", q1: "€2,800", q2: "€3,100", change: "+10.7%" },
    { metric: "Відтік клієнтів", q1: "4.2%", q2: "5.8%", change: "+38%" },
  ],
  hints: [
    "Зверніть увагу на співвідношення між ростом лідів та падінням конверсії",
    "Проаналізуйте, як ріст середнього чеку може впливати на конверсію",
    "Враховуйте, що високий відтік може сигналізувати про проблеми з продуктом або сервісом"
  ]
};

const feedbackData = {
  overallScore: 78,
  strengths: [
    "Добре структурований аналіз даних",
    "Чітке формулювання проблеми",
    "Логічний зв'язок між спостереженнями"
  ],
  improvements: [
    "Додати кількісні прогнози для рекомендацій",
    "Враховувати ресурсні обмеження при пріоритизації",
    "Більше уваги до причинно-наслідкових зв'язків"
  ],
  competencyScores: [
    { name: "Аналітичне мислення", score: 82, benchmark: 75 },
    { name: "Структурування інформації", score: 78, benchmark: 70 },
    { name: "Бізнес-орієнтованість", score: 74, benchmark: 72 },
    { name: "Комунікація рішень", score: 76, benchmark: 68 },
  ]
};

const StudentInternship = () => {
  const [stage, setStage] = useState<InternshipStage>("intro");
  const [timeLeft, setTimeLeft] = useState(caseData.duration * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "working" && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage, isPaused, timeLeft]);

  const startCase = () => {
    setStage("working");
  };

  const submitAnswer = () => {
    setStage("submitted");
    setTimeout(() => {
      setStage("feedback");
    }, 2000);
  };

  const showNextHint = () => {
    setShowHint(true);
    if (currentHint < caseData.hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  const restartCase = () => {
    setStage("intro");
    setTimeLeft(caseData.duration * 60);
    setAnswer("");
    setShowHint(false);
    setCurrentHint(0);
  };

  const progress = ((caseData.duration * 60 - timeLeft) / (caseData.duration * 60)) * 100;
  const isTimeWarning = timeLeft < 300; // less than 5 minutes

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <span>Міні-стажування</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{caseData.role}</span>
        </div>

        {stage === "intro" && (
          <div className="max-w-3xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-8 mb-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{caseData.title}</h1>
                  <p className="text-muted-foreground mt-1">
                    Роль: {caseData.role} • Компанія: {caseData.company}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Опис завдання</h3>
                  <p className="text-muted-foreground">{caseData.description}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Контекст</h3>
                  <p className="text-muted-foreground">{caseData.context}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Ваші завдання</h3>
                  <ul className="space-y-2">
                    {caseData.tasks.map((task, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                          {index + 1}
                        </span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Час на виконання: {caseData.duration} хвилин</p>
                    <p className="text-sm text-muted-foreground">Таймер почнеться після натискання кнопки "Розпочати"</p>
                  </div>
                </div>
              </div>

              <Button onClick={startCase} className="w-full mt-6" size="lg">
                <Play className="h-5 w-5 mr-2" />
                Розпочати міні-стажування
              </Button>
            </div>

            <AIInsightCard
              title="Підготовка до кейсу"
              insight="Цей кейс допоможе оцінити ваші аналітичні здібності та вміння формулювати бізнес-рекомендації. Результати будуть використані для уточнення вашого професійного профілю."
              factors={[
                { label: "Складність", value: "Середня", weight: 65 },
                { label: "Тип мислення", value: "Аналітичне", weight: 80 },
                { label: "Навички", value: "Бізнес-аналіз", weight: 75 },
              ]}
              methodology="Кейс розроблено на основі реальних бізнес-ситуацій та адаптовано для оцінки ключових компетенцій аналітика."
            />
          </div>
        )}

        {stage === "working" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Timer Bar */}
              <div className={`rounded-lg border p-4 ${isTimeWarning ? "border-destructive bg-destructive/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${isTimeWarning ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className={`text-lg font-mono font-semibold ${isTimeWarning ? "text-destructive" : "text-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? "Продовжити" : "Пауза"}
                    </Button>
                  </div>
                </div>
                <Progress value={progress} className={`h-2 ${isTimeWarning ? "[&>div]:bg-destructive" : ""}`} />
              </div>

              {/* Case Content */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">{caseData.title}</h2>
                
                {/* Data Table */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-foreground mb-3">Дані для аналізу</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 font-medium text-muted-foreground">Метрика</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Q1</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Q2</th>
                          <th className="text-right py-2 px-3 font-medium text-muted-foreground">Зміна</th>
                        </tr>
                      </thead>
                      <tbody>
                        {caseData.data.map((row, index) => (
                          <tr key={index} className="border-b border-border">
                            <td className="py-2 px-3 text-foreground">{row.metric}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{row.q1}</td>
                            <td className="py-2 px-3 text-right text-muted-foreground">{row.q2}</td>
                            <td className={`py-2 px-3 text-right font-medium ${
                              row.change.startsWith('+') && row.metric !== "Відтік клієнтів" 
                                ? "text-green-600" 
                                : row.change.startsWith('-') && row.metric !== "Конверсія"
                                  ? "text-green-600"
                                  : "text-destructive"
                            }`}>
                              {row.change}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Answer Area */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Ваша відповідь</h3>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Напишіть ваш аналіз та рекомендації тут..."
                    className="min-h-[250px] resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">
                      {answer.length} символів
                    </p>
                    <Button onClick={submitAnswer} disabled={answer.length < 100}>
                      <Send className="h-4 w-4 mr-2" />
                      Надіслати відповідь
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-3">Завдання</h3>
                <ul className="space-y-2">
                  {caseData.tasks.map((task, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                        {index + 1}
                      </span>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Підказки</h3>
                  <Badge variant="outline">{currentHint + 1}/{caseData.hints.length}</Badge>
                </div>
                {showHint ? (
                  <div className="space-y-3">
                    {caseData.hints.slice(0, currentHint + 1).map((hint, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                        <p className="text-sm text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                    {currentHint < caseData.hints.length - 1 && (
                      <Button variant="ghost" size="sm" onClick={showNextHint} className="w-full">
                        Наступна підказка
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={showNextHint} className="w-full">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Показати підказку
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {stage === "submitted" && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 animate-pulse">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Аналізуємо вашу відповідь</h2>
            <p className="text-muted-foreground mb-4">Це займе кілька секунд...</p>
            <Progress value={66} className="h-2" />
          </div>
        )}

        {stage === "feedback" && (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Міні-стажування завершено</h1>
                    <p className="text-muted-foreground">{caseData.title}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-primary">{feedbackData.overallScore}%</div>
                  <p className="text-sm text-muted-foreground">загальний бал</p>
                </div>
              </div>

              {/* Competency Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {feedbackData.competencyScores.map((comp, index) => (
                  <div key={index} className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-2">{comp.name}</p>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-foreground">{comp.score}</span>
                      <span className={`text-sm ${comp.score >= comp.benchmark ? "text-green-600" : "text-destructive"}`}>
                        {comp.score >= comp.benchmark ? "↑" : "↓"} {Math.abs(comp.score - comp.benchmark)} vs норма
                      </span>
                    </div>
                    <Progress value={comp.score} className="h-1.5 mt-2" />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Сильні сторони
                  </h3>
                  <ul className="space-y-2">
                    {feedbackData.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-green-600 mt-1">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Зони для розвитку
                  </h3>
                  <ul className="space-y-2">
                    {feedbackData.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-1">•</span>
                        {improvement}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AIInsightCard
                  title="Детальний аналіз відповіді"
                  insight="Ваша відповідь демонструє хороше розуміння бізнес-контексту та вміння працювати з даними. Рекомендуємо розвивати навички кількісного прогнозування та аргументації рішень."
                  factors={[
                    { label: "Структура аналізу", value: "Добре", weight: 78 },
                    { label: "Глибина інсайтів", value: "Середнє", weight: 72 },
                    { label: "Практичність рекомендацій", value: "Добре", weight: 76 },
                    { label: "Обґрунтування", value: "Потребує уваги", weight: 68 },
                  ]}
                  methodology="Оцінка проводиться за стандартизованою методологією аналізу бізнес-кейсів з урахуванням рівня підготовки студента."
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="font-medium text-foreground mb-3">Наступні кроки</h3>
                  <div className="space-y-3">
                    <Button variant="default" className="w-full justify-start">
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Спробувати інший кейс
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      Переглянути навчальні матеріали
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={restartCase}>
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Пройти цей кейс знову
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="font-medium text-foreground mb-2">Ваш профіль оновлено</h3>
                  <p className="text-sm text-muted-foreground">
                    Результати цього міні-стажування додані до вашого професійного профілю та враховані у рекомендаціях.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentInternship;
