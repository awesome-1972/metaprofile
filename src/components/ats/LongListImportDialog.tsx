import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { parseLongListWorkbook, type ParseResult } from "@/lib/ats/longlist-parser";
import {
  useBuildImportPlan,
  useRunLongListImport,
  type ImportPlanRow,
} from "@/hooks/ats/use-longlist-import";
import { useCandidateSources } from "@/hooks/ats/use-candidates";
import type { PipelineStage } from "@/hooks/ats/use-pipeline";

interface LongListImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vacancyId: string;
  /** Стадії етапу «Лонг-лист» — куди класти імпортованих. */
  stages: PipelineStage[];
}

const outcomeLabel: Record<ImportPlanRow["outcome"], string> = {
  active: "У воронку",
  rejected_by_candidate: "Відмова кандидата",
  rejected_by_agency: "Відмова агенції",
};

const fieldLabel: Record<string, string> = {
  fullName: "ПІБ",
  company: "Компанія",
  title: "Посада",
  experience: "Досвід",
  email: "Email",
  phone: "Телефон",
  linkedin: "LinkedIn",
  socials: "Соцмережі",
  status: "Status",
  comment: "Коментарі",
};

/**
 * Імпорт лонг-листа з Excel у воронку етапу 2.
 *
 * Три кроки: файл → прев'ю плану (що створиться, що оновиться, що вже є) →
 * запис. Нічого не пишеться, доки людина не підтвердила: дедуп і відмови з
 * колонки Status видно в таблиці до імпорту, кожен рядок можна вимкнути.
 */
export function LongListImportDialog({
  open,
  onOpenChange,
  vacancyId,
  stages,
}: LongListImportDialogProps) {
  const { data: sources } = useCandidateSources();
  const buildPlan = useBuildImportPlan();
  const runImport = useRunLongListImport();

  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [plan, setPlan] = useState<ImportPlanRow[] | null>(null);
  const [stageId, setStageId] = useState<string>(stages[0]?.id ?? "");
  const [sourceId, setSourceId] = useState<string>("");

  const reset = () => {
    setParsed(null);
    setPlan(null);
    setStageId(stages[0]?.id ?? "");
    setSourceId("");
  };

  const handleFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const result = parseLongListWorkbook(buffer);
      if (result.rows.length === 0) {
        toast.error("Не вдалося розпізнати колонку ПІБ — перевірте шапку таблиці");
        return;
      }
      setParsed(result);
      const built = await buildPlan.mutateAsync({ rows: result.rows, vacancyId });
      setPlan(built);
    } catch (e) {
      toast.error(`Не вдалося прочитати файл: ${(e as Error).message}`);
    }
  };

  const toggleRow = (index: number) =>
    setPlan((prev) =>
      prev ? prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)) : prev,
    );

  const selectedCount = plan?.filter((p) => p.selected).length ?? 0;
  const newCount = plan?.filter((p) => p.selected && !p.existingCandidateId).length ?? 0;
  const dupCount = plan?.filter((p) => p.selected && p.existingCandidateId).length ?? 0;
  const appliedCount = plan?.filter((p) => p.selected && p.alreadyApplied).length ?? 0;
  const rejectedCount = plan?.filter((p) => p.selected && p.outcome !== "active").length ?? 0;

  const handleImport = () => {
    if (!plan || !stageId) return;
    runImport.mutate(
      { plan, vacancyId, stageId, sourceId: sourceId || null },
      {
        onSuccess: () => {
          onOpenChange(false);
          reset();
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Імпорт лонг-листа з Excel</DialogTitle>
          <DialogDescription>
            Колонки розпізнаються за назвами (Компанія, ПІБ, Посада, Досвід, Соцмережі, Status,
            Коментарі). Нічого не записується, доки ви не підтвердите.
          </DialogDescription>
        </DialogHeader>

        {!plan ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <Label htmlFor="longlist-file" className="text-sm">
                Оберіть файл .xlsx / .csv
              </Label>
              <Input
                id="longlist-file"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="mt-3 max-w-sm mx-auto"
                disabled={buildPlan.isPending}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              {buildPlan.isPending && (
                <p className="mt-3 text-xs text-muted-foreground">Аналізуємо файл і шукаємо дублі...</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Аркуш: {parsed?.sheetName}</Badge>
              <Badge variant="outline">Рядків: {plan.length}</Badge>
              {parsed?.skipped ? (
                <Badge variant="outline">Пропущено без ПІБ: {parsed.skipped}</Badge>
              ) : null}
              {(parsed?.recognized ?? []).map((field) => (
                <Badge key={field} className="bg-muted text-muted-foreground text-[10px]">
                  {fieldLabel[field] ?? field}
                </Badge>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Стадія, куди класти *</Label>
                <Select value={stageId} onValueChange={setStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть стадію" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Джерело кандидатів</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не вказувати" />
                  </SelectTrigger>
                  <SelectContent>
                    {(sources ?? []).map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {appliedCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {appliedCount} кандидатів уже мають заявку на цю вакансію — для них заявка не
                  створюватиметься, оновляться лише порожні поля картки.
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[45vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr className="text-left">
                      <th className="p-2 w-8"></th>
                      <th className="p-2">ПІБ</th>
                      <th className="p-2">Компанія</th>
                      <th className="p-2">Посада</th>
                      <th className="p-2">Що станеться</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.map((item, index) => (
                      <tr
                        key={item.row.rowNumber}
                        className={`border-t ${item.selected ? "" : "opacity-40"}`}
                      >
                        <td className="p-2 align-top">
                          <Checkbox checked={item.selected} onCheckedChange={() => toggleRow(index)} />
                        </td>
                        <td className="p-2 align-top font-medium">
                          {item.row.fullName}
                          {item.row.email && (
                            <div className="text-[10px] text-muted-foreground">{item.row.email}</div>
                          )}
                        </td>
                        <td className="p-2 align-top">{item.row.company ?? "—"}</td>
                        <td className="p-2 align-top">{item.row.title ?? "—"}</td>
                        <td className="p-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                item.existingCandidateId ? "border-amber-400 text-amber-700" : ""
                              }`}
                            >
                              {item.existingCandidateId ? "Оновити наявного" : "Створити"}
                            </Badge>
                            {item.alreadyApplied && (
                              <Badge variant="outline" className="text-[10px]">
                                Заявка вже є
                              </Badge>
                            )}
                            {item.outcome !== "active" && (
                              <Badge className="bg-red-100 text-red-800 text-[10px]">
                                {outcomeLabel[item.outcome]}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Обрано {selectedCount}: створити {newCount}, оновити {dupCount}, одразу відмовлених{" "}
              {rejectedCount}.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={runImport.isPending}>
            Скасувати
          </Button>
          {plan && (
            <Button
              onClick={handleImport}
              disabled={!stageId || selectedCount === 0 || runImport.isPending}
            >
              {runImport.isPending ? "Імпорт..." : `Імпортувати ${selectedCount}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
