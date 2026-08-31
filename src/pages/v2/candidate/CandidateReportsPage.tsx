// /v2/candidate/reports — результати оцінювання зданих кейсів.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCandidateAssignments } from "@/hooks/useCases";

const statusLabel: Record<string, string> = { submitted: "Здано, очікує оцінки", evaluated: "Оцінено" };

const CandidateReportsPage = () => {
  const { user } = useAuthV2();
  const { assignments, isLoading } = useCandidateAssignments(user?.id ?? null);
  const done = assignments.filter((a) => ["submitted", "evaluated"].includes(a.status));

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Результати</h1>
          <p className="text-muted-foreground mt-1">Оцінки за здані вами кейси</p>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : done.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Поки немає результатів</p>
            <p className="text-sm mt-1">Здайте призначений кейс — результат зʼявиться тут після оцінки</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {done.map((a) => (
              <Link key={a.id} to={`/v2/candidate/cases/${a.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.case?.title || "Кейс"}</p>
                      <p className="text-xs text-muted-foreground">{a.case?.position_title || ""}</p>
                    </div>
                    <Badge variant={a.status === "evaluated" ? "default" : "outline"}>{statusLabel[a.status] || a.status}</Badge>
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

export default CandidateReportsPage;
