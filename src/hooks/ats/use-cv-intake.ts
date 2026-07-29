import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedCvPosition {
  title: string | null;
  company: string | null;
  from: string | null;
  to: string | null;
  description: string | null;
}
export interface ParsedCv {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  positions: ParsedCvPosition[];
  education: Array<{ degree: string | null; institution: string | null; year: string | null }>;
  skills: string[];
  languages: Array<{ language: string | null; level: string | null }>;
  messengers: Record<string, string>;
}
export interface CvMatch {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
}
export interface ParseCvPreviewResult {
  parsed: ParsedCv;
  matches: CvMatch[];
  source_text_chars: number;
}

const PARSE_CV_ERROR_LABELS: Record<string, string> = {
  unauthorized: "Сесія недійсна — увійдіть повторно",
  forbidden: "Немає доступу до цієї вакансії",
  invalid_body: "Некоректні дані запиту",
  no_source: "Не передано ні тексту, ні файлу",
  vacancy_not_found: "Вакансію не знайдено",
  unsupported_drive_type: "Тип файлу не підтримується для Drive-розпізнавання — завантажте PDF/DOCX з компʼютера",
  empty_text: "У файлі не знайдено тексту (можливо, скан без текстового шару)",
  ai_not_configured: "AI-функція ще не налаштована (відсутній ключ провайдера)",
  ai_provider_error: "Помилка AI-провайдера",
  google_error: "Помилка Google Drive",
  rate_limited: "Забагато запитів — спробуйте за хвилину",
  server_error: "Внутрішня помилка сервера",
};

function cvErrorMessage(code: string | undefined, detail?: string): string {
  const label = code ? PARSE_CV_ERROR_LABELS[code] : undefined;
  if (label) return detail ? `${label}: ${detail}` : label;
  return detail || "Не вдалося розпізнати CV";
}

/**
 * Виклик Edge `parse-cv-preview` — розпізнає CV у поля БЕЗ запису в кандидата
 * (превʼю) + повертає можливі збіги для дедупу. Джерело — або текст (витягнутий
 * на клієнті), або drive_file_id (читає сервісний акаунт).
 */
export function useParseCvPreview() {
  return useMutation({
    mutationFn: async (payload: {
      vacancy_id: string;
      resume_text?: string;
      drive_file_id?: string;
      file_name?: string;
    }): Promise<ParseCvPreviewResult> => {
      const { data, error } = await supabase.functions.invoke("parse-cv-preview", {
        body: payload,
      });
      if (error) {
        let code: string | undefined;
        let detail: string | undefined;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const parsed = await ctx.json();
            code = parsed.error;
            detail = parsed.detail;
          }
        } catch {
          /* ignore */
        }
        throw new Error(cvErrorMessage(code, detail) || error.message);
      }
      return data as ParseCvPreviewResult;
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося розпізнати CV");
    },
  });
}
