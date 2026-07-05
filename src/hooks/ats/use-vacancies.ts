import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedVacancyStagesDirect } from "@/hooks/ats/use-pipeline";
import type { Database } from "@/integrations/supabase/types";

export type Vacancy = Database["public"]["Tables"]["vacancies"]["Row"];
export type VacancyInsert = Database["public"]["Tables"]["vacancies"]["Insert"];
export type VacancyUpdate = Database["public"]["Tables"]["vacancies"]["Update"];
export type VacancyStatus = Database["public"]["Enums"]["vacancy_status"];

export type VacancyWithProject = Vacancy & {
  hiring_project: { id: string; name: string; client_id: string; client: { id: string; name: string } | null } | null;
  applications_count: number;
};

const VACANCIES_KEY = ["ats", "vacancies"] as const;
const vacanciesByProjectKey = (projectId: string) => ["ats", "vacancies", "project", projectId] as const;
const vacancyKey = (id: string) => ["ats", "vacancies", id] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Усі вакансії, доступні поточному користувачу (RLS: mp_can_access_vacancy). */
export function useVacancies() {
  return useQuery({
    queryKey: VACANCIES_KEY,
    queryFn: async (): Promise<VacancyWithProject[]> => {
      const { data, error } = await supabase
        .from("vacancies")
        .select("*, hiring_project:hiring_projects(id, name, client_id, client:clients(id, name)), applications(count)")
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map((row) => {
        const { applications, ...rest } = row as Vacancy & {
          hiring_project: VacancyWithProject["hiring_project"];
          applications: { count: number }[] | null;
        };
        return {
          ...rest,
          applications_count: applications?.[0]?.count ?? 0,
        } as VacancyWithProject;
      });
    },
    staleTime: 30_000,
  });
}

/** Вакансії конкретного проекту найму. */
export function useVacanciesByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: projectId ? vacanciesByProjectKey(projectId) : ["ats", "vacancies", "project", "unknown"],
    queryFn: async (): Promise<Vacancy[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("vacancies")
        .select("*")
        .eq("hiring_project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

/** Одна вакансія за id, з даними проекту і клієнта (RLS: mp_can_access_vacancy). */
export function useVacancy(id: string | undefined) {
  return useQuery({
    queryKey: id ? vacancyKey(id) : ["ats", "vacancies", "unknown"],
    queryFn: async (): Promise<VacancyWithProject | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("vacancies")
        .select("*, hiring_project:hiring_projects(id, name, client_id, client:clients(id, name)), applications(count)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      if (!data) return null;
      const { applications, ...rest } = data as Vacancy & {
        hiring_project: VacancyWithProject["hiring_project"];
        applications: { count: number }[] | null;
      };
      return {
        ...rest,
        applications_count: applications?.[0]?.count ?? 0,
      } as VacancyWithProject;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Створення вакансії — owner/admin, або recruiter з can_edit на проект
 * (RLS: vacancies_insert). Після створення сіє стадії воронки з дефолтного
 * шаблону НАПРЯМУ під RLS (`seedVacancyStagesDirect` — без залежності від
 * деплою Edge). Якщо засів не вдався — не блокуємо створення: кнопка ручного
 * засіву є на сторінці вакансії.
 */
export function useCreateVacancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VacancyInsert): Promise<Vacancy> => {
      const { data, error } = await supabase.from("vacancies").insert(payload).select().single();
      if (error) throw error;

      try {
        await seedVacancyStagesDirect(data.id, null);
      } catch (e) {
        // Стадії можна засіяти пізніше кнопкою на сторінці вакансії.
        console.error("Не вдалося засіяти стадії воронки:", (e as Error)?.message);
      }

      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: VACANCIES_KEY });
      qc.invalidateQueries({ queryKey: vacanciesByProjectKey(data.hiring_project_id) });
      qc.invalidateQueries({ queryKey: ["ats", "pipeline_stages", "vacancy", data.id] });
      toast.success("Вакансію створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення вакансії (в т.ч. зміна статусу) — потребує can_edit (RLS: vacancies_update). */
export function useUpdateVacancy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: VacancyUpdate }): Promise<Vacancy> => {
      const { data, error } = await supabase.from("vacancies").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: VACANCIES_KEY });
      qc.invalidateQueries({ queryKey: vacancyKey(data.id) });
      qc.invalidateQueries({ queryKey: vacanciesByProjectKey(data.hiring_project_id) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Швидка зміна статусу вакансії. */
export function useUpdateVacancyStatus() {
  const updateVacancy = useUpdateVacancy();
  return {
    ...updateVacancy,
    mutate: (args: { id: string; status: VacancyStatus }) =>
      updateVacancy.mutate({ id: args.id, patch: { status: args.status } }),
  };
}
