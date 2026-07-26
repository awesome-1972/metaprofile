import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { candidateSla, slaDotClass, type SlaFlag } from "@/hooks/ats/use-sla";
import type { ApplicationWithCandidate } from "@/hooks/ats/use-applications";
import type { PipelineStage } from "@/hooks/ats/use-pipeline";

interface StuckPanelProps {
  applicationsByStage: Record<string, ApplicationWithCandidate[]>;
  stages: PipelineStage[];
}

interface StuckRow {
  application: ApplicationWithCandidate;
  stage: PipelineStage;
  days: number;
  flag: SlaFlag;
}

/**
 * Блок «Завислі» — зведення кандидатів, що перевищили SLA (жовті/червоні),
 * по всій воронці вакансії. Дає рекрутеру одразу побачити, де затримка, не
 * гортаючи всі стадії. Показуємо лише коли є проблемні; згорнутий за замовч.
 */
export function StuckPanel({ applicationsByStage, stages }: StuckPanelProps) {
  const [open, setOpen] = useState(false);

  const stageById = useMemo(() => {
    const map: Record<string, PipelineStage> = {};
    for (const s of stages) map[s.id] = s;
    return map;
  }, [stages]);

  const rows = useMemo(() => {
    const out: StuckRow[] = [];
    for (const [stageId, apps] of Object.entries(applicationsByStage)) {
      const stage = stageById[stageId];
      if (!stage) continue;
      for (const application of apps) {
        if (application.status !== "active") continue;
        const sla = candidateSla(application, stage);
        if (sla.flag === "green") continue;
        out.push({ application, stage, days: sla.days, flag: sla.flag });
      }
    }
    // Найгірші згори: червоні перед жовтими, всередині — за днями спадно.
    return out.sort((a, b) => {
      if (a.flag !== b.flag) return a.flag === "red" ? -1 : 1;
      return b.days - a.days;
    });
  }, [applicationsByStage, stageById]);

  const redCount = rows.filter((r) => r.flag === "red").length;
  const yellowCount = rows.length - redCount;

  if (rows.length === 0) return null;

  return (
    <Card className="mb-4 border-amber-200">
      <CardContent className="p-3">
        <button
          type="button"
          className="flex items-center gap-2 w-full text-left"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium">Завислі</span>
          {redCount > 0 && (
            <Badge className="bg-red-100 text-red-800 text-[10px]">{redCount} завис</Badge>
          )}
          {yellowCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 text-[10px]">
              {yellowCount} затримується
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {open ? "згорнути" : "показати"}
          </span>
        </button>

        {open && (
          <div className="mt-3 space-y-1">
            {rows.map((row) => (
              <div
                key={row.application.id}
                className="flex items-center gap-2 text-xs py-1 border-b last:border-b-0"
              >
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${slaDotClass[row.flag]}`} />
                <Link
                  to={`/ats/candidates/${row.application.candidate_id}`}
                  className="font-medium hover:underline truncate flex-1"
                >
                  {row.application.candidate?.full_name ?? "Без імені"}
                </Link>
                <span className="text-muted-foreground truncate max-w-[40%]">{row.stage.name}</span>
                <Badge variant="outline" className="text-[10px] flex-shrink-0">
                  {row.days} дн.
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
