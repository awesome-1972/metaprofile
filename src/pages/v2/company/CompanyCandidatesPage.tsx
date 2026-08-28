// /v2/company/candidates — кандидати, яким компанія призначала кейси.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Row { id: string; name: string; email: string | null; status: string; caseTitle: string; created_at: string }

const statusLabel: Record<string, string> = {
  assigned: "Призначено", in_progress: "У процесі", submitted: "Здано", reviewed: "Переглянуто",
};

const CompanyCandidatesPage = () => {
  const { user } = useAuthV2();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
        if (!comp) { setRows([]); return; }
        const { data: cs } = await supabase.from("cases").select("id, title").eq("company_id", comp.id);
        const caseMap = new Map((cs ?? []).map((c: any) => [c.id, c.title]));
        const caseIds = [...caseMap.keys()];
        if (caseIds.length === 0) { setRows([]); return; }
        const { data: asgn } = await supabase
          .from("case_assignments").select("id, candidate_id, case_id, status, created_at").in("case_id", caseIds);
        const candIds = [...new Set((asgn ?? []).map((a: any) => a.candidate_id).filter(Boolean))];
        const { data: cands } = candIds.length
          ? await supabase.from("candidates").select("id, full_name, email").in("id", candIds)
          : { data: [] as any[] };
        const candMap = new Map((cands ?? []).map((c: any) => [c.id, c]));
        setRows((asgn ?? []).map((a: any) => ({
          id: a.id,
          name: candMap.get(a.candidate_id)?.full_name || "—",
          email: candMap.get(a.candidate_id)?.email || null,
          status: a.status, caseTitle: caseMap.get(a.case_id) || "—", created_at: a.created_at,
        })));
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Кандидати</h1>
          <p className="text-muted-foreground mt-1">Кандидати, яким призначено ваші кейси</p>
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Поки немає кандидатів</p>
            <p className="text-sm mt-1">Призначте кейс кандидату на дашборді — він з'явиться тут</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id}><CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.email || "—"} · кейс: {r.caseTitle}</p>
                </div>
                <Badge variant="outline">{statusLabel[r.status] || r.status}</Badge>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </V2AppLayout>
  );
};

export default CompanyCandidatesPage;
