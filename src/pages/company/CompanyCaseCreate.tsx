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
  HelpCircle,
  Building2,
  Users,
  Globe,
  Briefcase,
  Copy,
  Check,
  Code,
  Palette,
  BarChart3,
  MessageCircle,
  Wrench,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const caseTemplates = [
  {
    id: "frontend-ecommerce",
    category: "IT",
    icon: Code,
    position: "Frontend Developer",
    title: "Оптимізація E-commerce платформи",
    description: "Розробка модуля кошика з оптимізацією продуктивності та інтеграцією платіжної системи для високонавантаженого e-commerce додатку.",
    duration: "4-6 годин",
    difficulty: "Середня",
    competencies: ["React/Vue", "Оптимізація", "API інтеграція", "UX"],
    popularity: 89
  },
  {
    id: "frontend-dashboard",
    category: "IT",
    icon: Code,
    position: "Frontend Developer",
    title: "Інтерактивний дашборд аналітики",
    description: "Створення real-time дашборду з графіками, фільтрами та експортом даних для бізнес-аналітики.",
    duration: "3-4 години",
    difficulty: "Середня",
    competencies: ["Візуалізація даних", "State management", "WebSocket"],
    popularity: 76
  },
  {
    id: "backend-api",
    category: "IT",
    icon: Code,
    position: "Backend Developer",
    title: "Проектування REST API",
    description: "Розробка масштабованого API для мобільного додатку з авторизацією, кешуванням та документацією.",
    duration: "4-6 годин",
    difficulty: "Висока",
    competencies: ["API Design", "Безпека", "Документація", "Тестування"],
    popularity: 92
  },
  {
    id: "backend-microservices",
    category: "IT",
    icon: Code,
    position: "Backend Developer",
    title: "Міграція на мікросервіси",
    description: "Декомпозиція монолітного додатку на мікросервіси з урахуванням комунікації між сервісами.",
    duration: "5-7 годин",
    difficulty: "Висока",
    competencies: ["Архітектура", "Docker", "Message queues", "CI/CD"],
    popularity: 68
  },
  {
    id: "ux-redesign",
    category: "Дизайн",
    icon: Palette,
    position: "UX/UI Designer",
    title: "Редизайн мобільного додатку",
    description: "Аудит існуючого UX та створення нового дизайну для підвищення конверсії та задоволеності користувачів.",
    duration: "4-5 годин",
    difficulty: "Середня",
    competencies: ["UX аудит", "Прототипування", "User testing", "Figma"],
    popularity: 84
  },
  {
    id: "ux-design-system",
    category: "Дизайн",
    icon: Palette,
    position: "UX/UI Designer",
    title: "Створення дизайн-системи",
    description: "Розробка компонентної дизайн-системи для масштабування продукту з документацією.",
    duration: "5-6 годин",
    difficulty: "Висока",
    competencies: ["Design tokens", "Компоненти", "Документація", "Accessibility"],
    popularity: 71
  },
  {
    id: "pm-roadmap",
    category: "Менеджмент",
    icon: BarChart3,
    position: "Product Manager",
    title: "Побудова продуктового роадмапу",
    description: "Аналіз ринку, пріоритизація фіч та створення квартального роадмапу для B2B продукту.",
    duration: "3-4 години",
    difficulty: "Середня",
    competencies: ["Стратегія", "Пріоритизація", "Stakeholder management", "Метрики"],
    popularity: 88
  },
  {
    id: "pm-launch",
    category: "Менеджмент",
    icon: BarChart3,
    position: "Product Manager",
    title: "Запуск нової функції",
    description: "Планування та координація запуску нової функції з A/B тестуванням та аналізом результатів.",
    duration: "4-5 годин",
    difficulty: "Середня",
    competencies: ["Go-to-market", "A/B testing", "Аналітика", "Комунікація"],
    popularity: 79
  },
  {
    id: "marketing-campaign",
    category: "Маркетинг",
    icon: MessageCircle,
    position: "Digital Marketer",
    title: "Розробка маркетингової кампанії",
    description: "Створення комплексної digital-кампанії для запуску нового продукту з бюджетуванням та KPI.",
    duration: "3-4 години",
    difficulty: "Середня",
    competencies: ["Стратегія", "Канали", "Бюджетування", "Аналітика"],
    popularity: 73
  },
  {
    id: "analyst-report",
    category: "Аналітика",
    icon: BarChart3,
    position: "Business Analyst",
    title: "Аналіз бізнес-процесів",
    description: "Дослідження існуючих процесів, виявлення bottlenecks та розробка рекомендацій щодо оптимізації.",
    duration: "4-5 годин",
    difficulty: "Середня",
    competencies: ["Process mapping", "Data analysis", "Рекомендації", "Презентація"],
    popularity: 81
  },
];

const categories = ["Всі", "IT", "Дизайн", "Менеджмент", "Маркетинг", "Аналітика"];

const CompanyCaseCreate = () => {
  const [step, setStep] = useState(0); // 0 = вибір способу, 1-4 = кроки форми
  const [selectedCategory, setSelectedCategory] = useState("Всі");
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [caseData, setCaseData] = useState({
    title: "",
    position: "",
    description: "",
    duration: "",
    competencies: [] as string[],
    // Company data
    companyName: "",
    companyIndustry: "",
    companySize: "",
    companyDescription: "",
    companyWebsite: "",
    teamSize: "",
    projectContext: "",
  });

  const handleUseTemplate = (template: typeof caseTemplates[0]) => {
    setCaseData({
      ...caseData,
      title: template.title,
      position: template.position,
      description: template.description,
      duration: template.duration,
      competencies: template.competencies,
    });
    setCopiedTemplate(template.id);
    setTimeout(() => {
      setCopiedTemplate(null);
      setStep(1);
    }, 1000);
  };

  const filteredTemplates = selectedCategory === "Всі" 
    ? caseTemplates 
    : caseTemplates.filter(t => t.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Низька": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Середня": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Висока": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8 max-w-5xl">
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
            <p className="text-muted-foreground mt-1">
              {step === 0 ? "Оберіть спосіб створення" : `Крок ${step} з 4`}
            </p>
          </div>
        </div>

        {/* Progress */}
        {step > 0 && (
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${
                  s <= step ? "bg-primary" : "bg-border"
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 0: Choose method */}
        {step === 0 && (
          <div className="space-y-8">
            <Tabs defaultValue="templates" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="templates">
                  <FileText className="h-4 w-4 mr-2" />
                  Портфоліо готових кейсів
                </TabsTrigger>
                <TabsTrigger value="custom">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Створити власний
                </TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-foreground mb-2">Готові кейси для різних професій</h2>
                  <p className="text-muted-foreground">
                    Оберіть перевірений кейс з нашого портфоліо та адаптуйте під вашу компанію
                  </p>
                </div>

                {/* Category filter */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                {/* Templates grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map((template) => {
                    const Icon = template.icon;
                    return (
                      <div
                        key={template.id}
                        className="rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{template.position}</p>
                              <h3 className="font-medium text-foreground">{template.title}</h3>
                            </div>
                          </div>
                          <Badge variant="outline" className={getDifficultyColor(template.difficulty)}>
                            {template.difficulty}
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {template.description}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {template.competencies.slice(0, 3).map((comp) => (
                            <Badge key={comp} variant="secondary" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                          {template.competencies.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.competencies.length - 3}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {template.duration}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {template.popularity}% використовують
                            </span>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleUseTemplate(template)}
                            disabled={copiedTemplate === template.id}
                          >
                            {copiedTemplate === template.id ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Обрано
                              </>
                            ) : (
                              <>
                                <Copy className="h-4 w-4 mr-1" />
                                Використати
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-6">
                <div className="rounded-lg border border-border bg-card p-6">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground text-lg">Створити власний кейс</h3>
                      <p className="text-muted-foreground mt-1">
                        Опишіть реальну робочу ситуацію, і AI допоможе структурувати її в оцінювальний кейс
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-md bg-muted/50 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <span className="text-primary font-semibold">1</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">Дані компанії</p>
                      <p className="text-xs text-muted-foreground">Контекст для кандидатів</p>
                    </div>
                    <div className="p-4 rounded-md bg-muted/50 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <span className="text-primary font-semibold">2</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">Опис завдання</p>
                      <p className="text-xs text-muted-foreground">Реальна робоча ситуація</p>
                    </div>
                    <div className="p-4 rounded-md bg-muted/50 text-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                        <span className="text-primary font-semibold">3</span>
                      </div>
                      <p className="text-sm font-medium text-foreground">AI-структурування</p>
                      <p className="text-xs text-muted-foreground">Автоматична оптимізація</p>
                    </div>
                  </div>

                  <Button onClick={() => setStep(1)} className="w-full">
                    Розпочати створення
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Step 1: Company data */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-foreground">Інформація про компанію</h2>
            </div>
            <p className="text-muted-foreground">
              Ці дані допоможуть кандидатам краще зрозуміти контекст завдання
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Назва компанії *</Label>
                <Input
                  id="companyName"
                  placeholder="TechCorp Solutions"
                  value={caseData.companyName}
                  onChange={(e) => setCaseData({ ...caseData, companyName: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="companyIndustry">Галузь *</Label>
                <Select 
                  value={caseData.companyIndustry}
                  onValueChange={(value) => setCaseData({ ...caseData, companyIndustry: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть галузь" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">IT та технології</SelectItem>
                    <SelectItem value="fintech">Фінанси та FinTech</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="healthcare">Медицина та HealthTech</SelectItem>
                    <SelectItem value="education">Освіта та EdTech</SelectItem>
                    <SelectItem value="manufacturing">Виробництво</SelectItem>
                    <SelectItem value="consulting">Консалтинг</SelectItem>
                    <SelectItem value="other">Інше</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="companySize">Розмір компанії</Label>
                <Select
                  value={caseData.companySize}
                  onValueChange={(value) => setCaseData({ ...caseData, companySize: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть розмір" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="startup">Стартап (1-10)</SelectItem>
                    <SelectItem value="small">Мала (11-50)</SelectItem>
                    <SelectItem value="medium">Середня (51-200)</SelectItem>
                    <SelectItem value="large">Велика (201-1000)</SelectItem>
                    <SelectItem value="enterprise">Корпорація (1000+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="teamSize">Розмір команди для позиції</Label>
                <Input
                  id="teamSize"
                  placeholder="Наприклад: 5 розробників"
                  value={caseData.teamSize}
                  onChange={(e) => setCaseData({ ...caseData, teamSize: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="companyWebsite">Веб-сайт компанії</Label>
                <div className="relative mt-1.5">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyWebsite"
                    placeholder="https://example.com"
                    value={caseData.companyWebsite}
                    onChange={(e) => setCaseData({ ...caseData, companyWebsite: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="companyDescription">Короткий опис компанії</Label>
                <Textarea
                  id="companyDescription"
                  placeholder="Опишіть чим займається компанія, її продукти та цінності..."
                  rows={3}
                  value={caseData.companyDescription}
                  onChange={(e) => setCaseData({ ...caseData, companyDescription: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="projectContext">Контекст проекту</Label>
                <Textarea
                  id="projectContext"
                  placeholder="Опишіть проект або продукт, над яким працюватиме кандидат..."
                  rows={3}
                  value={caseData.projectContext}
                  onChange={(e) => setCaseData({ ...caseData, projectContext: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={() => setStep(2)}>
                Далі
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Case details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-lg font-medium text-foreground">Деталі кейсу</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Назва кейсу *</Label>
                <Input
                  id="title"
                  placeholder="Наприклад: Оптимізація E-commerce платформи"
                  value={caseData.title}
                  onChange={(e) => setCaseData({ ...caseData, title: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="position">Для якої позиції *</Label>
                <Select
                  value={caseData.position}
                  onValueChange={(value) => setCaseData({ ...caseData, position: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть позицію" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Frontend Developer">Frontend Developer</SelectItem>
                    <SelectItem value="Backend Developer">Backend Developer</SelectItem>
                    <SelectItem value="Full Stack Developer">Full Stack Developer</SelectItem>
                    <SelectItem value="Product Manager">Product Manager</SelectItem>
                    <SelectItem value="UX/UI Designer">UX/UI Designer</SelectItem>
                    <SelectItem value="Business Analyst">Business Analyst</SelectItem>
                    <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                    <SelectItem value="DevOps Engineer">DevOps Engineer</SelectItem>
                    <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="description">Опис завдання *</Label>
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
                <Label htmlFor="duration">Орієнтовна тривалість *</Label>
                <Select
                  value={caseData.duration}
                  onValueChange={(value) => setCaseData({ ...caseData, duration: value })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Оберіть тривалість" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-2 години">1-2 години</SelectItem>
                    <SelectItem value="2-3 години">2-3 години</SelectItem>
                    <SelectItem value="3-4 години">3-4 години</SelectItem>
                    <SelectItem value="4-6 годин">4-6 годин</SelectItem>
                    <SelectItem value="6-8 годин">6-8 годин</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

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

        {/* Step 3: AI structuring */}
        {step === 3 && (
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
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Назад
              </Button>
              <Button onClick={() => setStep(4)}>
                Далі
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
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
                  <p className="text-sm text-muted-foreground">
                    {caseData.position || "Frontend Developer"} • {caseData.duration || "4-6 годин"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {caseData.companyName && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      Компанія
                    </h4>
                    <p className="text-foreground">{caseData.companyName}</p>
                    {caseData.companyDescription && (
                      <p className="text-sm text-muted-foreground mt-1">{caseData.companyDescription}</p>
                    )}
                  </div>
                )}

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
                  <p className="text-foreground">4 етапи • Загальна тривалість: {caseData.duration || "4-6 годин"}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Компетенції для оцінки
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(caseData.competencies.length > 0 ? caseData.competencies : ["Аналітичне мислення", "Технічна експертиза", "Комунікація", "Проєктування рішень"]).map((comp) => (
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
              <Button variant="outline" onClick={() => setStep(3)}>
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
