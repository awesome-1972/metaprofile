import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface MatchBreakdown {
  matched_skills?: string[];
  gaps?: string[];
  rationale?: string | null;
  model?: string;
}
export interface VacancyMatch {
  candidate_id: string;
  full_name: string | null;
  score: number;
  breakdown: MatchBreakdown;
}

const matchesKey = (vacancyId: string) => ["ats", "candidate_matches", vacancyId] as const;

/** Світлофор за скором відповідності. */
export function matchFlag(score: number): "green" | "yellow" | "red" {
  if (score >= 75) return "green";
  if (score >= 50) return "yellow";
  return "red";
}
export const matchDotClass: Record<"green" | "yellow" | "red", string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
};

/** Збережені матчі вакансії (RLS: mp_can_access_vacancy). */
export function useVacancyMatches(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? matchesKey(vacancyId) : ["ats", "candidate_matches", "none"],
    queryFn: async (): Promise<VacancyMatch[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("vacancy_candidate_matches")
        .select("candidate_id, score, breakdown, candidate:ats_candidates(id, full_name)")
        .eq("vacancy_id", vacancyId)
        .order("score", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => {
        const row = r as unknown as {
          candidate_id: string;
          score: number;
          breakdown: MatchBreakdown | null;
          candidate: { full_name: string | null } | null;
        };
        return {
          candidate_id: row.candidate_id,
          full_name: row.candidate?.full_name ?? null,
          score: row.score,
          breakdown: row.breakdown ?? {},
        };
      });
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Порахувати/оновити рекомендації (Edge recommend-candidates). */
export function useRecommendCandidates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ total_scanned: number; count: number }> => {
      const { data, error } = await supabase.functions.invoke("recommend-candidates", {
        body: { vacancy_id: vacancyId },
      });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); detail = p.detail || p.error || ""; }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Не вдалося порахувати рекомендації");
      }
      const res = data as { matches?: unknown[]; total_scanned?: number };
      return { total_scanned: res.total_scanned ?? 0, count: res.matches?.length ?? 0 };
    },
    onSuccess: (res, vacancyId) => {
      qc.invalidateQueries({ queryKey: matchesKey(vacancyId) });
      if (res.count === 0) toast.info("Підхожих кандидатів у базі не знайдено");
      else toast.success(`Знайдено рекомендацій: ${res.count} (переглянуто ${res.total_scanned})`);
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося порахувати рекомендації");
    },
  });
}
