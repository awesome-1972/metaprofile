import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { 
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const questions = [
  {
    id: 1,
    question: "Що більше вас мотивує у роботі?",
    options: [
      { id: "a", text: "Досягнення конкретних результатів та цілей" },
      { id: "b", text: "Уникнення помилок та мінімізація ризиків" },
    ],
  },
  {
    id: 2,
    question: "Як ви приймаєте важливі рішення?",
    options: [
      { id: "a", text: "Спираюсь на власний досвід та інтуїцію" },
      { id: "b", text: "Шукаю поради експертів та авторитетних джерел" },
    ],
  },
  {
    id: 3,
    question: "Що для вас важливіше при виконанні завдання?",
    options: [
      { id: "a", text: "Бачити загальну картину та стратегічні цілі" },
      { id: "b", text: "Розуміти деталі та конкретні кроки виконання" },
    ],
  },
];

const StudentOrientation = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const progress = ((currentQuestion + (answers[currentQuestion] ? 1 : 0)) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsCompleted(true);
    }
  };

  if (isCompleted) {
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
            title="Попередній аналіз"
            insight="На основі ваших відповідей, ви демонструєте схильність до аналітичного мислення та роботи з деталями. Рекомендуємо розглянути технічні та дослідницькі напрямки."
            factors={[
              { label: "Мотивація до цілі", value: "Високий", weight: 85 },
              { label: "Внутрішня референція", value: "Середній", weight: 65 },
              { label: "Фокус на деталях", value: "Високий", weight: 90 },
            ]}
            methodology="Тест базується на методології метапрограм NLP та адаптований для професійної орієнтації."
            className="mb-6"
          />

          <div className="rounded-lg border border-border bg-card p-6 mb-6">
            <h3 className="font-medium text-foreground mb-4">Рекомендовані напрямки</h3>
            <div className="space-y-3">
              {[
                { name: "Інформаційні технології", match: 92 },
                { name: "Дизайн та UX", match: 78 },
                { name: "Аналітика даних", match: 85 },
              ].map((dir, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-md bg-accent/50">
                  <span className="font-medium text-foreground">{dir.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-medium">{dir.match}%</span>
                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${dir.match}%` }}
                      />
                    </div>
                  </div>
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
            Тест професійної орієнтації
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
        <div className="flex gap-2 mb-8">
          {questions.map((q, index) => (
            <div
              key={q.id}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                answers[index]
                  ? "bg-primary text-primary-foreground"
                  : index === currentQuestion
                  ? "border-2 border-primary text-primary"
                  : "bg-accent text-muted-foreground"
              }`}
            >
              {answers[index] ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm">{index + 1}</span>
              )}
            </div>
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
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer text-foreground">
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
