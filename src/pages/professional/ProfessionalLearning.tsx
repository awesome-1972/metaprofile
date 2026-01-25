import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { 
  BookOpen, 
  Clock, 
  Star,
  Play,
  CheckCircle2,
  Target,
  TrendingUp,
  Search,
  Filter,
  Sparkles,
  Award,
  BarChart3,
  Zap,
  Users,
  Calendar,
  ArrowRight,
  Pause,
  RotateCcw
} from "lucide-react";
import { useState } from "react";

interface Course {
  id: string;
  title: string;
  provider: string;
  description: string;
  duration: string;
  level: "beginner" | "intermediate" | "advanced";
  competencies: string[];
  rating: number;
  students: number;
  modules: number;
  isRecommended?: boolean;
  recommendationReason?: string;
  progress?: number;
  status?: "not_started" | "in_progress" | "completed";
  completedModules?: number;
  lastAccessed?: string;
  certificateUrl?: string;
}

interface WeakCompetency {
  name: string;
  currentLevel: number;
  targetLevel: number;
  gap: number;
  relatedCourses: number;
}

const weakCompetencies: WeakCompetency[] = [
  { name: "Системний дизайн", currentLevel: 62, targetLevel: 85, gap: 23, relatedCourses: 4 },
  { name: "Тестування", currentLevel: 68, targetLevel: 80, gap: 12, relatedCourses: 3 },
  { name: "DevOps", currentLevel: 55, targetLevel: 75, gap: 20, relatedCourses: 5 },
  { name: "Soft Skills", currentLevel: 70, targetLevel: 85, gap: 15, relatedCourses: 2 },
];

const allCourses: Course[] = [
  // Recommended courses
  {
    id: "1",
    title: "System Design Fundamentals",
    provider: "Coursera",
    description: "Основи проєктування масштабованих систем: від монолітів до мікросервісів.",
    duration: "12 годин",
    level: "intermediate",
    competencies: ["Системний дизайн", "Архітектура", "Масштабування"],
    rating: 4.8,
    students: 15420,
    modules: 8,
    isRecommended: true,
    recommendationReason: "Покращить ваш найслабший показник — Системний дизайн",
    progress: 75,
    status: "in_progress",
    completedModules: 6,
    lastAccessed: "2025-01-24"
  },
  {
    id: "2",
    title: "Advanced Testing Strategies",
    provider: "Udemy",
    description: "Поглиблене тестування: unit, integration, e2e тести та TDD підхід.",
    duration: "8 годин",
    level: "advanced",
    competencies: ["Тестування", "TDD", "Jest", "Cypress"],
    rating: 4.6,
    students: 8930,
    modules: 6,
    isRecommended: true,
    recommendationReason: "Підвищить ваші навички тестування на 12%",
    progress: 40,
    status: "in_progress",
    completedModules: 2,
    lastAccessed: "2025-01-22"
  },
  {
    id: "3",
    title: "Docker & Kubernetes Mastery",
    provider: "Pluralsight",
    description: "Контейнеризація та оркестрація: від основ до production-ready рішень.",
    duration: "16 годин",
    level: "intermediate",
    competencies: ["DevOps", "Docker", "Kubernetes", "CI/CD"],
    rating: 4.9,
    students: 22100,
    modules: 12,
    isRecommended: true,
    recommendationReason: "Закриє прогалину в DevOps компетенціях"
  },
  // Catalog courses
  {
    id: "4",
    title: "React Performance Optimization",
    provider: "Frontend Masters",
    description: "Оптимізація React-додатків: профайлинг, мемоізація, code splitting.",
    duration: "6 годин",
    level: "advanced",
    competencies: ["React", "Performance", "Profiling"],
    rating: 4.7,
    students: 12300,
    modules: 5
  },
  {
    id: "5",
    title: "TypeScript Deep Dive",
    provider: "Udemy",
    description: "Поглиблене вивчення TypeScript: generics, utility types, декоратори.",
    duration: "10 годин",
    level: "intermediate",
    competencies: ["TypeScript", "JavaScript", "Types"],
    rating: 4.8,
    students: 28500,
    modules: 8,
    progress: 100,
    status: "completed",
    completedModules: 8,
    certificateUrl: "/certificates/typescript"
  },
  {
    id: "6",
    title: "Effective Communication for Developers",
    provider: "LinkedIn Learning",
    description: "Комунікаційні навички для розробників: презентації, код-рев'ю, менторинг.",
    duration: "4 години",
    level: "beginner",
    competencies: ["Soft Skills", "Комунікація", "Лідерство"],
    rating: 4.5,
    students: 9800,
    modules: 4,
    isRecommended: true,
    recommendationReason: "Покращить ваші soft skills"
  },
  {
    id: "7",
    title: "PostgreSQL Advanced Queries",
    provider: "Coursera",
    description: "Оптимізація запитів, індекси, партиціонування та аналітика в PostgreSQL.",
    duration: "8 годин",
    level: "advanced",
    competencies: ["PostgreSQL", "SQL", "Бази даних"],
    rating: 4.6,
    students: 7200,
    modules: 6
  },
  {
    id: "8",
    title: "Microservices Architecture",
    provider: "Pluralsight",
    description: "Проєктування мікросервісної архітектури: патерни, комунікація, моніторинг.",
    duration: "14 годин",
    level: "advanced",
    competencies: ["Архітектура", "Мікросервіси", "API Design"],
    rating: 4.8,
    students: 18700,
    modules: 10
  },
  {
    id: "9",
    title: "Основи JavaScript",
    provider: "Codecademy",
    description: "Фундаментальні концепції JavaScript для початківців.",
    duration: "20 годин",
    level: "beginner",
    competencies: ["JavaScript", "Програмування"],
    rating: 4.4,
    students: 45000,
    modules: 15,
    progress: 100,
    status: "completed",
    completedModules: 15,
    certificateUrl: "/certificates/js"
  }
];

const getLevelConfig = (level: Course["level"]) => {
  switch (level) {
    case "beginner":
      return { label: "Початковий", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "intermediate":
      return { label: "Середній", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "advanced":
      return { label: "Просунутий", className: "bg-red-500/10 text-red-600 border-red-500/20" };
  }
};

const CourseCard = ({ course, showRecommendation = false }: { course: Course; showRecommendation?: boolean }) => {
  const levelConfig = getLevelConfig(course.level);

  return (
    <Card className={`hover:shadow-md transition-shadow ${course.isRecommended && showRecommendation ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {course.isRecommended && showRecommendation && (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
              <h3 className="font-medium text-foreground">{course.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{course.provider}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={levelConfig.className}>{levelConfig.label}</Badge>
            {course.status === "completed" && (
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Завершено
              </Badge>
            )}
          </div>
        </div>

        {course.isRecommended && showRecommendation && course.recommendationReason && (
          <div className="p-2 rounded-lg bg-primary/10 text-sm text-primary mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            {course.recommendationReason}
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {course.competencies.slice(0, 4).map((comp) => (
            <Badge key={comp} variant="outline" className="text-xs">
              {comp}
            </Badge>
          ))}
          {course.competencies.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{course.competencies.length - 4}
            </Badge>
          )}
        </div>

        {course.status === "in_progress" && course.progress !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Прогрес</span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {course.completedModules} з {course.modules} модулів
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {course.duration}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {course.students.toLocaleString()}
            </span>
          </div>
          <div className="flex gap-2">
            {course.certificateUrl && (
              <Button variant="outline" size="sm">
                <Award className="h-4 w-4 mr-1" />
                Сертифікат
              </Button>
            )}
            <Button size="sm" variant={course.status === "in_progress" ? "default" : "outline"}>
              {course.status === "in_progress" ? (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Продовжити
                </>
              ) : course.status === "completed" ? (
                <>
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Переглянути
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  Розпочати
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProfessionalLearning = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");

  const inProgressCourses = allCourses.filter(c => c.status === "in_progress");
  const completedCourses = allCourses.filter(c => c.status === "completed");
  const recommendedCourses = allCourses.filter(c => c.isRecommended);
  
  const totalHoursCompleted = completedCourses.reduce((sum, c) => {
    const hours = parseInt(c.duration);
    return sum + (isNaN(hours) ? 0 : hours);
  }, 0);

  const filteredCourses = allCourses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.competencies.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesLevel = selectedLevel === "all" || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Навчання</h1>
            <p className="text-muted-foreground mt-1">Розвивайте компетенції та отримуйте сертифікати</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Play className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{inProgressCourses.length}</p>
                  <p className="text-sm text-muted-foreground">В процесі</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{completedCourses.length}</p>
                  <p className="text-sm text-muted-foreground">Завершено</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalHoursCompleted}</p>
                  <p className="text-sm text-muted-foreground">Годин навчання</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{completedCourses.filter(c => c.certificateUrl).length}</p>
                  <p className="text-sm text-muted-foreground">Сертифікатів</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Continue Learning */}
            {inProgressCourses.length > 0 && (
              <div>
                <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Продовжити навчання
                </h2>
                <div className="space-y-4">
                  {inProgressCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommended courses */}
            <div>
              <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Рекомендовані для вас
              </h2>
              <div className="space-y-4">
                {recommendedCourses.filter(c => c.status !== "in_progress").map((course) => (
                  <CourseCard key={course.id} course={course} showRecommendation />
                ))}
              </div>
            </div>

            {/* Course Catalog */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Каталог курсів
                </h2>
              </div>

              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Пошук за назвою або компетенцією..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Tabs value={selectedLevel} onValueChange={setSelectedLevel}>
                  <TabsList>
                    <TabsTrigger value="all">Усі</TabsTrigger>
                    <TabsTrigger value="beginner">Початковий</TabsTrigger>
                    <TabsTrigger value="intermediate">Середній</TabsTrigger>
                    <TabsTrigger value="advanced">Просунутий</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-4">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
                {filteredCourses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Курсів за вашим запитом не знайдено</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-6">
            {/* Weak Competencies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-amber-500" />
                  Зони росту
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {weakCompetencies.map((comp) => (
                  <div key={comp.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{comp.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {comp.relatedCourses} курсів
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={comp.currentLevel} className="h-2" />
                      <div 
                        className="absolute top-0 h-2 w-0.5 bg-primary"
                        style={{ left: `${comp.targetLevel}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Поточний: {comp.currentLevel}%</span>
                      <span className="text-primary">Ціль: {comp.targetLevel}%</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <AIInsightCard
              title="Персональний план навчання"
              insight="На основі аналізу ваших результатів кейсів та оцінювань, рекомендуємо зосередитись на System Design та тестуванні для підвищення конкурентоспроможності."
              factors={[
                { label: "Системний дизайн", value: "Пріоритет 1", weight: 23 },
                { label: "DevOps", value: "Пріоритет 2", weight: 20 },
                { label: "Soft Skills", value: "Пріоритет 3", weight: 15 },
              ]}
              methodology="Рекомендації базуються на порівнянні вашого профілю з вимогами топ-вакансій у вашій спеціалізації."
            />

            {/* Completed courses */}
            {completedCourses.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    Завершені курси
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {completedCourses.map((course) => (
                    <div key={course.id} className="flex items-center justify-between p-2 rounded-lg bg-accent/50">
                      <div>
                        <p className="text-sm font-medium text-foreground">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.provider}</p>
                      </div>
                      {course.certificateUrl && (
                        <Button variant="ghost" size="sm">
                          <Award className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Learning streak */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Серія навчання</p>
                    <p className="text-sm text-muted-foreground">7 днів поспіль</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7].map((day) => (
                    <div 
                      key={day} 
                      className="flex-1 h-2 rounded-full bg-primary"
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Продовжуйте навчатись щодня!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalLearning;
