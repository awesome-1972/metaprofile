import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface JoobleJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  snippet: string;
  link: string;
  source: string;
  type: string;
  updated: string;
}
export interface JoobleResult {
  total: number;
  jobs: JoobleJob[];
  query: { keywords: string; location: string; page: number };
}

async function edgeError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof (ctx as Response).json === "function") {
    try {
      const b = await (ctx as Response).json();
      if (b?.error === "jooble_not_configured") return "Не додано ключ Jooble (секрет JOOBLE_API_KEY)";
      if (b?.error) return b.detail ? `${b.error}: ${b.detail}` : b.error;
    } catch { /* ignore */ }
  }
  return (error as { message?: string })?.message || fallback;
}

/** Моніторинг ринку вакансій (Jooble). За замовчуванням — за назвою/гео вакансії. */
export function useJoobleMarket() {
  return useMutation({
    mutationFn: async (args: { vacancyId?: string; keywords?: string; location?: string; page?: number }): Promise<JoobleResult> => {
      const { data, error } = await supabase.functions.invoke("jooble-market", {
        body: { vacancy_id: args.vacancyId, keywords: args.keywords, location: args.location, page: args.page },
      });
      if (error) throw new Error(await edgeError(error, "Не вдалося отримати ринок вакансій"));
      return data as JoobleResult;
    },
    onError: (e: { message?: string }) => toast.error(e?.message || "Помилка Jooble"),
  });
}
