import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MessageTemplateKind } from "@/hooks/ats/use-message-templates";

interface DraftResponse {
  ok?: boolean;
  subject?: string;
  body?: string;
  error?: string;
  detail?: string;
}

const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає прав на цю вакансію",
  invalid_body: "Некоректні дані запиту",
  invalid_kind: "Невідомий тип листа",
  application_not_found: "Заявку не знайдено",
  ai_not_configured: "AI не налаштовано (немає ANTHROPIC_API_KEY)",
  model_error: "Модель не змогла згенерувати текст",
  server_error: "Внутрішня помилка сервера",
};

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

/**
 * AI-чернетка листа кандидату (Edge `draft-communication`).
 *
 * Нічого не відправляє — лише повертає текст, який рекрутер бачить, редагує
 * і відправляє свідомо. Рішення (відмова/запрошення) завжди за людиною.
 */
export function useDraftCommunication() {
  return useMutation({
    mutationFn: async (payload: {
      applicationId: string;
      kind: MessageTemplateKind;
      reason?: string;
      templateBody?: string;
      extraNotes?: string;
    }): Promise<{ subject: string; body: string }> => {
      const { data, error } = await supabase.functions.invoke("draft-communication", {
        body: {
          application_id: payload.applicationId,
          kind: payload.kind,
          reason: payload.reason,
          template_body: payload.templateBody,
          extra_notes: payload.extraNotes,
        },
      });
      if (error) throw error;
      const response = data as DraftResponse;
      if (response?.error) {
        const label = EDGE_ERROR_LABELS[response.error] ?? "Не вдалося згенерувати текст";
        throw new Error(response.detail ? `${label}: ${response.detail}` : label);
      }
      return { subject: response.subject ?? "", body: response.body ?? "" };
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція draft-communication ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося згенерувати текст");
    },
  });
}
