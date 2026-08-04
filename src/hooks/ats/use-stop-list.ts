import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type StopListEntry = Database["public"]["Tables"]["vacancy_stop_list"]["Row"];

const stopListKey = (vacancyId: string) => ["ats", "stop_list", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Нормалізація ПІБ для порівняння: нижній регістр, стиснуті пробіли. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Збіг кандидата зі стоп-листом вакансії. Порівняння за нормалізованим ПІБ;
 * компанія — додатковий сигнал (посилює впевненість, але сам ПІБ достатній).
 * Повертає записи стоп-листа, що збіглися (порожньо = чисто).
 */
export function matchStopList(
  candidate: { full_name?: string | null; company?: string | null },
  stopList: StopListEntry[],
): StopListEntry[] {
  const name = normalizeName(candidate.full_name ?? "");
  if (!name) return [];
  return stopList.filter((entry) => normalizeName(entry.full_name) === name);
}

/** Стоп-лист вакансії (RLS: доступ до вакансії). */
export function useStopList(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? stopListKey(vacancyId) : ["ats", "stop_list", "unknown"],
    queryFn: async (): Promise<StopListEntry[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("vacancy_stop_list")
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

/** Додати запис у стоп-лист (RLS: mp_can_edit_vacancy; tenant_id — тригер). */
export function useAddStopListEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      vacancyId: string;
      fullName: string;
      company?: string | null;
      reason?: string | null;
    }): Promise<StopListEntry> => {
      const { data, error } = await supabase
        .from("vacancy_stop_list")
        .insert({
          vacancy_id: payload.vacancyId,
          full_name: payload.fullName.trim(),
          company: payload.company?.trim() || null,
          reason: payload.reason?.trim() || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stopListKey(variables.vacancyId) });
      toast.success("Додано у стоп-лист");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

export interface ParsedStopEntry {
  full_name: string;
  company: string | null;
  reason: string | null;
}

/** Розбір транскрипту розмови у записи стоп-листа (Edge parse-stoplist). */
export function useParseStopList() {
  return useMutation({
    mutationFn: async (args: { vacancyId: string; transcript: string }): Promise<ParsedStopEntry[]> => {
      const { data, error } = await supabase.functions.invoke("parse-stoplist", {
        body: { vacancy_id: args.vacancyId, transcript: args.transcript },
      });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); detail = p.detail || p.error || ""; }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Не вдалося розпізнати стоп-лист");
      }
      return (data as { entries?: ParsedStopEntry[] })?.entries ?? [];
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося розпізнати стоп-лист");
    },
  });
}

const stopSourceKey = (vacancyId: string) => ["ats", "stop_list_source", vacancyId] as const;

/** Посилання на Google-документ стоп-листа + час останньої синхронізації. */
export function useStopListSource(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? stopSourceKey(vacancyId) : ["ats", "stop_list_source", "none"],
    queryFn: async (): Promise<{ url: string | null; syncedAt: string | null }> => {
      if (!vacancyId) return { url: null, syncedAt: null };
      const { data, error } = await supabase
        .from("vacancies")
        .select("stop_list_source_url, stop_list_synced_at")
        .eq("id", vacancyId)
        .maybeSingle();
      if (error) throw error;
      const row = data as unknown as { stop_list_source_url: string | null; stop_list_synced_at: string | null } | null;
      return { url: row?.stop_list_source_url ?? null, syncedAt: row?.stop_list_synced_at ?? null };
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Зберегти посилання на Google-документ стоп-листа. */
export function useSetStopListSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ vacancyId, url }: { vacancyId: string; url: string | null }): Promise<void> => {
      const { error } = await supabase
        .from("vacancies")
        .update({ stop_list_source_url: url } as never)
        .eq("id", vacancyId);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: stopSourceKey(v.vacancyId) });
      toast.success(v.url ? "Джерело стоп-листа збережено" : "Джерело прибрано");
    },
    onError: (error: { message?: string }) => toast.error(error?.message || "Не вдалося зберегти джерело"),
  });
}

/** Синхронізувати стоп-лист із Google-документа (Edge sync-stoplist). */
export function useSyncStopList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vacancyId: string): Promise<{ count: number; synced_at: string }> => {
      const { data, error } = await supabase.functions.invoke("sync-stoplist", { body: { vacancy_id: vacancyId } });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); detail = p.detail || p.error || ""; }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Не вдалося синхронізувати");
      }
      return data as { count: number; synced_at: string };
    },
    onSuccess: (res, vacancyId) => {
      qc.invalidateQueries({ queryKey: stopListKey(vacancyId) });
      qc.invalidateQueries({ queryKey: stopSourceKey(vacancyId) });
      toast.success(`Синхронізовано зі стоп-листа: ${res.count}`);
    },
    onError: (error: { message?: string }) => toast.error(error?.message || "Не вдалося синхронізувати"),
  });
}

/** Прибрати запис зі стоп-листа. */
export function useRemoveStopListEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, vacancyId: _v }: { id: string; vacancyId: string }) => {
      const { error } = await supabase.from("vacancy_stop_list").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stopListKey(variables.vacancyId) });
      toast.success("Прибрано зі стоп-листа");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
