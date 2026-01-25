import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { 
  ArrowLeft, 
  ArrowRight, 
  Save, 
  Sparkles, 
  FileText, 
  Clock,
  Target,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CompanyCaseCreate = () => {
  const [step, setStep] = useState(1);
  const [caseData, setCaseData] = useState({
    title: "",
    position: "",
    description: "",
    duration: "",
    competencies: [] as string[],
  });

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/company" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Створення кейсу</h1>
            <p className="text-muted-foreground mt-1">Крок {step} з 3</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${
                s <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-foreground">Базова інформація</h2>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Назва кейсу</Label>
                <Input
                  id="title"
                  placeholder="Наприклад: Оптимізація E-commerce платформи"
                  value={caseData.title}
                  onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="position">Для якої позиції</Label>
                <Select>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть позицію" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frontend">Frontend Developer</SelectItem>
                    <SelectItem value="backend">Backend Developer</SelectItem>
                    <SelectItem value="fullstack">Full Stack Developer</SelectItem>
                    <SelectItem value="pm">Product Manager</SelectItem>
                    <SelectItem value="designer">UX/UI Designer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">Опис завдання</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Опишіть контекст, задачу та очікуваний результат. AI допоможе структурувати кейс на наступному кроці.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Textarea
                  id="description"
                  placeholder="Опишіть реальну робочу ситуацію, яку має розв'язати кандидат..."
                  rows={6}
                  value={caseData.description}
                  onChange={(e) => setCaseData({ ...caseData, description: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="duration">Орієнтовна тривалість</Label>
                <Select>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть тривалість" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2">1-2 години</SelectItem>
                    <SelectItem value="2-3">2-3 години</SelectItem>
                    <SelectItem value="3-4">3-4 години</SelectItem>
                    <SelectItem value="4-6">4-6 годин</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={() => setStep(2)}>
                Далі
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">AI-підтримка структурування</h2>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Sparkles className="h-3 w-3" />
                <span>Аналітика з AI-підтримкою</span>
              </div>
            </div>

            <AIInsightCard
              title="Рекомендована структура кейсу"
              insight="На основі вашого опису, пропонуємо наступну структуру для об'єктивної оцінки компетенцій кандидата."
              methodology="AI аналізує опис завдання та порівнює з базою успішних кейсів для аналогічних позицій."
            />

            <div className="rounded-lg border border-border bg-card p-6 space-y-6">
              <div>
                <h3 className="font-medium text-foreground mb-3">Рекомендовані етапи кейсу</h3>
                <div className="space-y-3">
                  {[
                    { num: 1, title: "Аналіз вимог", time: "30 хв", desc: "Кандидат аналізує надану інформацію та ставить уточнюючі питання" },
                    { num: 2, title: "Проєктування рішення", time: "1 год", desc: "Розробка архітектури або плану реалізації" },
                    { num: 3, title: "Імплементація", time: "2 год", desc: "Практична реалізація запропонованого рішення" },
                    { num: 4, title: "Презентація результату", time: "30 хв", desc: "Пояснення підходу та обґрунтування рішень" },
                  ].map((stage) => (
                    <div key={stage.num} className="flex items-start gap-4 p-3 rounded-md bg-accent/50">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                        {stage.num}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-foreground">{stage.title}</h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {stage.time}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{stage.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-3">Компетенції для оцінки</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Аналітичне мислення",
                    "Технічна експертиза",
                    "Комунікація",
                    "Проєктування рішень",
                    "Увага до деталей",
                    "Управління часом",
                  ].map((comp) => (
                    <label
                      key={comp}
                      className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <input type="checkbox" className="rounded border-border" defaultChecked />
                      <span className="text-sm text-foreground">{comp}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Ви можете відредагувати рекомендації або прийняти їх як є. AI-пропозиції є допоміжними.
            </p>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={() => setStep(3)}>
                Далі
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-foreground">Перегляд та публікація</h2>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-2 rounded-md bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {caseData.title || "Оптимізація E-commerce платформи"}
                  </h3>
                  <p className="text-sm text-muted-foreground">Frontend Developer • 4-6 годин</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Опис
                  </h4>
                  <p className="text-foreground">
                    {caseData.description || "Розробка модуля кошика з оптимізацією продуктивності та інтеграцією платіжної системи для високонавантаженого e-commerce додатку."}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Етапи
                  </h4>
                  <p className="text-foreground">4 етапи • Загальна тривалість: 4 години</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Компетенції для оцінки
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {["Аналітичне мислення", "Технічна експертиза", "Комунікація", "Проєктування рішень"].map((comp) => (
                      <span
                        key={comp}
                        className="px-2 py-1 rounded-md bg-accent text-accent-foreground text-sm"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-accent/30 p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Готово до публікації</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Після публікації кейс стане доступним для кандидатів на обрану позицію. 
                    Ви зможете відстежувати прогрес та отримувати аналітику.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <div className="flex gap-3">
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Зберегти чернетку
                </Button>
                <Button asChild>
                  <Link to="/company">Опублікувати кейс</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CompanyCaseCreate;
