import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, CircleDot, Circle } from "lucide-react";
import {
  searchPhaseStatusLabel,
  type SearchPhase,
  type SearchPhaseStatus,
} from "@/hooks/ats/use-search-phases";

interface PhaseNavProps {
  phases: SearchPhase[];
  selectedPhaseId: string | null;
  /** Кількість активних кандидатів у кожному етапі (ключ — phase_id). */
  countsByPhase: Record<string, number>;
  canEdit: boolean;
  isBusy: boolean;
  onSelect: (phaseId: string) => void;
  onSetStatus: (phaseId: string, status: SearchPhaseStatus) => void;
}

const statusStyle: Record<SearchPhaseStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  active: "bg-primary/10 text-primary ring-1 ring-primary",
  done: "bg-green-100 text-green-800",
};

function StatusIcon({ status }: { status: SearchPhaseStatus }) {
  if (status === "done") return <Check className="h-3.5 w-3.5" />;
  if (status === "active") return <CircleDot className="h-3.5 w-3.5" />;
  return <Circle className="h-3.5 w-3.5" />;
}

/**
 * Горизонтальний степер етапів пошуку. Клік по етапу — розкриває його воронку
 * нижче (стадії цього етапу). Кнопки статусу — лише для редакторів вакансії;
 * гейт мʼякий: система не блокує роботу на наступному етапі, лише показує стан.
 */
export function PhaseNav({
  phases,
  selectedPhaseId,
  countsByPhase,
  canEdit,
  isBusy,
  onSelect,
  onSetStatus,
}: PhaseNavProps) {
  const selected = phases.find((p) => p.id === selectedPhaseId) ?? null;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="flex items-stretch gap-2 min-w-max">
          {phases.map((phase, index) => {
            const isSelected = phase.id === selectedPhaseId;
            const count = countsByPhase[phase.id] ?? 0;
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => onSelect(phase.id)}
                className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors w-48 flex-shrink-0 ${
                  isSelected ? "border-primary bg-accent" : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 w-full">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${
                      statusStyle[phase.status]
                    }`}
                  >
                    <StatusIcon status={phase.status} />
                  </span>
                  <span className="text-xs text-muted-foreground">Етап {index + 1}</span>
                  {phase.kind !== "preparation" && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {count}
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium leading-snug">{phase.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {searchPhaseStatusLabel[phase.status]}
                  {phase.planned_end
                    ? ` · до ${new Date(phase.planned_end).toLocaleDateString("uk-UA", {
                        day: "2-digit",
                        month: "2-digit",
                      })}`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && canEdit && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Статус етапу «{selected.name}»:</span>
          {(["pending", "active", "done"] as SearchPhaseStatus[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={selected.status === status ? "default" : "outline"}
              className="h-7 text-xs"
              disabled={isBusy || selected.status === status}
              onClick={() => onSetStatus(selected.id, status)}
            >
              {searchPhaseStatusLabel[status]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
