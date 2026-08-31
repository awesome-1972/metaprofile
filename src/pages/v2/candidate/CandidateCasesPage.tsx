// /v2/candidate/cases — усі призначені кандидату кейси.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCandidateAssignments } from "@/hooks/useCases";

const statusLabel: Record<string, string> = {
  pending: "Очікує", in_progress: "В роботі", submitted: "Здано", evaluated: "Оцінено", expired: "Прострочено",
};
const statusColor: Record<string, string> = {
  pending: "bg-blue-100 text-blue-800", in_progress: "bg-yellow-100 text-yellow-800",
  submitted: "bg-green-100 text-green-800", evaluated: "bg-purple-100 text-purple-800", expired: "bg-red-100 text-red-700",
};

const CandidateCasesPage = () => {
  const { user } = useAuthV2();
  const { assignments, isLoading } = useCandidateAssignments(user?.id ?? null);

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Мої кейси</h1>
          <p className="text-muted-foreground mt-1">Практичні кейси, призначені вам компаніями</p>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : assignments.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Поки немає призначених кейсів</p>
            <p className="text-sm mt-1">Коли компанія призначить вам кейс — він зʼявиться тут</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <Link key={a.id} to={`/v2/candidate/cases/${a.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{a.case?.title || "Кейс"}</span>
                          <Badge className={statusColor[a.status] || ""}>{statusLabel[a.status] || a.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          {a.case?.position_title ? <span>{a.case.position_title}</span> : null}
                          {a.case?.duration_minutes ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.case.duration_minutes} хв</span> : null}
                          {a.deadline ? <span>до {new Date(a.deadline).toLocaleDateString("uk-UA")}</span> : null}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </V2AppLayout>
  );
};

export default CandidateCasesPage;
