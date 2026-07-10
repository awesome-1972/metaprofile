// src/components/ats/CompetencyScoreDialog.tsx
//
// Діалог "Оцінка компетенцій" — рядки = компетенції по групах вакансії, оцінка
// 1–3 (RadioGroup), нотатка (textarea), підсумок зваженого бала по групі і
// загального з рівнем відповідності (Додаток A: 2.34+ висока / 1.67+ середня /
// нижче — низька). Викликається з kanban-картки заявки (VacancyDetailPage).
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ShieldAlert, TriangleAlert } from "lucide-react";
import { useVacancyCompetencies, groupCompetencies, toStringList, toRubric } from "@/hooks/ats/use-competencies";
import {
  useCompetencyScores,
  useSaveCompetencyScores,
  computeScoreSummary,
  verdictForScore,
  type ScoreVerdict,
} from "@/hooks/ats/use-competency-scores";

interface CompetencyScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  applicationId: string;
  candidateName: string;
}

const verdictBadgeClass: Record<ScoreVerdict, string> = {
  висока: "bg-green-100 text-green-800",
  середня: "bg-yellow-100 text-yellow-800",
  низька: "bg-red-100 text-red-700",
};

export function CompetencyScoreDialog({
  open,
  onOpenChange,
  vacancyId,
  applicationId,
  candidateName,
}: CompetencyScoreDialogProps) {
  const { data: competencies, isLoading: competenciesLoading } = useVacancyCompetencies(vacancyId);
  const { data: existingScores, isLoading: scoresLoading } = useCompetencyScores(applicationId);
  const saveScores = useSaveCompetencyScores();

  const [scores, setScores] = useState<Record<string, number | undefined>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const nextScores: Record<string, number | undefined> = {};
    const nextNotes: Record<string, string> = {};
    for (const s of existingScores ?? []) {
      nextScores[s.competency_id] = s.score;
      nextNotes[s.competency_id] = s.note ?? "";
    }
    setScores(nextScores);
    setNotes(nextNotes);
  }, [open, existingScores]);

  const groups = useMemo(() => groupCompetencies(competencies ?? []), [competencies]);

  const currentScoreRows = useMemo(
    () =>
      (competencies ?? [])
        .filter((c) => scores[c.id] !== undefined)
        .map((c) => ({ competency_id: c.id, score: scores[c.id]!, note: notes[c.id] ?? null, application_id: applicationId, id: "", created_at: "", updated_at: "", scored_by: null })),
    [competencies, scores, notes, applicationId],
  );

  const summary = useMemo(
    () => computeScoreSummary(competencies ?? [], currentScoreRows),
    [competencies, currentScoreRows],
  );

  const handleSave = () => {
    const entries = (competencies ?? [])
      .filter((c) => scores[c.id] !== undefined)
      .map((c) => ({ competencyId: c.id, score: scores[c.id]!, note: notes[c.id]?.trim() || null }));
    saveScores.mutate(
      { applicationId, entries },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  const isLoading = competenciesLoading || scoresLoading;
  const noMatrix = !isLoading && (competencies ?? []).length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Оцінка компетенцій — {candidateName}</DialogTitle>
          <DialogDescription>Виставте бал 1–3 по кожній компетенції матриці вакансії</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground text-sm">Завантаження...</div>
        ) : noMatrix ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            У вакансії ще не налаштована матриця компетенцій. Перейдіть на вкладку «Компетенції», щоб її створити.
          </div>
        ) : (
          <div className="space-y-4">
            {summary.overall !== null && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                <span className="text-sm font-medium">Загальна оцінка:</span>
                <span className="text-sm font-semibold">{summary.overall.toFixed(2)} / 3.00</span>
                <Badge className={verdictBadgeClass[verdictForScore(summary.overall)]}>
                  {verdictForScore(summary.overall)} відповідність
                </Badge>
              </div>
            )}

            <Accordion type="multiple" defaultValue={groups.map((g) => g.groupName)} className="w-full">
              {groups.map((group) => {
                const groupSummary = summary.groups.find((g) => g.groupName === group.groupName);
                return (
                  <AccordionItem key={group.groupName} value={group.groupName}>
                    <AccordionTrigger className="text-sm">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-medium">
                          {group.groupName} (вага {Math.round(group.groupWeight * 100)}%)
                        </span>
                        {groupSummary?.weightedScore !== null && groupSummary?.weightedScore !== undefined && (
                          <Badge variant="outline" className="text-xs">
                            {groupSummary.weightedScore.toFixed(2)} / 3.00
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto mr-2">
                          {groupSummary?.scoredCount ?? 0}/{groupSummary?.totalCount ?? 0} оцінено
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {group.competencies.map((c) => {
                        const questions = Array.isArray(c.questions) ? (c.questions as unknown[]) : [];
                        const probes = toStringList(c.probes);
                        const redFlags = toStringList(c.red_flags);
                        const rubric = toRubric(c.rubric);
                        const hasHints = questions.length > 0 || probes.length > 0;
                        const currentScore = scores[c.id];
                        const noteMissing = currentScore !== undefined && !notes[c.id]?.trim();
                        return (
                          <div key={c.id} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {c.name}
                                {c.name_en ? ` / ${c.name_en}` : ""}
                              </span>
                              <span className="text-xs text-muted-foreground">(вага {c.weight})</span>
                              {c.is_must_have && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  must-have
                                </Badge>
                              )}
                              {hasHints && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-sm space-y-2">
                                      {questions.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium mb-1">Питання:</div>
                                          <ul className="list-disc pl-4 space-y-1 text-xs">
                                            {questions.map((q, idx) => (
                                              <li key={idx}>{String(q)}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {probes.length > 0 && (
                                        <div>
                                          <div className="text-xs font-medium mb-1">Уточнюючі (probes):</div>
                                          <ul className="list-disc pl-4 space-y-1 text-xs">
                                            {probes.map((q, idx) => (
                                              <li key={idx}>{q}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>

                            {redFlags.length > 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                                <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">Red flags: </span>
                                  {redFlags.join(" · ")}
                                </div>
                              </div>
                            )}

                            <RadioGroup
                              value={currentScore !== undefined ? String(currentScore) : undefined}
                              onValueChange={(v) => setScores((prev) => ({ ...prev, [c.id]: Number(v) }))}
                              className="flex items-center gap-4"
                            >
                              {[1, 2, 3].map((val) => (
                                <div key={val} className="flex items-center gap-1.5">
                                  <RadioGroupItem value={String(val)} id={`${c.id}-${val}`} />
                                  <Label htmlFor={`${c.id}-${val}`} className="text-sm font-normal cursor-pointer">
                                    {val}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>

                            {Object.keys(rubric).length > 0 && (
                              <div className="text-xs text-muted-foreground space-y-0.5 bg-muted/40 rounded-md p-2">
                                {(["1", "2", "3"] as const)
                                  .filter((lvl) => rubric[lvl])
                                  .map((lvl) => (
                                    <div key={lvl}>
                                      <span className="font-medium">{lvl}:</span> {rubric[lvl]}
                                    </div>
                                  ))}
                              </div>
                            )}

                            <Textarea
                              placeholder="Нотатка інтерв'юера — обґрунтування бала (evidence)"
                              value={notes[c.id] ?? ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className={`text-sm min-h-[60px] ${noteMissing ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                            />
                            {noteMissing && (
                              <p className="text-xs text-amber-700 flex items-center gap-1">
                                <TriangleAlert className="h-3 w-3" />
                                Оцінка без обґрунтування — бажано додати нотатку (evidence)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Скасувати
          </Button>
          <Button onClick={handleSave} disabled={noMatrix || saveScores.isPending}>
            {saveScores.isPending ? "Збереження..." : "Зберегти оцінку"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
