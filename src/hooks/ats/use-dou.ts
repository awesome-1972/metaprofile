import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface DouJob {
  title: string;
  company: string;
  location: string;
  snippet: string;
  link: string;
  updated: string;
}
export interface DouResult {
  total: number;
  jobs: DouJob[];
  query: { keywords: string; category: string; city: string };
}

async function edgeError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const b = await (ctx as Response).json();
      if (b?.error) return b.detail ? `${b.error}: ${b.detail}` : b.error;
    } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message || fallback;
}

/** Моніторинг вакансій DOU (RSS-фіди jobs.dou.ua). За замовч. — за назвою вакансії. */
export function useDouMarket() {
  return useMutation({
    mutationFn: async (args: { vacancyId?: string; keywords?: string; category?: string; city?: string }): Promise<DouResult> => {
      const { data, error } = await supabase.functions.invoke("dou-market", {
        body: { vacancy_id: args.vacancyId, keywords: args.keywords, category: args.category, city: args.city },
      });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати вакансії DOU"));
      return data as DouResult;
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка DOU"),
  });
}
