// src/components/ats/ListsTab.tsx
//
// Вкладка «Списки» — Long list / Short list як СТАНИ заявки
// (roadmap-ATS-platform.md розділ 2, MVP+). Три колонки:
//   • «У воронці» — активні заявки, ще не винесені в списки (list_state='none');
//   • «Long list» — маса на розгляді;
//   • «Short list» — фінал для клієнта.
// Стан ортогональний до стадії воронки: кандидат може бути на стадії
// 'interview' І в short_list. Промоушен пише подію в append-only журнал
// (серверний тригер mp_log_list_state_change).
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, ListChecks, Star, Users, X } from "lucide-react";
import { usePipelineStages } from "@/hooks/ats/use-pipeline";
import {
  useApplications,
  useSetListState,
  type ApplicationWithCandidate,
  type ListState,
} from "@/hooks/ats/use-applications";

interface ListsTabProps {
  vacancyId: string;
}

const columnMeta: { key: ListState; title: string; icon: typeof Users; hint: string }[] = [
  { key: "none", title: "У воронці", icon: Users, hint: "Активні заявки, ще не в списках" },
  { key: "long_list", title: "Long list", icon: ListChecks, hint: "Маса на розгляді" },
  { key: "short_list", title: "Short list", icon: Star, hint: "Фінал для клієнта" },
];

export function ListsTab({ vacancyId }: ListsTabProps) {
  const { data: applications, isLoading } = useApplications(vacancyId);
  const { data: stages } = usePipelineStages(vacancyId);
  const setListState = useSetListState();

  const stageName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of stages ?? []) map.set(s.id, s.name);
    return map;
  }, [stages]);

  const buckets = useMemo(() => {
    const result: Record<ListState, ApplicationWithCandidate[]> = {
      none: [],
      long_list: [],
      short_list: [],
    };
    for (const app of applications ?? []) {
      // Завершені заявки (hired/rejected/withdrawn) у колонці «У воронці» не
      // показуємо — списки про активний розгляд.
      if (app.list_state === "none" && app.status !== "active") continue;
      result[app.list_state].push(app);
    }
    return result;
  }, [applications]);

  const move = (app: ApplicationWithCandidate, listState: ListState) => {
    setListState.mutate({ applicationId: app.id, vacancyId, listState });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Завантаження списків...</div>;
  }

  const hasAny = (applications ?? []).length > 0;
  if (!hasAny) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          Ще немає заявок. Додайте кандидатів у вкладці «Воронка» — тут можна буде виносити їх у long/short list.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Long list — маса на розгляді, Short list — фінал для клієнта. Стан списку не залежить від стадії воронки:
        кандидат може бути й на інтервʼю, і в short list одночасно.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columnMeta.map(({ key, title, icon: Icon, hint }) => {
          const cards = buckets[key];
          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-medium text-sm flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {title}
                </h3>
                <Badge variant="outline" className="text-xs">
                  {cards.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground px-1">{hint}</p>
              <div className="space-y-2 min-h-[100px] rounded-lg bg-muted/30 p-2">
                {cards.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">Порожньо</div>
                ) : (
                  cards.map((app) => (
                    <Card key={app.id} className="shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <Link
                          to={`/ats/candidates/${app.candidate_id}`}
                          className="font-medium text-sm hover:underline block truncate"
                        >
                          {app.candidate?.full_name ?? "Без імені"}
                        </Link>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>{app.candidate?.source?.name ?? "Джерело невідоме"}</div>
                          <div>
                            Стадія: {app.current_stage_id ? stageName.get(app.current_stage_id) ?? "—" : "—"}
                          </div>
                        </div>
                        {app.shortlist_override && (
                          <Badge className="text-[10px] bg-blue-100 text-blue-800">Ручний override</Badge>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {key !== "long_list" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={setListState.isPending}
                              onClick={() => move(app, "long_list")}
                            >
                              {key === "short_list" ? <ArrowLeft className="h-3.5 w-3.5 mr-1" /> : <ArrowRight className="h-3.5 w-3.5 mr-1" />}
                              Long
                            </Button>
                          )}
                          {key !== "short_list" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={setListState.isPending}
                              onClick={() => move(app, "short_list")}
                            >
                              <Star className="h-3.5 w-3.5 mr-1" />
                              Short
                            </Button>
                          )}
                          {key !== "none" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-muted-foreground"
                              disabled={setListState.isPending}
                              onClick={() => move(app, "none")}
                              title="Прибрати зі списків"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
