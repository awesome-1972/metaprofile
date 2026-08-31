// /v2/candidate/portfolio — «портфоліо»: завершені кандидатом кейси як його роботи.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCandidateAssignments } from "@/hooks/useCases";

const CandidatePortfolioPage = () => {
  const { user } = useAuthV2();
  const { assignments, isLoading } = useCandidateAssignments(user?.id ?? null);
  // Портфоліо = виконані (здані/оцінені) кейси кандидата.
  const done = assignments.filter((a) => ["submitted", "evaluated"].includes(a.status));

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Портфоліо</h1>
          <p className="text-muted-foreground mt-1">Ваші виконані кейси — портфоліо практичних робіт</p>
        </div>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : done.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Портфоліо поки порожнє</p>
            <p className="text-sm mt-1">Виконані кейси автоматично збиратимуться сюди як ваші роботи</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {done.map((a) => (
              <Link key={a.id} to={`/v2/candidate/cases/${a.id}`} className="block">
                <Card className="hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{a.case?.title || "Кейс"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{a.case?.position_title || ""}</p>
                    <Badge variant="outline" className="mt-2">{a.status === "evaluated" ? "Оцінено" : "Здано"}</Badge>
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

export default CandidatePortfolioPage;
