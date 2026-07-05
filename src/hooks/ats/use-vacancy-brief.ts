// src/hooks/ats/use-vacancy-brief.ts
//
// Бріф вакансії (Додаток C ATS-вимог) — vacancy_briefs (14 нефінансових секцій,
// jsonb answers) + vacancy_brief_financials (секція «Умови»/компенсація, окремий
// RLS-гейт mp_can_view_vacancy_financials). Патерн — дзеркалить use-pipeline.ts/
// use-vacancies.ts (query keys ["ats", ...], isPermissionDeniedError/toFriendlyMessage,
// toast + invalidateQueries).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type VacancyBrief = Database["public"]["Tables"]["vacancy_briefs"]["Row"];
export type VacancyBriefStatus = Database["public"]["Enums"]["vacancy_brief_status"];
export type VacancyBriefFinancials = Database["public"]["Tables"]["vacancy_brief_financials"]["Row"];

const briefByVacancyKey = (vacancyId: string) => ["ats", "vacancy_briefs", "vacancy", vacancyId] as const;
const briefFinancialsKey = (vacancyBriefId: string) =>
  ["ats", "vacancy_brief_financials", vacancyBriefId] as const;
const canViewFinancialsKey = (vacancyId: string) => ["ats", "vacancy_financials_gate", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Бріф вакансії (нефінансова частина) — RLS: mp_can_access_vacancy. */
export function useVacancyBrief(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? briefByVacancyKey(vacancyId) : ["ats", "vacancy_briefs", "vacancy", "unknown"],
    queryFn: async (): Promise<VacancyBrief | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase
        .from("vacancy_briefs")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data;
    },
    enabled: !!vacancyId,
    staleTime: 15_000,
  });
}

/**
 * Явна перевірка права перегляду фінансів вакансії (RPC mp_can_view_vacancy_financials,
 * security definer). Потрібна окремо від useVacancyBriefFinancials, бо RLS на SELECT
 * фільтрує рядки МОВЧКИ (порожній результат, не помилка) — без цього RPC неможливо
 * відрізнити "прав немає" від "рядок фінансів ще не створено".
 */
export function useCanViewVacancyFinancials(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? canViewFinancialsKey(vacancyId) : ["ats", "vacancy_financials_gate", "unknown"],
    queryFn: async (): Promise<boolean> => {
      if (!vacancyId) return false;
      const { data, error } = await supabase.rpc("mp_can_view_vacancy_financials", { p_vacancy_id: vacancyId });
      if (error) return false; // fail-closed: без підтвердження права — вважаємо, що прав немає.
      return !!data;
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/**
 * Фінансова частина брифу (секція «Умови» — компенсація/бонуси). Рендериться
 * лише коли useCanViewVacancyFinancials() === true (гейт перевіряється в BriefTab
 * ДО виклику цього хука) — тут лишається fail-soft на permission-помилку про всяк
 * випадок (гонка прав між перевіркою гейту і запитом).
 */
export function useVacancyBriefFinancials(vacancyBriefId: string | undefined) {
  return useQuery({
    queryKey: vacancyBriefId ? briefFinancialsKey(vacancyBriefId) : ["ats", "vacancy_brief_financials", "unknown"],
    queryFn: async (): Promise<VacancyBriefFinancials | null> => {
      if (!vacancyBriefId) return null;
      const { data, error } = await supabase
        .from("vacancy_brief_financials")
        .select("*")
        .eq("vacancy_brief_id", vacancyBriefId)
        .maybeSingle();
      if (error) {
        // Fail-soft: якщо RLS явно відхиляє (не мовчки фільтрує) — не валимо сторінку,
        // BriefTab показує "Фінансова інформація прихована".
        if (isPermissionDeniedError(error)) return null;
        throw error;
      }
      return data;
    },
    enabled: !!vacancyBriefId,
    staleTime: 15_000,
    retry: false,
  });
}

/**
 * Створення/оновлення (upsert) нефінансової частини брифу — RLS: mp_can_edit_vacancy.
 * vacancy_briefs.vacancy_id унікальний (one-to-one), тому insert-on-conflict = upsert.
 */
export function useSaveVacancyBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vacancyId,
      answers,
      status,
    }: {
      vacancyId: string;
      answers: Json;
      status?: VacancyBriefStatus;
    }): Promise<VacancyBrief> => {
      const { data, error } = await supabase
        .from("vacancy_briefs")
        .upsert(
          { vacancy_id: vacancyId, answers, ...(status ? { status } : {}) },
          { onConflict: "vacancy_id" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: briefByVacancyKey(data.vacancy_id) });
      toast.success("Бріф збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Перемикач статусу брифу draft/completed — окремо, без перезапису answers. */
export function useSetVacancyBriefStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      briefId,
      status,
    }: {
      briefId: string;
      vacancyId: string;
      status: VacancyBriefStatus;
    }): Promise<VacancyBrief> => {
      const { data, error } = await supabase
        .from("vacancy_briefs")
        .update({ status })
        .eq("id", briefId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: briefByVacancyKey(variables.vacancyId) });
      toast.success(status_label(data.status));
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

function status_label(status: VacancyBriefStatus): string {
  return status === "completed" ? "Бріф позначено завершеним" : "Бріф повернуто в чернетку";
}

/**
 * Upsert фінансової частини брифу — RLS вимагає І mp_can_view_vacancy_financials,
 * І mp_can_edit_vacancy (розділ 6.2 міграції). Якщо немає прав — permission denied,
 * показуємо toast (форма фінансів у BriefTab взагалі не рендериться без прав перегляду,
 * але захист на рівні мутації лишаємо на випадок гонки прав).
 */
export function useSaveVacancyBriefFinancials() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      vacancyBriefId,
      answers,
    }: {
      vacancyBriefId: string;
      answers: Json;
    }): Promise<VacancyBriefFinancials> => {
      const { data, error } = await supabase
        .from("vacancy_brief_financials")
        .upsert({ vacancy_brief_id: vacancyBriefId, answers }, { onConflict: "vacancy_brief_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: briefFinancialsKey(data.vacancy_brief_id) });
      toast.success("Фінансові умови збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
