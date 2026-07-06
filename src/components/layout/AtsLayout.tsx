import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Building2, Briefcase, LogOut, User, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { Skeleton } from "@/components/ui/skeleton";

interface AtsLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: "/ats/clients", label: "Клієнти", icon: Building2 },
  { path: "/ats/projects", label: "Проекти найму", icon: Briefcase },
  { path: "/ats/vacancies", label: "Вакансії", icon: Users },
  { path: "/ats/candidates", label: "Кандидати", icon: User },
];

// "Доступи" — лише admin/owner (мірор allowedRoles на маршруті /ats/access у App.tsx).
const adminOnlyNavItems = [{ path: "/ats/access", label: "Доступи", icon: ShieldCheck }];

export const AtsLayout = ({ children }: AtsLayoutProps) => {
  const location = useLocation();
  const { profile, signOut, isLoading, getPrimaryRole } = useAuthV2();
  const primaryRole = getPrimaryRole();
  const isAdminLike = primaryRole === "admin" || primaryRole === "owner";

  const roleLabel =
    primaryRole === "owner"
      ? "Власник"
      : primaryRole === "admin"
        ? "Адміністратор"
        : primaryRole === "recruiter"
          ? "Рекрутер"
          : primaryRole === "assistant"
            ? "Асистент"
            : "Користувач";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/ats/clients" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">A</span>
            </div>
            <div>
              <span className="font-semibold text-foreground">Metaprofile</span>
              <span className="text-xs text-muted-foreground ml-1">ATS</span>
            </div>
          </Link>
        </div>

        <div className="px-4 py-3 border-b border-border bg-accent/50">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">{roleLabel}</span>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {isAdminLike &&
              adminOnlyNavItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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

        <div className="p-4 border-t border-border space-y-3">
          {isLoading ? (
            <div className="flex items-center gap-3 px-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : (
            profile && (
              <div className="flex items-center gap-3 px-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.full_name || "Користувач"}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                </div>
              </div>
            )
          )}
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Вийти
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};
