import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];
export type StageType = Database["public"]["Enums"]["stage_type"];

const stagesByVacancyKey = (vacancyId: string) => ["ats", "pipeline_stages", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  // Guard mp_pipeline_stage_delete_guard кидає foreign_key_violation, коли на
  // стадії ще стоять заявки — перекладаємо на людську мову.
  if (error?.code === "23503" || /still reference/i.test(error?.message ?? "")) {
    return "На стадії ще є кандидати — спершу перенесіть їх";
  }
  return error?.message || "Сталася помилка";
}

/** Стадії воронки вакансії, впорядковані для kanban-колонок (RLS: доступ до вакансії). */
export function usePipelineStages(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? stagesByVacancyKey(vacancyId) : ["ats", "pipeline_stages", "vacancy", "unknown"],
    queryFn: async (): Promise<PipelineStage[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
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
    staleTime: 30_000,
  });
}

/**
 * Засів стадій більше НЕ живе тут.
 *
 * Із переходом на етапи пошуку (міграція 20260713090000) стадія завжди належить
 * етапу, тому воронка сіється однією SQL-функцією `mp_seed_vacancy_pipeline`
 * (етапи + їхні стадії за один прохід): див. `useSeedVacancyPipeline`
 * у `@/hooks/ats/use-search-phases`. Старий плаский засів прибрано навмисно —
 * він створював стадії без phase_id, які не показуються у воронці етапу.
 */

// ------------------------------------------------------------
// Гнучке налаштування воронки: CRUD стадій
// ------------------------------------------------------------

/**
 * Додати стадію (крок) у кінець конкретного етапу. Позиція — глобальна по
 * вакансії (unique vacancy_id, position), тому беремо max+1 серед усіх стадій.
 * RLS: mp_can_edit_vacancy.
 */
export function useAddStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vacancyId,
      phaseId,
      name,
      stageType = "screening",
    }: {
      vacancyId: string;
      phaseId: string;
      name: string;
      stageType?: StageType;
    }): Promise<PipelineStage> => {
      const { data: last, error: posErr } = await supabase
        .from("pipeline_stages")
        .select("position")
        .eq("vacancy_id", vacancyId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (posErr) throw posErr;
      const nextPosition = (last?.position ?? 0) + 1;

      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({
          vacancy_id: vacancyId,
          phase_id: phaseId,
          name,
          stage_type: stageType,
          position: nextPosition,
          is_terminal: false,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stagesByVacancyKey(variables.vacancyId) });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/** Перейменувати стадію / змінити тип / перенести в етап / задати SLA-пороги. */
export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stageId,
      vacancyId: _vacancyId,
      name,
      stageType,
      phaseId,
      slaYellowDays,
      slaRedDays,
    }: {
      stageId: string;
      vacancyId: string;
      name?: string;
      stageType?: StageType;
      phaseId?: string | null;
      slaYellowDays?: number | null;
      slaRedDays?: number | null;
    }): Promise<PipelineStage> => {
      const patch: Database["public"]["Tables"]["pipeline_stages"]["Update"] = {};
      if (name !== undefined) patch.name = name;
      if (stageType !== undefined) patch.stage_type = stageType;
      if (phaseId !== undefined) patch.phase_id = phaseId;
      if (slaYellowDays !== undefined) patch.sla_yellow_days = slaYellowDays;
      if (slaRedDays !== undefined) patch.sla_red_days = slaRedDays;

      const { data, error } = await supabase
        .from("pipeline_stages")
        .update(patch)
        .eq("id", stageId)
        .select("*")
        .single();
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stagesByVacancyKey(variables.vacancyId) });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/**
 * Видалити стадію. Guard `mp_pipeline_stage_delete_guard` заблокує, якщо на ній
 * ще стоять заявки (23503) — тоді показуємо зрозумілий toast.
 */
export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stageId,
      vacancyId: _vacancyId,
    }: {
      stageId: string;
      vacancyId: string;
    }) => {
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stagesByVacancyKey(variables.vacancyId) });
      toast.success("Стадію видалено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/**
 * Перевпорядкувати стадії (масив id у новому порядку → position 1..N).
 * Двофазна зміна позицій, щоб не впертись у unique(vacancy_id, position).
 */
export function useReorderStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vacancyId,
      orderedIds,
    }: {
      vacancyId: string;
      orderedIds: string[];
    }) => {
      for (let i = 0; i < orderedIds.length; i += 1) {
        const { error } = await supabase
          .from("pipeline_stages")
          .update({ position: 1000 + i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
      for (let i = 0; i < orderedIds.length; i += 1) {
        const { error } = await supabase
          .from("pipeline_stages")
          .update({ position: i + 1 })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stagesByVacancyKey(variables.vacancyId) });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}
