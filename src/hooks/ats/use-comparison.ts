// src/hooks/ats/use-comparison.ts
//
// Comparison matrix (Interview Kit / MVP+, roadmap-ATS-platform.md розділ 2,
// "Candidate comparison matrix"): зводить УСІ заявки вакансії в одну
// структуру — рядки = компетенції по групах (з вагами), колонки = кандидати,
// бал 1..3 у клітинці, внизу total weighted score + вердикт.
//
// ФОРМУЛА НАРОЧНЕ ЗБІГАЄТЬСЯ З generate-candidate-report/index.ts::
// computeWeightedScore: weightedScore = Σ(вага×бал) / Σ(ваг ОЦІНЕНИХ
// компетенцій), пороги 2.34 висока / 1.67 середня (нижче — низька). Якщо тут
// зміниться формула без синхронної зміни Edge Function — таблиця й AI-звіт
// розійдуться в оцінці одного й того ж кандидата, тому НЕ дублюємо логіку
// незалежно від use-competency-scores.ts::computeScoreSummary (та сама
// формула, тут лише по кожному кандидату окремо + must-have gate).
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useVacancyCompetencies, type VacancyCompetency } from "@/hooks/ats/use-competencies";
import { useApplications } from "@/hooks/ats/use-applications";
import { SCORE_THRESHOLD_HIGH, SCORE_THRESHOLD_MEDIUM, type ScoreVerdict } from "@/hooks/ats/use-competency-scores";

export type CompetencyScoreRow = Database["public"]["Tables"]["competency_scores"]["Row"];

// Бал нижче цього на must-have компетенції = "gate не пройдено" (Додаток A:
// 1 — низька, 2 — часткова, 3 — висока відповідність компетенції; must-have
// вимагає щонайменше "часткової", тобто >= 2).
const MUST_HAVE_MIN_SCORE = 2;

export interface CandidateComparisonColumn {
  applicationId: string;
  candidateId: string;
  candidateName: string;
  scoresByCompetency: Map<string, CompetencyScoreRow>;
  weightedScore: number | null;
  verdict: ScoreVerdict | null;
  mustHaveFailed: boolean;
  failedMustHaveCompetencyIds: string[];
  isScored: boolean;
  shortlistOverride: boolean;
  shortlistOverrideReason: string | null;
}

function computeWeightedScore(
  competencies: VacancyCompetency[],
  scoresByCompetency: Map<string, CompetencyScoreRow>,
): number | null {
  let weightedSum = 0;
  let totalWeightScored = 0;
  for (const c of competencies) {
    const s = scoresByCompetency.get(c.id);
    if (!s) continue;
    weightedSum += c.weight * s.score;
    totalWeightScored += c.weight;
  }
  if (totalWeightScored === 0) return null;
  return weightedSum / totalWeightScored;
}

function verdictFor(score: number): ScoreVerdict {
  if (score >= SCORE_THRESHOLD_HIGH) return "висока";
  if (score >= SCORE_THRESHOLD_MEDIUM) return "середня";
  return "низька";
}

/** Усі competency_scores по ВСІХ заявках вакансії одним запитом (для матриці). */
function useAllScoresForApplications(applicationIds: string[]) {
  const key = applicationIds.slice().sort().join(",");
  return useQuery({
    queryKey: ["ats", "competency_scores", "applications", key],
    queryFn: async (): Promise<CompetencyScoreRow[]> => {
      if (applicationIds.length === 0) return [];
      const { data, error } = await supabase.from("competency_scores").select("*").in("application_id", applicationIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: applicationIds.length > 0,
    staleTime: 10_000,
  });
}

export interface ComparisonMatrix {
  competencies: VacancyCompetency[];
  columns: CandidateComparisonColumn[];
  scoredColumns: CandidateComparisonColumn[];
  unscoredColumns: CandidateComparisonColumn[];
  isLoading: boolean;
  hasMatrix: boolean;
}

/** Comparison matrix вакансії — компетенції × усі заявки, зважений бал, must-have gate. */
export function useComparisonMatrix(vacancyId: string | undefined): ComparisonMatrix {
  const { data: competencies, isLoading: compLoading } = useVacancyCompetencies(vacancyId);
  const { data: applications, isLoading: appsLoading } = useApplications(vacancyId);

  const applicationIds = useMemo(() => (applications ?? []).map((a) => a.id), [applications]);
  const { data: allScores, isLoading: scoresLoading } = useAllScoresForApplications(applicationIds);

  const mustHaveCompetencies = useMemo(
    () => (competencies ?? []).filter((c) => c.is_must_have),
    [competencies],
  );

  const columns: CandidateComparisonColumn[] = useMemo(() => {
    return (applications ?? []).map((app) => {
      const scoresByCompetency = new Map<string, CompetencyScoreRow>();
      for (const s of allScores ?? []) {
        if (s.application_id === app.id) scoresByCompetency.set(s.competency_id, s);
      }
      const weightedScore = computeWeightedScore(competencies ?? [], scoresByCompetency);
      const verdict = weightedScore !== null ? verdictFor(weightedScore) : null;

      const failedMustHaveCompetencyIds = mustHaveCompetencies
        .filter((c) => {
          const s = scoresByCompetency.get(c.id);
          return !!s && s.score < MUST_HAVE_MIN_SCORE;
        })
        .map((c) => c.id);

      return {
        applicationId: app.id,
        candidateId: app.candidate_id,
        candidateName: app.candidate?.full_name ?? "Без імені",
        scoresByCompetency,
        weightedScore,
        verdict,
        mustHaveFailed: failedMustHaveCompetencyIds.length > 0,
        failedMustHaveCompetencyIds,
        isScored: scoresByCompetency.size > 0,
        shortlistOverride: app.shortlist_override ?? false,
        shortlistOverrideReason: app.shortlist_override_reason ?? null,
      };
    });
  }, [applications, allScores, competencies, mustHaveCompetencies]);

  const scoredColumns = useMemo(
    () =>
      columns
        .filter((c) => c.isScored)
        .sort((a, b) => (b.weightedScore ?? 0) - (a.weightedScore ?? 0)),
    [columns],
  );
  const unscoredColumns = useMemo(() => columns.filter((c) => !c.isScored), [columns]);

  return {
    competencies: competencies ?? [],
    columns,
    scoredColumns,
    unscoredColumns,
    isLoading: compLoading || appsLoading || scoresLoading,
    hasMatrix: (competencies ?? []).length > 0,
  };
}
