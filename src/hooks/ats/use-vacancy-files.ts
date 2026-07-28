import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type VacancyFile = Database["public"]["Tables"]["vacancy_files"]["Row"];
export type VacancyFileInsert = Database["public"]["Tables"]["vacancy_files"]["Insert"];

/**
 * Каталог категорій-папок вакансії. Дзеркалить реальну структуру папок
 * проєктів агенції в Google Drive. Порядок = порядок відображення й порядок
 * створення папок (крок 3). `key` зберігається в vacancy_files.category.
 */
export const FILE_CATEGORIES: Array<{ key: string; label: string; folder: string }> = [
  { key: "long_list", label: "Лонг-лист", folder: "Long List" },
  { key: "cvs", label: "Резюме (CV)", folder: "CVs" },
  { key: "competency_matrix", label: "Матриця компетенцій", folder: "Competency Matrix" },
  { key: "reports", label: "Звіти", folder: "Reports" },
  { key: "presentation", label: "Презентація клієнту", folder: "Presentation to Client" },
  { key: "contracts", label: "Договори", folder: "Contracts" },
  { key: "from_client", label: "Від клієнта", folder: "From Client" },
  { key: "voice_to_text", label: "Транскрипти", folder: "Voice-to-Text" },
  { key: "other", label: "Інше", folder: "Other" },
];

export function categoryLabel(key: string): string {
  return FILE_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

const filesKey = (vacancyId: string) => ["ats", "vacancy_files", vacancyId] as const;

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
 * Витягує Drive file id з поширених форматів лінків
 * (drive.google.com/file/d/<id>/..., ...?id=<id>, docs/spreadsheets/.../d/<id>).
 * Повертає null, якщо id не розпізнано (лінк збережеться як web_view_link без id).
 */
export function parseDriveFileId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]{20,})/, // /file/d/<id> · /document/d/<id> · /spreadsheets/d/<id>
    /[?&]id=([a-zA-Z0-9_-]{20,})/, // open?id=<id> · uc?id=<id>
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** Усі файли вакансії (RLS: mp_can_access_vacancy). */
export function useVacancyFiles(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? filesKey(vacancyId) : ["ats", "vacancy_files", "unknown"],
    queryFn: async (): Promise<VacancyFile[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("vacancy_files")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!vacancyId,
    staleTime: 30_000,
  });
}

/** Зареєструвати файл вакансії (метадані + Drive-лінк). tenant_id — тригер stamp. */
export function useAddVacancyFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancy_id: string;
      category: string;
      name: string;
      web_view_link?: string | null;
      drive_file_id?: string | null;
      note?: string | null;
    }): Promise<VacancyFile> => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("vacancy_files")
        .insert({
          vacancy_id: payload.vacancy_id,
          category: payload.category,
          name: payload.name.trim(),
          web_view_link: payload.web_view_link || null,
          drive_file_id: payload.drive_file_id || null,
          note: payload.note || null,
          uploaded_by: userData.user?.id ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: filesKey(data.vacancy_id) });
      toast.success("Файл додано");
    },
    onError: (error: { code?: string; message?: string }) => {
      if (/duplicate|uq_vacancy_files_drive/i.test(error.message ?? "")) {
        toast.error("Цей файл Drive вже додано до вакансії");
        return;
      }
      toast.error(toFriendlyMessage(error));
    },
  });
}

export interface ImportDriveFolderResult {
  ok: boolean;
  added: number;
  skipped: number;
  total: number;
  folders_scanned?: number;
}

/**
 * Імпорт усіх файлів із папки Google Drive у категорію вакансії за один виклик
 * (Edge import-drive-folder). Сервісний акаунт читає папку через імперсонацію
 * викликача; дедуп за drive_file_id — на боці функції.
 */
export function useImportDriveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancy_id: string;
      folder_url_or_id: string;
      category?: string;
    }): Promise<ImportDriveFolderResult> => {
      const { data, error } = await supabase.functions.invoke("import-drive-folder", {
        body: payload,
      });
      if (error) {
        // Edge повертає деталь у тілі відповіді (non-2xx → error.context).
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) {
            const parsed = await ctx.json();
            detail = parsed.detail || parsed.error || "";
          }
        } catch {
          /* ignore */
        }
        throw new Error(detail || error.message || "Не вдалося імпортувати папку");
      }
      return data as ImportDriveFolderResult;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: filesKey(variables.vacancy_id) });
      if (data.added > 0) {
        toast.success(
          `Імпортовано ${data.added} файл(ів)` +
            (data.skipped > 0 ? `, пропущено дублів: ${data.skipped}` : ""),
        );
      } else if (data.total === 0) {
        toast.info("У папці немає файлів");
      } else {
        toast.info("Нових файлів немає — усі вже додані");
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || "Не вдалося імпортувати папку");
    },
  });
}

/** Видалити файл вакансії (RLS: mp_can_edit_vacancy). */
export function useDeleteVacancyFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; vacancyId: string }) => {
      const { error } = await supabase.from("vacancy_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: filesKey(variables.vacancyId) });
      toast.success("Файл видалено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Масове видалення файлів вакансії за списком id (RLS: mp_can_edit_vacancy). */
export function useDeleteVacancyFiles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[]; vacancyId: string }) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("vacancy_files").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: filesKey(variables.vacancyId) });
      toast.success(`Видалено файлів: ${variables.ids.length}`);
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
