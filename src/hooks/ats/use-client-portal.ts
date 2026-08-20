import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ClientPortalSettings {
  client_token: string | null;
  client_share_enabled: boolean;
  client_show_strategy: boolean;
  client_show_progress: boolean;
  client_show_shortlist: boolean;
  client_show_longlist: boolean;
}

const key = (vacancyId: string) => ["ats", "client_portal", vacancyId] as const;

export function useClientPortal(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? key(vacancyId) : ["ats", "client_portal", "none"],
    queryFn: async (): Promise<ClientPortalSettings | null> => {
      if (!vacancyId) return null;
      const { data, error } = await supabase
        .from("vacancies")
        .select("client_token, client_share_enabled, client_show_strategy, client_show_progress, client_show_shortlist, client_show_longlist")
        .eq("id", vacancyId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ClientPortalSettings) ?? null;
    },
    enabled: !!vacancyId,
    staleTime: 30_000,
  });
}

/** Оновлення налаштувань порталу. Вмикання генерує токен, якщо його ще немає. */
export function useUpdateClientPortal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, patch, current }: {
      vacancyId: string;
      patch: Partial<ClientPortalSettings>;
      current: ClientPortalSettings | null;
    }): Promise<void> => {
      const body: Record<string, unknown> = { ...patch };
      // Якщо вмикаємо і токена немає — генеруємо.
      if (patch.client_share_enabled === true && !current?.client_token) {
        body.client_token = crypto.randomUUID();
      }
      const { error } = await supabase.from("vacancies").update(body as never).eq("id", vacancyId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: key(v.vacancyId) });
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Не вдалося оновити портал"),
  });
}
