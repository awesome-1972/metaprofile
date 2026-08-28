// /v2/company/projects — «Проєкти найму»: зведений огляд найму компанії
// (кейси/кандидати/результати) + швидкі переходи. Прямого звʼязку вакансій із
// компанією у моделі поки немає, тож проєкти показуємо через кейси-ініціативи.
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, BarChart3, ArrowRight } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const CompanyProjectsPage = () => {
  const { user } = useAuthV2();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ cases: 0, active: 0, candidates: 0, results: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const { data: comp } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
        if (!comp) { setLoading(false); return; }
        const { data: cs } = await supabase.from("cases").select("id, status").eq("company_id", comp.id);
        const caseIds = (cs ?? []).map((c: any) => c.id);
        let candidates = 0, results = 0;
        if (caseIds.length) {
          const { count: aCount } = await supabase.from("case_assignments")
            .select("id", { count: "exact", head: true }).in("case_id", caseIds);
          const { count: sCount } = await supabase.from("case_submissions")
            .select("id", { count: "exact", head: true }).in("case_id", caseIds);
          candidates = aCount ?? 0; results = sCount ?? 0;
        }
        setStats({
          cases: (cs ?? []).length,
          active: (cs ?? []).filter((c: any) => c.status === "active").length,
          candidates, results,
        });
      } catch { /* графічно лишаємо нулі */ }
      finally { setLoading(false); }
    })();
  }, [user?.id]);

  const cards = [
    { label: "Кейси", value: stats.cases, sub: `${stats.active} активних`, icon: Briefcase, to: "/v2/company/cases" },
    { label: "Кандидати", value: stats.candidates, sub: "призначено кейсів", icon: Users, to: "/v2/company/candidates" },
    { label: "Результати", value: stats.results, sub: "здані кейси", icon: BarChart3, to: "/v2/company/reports" },
  ];

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">Проєкти найму</h1>
          <p className="text-muted-foreground mt-1">Зведений огляд ваших процесів найму</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {cards.map((c) => (
            <Card key={c.label} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(c.to)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="flex items-center gap-2"><c.icon className="h-4 w-4" />{c.label}</CardDescription>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <CardTitle className="text-3xl">{loading ? "…" : c.value}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-xs text-muted-foreground">{c.sub}</p></CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="py-8 text-center">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Проєкти найму формуються з ваших кейсів та кандидатів. Створіть кейс і призначте
              його кандидатам — прогрес відображатиметься тут.
            </p>
            <Button className="mt-4" onClick={() => navigate("/v2/company")}>Перейти до дашборду</Button>
          </CardContent>
        </Card>
      </div>
    </V2AppLayout>
  );
};

export default CompanyProjectsPage;
