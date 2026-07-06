// src/hooks/ats/use-grants.ts
//
// Гранти доступу (client/hiring_project/vacancy) — адмін-екран /ats/access.
// CRUD іде ЦІЛКОМ через Edge Function `grant-management` (список/видача/
// оновлення/відкликання), не напряму в access_grants — контракт Edge Function
// іще не зафіксовано в цьому репо (supabase/functions/* — поза цим PR),
// тому тіла запитів/відповідей типізовані локально й позначені TODO.
//
// TODO: типи після gen types — access_grants.scope_type у types.ts (grant_scope)
// ще не містить значення 'vacancy' (додано міграцією 20260706085900/090000,
// types.ts не регенеровано). Використовуємо локальний ширший union нижче.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Розширений scope_type — включає 'vacancy' з міграції 20260706090000 (ще не в types.ts). */
export type GrantScopeType = "client" | "hiring_project" | "vacancy";

export interface GrantRow {
  id: string;
  user_id: string;
  user_email: string | null;
  scope_type: GrantScopeType;
  scope_id: string;
  scope_name: string | null;
  can_edit: boolean;
  can_view_financials: boolean;
  is_active: boolean;
  created_at: string;
}

interface GrantManagementListResponse {
  grants?: GrantRow[];
  error?: string;
  detail?: string;
}

interface GrantManagementMutationResponse {
  ok?: boolean;
  grant?: GrantRow;
  error?: string;
  detail?: string;
}

const GRANTS_KEY = ["ats", "access_grants"] as const;

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до керування грантами",
  invalid_body: "Некоректні дані запиту",
  user_not_found: "Користувача не знайдено",
  scope_not_found: "Обʼєкт (клієнт/проект/вакансія) не знайдено",
  server_error: "Внутрішня помилка сервера",
};

function edgeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? EDGE_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Сталася помилка";
}

/**
 * Список усіх грантів (адмін/owner). Викликає `grant-management`
 * action: 'list'. Якщо функція ще не задеплоєна — не падає, повертає порожній
 * список і показує toast (список вважається "ще не готовий", не помилкою
 * рендеру сторінки).
 */
export function useGrants() {
  return useQuery({
    queryKey: GRANTS_KEY,
    queryFn: async (): Promise<GrantRow[]> => {
      const { data, error } = await supabase.functions.invoke("grant-management", {
        body: { action: "list" },
      });
      if (error) {
        if (isEdgeNotDeployedError(error)) {
          toast.error("Функція ще не задеплоєна");
          return [];
        }
        const context = (error as { context?: { error?: string; detail?: string } })?.context;
        throw new Error(edgeErrorMessage(context?.error, context?.detail));
      }
      const body = data as GrantManagementListResponse;
      if (body?.error) {
        throw new Error(edgeErrorMessage(body.error, body.detail));
      }
      return body?.grants ?? [];
    },
    staleTime: 15_000,
    retry: false,
  });
}

export interface GrantPayload {
  user_id: string;
  scope_type: GrantScopeType;
  scope_id: string;
  can_edit: boolean;
  can_view_financials: boolean;
}

/** Видача нового гранту — `grant-management` action: 'grant'. */
export function useGrantAccess() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GrantPayload): Promise<GrantRow | null> => {
      const { data, error } = await supabase.functions.invoke("grant-management", {
        body: { action: "grant", ...payload },
      });
      if (error) throw error;
      const body = data as GrantManagementMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      return body?.grant ?? null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRANTS_KEY });
      toast.success("Доступ видано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося видати доступ");
    },
  });
}

export interface GrantUpdatePayload {
  id: string;
  can_edit?: boolean;
  can_view_financials?: boolean;
}

/** Оновлення прапорців гранту — `grant-management` action: 'update'. */
export function useUpdateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: GrantUpdatePayload): Promise<GrantRow | null> => {
      const { data, error } = await supabase.functions.invoke("grant-management", {
        body: { action: "update", ...payload },
      });
      if (error) throw error;
      const body = data as GrantManagementMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
      return body?.grant ?? null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRANTS_KEY });
      toast.success("Зміни збережено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося оновити доступ");
    },
  });
}

/** Відкликання гранту — `grant-management` action: 'revoke'. */
export function useRevokeGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("grant-management", {
        body: { action: "revoke", id },
      });
      if (error) throw error;
      const body = data as GrantManagementMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GRANTS_KEY });
      toast.success("Доступ відкликано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося відкликати доступ");
    },
  });
}

/** Призначення відповідального рекрутера на вакансію — `grant-management` action: 'assign_recruiter'. */
export function useAssignRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { vacancy_id: string; recruiter_id: string | null }): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("grant-management", {
        // Контракт Edge: поле називається user_id (не recruiter_id).
        body: { action: "assign_recruiter", vacancy_id: payload.vacancy_id, user_id: payload.recruiter_id },
      });
      if (error) throw error;
      const body = data as GrantManagementMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ats", "vacancies"] });
      qc.invalidateQueries({ queryKey: ["ats", "vacancies", variables.vacancy_id] });
      toast.success("Відповідального призначено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      toast.error(error?.message || "Не вдалося призначити відповідального");
    },
  });
}

/** Довідник профілів (для вибору користувача у діалозі видачі доступу). */
export function useProfilesList() {
  return useQuery({
    queryKey: ["ats", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name")
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
