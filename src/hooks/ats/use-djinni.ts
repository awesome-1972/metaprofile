import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface DjinniJob { id: string; name: string; active: boolean }

async function edgeError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const b = await (ctx as Response).json();
      if (b?.error === "djinni_not_configured") return "Не додано ключ Djinni (секрет DJINNI_API_KEY)";
      if (b?.error) return b.detail ? `${b.error}: ${b.detail}` : b.error;
      if (b?.detail) return b.detail;
    } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message || fallback;
}

/** Djinni job_id, прив'язаний до вакансії. */
export function useVacancyDjinniJobId(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? ["ats", "djinni_job", vacancyId] : ["ats", "djinni_job", "none"],
    queryFn: async (): Promise<string | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase.from("vacancies").select("djinni_job_id").eq("id", vacancyId).maybeSingle();
      if (error) throw error;
      return (data as { djinni_job_id: string | null } | null)?.djinni_job_id ?? null;
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Зберегти Djinni job_id на вакансії. */
export function useSetDjinniJobId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, jobId }: { vacancyId: string; jobId: string | null }): Promise<void> => {
      const { error } = await supabase.from("vacancies").update({ djinni_job_id: jobId } as never).eq("id", vacancyId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ats", "djinni_job", v.vacancyId] });
      toast.success("Прив'язку до Djinni збережено");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Не вдалося зберегти"),
  });
}

/** Список вакансій акаунта Djinni. */
export function useDjinniJobs() {
  return useMutation({
    mutationFn: async (): Promise<DjinniJob[]> => {
      const { data, error } = await supabase.functions.invoke("djinni-connector", { body: { action: "list_jobs" } });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати вакансії Djinni"));
      return (data as { jobs?: DjinniJob[] })?.jobs ?? [];
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка Djinni"),
  });
}

/** Підтягнути відгуки Djinni у воронку вакансії. */
export function useImportDjinniResponses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ imported: number; skipped: number; total: number }> => {
      const { data, error } = await supabase.functions.invoke("djinni-connector", {
        body: { action: "import_responses", vacancy_id: vacancyId },
      });
      if (error) throw new Error(await edgeError(error, "Не вдалося підтягнути відгуки"));
      return data as { imported: number; skipped: number; total: number };
    },
    onSuccess: (res, vacancyId) => {
      qc.invalidateQueries({ queryKey: ["ats", "applications", "vacancy", vacancyId] });
      qc.invalidateQueries({ queryKey: ["ats", "candidates"] });
      qc.invalidateQueries({ queryKey: ["ats", "vacancies"] });
      toast.success(res.imported > 0 ? `Імпортовано відгуків: ${res.imported}` : "Нових відгуків немає");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка імпорту відгуків"),
  });
}
