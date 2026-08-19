import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface WorkuaJob { id: string; name: string; active: boolean }

async function edgeError(error: unknown, fallback: string): Promise<string> {
  // supabase-js FunctionsHttpError: error.context — це Response із тілом {error, detail}.
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const b = await (ctx as Response).json();
      if (b?.error) return b.detail ? `${b.error}: ${b.detail}` : b.error;
      if (b?.detail) return b.detail;
    } catch { /* ignore */ }
  }
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
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати вакансії work.ua"));
      return (data as { jobs?: WorkuaJob[] })?.jobs ?? [];
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка work.ua"),
  });
}

export interface WorkuaDictItem { id: string; name: string }
export interface WorkuaDictionaries {
  town: WorkuaDictItem[];
  category: WorkuaDictItem[];
  jobtype: WorkuaDictItem[];
  experience: WorkuaDictItem[];
  education: WorkuaDictItem[];
  publication_type: WorkuaDictItem[];
}

/** Довідники work.ua для форми публікації. */
export function useWorkuaDictionaries() {
  return useMutation({
    mutationFn: async (): Promise<WorkuaDictionaries> => {
      const { data, error } = await supabase.functions.invoke("workua-connector", { body: { action: "dictionaries" } });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати довідники work.ua"));
      return data as WorkuaDictionaries;
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка work.ua"),
  });
}

export interface PublishWorkuaArgs {
  vacancyId: string;
  region_id: string;
  category_ids: string[];
  jobtype_ids: string[];
  experience_id: string;
  education_id?: string;
  publication?: string;
  salary_value?: number;
  salary_value_max?: number;
  salary_comment?: string;
}

/** Опублікувати/оновити вакансію на work.ua. */
export function usePublishToWorkua() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: PublishWorkuaArgs): Promise<{ job_id: string | null; published: boolean }> => {
      const { data, error } = await supabase.functions.invoke("workua-connector", {
        body: {
          action: "publish_job",
          vacancy_id: args.vacancyId,
          region_id: args.region_id,
          category_ids: args.category_ids,
          jobtype_ids: args.jobtype_ids,
          experience_id: args.experience_id,
          education_id: args.education_id,
          publication: args.publication,
          salary_value: args.salary_value,
          salary_value_max: args.salary_value_max,
          salary_comment: args.salary_comment,
        },
      });
      if (error) throw new Error(await edgeError(error, "Не вдалося опублікувати"));
      const body = data as { error?: string; detail?: string; job_id?: string; published?: boolean };
      if (body?.error) throw new Error(body.detail || body.error);
      return { job_id: body.job_id ?? null, published: !!body.published };
    },
    onSuccess: (res, args) => {
      qc.invalidateQueries({ queryKey: ["ats", "workua_job", args.vacancyId] });
      toast.success(res.published ? "Вакансію опубліковано на work.ua" : "Вакансію збережено на work.ua (чернетка)");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка публікації"),
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
