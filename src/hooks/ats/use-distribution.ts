import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DistributionCounts {
  clients: number;
  projects: number;
  vacancies: number;
  candidates: number;
}

async function countOf(table: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

/** Лічильники ресурсів у межах поточного тенанта (RLS обмежує scope). */
export function useDistributionCounts() {
  return useQuery({
    queryKey: ["ats", "distribution_counts"],
    queryFn: async (): Promise<DistributionCounts> => {
      const [clients, projects, vacancies, candidates] = await Promise.all([
        countOf("clients"),
        countOf("hiring_projects"),
        countOf("vacancies"),
        countOf("ats_candidates"),
      ]);
      return { clients, projects, vacancies, candidates };
    },
    staleTime: 60_000,
  });
}
