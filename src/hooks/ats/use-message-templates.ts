import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SearchPhaseKind } from "@/hooks/ats/use-search-phases";

export type MessageTemplate = Database["public"]["Tables"]["message_templates"]["Row"];
export type MessageTemplateKind = Database["public"]["Enums"]["message_template_kind"];

export const messageTemplateKindLabel: Record<MessageTemplateKind, string> = {
  rejection: "Відмова",
  invitation: "Запрошення на наступний етап",
};

const templatesKey = (vacancyId: string, kind: MessageTemplateKind) =>
  ["ats", "message_templates", vacancyId, kind] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Змінні, доступні в шаблонах листів. */
export interface TemplateVars {
  name?: string | null;
  vacancy?: string | null;
  company?: string | null;
  stage?: string | null;
  recruiter?: string | null;
  date?: string | null;
}

/** Підстановка {{змінних}} у текст шаблону (порожні — прибираються). */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = (vars as Record<string, string | null | undefined>)[key];
    return value ?? "";
  });
}

/**
 * Шаблони одного виду, доступні для вакансії: глобальні (vacancy_id IS NULL)
 * + перевизначення саме цієї вакансії. Вакансійні йдуть першими — вони
 * пріоритетніші за глобальні з тим самим етапом.
 */
export function useMessageTemplates(vacancyId: string | undefined, kind: MessageTemplateKind) {
  return useQuery({
    queryKey: vacancyId ? templatesKey(vacancyId, kind) : ["ats", "message_templates", "unknown", kind],
    queryFn: async (): Promise<MessageTemplate[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .eq("kind", kind)
        .eq("is_active", true)
        .or(`vacancy_id.is.null,vacancy_id.eq.${vacancyId}`)
        .order("vacancy_id", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/**
 * Обрати шаблон за замовчуванням для етапу: спершу вакансійний під цей етап,
 * далі глобальний під цей етап, далі універсальний (phase_kind IS NULL).
 */
export function pickTemplateForPhase(
  templates: MessageTemplate[],
  phaseKind: SearchPhaseKind | null,
): MessageTemplate | null {
  if (templates.length === 0) return null;
  const byPhaseVacancy = templates.find((t) => t.vacancy_id && t.phase_kind === phaseKind);
  if (byPhaseVacancy) return byPhaseVacancy;
  const byPhaseGlobal = templates.find((t) => !t.vacancy_id && t.phase_kind === phaseKind);
  if (byPhaseGlobal) return byPhaseGlobal;
  const universalVacancy = templates.find((t) => t.vacancy_id && t.phase_kind === null);
  if (universalVacancy) return universalVacancy;
  return templates.find((t) => t.phase_kind === null) ?? templates[0];
}

/**
 * Зберегти відредагований текст як шаблон ВАКАНСІЇ (перевизначення).
 * Глобальні шаблони так не змінюються — їх редагує owner/admin окремо
 * (RLS: message_templates_insert/update).
 */
export function useSaveVacancyTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      kind: MessageTemplateKind;
      phaseKind: SearchPhaseKind | null;
      name: string;
      subject?: string | null;
      body: string;
    }): Promise<MessageTemplate> => {
      const { data, error } = await supabase
        .from("message_templates")
        .insert({
          vacancy_id: payload.vacancyId,
          kind: payload.kind,
          phase_kind: payload.phaseKind,
          channel: "email",
          name: payload.name,
          subject: payload.subject ?? null,
          body: payload.body,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: templatesKey(variables.vacancyId, variables.kind) });
      toast.success("Шаблон збережено для цієї вакансії");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
