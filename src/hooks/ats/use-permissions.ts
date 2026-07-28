import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Права RBAC — прапорці `домен.дія` (див. таблицю roles.permissions). */
export type Permission =
  | "clients.view" | "clients.edit" | "clients.archive"
  | "projects.view" | "projects.edit" | "projects.archive"
  | "vacancies.view" | "vacancies.edit" | "vacancies.create"
  | "funnel.edit"
  | "candidates.view" | "candidates.edit" | "candidates.erase"
  | "applications.manage"
  | "communications.send"
  | "financials.view"
  | "reports.generate"
  | "files.manage"
  | "users.manage"
  | "roles.manage"
  | "tenant.settings";

/**
 * Права поточного користувача (агреговані з усіх його ролей у поточному тенанті).
 * Один RPC `mp_my_permissions` — кешується TanStack Query для UI-гейтингу.
 */
export function usePermissions() {
  const query = useQuery({
    queryKey: ["ats", "my_permissions"],
    queryFn: async (): Promise<Set<Permission>> => {
      const { data, error } = await supabase.rpc("mp_my_permissions");
      if (error) throw error;
      return new Set((data ?? []) as Permission[]);
    },
    staleTime: 5 * 60_000,
  });

  const perms = query.data ?? new Set<Permission>();
  return {
    ...query,
    /** Чи має користувач конкретне право. */
    can: (perm: Permission) => perms.has(perm),
    permissions: perms,
  };
}
