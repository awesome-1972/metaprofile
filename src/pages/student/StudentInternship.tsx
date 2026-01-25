import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Clock, Play, Pause, CheckCircle2, 
  FileText, Send, RotateCcw, Target,
  Lightbulb, ChevronRight, ArrowLeft, Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { internshipCases, getInternshipByRole, InternshipCase } from "@/data/internshipCases";

type InternshipStage = "select" | "intro" | "working" | "submitted" | "feedback";

const generateFeedback = (caseData: InternshipCase) => ({
  overallScore: Math.floor(Math.random() * 20) + 70,
  strengths: [
    "Добре структурований аналіз",
    "Чітке формулювання проблеми",
    "Логічний зв'язок між спостереженнями"
  ],
  improvements: [
    "Додати кількісні прогнози для рекомендацій",
    "Враховувати ресурсні обмеження при пріоритизації",
    "Більше уваги до причинно-наслідкових зв'язків"
  ],
  competencyScores: caseData.competencies.map(comp => ({
    name: comp,
    score: Math.floor(Math.random() * 25) + 65,
    benchmark: Math.floor(Math.random() * 15) + 60
  }))
});

const StudentInternship = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  
  const [stage, setStage] = useState<InternshipStage>(roleParam ? "intro" : "select");
  const [selectedCase, setSelectedCase] = useState<InternshipCase | null>(
    roleParam ? getInternshipByRole(roleParam) || null : null
  );
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [feedbackData, setFeedbackData] = useState<ReturnType<typeof generateFeedback> | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (selectedCase) {
      setTimeLeft(selectedCase.duration * 60);
    }
  }, [selectedCase]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stage === "working" && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage, isPaused, timeLeft]);

  const selectCase = (internship: InternshipCase) => {
    setSelectedCase(internship);
    setTimeLeft(internship.duration * 60);
    setStage("intro");
  };

  const startCase = () => {
    setStage("working");
  };

  const submitAnswer = () => {
    setStage("submitted");
    setTimeout(() => {
      if (selectedCase) {
        setFeedbackData(generateFeedback(selectedCase));
      }
      setStage("feedback");
    }, 2000);
  };

  const showNextHint = () => {
    setShowHint(true);
    if (selectedCase && currentHint < selectedCase.hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  const restartCase = () => {
    setStage("intro");
    if (selectedCase) {
      setTimeLeft(selectedCase.duration * 60);
    }
    setAnswer("");
    setShowHint(false);
    setCurrentHint(0);
    setFeedbackData(null);
  };

  const goToSelect = () => {
    setStage("select");
    setSelectedCase(null);
    setAnswer("");
    setShowHint(false);
    setCurrentHint(0);
    setFeedbackData(null);
  };

  const progress = selectedCase 
    ? ((selectedCase.duration * 60 - timeLeft) / (selectedCase.duration * 60)) * 100 
    : 0;
  const isTimeWarning = timeLeft < 300;

  // Group cases by area
  const casesByArea = internshipCases.reduce((acc, internship) => {
    if (!acc[internship.area]) {
      acc[internship.area] = [];
    }
    acc[internship.area].push(internship);
    return acc;
  }, {} as Record<string, InternshipCase[]>);

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={goToSelect} className="hover:text-foreground transition-colors">
            Міні-стажування
          </button>
          {selectedCase && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedCase.role}</span>
            </>
          )}
        </div>

        {stage === "select" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Міні-стажування</h1>
              <p className="text-muted-foreground">
                Оберіть професію та виконайте реальний кейс, щоб відчути роботу на практиці
              </p>
            </div>

            {Object.entries(casesByArea).map(([area, cases]) => (
              <div key={area}>
                <h2 className="text-lg font-medium text-foreground mb-4">{area}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cases.map((internship) => (
                    <button
                      key={internship.id}
                      onClick={() => selectCase(internship)}
                      className="rounded-lg border border-border bg-card p-5 text-left hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {internship.role}
                          </h3>
                          <p className="text-sm text-muted-foreground">{internship.company}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {internship.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{internship.duration} хв</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {internship.competencies.length} компетенцій
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {stage === "intro" && selectedCase && (
          <div className="max-w-3xl mx-auto">
            <Button variant="ghost" size="sm" onClick={goToSelect} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад до вибору
            </Button>

            <div className="rounded-lg border border-border bg-card p-8 mb-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{selectedCase.title}</h1>
                  <p className="text-muted-foreground mt-1">
                    Роль: {selectedCase.role} • Компанія: {selectedCase.company}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Опис завдання</h3>
                  <p className="text-muted-foreground">{selectedCase.description}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Контекст</h3>
                  <p className="text-muted-foreground">{selectedCase.context}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Ваші завдання</h3>
                  <ul className="space-y-2">
                    {selectedCase.tasks.map((task, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                          {index + 1}
                        </span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Компетенції, що оцінюються</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.competencies.map((comp) => (
                      <Badge key={comp} variant="secondary">{comp}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Час на виконання: {selectedCase.duration} хвилин</p>
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
              insight={`Цей кейс допоможе оцінити ваші здібності для ролі "${selectedCase.role}". Результати будуть використані для уточнення вашого професійного профілю.`}
              factors={selectedCase.competencies.slice(0, 3).map((comp, i) => ({
                label: comp,
                value: i === 0 ? "Ключова" : "Важлива",
                weight: 90 - i * 10
              }))}
              methodology="Кейс розроблено на основі реальних бізнес-ситуацій та адаптовано для оцінки ключових компетенцій."
            />
          </div>
        )}

        {stage === "working" && selectedCase && (
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
                <h2 className="text-lg font-medium text-foreground mb-4">{selectedCase.title}</h2>
                
                {/* Data Table */}
                {selectedCase.data && (
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
                          {selectedCase.data.map((row, index) => (
                            <tr key={index} className="border-b border-border">
                              <td className="py-2 px-3 text-foreground">{row.metric}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{row.q1}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{row.q2}</td>
                              <td className={`py-2 px-3 text-right font-medium ${
                                row.change.startsWith('+') ? "text-green-600" : 
                                row.change.startsWith('-') ? "text-destructive" : "text-muted-foreground"
                              }`}>
                                {row.change}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Context reminder */}
                <div className="mb-6 p-4 rounded-md bg-muted/50">
                  <h3 className="text-sm font-medium text-foreground mb-2">Контекст</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.context}</p>
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
                  {selectedCase.tasks.map((task, index) => (
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
                  <Badge variant="outline">{currentHint + 1}/{selectedCase.hints.length}</Badge>
                </div>
                {showHint ? (
                  <div className="space-y-3">
                    {selectedCase.hints.slice(0, currentHint + 1).map((hint, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                        <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                        <p className="text-sm text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                    {currentHint < selectedCase.hints.length - 1 && (
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

        {stage === "feedback" && selectedCase && feedbackData && (
          <div className="max-w-4xl mx-auto">
            <div className="rounded-lg border border-border bg-card p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-foreground">Міні-стажування завершено</h1>
                    <p className="text-muted-foreground">{selectedCase.title}</p>
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
                    <p className="text-sm text-muted-foreground mb-1 truncate">{comp.name}</p>
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-bold text-foreground">{comp.score}</span>
                      <span className="text-xs text-muted-foreground mb-1">
                        середнє: {comp.benchmark}
                      </span>
                    </div>
                    <Progress value={comp.score} className="h-1.5 mt-2" />
                  </div>
                ))}
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-md bg-accent/50 border border-accent">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
                    Сильні сторони
                  </h3>
                  <ul className="space-y-2">
                    {feedbackData.strengths.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent-foreground">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-md bg-primary/5 border border-primary/20">
                  <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Зони росту
                  </h3>
                  <ul className="space-y-2">
                    {feedbackData.improvements.map((item, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button onClick={restartCase} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Спробувати ще раз
                </Button>
                <Button onClick={goToSelect} variant="outline">
                  Обрати інше стажування
                </Button>
                <Button asChild>
                  <Link to="/student/professions">
                    Повернутися до професій
                  </Link>
                </Button>
              </div>
            </div>

            <AIInsightCard
              title="Персональна рекомендація"
              insight={`Ваш результат ${feedbackData.overallScore}% показує хороший потенціал для ролі "${selectedCase.role}". Рекомендуємо продовжити розвиток у цьому напрямку та пройти додаткові стажування для закріплення навичок.`}
              factors={feedbackData.competencyScores.slice(0, 3).map(comp => ({
                label: comp.name,
                value: comp.score >= 80 ? "Сильно" : comp.score >= 70 ? "Добре" : "Потенціал",
                weight: comp.score
              }))}
              methodology="Оцінка базується на аналізі вашої відповіді та порівнянні з еталонними рішеннями від практикуючих спеціалістів."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentInternship;
