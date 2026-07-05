// src/hooks/ats/use-competency-scores.ts
//
// Бали по компетенціях за заявкою (Додаток A: шкала 1–3, unique(application_id,
// competency_id) — один бал на компетенцію, upsert). Пороги фінальної оцінки —
// ідентичні generate-candidate-report/index.ts (2.34 висока / 1.67 середня).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { VacancyCompetency } from "@/hooks/ats/use-competencies";

export type CompetencyScore = Database["public"]["Tables"]["competency_scores"]["Row"];

const scoresByApplicationKey = (applicationId: string) => ["ats", "competency_scores", "application", applicationId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

// Пороги відповідності — Додаток A (мирор generate-candidate-report/index.ts).
export const SCORE_THRESHOLD_HIGH = 2.34;
export const SCORE_THRESHOLD_MEDIUM = 1.67;

export type ScoreVerdict = "висока" | "середня" | "низька";

export function verdictForScore(score: number): ScoreVerdict {
  if (score >= SCORE_THRESHOLD_HIGH) return "висока";
  if (score >= SCORE_THRESHOLD_MEDIUM) return "середня";
  return "низька";
}

export interface GroupScoreSummary {
  groupName: string;
  groupWeight: number;
  weightedScore: number | null;
  scoredCount: number;
  totalCount: number;
}

export interface OverallScoreSummary {
  overall: number | null;
  groups: GroupScoreSummary[];
}

/**
 * Зважений бал по групі і загальний — узгоджено з формулою Edge Function
 * generate-candidate-report (computeWeightedScore): сума(вага×бал)/сума(ваг
 * оцінених компетенцій), у межах групи; загальний — та сама формула по всій
 * матриці незалежно від group_weight (group_weight сьогодні інформаційний,
 * не використовується в розрахунку — узгоджено з Edge Function, яка також
 * не множить на group_weight поверх власної ваги компетенції).
 */
export function computeScoreSummary(
  competencies: VacancyCompetency[],
  scores: CompetencyScore[],
): OverallScoreSummary {
  const scoreByCompetency = new Map(scores.map((s) => [s.competency_id, s.score]));
  const byGroup = new Map<string, { groupWeight: number; items: VacancyCompetency[] }>();
  for (const c of competencies) {
    const g = byGroup.get(c.group_name) ?? { groupWeight: c.group_weight, items: [] };
    g.items.push(c);
    byGroup.set(c.group_name, g);
  }

  const groups: GroupScoreSummary[] = [];
  let overallWeightedSum = 0;
  let overallWeightScored = 0;

  for (const [groupName, group] of byGroup) {
    let weightedSum = 0;
    let weightScored = 0;
    let scoredCount = 0;
    for (const c of group.items) {
      const score = scoreByCompetency.get(c.id);
      if (score === undefined) continue;
      weightedSum += c.weight * score;
      weightScored += c.weight;
      scoredCount += 1;
      overallWeightedSum += c.weight * score;
      overallWeightScored += c.weight;
    }
    groups.push({
      groupName,
      groupWeight: group.groupWeight,
      weightedScore: weightScored > 0 ? weightedSum / weightScored : null,
      scoredCount,
      totalCount: group.items.length,
    });
  }

  return {
    overall: overallWeightScored > 0 ? overallWeightedSum / overallWeightScored : null,
    groups,
  };
}

/** Бали заявки по компетенціях — RLS: mp_can_access_application. */
export function useCompetencyScores(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationId ? scoresByApplicationKey(applicationId) : ["ats", "competency_scores", "application", "unknown"],
    queryFn: async (): Promise<CompetencyScore[]> => {
      if (!applicationId) return [];
      const { data, error } = await supabase
        .from("competency_scores")
        .select("*")
        .eq("application_id", applicationId);
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!applicationId,
    staleTime: 10_000,
  });
}

/**
 * Upsert одного бала (unique(application_id, competency_id)) — RLS:
 * mp_can_edit_vacancy через join applications→vacancy (розділ 6.4 міграції).
 */
export function useUpsertCompetencyScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      competencyId,
      score,
      note,
    }: {
      applicationId: string;
      competencyId: string;
      score: number;
      note?: string | null;
    }): Promise<CompetencyScore> => {
      const { data, error } = await supabase
        .from("competency_scores")
        .upsert(
          { application_id: applicationId, competency_id: competencyId, score, note: note ?? null },
          { onConflict: "application_id,competency_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: scoresByApplicationKey(data.application_id) });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Збереження оцінки в діалозі "Оцінка компетенцій" — успіх лише після ВСІХ upsert-ів. */
export function useSaveCompetencyScores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      entries,
    }: {
      applicationId: string;
      entries: { competencyId: string; score: number; note?: string | null }[];
    }): Promise<CompetencyScore[]> => {
      const rows = entries.map((e) => ({
        application_id: applicationId,
        competency_id: e.competencyId,
        score: e.score,
        note: e.note ?? null,
      }));
      if (rows.length === 0) return [];
      const { data, error } = await supabase
        .from("competency_scores")
        .upsert(rows, { onConflict: "application_id,competency_id" })
        .select();
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: scoresByApplicationKey(variables.applicationId) });
      toast.success("Оцінку компетенцій збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
