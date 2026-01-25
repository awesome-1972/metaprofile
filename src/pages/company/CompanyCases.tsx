import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Users, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle2,
  XCircle,
  BarChart3,
  Star,
  FileText,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

interface Case {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  duration: string;
  competencies: string[];
  status: "active" | "draft" | "archived";
  createdAt: string;
  // Engagement metrics
  views: number;
  started: number;
  completed: number;
  avgCompletionTime: string;
  // Success metrics
  successRate: number;
  avgScore: number;
  dropoffRate: number;
  // Candidate feedback
  interestScore: number; // 1-5
  difficultyFeedback: "too_easy" | "just_right" | "too_hard";
  linkedVacancies: number;
}

const cases: Case[] = [
  {
    id: "1",
    title: "E-commerce платформа",
    description: "Розробка модуля кошика з оптимізацією продуктивності та інтеграцією платіжної системи.",
    category: "Frontend Development",
    difficulty: "hard",
    duration: "4-6 годин",
    competencies: ["React", "TypeScript", "API Integration", "Performance"],
    status: "active",
    createdAt: "2024-12-15",
    views: 234,
    started: 89,
    completed: 47,
    avgCompletionTime: "4.2 год",
    successRate: 72,
    avgScore: 78,
    dropoffRate: 47,
    interestScore: 4.2,
    difficultyFeedback: "just_right",
    linkedVacancies: 3
  },
  {
    id: "2",
    title: "Аналіз ринку SaaS",
    description: "Дослідження конкурентного середовища та формування стратегії виходу на ринок B2B SaaS продукту.",
    category: "Product Management",
    difficulty: "medium",
    duration: "2-3 години",
    competencies: ["Market Analysis", "Strategy", "Presentation", "Data Analysis"],
    status: "active",
    createdAt: "2024-12-20",
    views: 156,
    started: 67,
    completed: 52,
    avgCompletionTime: "2.5 год",
    successRate: 85,
    avgScore: 82,
    dropoffRate: 22,
    interestScore: 4.5,
    difficultyFeedback: "just_right",
    linkedVacancies: 2
  },
  {
    id: "3",
    title: "UX редизайн дашборду",
    description: "Покращення користувацького досвіду адміністративної панелі з фокусом на доступність та юзабіліті.",
    category: "UX/UI Design",
    difficulty: "medium",
    duration: "3-4 години",
    competencies: ["UX Research", "Figma", "Accessibility", "Prototyping"],
    status: "active",
    createdAt: "2025-01-05",
    views: 98,
    started: 34,
    completed: 18,
    avgCompletionTime: "3.8 год",
    successRate: 68,
    avgScore: 75,
    dropoffRate: 47,
    interestScore: 3.8,
    difficultyFeedback: "too_hard",
    linkedVacancies: 1
  },
  {
    id: "4",
    title: "REST API архітектура",
    description: "Проектування масштабованого REST API для фінтех-додатку з урахуванням безпеки та продуктивності.",
    category: "Backend Development",
    difficulty: "hard",
    duration: "5-7 годин",
    competencies: ["API Design", "Security", "Database", "Documentation"],
    status: "active",
    createdAt: "2025-01-10",
    views: 112,
    started: 28,
    completed: 12,
    avgCompletionTime: "6.1 год",
    successRate: 58,
    avgScore: 71,
    dropoffRate: 57,
    interestScore: 3.5,
    difficultyFeedback: "too_hard",
    linkedVacancies: 2
  },
  {
    id: "5",
    title: "A/B тестування лендінгу",
    description: "Розробка гіпотез та аналіз результатів A/B тесту для підвищення конверсії.",
    category: "Marketing",
    difficulty: "easy",
    duration: "1-2 години",
    competencies: ["Analytics", "Hypothesis Testing", "Copywriting"],
    status: "active",
    createdAt: "2025-01-15",
    views: 203,
    started: 124,
    completed: 98,
    avgCompletionTime: "1.4 год",
    successRate: 91,
    avgScore: 85,
    dropoffRate: 21,
    interestScore: 4.7,
    difficultyFeedback: "just_right",
    linkedVacancies: 1
  },
  {
    id: "6",
    title: "Data Pipeline оптимізація",
    description: "Оптимізація ETL процесу для обробки великих обсягів даних в реальному часі.",
    category: "Data Engineering",
    difficulty: "hard",
    duration: "4-5 годин",
    competencies: ["Python", "SQL", "ETL", "Performance Optimization"],
    status: "draft",
    createdAt: "2025-01-20",
    views: 0,
    started: 0,
    completed: 0,
    avgCompletionTime: "-",
    successRate: 0,
    avgScore: 0,
    dropoffRate: 0,
    interestScore: 0,
    difficultyFeedback: "just_right",
    linkedVacancies: 0
  }
];

const getDifficultyConfig = (difficulty: Case["difficulty"]) => {
  switch (difficulty) {
    case "easy":
      return { label: "Легкий", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "medium":
      return { label: "Середній", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "hard":
      return { label: "Складний", className: "bg-red-500/10 text-red-600 border-red-500/20" };
  }
};

const getStatusConfig = (status: Case["status"]) => {
  switch (status) {
    case "active":
      return { label: "Активний", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "draft":
      return { label: "Чернетка", className: "bg-muted text-muted-foreground" };
    case "archived":
      return { label: "В архіві", className: "bg-muted text-muted-foreground" };
  }
};

const getFeedbackLabel = (feedback: Case["difficultyFeedback"]) => {
  switch (feedback) {
    case "too_easy": return "Занадто легко";
    case "just_right": return "В самий раз";
    case "too_hard": return "Занадто складно";
  }
};

const CaseCard = ({ caseData }: { caseData: Case }) => {
  const difficultyConfig = getDifficultyConfig(caseData.difficulty);
  const statusConfig = getStatusConfig(caseData.status);
  const conversionRate = caseData.views > 0 ? Math.round((caseData.started / caseData.views) * 100) : 0;
  const completionRate = caseData.started > 0 ? Math.round((caseData.completed / caseData.started) * 100) : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{caseData.title}</CardTitle>
              <Badge className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{caseData.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={difficultyConfig.className}>
              {difficultyConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Competencies */}
        <div className="flex flex-wrap gap-1.5">
          {caseData.competencies.map((comp) => (
            <Badge key={comp} variant="outline" className="text-xs">
              {comp}
            </Badge>
          ))}
        </div>

        {/* Engagement funnel */}
        <div className="grid grid-cols-4 gap-3 py-3 border-y">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-3.5 w-3.5" />
            </div>
            <p className="text-lg font-semibold">{caseData.views}</p>
            <p className="text-xs text-muted-foreground">Переглядів</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-3.5 w-3.5" />
            </div>
            <p className="text-lg font-semibold">{caseData.started}</p>
            <p className="text-xs text-muted-foreground">Розпочали</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>
            <p className="text-lg font-semibold">{caseData.completed}</p>
            <p className="text-xs text-muted-foreground">Завершили</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
            </div>
            <p className="text-lg font-semibold">{caseData.avgCompletionTime}</p>
            <p className="text-xs text-muted-foreground">Сер. час</p>
          </div>
        </div>

        {/* Success metrics */}
        {caseData.status === "active" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Конверсія у старт</span>
                  <span className="font-medium">{conversionRate}%</span>
                </div>
                <Progress value={conversionRate} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Завершуваність</span>
                  <span className={`font-medium ${completionRate < 50 ? 'text-amber-600' : ''}`}>
                    {completionRate}%
                  </span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${caseData.successRate >= 70 ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                  {caseData.successRate >= 70 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{caseData.successRate}%</p>
                  <p className="text-xs text-muted-foreground">Успішність</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{caseData.avgScore}/100</p>
                  <p className="text-xs text-muted-foreground">Сер. бал</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-amber-500/10">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{caseData.interestScore}/5</p>
                  <p className="text-xs text-muted-foreground">Інтерес</p>
                </div>
              </div>
            </div>

            {/* Feedback indicator */}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">Відгук про складність:</span>
                <Badge 
                  variant="outline" 
                  className={
                    caseData.difficultyFeedback === "just_right" 
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : caseData.difficultyFeedback === "too_hard"
                      ? "bg-red-500/10 text-red-600 border-red-500/20"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                  }
                >
                  {getFeedbackLabel(caseData.difficultyFeedback)}
                </Badge>
              </div>
              {caseData.linkedVacancies > 0 && (
                <span className="text-muted-foreground">
                  Прив'язано до {caseData.linkedVacancies} вакансій
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{caseData.duration}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/company/cases/${caseData.id}`}>
                Редагувати
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`/company/cases/${caseData.id}/results`}>
                Результати
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CompanyCases = () => {
  const activeCases = cases.filter(c => c.status === "active");
  const totalCompleted = activeCases.reduce((sum, c) => sum + c.completed, 0);
  const avgSuccessRate = activeCases.length > 0 
    ? Math.round(activeCases.reduce((sum, c) => sum + c.successRate, 0) / activeCases.length)
    : 0;
  const avgInterest = activeCases.length > 0
    ? (activeCases.reduce((sum, c) => sum + c.interestScore, 0) / activeCases.length).toFixed(1)
    : "0";

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Кейси</h1>
            <p className="text-muted-foreground mt-1">Практичні завдання для оцінки кандидатів</p>
          </div>
          <Button asChild>
            <Link to="/company/cases/create">
              <Plus className="h-4 w-4 mr-2" />
              Створити кейс
            </Link>
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{activeCases.length}</p>
                  <p className="text-sm text-muted-foreground">Активних</p>
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
                  <p className="text-2xl font-semibold">{totalCompleted}</p>
                  <p className="text-sm text-muted-foreground">Завершень</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgSuccessRate}%</p>
                  <p className="text-sm text-muted-foreground">Сер. успішність</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgInterest}</p>
                  <p className="text-sm text-muted-foreground">Сер. інтерес</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases list */}
        <div className="space-y-4">
          {cases.map((caseData) => (
            <CaseCard key={caseData.id} caseData={caseData} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CompanyCases;
