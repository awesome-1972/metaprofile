import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { CaseCard } from "@/components/ui/CaseCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { MetaprogramsAnalysis } from "@/components/professional/MetaprogramsAnalysis";
import { CompetencyAssessment } from "@/components/professional/CompetencyAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Target, 
  BookOpen, 
  Award, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight,
  Mail,
  Clock,
  Star,
  Building2,
  Calendar,
  Play,
  Trophy,
  Zap,
  Eye,
  MessageSquare
} from "lucide-react";

interface Invitation {
  id: string;
  company: string;
  position: string;
  type: "interview" | "case" | "offer";
  receivedAt: string;
  deadline?: string;
  status: "pending" | "accepted" | "declined";
}

interface CompletedCase {
  id: string;
  title: string;
  company: string;
  completedAt: string;
  score: number;
  rank: string;
  feedback?: string;
}

interface ActiveCourse {
  id: string;
  title: string;
  provider: string;
  progress: number;
  totalHours: number;
  completedHours: number;
  nextLesson: string;
}

const invitations: Invitation[] = [
  {
    id: "1",
    company: "TechCorp Ukraine",
    position: "Senior Frontend Developer",
    type: "interview",
    receivedAt: "2025-01-24",
    deadline: "2025-01-28",
    status: "pending"
  },
  {
    id: "2",
    company: "FinTech Solutions",
    position: "Full Stack Developer",
    type: "case",
    receivedAt: "2025-01-22",
    status: "pending"
  },
  {
    id: "3",
    company: "DataDriven Inc",
    position: "Backend Engineer",
    type: "offer",
    receivedAt: "2025-01-20",
    deadline: "2025-01-30",
    status: "pending"
  }
];

const completedCases: CompletedCase[] = [
  {
    id: "1",
    title: "E-commerce платформа",
    company: "ShopTech",
    completedAt: "2025-01-20",
    score: 87,
    rank: "Топ 10%",
    feedback: "Відмінне рішення з чистою архітектурою"
  },
  {
    id: "2",
    title: "REST API оптимізація",
    company: "TechCorp Ukraine",
    completedAt: "2025-01-15",
    score: 92,
    rank: "Топ 5%",
    feedback: "Креативний підхід до кешування"
  },
  {
    id: "3",
    title: "Dashboard UI",
    company: "DesignStudio",
    completedAt: "2025-01-10",
    score: 78,
    rank: "Топ 25%"
  },
  {
    id: "4",
    title: "Data Pipeline",
    company: "DataFlow",
    completedAt: "2025-01-05",
    score: 85,
    rank: "Топ 15%"
  },
  {
    id: "5",
    title: "Mobile App MVP",
    company: "StartupHub",
    completedAt: "2024-12-28",
    score: 81,
    rank: "Топ 20%"
  }
];

const activeCourses: ActiveCourse[] = [
  {
    id: "1",
    title: "System Design Fundamentals",
    provider: "Coursera",
    progress: 75,
    totalHours: 12,
    completedHours: 9,
    nextLesson: "Distributed Caching Patterns"
  },
  {
    id: "2",
    title: "Advanced TypeScript",
    provider: "Udemy",
    progress: 40,
    totalHours: 8,
    completedHours: 3.2,
    nextLesson: "Generics & Type Guards"
  }
];

const getInvitationTypeConfig = (type: Invitation["type"]) => {
  switch (type) {
    case "interview":
      return { label: "Співбесіда", icon: MessageSquare, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "case":
      return { label: "Кейс", icon: Target, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "offer":
      return { label: "Оффер", icon: Trophy, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
  }
};

const ProfessionalDashboard = () => {
  const avgScore = Math.round(completedCases.reduce((sum, c) => sum + c.score, 0) / completedCases.length);
  const pendingInvitations = invitations.filter(i => i.status === "pending").length;

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вітаємо, Максиме</h1>
            <p className="text-muted-foreground mt-1">Ваш професійний профіль та можливості</p>
          </div>
          <Button asChild>
            <Link to="/professional/cases">
              Знайти кейси
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Profile completeness */}
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Повнота профілю</h2>
              <p className="text-sm text-muted-foreground">Завершіть оцінювання для кращих рекомендацій</p>
            </div>
            <span className="text-2xl font-semibold text-primary">68%</span>
          </div>
          <Progress value={68} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-accent/50">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Базова інформація</p>
                <p className="text-xs text-muted-foreground">Заповнено</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-accent/50">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Метапрограми</p>
                <p className="text-xs text-muted-foreground">Пройдено</p>
              </div>
            </div>
            <CompetencyAssessment 
              onStartAssessment={(modelId) => {
                console.log("Starting assessment:", modelId);
              }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Виконано кейсів"
            value={completedCases.length}
            icon={Target}
            trend={{ value: 2, label: "цього місяця" }}
          />
          <StatCard
            title="Активних запрошень"
            value={pendingInvitations}
            icon={Mail}
            subtitle="Очікують відповіді"
          />
          <StatCard
            title="Середній бал"
            value={`${avgScore}/100`}
            icon={Award}
            subtitle="За всі кейси"
          />
          <StatCard
            title="Рейтинг профілю"
            value="Топ 15%"
            icon={TrendingUp}
            subtitle="Серед спеціалістів"
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Invitations & Cases */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invitations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Запрошення
                  </CardTitle>
                  <Badge variant="secondary">{pendingInvitations} нових</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {invitations.map((invitation) => {
                  const typeConfig = getInvitationTypeConfig(invitation.type);
                  const IconComponent = typeConfig.icon;
                  return (
                    <div 
                      key={invitation.id} 
                      className="flex items-center justify-between p-3 rounded-lg border bg-accent/30 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.className}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{invitation.position}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{invitation.company}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={typeConfig.className}>
                          {typeConfig.label}
                        </Badge>
                        {invitation.deadline && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            до {new Date(invitation.deadline).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                          </div>
                        )}
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Completed Cases */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Виконані кейси
                  </CardTitle>
                  <Link to="/professional/cases/history" className="text-sm text-primary hover:underline">
                    Усі кейси
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {completedCases.slice(0, 4).map((caseItem) => (
                    <div 
                      key={caseItem.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{caseItem.title}</p>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {caseItem.rank}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {caseItem.company}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(caseItem.completedAt).toLocaleDateString('uk-UA')}
                          </span>
                        </div>
                        {caseItem.feedback && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{caseItem.feedback}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-foreground">{caseItem.score}</p>
                          <p className="text-xs text-muted-foreground">балів</p>
                        </div>
                        <div className={`w-2 h-10 rounded-full ${
                          caseItem.score >= 85 ? 'bg-emerald-500' : 
                          caseItem.score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommended cases */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-foreground">Рекомендовані кейси</h2>
                <Link to="/professional/cases" className="text-sm text-primary hover:underline">
                  Переглянути всі
                </Link>
              </div>
              
              <div className="grid gap-4">
                <CaseCard
                  title="Оптимізація бази даних"
                  company="TechCorp Ukraine"
                  description="Аналіз та оптимізація запитів PostgreSQL для високонавантаженого додатку з мільйонами записів."
                  duration="3-4 години"
                  participants={12}
                  competencies={["SQL", "PostgreSQL", "Оптимізація"]}
                  status="open"
                  link="/professional/cases/1"
                />
                <CaseCard
                  title="Архітектура мікросервісів"
                  company="FinTech Solutions"
                  description="Проєктування системи обробки платежів з урахуванням масштабованості та відмовостійкості."
                  duration="4-5 годин"
                  participants={8}
                  competencies={["Архітектура", "Node.js", "Docker"]}
                  status="open"
                  link="/professional/cases/2"
                />
              </div>
            </div>
          </div>

          {/* Right column - Rating, Learning, AI */}
          <div className="space-y-6">
            {/* Rating Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Ваш рейтинг
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white mb-3">
                    <span className="text-2xl font-bold">15%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Ви в топі серед спеціалістів</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Технічні навички</span>
                    <div className="flex items-center gap-2">
                      <Progress value={88} className="w-20 h-2" />
                      <span className="text-sm font-medium">88%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Якість рішень</span>
                    <div className="flex items-center gap-2">
                      <Progress value={85} className="w-20 h-2" />
                      <span className="text-sm font-medium">85%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Швидкість</span>
                    <div className="flex items-center gap-2">
                      <Progress value={72} className="w-20 h-2" />
                      <span className="text-sm font-medium">72%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Комунікація</span>
                    <div className="flex items-center gap-2">
                      <Progress value={75} className="w-20 h-2" />
                      <span className="text-sm font-medium">75%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Загальний бал</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-semibold">{avgScore}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Learning */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Моє навчання
                  </CardTitle>
                  <Badge variant="secondary">{activeCourses.length} активних</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeCourses.map((course) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground text-sm">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.provider}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {course.completedHours}/{course.totalHours} год
                      </Badge>
                    </div>
                    <Progress value={course.progress} className="h-2" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {course.nextLesson}
                      </span>
                      <span className="font-medium text-primary">{course.progress}%</span>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link to="/professional/learning">
                    <Zap className="h-4 w-4 mr-2" />
                    Продовжити навчання
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* AI Recommendations */}
            <AIInsightCard
              title="Персональні рекомендації"
              insight="На основі ваших результатів кейсів, рекомендуємо зосередитись на покращенні навичок системного проєктування."
              factors={[
                { label: "Технічні навички", value: "Високі", weight: 88 },
                { label: "Системний дизайн", value: "Середній", weight: 62 },
                { label: "Комунікація", value: "Добрий", weight: 75 },
              ]}
              methodology="Аналіз базується на 5 виконаних кейсах та порівнянні з профілями успішних кандидатів."
            />
          </div>
        </div>

        {/* Metaprograms Analysis */}
        <div className="mt-8">
          <MetaprogramsAnalysis />
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalDashboard;
