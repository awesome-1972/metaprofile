import { useMemo } from "react";
import { Building2, Briefcase, Users, User, ShieldCheck } from "lucide-react";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDistributionCounts } from "@/hooks/ats/use-distribution";
import { useGrants } from "@/hooks/ats/use-grants";

const scopeLabel: Record<string, string> = {
  client: "Клієнт",
  hiring_project: "Проєкт найму",
  vacancy: "Вакансія",
};

export default function DistributionPage() {
  const { data: counts, isLoading } = useDistributionCounts();
  const { data: grants } = useGrants();

  const activeGrants = useMemo(() => (grants ?? []).filter((g) => g.is_active), [grants]);
  const byUser = useMemo(() => {
    const m = new Map<string, number>();
    activeGrants.forEach((g) => m.set(g.user_email ?? g.user_id, (m.get(g.user_email ?? g.user_id) ?? 0) + 1));
    return [...m.entries()].map(([email, count]) => ({ email, count })).sort((a, b) => b.count - a.count);
  }, [activeGrants]);

  return (
    <AtsLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Розподіл доступів і ресурсів</h1>
          <p className="text-sm text-muted-foreground">
            Поточний робочий простір (тенант). Показано клієнтів, проєкти, вакансії й гранти доступу в його межах.
          </p>
        </div>

        {isLoading || !counts ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Kpi icon={Building2} tone="primary" label="Клієнти" value={counts.clients} />
            <Kpi icon={Briefcase} tone="blue" label="Проєкти найму" value={counts.projects} />
            <Kpi icon={Users} tone="green" label="Вакансії" value={counts.vacancies} />
            <Kpi icon={User} tone="purple" label="Кандидати" value={counts.candidates} />
            <Kpi icon={ShieldCheck} tone="amber" label="Активні гранти" value={activeGrants.length} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Розподіл доступів (гранти)</CardTitle></CardHeader>
            <CardContent>
              {activeGrants.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Явних грантів немає (owner/admin бачать усе за замовчуванням)</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Користувач</TableHead>
                      <TableHead>Об'єкт</TableHead>
                      <TableHead>Назва</TableHead>
                      <TableHead>Права</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeGrants.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="text-sm">{g.user_email ?? g.user_id}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{scopeLabel[g.scope_type] ?? g.scope_type}</Badge></TableCell>
                        <TableCell className="text-sm">{g.scope_name ?? "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Badge className="text-[10px] bg-slate-200 text-slate-700">Перегляд</Badge>
                            {g.can_edit && <Badge className="text-[10px] bg-blue-100 text-blue-800">Редагування</Badge>}
                            {g.can_view_financials && <Badge className="text-[10px] bg-amber-100 text-amber-800">Фінанси</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Гранти на користувача</CardTitle></CardHeader>
            <CardContent>
              {byUser.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Немає даних</p>
              ) : (
                <ul className="space-y-1.5">
                  {byUser.map((u) => (
                    <li key={u.email} className="flex items-center justify-between text-sm">
                      <span className="truncate">{u.email}</span>
                      <Badge variant="outline" className="text-[10px]">{u.count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AtsLayout>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: string }) {
  const toneClass: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-semibold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
