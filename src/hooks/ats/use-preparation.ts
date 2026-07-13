import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type SearchStrategy = Database["public"]["Tables"]["vacancy_search_strategies"]["Row"];
export type PublicBrief = Database["public"]["Tables"]["vacancy_public_briefs"]["Row"];
export type PublicBriefStatus = Database["public"]["Enums"]["vacancy_brief_status"];

/** Галузь із часткою у фокусі пошуку («продуктовий ритейл — 50%»). */
export interface IndustryShare {
  name: string;
  share: number;
}

/** Секція публічного бріфу (heading + markdown-body). */
export interface BriefSection {
  heading: string;
  body: string;
}

const strategyKey = (vacancyId: string) => ["ats", "search_strategy", vacancyId] as const;
const publicBriefKey = (vacancyId: string) => ["ats", "public_brief", vacancyId] as const;

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

/** jsonb → масив рядків (толерантно до сміття в колонці). */
export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

/** jsonb → масив галузей із частками. */
export function toIndustryShares(value: unknown): IndustryShare[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is { name: string; share?: unknown } => !!v && typeof (v as { name?: unknown }).name === "string")
    .map((v) => ({ name: v.name, share: Number((v as { share?: unknown }).share) || 0 }));
}

/** jsonb → секції публічного бріфу. */
export function toBriefSections(value: unknown): BriefSection[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (v): v is { heading: unknown; body: unknown } =>
        !!v && typeof v === "object" && "heading" in v && "body" in v,
    )
    .map((v) => ({ heading: String(v.heading ?? ""), body: String(v.body ?? "") }))
    .filter((s) => s.heading || s.body);
}

// ------------------------------------------------------------
// Стратегія пошуку
// ------------------------------------------------------------

export function useSearchStrategy(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? strategyKey(vacancyId) : ["ats", "search_strategy", "unknown"],
    queryFn: async (): Promise<SearchStrategy | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase
        .from("vacancy_search_strategies")
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
    staleTime: 30_000,
  });
}

/** Upsert стратегії (1:1 з вакансією — конфлікт по vacancy_id). */
export function useSaveSearchStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      focus?: string | null;
      industries?: IndustryShare[];
      targetCompanies?: string[];
      targetTitles?: string[];
      profileMusts?: string[];
      outOfScope?: string | null;
      notes?: string | null;
    }): Promise<SearchStrategy> => {
      const { data, error } = await supabase
        .from("vacancy_search_strategies")
        .upsert(
          {
            vacancy_id: payload.vacancyId,
            focus: payload.focus ?? null,
            industries: (payload.industries ?? []) as unknown as Json,
            target_companies: (payload.targetCompanies ?? []) as unknown as Json,
            target_titles: (payload.targetTitles ?? []) as unknown as Json,
            profile_musts: (payload.profileMusts ?? []) as unknown as Json,
            out_of_scope: payload.outOfScope ?? null,
            notes: payload.notes ?? null,
          },
          { onConflict: "vacancy_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: strategyKey(variables.vacancyId) });
      toast.success("Стратегію пошуку збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

// ------------------------------------------------------------
// Публічний бріф для кандидатів
// ------------------------------------------------------------

export function usePublicBrief(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? publicBriefKey(vacancyId) : ["ats", "public_brief", "unknown"],
    queryFn: async (): Promise<PublicBrief | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase
        .from("vacancy_public_briefs")
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
    staleTime: 30_000,
  });
}

export function useSavePublicBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      title?: string | null;
      intro?: string | null;
      sections: BriefSection[];
      status?: PublicBriefStatus;
      aiModel?: string | null;
    }): Promise<PublicBrief> => {
      const { data, error } = await supabase
        .from("vacancy_public_briefs")
        .upsert(
          {
            vacancy_id: payload.vacancyId,
            title: payload.title ?? null,
            intro: payload.intro ?? null,
            sections: payload.sections as unknown as Json,
            ...(payload.status ? { status: payload.status } : {}),
            ...(payload.aiModel ? { ai_model: payload.aiModel, generated_at: new Date().toISOString() } : {}),
          },
          { onConflict: "vacancy_id" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: publicBriefKey(variables.vacancyId) });
      toast.success("Бріф для кандидатів збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

interface PublicBriefDraftResponse {
  ok?: boolean;
  title?: string;
  intro?: string;
  sections?: BriefSection[];
  model?: string;
  error?: string;
  detail?: string;
}

const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає прав на цю вакансію",
  vacancy_not_found: "Вакансію не знайдено",
  brief_empty: "Спершу заповніть внутрішній бріф або опис вакансії — інакше немає з чого робити документ",
  ai_not_configured: "AI не налаштовано (немає ANTHROPIC_API_KEY)",
  model_error: "Модель не змогла згенерувати документ",
  server_error: "Внутрішня помилка сервера",
};

/**
 * AI-чернетка публічного бріфу (Edge `generate-public-brief`).
 * Нічого не зберігає — повертає чернетку, яку рекрутер редагує і зберігає сам.
 */
export function useGeneratePublicBrief() {
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      discloseClient?: boolean;
      extraNotes?: string;
    }): Promise<{ title: string; intro: string; sections: BriefSection[]; model: string }> => {
      const { data, error } = await supabase.functions.invoke("generate-public-brief", {
        body: {
          vacancy_id: payload.vacancyId,
          disclose_client: payload.discloseClient ?? false,
          extra_notes: payload.extraNotes,
        },
      });
      if (error) throw error;
      const response = data as PublicBriefDraftResponse;
      if (response?.error) {
        const label = EDGE_ERROR_LABELS[response.error] ?? "Не вдалося згенерувати документ";
        throw new Error(response.detail ? `${label}: ${response.detail}` : label);
      }
      return {
        title: response.title ?? "",
        intro: response.intro ?? "",
        sections: response.sections ?? [],
        model: response.model ?? "",
      };
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція generate-public-brief ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося згенерувати документ");
    },
  });
}
