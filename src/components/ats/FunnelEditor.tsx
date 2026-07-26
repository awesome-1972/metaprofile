import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Plus, Settings2, Trash2, Check, X } from "lucide-react";
import {
  useSearchPhases,
  useAddPhase,
  useUpdatePhase,
  useDeletePhase,
  useReorderPhases,
  phaseColor,
  PHASE_PALETTE,
  type SearchPhase,
} from "@/hooks/ats/use-search-phases";
import {
  usePipelineStages,
  useAddStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
  type PipelineStage,
} from "@/hooks/ats/use-pipeline";

interface FunnelEditorProps {
  vacancyId: string;
  /** Скільки активних кандидатів на етапі — попереджаємо перед видаленням. */
  countsByPhase: Record<string, number>;
  trigger?: React.ReactNode;
}

/**
 * Гнучке налаштування воронки під запит: додавання/перейменування/видалення
 * етапів і стадій, зміна кольору етапу, перевпорядкування (кнопками — надійніше
 * за DnD для рідкісної операції).
 *
 * Guard mp_pipeline_stage_delete_guard блокує видалення стадії з кандидатами
 * (хук показує зрозумілий toast). Видалення етапу лишає його стадії «без етапу»
 * (on delete set null) — тому спершу пропонуємо прибрати стадії.
 */
export function FunnelEditor({ vacancyId, countsByPhase, trigger }: FunnelEditorProps) {
  const [open, setOpen] = useState(false);
  const { data: phases } = useSearchPhases(vacancyId);
  const { data: stages } = usePipelineStages(vacancyId);

  const addPhase = useAddPhase();
  const updatePhase = useUpdatePhase();
  const deletePhase = useDeletePhase();
  const reorderPhases = useReorderPhases();
  const addStage = useAddStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [newPhaseName, setNewPhaseName] = useState("");
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState("");
  const [newStageByPhase, setNewStageByPhase] = useState<Record<string, string>>({});

  const sortedPhases = [...(phases ?? [])].sort((a, b) => a.position - b.position);
  const stagesByPhase = (phaseId: string) =>
    [...(stages ?? [])].filter((s) => s.phase_id === phaseId).sort((a, b) => a.position - b.position);

  const startEditPhase = (phase: SearchPhase) => {
    setEditingPhaseId(phase.id);
    setEditingName(phase.name);
  };
  const saveEditPhase = () => {
    if (editingPhaseId && editingName.trim()) {
      updatePhase.mutate({ phaseId: editingPhaseId, vacancyId, name: editingName.trim() });
    }
    setEditingPhaseId(null);
  };

  const startEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };
  const saveEditStage = () => {
    if (editingStageId && editingStageName.trim()) {
      updateStage.mutate({ stageId: editingStageId, vacancyId, name: editingStageName.trim() });
    }
    setEditingStageId(null);
  };

  const movePhase = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sortedPhases.length) return;
    const ids = sortedPhases.map((p) => p.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderPhases.mutate({ vacancyId, orderedIds: ids });
  };

  const moveStage = (phaseId: string, index: number, dir: -1 | 1) => {
    const list = stagesByPhase(phaseId);
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    // Перевпорядковуємо ГЛОБАЛЬНО (position унікальна по вакансії): беремо повний
    // список стадій у поточному порядку й міняємо місцями два сусіди в межах етапу.
    const all = [...(stages ?? [])].sort((a, b) => a.position - b.position).map((s) => s.id);
    const idA = list[index].id;
    const idB = list[target].id;
    const posA = all.indexOf(idA);
    const posB = all.indexOf(idB);
    [all[posA], all[posB]] = [all[posB], all[posA]];
    reorderStages.mutate({ vacancyId, orderedIds: all });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" variant="outline" className="h-7 text-xs">
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Налаштувати воронку
          </Button>
        )}
      </span>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Налаштування воронки</DialogTitle>
          <DialogDescription>
            Додавайте етапи й стадії під конкретний проект. Стадію з кандидатами видалити
            не можна — спершу перенесіть їх.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sortedPhases.map((phase, phaseIndex) => {
            const color = phaseColor(phase);
            const phaseStages = stagesByPhase(phase.id);
            const count = countsByPhase[phase.id] ?? 0;
            return (
              <div
                key={phase.id}
                className="rounded-lg border p-3 space-y-2"
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-center gap-2">
                  {editingPhaseId === phase.id ? (
                    <>
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editingName}
                        autoFocus
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditPhase()}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditPhase}>
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingPhaseId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className="text-sm font-semibold cursor-pointer flex-1"
                        style={{ color }}
                        onClick={() => startEditPhase(phase)}
                        title="Клік — перейменувати"
                      >
                        {phaseIndex + 1}. {phase.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {count} канд.
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={phaseIndex === 0}
                        onClick={() => movePhase(phaseIndex, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={phaseIndex === sortedPhases.length - 1}
                        onClick={() => movePhase(phaseIndex, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        title={
                          count > 0
                            ? "На етапі є кандидати — спершу перенесіть їх"
                            : "Видалити етап"
                        }
                        onClick={() => {
                          if (count > 0) return;
                          deletePhase.mutate({ phaseId: phase.id, vacancyId });
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Палітра кольору етапу */}
                <div className="flex items-center gap-1.5 pl-1">
                  {PHASE_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-4 w-4 rounded-full border ${
                        color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-foreground" : ""
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => updatePhase.mutate({ phaseId: phase.id, vacancyId, color: c })}
                    />
                  ))}
                </div>

                {/* Стадії етапу */}
                <div className="space-y-1 pl-1">
                  {phaseStages.map((stage, stageIndex) => (
                    <div key={stage.id} className="flex items-center gap-2 text-xs">
                      {editingStageId === stage.id ? (
                        <>
                          <Input
                            className="h-6 text-xs flex-1"
                            value={editingStageName}
                            autoFocus
                            onChange={(e) => setEditingStageName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveEditStage()}
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditStage}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={() => setEditingStageId(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span
                            className="flex-1 cursor-pointer text-muted-foreground hover:text-foreground"
                            onClick={() => startEditStage(stage)}
                          >
                            • {stage.name}
                          </span>
                          {/* SLA-пороги (днів): жовтий / червоний. Порожньо = дефолт. */}
                          <span className="flex items-center gap-1" title="Пороги SLA: жовтий / червоний, днів">
                            <Input
                              type="number"
                              className="h-6 w-11 text-[11px] px-1"
                              placeholder="ж"
                              defaultValue={stage.sla_yellow_days ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                updateStage.mutate({
                                  stageId: stage.id,
                                  vacancyId,
                                  slaYellowDays: v === "" ? null : Number(v),
                                });
                              }}
                            />
                            <Input
                              type="number"
                              className="h-6 w-11 text-[11px] px-1"
                              placeholder="ч"
                              defaultValue={stage.sla_red_days ?? ""}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                updateStage.mutate({
                                  stageId: stage.id,
                                  vacancyId,
                                  slaRedDays: v === "" ? null : Number(v),
                                });
                              }}
                            />
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={stageIndex === 0}
                            onClick={() => moveStage(phase.id, stageIndex, -1)}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={stageIndex === phaseStages.length - 1}
                            onClick={() => moveStage(phase.id, stageIndex, 1)}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteStage.mutate({ stageId: stage.id, vacancyId })}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Додати стадію в цей етап */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Input
                      className="h-6 text-xs"
                      placeholder="Нова стадія…"
                      value={newStageByPhase[phase.id] ?? ""}
                      onChange={(e) =>
                        setNewStageByPhase((prev) => ({ ...prev, [phase.id]: e.target.value }))
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (newStageByPhase[phase.id] ?? "").trim()) {
                          addStage.mutate(
                            { vacancyId, phaseId: phase.id, name: newStageByPhase[phase.id].trim() },
                            {
                              onSuccess: () =>
                                setNewStageByPhase((prev) => ({ ...prev, [phase.id]: "" })),
                            },
                          );
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      disabled={!(newStageByPhase[phase.id] ?? "").trim() || addStage.isPending}
                      onClick={() =>
                        addStage.mutate(
                          { vacancyId, phaseId: phase.id, name: (newStageByPhase[phase.id] ?? "").trim() },
                          {
                            onSuccess: () =>
                              setNewStageByPhase((prev) => ({ ...prev, [phase.id]: "" })),
                          },
                        )
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Додати етап */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Input
              className="h-8 text-sm"
              placeholder="Назва нового етапу…"
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newPhaseName.trim()) {
                  addPhase.mutate(
                    { vacancyId, name: newPhaseName.trim() },
                    { onSuccess: () => setNewPhaseName("") },
                  );
                }
              }}
            />
            <Button
              size="sm"
              disabled={!newPhaseName.trim() || addPhase.isPending}
              onClick={() =>
                addPhase.mutate(
                  { vacancyId, name: newPhaseName.trim() },
                  { onSuccess: () => setNewPhaseName("") },
                )
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Додати етап
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
