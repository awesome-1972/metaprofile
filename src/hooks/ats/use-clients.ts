import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
export type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export type ClientWithProjectCount = Client & { hiring_projects_count: number };

const CLIENTS_KEY = ["ats", "clients"] as const;
const clientKey = (id: string) => ["ats", "clients", id] as const;

/**
 * RLS-помилки Supabase (permission denied / 42501) перетворюємо на зрозумілий
 * тост, замість "сирого" тексту з БД.
 */
function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Список клієнтів, доступних поточному користувачу (RLS: mp_can_access_client). */
export function useClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: async (): Promise<ClientWithProjectCount[]> => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, hiring_projects(count)")
        .order("name");
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []).map((row) => {
        const { hiring_projects, ...client } = row as Client & {
          hiring_projects: { count: number }[] | null;
        };
        return {
          ...client,
          hiring_projects_count: hiring_projects?.[0]?.count ?? 0,
        };
      });
    },
    staleTime: 30_000,
  });
}

/** Один клієнт за id (RLS: mp_can_access_client). */
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: id ? clientKey(id) : ["ats", "clients", "unknown"],
    queryFn: async (): Promise<Client | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/** Створення клієнта — лише owner/admin (RLS: clients_insert). */
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ClientInsert): Promise<Client> => {
      const { data, error } = await supabase
        .from("clients")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
      toast.success("Клієнта створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення клієнта — лише owner/admin (RLS: clients_update). */
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ClientUpdate }): Promise<Client> => {
      const { data, error } = await supabase
        .from("clients")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: CLIENTS_KEY });
      qc.invalidateQueries({ queryKey: clientKey(data.id) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
