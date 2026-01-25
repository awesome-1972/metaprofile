import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, 
  Clock, 
  Calendar,
  Building2,
  Award,
  Star,
  Play,
  Eye,
  TrendingUp,
  Target,
  CheckCircle2,
  AlertCircle,
  Mail,
  Timer,
  BarChart3,
  ChevronRight,
  Sparkles
} from "lucide-react";

interface CompletedAssessment {
  id: string;
  title: string;
  company?: string;
  type: "competency" | "metaprogram" | "technical" | "soft_skills";
  completedAt: string;
  overallScore: number;
  maxScore: number;
  rank?: string;
  competencies: {
    name: string;
    score: number;
    maxScore: number;
    level: string;
  }[];
  feedback?: string;
  certificateUrl?: string;
}

interface AssessmentInvitation {
  id: string;
  title: string;
  company: string;
  position: string;
  type: "competency" | "technical" | "soft_skills";
  sentAt: string;
  deadline: string;
  duration: string;
  description: string;
  competencies: string[];
}

interface AvailableAssessment {
  id: string;
  title: string;
  type: "competency" | "metaprogram" | "technical" | "soft_skills";
  duration: string;
  description: string;
  competencies: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  participants: number;
  avgScore: number;
  isRecommended?: boolean;
}

const completedAssessments: CompletedAssessment[] = [
  {
    id: "1",
    title: "Frontend Developer Assessment",
    company: "TechCorp Ukraine",
    type: "competency",
    completedAt: "2025-01-20",
    overallScore: 87,
    maxScore: 100,
    rank: "Топ 10%",
    competencies: [
      { name: "React/TypeScript", score: 92, maxScore: 100, level: "Експерт" },
      { name: "Архітектура", score: 85, maxScore: 100, level: "Просунутий" },
      { name: "Тестування", score: 78, maxScore: 100, level: "Середній" },
      { name: "Performance", score: 88, maxScore: 100, level: "Просунутий" },
    ],
    feedback: "Відмінне володіння React екосистемою. Рекомендовано поглибити знання з тестування.",
    certificateUrl: "/certificates/1"
  },
  {
    id: "2",
    title: "Метапрограмний профіль",
    type: "metaprogram",
    completedAt: "2025-01-15",
    overallScore: 100,
    maxScore: 100,
    competencies: [
      { name: "Мотивація", score: 85, maxScore: 100, level: "До мети" },
      { name: "Референція", score: 70, maxScore: 100, level: "Змішана" },
      { name: "Масштаб", score: 90, maxScore: 100, level: "Глобальний" },
      { name: "Стиль роботи", score: 75, maxScore: 100, level: "Проактивний" },
    ]
  },
  {
    id: "3",
    title: "Backend Development",
    company: "FinTech Solutions",
    type: "technical",
    completedAt: "2025-01-10",
    overallScore: 79,
    maxScore: 100,
    rank: "Топ 25%",
    competencies: [
      { name: "Node.js", score: 85, maxScore: 100, level: "Просунутий" },
      { name: "Бази даних", score: 82, maxScore: 100, level: "Просунутий" },
      { name: "API Design", score: 75, maxScore: 100, level: "Середній" },
      { name: "Security", score: 70, maxScore: 100, level: "Середній" },
    ]
  }
];

const assessmentInvitations: AssessmentInvitation[] = [
  {
    id: "1",
    title: "Full Stack Developer Assessment",
    company: "DataDriven Inc",
    position: "Senior Full Stack Developer",
    type: "competency",
    sentAt: "2025-01-24",
    deadline: "2025-01-31",
    duration: "60 хвилин",
    description: "Комплексна оцінка технічних навичок та софт-скілів для позиції Senior Full Stack Developer.",
    competencies: ["React", "Node.js", "PostgreSQL", "System Design"]
  },
  {
    id: "2",
    title: "Technical Interview Prep",
    company: "TechCorp Ukraine",
    position: "Frontend Developer",
    type: "technical",
    sentAt: "2025-01-22",
    deadline: "2025-01-28",
    duration: "45 хвилин",
    description: "Технічне оцінювання перед фінальним етапом співбесіди.",
    competencies: ["TypeScript", "React", "Testing", "Performance"]
  }
];

const availableAssessments: AvailableAssessment[] = [
  {
    id: "1",
    title: "System Design Fundamentals",
    type: "technical",
    duration: "45 хвилин",
    description: "Оцінка навичок проєктування масштабованих систем та архітектурних рішень.",
    competencies: ["Архітектура", "Масштабування", "Бази даних", "Кешування"],
    difficulty: "advanced",
    participants: 1240,
    avgScore: 72,
    isRecommended: true
  },
  {
    id: "2",
    title: "Soft Skills Assessment",
    type: "soft_skills",
    duration: "30 хвилин",
    description: "Оцінка комунікативних навичок, лідерства та командної роботи.",
    competencies: ["Комунікація", "Лідерство", "Командна робота", "Вирішення конфліктів"],
    difficulty: "intermediate",
    participants: 2850,
    avgScore: 78
  },
  {
    id: "3",
    title: "React Advanced Patterns",
    type: "technical",
    duration: "40 хвилин",
    description: "Поглиблена оцінка знань React: хуки, патерни, оптимізація продуктивності.",
    competencies: ["React Hooks", "State Management", "Performance", "Testing"],
    difficulty: "advanced",
    participants: 890,
    avgScore: 68
  },
  {
    id: "4",
    title: "Базове технічне оцінювання",
    type: "technical",
    duration: "30 хвилин",
    description: "Фундаментальні знання програмування та алгоритмів.",
    competencies: ["Алгоритми", "Структури даних", "ООП", "Clean Code"],
    difficulty: "beginner",
    participants: 4200,
    avgScore: 82
  }
];

const getTypeConfig = (type: CompletedAssessment["type"]) => {
  switch (type) {
    case "competency":
      return { label: "Компетенції", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "metaprogram":
      return { label: "Метапрограми", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
    case "technical":
      return { label: "Технічне", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "soft_skills":
      return { label: "Soft Skills", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
  }
};

const getDifficultyConfig = (difficulty: AvailableAssessment["difficulty"]) => {
  switch (difficulty) {
    case "beginner":
      return { label: "Початковий", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "intermediate":
      return { label: "Середній", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "advanced":
      return { label: "Просунутий", className: "bg-red-500/10 text-red-600 border-red-500/20" };
  }
};

const CompletedAssessmentCard = ({ assessment }: { assessment: CompletedAssessment }) => {
  const typeConfig = getTypeConfig(assessment.type);
  const scorePercent = Math.round((assessment.overallScore / assessment.maxScore) * 100);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground">{assessment.title}</h3>
              <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {assessment.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {assessment.company}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(assessment.completedAt).toLocaleDateString('uk-UA')}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{assessment.overallScore}</span>
              <span className="text-muted-foreground">/{assessment.maxScore}</span>
            </div>
            {assessment.rank && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {assessment.rank}
              </Badge>
            )}
          </div>
        </div>

        {/* Competencies breakdown */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {assessment.competencies.map((comp) => (
            <div key={comp.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground truncate">{comp.name}</span>
                <span className="font-medium">{comp.score}%</span>
              </div>
              <Progress value={comp.score} className="h-1.5" />
            </div>
          ))}
        </div>

        {assessment.feedback && (
          <div className="p-3 rounded-lg bg-accent/50 text-sm mb-3">
            <p className="text-muted-foreground italic">"{assessment.feedback}"</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Результат: {scorePercent >= 80 ? 'Відмінно' : scorePercent >= 60 ? 'Добре' : 'Потребує покращення'}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-1" />
              Деталі
            </Button>
            {assessment.certificateUrl && (
              <Button variant="outline" size="sm">
                <Award className="h-4 w-4 mr-1" />
                Сертифікат
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InvitationCard = ({ invitation }: { invitation: AssessmentInvitation }) => {
  const typeConfig = getTypeConfig(invitation.type);
  const daysLeft = Math.ceil((new Date(invitation.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft <= 3;

  return (
    <Card className={isUrgent ? 'border-amber-500/50' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Mail className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">{invitation.title}</h3>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {invitation.company}
              </span>
              <span>{invitation.position}</span>
            </div>
          </div>
          <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{invitation.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {invitation.competencies.map((comp) => (
            <Badge key={comp} variant="outline" className="text-xs">
              {comp}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Timer className="h-4 w-4" />
              {invitation.duration}
            </span>
            <span className={`flex items-center gap-1 ${isUrgent ? 'text-amber-600' : 'text-muted-foreground'}`}>
              <Clock className="h-4 w-4" />
              {isUrgent ? (
                <span className="font-medium">Залишилось {daysLeft} дн.</span>
              ) : (
                <span>до {new Date(invitation.deadline).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}</span>
              )}
            </span>
          </div>
          <Button size="sm">
            <Play className="h-4 w-4 mr-1" />
            Пройти
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const AvailableAssessmentCard = ({ assessment }: { assessment: AvailableAssessment }) => {
  const typeConfig = getTypeConfig(assessment.type);
  const difficultyConfig = getDifficultyConfig(assessment.difficulty);

  return (
    <Card className={assessment.isRecommended ? 'border-primary/50 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {assessment.isRecommended && (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
            <h3 className="font-medium text-foreground">{assessment.title}</h3>
          </div>
          <div className="flex gap-2">
            <Badge className={typeConfig.className}>{typeConfig.label}</Badge>
            <Badge className={difficultyConfig.className}>{difficultyConfig.label}</Badge>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{assessment.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {assessment.competencies.map((comp) => (
            <Badge key={comp} variant="outline" className="text-xs">
              {comp}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Timer className="h-4 w-4" />
              {assessment.duration}
            </span>
            <span className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              {assessment.participants.toLocaleString()} пройшли
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Сер. бал: {assessment.avgScore}%
            </span>
          </div>
          <Button variant={assessment.isRecommended ? "default" : "outline"} size="sm">
            Почати
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const ProfessionalAssessments = () => {
  const totalCompleted = completedAssessments.length;
  const avgScore = Math.round(
    completedAssessments.reduce((sum, a) => sum + (a.overallScore / a.maxScore) * 100, 0) / totalCompleted
  );
  const pendingInvitations = assessmentInvitations.length;

  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Оцінювання</h1>
            <p className="text-muted-foreground mt-1">Ваші результати, запрошення та доступні тести</p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalCompleted}</p>
                  <p className="text-sm text-muted-foreground">Пройдено</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Star className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{avgScore}%</p>
                  <p className="text-sm text-muted-foreground">Середній бал</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Mail className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{pendingInvitations}</p>
                  <p className="text-sm text-muted-foreground">Запрошень</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <ClipboardCheck className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{availableAssessments.length}</p>
                  <p className="text-sm text-muted-foreground">Доступно</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Section */}
        {assessmentInvitations.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-medium text-foreground">Запрошення від роботодавців</h2>
              <Badge variant="secondary">{assessmentInvitations.length}</Badge>
            </div>
            <div className="grid gap-4">
              {assessmentInvitations.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} />
              ))}
            </div>
          </div>
        )}

        {/* Completed Assessments */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Результати оцінювань</h2>
          </div>
          <div className="grid gap-4">
            {completedAssessments.map((assessment) => (
              <CompletedAssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </div>

        {/* Available Assessments */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Доступні оцінювання</h2>
          </div>
          <div className="grid gap-4">
            {availableAssessments.map((assessment) => (
              <AvailableAssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalAssessments;
