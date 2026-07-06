// src/hooks/ats/use-communications.ts
//
// Комунікації з кандидатами (Epic F) — читання candidate_communications
// (RLS: candidate_communications_select, mp_can_access_candidate/vacancy) +
// відправка/чернетки/масова розсилка через Edge Function `send-communication`.
//
// TODO: типи після gen types — таблиця candidate_communications і enum-и
// comm_channel/comm_status/comm_direction додані міграцією
// 20260706090000_ats_m4b_grants_comms_resume.sql, ще не потрапили в
// src/integrations/supabase/types.ts (types.ts не регенеровано). Тому нижче —
// локальні інтерфейси, що дзеркалять точні назви колонок з міграції, і `as`-
// каст на кожному виклику supabase.from('candidate_communications' as any).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type CommChannel = "email" | "telegram" | "viber" | "whatsapp" | "linkedin" | "facebook" | "phone" | "other";
export type CommStatus = "draft" | "queued" | "sent" | "failed" | "cancelled";
export type CommDirection = "out" | "in";

export interface CandidateCommunication {
  id: string;
  candidate_id: string;
  application_id: string | null;
  vacancy_id: string | null;
  channel: CommChannel;
  direction: CommDirection;
  subject: string | null;
  body: string;
  status: CommStatus;
  batch_id: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  error: string | null;
  external_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const communicationsByCandidateKey = (candidateId: string) =>
  ["ats", "candidate_communications", "candidate", candidateId] as const;

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

/** Комунікації конкретного кандидата (RLS: candidate_communications_select). */
export function useCommunicationsByCandidate(candidateId: string | undefined) {
  return useQuery({
    queryKey: candidateId ? communicationsByCandidateKey(candidateId) : ["ats", "candidate_communications", "unknown"],
    queryFn: async (): Promise<CandidateCommunication[]> => {
      if (!candidateId) return [];
      // TODO: типи після gen types
      const { data, error } = await (supabase.from("candidate_communications" as never) as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as CandidateCommunication[];
    },
    enabled: !!candidateId,
    staleTime: 15_000,
  });
}

/** Пряме збереження чернетки (без Edge Function) — status='draft'. */
export function useSaveDraftCommunication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      vacancy_id?: string | null;
      channel?: CommChannel;
      subject?: string;
      body: string;
    }): Promise<void> => {
      // TODO: типи після gen types
      const { error } = await (supabase.from("candidate_communications" as never) as any).insert({
        candidate_id: payload.candidate_id,
        vacancy_id: payload.vacancy_id ?? null,
        channel: payload.channel ?? "email",
        subject: payload.subject ?? null,
        body: payload.body,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: communicationsByCandidateKey(variables.candidate_id) });
      toast.success("Чернетку збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

interface SendCommunicationResponse {
  ok?: boolean;
  batch_id?: string;
  communication_id?: string;
  error?: string;
  detail?: string;
}

const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до цього кандидата/вакансії",
  invalid_body: "Некоректні дані запиту",
  candidate_not_found: "Кандидата не знайдено",
  batch_not_found: "Партію розсилки не знайдено",
  server_error: "Внутрішня помилка сервера",
};

function edgeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? EDGE_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Не вдалося виконати дію";
}

function invalidateForCandidate(qc: ReturnType<typeof useQueryClient>, candidateId?: string) {
  if (candidateId) qc.invalidateQueries({ queryKey: communicationsByCandidateKey(candidateId) });
}

/** Негайна відправка одного листа — `send-communication` action: 'send_now'. */
export function useSendCommunicationNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      channel?: CommChannel;
      subject?: string;
      body: string;
    }): Promise<SendCommunicationResponse> => {
      const { data, error } = await supabase.functions.invoke("send-communication", {
        body: { action: "send_now", ...payload },
      });
      if (error) throw error;
      const body = data as SendCommunicationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      return body;
    },
    onSuccess: (_data, variables) => {
      invalidateForCandidate(qc, variables.candidate_id);
      toast.success("Лист відправлено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося відправити лист");
    },
  });
}

/** Постановка масової розсилки в чергу — `send-communication` action: 'queue_batch'. */
export function useQueueBatchCommunication() {
  return useMutation({
    mutationFn: async (payload: {
      candidate_ids: string[];
      vacancy_id?: string;
      channel?: CommChannel;
      subject?: string;
      body: string;
    }): Promise<{ batch_id: string }> => {
      const { data, error } = await supabase.functions.invoke("send-communication", {
        body: { action: "queue_batch", ...payload },
      });
      if (error) throw error;
      const body = data as SendCommunicationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      if (!body?.batch_id) throw new Error("Сервер не повернув batch_id");
      return { batch_id: body.batch_id };
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося поставити розсилку в чергу");
    },
  });
}

/** Фактична відправка партії — `send-communication` action: 'send_batch'. */
export function useSendBatchCommunication() {
  return useMutation({
    mutationFn: async (batch_id: string): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("send-communication", {
        body: { action: "send_batch", batch_id },
      });
      if (error) throw error;
      const body = data as SendCommunicationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      toast.success("Розсилку відправлено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося відправити розсилку");
    },
  });
}

/** Скасування партії до відправки — `send-communication` action: 'cancel_batch'. */
export function useCancelBatchCommunication() {
  return useMutation({
    mutationFn: async (batch_id: string): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("send-communication", {
        body: { action: "cancel_batch", batch_id },
      });
      if (error) throw error;
      const body = data as SendCommunicationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      toast.success("Розсилку скасовано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося скасувати розсилку");
    },
  });
}
