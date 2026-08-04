import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Таблиці sourcing_* ще не в generated types — читаємо через нетипізований доступ.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (t: string) => any };

export type SourcingProvider = "github" | "pdl" | "apollo" | "proxycurl";

export interface SourcedProfile {
  id?: string;
  provider: SourcingProvider;
  external_id: string;
  full_name: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  skills: string[];
  profile_url: string | null;
  match_score: number;
  already_in_base?: boolean;
  candidate_id?: string | null;
}

export interface SourcingResult {
  search_id: string;
  total: number;
  counts: Record<string, number>;
  skipped: SourcingProvider[];
  errors: Record<string, string>;
  profiles: SourcedProfile[];
}

const sourcedKey = (vacancyId: string) => ["ats", "sourced_profiles", vacancyId] as const;

/** Збережені знайдені профілі вакансії (RLS: mp_can_access_vacancy по vacancy_id). */
export function useSourcedProfiles(vacancyId: string | undefined) {
  return useQuery({
    queryKey: vacancyId ? sourcedKey(vacancyId) : ["ats", "sourced_profiles", "none"],
    queryFn: async (): Promise<SourcedProfile[]> => {
      if (!vacancyId) return [];
      const { data, error } = await db
        .from("sourced_profiles")
        .select("id, provider, external_id, full_name, title, company, location, skills, profile_url, match_score, breakdown, candidate_id")
        .eq("vacancy_id", vacancyId)
        .order("match_score", { ascending: false });
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data ?? []).map((r: any) => ({
        id: r.id,
        provider: r.provider,
        external_id: r.external_id,
        full_name: r.full_name,
        title: r.title,
        company: r.company,
        location: r.location,
        skills: Array.isArray(r.skills) ? r.skills : [],
        profile_url: r.profile_url,
        match_score: r.match_score ?? 0,
        already_in_base: r.breakdown?.already_in_base ?? false,
        candidate_id: r.candidate_id ?? null,
      }));
    },
    enabled: !!vacancyId,
    staleTime: 60_000,
  });
}

/** Запустити AI-сорсинг (Edge sourcing-search). */
export function useRunSourcing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      vacancyId: string;
      providers?: SourcingProvider[];
      query?: { titles?: string[]; skills?: string[]; locations?: string[]; keywords?: string };
    }): Promise<SourcingResult> => {
      const { data, error } = await supabase.functions.invoke("sourcing-search", {
        body: { vacancy_id: args.vacancyId, providers: args.providers, query: args.query },
      });
      if (error) {
        let detail = "";
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) { const p = await ctx.json(); detail = p.detail || p.error || ""; }
        } catch { /* ignore */ }
        throw new Error(detail || error.message || "Не вдалося запустити сорсинг");
      }
      return data as SourcingResult;
    },
    onSuccess: (res, args) => {
      qc.invalidateQueries({ queryKey: sourcedKey(args.vacancyId) });
      if (res.total === 0) {
        const noKeys = res.skipped.length > 0 && Object.keys(res.counts).length === 0;
        toast.info(noKeys ? "Джерела ще не підключені (немає API-ключів)" : "Профілів не знайдено");
      } else {
        toast.success(`Знайдено профілів: ${res.total}`);
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(error?.message || "Не вдалося запустити сорсинг");
    },
  });
}

/** Імпортувати знайдений профіль у базу кандидатів (ats_candidates) + злінкувати. */
export function useImportSourcedProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { vacancyId: string; profile: SourcedProfile }): Promise<string> => {
      const p = args.profile;
      const noteParts = [
        `Джерело сорсингу: ${p.provider}`,
        p.profile_url ? `Профіль: ${p.profile_url}` : "",
        p.skills.length ? `Навички: ${p.skills.join(", ")}` : "",
      ].filter(Boolean);
      const { data: created, error } = await supabase
        .from("ats_candidates")
        .insert({
          full_name: p.full_name || "Без імені",
          headline: p.title,
          current_company: p.company,
          location: p.location,
          linkedin_url: p.profile_url,
          notes: noteParts.join("\n"),
          resume_parsed: p.skills.length ? ({ skills: p.skills } as unknown as never) : null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const candidateId = (created as { id: string }).id;
      if (p.id) {
        await db.from("sourced_profiles").update({ candidate_id: candidateId }).eq("id", p.id);
      }
      return candidateId;
    },
    onSuccess: (_id, args) => {
      qc.invalidateQueries({ queryKey: sourcedKey(args.vacancyId) });
      qc.invalidateQueries({ queryKey: ["ats", "candidates"] });
      toast.success("Профіль додано в базу кандидатів");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(typeof error?.message === "string" ? error.message : "Не вдалося імпортувати профіль");
    },
  });
}
