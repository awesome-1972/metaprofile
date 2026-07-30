import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ImportedVacancy {
  title: string | null;
  seniority: string | null;
  employment_type: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  location: string | null;
  is_remote: boolean | null;
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  nice_to_have: string[];
  skills: string[];
  languages: string[];
}
export interface ImportVacancyResult {
  parsed: ImportedVacancy;
  source_chars: number;
}

const ERR: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу",
  no_source: "Вставте посилання або текст вакансії",
  invalid_url: "Некоректне посилання",
  blocked_url: "Це посилання недоступне для імпорту (лише публічні https-сторінки)",
  fetch_failed: "Не вдалося завантажити сторінку за посиланням — спробуйте вставити текст",
  empty_text: "На сторінці не знайдено тексту — вставте текст вакансії вручну",
  ai_not_configured: "AI-функція ще не налаштована",
  ai_provider_error: "Помилка AI-провайдера",
  rate_limited: "Забагато запитів — спробуйте за хвилину",
  server_error: "Внутрішня помилка сервера",
};

/**
 * «Магічний імпорт вакансії» — Edge `import-vacancy`: URL/текст джоб-постингу
 * → структуровані поля (preview, без запису). Форму заповнює викликач.
 */
export function useImportVacancy() {
  return useMutation({
    mutationFn: async (source: { url?: string; text?: string }): Promise<ImportVacancyResult> => {
      const { data, error } = await supabase.functions.invoke("import-vacancy", { body: { source } });
      if (error) {
        let code: string | undefined;
        let detail: string | undefined;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); code = p.error; detail = p.detail; }
        } catch { /* ignore */ }
        const msg = (code && ERR[code]) || detail || error.message || "Не вдалося імпортувати вакансію";
        throw new Error(msg);
      }
      return data as ImportVacancyResult;
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося імпортувати вакансію");
    },
  });
}
