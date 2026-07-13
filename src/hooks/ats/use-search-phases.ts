import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SearchPhase = Database["public"]["Tables"]["search_phases"]["Row"];
export type SearchPhaseKind = Database["public"]["Enums"]["search_phase_kind"];
export type SearchPhaseStatus = Database["public"]["Enums"]["search_phase_status"];

/** Людські назви видів етапів (fallback, якщо етап перейменували на вакансії). */
export const searchPhaseKindLabel: Record<SearchPhaseKind, string> = {
  preparation: "Підготовка",
  longlist: "Лонг-лист і скринінг",
  shortlist: "Шорт-лист",
  client_interviews: "Співбесіди з замовником",
  final: "Кейси і фінал",
  offer: "Офер",
};

export const searchPhaseStatusLabel: Record<SearchPhaseStatus, string> = {
  pending: "Не почато",
  active: "В роботі",
  done: "Завершено",
};

const phasesKey = (vacancyId: string) => ["ats", "search_phases", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Етапи пошуку вакансії, впорядковані (RLS: доступ до вакансії). */
export function useSearchPhases(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? phasesKey(vacancyId) : ["ats", "search_phases", "vacancy", "unknown"],
    queryFn: async (): Promise<SearchPhase[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("search_phases")
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
 * Засів воронки вакансії: 6 етапів + стадії кожного етапу з дефолтного шаблону.
 *
 * Викликає SQL-функцію `mp_seed_vacancy_pipeline` (security invoker — усі
 * вставки під RLS того, хто викликає; потрібне право mp_can_edit_vacancy).
 * Ідемпотентна: якщо етапи вже є — нічого не робить.
 */
export function useSeedVacancyPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, templateId }: { vacancyId: string; templateId?: string | null }) => {
      const { data, error } = await supabase.rpc("mp_seed_vacancy_pipeline", {
        p_vacancy_id: vacancyId,
        p_template_id: templateId ?? null,
      });
      if (error) throw error;
      return data as { ok: boolean; phases_created: number; stages_created: number };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: phasesKey(variables.vacancyId) });
      qc.invalidateQueries({ queryKey: ["ats", "pipeline_stages", "vacancy", variables.vacancyId] });
      qc.invalidateQueries({ queryKey: ["ats", "applications"] });
      toast.success("Етапи пошуку і воронки створено");
    },
    onError: (error: { message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/**
 * Статус етапу (pending → active → done).
 * started_at / completed_at сервер проставляє сам (тригер mp_search_phase_timestamps),
 * клієнт шле лише статус.
 */
export function useSetPhaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      phaseId,
      vacancyId: _vacancyId,
      status,
    }: {
      phaseId: string;
      vacancyId: string;
      status: SearchPhaseStatus;
    }) => {
      const { data, error } = await supabase
        .from("search_phases")
        .update({ status })
        .eq("id", phaseId)
        .select("*")
        .single();
      if (error) throw error;
      return data as SearchPhase;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: phasesKey(variables.vacancyId) });
    },
    onError: (error: { message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/** Плановані дати етапу (= план проекту) і нотатки. */
export function useUpdatePhasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      phaseId,
      vacancyId: _vacancyId,
      plannedStart,
      plannedEnd,
      notes,
    }: {
      phaseId: string;
      vacancyId: string;
      plannedStart?: string | null;
      plannedEnd?: string | null;
      notes?: string | null;
    }) => {
      const patch: Database["public"]["Tables"]["search_phases"]["Update"] = {};
      if (plannedStart !== undefined) patch.planned_start = plannedStart;
      if (plannedEnd !== undefined) patch.planned_end = plannedEnd;
      if (notes !== undefined) patch.notes = notes;

      const { data, error } = await supabase
        .from("search_phases")
        .update(patch)
        .eq("id", phaseId)
        .select("*")
        .single();
      if (error) throw error;
      return data as SearchPhase;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: phasesKey(variables.vacancyId) });
      toast.success("План етапу збережено");
    },
    onError: (error: { message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}
