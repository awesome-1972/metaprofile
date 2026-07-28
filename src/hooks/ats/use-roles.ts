import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { Permission } from "@/hooks/ats/use-permissions";

export type Role = Database["public"]["Tables"]["roles"]["Row"];

const ROLES_KEY = ["ats", "roles"] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/**
 * Каталог прав, згрупований по доменах — для редактора ролей (галочки).
 * Ключі мають збігатися з permissions у БД (seed 20260727095100).
 */
export const PERMISSION_CATALOG: Array<{
  group: string;
  perms: Array<{ key: Permission; label: string }>;
}> = [
  {
    group: "Клієнти",
    perms: [
      { key: "clients.view", label: "Перегляд" },
      { key: "clients.edit", label: "Редагування" },
      { key: "clients.archive", label: "Архівування" },
    ],
  },
  {
    group: "Проекти",
    perms: [
      { key: "projects.view", label: "Перегляд" },
      { key: "projects.edit", label: "Редагування" },
      { key: "projects.archive", label: "Архівування" },
    ],
  },
  {
    group: "Вакансії",
    perms: [
      { key: "vacancies.view", label: "Перегляд" },
      { key: "vacancies.edit", label: "Редагування" },
      { key: "vacancies.create", label: "Створення" },
    ],
  },
  {
    group: "Воронка й кандидати",
    perms: [
      { key: "funnel.edit", label: "Редагування воронки" },
      { key: "candidates.view", label: "Перегляд кандидатів" },
      { key: "candidates.edit", label: "Редагування кандидатів" },
      { key: "candidates.erase", label: "Видалення (GDPR)" },
      { key: "applications.manage", label: "Рух по воронці / відмови" },
    ],
  },
  {
    group: "Операції",
    perms: [
      { key: "communications.send", label: "Надсилання листів" },
      { key: "financials.view", label: "Перегляд фінансів" },
      { key: "reports.generate", label: "Генерація AI-звітів" },
      { key: "files.manage", label: "Файли" },
    ],
  },
  {
    group: "Адміністрування",
    perms: [
      { key: "users.manage", label: "Керування користувачами" },
      { key: "roles.manage", label: "Керування ролями" },
      { key: "tenant.settings", label: "Налаштування тенанта" },
    ],
  },
];

/** Ролі тенанта (системні + кастомні). Системні йдуть першими. */
export function useRoles() {
  return useQuery({
    queryKey: ROLES_KEY,
    queryFn: async (): Promise<Role[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name");
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    staleTime: 60_000,
  });
}

/** Створити кастомну роль (порожні права або стартовий набір). */
export function useCreateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; permissions?: Permission[] }): Promise<Role> => {
      const { data, error } = await supabase
        .from("roles")
        .insert({
          name: payload.name.trim(),
          is_system: false,
          permissions: payload.permissions ?? [],
          // tenant_id проставляє тригер mp_stamp_tenant.
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      toast.success("Роль створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновити права ролі (та/або назву). Системні ролі теж можна коригувати. */
export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      permissions?: Permission[];
    }): Promise<Role> => {
      const patch: Database["public"]["Tables"]["roles"]["Update"] = {};
      if (payload.name !== undefined) patch.name = payload.name.trim();
      if (payload.permissions !== undefined) patch.permissions = payload.permissions;

      const { data, error } = await supabase
        .from("roles")
        .update(patch)
        .eq("id", payload.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      qc.invalidateQueries({ queryKey: ["ats", "my_permissions"] });
      toast.success("Права ролі оновлено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Кастомні ролі (role_id), призначені конкретному користувачу. */
export function useUserCustomRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ["ats", "user_custom_roles", userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", userId)
        .not("role_id", "is", null);
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map((r) => r.role_id as string).filter(Boolean);
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

/**
 * Призначити / зняти кастомну роль користувачу (рядок user_roles з role_id,
 * role NULL). RLS: user_roles ALL — лише admin; tenant_id — тригер stamp.
 */
export function useSetUserCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
      assigned,
    }: {
      userId: string;
      roleId: string;
      assigned: boolean;
    }) => {
      if (assigned) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role_id: roleId });
        if (error && !/duplicate/i.test(error.message)) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role_id", roleId);
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["ats", "user_custom_roles", variables.userId] });
      toast.success(variables.assigned ? "Роль призначено" : "Роль знято");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Видалити кастомну роль (системні захищені на рівні UI). */
export function useDeleteRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ROLES_KEY });
      toast.success("Роль видалено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
