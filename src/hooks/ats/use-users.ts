// src/hooks/ats/use-users.ts
//
// Онбординг внутрішніх користувачів агенції — адмін-екран /ats/users.
// CRUD іде ЦІЛКОМ через Edge Function `admin-invite-user` (список/запрошення/
// зміна ролей/де|активація) — потребує auth.admin.* (service_role), тому
// прямих запитів у auth.users із фронтенду немає й бути не може.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Ролі, доступні через ATS-онбординг. company/candidate — окремий публічний sign-up. */
export type AtsUserRole = "owner" | "recruiter" | "assistant" | "admin";

export interface AtsUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  banned: boolean;
}

interface AdminInviteUserListResponse {
  ok?: boolean;
  users?: AtsUserRow[];
  error?: string;
  detail?: string;
}

interface AdminInviteUserMutationResponse {
  ok?: boolean;
  user_id?: string;
  email?: string;
  role?: string;
  enabled?: boolean;
  banned?: boolean;
  error?: string;
  detail?: string;
}

const USERS_KEY = ["ats", "users"] as const;

function isEdgeNotDeployedError(error: { message?: string } | null): boolean {
  const message = error?.message || "";
  return /not.?found|failed to send|fetch|404/i.test(message);
}

const EDGE_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до керування користувачами",
  invalid_body: "Некоректні дані запиту",
  invalid_email: "Некоректний email",
  invalid_role: "Некоректна роль",
  invalid_user_id: "Некоректний ідентифікатор користувача",
  invalid_enabled: "Некоректне значення прапорця ролі",
  invalid_full_name: "Імʼя має містити від 1 до 120 символів",
  user_exists: "Користувач із таким email вже існує",
  user_not_found: "Користувача не знайдено",
  self_lockout: "Не можна виконати цю дію над власним обліковим записом",
  server_error: "Внутрішня помилка сервера",
};

function edgeErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? EDGE_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Сталася помилка";
}

function extractErrorContext(error: unknown): { error?: string; detail?: string } | undefined {
  return (error as { context?: { error?: string; detail?: string } } | null)?.context;
}

/**
 * Список усіх користувачів (owner/admin). Викликає `admin-invite-user`
 * action: 'list'. Якщо функція ще не задеплоєна — не падає, повертає порожній
 * список і показує toast.
 */
export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async (): Promise<AtsUserRow[]> => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { action: "list" },
      });
      if (error) {
        if (isEdgeNotDeployedError(error)) {
          toast.error("Функція ще не задеплоєна");
          return [];
        }
        const context = extractErrorContext(error);
        throw new Error(edgeErrorMessage(context?.error, context?.detail));
      }
      const body = data as AdminInviteUserListResponse;
      if (body?.error) {
        throw new Error(edgeErrorMessage(body.error, body.detail));
      }
      return body?.users ?? [];
    },
    staleTime: 15_000,
    retry: false,
  });
}

export interface InviteUserPayload {
  email: string;
  full_name?: string;
  role: AtsUserRole;
}

/** Запрошення нового користувача — `admin-invite-user` action: 'invite'. */
export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: InviteUserPayload): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { action: "invite", ...payload },
      });
      if (error) throw error;
      const body = data as AdminInviteUserMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("Запрошення надіслано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      const context = extractErrorContext(error);
      if (context?.error) {
        toast.error(edgeErrorMessage(context.error, context.detail));
        return;
      }
      toast.error(error?.message || "Не вдалося надіслати запрошення");
    },
  });
}

export interface SetRolePayload {
  user_id: string;
  role: AtsUserRole;
  enabled: boolean;
}

/** Увімкнення/вимкнення ролі користувача — `admin-invite-user` action: 'set_role'. */
export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SetRolePayload): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { action: "set_role", ...payload },
      });
      if (error) throw error;
      const body = data as AdminInviteUserMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("Ролі оновлено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      const context = extractErrorContext(error);
      if (context?.error) {
        toast.error(edgeErrorMessage(context.error, context.detail));
        return;
      }
      toast.error(error?.message || "Не вдалося оновити роль");
    },
  });
}

export interface UpdateUserProfilePayload {
  user_id: string;
  full_name: string;
}

/** Редагування імені користувача — `admin-invite-user` action: 'update_profile'. */
export function useUpdateUserProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateUserProfilePayload): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { action: "update_profile", ...payload },
      });
      if (error) throw error;
      const body = data as AdminInviteUserMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success("Імʼя оновлено");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      const context = extractErrorContext(error);
      if (context?.error) {
        toast.error(edgeErrorMessage(context.error, context.detail));
        return;
      }
      toast.error(error?.message || "Не вдалося оновити імʼя");
    },
  });
}

/** Де|активація користувача — `admin-invite-user` action: 'deactivate' | 'activate'. */
export function useSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { user_id: string; active: boolean }): Promise<void> => {
      const { data, error } = await supabase.functions.invoke("admin-invite-user", {
        body: { action: payload.active ? "activate" : "deactivate", user_id: payload.user_id },
      });
      if (error) throw error;
      const body = data as AdminInviteUserMutationResponse;
      if (body?.error) throw new Error(edgeErrorMessage(body.error, body.detail));
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: USERS_KEY });
      toast.success(variables.active ? "Користувача активовано" : "Користувача деактивовано");
    },
    onError: (error: { message?: string }) => {
      if (isEdgeNotDeployedError(error)) {
        toast.error("Функція ще не задеплоєна");
        return;
      }
      const context = extractErrorContext(error);
      if (context?.error) {
        toast.error(edgeErrorMessage(context.error, context.detail));
        return;
      }
      toast.error(error?.message || "Не вдалося змінити статус користувача");
    },
  });
}
