import { useEffect, useState } from "react";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useVacancyRobotaId,
  useSetRobotaId,
  useRobotaJobs,
  useImportRobotaResponses,
} from "@/hooks/ats/use-robota";
import { RobotaPublishDialog } from "@/components/ats/RobotaPublishDialog";

interface RobotaResponsesCardProps {
  vacancyId: string;
  canEdit: boolean;
}

/** Інтеграція Robota.ua: публікація + прив'язка vacancy_id + підтягування відгуків. */
export function RobotaResponsesCard({ vacancyId, canEdit }: RobotaResponsesCardProps) {
  const { data: savedId } = useVacancyRobotaId(vacancyId);
  const setId = useSetRobotaId();
  const listJobs = useRobotaJobs();
  const importResponses = useImportRobotaResponses();

  const [jobId, setJobIdInput] = useState("");
  useEffect(() => { if (savedId != null) setJobIdInput(savedId); }, [savedId]);

  if (!canEdit) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium">Інтеграція Robota.ua</span>
          <div className="flex items-center gap-2">
            <RobotaPublishDialog vacancyId={vacancyId} isEdit={!!savedId} />
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => listJobs.mutate()} disabled={listJobs.isPending}>
              {listJobs.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
              Мої вакансії
            </Button>
          </div>
        </div>

        {listJobs.data && listJobs.data.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Обрати вакансію robota.ua</Label>
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
            <Label htmlFor="robota-job" className="text-xs">robota.ua vacancy_id</Label>
            <Input id="robota-job" className="h-8 text-sm" value={jobId} onChange={(e) => setJobIdInput(e.target.value)} placeholder="напр. 12345678" />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            disabled={setId.isPending || jobId === (savedId ?? "")}
            onClick={() => setId.mutate({ vacancyId, jobId: jobId.trim() || null })}
          >
            Зберегти
          </Button>
          <Button
            size="sm"
            className="h-8"
            disabled={!savedId || importResponses.isPending}
            onClick={() => importResponses.mutate(vacancyId)}
          >
            {importResponses.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Підтягнути відгуки
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Опублікуйте вакансію на Robota.ua або прив'яжіть наявну (vacancy_id) — відгуки підтягнуться у воронку (лонг-лист). Дублі не імпортуються повторно.
        </p>
      </CardContent>
    </Card>
  );
}
