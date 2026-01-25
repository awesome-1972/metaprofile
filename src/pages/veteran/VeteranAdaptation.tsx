import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { 
  BookOpen, CheckCircle2, Clock, Play, Lock, 
  Trophy, Target, ArrowRight, FileText, Video, 
  Users, MessageSquare, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const learningModules = [
  {
    id: 1,
    title: "Основи цивільної комунікації",
    description: "Перехід від військової до корпоративної комунікації",
    duration: "2 години",
    status: "completed",
    progress: 100,
    lessons: [
      { title: "Відмінності у стилях комунікації", type: "video", duration: "15 хв", completed: true },
      { title: "Корпоративна субординація", type: "text", duration: "10 хв", completed: true },
      { title: "Ефективні наради та презентації", type: "video", duration: "20 хв", completed: true },
      { title: "Практика: симуляція наради", type: "practice", duration: "30 хв", completed: true },
      { title: "Тест модуля", type: "quiz", duration: "15 хв", completed: true },
    ]
  },
  {
    id: 2,
    title: "Управління проектами для ветеранів",
    description: "Застосування військового досвіду планування в бізнесі",
    duration: "3 години",
    status: "in_progress",
    progress: 60,
    lessons: [
      { title: "Військове планування vs Agile", type: "video", duration: "20 хв", completed: true },
      { title: "Інструменти проектного менеджменту", type: "text", duration: "15 хв", completed: true },
      { title: "Практика: створення плану проекту", type: "practice", duration: "45 хв", completed: true },
      { title: "Робота з командою та делегування", type: "video", duration: "25 хв", completed: false },
      { title: "Управління ризиками", type: "text", duration: "20 хв", completed: false },
      { title: "Фінальний кейс", type: "case", duration: "60 хв", completed: false },
    ]
  },
  {
    id: 3,
    title: "Технічні навички для IT",
    description: "Базові технічні компетенції для входу в IT-сферу",
    duration: "5 годин",
    status: "locked",
    progress: 0,
    lessons: [
      { title: "Основи роботи з даними", type: "video", duration: "30 хв", completed: false },
      { title: "Базове програмування", type: "text", duration: "45 хв", completed: false },
      { title: "Робота з Excel та таблицями", type: "practice", duration: "60 хв", completed: false },
      { title: "Основи SQL", type: "video", duration: "40 хв", completed: false },
      { title: "Практичний проект", type: "case", duration: "90 хв", completed: false },
    ]
  },
  {
    id: 4,
    title: "Лідерство у цивільному середовищі",
    description: "Адаптація військового лідерства до корпоративної культури",
    duration: "4 години",
    status: "locked",
    progress: 0,
    lessons: [
      { title: "Стилі лідерства", type: "video", duration: "25 хв", completed: false },
      { title: "Мотивація без наказів", type: "text", duration: "20 хв", completed: false },
      { title: "Конфлікт-менеджмент", type: "video", duration: "30 хв", completed: false },
      { title: "Практика: рольова гра", type: "practice", duration: "45 хв", completed: false },
    ]
  },
  {
    id: 5,
    title: "Підготовка до працевлаштування",
    description: "Резюме, співбесіди та пошук роботи",
    duration: "3 години",
    status: "locked",
    progress: 0,
    lessons: [
      { title: "Створення цивільного резюме", type: "text", duration: "30 хв", completed: false },
      { title: "Підготовка до співбесіди", type: "video", duration: "25 хв", completed: false },
      { title: "Симуляція співбесіди", type: "practice", duration: "45 хв", completed: false },
      { title: "Нетворкінг та LinkedIn", type: "text", duration: "20 хв", completed: false },
    ]
  },
];

const getLessonIcon = (type: string) => {
  switch (type) {
    case "video": return Video;
    case "text": return FileText;
    case "practice": return Users;
    case "quiz": return Target;
    case "case": return MessageSquare;
    default: return BookOpen;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "in_progress": return "bg-primary/10 text-primary border-primary/20";
    case "locked": return "bg-muted text-muted-foreground border-border";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "completed": return "Завершено";
    case "in_progress": return "В процесі";
    case "locked": return "Заблоковано";
    default: return status;
  }
};

const VeteranAdaptation = () => {
  const [expandedModule, setExpandedModule] = useState<number | null>(2);

  const totalProgress = Math.round(
    learningModules.reduce((acc, m) => acc + m.progress, 0) / learningModules.length
  );

  const completedModules = learningModules.filter(m => m.status === "completed").length;

  return (
    <AppLayout role="veteran">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Адаптаційний трек</h1>
            <p className="text-muted-foreground mt-1">Персоналізована програма переходу до цивільної кар'єри</p>
          </div>
          <Button>
            Продовжити навчання
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Overall Progress */}
        <div className="rounded-lg border border-border bg-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Загальний прогрес</h2>
              <p className="text-sm text-muted-foreground">
                Завершено {completedModules} з {learningModules.length} модулів
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-3xl font-bold text-primary">{totalProgress}%</span>
                <p className="text-xs text-muted-foreground">завершено</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <Progress value={totalProgress} className="h-3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {learningModules.map((module, index) => (
              <div 
                key={module.id}
                className={`p-2 rounded-md text-center ${
                  module.status === "completed" 
                    ? "bg-green-500/10" 
                    : module.status === "in_progress"
                      ? "bg-primary/10"
                      : "bg-muted/50"
                }`}
              >
                <p className="text-xs font-medium text-foreground truncate">Модуль {index + 1}</p>
                <p className="text-xs text-muted-foreground">{module.progress}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Modules List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-medium text-foreground">Навчальні модулі</h2>
            
            <div className="space-y-3">
              {learningModules.map((module) => (
                <Collapsible 
                  key={module.id}
                  open={expandedModule === module.id}
                  onOpenChange={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                >
                  <div className={`rounded-lg border bg-card overflow-hidden ${
                    module.status === "in_progress" ? "border-primary/50" : "border-border"
                  }`}>
                    <CollapsibleTrigger asChild>
                      <button className="w-full p-4 text-left hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-lg ${
                              module.status === "completed" 
                                ? "bg-green-500/10" 
                                : module.status === "in_progress"
                                  ? "bg-primary/10"
                                  : "bg-muted"
                            }`}>
                              {module.status === "completed" ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : module.status === "locked" ? (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <Play className="h-5 w-5 text-primary" />
                              )}
                            </div>
                            <div>
                              <h3 className="font-medium text-foreground">{module.title}</h3>
                              <p className="text-sm text-muted-foreground">{module.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {module.duration}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <BookOpen className="h-3 w-3" />
                                  {module.lessons.length} уроків
                                </div>
                                <Badge variant="outline" className={getStatusColor(module.status)}>
                                  {getStatusLabel(module.status)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {module.status !== "locked" && (
                              <div className="text-right">
                                <span className="text-lg font-semibold text-primary">{module.progress}%</span>
                              </div>
                            )}
                            {expandedModule === module.id ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        {module.status !== "locked" && (
                          <Progress value={module.progress} className="h-1.5 mt-3" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="border-t border-border p-4 bg-muted/30">
                        <div className="space-y-2">
                          {module.lessons.map((lesson, index) => {
                            const LessonIcon = getLessonIcon(lesson.type);
                            return (
                              <div 
                                key={index}
                                className={`flex items-center justify-between p-3 rounded-md ${
                                  lesson.completed 
                                    ? "bg-green-500/5" 
                                    : module.status === "locked"
                                      ? "bg-muted/50 opacity-50"
                                      : "bg-background hover:bg-muted/50 cursor-pointer"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`p-1.5 rounded ${
                                    lesson.completed ? "bg-green-500/10" : "bg-muted"
                                  }`}>
                                    {lesson.completed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <LessonIcon className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div>
                                    <p className={`text-sm ${lesson.completed ? "text-muted-foreground" : "text-foreground"}`}>
                                      {lesson.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{lesson.duration}</p>
                                  </div>
                                </div>
                                {!lesson.completed && module.status !== "locked" && (
                                  <Button variant="ghost" size="sm">
                                    Розпочати
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {module.status === "in_progress" && (
                          <Button className="w-full mt-4">
                            Продовжити модуль
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <AIInsightCard
              title="Персональні рекомендації"
              insight="На основі вашого військового досвіду рекомендуємо зосередитися на модулі управління проектами. Ваші навички планування операцій добре переносяться на цивільний проектний менеджмент."
              factors={[
                { label: "Лідерські навички", value: "Високі", weight: 94 },
                { label: "Планування", value: "Відмінне", weight: 88 },
                { label: "Стресостійкість", value: "Висока", weight: 92 },
              ]}
              methodology="Рекомендації базуються на аналізі вашого військового досвіду та результатах оцінки переносимих компетенцій."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Досягнення</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-md bg-green-500/10">
                  <Trophy className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Перший модуль</p>
                    <p className="text-xs text-muted-foreground">Завершено успішно</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">На шляху</p>
                    <p className="text-xs text-muted-foreground">3 дні поспіль</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Експерт</p>
                    <p className="text-xs text-muted-foreground">Завершіть 3 модулі</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Ваш ментор</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Олександр К.</p>
                  <p className="text-sm text-muted-foreground">Ветеран, Project Manager</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Пройшов адаптацію 2 роки тому. Готовий допомогти з питаннями.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                <MessageSquare className="h-4 w-4 mr-2" />
                Написати ментору
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default VeteranAdaptation;
