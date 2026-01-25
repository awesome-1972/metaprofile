import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2,
  FileText,
  Send,
  HelpCircle,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const caseSteps = [
  { id: 1, title: "Аналіз вимог", duration: "30 хв", status: "completed" },
  { id: 2, title: "Проєктування рішення", duration: "1 год", status: "current" },
  { id: 3, title: "Імплементація", duration: "2 год", status: "pending" },
  { id: 4, title: "Презентація", duration: "30 хв", status: "pending" },
];

const ProfessionalCaseWork = () => {
  const [response, setResponse] = useState("");

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link 
            to="/professional" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">
                Оптимізація бази даних
              </h1>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                В процесі
              </span>
            </div>
            <p className="text-muted-foreground mt-1">TechCorp Ukraine</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground font-medium">02:34:15</span>
            <span className="text-sm text-muted-foreground">залишилось</span>
          </div>
        </div>

        {/* AI Detection Warning */}
        <Alert className="mb-6 border-chart-4/50 bg-chart-4/10">
          <ShieldAlert className="h-4 w-4 text-chart-4" />
          <AlertTitle className="text-chart-5">
            Перевірка автентичності рішень
          </AlertTitle>
          <AlertDescription className="text-chart-4">
            Усі відповіді перевіряються на рівень втручання штучного інтелекту. 
            Високий рівень AI-генерації може призвести до зниження оцінки або дискваліфікації. 
            Використовуйте AI як допоміжний інструмент, але відповідь має бути вашою власною.
          </AlertDescription>
        </Alert>

        {/* Progress */}
        <div className="rounded-lg border border-border bg-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Прогрес виконання</span>
            <span className="text-sm text-muted-foreground">Етап 2 з 4</span>
          </div>
          <Progress value={37.5} className="h-2 mb-4" />
          <div className="flex gap-2">
            {caseSteps.map((step) => (
              <div
                key={step.id}
                className={`flex-1 p-3 rounded-md ${
                  step.status === "completed"
                    ? "bg-primary/10"
                    : step.status === "current"
                    ? "bg-accent border border-primary"
                    : "bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      step.status === "current" ? "border-primary" : "border-muted-foreground"
                    }`} />
                  )}
                  <span className={`text-sm font-medium ${
                    step.status === "pending" ? "text-muted-foreground" : "text-foreground"
                  }`}>
                    {step.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground ml-6">{step.duration}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current task */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-md bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-lg">
                    Етап 2: Проєктування рішення
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Розробіть архітектуру оптимізації на основі проведеного аналізу
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-md bg-accent/50 mb-6">
                <h3 className="font-medium text-foreground mb-2">Завдання</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  На основі аналізу вимог, запропонуйте архітектуру оптимізації запитів PostgreSQL. 
                  Опишіть:
                </p>
                <ul className="space-y-2 text-sm text-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">1.</span>
                    Які індекси варто додати та чому
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">2.</span>
                    Як реструктурувати проблемні запити
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">3.</span>
                    Стратегію кешування для часто використовуваних даних
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">4.</span>
                    Потенційні ризики та як їх мінімізувати
                  </li>
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Ваша відповідь
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-xs text-muted-foreground">
                        <HelpCircle className="h-3 w-3" />
                        Підказки
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Опишіть свій підхід структуровано. Оцінюється не лише результат, а й процес мислення.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  placeholder="Опишіть вашу архітектуру рішення..."
                  rows={12}
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  className="mb-4"
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    {response.length} символів
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline">Зберегти чернетку</Button>
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      Надіслати відповідь
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Previous step summary */}
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">
                  Етап 1: Аналіз вимог (завершено)
                </h3>
              </div>
              <div className="p-4 rounded-md bg-accent/50">
                <p className="text-sm text-muted-foreground">
                  Ви ідентифікували 3 основні проблемні запити та проаналізували структуру даних. 
                  Ваші уточнюючі питання були релевантними та допомогли зрозуміти контекст.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Контекст завдання</h2>
            
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Вхідні дані</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Схема бази даних (PDF)
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Логи повільних запитів
                </li>
                <li className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Метрики продуктивності
                </li>
              </ul>
            </div>

            <AIInsightCard
              title="Підтримка виконання"
              insight="Цей етап оцінює вашу здатність проєктувати системні рішення. Зосередьтесь на обґрунтуванні кожного рішення."
              methodology="Ми не оцінюємо 'правильність' — оцінюємо логіку мислення та здатність пояснити свій підхід."
            />

            <div className="rounded-lg border border-border bg-accent/30 p-4">
              <h3 className="font-medium text-foreground mb-2">Оцінювані компетенції</h3>
              <ul className="space-y-2">
                {[
                  "Технічна експертиза",
                  "Системне мислення",
                  "Комунікація рішень",
                  "Управління ризиками",
                ].map((comp, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {comp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalCaseWork;
