import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Circle, CalendarRange } from "lucide-react";
import { useVacancyBrief } from "@/hooks/ats/use-vacancy-brief";
import { useVacancyCompetencies } from "@/hooks/ats/use-competencies";
import { useSearchStrategy, usePublicBrief, toStringArray } from "@/hooks/ats/use-preparation";
import { useUpdatePhasePlan, type SearchPhase } from "@/hooks/ats/use-search-phases";
import { SearchStrategyCard } from "@/components/ats/SearchStrategyCard";
import { PublicBriefCard } from "@/components/ats/PublicBriefCard";
import type { Database } from "@/integrations/supabase/types";

type RequisitionApprovalStatus = Database["public"]["Enums"]["requisition_approval_status"];

interface PreparationPanelProps {
  vacancyId: string;
  vacancyTitle: string;
  phases: SearchPhase[];
  approvalStatus: RequisitionApprovalStatus;
  canEdit: boolean;
  /** Перехід на відповідну вкладку вакансії (бріф/компетенції). */
  onOpenTab: (tab: string) => void;
}

function ChecklistRow({
  done,
  title,
  hint,
  action,
}: {
  done: boolean;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
      <span
        className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
          done ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      {action}
    </div>
  );
}

/**
 * Етап 1 «Підготовка» — кандидатів немає, є артефакти:
 * бріф із замовником (68 питань), матриця компетенцій, стратегія пошуку,
 * бріф для кандидатів (PDF) і план проекту.
 *
 * План проекту — це планові дати самих етапів (search_phases.planned_*),
 * окремої сутності плану немає навмисно.
 */
export function PreparationPanel({
  vacancyId,
  vacancyTitle,
  phases,
  approvalStatus,
  canEdit,
  onOpenTab,
}: PreparationPanelProps) {
  const { data: brief } = useVacancyBrief(vacancyId);
  const { data: competencies } = useVacancyCompetencies(vacancyId);
  const { data: strategy } = useSearchStrategy(vacancyId);
  const { data: publicBrief } = usePublicBrief(vacancyId);
  const updatePlan = useUpdatePhasePlan();

  const [planDraft, setPlanDraft] = useState<Record<string, { start: string; end: string }>>({});

  const briefDone = brief?.status === "completed";
  const competenciesDone = (competencies?.length ?? 0) > 0;
  const requisitionDone = approvalStatus === "approved";
  const strategyDone =
    !!strategy && (!!strategy.focus?.trim() || toStringArray(strategy.target_titles).length > 0);
  const publicBriefDone = publicBrief?.status === "completed";

  const checks = [requisitionDone, briefDone, competenciesDone, strategyDone, publicBriefDone];
  const doneCount = checks.filter(Boolean).length;

  const getDraft = (phase: SearchPhase) =>
    planDraft[phase.id] ?? {
      start: phase.planned_start ?? "",
      end: phase.planned_end ?? "",
    };

  const setDraft = (phaseId: string, patch: Partial<{ start: string; end: string }>) =>
    setPlanDraft((prev) => ({
      ...prev,
      [phaseId]: { ...(prev[phaseId] ?? { start: "", end: "" }), ...patch },
    }));

  const savePlan = (phase: SearchPhase) => {
    const draft = getDraft(phase);
    updatePlan.mutate({
      phaseId: phase.id,
      vacancyId,
      plannedStart: draft.start || null,
      plannedEnd: draft.end || null,
    });
  };

  return (
    <Tabs defaultValue="checklist">
      <TabsList>
        <TabsTrigger value="checklist">
          Чеклист
          <Badge variant={doneCount === checks.length ? "default" : "outline"} className="ml-2 text-[10px]">
            {doneCount}/{checks.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="strategy">Стратегія пошуку</TabsTrigger>
        <TabsTrigger value="public-brief">Бріф для кандидатів</TabsTrigger>
      </TabsList>

      <TabsContent value="checklist" className="pt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Чеклист підготовки</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ChecklistRow
                done={requisitionDone}
                title="Заявку на пошук затверджено"
                hint="Requisition вакансії та проекту-батька у статусі approved"
              />
              <ChecklistRow
                done={briefDone}
                title="Бріф із замовником заповнено"
                hint={brief ? "Бріф вакансії (68 питань)" : "Бріф ще не створено"}
                action={
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenTab("brief")}>
                    {briefDone ? "Переглянути" : "Заповнити"}
                  </Button>
                }
              />
              <ChecklistRow
                done={competenciesDone}
                title="Матриця компетенцій"
                hint={
                  competenciesDone
                    ? `${competencies?.length} компетенцій із вагами та рубрикою`
                    : "Компетенції ще не задані"
                }
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onOpenTab("competencies")}
                  >
                    {competenciesDone ? "Переглянути" : "Створити"}
                  </Button>
                }
              />
              <ChecklistRow
                done={strategyDone}
                title="Стратегія пошуку"
                hint={strategyDone ? "Фокус, цільові компанії й посади задані" : "Ще не заповнена"}
              />
              <ChecklistRow
                done={publicBriefDone}
                title="Бріф для кандидатів"
                hint={
                  publicBriefDone
                    ? "Затверджено — можна надсилати кандидатам"
                    : publicBrief
                      ? "Чернетка — потребує затвердження"
                      : "Ще не створено"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarRange className="h-4 w-4" />
                План проекту — дедлайни етапів
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {phases.map((phase, index) => {
                const draft = getDraft(phase);
                const dirty =
                  draft.start !== (phase.planned_start ?? "") || draft.end !== (phase.planned_end ?? "");
                return (
                  <div key={phase.id} className="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
                    <div className="min-w-0">
                      <Label className="text-xs text-muted-foreground">
                        {index + 1}. {phase.name}
                      </Label>
                    </div>
                    <Input
                      type="date"
                      className="h-8 w-36 text-xs"
                      value={draft.start}
                      disabled={!canEdit}
                      onChange={(e) => setDraft(phase.id, { start: e.target.value })}
                    />
                    <Input
                      type="date"
                      className="h-8 w-36 text-xs"
                      value={draft.end}
                      disabled={!canEdit}
                      onChange={(e) => setDraft(phase.id, { end: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={!canEdit || !dirty || updatePlan.isPending}
                      onClick={() => savePlan(phase)}
                    >
                      Зберегти
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="strategy" className="pt-4">
        <SearchStrategyCard vacancyId={vacancyId} vacancyTitle={vacancyTitle} canEdit={canEdit} />
      </TabsContent>

      <TabsContent value="public-brief" className="pt-4">
        <PublicBriefCard vacancyId={vacancyId} vacancyTitle={vacancyTitle} canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  );
}
