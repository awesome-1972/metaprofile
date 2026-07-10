// src/hooks/ats/use-competencies.ts
//
// Матриця компетенцій вакансії (Додаток A ATS-вимог) — vacancy_competencies:
// групи (name + вага 0..1) і компетенції в групі (назва укр/англ, питання[], вага,
// порядок). CRUD під RLS mp_can_edit_vacancy (insert/update/delete) /
// mp_can_access_vacancy (select). Один рядок таблиці = одна компетенція
// (group_name/group_weight денормалізовані на кожному рядку групи — за міграцією).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type VacancyCompetency = Database["public"]["Tables"]["vacancy_competencies"]["Row"];
export type VacancyCompetencyInsert = Database["public"]["Tables"]["vacancy_competencies"]["Insert"];
export type VacancyCompetencyUpdate = Database["public"]["Tables"]["vacancy_competencies"]["Update"];

export interface CompetencyGroup {
  groupName: string;
  groupWeight: number;
  competencies: VacancyCompetency[];
}

/** Рубрика опису балів 1..3 для конкретної компетенції (Interview Kit). */
export type CompetencyRubric = { "1"?: string; "2"?: string; "3"?: string };

/** jsonb-масив рядків (probes/red_flags/questions) → string[], стійко до сміття у стовпці. */
export function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** jsonb-об'єкт рубрики → CompetencyRubric, стійко до сміття у стовпці. */
export function toRubric(value: unknown): CompetencyRubric {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const obj = value as Record<string, unknown>;
  const rubric: CompetencyRubric = {};
  for (const level of ["1", "2", "3"] as const) {
    const description = obj[level];
    if (typeof description === "string" && description.trim()) rubric[level] = description;
  }
  return rubric;
}

const competenciesByVacancyKey = (vacancyId: string) => ["ats", "vacancy_competencies", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Стандартна структура матриці компетенцій (Додаток A): 4 групи по 25%, без компетенцій. */
export const STANDARD_COMPETENCY_GROUPS: { groupName: string; groupWeight: number }[] = [
  { groupName: "Ціннісні", groupWeight: 0.25 },
  { groupName: "Професійні", groupWeight: 0.25 },
  { groupName: "Лідерські", groupWeight: 0.25 },
  { groupName: "Особисті", groupWeight: 0.25 },
];

/** Плоска матриця компетенцій вакансії, впорядкована для редактора (RLS: mp_can_access_vacancy). */
export function useVacancyCompetencies(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? competenciesByVacancyKey(vacancyId) : ["ats", "vacancy_competencies", "vacancy", "unknown"],
    queryFn: async (): Promise<VacancyCompetency[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("vacancy_competencies")
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
    staleTime: 15_000,
  });
}

/** Ті самі компетенції, згруповані по group_name — зручно для редактора матриці й для scoring-діалогу. */
export function groupCompetencies(competencies: VacancyCompetency[]): CompetencyGroup[] {
  const byGroup = new Map<string, CompetencyGroup>();
  for (const c of competencies) {
    const existing = byGroup.get(c.group_name);
    if (existing) {
      existing.competencies.push(c);
    } else {
      byGroup.set(c.group_name, { groupName: c.group_name, groupWeight: c.group_weight, competencies: [c] });
    }
  }
  return Array.from(byGroup.values());
}

/** Створення компетенції в матриці — RLS: mp_can_edit_vacancy. */
export function useCreateCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VacancyCompetencyInsert): Promise<VacancyCompetency> => {
      const { data, error } = await supabase.from("vacancy_competencies").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: competenciesByVacancyKey(data.vacancy_id) });
      toast.success("Компетенцію додано");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення компетенції (назва/питання/вага/порядок) — RLS: mp_can_edit_vacancy. */
export function useUpdateCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      vacancyId: string;
      patch: VacancyCompetencyUpdate;
    }): Promise<VacancyCompetency> => {
      const { data, error } = await supabase.from("vacancy_competencies").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: competenciesByVacancyKey(variables.vacancyId) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Видалення компетенції — RLS: mp_can_edit_vacancy. */
export function useDeleteCompetency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vacancyId: string }): Promise<void> => {
      const { error } = await supabase.from("vacancy_competencies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: competenciesByVacancyKey(variables.vacancyId) });
      toast.success("Компетенцію видалено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * "Створити стандартну структуру" (Додаток A): 4 групи по 25% без компетенцій.
 * Компетенції в групі не створюються — вага групи фіксується денормалізовано
 * на кожному рядку-компетенції (за схемою міграції), тому порожня група БЕЗ
 * жодного рядка компетенції фізично не існує в таблиці — вона матеріалізується
 * лише коли рекрутер додасть у неї першу компетенцію (UI: редактор матриці
 * показує 4 порожні картки груп локально, з group_weight за замовчуванням,
 * доки в кожній не з'явиться хоча б один рядок).
 */
export function useSeedStandardCompetencyGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId }: { vacancyId: string }) => {
      // Немає окремої таблиці "груп" — стандартна структура це локальний
      // дефолт для UI редактора (рендериться навіть якщо рядків компетенцій
      // ще немає). Тут лише інвалідовуємо кеш, щоб редактор перечитав дані
      // і показав порожні картки груп з правильними вагами за замовчуванням.
      return { vacancyId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: competenciesByVacancyKey(data.vacancyId) });
      toast.success("Стандартну структуру застосовано — додайте компетенції в кожну групу");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
