import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AtsCandidate = Database["public"]["Tables"]["ats_candidates"]["Row"];
export type AtsCandidateInsert = Database["public"]["Tables"]["ats_candidates"]["Insert"];
export type AtsCandidateUpdate = Database["public"]["Tables"]["ats_candidates"]["Update"];

export type AtsCandidateWithSource = AtsCandidate & {
  source: { id: string; name: string } | null;
  applications_count: number;
};

const CANDIDATES_KEY = ["ats", "candidates"] as const;
const candidateKey = (id: string) => ["ats", "candidates", id] as const;
const candidatesSearchKey = (search: string) => ["ats", "candidates", "search", search] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Список кандидатів, доступних поточному користувачу (RLS: scope через applications). */
export function useCandidates() {
  return useQuery({
    queryKey: CANDIDATES_KEY,
    queryFn: async (): Promise<AtsCandidateWithSource[]> => {
      const { data, error } = await supabase
        .from("ats_candidates")
        .select("*, source:candidate_sources(id, name), applications(count)")
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map((row) => {
        const { applications, ...rest } = row as AtsCandidate & {
          source: { id: string; name: string } | null;
          applications: { count: number }[] | null;
        };
        return {
          ...rest,
          applications_count: applications?.[0]?.count ?? 0,
        } as AtsCandidateWithSource;
      });
    },
    staleTime: 30_000,
  });
}

/** Пошук кандидатів за іменем або email (клієнтський ilike-запит під RLS). */
export function useSearchCandidates(search: string) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: candidatesSearchKey(trimmed),
    queryFn: async (): Promise<AtsCandidateWithSource[]> => {
      const { data, error } = await supabase
        .from("ats_candidates")
        .select("*, source:candidate_sources(id, name), applications(count)")
        .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
        .order("full_name")
        .limit(50);
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map((row) => {
        const { applications, ...rest } = row as AtsCandidate & {
          source: { id: string; name: string } | null;
          applications: { count: number }[] | null;
        };
        return {
          ...rest,
          applications_count: applications?.[0]?.count ?? 0,
        } as AtsCandidateWithSource;
      });
    },
    enabled: trimmed.length > 0,
    staleTime: 15_000,
  });
}

/** Один кандидат за id, з джерелом (RLS: mp_can_access_candidate). */
export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: id ? candidateKey(id) : ["ats", "candidates", "unknown"],
    queryFn: async (): Promise<AtsCandidateWithSource | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("ats_candidates")
        .select("*, source:candidate_sources(id, name)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      if (!data) return null;
      return { ...(data as AtsCandidate & { source: { id: string; name: string } | null }), applications_count: 0 };
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Довідник джерел кандидатів (глобальний, readonly для не-admin). */
export function useCandidateSources() {
  return useQuery({
    queryKey: ["ats", "candidate_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_sources")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

/** Створення кандидата — будь-який внутрішній користувач (RLS: candidates_insert). */
export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AtsCandidateInsert): Promise<AtsCandidate> => {
      const { data, error } = await supabase.from("ats_candidates").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      toast.success("Кандидата створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення картки кандидата — власник, автор або can_edit у scope (RLS: candidates_update). */
export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AtsCandidateUpdate }): Promise<AtsCandidate> => {
      const { data, error } = await supabase.from("ats_candidates").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      qc.invalidateQueries({ queryKey: candidateKey(data.id) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
