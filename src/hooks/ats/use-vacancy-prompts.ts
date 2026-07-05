// src/hooks/ats/use-vacancy-prompts.ts
//
// Промт AI-звіту per-vacancy/per-kind (Додаток A, п.2). unique(vacancy_id, kind) —
// upsert. RLS: mp_can_access_vacancy (select) / mp_can_edit_vacancy (write).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type VacancyPrompt = Database["public"]["Tables"]["vacancy_prompts"]["Row"];
export type VacancyPromptKind = Database["public"]["Enums"]["vacancy_prompt_kind"];

const promptsByVacancyKey = (vacancyId: string) => ["ats", "vacancy_prompts", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Обидва промти вакансії (candidate_report + comparative_report) — RLS: mp_can_access_vacancy. */
export function useVacancyPrompts(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? promptsByVacancyKey(vacancyId) : ["ats", "vacancy_prompts", "vacancy", "unknown"],
    queryFn: async (): Promise<VacancyPrompt[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase.from("vacancy_prompts").select("*").eq("vacancy_id", vacancyId);
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

/** Upsert промту для конкретного kind — RLS: mp_can_edit_vacancy. */
export function useSaveVacancyPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vacancyId,
      kind,
      prompt,
    }: {
      vacancyId: string;
      kind: VacancyPromptKind;
      prompt: string;
    }): Promise<VacancyPrompt> => {
      const { data, error } = await supabase
        .from("vacancy_prompts")
        .upsert({ vacancy_id: vacancyId, kind, prompt }, { onConflict: "vacancy_id,kind" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: promptsByVacancyKey(data.vacancy_id) });
      toast.success("Промт збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
