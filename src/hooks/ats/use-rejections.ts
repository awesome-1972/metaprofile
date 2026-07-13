import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type RejectionReason = Database["public"]["Tables"]["rejection_reasons"]["Row"];
export type RejectionCategory = Database["public"]["Enums"]["rejection_category"];

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Довідник причин відмови (глобальний, readonly для не-admin). */
export function useRejectionReasons() {
  return useQuery({
    queryKey: ["ats", "rejection_reasons"],
    queryFn: async (): Promise<RejectionReason[]> => {
      const { data, error } = await supabase
        .from("rejection_reasons")
        .select("*")
        .eq("is_active", true)
        .order("label");
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Відмова кандидату: запис у `rejections` + заявка → status `rejected`.
 *
 * Причина обовʼязкова (рішення власника): або зі списку `rejection_reasons`
 * (reasonId), або кастомна — тоді reasonId порожній, reasonCode = 'other',
 * а текст іде в `comment`. Лист (за наявності) відправляється окремо —
 * `useSendCommunicationNow`, бо відмова «без листа» дозволена.
 */
export function useRejectApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      applicationId: string;
      vacancyId: string;
      candidateId: string;
      reasonId: string | null;
      reasonCode: RejectionCategory;
      comment: string | null;
      isCandidateInitiated: boolean;
    }) => {
      const { error: rejError } = await supabase.from("rejections").insert({
        application_id: payload.applicationId,
        reason_id: payload.reasonId,
        reason_code: payload.reasonCode,
        comment: payload.comment,
        is_candidate_initiated: payload.isCandidateInitiated,
      });
      if (rejError) throw rejError;

      const { error: appError } = await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("id", payload.applicationId);
      if (appError) throw appError;

      return { ok: true };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ats", "applications", "vacancy", variables.vacancyId] });
      qc.invalidateQueries({ queryKey: ["ats", "applications", "candidate", variables.candidateId] });
      qc.invalidateQueries({ queryKey: ["ats", "application_events", variables.applicationId] });
      toast.success("Кандидату відмовлено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
