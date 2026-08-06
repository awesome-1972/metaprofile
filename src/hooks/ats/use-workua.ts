import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface WorkuaJob { id: string; name: string; active: boolean }

function edgeError(error: unknown, fallback: string): string {
  const ctx = (error as { context?: { error?: string; detail?: string } })?.context;
  if (ctx?.error) return ctx.detail ? `${ctx.error}: ${ctx.detail}` : ctx.error;
  return (error as { message?: string })?.message || fallback;
}

/** work.ua job_id, прив'язаний до вакансії. */
export function useVacancyWorkuaJobId(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? ["ats", "workua_job", vacancyId] : ["ats", "workua_job", "none"],
    queryFn: async (): Promise<string | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase.from("vacancies").select("workua_job_id").eq("id", vacancyId).maybeSingle();
      if (error) throw error;
      return (data as { workua_job_id: string | null } | null)?.workua_job_id ?? null;
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Зберегти work.ua job_id на вакансії. */
export function useSetWorkuaJobId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, jobId }: { vacancyId: string; jobId: string | null }): Promise<void> => {
      const { error } = await supabase.from("vacancies").update({ workua_job_id: jobId } as never).eq("id", vacancyId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ats", "workua_job", v.vacancyId] });
      toast.success("Прив'язку до Work.ua збережено");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Не вдалося зберегти"),
  });
}

/** Список вакансій акаунта work.ua (для вибору job_id). */
export function useWorkuaJobs() {
  return useMutation({
    mutationFn: async (): Promise<WorkuaJob[]> => {
      const { data, error } = await supabase.functions.invoke("workua-connector", { body: { action: "list_jobs" } });
      if (error) throw new Error(edgeError(error, "Не вдалося отримати вакансії work.ua"));
      return (data as { jobs?: WorkuaJob[] })?.jobs ?? [];
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка work.ua"),
  });
}

/** Підтягнути відгуки work.ua у воронку вакансії. */
export function useImportWorkuaResponses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ imported: number; skipped: number; total: number }> => {
      const { data, error } = await supabase.functions.invoke("workua-connector", {
        body: { action: "import_responses", vacancy_id: vacancyId },
      });
      if (error) throw new Error(edgeError(error, "Не вдалося підтягнути відгуки"));
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
