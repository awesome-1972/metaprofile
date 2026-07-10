// src/components/ats/ComparisonMatrixTab.tsx
//
// Вкладка "Порівняння" — Comparison matrix (roadmap-ATS-platform.md розділ 2,
// "Candidate comparison matrix", розділ 16 бачення advanced_ats_platform_structure):
// рядки = компетенції по групах (з вагами), колонки = кандидати вакансії,
// бал 1–3 у клітинці (клік → popover з evidence-нотаткою), внизу — Total
// weighted score на кандидата + вердикт-бейдж. Формула й пороги ідентичні
// generate-candidate-report/index.ts (use-comparison.ts::useComparisonMatrix).
//
// Must-have gate: якщо будь-яка is_must_have компетенція кандидата має бал
// < 2 — червоний індикатор на колонці, кандидат не проходить у short list
// автоматично. Human override: ручний чекбокс "у short list" з обовʼязковою
// (на рівні UI) причиною — зберігається в applications.shortlist_override(_reason).
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { groupCompetencies } from "@/hooks/ats/use-competencies";
import { useComparisonMatrix, type CandidateComparisonColumn } from "@/hooks/ats/use-comparison";
import { useSetShortlistOverride } from "@/hooks/ats/use-applications";
import type { ScoreVerdict } from "@/hooks/ats/use-competency-scores";

interface ComparisonMatrixTabProps {
  vacancyId: string;
}

const verdictBadgeClass: Record<ScoreVerdict, string> = {
  висока: "bg-green-100 text-green-800",
  середня: "bg-yellow-100 text-yellow-800",
  низька: "bg-red-100 text-red-700",
};

const scoreBadgeClass: Record<number, string> = {
  1: "bg-red-100 text-red-700",
  2: "bg-yellow-100 text-yellow-800",
  3: "bg-green-100 text-green-800",
};

export function ComparisonMatrixTab({ vacancyId }: ComparisonMatrixTabProps) {
  const { competencies, scoredColumns, unscoredColumns, isLoading, hasMatrix } = useComparisonMatrix(vacancyId);
  const setOverride = useSetShortlistOverride();

  const groups = useMemo(() => groupCompetencies(competencies), [competencies]);

  const [overrideTarget, setOverrideTarget] = useState<CandidateComparisonColumn | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const openOverrideDialog = (column: CandidateComparisonColumn) => {
    setOverrideTarget(column);
    setOverrideReason(column.shortlistOverrideReason ?? "");
  };

  const handleSaveOverride = () => {
    if (!overrideTarget) return;
    setOverride.mutate(
      {
        applicationId: overrideTarget.applicationId,
        vacancyId,
        override: true,
        reason: overrideReason.trim() || null,
      },
      { onSuccess: () => setOverrideTarget(null) },
    );
  };

  const handleClearOverride = () => {
    if (!overrideTarget) return;
    setOverride.mutate(
      {
        applicationId: overrideTarget.applicationId,
        vacancyId,
        override: false,
        reason: null,
      },
      { onSuccess: () => setOverrideTarget(null) },
    );
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Завантаження порівняльної таблиці...</div>;
  }

  if (!hasMatrix) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          У вакансії ще не налаштована матриця компетенцій. Перейдіть на вкладку «Компетенції», щоб її створити —
          порівняльна таблиця зʼявиться, коли будуть оцінені кандидати.
        </CardContent>
      </Card>
    );
  }

  const columns = scoredColumns;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Порівняльна таблиця кандидатів вакансії — бал 1–3 по кожній компетенції, зважена загальна оцінка й вердикт
        (пороги: 2.34+ висока / 1.67+ середня / нижче — низька відповідність)
      </h3>

      {columns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Ще немає жодного оціненого кандидата. Оцініть компетенції із воронки (кнопка «Оцінка компетенцій»).
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-background z-10 min-w-[220px]">Компетенція</TableHead>
                {columns.map((col) => (
                  <TableHead key={col.applicationId} className="min-w-[160px] align-top">
                    <div className="space-y-1">
                      <div className="font-medium text-foreground">{col.candidateName}</div>
                      {col.mustHaveFailed && !col.shortlistOverride && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Must-have не виконано
                        </Badge>
                      )}
                      {col.shortlistOverride && (
                        <Badge className="text-[10px] gap-1 bg-blue-100 text-blue-800">
                          <ShieldCheck className="h-3 w-3" />
                          Ручний override
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[11px] px-2"
                        onClick={() => openOverrideDialog(col)}
                      >
                        {col.shortlistOverride ? "Змінити override" : "Ручний вибір у short-list"}
                      </Button>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.groupName}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={columns.length + 1} className="py-2 font-medium text-xs">
                      {group.groupName} <span className="text-muted-foreground">(вага групи {Math.round(group.groupWeight * 100)}%)</span>
                    </TableCell>
                  </TableRow>
                  {group.competencies
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="sticky left-0 bg-background z-10">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm">{c.name}</span>
                            <span className="text-xs text-muted-foreground">(вага {c.weight})</span>
                            {c.is_must_have && (
                              <Badge variant="destructive" className="text-[10px] gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                must-have
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        {columns.map((col) => {
                          const score = col.scoresByCompetency.get(c.id);
                          if (!score) {
                            return (
                              <TableCell key={col.applicationId} className="text-center text-muted-foreground text-xs">
                                —
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={col.applicationId} className="text-center">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button type="button">
                                    <Badge className={`${scoreBadgeClass[score.score]} cursor-pointer`}>
                                      {score.score}
                                    </Badge>
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="text-xs space-y-1">
                                  <div className="font-medium">
                                    {col.candidateName} — {c.name}: бал {score.score}/3
                                  </div>
                                  <div className="text-muted-foreground">
                                    {score.note?.trim() ? score.note : "Evidence-нотатку не додано до цього бала"}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </Fragment>
              ))}

              <TableRow className="border-t-2 bg-muted/30 hover:bg-muted/30">
                <TableCell className="sticky left-0 bg-muted/30 z-10 font-medium text-sm">
                  Total weighted score
                </TableCell>
                {columns.map((col) => (
                  <TableCell key={col.applicationId} className="text-center">
                    {col.weightedScore !== null && col.verdict ? (
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{col.weightedScore.toFixed(2)} / 3.00</div>
                        <Badge className={verdictBadgeClass[col.verdict]}>{col.verdict} відповідність</Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {unscoredColumns.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Не оцінені</h4>
          <div className="flex flex-wrap gap-2">
            {unscoredColumns.map((col) => (
              <Badge key={col.applicationId} variant="outline" className="text-xs">
                {col.candidateName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!overrideTarget} onOpenChange={(open) => !open && setOverrideTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ручний вибір у short-list — {overrideTarget?.candidateName}</DialogTitle>
            <DialogDescription>
              Override перекриває автоматичний вердикт (зважений бал / must-have gate). Вкажіть причину — чому
              кандидат розглядається попри автоматичну оцінку.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Наприклад: слабкий бал з однієї компетенції компенсується унікальним релевантним досвідом..."
              className="min-h-[100px]"
            />
            {!overrideReason.trim() && (
              <p className="text-xs text-amber-700">Причина порожня — бажано обґрунтувати ручний override</p>
            )}
          </div>
          <DialogFooter className="flex-wrap gap-2">
            {overrideTarget?.shortlistOverride && (
              <Button type="button" variant="outline" onClick={handleClearOverride} disabled={setOverride.isPending}>
                Скасувати override
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOverrideTarget(null)}>
              Закрити
            </Button>
            <Button onClick={handleSaveOverride} disabled={setOverride.isPending}>
              {setOverride.isPending ? "Збереження..." : "Зберегти override"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
