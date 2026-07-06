import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AtsCandidate = Database["public"]["Tables"]["ats_candidates"]["Row"];
export type AtsCandidateInsert = Database["public"]["Tables"]["ats_candidates"]["Insert"];
export type AtsCandidateUpdate = Database["public"]["Tables"]["ats_candidates"]["Update"];

// TODO: типи після gen types — messengers/resume_* колонки додані міграцією
// 20260706090000_ats_m4b_grants_comms_resume.sql на ats_candidates, ще не
// потрапили в types.ts (не регенеровано). Розширюємо Row/Insert/Update
// локально, щоб не втратити типізацію решти (уже наявних) полів кандидата.
export interface CandidateMessengers {
  telegram?: string;
  viber?: string;
  whatsapp?: string;
  linkedin?: string;
  facebook?: string;
}

export interface CandidateResumeFields {
  messengers: CandidateMessengers;
  resume_file_name: string | null;
  resume_text: string | null;
  resume_parsed: Record<string, unknown> | null;
  resume_uploaded_at: string | null;
}

export type AtsCandidateWithResume = AtsCandidate & CandidateResumeFields;

/** Заявка кандидата з розгорнутою вакансією/проектом/клієнтом (для бейджів у списку). */
export interface CandidateApplicationRef {
  id: string;
  vacancy: {
    id: string;
    title: string;
    hiring_project: { id: string; name: string; client: { id: string; name: string } | null } | null;
  } | null;
}

export type AtsCandidateWithSource = AtsCandidateWithResume & {
  source: { id: string; name: string } | null;
  applications_count: number;
  applications_refs: CandidateApplicationRef[];
};

// select-фрагмент заявок із ланцюгом вакансія → проект → клієнт (для списку/пошуку).
const APPLICATIONS_REFS_SELECT =
  "applications(id, vacancy:vacancies(id, title, hiring_project:hiring_projects(id, name, client:clients(id, name))))";

function mapCandidateRow(row: unknown): AtsCandidateWithSource {
  const { applications, ...rest } = row as AtsCandidate & {
    source: { id: string; name: string } | null;
    applications: CandidateApplicationRef[] | null;
  };
  const refs = applications ?? [];
  return {
    ...rest,
    applications_count: refs.length,
    applications_refs: refs,
  } as AtsCandidateWithSource;
}

const CANDIDATES_KEY = ["ats", "candidates"] as const;
const candidateKey = (id: string) => ["ats", "candidates", id] as const;
const candidatesSearchKey = (search: string) => ["ats", "candidates", "search", search] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Список кандидатів, доступних поточному користувачу (RLS: scope через applications). */
export function useCandidates() {
  return useQuery({
    queryKey: CANDIDATES_KEY,
    queryFn: async (): Promise<AtsCandidateWithSource[]> => {
      const { data, error } = await supabase
        .from("ats_candidates")
        .select(`*, source:candidate_sources(id, name), ${APPLICATIONS_REFS_SELECT}`)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map(mapCandidateRow);
    },
    staleTime: 30_000,
  });
}

/** Пошук кандидатів за іменем або email (клієнтський ilike-запит під RLS). */
export function useSearchCandidates(search: string) {
  const trimmed = search.trim();
  return useQuery({
    queryKey: candidatesSearchKey(trimmed),
    queryFn: async (): Promise<AtsCandidateWithSource[]> => {
      const { data, error } = await supabase
        .from("ats_candidates")
        .select(`*, source:candidate_sources(id, name), ${APPLICATIONS_REFS_SELECT}`)
        .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
        .order("full_name")
        .limit(50);
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map(mapCandidateRow);
    },
    enabled: trimmed.length > 0,
    staleTime: 15_000,
  });
}

/**
 * Один кандидат за id, з джерелом (RLS: mp_can_access_candidate).
 * `select("*")` вже підхоплює нові колонки messengers/resume_* (RLS діє на
 * рівні рядка, колонки не приховані) — типи звужуємо локальним каст, бо
 * types.ts ще не регенеровано (TODO: типи після gen types).
 */
export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: id ? candidateKey(id) : ["ats", "candidates", "unknown"],
    queryFn: async (): Promise<AtsCandidateWithSource | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("ats_candidates")
        .select("*, source:candidate_sources(id, name)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      if (!data) return null;
      // TODO: типи після gen types
      const row = data as unknown as AtsCandidateWithResume & { source: { id: string; name: string } | null };
      return {
        ...row,
        messengers: row.messengers ?? {},
        applications_count: 0,
      };
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Довідник джерел кандидатів (глобальний, readonly для не-admin). */
export function useCandidateSources() {
  return useQuery({
    queryKey: ["ats", "candidate_sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_sources")
        .select("*")
        .eq("is_active", true)
        .order("name");
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
 * Створення кандидата — будь-який внутрішній користувач (RLS: candidates_insert).
 * `messengers` — опційне поле поверх AtsCandidateInsert (TODO: типи після gen
 * types, колонка ще не в types.ts) — приймаємо окремо і докладаємо `as`-каст
 * лише на сам insert-виклик, щоб не втратити типізацію решти полів.
 */
export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: AtsCandidateInsert & { messengers?: CandidateMessengers },
    ): Promise<AtsCandidate> => {
      // TODO: типи після gen types
      const { data, error } = await (supabase.from("ats_candidates") as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      toast.success("Кандидата створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення картки кандидата — власник, автор або can_edit у scope (RLS: candidates_update). */
export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: AtsCandidateUpdate }): Promise<AtsCandidate> => {
      const { data, error } = await supabase.from("ats_candidates").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      qc.invalidateQueries({ queryKey: candidateKey(data.id) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * Оновлення месенджерів кандидата (jsonb, довільні канали) — той самий
 * candidates_update RLS-предикат. Окремий хук, щоб не змішувати з
 * AtsCandidateUpdate (messengers ще не в generated Update-типі).
 * TODO: типи після gen types
 */
export function useUpdateCandidateMessengers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      messengers,
    }: {
      id: string;
      messengers: CandidateMessengers;
    }): Promise<void> => {
      // TODO: типи після gen types
      const { error } = await (supabase.from("ats_candidates") as any)
        .update({ messengers })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      qc.invalidateQueries({ queryKey: candidateKey(variables.id) });
      toast.success("Контакти оновлено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

interface ParseResumeResponse {
  ok?: boolean;
  resume_parsed?: Record<string, unknown>;
  error?: string;
  detail?: string;
}

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

const PARSE_RESUME_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до цього кандидата",
  invalid_body: "Некоректні дані запиту",
  candidate_not_found: "Кандидата не знайдено",
  ai_not_configured: "AI-функція ще не налаштована (відсутній ключ провайдера)",
  server_error: "Внутрішня помилка сервера",
};

function parseResumeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? PARSE_RESUME_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Не вдалося розібрати резюме";
}

/**
 * Виклик Edge Function `parse-resume` — надсилає вже витягнутий на клієнті
 * (resume-parse-client.ts) plain text резюме на структурований AI-парсинг.
 * Не падає, якщо функція ще не задеплоєна — показує toast.
 */
export function useParseResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidate_id: string;
      resume_text: string;
      file_name?: string;
    }): Promise<ParseResumeResponse> => {
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: {
          candidate_id: payload.candidate_id,
          resume_text: payload.resume_text,
          file_name: payload.file_name,
        },
      });
      if (error) {
        const context = (error as { context?: { error?: string; detail?: string } })?.context;
        if (context?.error) throw new Error(parseResumeErrorMessage(context.error, context.detail));
        throw error;
      }
      const body = data as ParseResumeResponse;
      if (body?.error) throw new Error(parseResumeErrorMessage(body.error, body.detail));
      return body;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: candidateKey(variables.candidate_id) });
      qc.invalidateQueries({ queryKey: CANDIDATES_KEY });
      toast.success("Резюме розібрано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося розібрати резюме");
    },
  });
}
