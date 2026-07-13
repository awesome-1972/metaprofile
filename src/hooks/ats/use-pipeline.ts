import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];

const stagesByVacancyKey = (vacancyId: string) => ["ats", "pipeline_stages", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

/** Стадії воронки вакансії, впорядковані для kanban-колонок (RLS: доступ до вакансії). */
export function usePipelineStages(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? stagesByVacancyKey(vacancyId) : ["ats", "pipeline_stages", "vacancy", "unknown"],
    queryFn: async (): Promise<PipelineStage[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .order("position", { ascending: true });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!vacancyId,
    staleTime: 30_000,
  });
}

/**
 * Засів стадій більше НЕ живе тут.
 *
 * Із переходом на етапи пошуку (міграція 20260713090000) стадія завжди належить
 * етапу, тому воронка сіється однією SQL-функцією `mp_seed_vacancy_pipeline`
 * (етапи + їхні стадії за один прохід): див. `useSeedVacancyPipeline`
 * у `@/hooks/ats/use-search-phases`. Старий плаский засів прибрано навмисно —
 * він створював стадії без phase_id, які не показуються у воронці етапу.
 */
