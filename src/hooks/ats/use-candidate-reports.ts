// src/hooks/ats/use-candidate-reports.ts
//
// AI-звіти по кандидату / порівняльні (Epic E, US-E03) — читання candidate_reports
// (RLS: mp_can_access_vacancy) + генерація через Edge Function
// generate-candidate-report (контракт: supabase/functions/generate-candidate-report/index.ts).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CandidateReport = Database["public"]["Tables"]["candidate_reports"]["Row"];
export type CandidateReportKind = Database["public"]["Enums"]["vacancy_prompt_kind"];

export type CandidateReportWithApplication = CandidateReport & {
  application: { id: string; candidate: { id: string; full_name: string } | null } | null;
};

const reportsByVacancyKey = (vacancyId: string) => ["ats", "candidate_reports", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

// Помилки-контракт Edge Function generate-candidate-report (index.ts, розділ CONTRACT).
const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до цієї вакансії",
  vacancy_not_found: "Вакансію не знайдено",
  application_not_found: "Заявку не знайдено",
  invalid_body: "Некоректні дані запиту",
  invalid_kind: "Некоректний тип звіту",
  missing_competency_matrix: "У вакансії ще немає матриці компетенцій",
  missing_scores: "Немає жодної оцінки компетенцій для генерації звіту",
  invalid_application_for_vacancy: "Заявка не належить цій вакансії",
  ai_not_configured: "AI-функція ще не налаштована (відсутній ключ провайдера)",
  ai_provider_error: "Помилка AI-провайдера під час генерації звіту",
  server_error: "Внутрішня помилка сервера",
};

function edgeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? EDGE_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Не вдалося згенерувати звіт";
}

/** Звіти вакансії (по кандидатах + порівняльні) — RLS: mp_can_access_vacancy. */
export function useCandidateReports(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? reportsByVacancyKey(vacancyId) : ["ats", "candidate_reports", "vacancy", "unknown"],
    queryFn: async (): Promise<CandidateReportWithApplication[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("candidate_reports")
        .select("*, application:applications(id, candidate:ats_candidates(id, full_name))")
        .eq("vacancy_id", vacancyId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as CandidateReportWithApplication[];
    },
    enabled: !!vacancyId,
    staleTime: 10_000,
  });
}

/**
 * Генерація звіту через Edge `generate-candidate-report`. Якщо функція ще не
 * задеплоєна — toast "AI-функція ще не задеплоєна" замість падіння (мирор
 * isEdgeNotDeployedError з use-applications.ts useLogApplicationEvent).
 */
export function useGenerateCandidateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      kind: CandidateReportKind;
      applicationId?: string;
      transcript?: string;
      extraNotes?: string;
    }): Promise<{ report_id: string; content_md: string }> => {
      const { data, error } = await supabase.functions.invoke("generate-candidate-report", {
        body: {
          vacancy_id: payload.vacancyId,
          kind: payload.kind,
          application_id: payload.applicationId,
          transcript: payload.transcript,
          extra_notes: payload.extraNotes,
        },
      });
      if (error) {
        // supabase-js кладе тіло помилки функції (JSON з {error, detail}) в error.context,
        // якщо парсинг доступний — інакше лишаємось на error.message.
        const context = (error as { context?: { error?: string; detail?: string } })?.context;
        if (context?.error) {
          throw new Error(edgeErrorMessage(context.error, context.detail));
        }
        throw error;
      }
      const body = data as { error?: string; detail?: string; report_id?: string; content_md?: string };
      if (body?.error) {
        throw new Error(edgeErrorMessage(body.error, body.detail));
      }
      return { report_id: body.report_id!, content_md: body.content_md! };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: reportsByVacancyKey(variables.vacancyId) });
      toast.success("Звіт згенеровано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("AI-функція ще не задеплоєна");
        return;
      }
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}

/** Видалення застарілого звіту — RLS: mp_can_edit_vacancy. */
export function useDeleteCandidateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vacancyId: string }): Promise<void> => {
      const { error } = await supabase.from("candidate_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: reportsByVacancyKey(variables.vacancyId) });
      toast.success("Звіт видалено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
