import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Users, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Briefcase,
  TrendingUp,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { Link } from "react-router-dom";

interface Vacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  hiringManager: string;
  createdAt: string;
  deadline: string;
  daysLeft: number;
  candidates: number;
  newCandidates: number;
  status: "open" | "in_progress" | "paused" | "closed";
  priority: "high" | "medium" | "low";
  salary?: string;
}

const vacancies: Vacancy[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    department: "Engineering",
    location: "Київ / Remote",
    type: "full-time",
    hiringManager: "Олена Петренко",
    createdAt: "2025-01-10",
    deadline: "2025-02-15",
    daysLeft: 21,
    candidates: 47,
    newCandidates: 5,
    status: "open",
    priority: "high",
    salary: "$3,500 - $5,000"
  },
  {
    id: "2",
    title: "Product Manager",
    department: "Product",
    location: "Київ",
    type: "full-time",
    hiringManager: "Андрій Коваль",
    createdAt: "2025-01-05",
    deadline: "2025-02-01",
    daysLeft: 7,
    candidates: 23,
    newCandidates: 2,
    status: "in_progress",
    priority: "high",
    salary: "$4,000 - $6,000"
  },
  {
    id: "3",
    title: "UX/UI Designer",
    department: "Design",
    location: "Remote",
    type: "full-time",
    hiringManager: "Марія Шевченко",
    createdAt: "2025-01-15",
    deadline: "2025-03-01",
    daysLeft: 35,
    candidates: 15,
    newCandidates: 8,
    status: "open",
    priority: "medium",
    salary: "$2,500 - $4,000"
  },
  {
    id: "4",
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Київ / Remote",
    type: "full-time",
    hiringManager: "Олена Петренко",
    createdAt: "2024-12-20",
    deadline: "2025-01-20",
    daysLeft: -5,
    candidates: 31,
    newCandidates: 0,
    status: "paused",
    priority: "low",
    salary: "$3,000 - $4,500"
  },
  {
    id: "5",
    title: "QA Engineer",
    department: "Engineering",
    location: "Львів",
    type: "full-time",
    hiringManager: "Ігор Мельник",
    createdAt: "2025-01-12",
    deadline: "2025-02-20",
    daysLeft: 26,
    candidates: 12,
    newCandidates: 3,
    status: "open",
    priority: "medium",
    salary: "$2,000 - $3,500"
  },
  {
    id: "6",
    title: "Data Analyst",
    department: "Analytics",
    location: "Remote",
    type: "contract",
    hiringManager: "Наталія Бондар",
    createdAt: "2025-01-18",
    deadline: "2025-02-28",
    daysLeft: 34,
    candidates: 8,
    newCandidates: 4,
    status: "open",
    priority: "low",
    salary: "$2,500 - $3,500"
  }
];

const getStatusConfig = (status: Vacancy["status"]) => {
  switch (status) {
    case "open":
      return { label: "Відкрита", variant: "default" as const, className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
    case "in_progress":
      return { label: "В роботі", variant: "secondary" as const, className: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "paused":
      return { label: "Призупинено", variant: "outline" as const, className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "closed":
      return { label: "Закрита", variant: "secondary" as const, className: "bg-muted text-muted-foreground" };
  }
};

const getPriorityConfig = (priority: Vacancy["priority"]) => {
  switch (priority) {
    case "high":
      return { label: "Високий", className: "bg-red-500/10 text-red-600 border-red-500/20" };
    case "medium":
      return { label: "Середній", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
    case "low":
      return { label: "Низький", className: "bg-muted text-muted-foreground" };
  }
};

const getTypeLabel = (type: Vacancy["type"]) => {
  switch (type) {
    case "full-time": return "Повна зайнятість";
    case "part-time": return "Часткова зайнятість";
    case "contract": return "Контракт";
    case "remote": return "Віддалено";
  }
};

const VacancyCard = ({ vacancy }: { vacancy: Vacancy }) => {
  const statusConfig = getStatusConfig(vacancy.status);
  const priorityConfig = getPriorityConfig(vacancy.priority);
  const isOverdue = vacancy.daysLeft < 0;
  const isUrgent = vacancy.daysLeft > 0 && vacancy.daysLeft <= 7;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-lg">{vacancy.title}</CardTitle>
              {vacancy.newCandidates > 0 && (
                <Badge variant="default" className="text-xs">
                  +{vacancy.newCandidates} нових
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {vacancy.department}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {vacancy.location}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span><strong>{vacancy.candidates}</strong> кандидатів</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="truncate">{vacancy.hiringManager}</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-destructive' : isUrgent ? 'text-amber-600' : ''}`}>
            {isOverdue ? (
              <AlertTriangle className="h-4 w-4" />
            ) : isUrgent ? (
              <Clock className="h-4 w-4" />
            ) : (
              <Calendar className="h-4 w-4 text-muted-foreground" />
            )}
            <span>
              {isOverdue 
                ? `Прострочено ${Math.abs(vacancy.daysLeft)} дн.`
                : `${vacancy.daysLeft} днів`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={priorityConfig.className}>
              {priorityConfig.label}
            </Badge>
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{getTypeLabel(vacancy.type)}</span>
            {vacancy.salary && (
              <span className="font-medium text-foreground">{vacancy.salary}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/company/vacancies/${vacancy.id}`}>
                Переглянути
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link to={`/company/vacancies/${vacancy.id}/candidates`}>
                Кандидати
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CompanyVacancies = () => {
  const openCount = vacancies.filter(v => v.status === "open").length;
  const inProgressCount = vacancies.filter(v => v.status === "in_progress").length;
  const overdueCount = vacancies.filter(v => v.daysLeft < 0).length;
  const totalCandidates = vacancies.reduce((sum, v) => sum + v.candidates, 0);

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вакансії</h1>
            <p className="text-muted-foreground mt-1">Управління відкритими позиціями</p>
          </div>
          <Button asChild>
            <Link to="/company/vacancies/create">
              <Plus className="h-4 w-4 mr-2" />
              Додати вакансію
            </Link>
          </Button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{openCount}</p>
                  <p className="text-sm text-muted-foreground">Відкритих</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{inProgressCount}</p>
                  <p className="text-sm text-muted-foreground">В роботі</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{overdueCount}</p>
                  <p className="text-sm text-muted-foreground">Прострочено</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalCandidates}</p>
                  <p className="text-sm text-muted-foreground">Кандидатів</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vacancies list */}
        <div className="space-y-4">
          {vacancies.map((vacancy) => (
            <VacancyCard key={vacancy.id} vacancy={vacancy} />
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default CompanyVacancies;
