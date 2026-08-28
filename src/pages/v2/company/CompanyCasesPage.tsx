// /v2/company/cases — список кейсів компанії (створення — на дашборді).
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Send } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCompanyCases } from "@/hooks/useCases";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const statusLabel: Record<string, string> = { draft: "Чернетка", active: "Активний", archived: "Архів" };
const statusColor: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700", active: "bg-green-100 text-green-800", archived: "bg-red-100 text-red-700",
};

const CompanyCasesPage = () => {
  const { user } = useAuthV2();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { cases, isLoading, publishCase, archiveCase } = useCompanyCases(companyId);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setCompanyId(data.id); });
  }, [user?.id]);

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Кейси</h1>
            <p className="text-muted-foreground mt-1">Практичні кейси для оцінки кандидатів</p>
          </div>
          <Button onClick={() => navigate("/v2/company")}>
            <Plus className="h-4 w-4 mr-2" />Створити кейс
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : cases.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Ще немає кейсів</p>
            <p className="text-sm mt-1">Створіть перший кейс на дашборді</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {cases.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{c.title}</span>
                        <Badge className={statusColor[c.status] || ""}>{statusLabel[c.status] || c.status}</Badge>
                        <Badge variant="outline">{c.difficulty}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.tasks.length} завдань · {c.duration_minutes} хв{c.position_title ? ` · ${c.position_title}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.status === "draft" && <Button size="sm" variant="outline" onClick={() => publishCase(c.id)}>Опублікувати</Button>}
                      {c.status === "active" && <Button size="sm" variant="ghost" onClick={() => archiveCase(c.id)}>Архівувати</Button>}
                      <Button size="sm" onClick={() => navigate("/v2/company")}><Send className="h-3.5 w-3.5 mr-1" />Призначити</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </V2AppLayout>
  );
};

export default CompanyCasesPage;
