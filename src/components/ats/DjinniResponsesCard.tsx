import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useVacancyDjinniJobId,
  useSetDjinniJobId,
  useDjinniJobs,
  useImportDjinniResponses,
} from "@/hooks/ats/use-djinni";

interface DjinniResponsesCardProps {
  vacancyId: string;
  canEdit: boolean;
}

/** Інтеграція Djinni: прив'язка job_id + підтягування відгуків у воронку (IT-ролі). */
export function DjinniResponsesCard({ vacancyId, canEdit }: DjinniResponsesCardProps) {
  const { data: savedJobId } = useVacancyDjinniJobId(vacancyId);
  const setJobId = useSetDjinniJobId();
  const listJobs = useDjinniJobs();
  const importResponses = useImportDjinniResponses();

  const [jobId, setJobIdInput] = useState("");
  useEffect(() => { if (savedJobId != null) setJobIdInput(savedJobId); }, [savedJobId]);

  if (!canEdit) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium">Інтеграція Djinni</span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => listJobs.mutate()} disabled={listJobs.isPending}>
            {listJobs.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Мої вакансії
          </Button>
        </div>

        {listJobs.data && listJobs.data.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Обрати вакансію Djinni</Label>
            <Select value={jobId} onValueChange={setJobIdInput}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Оберіть зі списку" /></SelectTrigger>
              <SelectContent>
                {listJobs.data.map((j) => (
                  <SelectItem key={j.id} value={j.id} className="text-xs">
                    {j.name} · #{j.id}{j.active ? "" : " (неактивна)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="djinni-job" className="text-xs">Djinni job_id</Label>
            <Input id="djinni-job" className="h-8 text-sm" value={jobId} onChange={(e) => setJobIdInput(e.target.value)} placeholder="напр. 123456" />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={setJobId.isPending || jobId === (savedJobId ?? "")}
            onClick={() => setJobId.mutate({ vacancyId, jobId: jobId.trim() || null })}
          >
            Зберегти
          </Button>
          <Button
            size="sm"
            className="h-8"
            disabled={!savedJobId || importResponses.isPending}
            onClick={() => importResponses.mutate(vacancyId)}
          >
            {importResponses.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Підтягнути відгуки
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Прив'яжіть цю вакансію до вашої вакансії на Djinni (job_id) — відгуки кандидатів підтягнуться у воронку (лонг-лист) з контактами й лінком на профіль. Дублі не імпортуються повторно.
        </p>
      </CardContent>
    </Card>
  );
}
