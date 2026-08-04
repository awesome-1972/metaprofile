import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Briefcase, CheckCircle2, Clock, Users } from "lucide-react";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVacancies, type VacancyStatus } from "@/hooks/ats/use-vacancies";

const ACTIVE_STATUSES: VacancyStatus[] = ["draft", "open", "on_hold"];

const statusLabel: Record<VacancyStatus, string> = {
  draft: "Чернетки",
  open: "Відкриті",
  on_hold: "На паузі",
  filled: "Закриті наймом",
  closed: "Закриті",
  cancelled: "Скасовані",
};

const priorityLabel: Record<string, string> = {
  urgent: "Терміново",
  high: "Високий",
  normal: "Звичайний",
};

export default function AtsDashboardPage() {
  const { data: vacancies, isLoading } = useVacancies();

  const stats = useMemo(() => {
    const list = vacancies ?? [];
    const activeVacancies = list.filter((v) => ACTIVE_STATUSES.includes(v.status));
    const candidatesInWork = list.reduce((sum, v) => sum + (v.applications_count ?? 0), 0);
    const pendingApproval = list.filter((v) => v.approval_status === "pending_approval");
    const filled = list.filter((v) => v.status === "filled");

    // Активні вакансії з високим/терміновим пріоритетом — на них варто дивитись першими.
    const urgent = activeVacancies
      .filter((v) => {
        const p = (v as unknown as { priority?: string }).priority;
        return p === "urgent" || p === "high";
      })
      .sort((a, b) => {
        const pa = (a as unknown as { priority?: string }).priority === "urgent" ? 0 : 1;
        const pb = (b as unknown as { priority?: string }).priority === "urgent" ? 0 : 1;
        return pa - pb;
      });

    const byStatus = (Object.keys(statusLabel) as VacancyStatus[])
      .map((status) => ({ status, label: statusLabel[status], count: list.filter((v) => v.status === status).length }))
      .filter((s) => s.count > 0);

    return { total: list.length, activeVacancies, candidatesInWork, pendingApproval, filled, urgent, byStatus };
  }, [vacancies]);

  return (
    <AtsLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Дашборд</h1>
          <p className="text-sm text-muted-foreground">Огляд роботи агенції — вакансії, кандидати, що потребує уваги</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KpiCard icon={Briefcase} label="Активні вакансії" value={stats.activeVacancies.length} tone="primary" />
              <KpiCard icon={Users} label="Кандидатів у роботі" value={stats.candidatesInWork} tone="blue" />
              <KpiCard icon={Clock} label="На затвердженні" value={stats.pendingApproval.length} tone="amber" />
              <KpiCard icon={CheckCircle2} label="Закрито наймом" value={stats.filled.length} tone="green" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Вакансії за статусом</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.byStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">Ще немає вакансій</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={stats.byStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Потребує уваги</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TaskGroup
                    title="Чекають на затвердження"
                    items={stats.pendingApproval.map((v) => ({
                      id: v.id,
                      title: v.title,
                      subtitle: v.hiring_project?.client?.name ?? v.hiring_project?.name ?? "",
                    }))}
                    empty="Немає заявок на затвердження"
                    tone="amber"
                  />
                  <TaskGroup
                    title="Пріоритетні вакансії"
                    items={stats.urgent.map((v) => ({
                      id: v.id,
                      title: v.title,
                      subtitle: v.hiring_project?.client?.name ?? v.hiring_project?.name ?? "",
                      badge: priorityLabel[(v as unknown as { priority?: string }).priority ?? "normal"],
                    }))}
                    empty="Немає термінових вакансій"
                    tone="red"
                  />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AtsLayout>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Briefcase;
  label: string;
  value: number;
  tone: "primary" | "blue" | "amber" | "green";
}) {
  const toneClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskGroup({
  title,
  items,
  empty,
  tone,
}: {
  title: string;
  items: { id: string; title: string; subtitle?: string; badge?: string }[];
  empty: string;
  tone: "amber" | "red";
}) {
  const dot = tone === "amber" ? "text-amber-500" : "text-red-500";
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link
                to={`/ats/vacancies/${item.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
              >
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${dot}`} />
                <span className="flex-1 truncate">{item.title}</span>
                {item.subtitle && <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>}
                {item.badge && <Badge className="text-[10px]">{item.badge}</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
