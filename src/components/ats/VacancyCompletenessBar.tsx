import { useState } from "react";
import { ChevronDown, ChevronUp, Gauge } from "lucide-react";
import { useVacancyBrief } from "@/hooks/ats/use-vacancy-brief";
import { useVacancyCompetencies } from "@/hooks/ats/use-competencies";
import { usePublicBrief } from "@/hooks/ats/use-preparation";

interface VacancyLite {
  title: string | null;
  description: string | null;
  location: string | null;
  headcount: number | null;
}

interface VacancyCompletenessBarProps {
  vacancyId: string;
  vacancy: VacancyLite;
  /** Перехід на вкладку вакансії, щоб доповнити (brief/competencies…). */
  onOpenTab?: (tab: string) => void;
}

interface Item {
  key: string;
  label: string;
  points: number;
  done: boolean;
  tab?: string;
}

/**
 * Індикатор «Наповнення вакансії» (ідея з The AIHA): 0–100 з підказками, що
 * додати. Повніша вакансія → точніший matching і сорсинг.
 */
export function VacancyCompletenessBar({ vacancyId, vacancy, onOpenTab }: VacancyCompletenessBarProps) {
  const { data: brief } = useVacancyBrief(vacancyId);
  const { data: competencies } = useVacancyCompetencies(vacancyId);
  const { data: publicBrief } = usePublicBrief(vacancyId);
  const [expanded, setExpanded] = useState(false);

  const items: Item[] = [
    { key: "title", label: "Назва вакансії", points: 10, done: !!vacancy.title?.trim() },
    { key: "description", label: "Опис вакансії", points: 20, done: !!vacancy.description?.trim() },
    { key: "location", label: "Локація", points: 8, done: !!vacancy.location?.trim() },
    { key: "headcount", label: "Кількість позицій", points: 2, done: (vacancy.headcount ?? 0) > 0 },
    { key: "brief", label: "Бріф-опитувальник заповнено", points: 20, done: brief?.status === "completed", tab: "pipeline" },
    { key: "competencies", label: "Матриця компетенцій", points: 20, done: (competencies?.length ?? 0) > 0, tab: "competencies" },
    { key: "public_brief", label: "Бріф для кандидатів затверджено", points: 20, done: publicBrief?.status === "completed", tab: "brief" },
  ];

  const score = items.reduce((s, i) => s + (i.done ? i.points : 0), 0);
  const missing = items.filter((i) => !i.done).sort((a, b) => b.points - a.points);

  const rating =
    score >= 80
      ? { word: "Відмінно", bar: "bg-green-500", chip: "text-green-700 bg-green-100" }
      : score >= 50
        ? { word: "Добре", bar: "bg-amber-500", chip: "text-amber-800 bg-amber-100" }
        : { word: "Слабко", bar: "bg-red-500", chip: "text-red-700 bg-red-100" };

  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <button
        type="button"
        className="w-full flex items-center gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <Gauge className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium whitespace-nowrap">Наповнення вакансії</span>
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${rating.bar} transition-all`} style={{ width: `${score}%` }} />
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rating.chip}`}>{rating.word}</span>
        <span className="text-sm font-semibold tabular-nums w-14 text-right">{score}/100</span>
        {missing.length > 0 &&
          (expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
      </button>

      {expanded && missing.length > 0 && (
        <div className="mt-3 pt-3 border-t space-y-1.5">
          <div className="text-xs text-muted-foreground mb-1">Покращте — додайте:</div>
          {missing.map((m) => (
            <div key={m.key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {m.label} <span className="text-xs text-green-600">+{m.points}</span>
              </span>
              {m.tab && onOpenTab && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => onOpenTab(m.tab!)}
                >
                  Заповнити
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {expanded && missing.length === 0 && (
        <div className="mt-3 pt-3 border-t text-sm text-green-700">Вакансію заповнено повністю 🎉</div>
      )}
    </div>
  );
}
