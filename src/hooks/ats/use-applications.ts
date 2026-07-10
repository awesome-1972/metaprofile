import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { AtsCandidate } from "./use-candidates";

export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationEvent = Database["public"]["Tables"]["application_events"]["Row"];
export type ApplicationEventType = Database["public"]["Enums"]["application_event_type"];
export type ListState = Database["public"]["Enums"]["list_state"];

export type ApplicationWithCandidate = Application & {
  candidate: (AtsCandidate & { source: { id: string; name: string } | null }) | null;
};

export type ApplicationsByStage = Record<string, ApplicationWithCandidate[]>;

const applicationsByVacancyKey = (vacancyId: string) => ["ats", "applications", "vacancy", vacancyId] as const;
const applicationsByCandidateKey = (candidateId: string) =>
  ["ats", "applications", "candidate", candidateId] as const;
const eventsByApplicationKey = (applicationId: string) => ["ats", "application_events", applicationId] as const;
const eventsByCandidateKey = (candidateId: string) => ["ats", "application_events", "candidate", candidateId] as const;

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

/** Заявки на вакансію з даними кандидата, для kanban (RLS: доступ до вакансії). */
export function useApplications(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? applicationsByVacancyKey(vacancyId) : ["ats", "applications", "vacancy", "unknown"],
    queryFn: async (): Promise<ApplicationWithCandidate[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*, candidate:ats_candidates(*, source:candidate_sources(id, name))")
        .eq("vacancy_id", vacancyId)
        .order("applied_at", { ascending: true });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as ApplicationWithCandidate[];
    },
    enabled: !!vacancyId,
    staleTime: 15_000,
  });
}

/** Ті самі заявки, згруповані по current_stage_id — зручно для kanban-колонок. */
export function useApplicationsByStage(vacancyId: string | undefined) {
  const query = useApplications(vacancyId);
  const grouped: ApplicationsByStage = {};
  for (const app of query.data ?? []) {
    const key = app.current_stage_id ?? "no_stage";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(app);
  }
  return { ...query, groupedData: grouped };
}

/** Заявки конкретного кандидата (усі вакансії, у межах доступного scope). */
export function useApplicationsByCandidate(candidateId: string | undefined) {
  return useQuery({
    queryKey: candidateId ? applicationsByCandidateKey(candidateId) : ["ats", "applications", "candidate", "unknown"],
    queryFn: async () => {
      if (!candidateId) return [];
      const { data, error } = await supabase
        .from("applications")
        .select(
          "*, vacancy:vacancies(id, title, status, hiring_project:hiring_projects(id, name, client:clients(id, name))), current_stage:pipeline_stages(id, name, stage_type)",
        )
        .eq("candidate_id", candidateId)
        .order("applied_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!candidateId,
    staleTime: 15_000,
  });
}

/** Стрічка подій заявки (readonly, append-only) — RLS: доступ до заявки. */
export function useApplicationEvents(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationId ? eventsByApplicationKey(applicationId) : ["ats", "application_events", "unknown"],
    queryFn: async (): Promise<ApplicationEvent[]> => {
      if (!applicationId) return [];
      const { data, error } = await supabase
        .from("application_events")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!applicationId,
    staleTime: 15_000,
  });
}

/**
 * Стрічка подій по ВСІХ заявках кандидата (для профілю кандидата) — вимагає
 * спершу знати applications кандидата, тому робимо два кроки одним запитом.
 */
export function useCandidateApplicationEvents(candidateId: string | undefined) {
  return useQuery({
    queryKey: candidateId ? eventsByCandidateKey(candidateId) : ["ats", "application_events", "candidate", "unknown"],
    queryFn: async (): Promise<(ApplicationEvent & { application: { id: string; vacancy_id: string } | null })[]> => {
      if (!candidateId) return [];
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select("id")
        .eq("candidate_id", candidateId);
      if (appsError) {
        if (isPermissionDeniedError(appsError)) throw new Error("Немає доступу");
        throw appsError;
      }
      const appIds = (apps ?? []).map((a) => a.id);
      if (appIds.length === 0) return [];

      const { data, error } = await supabase
        .from("application_events")
        .select("*, application:applications(id, vacancy_id)")
        .in("application_id", appIds)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as (ApplicationEvent & { application: { id: string; vacancy_id: string } | null })[];
    },
    enabled: !!candidateId,
    staleTime: 15_000,
  });
}

/** Створення заявки кандидата на вакансію (RLS: applications_insert, can_edit). */
export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ApplicationInsert): Promise<Application> => {
      // Якщо стадію не задано явно — ставимо заявку на ПЕРШУ стадію воронки
      // вакансії, інакше вона матиме current_stage_id=null і не покажеться
      // в жодній kanban-колонці.
      let insert = payload;
      if (!payload.current_stage_id && payload.vacancy_id) {
        const { data: firstStage } = await supabase
          .from("pipeline_stages")
          .select("id")
          .eq("vacancy_id", payload.vacancy_id)
          .order("position", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (firstStage) insert = { ...payload, current_stage_id: firstStage.id };
      }
      const { data, error } = await supabase.from("applications").insert(insert).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: applicationsByVacancyKey(data.vacancy_id) });
      qc.invalidateQueries({ queryKey: applicationsByCandidateKey(data.candidate_id) });
      qc.invalidateQueries({ queryKey: ["ats", "vacancies"] });
      qc.invalidateQueries({ queryKey: ["ats", "candidates"] });
      toast.success("Заявку додано");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * Переміщення заявки на іншу стадію — просте UPDATE current_stage_id.
 * Подія `stage_changed` логується серверним тригером `mp_log_stage_change`
 * автоматично (append-only), тут нічого додатково писати не треба.
 */
export function useMoveApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      stageId,
      vacancyId,
    }: {
      applicationId: string;
      stageId: string;
      vacancyId: string;
    }): Promise<Application> => {
      const { data, error } = await supabase
        .from("applications")
        .update({ current_stage_id: stageId })
        .eq("id", applicationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: applicationsByVacancyKey(variables.vacancyId) });
      qc.invalidateQueries({ queryKey: eventsByApplicationKey(variables.applicationId) });
      qc.invalidateQueries({ queryKey: applicationsByCandidateKey(data.candidate_id) });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * Ручний override short-list-рішення в Comparison matrix (must-have gate /
 * автоматичний вердикт зваженого бала). RLS: applications_update →
 * mp_can_edit_vacancy(vacancy_id) (той самий гейт, що й переміщення заявки).
 * UI (ComparisonMatrixTab) вимагає непорожню причину перед викликом — тут
 * лише персистенція, без додаткової валідації (внутрішній інструмент).
 */
export function useSetShortlistOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      vacancyId,
      override,
      reason,
    }: {
      applicationId: string;
      vacancyId: string;
      override: boolean;
      reason: string | null;
    }): Promise<Application> => {
      const { data, error } = await supabase
        .from("applications")
        .update({ shortlist_override: override, shortlist_override_reason: reason })
        .eq("id", applicationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: applicationsByVacancyKey(variables.vacancyId) });
      toast.success(variables.override ? "Кандидата додано в short list (ручний override)" : "Override знято");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

const listStateToast: Record<ListState, string> = {
  none: "Кандидата прибрано зі списків",
  long_list: "Кандидата додано в long list",
  short_list: "Кандидата додано в short list",
};

/**
 * Перенесення заявки між станами списку (none/long_list/short_list) — Long/Short
 * list як стани (roadmap-ATS-platform.md розділ 2). Ортогонально до стадії
 * воронки: змінює лише applications.list_state. Серверні тригери
 * (mp_applications_list_state_stamp / mp_log_list_state_change) проставляють
 * listed_at/listed_by і пишуть подію 'list_state_changed' у append-only журнал —
 * тут нічого додатково логувати не треба. RLS: applications_update →
 * mp_can_edit_vacancy(vacancy_id) (той самий гейт, що й переміщення заявки).
 */
export function useSetListState() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      listState,
    }: {
      applicationId: string;
      vacancyId: string;
      listState: ListState;
    }): Promise<Application> => {
      const { data, error } = await supabase
        .from("applications")
        .update({ list_state: listState })
        .eq("id", applicationId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: applicationsByVacancyKey(variables.vacancyId) });
      qc.invalidateQueries({ queryKey: eventsByApplicationKey(variables.applicationId) });
      qc.invalidateQueries({ queryKey: applicationsByCandidateKey(data.candidate_id) });
      toast.success(listStateToast[variables.listState]);
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * Ручний запис події (нотатка тощо) через Edge `log-application-event`.
 * Автоматичні події (created/stage_changed) пише серверний тригер — цей хук
 * використовується лише для нотаток/ручних подій з бізнес-контекстом.
 * Якщо Edge Function ще не задеплоєна — показує toast і не падає.
 */
export function useLogApplicationEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      applicationId,
      eventType = "note_added",
      note,
      metadata,
    }: {
      applicationId: string;
      eventType?: ApplicationEventType;
      note?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.functions.invoke("log-application-event", {
        body: {
          application_id: applicationId,
          event_type: eventType,
          note,
          metadata: metadata ?? {},
        },
      });
      if (error) throw error;
      return data as { ok: boolean; event_id: string; created_at: string };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: eventsByApplicationKey(variables.applicationId) });
      toast.success("Нотатку додано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося зберегти подію");
    },
  });
}
