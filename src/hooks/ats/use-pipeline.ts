import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];

const stagesByVacancyKey = (vacancyId: string) => ["ats", "pipeline_stages", "vacancy", vacancyId] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Стадії воронки вакансії, впорядковані для kanban-колонок (RLS: доступ до вакансії). */
export function usePipelineStages(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? stagesByVacancyKey(vacancyId) : ["ats", "pipeline_stages", "vacancy", "unknown"],
    queryFn: async (): Promise<PipelineStage[]> => {
      if (!vacancyId) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("vacancy_id", vacancyId)
        .order("position", { ascending: true });
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

/**
 * Засів стадій воронки з дефолтного (або обраного) шаблону.
 *
 * Працює НАПРЯМУ через Supabase-клієнт під RLS (політика
 * `pipeline_stages_insert` дозволяє це кожному, хто має `mp_can_edit_vacancy`),
 * тож не залежить від деплою Edge `seed-vacancy-stages` — та лишається для
 * зовнішніх API-споживачів. Після засіву заявки вакансії без стадії
 * (current_stage_id IS NULL — створені до появи воронки) переносяться на першу
 * стадію, щоб не «зависали» поза kanban-дошкою.
 */
export async function seedVacancyStagesDirect(
  vacancyId: string,
  templateId?: string | null,
): Promise<{ ok: boolean; stages_created: number }> {
  // 0. Ідемпотентність: якщо стадії вже є — нічого не робимо.
      const { count: existing, error: exErr } = await supabase
        .from("pipeline_stages")
        .select("id", { count: "exact", head: true })
        .eq("vacancy_id", vacancyId);
      if (exErr) throw exErr;
      if ((existing ?? 0) > 0) return { ok: true, stages_created: 0 };

      // 1. Обираємо шаблон: явно переданий або дефолтний (або перший-ліпший).
      let tplId = templateId ?? null;
      if (!tplId) {
        const { data: tpl, error: tplErr } = await supabase
          .from("pipeline_stage_templates")
          .select("id, is_default")
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tplErr) throw tplErr;
        if (!tpl) throw new Error("Немає жодного шаблону воронки");
        tplId = tpl.id;
      }

      // 2. Пункти шаблону → рядки стадій цієї вакансії.
      const { data: items, error: itErr } = await supabase
        .from("pipeline_stage_template_items")
        .select("name, stage_type, position, is_terminal")
        .eq("template_id", tplId)
        .order("position", { ascending: true });
      if (itErr) throw itErr;
      if (!items || items.length === 0) throw new Error("Шаблон воронки порожній");

      const { data: created, error: insErr } = await supabase
        .from("pipeline_stages")
        .insert(items.map((it) => ({ ...it, vacancy_id: vacancyId })))
        .select("id, position");
      if (insErr) throw insErr;

      // 3. Заявки без стадії → на першу стадію (RLS: applications_update).
      const first = (created ?? []).slice().sort((a, b) => a.position - b.position)[0];
      if (first) {
        const { error: updErr } = await supabase
          .from("applications")
          .update({ current_stage_id: first.id })
          .eq("vacancy_id", vacancyId)
          .is("current_stage_id", null);
        // Не валимо засів через це — заявку можна перенести і вручну.
        if (updErr) console.error("seed stages: не вдалося перенести заявки:", updErr.message);
      }

  return { ok: true, stages_created: created?.length ?? 0 };
}

export function useSeedVacancyStages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vacancyId, templateId }: { vacancyId: string; templateId?: string | null }) =>
      seedVacancyStagesDirect(vacancyId, templateId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: stagesByVacancyKey(variables.vacancyId) });
      qc.invalidateQueries({ queryKey: ["ats", "applications"] });
      toast.success("Стадії воронки створено");
    },
    onError: (error: { message?: string }) => {
      toast.error(toFriendlyMessage(error ?? null));
    },
  });
}
