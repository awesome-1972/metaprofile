import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Building2, 
  User, 
  GraduationCap, 
  Shield, 
  ChevronRight,
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  BookOpen,
  Compass,
  Target,
  Briefcase,
  LogOut,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  role: "company" | "professional" | "student" | "veteran";
}

const roleConfig = {
  company: {
    title: "Компанія",
    icon: Building2,
    color: "text-primary",
    navItems: [
      { path: "/company", label: "Дашборд", icon: LayoutDashboard },
      { path: "/company/vacancies", label: "Вакансії", icon: Briefcase },
      { path: "/company/cases", label: "Кейси", icon: FileText },
      { path: "/company/interns", label: "Запроси стажера", icon: GraduationCap },
      { path: "/company/candidates", label: "Кандидати", icon: Users },
      { path: "/company/analytics", label: "Аналітика", icon: BarChart3 },
    ],
  },
  professional: {
    title: "Професіонал",
    icon: User,
    color: "text-primary",
    navItems: [
      { path: "/professional", label: "Дашборд", icon: LayoutDashboard },
      { path: "/professional/cases", label: "Відкриті кейси", icon: FileText },
      { path: "/professional/assessments", label: "Оцінювання", icon: Target },
      { path: "/professional/learning", label: "Навчання", icon: BookOpen },
      { path: "/professional/profile", label: "Мій профіль", icon: User },
    ],
  },
  student: {
    title: "Студент",
    icon: GraduationCap,
    color: "text-primary",
    navItems: [
      { path: "/student", label: "Дашборд", icon: LayoutDashboard },
      { path: "/student/orientation", label: "Профорієнтація", icon: Compass },
      { path: "/student/professions", label: "Професії", icon: Briefcase },
      { path: "/student/internship", label: "Міні-стажування", icon: Target },
      { path: "/student/profile", label: "Мій профіль", icon: User },
      { path: "/student/feedback", label: "Зворотний зв'язок", icon: BarChart3 },
    ],
  },
  veteran: {
    title: "Ветеран",
    icon: Shield,
    color: "text-primary",
    navItems: [
      { path: "/veteran", label: "Дашборд", icon: LayoutDashboard },
      { path: "/veteran/skills", label: "Оцінка навичок", icon: Target },
      { path: "/veteran/matching", label: "Підбір професій", icon: Compass },
      { path: "/veteran/adaptation", label: "Адаптація", icon: BookOpen },
      { path: "/veteran/profile", label: "Мій профіль", icon: User },
      { path: "/veteran/internship", label: "Стажування", icon: Briefcase },
    ],
  },
};

export const AppLayout = ({ children, role }: AppLayoutProps) => {
  const location = useLocation();
  const config = roleConfig[role];
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground">Metaprofile</span>
          </Link>
        </div>

        {/* Role indicator */}
        <div className="px-4 py-3 border-b border-border bg-accent/50">
          <div className="flex items-center gap-2 text-sm">
            <RoleIcon className={cn("h-4 w-4", config.color)} />
            <span className="text-muted-foreground">{config.title}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {config.navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-border space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Вийти
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
