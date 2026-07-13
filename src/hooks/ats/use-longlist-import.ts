import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classifyStatus, type LongListRow } from "@/lib/ats/longlist-parser";
import type { Database } from "@/integrations/supabase/types";

type RejectionCategory = Database["public"]["Enums"]["rejection_category"];

/** Що станеться з рядком при імпорті — рахується ДО запису й показується в прев'ю. */
export interface ImportPlanRow {
  row: LongListRow;
  /** Знайдений дубль (email → ПІБ) або null. */
  existingCandidateId: string | null;
  existingCandidateName: string | null;
  /** Кандидат уже має заявку на цю вакансію. */
  alreadyApplied: boolean;
  outcome: ReturnType<typeof classifyStatus>;
  /** Рядок бере участь в імпорті (користувач може зняти галочку). */
  selected: boolean;
}

export interface ImportSummary {
  candidatesCreated: number;
  candidatesUpdated: number;
  applicationsCreated: number;
  rejectionsCreated: number;
  skipped: number;
}

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
 * План імпорту: для кожного рядка шукаємо дубль (email → ПІБ) і наявну заявку.
 *
 * Дедуп (рішення власника): збіг за email; якщо email порожній — за точним ПІБ.
 * Нічого не пишемо — лише рахуємо, що станеться. Запис — окремою дією
 * після підтвердження людиною.
 */
export function useBuildImportPlan() {
  return useMutation({
    mutationFn: async ({
      rows,
      vacancyId,
    }: {
      rows: LongListRow[];
      vacancyId: string;
    }): Promise<ImportPlanRow[]> => {
      const emails = rows.map((r) => r.email?.toLowerCase()).filter(Boolean) as string[];
      const names = rows.map((r) => r.fullName.trim()).filter(Boolean);

      const [{ data: byEmail }, { data: byName }] = await Promise.all([
        emails.length > 0
          ? supabase.from("ats_candidates").select("id, full_name, email").in("email", emails)
          : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null }[] }),
        names.length > 0
          ? supabase.from("ats_candidates").select("id, full_name, email").in("full_name", names)
          : Promise.resolve({ data: [] as { id: string; full_name: string; email: string | null }[] }),
      ]);

      const emailIndex = new Map<string, { id: string; full_name: string }>();
      for (const candidate of byEmail ?? []) {
        if (candidate.email) emailIndex.set(candidate.email.toLowerCase(), candidate);
      }
      const nameIndex = new Map<string, { id: string; full_name: string }>();
      for (const candidate of byName ?? []) {
        nameIndex.set(candidate.full_name.trim().toLowerCase(), candidate);
      }

      const candidateIds = [
        ...new Set([...(byEmail ?? []), ...(byName ?? [])].map((c) => c.id)),
      ];
      const { data: applications } = candidateIds.length
        ? await supabase
            .from("applications")
            .select("candidate_id")
            .eq("vacancy_id", vacancyId)
            .in("candidate_id", candidateIds)
        : { data: [] as { candidate_id: string }[] };
      const applied = new Set((applications ?? []).map((a) => a.candidate_id));

      return rows.map((row) => {
        const match =
          (row.email ? emailIndex.get(row.email.toLowerCase()) : undefined) ??
          nameIndex.get(row.fullName.trim().toLowerCase()) ??
          null;
        return {
          row,
          existingCandidateId: match?.id ?? null,
          existingCandidateName: match?.full_name ?? null,
          alreadyApplied: match ? applied.has(match.id) : false,
          outcome: classifyStatus(row.status),
          selected: true,
        };
      });
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/**
 * Виконання імпорту: кандидати (створення/оновлення) → заявки на першу стадію
 * етапу «Лонг-лист» → для рядків зі Status «відмова» одразу rejected + причина.
 *
 * Послідовно, а не одним batch-insert: обсяги лонг-листа — сотні рядків, а не
 * десятки тисяч, зате кожен рядок має власну долю (дубль / нова заявка / відмова)
 * і зрозумілу помилку.
 */
export function useRunLongListImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      plan,
      vacancyId,
      stageId,
      sourceId,
    }: {
      plan: ImportPlanRow[];
      vacancyId: string;
      stageId: string;
      sourceId?: string | null;
    }): Promise<ImportSummary> => {
      const summary: ImportSummary = {
        candidatesCreated: 0,
        candidatesUpdated: 0,
        applicationsCreated: 0,
        rejectionsCreated: 0,
        skipped: 0,
      };

      for (const item of plan) {
        if (!item.selected) {
          summary.skipped += 1;
          continue;
        }
        const { row } = item;

        const notes = [row.comment, row.status ? `Status із файлу: ${row.status}` : ""]
          .filter(Boolean)
          .join("\n");

        let candidateId = item.existingCandidateId;

        if (candidateId) {
          // Оновлюємо лише порожні поля — імпорт не має затирати те, що вже
          // уточнив рекрутер у системі.
          const { data: current } = await supabase
            .from("ats_candidates")
            .select("email, phone, linkedin_url, headline, current_company, notes")
            .eq("id", candidateId)
            .maybeSingle();

          const patch: Database["public"]["Tables"]["ats_candidates"]["Update"] = {};
          if (!current?.email && row.email) patch.email = row.email;
          if (!current?.phone && row.phone) patch.phone = row.phone;
          if (!current?.linkedin_url && row.linkedin) patch.linkedin_url = row.linkedin;
          if (!current?.headline && row.title) patch.headline = row.title;
          if (!current?.current_company && row.company) patch.current_company = row.company;
          if (notes && !current?.notes) patch.notes = notes;

          if (Object.keys(patch).length > 0) {
            const { error } = await supabase.from("ats_candidates").update(patch).eq("id", candidateId);
            if (error) throw error;
            summary.candidatesUpdated += 1;
          }
        } else {
          const { data: created, error } = await supabase
            .from("ats_candidates")
            .insert({
              full_name: row.fullName,
              email: row.email ?? null,
              phone: row.phone ?? null,
              linkedin_url: row.linkedin ?? null,
              headline: row.title ?? null,
              current_company: row.company ?? null,
              notes: notes || null,
              source_id: sourceId ?? null,
            })
            .select("id")
            .single();
          if (error) throw error;
          candidateId = created.id;
          summary.candidatesCreated += 1;
        }

        if (item.alreadyApplied || !candidateId) continue;

        const { data: application, error: appError } = await supabase
          .from("applications")
          .insert({
            candidate_id: candidateId,
            vacancy_id: vacancyId,
            current_stage_id: stageId,
            list_state: "long_list",
          })
          .select("id")
          .single();
        if (appError) throw appError;
        summary.applicationsCreated += 1;

        if (item.outcome !== "active") {
          const reasonCode: RejectionCategory =
            item.outcome === "rejected_by_candidate" ? "candidate_withdrew" : "failed_screening";

          const { error: rejError } = await supabase.from("rejections").insert({
            application_id: application.id,
            reason_code: reasonCode,
            comment: row.status ?? null,
            is_candidate_initiated: item.outcome === "rejected_by_candidate",
          });
          if (rejError) throw rejError;

          const { error: statusError } = await supabase
            .from("applications")
            .update({ status: "rejected" })
            .eq("id", application.id);
          if (statusError) throw statusError;

          summary.rejectionsCreated += 1;
        }
      }

      return summary;
    },
    onSuccess: (summary, variables) => {
      qc.invalidateQueries({ queryKey: ["ats", "applications", "vacancy", variables.vacancyId] });
      qc.invalidateQueries({ queryKey: ["ats", "candidates"] });
      toast.success(
        `Імпорт завершено: +${summary.candidatesCreated} кандидатів, ` +
          `${summary.applicationsCreated} заявок, ${summary.rejectionsCreated} відмов`,
      );
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
