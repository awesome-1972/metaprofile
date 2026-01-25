import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FileText,
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  BarChart3,
  Award,
  UserCheck,
  Timer,
  AlertCircle,
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: "default" | "success" | "warning" | "danger";
}

const MetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: MetricCardProps) => {
  const variantStyles = {
    default: "border-border",
    success: "border-chart-2/50 bg-chart-2/5",
    warning: "border-amber-500/50 bg-amber-500/5",
    danger: "border-destructive/50 bg-destructive/5",
  };

  return (
    <div className={`rounded-lg border p-4 ${variantStyles[variant]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.isPositive !== false ? (
                <TrendingUp className="h-3 w-3 text-chart-2" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span
                className={`text-xs font-medium ${
                  trend.isPositive !== false ? "text-chart-2" : "text-destructive"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="p-2 rounded-md bg-accent/50">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
};

interface DeadlineItem {
  id: string;
  title: string;
  type: "vacancy" | "case" | "assessment";
  deadline: string;
  daysLeft: number;
  status: "ontime" | "warning" | "overdue";
}

const deadlines: DeadlineItem[] = [
  {
    id: "1",
    title: "Frontend Developer",
    type: "vacancy",
    deadline: "28 січня",
    daysLeft: 3,
    status: "warning",
  },
  {
    id: "2",
    title: "E-commerce кейс",
    type: "case",
    deadline: "25 січня",
    daysLeft: 0,
    status: "overdue",
  },
  {
    id: "3",
    title: "Оцінка PM кандидатів",
    type: "assessment",
    deadline: "30 січня",
    daysLeft: 5,
    status: "ontime",
  },
  {
    id: "4",
    title: "UX Designer",
    type: "vacancy",
    deadline: "24 січня",
    daysLeft: -1,
    status: "overdue",
  },
];

export const CompanyStatsDashboard = () => {
  const overdueCount = deadlines.filter((d) => d.status === "overdue").length;
  const warningCount = deadlines.filter((d) => d.status === "warning").length;

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard
          title="Активні вакансії"
          value={12}
          icon={Briefcase}
          trend={{ value: 8, label: "за місяць" }}
        />
        <MetricCard
          title="Кандидати"
          value={47}
          subtitle="на розгляді"
          icon={Users}
          trend={{ value: 23, label: "за тиждень" }}
        />
        <MetricCard
          title="Активні кейси"
          value={8}
          subtitle="3 чернетки"
          icon={FileText}
        />
        <MetricCard
          title="Оцінки в процесі"
          value={15}
          subtitle="очікують завершення"
          icon={Target}
        />
        <MetricCard
          title="Просрочені"
          value={overdueCount}
          subtitle="потребують уваги"
          icon={AlertTriangle}
          variant="danger"
        />
        <MetricCard
          title="Найняті"
          value={5}
          subtitle="цього місяця"
          icon={UserCheck}
          trend={{ value: 25, label: "vs минулий" }}
          variant="success"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hiring Funnel */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Воронка найму</h3>
          </div>
          <div className="space-y-3">
            {[
              { stage: "Перегляди вакансій", count: 1250, percent: 100 },
              { stage: "Заявки", count: 156, percent: 12.5 },
              { stage: "Виконали кейс", count: 47, percent: 30 },
              { stage: "Пройшли оцінку", count: 23, percent: 49 },
              { stage: "Запрошені на співбесіду", count: 12, percent: 52 },
              { stage: "Найняті", count: 5, percent: 42 },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{item.count}</span>
                    {index > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {item.percent}%
                      </Badge>
                    )}
                  </div>
                </div>
                <Progress value={(item.count / 1250) * 100} className="h-1.5" />
              </div>
            ))}
          </div>
        </div>

        {/* Deadlines & Overdue */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Дедлайни</h3>
            </div>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueCount} просрочено
              </Badge>
            )}
          </div>
          <div className="space-y-2">
            {deadlines.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2 rounded-md ${
                  item.status === "overdue"
                    ? "bg-destructive/10"
                    : item.status === "warning"
                    ? "bg-amber-500/10"
                    : "bg-accent/30"
                }`}
              >
                {item.status === "overdue" ? (
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : item.status === "warning" ? (
                  <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type === "vacancy"
                      ? "Вакансія"
                      : item.type === "case"
                      ? "Кейс"
                      : "Оцінка"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p
                    className={`text-xs font-medium ${
                      item.status === "overdue"
                        ? "text-destructive"
                        : item.status === "warning"
                        ? "text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.daysLeft < 0
                      ? `${Math.abs(item.daysLeft)} дн. тому`
                      : item.daysLeft === 0
                      ? "Сьогодні"
                      : `${item.daysLeft} дн.`}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.deadline}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quality Metrics */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Якісні показники</h3>
          </div>
          <div className="space-y-4">
            {[
              {
                label: "Середній час найму",
                value: "18 днів",
                trend: -12,
                description: "покращення",
              },
              {
                label: "Конверсія кейс → оффер",
                value: "10.6%",
                trend: 5,
                description: "vs минулий квартал",
              },
              {
                label: "Середня оцінка кандидатів",
                value: "72/100",
                trend: 3,
                description: "vs минулий місяць",
              },
              {
                label: "Задоволеність наймом",
                value: "4.2/5",
                trend: 8,
                description: "за відгуками менеджерів",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-md bg-accent/30"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    {item.trend > 0 ? (
                      <TrendingUp className="h-3 w-3 text-chart-2" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-chart-2" />
                    )}
                    <span className="text-xs font-medium text-chart-2">
                      {Math.abs(item.trend)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row - Requests & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Requests */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-foreground">Очікують дій</h3>
            </div>
            <Badge variant="secondary">{6} запитів</Badge>
          </div>
          <div className="space-y-2">
            {[
              {
                title: "Переглянути 3 нових кандидатів",
                type: "candidates",
                priority: "high",
                time: "2 год тому",
              },
              {
                title: "Затвердити кейс для публікації",
                type: "case",
                priority: "medium",
                time: "вчора",
              },
              {
                title: "Призначити оцінку для 5 кандидатів",
                type: "assessment",
                priority: "medium",
                time: "2 дні тому",
              },
              {
                title: "Оновити опис вакансії Backend Dev",
                type: "vacancy",
                priority: "low",
                time: "3 дні тому",
              },
            ].map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.priority === "high"
                      ? "bg-destructive"
                      : item.priority === "medium"
                      ? "bg-amber-500"
                      : "bg-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.title}</p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity by Positions */}
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-primary" />
            <h3 className="font-medium text-foreground">Активність за позиціями</h3>
          </div>
          <div className="space-y-3">
            {[
              { position: "Frontend Developer", applicants: 18, cases: 12, assessments: 8 },
              { position: "Product Manager", applicants: 15, cases: 9, assessments: 5 },
              { position: "UX Designer", applicants: 8, cases: 6, assessments: 4 },
              { position: "Backend Developer", applicants: 6, cases: 3, assessments: 2 },
            ].map((item, index) => (
              <div key={index} className="p-3 rounded-md bg-accent/30">
                <p className="text-sm font-medium text-foreground mb-2">{item.position}</p>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Заявки:</span>
                    <span className="font-medium text-foreground">{item.applicants}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Кейси:</span>
                    <span className="font-medium text-foreground">{item.cases}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Оцінки:</span>
                    <span className="font-medium text-foreground">{item.assessments}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
