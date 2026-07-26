import type { PipelineStage } from "@/hooks/ats/use-pipeline";
import type { SearchPhase } from "@/hooks/ats/use-search-phases";
import type { ApplicationWithCandidate } from "@/hooks/ats/use-applications";

/**
 * Тайм-трекер SLA — світлофор зелений/жовтий/червоний.
 *
 * Дві незалежні осі:
 *  - КАНДИДАТ на стадії: днів від stage_entered_at проти порогів стадії
 *    (sla_yellow_days/sla_red_days) або глобального дефолту.
 *  - ЕТАП vs план: search_phases.planned_end проти сьогодні.
 *
 * Усе рахується на клієнті з уже завантажених даних — без окремих запитів.
 */

export type SlaFlag = "green" | "yellow" | "red";

/** Глобальні дефолтні пороги (днів), коли на стадії не задано власних. */
export const SLA_DEFAULT_YELLOW = 4;
export const SLA_DEFAULT_RED = 8;

export const slaFlagLabel: Record<SlaFlag, string> = {
  green: "У нормі",
  yellow: "Затримується",
  red: "Завис",
};

/** Tailwind-класи для крапки-прапорця. */
export const slaDotClass: Record<SlaFlag, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

/** Скільки повних днів минуло від ISO-дати до тепер. */
export function daysSinceIso(iso: string | null | undefined): number {
  if (!iso) return 0;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

/** Час, від якого рахуємо перебування на стадії (fallback applied_at). */
function stageClockStart(application: ApplicationWithCandidate): string | null {
  const withStamp = application as ApplicationWithCandidate & { stage_entered_at?: string | null };
  return withStamp.stage_entered_at ?? application.applied_at ?? null;
}

export interface CandidateSla {
  days: number;
  flag: SlaFlag;
  yellowAt: number;
  redAt: number;
}

/**
 * Світлофор кандидата на стадії. Відмовлені/неактивні заявки не старіють —
 * повертаємо зелений і не рахуємо (їх немає у воронці).
 */
export function candidateSla(
  application: ApplicationWithCandidate,
  stage: Pick<PipelineStage, "sla_yellow_days" | "sla_red_days"> | undefined,
): CandidateSla {
  const yellowAt = stage?.sla_yellow_days ?? SLA_DEFAULT_YELLOW;
  const redAt = stage?.sla_red_days ?? SLA_DEFAULT_RED;

  if (application.status !== "active") {
    return { days: 0, flag: "green", yellowAt, redAt };
  }

  const days = daysSinceIso(stageClockStart(application));
  const flag: SlaFlag = days >= redAt ? "red" : days >= yellowAt ? "yellow" : "green";
  return { days, flag, yellowAt, redAt };
}

export interface PhaseSla {
  flag: SlaFlag;
  /** Днів до/після планового завершення (від'ємне — прострочено). */
  daysToPlanned: number | null;
  overdue: boolean;
}

/**
 * Світлофор етапу проти планової дати. Завершені етапи (done) — завжди зелені.
 * Жовтий — коли до planned_end лишилось ≤2 дні; червоний — прострочено.
 */
export function phaseSla(phase: Pick<SearchPhase, "planned_end" | "status">): PhaseSla {
  if (phase.status === "done" || !phase.planned_end) {
    return { flag: "green", daysToPlanned: null, overdue: false };
  }
  const plannedMs = new Date(phase.planned_end).getTime();
  const daysToPlanned = Math.floor((plannedMs - Date.now()) / 86_400_000);
  const overdue = daysToPlanned < 0;
  const flag: SlaFlag = overdue ? "red" : daysToPlanned <= 2 ? "yellow" : "green";
  return { flag, daysToPlanned, overdue };
}

/** Найгірший прапорець із набору (для агрегації по етапу/вакансії). */
export function worstFlag(flags: SlaFlag[]): SlaFlag {
  if (flags.includes("red")) return "red";
  if (flags.includes("yellow")) return "yellow";
  return "green";
}
