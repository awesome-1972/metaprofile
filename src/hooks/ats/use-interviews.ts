// src/hooks/ats/use-interviews.ts
//
// Google Meet-інтеграція інтервʼю (Calendar-подія + готовий транскрипт) —
// читання interviews (RLS: interviews_select, mp_can_access_application) +
// призначення зустрічі через Edge Function `schedule-interview` + підтягування
// готового транскрипта через Edge Function `fetch-meet-transcript`.
//
// ОБМЕЖЕННЯ: fetch-meet-transcript НЕ робить аудіо-транскрибацію (немає
// speech-to-text) — лише читає вже готовий Google Doc-транскрипт, який Meet
// створює функцією Transcripts (Host controls → Meeting records, залежить
// від тарифу Workspace). Якщо документа-транскрипта не існує — підтягнути
// нема чого.
//
// TODO: типи після gen types — колонки duration_minutes, calendar_event_id,
// meet_link, organizer_email, transcript, transcript_doc_id,
// transcript_fetched_at додані міграцією 20260707090000_ats_google_calendar.sql,
// ще не потрапили в src/integrations/supabase/types.ts. Тому нижче — локальний
// інтерфейс, що дзеркалить точні назви колонок з міграції, і `as`-каст на
// кожному виклику supabase.from('interviews' as any) (мірор use-communications.ts).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface InterviewRow {
  id: string;
  application_id: string;
  interviewer_id: string | null;
  interview_type: string;
  scheduled_at: string | null;
  duration_minutes: number;
  completed_at: string | null;
  outcome: string;
  rating: number | null;
  notes: string | null;
  calendar_event_id: string | null;
  meet_link: string | null;
  organizer_email: string | null;
  transcript: string | null;
  transcript_doc_id: string | null;
  transcript_fetched_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const interviewsByApplicationKey = (applicationId: string) =>
  ["ats", "interviews", "application", applicationId] as const;
const upcomingInterviewsKey = (applicationIds: string[]) =>
  ["ats", "interviews", "upcoming", ...[...applicationIds].sort()] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

// Помилки-контракт Edge Functions schedule-interview / fetch-meet-transcript.
const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до цієї заявки",
  application_not_found: "Заявку не знайдено",
  interview_not_found: "Інтервʼю не знайдено",
  invalid_body: "Некоректні дані запиту",
  invalid_application_id: "Некоректна заявка",
  invalid_interview_id: "Некоректне інтервʼю",
  invalid_scheduled_at: "Некоректні дата/час",
  invalid_duration_minutes: "Некоректна тривалість",
  invalid_candidate_email: "Некоректний email кандидата",
  invalid_doc_url: "Некоректне посилання на Google Doc транскрипта",
  empty_transcript: "Документ не містить тексту",
  google_error: "Помилка Google API",
  server_error: "Внутрішня помилка сервера",
};

function edgeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? EDGE_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Не вдалося виконати дію";
}

/** Інтервʼю конкретної заявки (RLS: interviews_select). */
export function useInterviewsByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationId ? interviewsByApplicationKey(applicationId) : ["ats", "interviews", "unknown"],
    queryFn: async (): Promise<InterviewRow[]> => {
      if (!applicationId) return [];
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .eq("application_id", applicationId)
        .order("scheduled_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as InterviewRow[];
    },
    enabled: !!applicationId,
    staleTime: 15_000,
  });
}

/**
 * Найближчі МАЙБУТНІ зустрічі по списку заявок — для бейджа на kanban-картці
 * ("Зустріч 12.07 14:00"). Один запит `in (application_id)`, згрупований на
 * клієнті (найближча майбутня scheduled_at на заявку).
 */
export function useUpcomingInterviewsByApplications(applicationIds: string[]) {
  const ids = [...applicationIds].filter(Boolean).sort();
  return useQuery({
    queryKey: upcomingInterviewsKey(ids),
    queryFn: async (): Promise<Record<string, InterviewRow>> => {
      if (ids.length === 0) return {};
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from("interviews")
        .select("*")
        .in("application_id", ids)
        .gte("scheduled_at", nowIso)
        .order("scheduled_at", { ascending: true });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      const byApplication: Record<string, InterviewRow> = {};
      for (const row of (data ?? []) as InterviewRow[]) {
        // Перший (найближчий, бо order asc) запис на application_id — лишаємо.
        if (!byApplication[row.application_id]) byApplication[row.application_id] = row;
      }
      return byApplication;
    },
    enabled: ids.length > 0,
    staleTime: 15_000,
  });
}

interface ScheduleInterviewResponse {
  ok?: boolean;
  interview_id?: string;
  meet_link?: string | null;
  event_link?: string | null;
  error?: string;
  detail?: string;
}

/** Призначення зустрічі з Google Meet-лінком — Edge `schedule-interview`. */
export function useScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      application_id: string;
      scheduled_at: string;
      duration_minutes?: number;
      candidate_email?: string;
      note?: string;
    }): Promise<{ interview_id: string; meet_link: string | null; event_link: string | null }> => {
      const { data, error } = await supabase.functions.invoke("schedule-interview", {
        body: payload,
      });
      if (error) {
        const context = (error as { context?: { error?: string; detail?: string } })?.context;
        if (context?.error) throw new Error(edgeErrorMessage(context.error, context.detail));
        throw error;
      }
      const body = data as ScheduleInterviewResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      if (!body?.interview_id) throw new Error("Сервер не повернув interview_id");
      return { interview_id: body.interview_id, meet_link: body.meet_link ?? null, event_link: body.event_link ?? null };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: interviewsByApplicationKey(variables.application_id) });
      qc.invalidateQueries({ queryKey: ["ats", "interviews", "upcoming"] });
      toast.success("Зустріч заплановано, Meet-лінк створено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося запланувати зустріч");
    },
  });
}

interface FetchTranscriptResponse {
  ok?: boolean;
  chars?: number;
  truncated?: boolean;
  preview?: string;
  error?: string;
  detail?: string;
}

/** Підтягування готового транскрипта з Google Doc — Edge `fetch-meet-transcript`. */
export function useFetchMeetTranscript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      interview_id: string;
      doc_url_or_id: string;
      application_id?: string; // лише для інвалідації кешу, не надсилається на бекенд
    }): Promise<{ chars: number; truncated: boolean; preview: string }> => {
      const { data, error } = await supabase.functions.invoke("fetch-meet-transcript", {
        body: { interview_id: payload.interview_id, doc_url_or_id: payload.doc_url_or_id },
      });
      if (error) {
        const context = (error as { context?: { error?: string; detail?: string } })?.context;
        if (context?.error) throw new Error(edgeErrorMessage(context.error, context.detail));
        throw error;
      }
      const body = data as FetchTranscriptResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      return { chars: body?.chars ?? 0, truncated: Boolean(body?.truncated), preview: body?.preview ?? "" };
    },
    onSuccess: (_data, variables) => {
      if (variables.application_id) {
        qc.invalidateQueries({ queryKey: interviewsByApplicationKey(variables.application_id) });
      }
      toast.success("Транскрипт підтягнуто");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося підтягнути транскрипт");
    },
  });
}
