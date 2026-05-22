import { useState, useEffect } from "react";
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Clock, Building2, CheckCircle2, Hourglass, CircleDot } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { getCandidateAssignments } from "@/lib/candidateApi";
import { type CandidateAssignment } from "@/lib/api";
import { toast } from "sonner";

// ── Status helpers ─────────────────────────────────────────────────────────────
const statusLabel: Record<string, string> = {
  pending: "Очікує",
  in_progress: "В роботі",
  submitted: "Здано",
  evaluated: "Оцінено",
  expired: "Прострочено",
};

const statusColor: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  submitted: "bg-green-100 text-green-800",
  evaluated: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-700",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "submitted" || status === "evaluated")
    return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "in_progress")
    return <Hourglass className="h-4 w-4 text-yellow-600" />;
  return <CircleDot className="h-4 w-4 text-blue-600" />;
};

// ── Component ──────────────────────────────────────────────────────────────────
const CandidateDashboard = () => {
  const { profile } = useAuthV2();
  const [assignments, setAssignments] = useState<CandidateAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCandidateAssignments()
      .then(data => setAssignments(data))
      .catch(() => toast.error("Помилка завантаження кейсів"))
      .finally(() => setIsLoading(false));
  }, []);

  const pending = assignments.filter((a) => a.status === "pending").length;
  const inProgress = assignments.filter((a) => a.status === "in_progress").length;
  const submitted = assignments.filter((a) => ["submitted", "evaluated"].includes(a.status)).length;

  const activeAssignments = assignments.filter(
    (a) => a.status === "pending" || a.status === "in_progress"
  );
  const completedAssignments = assignments.filter(
    (a) => a.status === "submitted" || a.status === "evaluated"
  );

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            Вітаємо, {profile?.full_name || "Кандидат"}!
          </h1>
          <p className="text-muted-foreground mt-1">Ваш особистий кабінет кандидата</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Нових кейсів</CardDescription>
              <CardTitle className="text-3xl">{pending + inProgress}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Очікують виконання</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Виконано</CardDescription>
              <CardTitle className="text-3xl">{submitted}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Здано на оцінку</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Всього</CardDescription>
              <CardTitle className="text-3xl">{assignments.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Призначених кейсів</p>
            </CardContent>
          </Card>
        </div>

        {/* Active cases */}
        <div className="mb-8">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Активні кейси
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : activeAssignments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Вам поки не призначено жодного кейсу</p>
                <p className="text-sm mt-1">Коли компанія запросить вас — кейс з'явиться тут</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((a) => (
                <Card key={a.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon status={a.status} />
                          <span className="font-medium text-foreground truncate">
                            {a.case?.title || "Кейс"}
                          </span>
                          <Badge className={statusColor[a.status] || ""}>
                            {statusLabel[a.status] || a.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {a.case?.company?.name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {a.case.company.name}
                            </span>
                          )}
                          {a.case?.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              ~{a.case.duration_minutes} хв
                            </span>
                          )}
                          {a.case?.difficulty_level && (
                            <span className="capitalize">{a.case.difficulty_level}</span>
                          )}
                        </div>
                        {a.deadline && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Дедлайн: {new Date(a.deadline).toLocaleDateString("uk-UA")}
                          </p>
                        )}
                      </div>
                      <Button size="sm" asChild>
                        <Link to={`/v2/candidate/cases/${a.id}`}>
                          {a.status === "in_progress" ? "Продовжити" : "Виконати"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed cases */}
        {completedAssignments.length > 0 && (
          <div>
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Виконані кейси
            </h2>
            <div className="space-y-3">
              {completedAssignments.map((a) => (
                <Card key={a.id} className="opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium truncate">{a.case?.title || "Кейс"}</span>
                          <Badge className={statusColor[a.status] || ""}>
                            {statusLabel[a.status] || a.status}
                          </Badge>
                        </div>
                        {a.case?.company?.name && (
                          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {a.case.company.name}
                          </p>
                        )}
                        {a.submitted_at && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Здано: {new Date(a.submitted_at).toLocaleDateString("uk-UA")}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* AI Disclaimer */}
        <div className="mt-8 p-4 bg-accent/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>AI-аналітика:</strong> Платформа використовує AI для аналізу відповідей.
            Рівень AI-втручання відображається у звітах.
          </p>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CandidateDashboard;
