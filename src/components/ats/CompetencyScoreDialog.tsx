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
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldAlert, TriangleAlert } from "lucide-react";
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

  // Дедуплікація: матриця інколи містить повторені компетенції (застосували
  // шаблон/AI-генерацію поверх наявних). Для оцінки лишаємо по одній на
  // (група + назва), щоб не дублювати рядки й не подвоювати ваги.
  const comps = useMemo(() => {
    const seen = new Set<string>();
    return (competencies ?? []).filter((c) => {
      const key = `${c.group_name}::${(c.name || "").trim().toLowerCase()}::${(c.name_en || "").trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [competencies]);

  const groups = useMemo(() => groupCompetencies(comps), [comps]);

  const currentScoreRows = useMemo(
    () =>
      comps
        .filter((c) => scores[c.id] !== undefined)
        .map((c) => ({ competency_id: c.id, score: scores[c.id]!, note: notes[c.id] ?? null, application_id: applicationId, id: "", created_at: "", updated_at: "", scored_by: null })),
    [comps, scores, notes, applicationId],
  );

  const summary = useMemo(
    () => computeScoreSummary(comps, currentScoreRows),
    [comps, currentScoreRows],
  );

  const handleSave = () => {
    const entries = comps
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
  const noMatrix = !isLoading && comps.length === 0;

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
                        const questions = Array.isArray(c.questions) ? (c.questions as unknown[]).map(String) : [];
                        const probes = toStringList(c.probes);
                        const redFlags = toStringList(c.red_flags);
                        const rubric = toRubric(c.rubric);
                        const hasRubric = !!(rubric["1"] || rubric["2"] || rubric["3"]);
                        const currentScore = scores[c.id];
                        const noteMissing = currentScore !== undefined && !notes[c.id]?.trim();
                        return (
                          <div key={c.id} className="border rounded-md p-3 space-y-3">
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
                            </div>

                            {questions.length > 0 && (
                              <div className="rounded-md bg-blue-50/60 border border-blue-100 p-2.5">
                                <div className="text-xs font-medium text-blue-900 mb-1">Питання для інтерв'ю</div>
                                <ul className="list-disc pl-4 space-y-1 text-sm text-foreground/90">
                                  {questions.map((q, idx) => <li key={idx}>{q}</li>)}
                                </ul>
                                {probes.length > 0 && (
                                  <div className="mt-1.5 text-xs text-muted-foreground">
                                    <span className="font-medium">Уточнюючі: </span>{probes.join(" · ")}
                                  </div>
                                )}
                              </div>
                            )}

                            {redFlags.length > 0 && (
                              <div className="flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md p-2">
                                <TriangleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <div><span className="font-medium">Red flags: </span>{redFlags.join(" · ")}</div>
                              </div>
                            )}

                            <div>
                              <div className="text-xs font-medium mb-1.5">Оцінка — оберіть рівень, що відповідає</div>
                              {hasRubric ? (
                                <div className="grid gap-1.5">
                                  {[1, 2, 3].map((val) => {
                                    const desc = rubric[String(val) as "1" | "2" | "3"];
                                    const on = currentScore === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setScores((prev) => ({ ...prev, [c.id]: val }))}
                                        className={`text-left rounded-md border p-2 text-sm transition-colors ${on ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-accent"}`}
                                      >
                                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full mr-2 text-xs font-semibold ${on ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{val}</span>
                                        {desc || `Бал ${val}`}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex items-center gap-3">
                                  {[1, 2, 3].map((val) => {
                                    const on = currentScore === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        onClick={() => setScores((prev) => ({ ...prev, [c.id]: val }))}
                                        className={`h-9 w-9 rounded-full border text-sm font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                                      >{val}</button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <Textarea
                              placeholder="Нотатка інтерв'юера — обґрунтування бала (evidence)"
                              value={notes[c.id] ?? ""}
                              onChange={(e) => setNotes((prev) => ({ ...prev, [c.id]: e.target.value }))}
                              className={`text-sm min-h-[56px] ${noteMissing ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
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
