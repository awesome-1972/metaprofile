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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  MessageSquare,
  Upload,
  FileText,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
  status: "passed" | "failed" | "pending_review";
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
  aiDetectionScore?: number;
}

interface OpenCase {
  id: string;
  title: string;
  company: string;
  description: string;
  deadline: string;
  duration: string;
  competencies: string[];
  reward?: string;
  status: "saved" | "in_progress" | "not_started";
  progress?: number;
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
    status: "passed",
    feedback: "Відмінне рішення з чистою архітектурою та добре структурованим кодом.",
    strengths: ["Чиста архітектура", "Оптимізація продуктивності", "Документація"],
    improvements: ["Тестове покриття", "Обробка помилок"],
    aiDetectionScore: 12
  },
  {
    id: "2",
    title: "REST API оптимізація",
    company: "TechCorp Ukraine",
    completedAt: "2025-01-15",
    score: 92,
    rank: "Топ 5%",
    status: "passed",
    feedback: "Креативний підхід до кешування та відмінне розуміння патернів.",
    strengths: ["Інноваційне рішення", "Глибоке розуміння проблеми", "Ефективність"],
    aiDetectionScore: 8
  },
  {
    id: "3",
    title: "Dashboard UI",
    company: "DesignStudio",
    completedAt: "2025-01-10",
    score: 58,
    rank: "Топ 60%",
    status: "failed",
    feedback: "Рішення не відповідає вимогам доступності та має проблеми з UX.",
    improvements: ["Доступність (a11y)", "Консистентність UI", "Адаптивний дизайн"],
    aiDetectionScore: 15
  },
  {
    id: "4",
    title: "Data Pipeline",
    company: "DataFlow",
    completedAt: "2025-01-05",
    score: 85,
    rank: "Топ 15%",
    status: "passed",
    feedback: "Добре структуроване рішення з ефективною обробкою даних.",
    strengths: ["Ефективність", "Масштабованість"],
    aiDetectionScore: 5
  },
  {
    id: "5",
    title: "Mobile App MVP",
    company: "StartupHub",
    completedAt: "2024-12-28",
    score: 0,
    rank: "-",
    status: "pending_review",
    aiDetectionScore: 0
  }
];

const openCases: OpenCase[] = [
  {
    id: "1",
    title: "Мікросервісна архітектура",
    company: "FinTech Solutions",
    description: "Проєктування системи обробки платежів з урахуванням масштабованості.",
    deadline: "2025-01-30",
    duration: "4-5 годин",
    competencies: ["Архітектура", "Node.js", "Docker", "Kubernetes"],
    reward: "Запрошення на співбесіду",
    status: "in_progress",
    progress: 35
  },
  {
    id: "2",
    title: "Оптимізація бази даних",
    company: "TechCorp Ukraine",
    description: "Аналіз та оптимізація запитів PostgreSQL для високонавантаженого додатку.",
    deadline: "2025-02-05",
    duration: "3-4 години",
    competencies: ["SQL", "PostgreSQL", "Оптимізація"],
    status: "saved"
  },
  {
    id: "3",
    title: "Frontend Performance Audit",
    company: "WebAgency",
    description: "Аудит та оптимізація продуктивності React-додатку з мільйонами користувачів.",
    deadline: "2025-02-10",
    duration: "2-3 години",
    competencies: ["React", "Performance", "Lighthouse"],
    status: "not_started"
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

const getCaseStatusConfig = (status: CompletedCase["status"]) => {
  switch (status) {
    case "passed":
      return { label: "Успішно", icon: CheckCircle2, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "failed":
      return { label: "Не пройдено", icon: XCircle, className: "bg-red-500/10 text-red-600 border-red-500/20" };
    case "pending_review":
      return { label: "На перевірці", icon: Clock, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  }
};

const getOpenCaseStatusConfig = (status: OpenCase["status"]) => {
  switch (status) {
    case "in_progress":
      return { label: "В процесі", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "saved":
      return { label: "Збережено", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "not_started":
      return { label: "Не розпочато", className: "bg-muted text-muted-foreground" };
  }
};

const CompletedCaseCard = ({ caseItem }: { caseItem: CompletedCase }) => {
  const [isOpen, setIsOpen] = useState(false);
  const statusConfig = getCaseStatusConfig(caseItem.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="p-3 rounded-lg border">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 -m-3 p-3 rounded-lg transition-colors">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${caseItem.status === 'passed' ? 'text-emerald-600' : caseItem.status === 'failed' ? 'text-red-600' : 'text-amber-600'}`} />
                <p className="font-medium text-foreground">{caseItem.title}</p>
                <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
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
            </div>
            <div className="flex items-center gap-3">
              {caseItem.status !== "pending_review" && (
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">{caseItem.score}</p>
                  <p className="text-xs text-muted-foreground">балів</p>
                </div>
              )}
              {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="pt-4 mt-3 border-t space-y-3">
            {caseItem.feedback && (
              <div className="p-3 rounded-lg bg-accent/50">
                <p className="text-sm font-medium text-foreground mb-1">Зворотній зв'язок</p>
                <p className="text-sm text-muted-foreground">{caseItem.feedback}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              {caseItem.strengths && caseItem.strengths.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-emerald-600 mb-1.5">Сильні сторони</p>
                  <ul className="space-y-1">
                    {caseItem.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {caseItem.improvements && caseItem.improvements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-600 mb-1.5">Зони росту</p>
                  <ul className="space-y-1">
                    {caseItem.improvements.map((s, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {caseItem.rank !== "-" && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground">Ваш результат серед учасників:</span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {caseItem.rank}
                </Badge>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const ProfessionalDashboard = () => {
  const passedCases = completedCases.filter(c => c.status === "passed").length;
  const avgScore = Math.round(
    completedCases.filter(c => c.status !== "pending_review").reduce((sum, c) => sum + c.score, 0) / 
    completedCases.filter(c => c.status !== "pending_review").length
  );
  const pendingInvitations = invitations.filter(i => i.status === "pending").length;

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вітаємо, Максиме</h1>
            <p className="text-muted-foreground mt-1">Ваш професійний профіль та можливості</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Завантажити резюме
            </Button>
            <Button asChild>
              <Link to="/professional/cases">
                Знайти кейси
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex items-center gap-3 p-3 rounded-md bg-accent/50 border-2 border-dashed border-muted-foreground/30">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Резюме</p>
                <p className="text-xs text-muted-foreground">Не завантажено</p>
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
            title="Успішних кейсів"
            value={passedCases}
            icon={CheckCircle2}
            subtitle={`${Math.round((passedCases / completedCases.filter(c => c.status !== 'pending_review').length) * 100)}% успішність`}
          />
          <StatCard
            title="Активних запрошень"
            value={pendingInvitations}
            icon={Mail}
            subtitle="Очікують відповіді"
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
          {/* Left column - Open Cases & Completed Cases */}
          <div className="lg:col-span-2 space-y-6">
            {/* Open/Active Cases */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Відкриті кейси
                  </CardTitle>
                  <Badge variant="secondary">{openCases.length} активних</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {openCases.map((caseItem) => {
                  const statusConfig = getOpenCaseStatusConfig(caseItem.status);
                  const daysLeft = Math.ceil((new Date(caseItem.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div key={caseItem.id} className="p-4 rounded-lg border hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-foreground">{caseItem.title}</h3>
                            <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Building2 className="h-3.5 w-3.5" />
                            <span>{caseItem.company}</span>
                          </div>
                        </div>
                        {caseItem.reward && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <Trophy className="h-3 w-3 mr-1" />
                            {caseItem.reward}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">{caseItem.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {caseItem.competencies.map((comp) => (
                          <Badge key={comp} variant="outline" className="text-xs">
                            {comp}
                          </Badge>
                        ))}
                      </div>

                      {caseItem.status === "in_progress" && caseItem.progress && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Прогрес</span>
                            <span className="font-medium">{caseItem.progress}%</span>
                          </div>
                          <Progress value={caseItem.progress} className="h-2" />
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {caseItem.duration}
                          </span>
                          <span className={`flex items-center gap-1 ${daysLeft <= 3 ? 'text-amber-600 font-medium' : ''}`}>
                            <Calendar className="h-4 w-4" />
                            {daysLeft} днів
                          </span>
                        </div>
                        <Button size="sm" variant={caseItem.status === "in_progress" ? "default" : "outline"}>
                          {caseItem.status === "in_progress" ? (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              Продовжити
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
                  );
                })}
              </CardContent>
            </Card>

            {/* Completed Cases with Feedback */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Пройдені кейси
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      {passedCases}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="h-4 w-4" />
                      {completedCases.filter(c => c.status === "failed").length}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedCases.map((caseItem) => (
                  <CompletedCaseCard key={caseItem.id} caseItem={caseItem} />
                ))}
              </CardContent>
            </Card>

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
                  <span className="text-muted-foreground">Середній бал</span>
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
