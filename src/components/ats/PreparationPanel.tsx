import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, CalendarRange } from "lucide-react";
import { useVacancyBrief } from "@/hooks/ats/use-vacancy-brief";
import { useVacancyCompetencies } from "@/hooks/ats/use-competencies";
import { useUpdatePhasePlan, type SearchPhase } from "@/hooks/ats/use-search-phases";
import type { Database } from "@/integrations/supabase/types";

type RequisitionApprovalStatus = Database["public"]["Enums"]["requisition_approval_status"];

interface PreparationPanelProps {
  vacancyId: string;
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
 * Етап 1 «Підготовка» — кандидатів немає, є артефакти.
 *
 * Чеклист зібраний із того, що вже живе в системі: requisition-затвердження,
 * бріф вакансії (68 питань) і матриця компетенцій. План проекту — це планові
 * дати самих етапів (search_phases.planned_start/planned_end), окремої сутності
 * плану немає навмисно.
 *
 * Стратегія пошуку і публічний бріф для кандидатів (PDF) — наступний спринт.
 */
export function PreparationPanel({
  vacancyId,
  phases,
  approvalStatus,
  canEdit,
  onOpenTab,
}: PreparationPanelProps) {
  const { data: brief } = useVacancyBrief(vacancyId);
  const { data: competencies } = useVacancyCompetencies(vacancyId);
  const updatePlan = useUpdatePhasePlan();

  const [planDraft, setPlanDraft] = useState<Record<string, { start: string; end: string }>>({});

  const briefDone = brief?.status === "completed";
  const competenciesDone = (competencies?.length ?? 0) > 0;
  const requisitionDone = approvalStatus === "approved";

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

  const doneCount = [requisitionDone, briefDone, competenciesDone].filter(Boolean).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            Чеклист підготовки
            <Badge variant={doneCount === 3 ? "default" : "outline"} className="text-xs">
              {doneCount}/3
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ChecklistRow
            done={requisitionDone}
            title="Заявку на пошук затверджено"
            hint="Requisition вакансії та проекту-батька у статусі approved"
          />
          <ChecklistRow
            done={briefDone}
            title="Бріф з замовником заповнено"
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
          <p className="pt-3 text-xs text-muted-foreground">
            Стратегія пошуку і бріф для кандидатів (PDF) — у наступному оновленні.
          </p>
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
  );
}
