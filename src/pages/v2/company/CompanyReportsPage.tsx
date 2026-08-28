// /v2/company/reports — результати (здані кейси) кандидатів компанії.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Row { id: string; name: string; caseTitle: string; status: string; created_at: string }

const CompanyReportsPage = () => {
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
        const { data: subs } = await supabase
          .from("case_submissions").select("id, case_id, candidate_id, status, created_at").in("case_id", caseIds);
        const candIds = [...new Set((subs ?? []).map((s: any) => s.candidate_id).filter(Boolean))];
        const { data: cands } = candIds.length
          ? await supabase.from("candidates").select("id, full_name").in("id", candIds)
          : { data: [] as any[] };
        const candMap = new Map((cands ?? []).map((c: any) => [c.id, c.full_name]));
        setRows((subs ?? []).map((s: any) => ({
          id: s.id, name: candMap.get(s.candidate_id) || "—",
          caseTitle: caseMap.get(s.case_id) || "—", status: s.status || "submitted", created_at: s.created_at,
        })));
      } catch { setRows([]); }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Звіти</h1>
          <p className="text-muted-foreground mt-1">Результати виконання кейсів кандидатами</p>
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Поки немає результатів</p>
            <p className="text-sm mt-1">Тут з'являться здані кандидатами кейси з результатами</p>
          </CardContent></Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id}><CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">кейс: {r.caseTitle} · {new Date(r.created_at).toLocaleDateString("uk-UA")}</p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>
    </V2AppLayout>
  );
};

export default CompanyReportsPage;
