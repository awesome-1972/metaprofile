import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface RobotaJob { id: string; name: string; active: boolean }
export interface RobotaDictItem { id: string; name: string }
export interface RobotaDictionaries {
  city: RobotaDictItem[];
  publication_type: RobotaDictItem[];
  employment_type: RobotaDictItem[];
  work_type: RobotaDictItem[];
}

async function edgeError(error: unknown, fallback: string): Promise<string> {
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

/** robota.ua vacancy_id, прив'язаний до вакансії. */
export function useVacancyRobotaId(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? ["ats", "robota_job", vacancyId] : ["ats", "robota_job", "none"],
    queryFn: async (): Promise<string | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase.from("vacancies").select("robotaua_vacancy_id").eq("id", vacancyId).maybeSingle();
      if (error) throw error;
      return (data as { robotaua_vacancy_id: string | null } | null)?.robotaua_vacancy_id ?? null;
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Зберегти robota.ua vacancy_id вручну. */
export function useSetRobotaId() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, jobId }: { vacancyId: string; jobId: string | null }): Promise<void> => {
      const { error } = await supabase.from("vacancies").update({ robotaua_vacancy_id: jobId } as never).eq("id", vacancyId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["ats", "robota_job", v.vacancyId] });
      toast.success("Прив'язку до Robota.ua збережено");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Не вдалося зберегти"),
  });
}

/** Список вакансій акаунта robota.ua. */
export function useRobotaJobs() {
  return useMutation({
    mutationFn: async (): Promise<RobotaJob[]> => {
      const { data, error } = await supabase.functions.invoke("robota-connector", { body: { action: "list_jobs" } });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати вакансії robota.ua"));
      return (data as { jobs?: RobotaJob[] })?.jobs ?? [];
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка robota.ua"),
  });
}

/** Довідники robota.ua для форми публікації. */
export function useRobotaDictionaries() {
  return useMutation({
    mutationFn: async (): Promise<RobotaDictionaries> => {
      const { data, error } = await supabase.functions.invoke("robota-connector", { body: { action: "dictionaries" } });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати довідники robota.ua"));
      return data as RobotaDictionaries;
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка robota.ua"),
  });
}

export interface PublishRobotaArgs {
  vacancyId: string;
  city_id: string;
  publish_type: string;
  employment_types: string[];
  work_types: string[];
  publish: boolean;
  salary_value?: number;
  salary_from?: number;
  salary_to?: number;
  salary_comment?: string;
  is_for_student?: boolean;
}

/** Створити/оновити + (опційно) опублікувати вакансію на robota.ua. */
export function usePublishToRobota() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: PublishRobotaArgs): Promise<{ job_id: string | null; published: boolean; requested: boolean; note?: string }> => {
      const { data, error } = await supabase.functions.invoke("robota-connector", {
        body: {
          action: "publish_job",
          vacancy_id: args.vacancyId,
          city_id: args.city_id,
          publish_type: args.publish_type,
          employment_types: args.employment_types,
          work_types: args.work_types,
          publish: args.publish,
          salary_value: args.salary_value,
          salary_from: args.salary_from,
          salary_to: args.salary_to,
          salary_comment: args.salary_comment,
          is_for_student: args.is_for_student,
        },
      });
      if (error) throw new Error(await edgeError(error, "Не вдалося опублікувати"));
      const b = data as { error?: string; detail?: string; job_id?: string; published?: boolean; requested?: boolean; note?: string };
      if (b?.error) throw new Error(b.detail || b.error);
      return { job_id: b.job_id ?? null, published: !!b.published, requested: !!b.requested, note: b.note };
    },
    onSuccess: (res, args) => {
      qc.invalidateQueries({ queryKey: ["ats", "robota_job", args.vacancyId] });
      if (res.published) toast.success("Вакансію опубліковано на robota.ua (активна)");
      else if (res.note) toast.warning(res.note);
      else toast.success("Вакансію збережено на robota.ua (чернетка)");
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка публікації"),
  });
}

/** Підтягнути відгуки robota.ua у воронку вакансії. */
export function useImportRobotaResponses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ imported: number; skipped: number; total: number }> => {
      const { data, error } = await supabase.functions.invoke("robota-connector", {
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
