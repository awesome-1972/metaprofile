import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Offer = Database["public"]["Tables"]["offers"]["Row"];
export type OfferStatus = Database["public"]["Enums"]["offer_status"];

export const offerStatusLabel: Record<OfferStatus, string> = {
  draft: "Чернетка",
  sent: "Надіслано",
  accepted: "Прийнято",
  declined: "Відхилено",
  expired: "Протерміновано",
  rescinded: "Відкликано",
};

export const offerStatusColor: Record<OfferStatus, string> = {
  draft: "bg-slate-200 text-slate-700",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-800",
  rescinded: "bg-slate-300 text-slate-700",
};

const offerKey = (applicationId: string) => ["ats", "offer", applicationId] as const;

/** Останній офер по заявці (RLS: mp_can_access_application). */
export function useOfferByApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: applicationId ? offerKey(applicationId) : ["ats", "offer", "none"],
    queryFn: async (): Promise<Offer | null> => {
      if (!applicationId) return null;
      const { data, error } = await supabase
        .from("offers")
        .select("*")
        .eq("application_id", applicationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Offer) ?? null;
    },
    enabled: !!applicationId,
    staleTime: 30_000,
  });
}

/** Створити/оновити офер по заявці. Проставляє offer_sent_at / responded_at на переходах. */
export function useSaveOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      applicationId: string;
      offerId?: string;
      status: OfferStatus;
      termsNote?: string | null;
      startDate?: string | null;
      current?: Offer | null;
    }): Promise<void> => {
      const nowIso = new Date().toISOString();
      const patch: Record<string, unknown> = {
        status: args.status,
        terms_note: args.termsNote ?? null,
        start_date: args.startDate || null,
      };
      // Стемпи дат на переходах.
      if (args.status === "sent" && !args.current?.offer_sent_at) patch.offer_sent_at = nowIso;
      if ((args.status === "accepted" || args.status === "declined") && !args.current?.responded_at) patch.responded_at = nowIso;

      if (args.offerId) {
        const { error } = await supabase.from("offers").update(patch).eq("id", args.offerId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("offers").insert({ application_id: args.applicationId, ...patch } as never);
        if (error) throw error;
      }
    },
    onSuccess: (_d, args) => {
      qc.invalidateQueries({ queryKey: offerKey(args.applicationId) });
      qc.invalidateQueries({ queryKey: ["ats", "applications"] });
      toast.success("Офер збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      const msg = error?.code === "42501" || /permission denied/i.test(error?.message ?? "") ? "Немає доступу" : error?.message;
      toast.error(msg || "Не вдалося зберегти офер");
    },
  });
}
