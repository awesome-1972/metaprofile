import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Таблиця notifications ще не в generated types — нетипізований доступ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const NOTIF_KEY = ["ats", "notifications"] as const;

/** Останні сповіщення поточного користувача (RLS: user_id = auth.uid()). */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIF_KEY,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await db
        .from("notifications")
        .select("id, kind, title, body, link, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Позначити одне сповіщення прочитаним. */
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });
}

/** Позначити всі прочитаними. */
export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error } = await db.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIF_KEY }),
  });
}
