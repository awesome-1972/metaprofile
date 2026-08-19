// src/hooks/ats/use-competency-templates.ts
//
// Свої (збережені в БД) шаблони матриці компетенцій. Рекрутер зберігає поточну
// матрицю вакансії як іменований шаблон і застосовує його до інших вакансій.
// Таблиця competency_templates (tenant-ізольована, міграція 20260819140000).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { toStringList, toRubric } from "@/hooks/ats/use-competencies";
import type { VacancyCompetencyInsert } from "@/hooks/ats/use-competencies";

/** Повна компетенція в шаблоні (усі поля Interview Kit). */
export interface TemplateCompetency {
  name: string;
  name_en: string | null;
  weight: number;
  questions: string[];
  probes: string[];
  red_flags: string[];
  rubric: Record<string, string>;
  is_must_have: boolean;
}
export interface TemplateGroup {
  group_name: string;
  group_weight: number;
  competencies: TemplateCompetency[];
}
export interface CompetencyTemplateRow {
  id: string;
  name: string;
  description: string | null;
  groups: TemplateGroup[];
  source_vacancy_id: string | null;
  created_at: string;
}

const TEMPLATES_KEY = ["ats", "competency_templates"] as const;

/** Список збережених шаблонів (tenant-scoped). */
export function useCustomCompetencyTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async (): Promise<CompetencyTemplateRow[]> => {
      const { data, error } = await supabase
        .from("competency_templates")
        .select("id, name, description, groups, source_vacancy_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: (r as { id: string }).id,
        name: (r as { name: string }).name,
        description: (r as { description: string | null }).description,
        groups: Array.isArray((r as { groups: unknown }).groups) ? ((r as { groups: TemplateGroup[] }).groups) : [],
        source_vacancy_id: (r as { source_vacancy_id: string | null }).source_vacancy_id,
        created_at: (r as { created_at: string }).created_at,
      }));
    },
    staleTime: 30_000,
  });
}

/** Зберегти поточну матрицю вакансії як іменований шаблон. */
export function useSaveCompetencyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, name, description }: { vacancyId: string; name: string; description?: string }): Promise<void> => {
      // Читаємо поточні компетенції вакансії й будуємо groups jsonb.
      const { data: rows, error: readErr } = await supabase
        .from("vacancy_competencies")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .order("position", { ascending: true });
      if (readErr) throw readErr;
      if (!rows || rows.length === 0) throw new Error("Матриця порожня — нема чого зберігати");

      const byGroup = new Map<string, TemplateGroup>();
      for (const c of rows as Record<string, unknown>[]) {
        const gName = String(c.group_name);
        const g = byGroup.get(gName) ?? { group_name: gName, group_weight: Number(c.group_weight), competencies: [] };
        g.competencies.push({
          name: String(c.name),
          name_en: (c.name_en as string | null) ?? null,
          weight: Number(c.weight),
          questions: Array.isArray(c.questions) ? (c.questions as unknown[]).map(String) : [],
          probes: toStringList(c.probes),
          red_flags: toStringList(c.red_flags),
          rubric: toRubric(c.rubric) as Record<string, string>,
          is_must_have: c.is_must_have === true,
        });
        byGroup.set(gName, g);
      }
      const groups = Array.from(byGroup.values());
      const { error } = await supabase.from("competency_templates").insert({
        name: name.trim(),
        description: description?.trim() || null,
        groups: groups as unknown as VacancyCompetencyInsert["questions"],
        source_vacancy_id: vacancyId,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success("Шаблон збережено");
    },
    onError: (error: { message?: string }) => toast.error(error?.message || "Не вдалося зберегти шаблон"),
  });
}

/** Видалити свій шаблон. */
export function useDeleteCompetencyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from("competency_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
      toast.success("Шаблон видалено");
    },
    onError: (error: { message?: string }) => toast.error(error?.message || "Не вдалося видалити"),
  });
}

/** Засіяти вакансію повними рядками з набору груп (свій шаблон або AI-генерація). */
export function useSeedCompetencyGroups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, groups }: { vacancyId: string; groups: TemplateGroup[] }): Promise<number> => {
      let position = 0;
      const rows: VacancyCompetencyInsert[] = groups.flatMap((g) =>
        g.competencies.map((c) => ({
          vacancy_id: vacancyId,
          group_name: g.group_name,
          group_weight: g.group_weight,
          name: c.name,
          name_en: c.name_en || null,
          weight: c.weight,
          questions: c.questions as unknown as VacancyCompetencyInsert["questions"],
          probes: c.probes as unknown as VacancyCompetencyInsert["questions"],
          red_flags: c.red_flags as unknown as VacancyCompetencyInsert["questions"],
          rubric: c.rubric as unknown as VacancyCompetencyInsert["questions"],
          is_must_have: c.is_must_have,
          position: position++,
        })),
      );
      if (rows.length === 0) throw new Error("Порожній набір компетенцій");
      const { error } = await supabase.from("vacancy_competencies").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count, variables) => {
      qc.invalidateQueries({ queryKey: ["ats", "vacancy_competencies", "vacancy", variables.vacancyId] });
      toast.success(`Додано компетенцій: ${count}`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || "Не вдалося застосувати"),
  });
}
