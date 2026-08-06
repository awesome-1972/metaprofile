import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, Clock, Target, TrendingUp, Users } from "lucide-react";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecruitingAnalytics } from "@/hooks/ats/use-analytics";

const statusLabel: Record<string, string> = {
  active: "В роботі",
  hired: "Найнято",
  rejected: "Відмова",
  withdrawn: "Відкликано",
  on_hold: "На паузі",
};

export default function AnalyticsPage() {
  const { data: a, isLoading } = useRecruitingAnalytics();

  return (
    <AtsLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Аналітика найму</h1>
          <p className="text-sm text-muted-foreground">Воронка, джерела, офери, відмови та якість — по всіх доступних вакансіях</p>
        </div>

        {isLoading || !a ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : (
          <>
            {/* KPI */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Kpi icon={CheckCircle2} tone="green" label="Найнято" value={a.hired} />
              <Kpi icon={Users} tone="blue" label="У воронці" value={a.activePipeline} />
              <Kpi icon={TrendingUp} tone="primary" label="Прийняття оферів" value={a.offers.acceptanceRate !== null ? `${a.offers.acceptanceRate}%` : "—"} />
              <Kpi icon={Clock} tone="amber" label="Сер. час до найму" value={a.avgTimeToHireDays !== null ? `${a.avgTimeToHireDays} дн` : "—"} />
              <Kpi icon={Target} tone="purple" label="Сер. match-score" value={a.match.avg !== null ? `${a.match.avg}%` : "—"} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Джерела */}
              <Card>
                <CardHeader><CardTitle className="text-base">Кандидати за джерелом</CardTitle></CardHeader>
                <CardContent>
                  {a.sources.length === 0 ? (
                    <Empty />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={Math.max(160, a.sources.length * 34)}>
                        <BarChart data={a.sources} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="source" width={120} tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={22} />
                        </BarChart>
                      </ResponsiveContainer>
                      <table className="w-full text-xs mt-3">
                        <thead className="text-muted-foreground text-left">
                          <tr><th className="py-1">Джерело</th><th>Всього</th><th>Найми</th><th>Конверсія</th></tr>
                        </thead>
                        <tbody>
                          {a.sources.map((s) => (
                            <tr key={s.source} className="border-t">
                              <td className="py-1">{s.source}</td>
                              <td>{s.total}</td>
                              <td>{s.hired}</td>
                              <td>{s.conversion}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Заявки за статусом */}
              <Card>
                <CardHeader><CardTitle className="text-base">Заявки за статусом</CardTitle></CardHeader>
                <CardContent>
                  {a.totalApplications === 0 ? (
                    <Empty />
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart
                        data={Object.entries(a.statusCounts).map(([k, v]) => ({ label: statusLabel[k] ?? k, count: v }))}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Офери */}
              <Card>
                <CardHeader><CardTitle className="text-base">Офери</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Усього оферів" value={a.offers.total} />
                  <Row label="Прийнято" value={a.offers.accepted} />
                  <Row label="Відхилено" value={a.offers.declined} />
                  <Row label="Надіслано (очікують)" value={a.offers.sent} />
                  <Row label="Коефіцієнт прийняття" value={a.offers.acceptanceRate !== null ? `${a.offers.acceptanceRate}%` : "—"} strong />
                </CardContent>
              </Card>

              {/* Причини відмов */}
              <Card>
                <CardHeader><CardTitle className="text-base">Причини відмов (топ)</CardTitle></CardHeader>
                <CardContent>
                  {a.rejectionReasons.length === 0 ? (
                    <Empty />
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(160, a.rejectionReasons.length * 30)}>
                      <BarChart data={a.rejectionReasons.slice(0, 10)} layout="vertical" margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                          {a.rejectionReasons.slice(0, 10).map((_, i) => (
                            <Cell key={i} fill="hsl(var(--destructive))" fillOpacity={0.75} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AtsLayout>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number | string; tone: string }) {
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

function Row({ label, value, strong }: { label: string; value: number | string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-medium pt-1 border-t" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground py-8 text-center">Даних поки немає</p>;
}
