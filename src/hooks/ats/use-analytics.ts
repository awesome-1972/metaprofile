import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SourceStat { source: string; total: number; hired: number; conversion: number }
export interface NamedCount { name: string; count: number }

export interface RecruitingAnalytics {
  totalApplications: number;
  statusCounts: Record<string, number>;
  hired: number;
  activePipeline: number;
  byListState: Record<string, number>;
  sources: SourceStat[];
  offers: { total: number; accepted: number; declined: number; sent: number; acceptanceRate: number | null };
  avgTimeToHireDays: number | null;
  rejectionReasons: NamedCount[];
  match: { avg: number | null; count: number };
}

const NO_SOURCE = "Без джерела";

/** Агрегати рекрутменту по всіх доступних даних (RLS обмежує scope). */
export function useRecruitingAnalytics() {
  return useQuery({
    queryKey: ["ats", "analytics"],
    queryFn: async (): Promise<RecruitingAnalytics> => {
      const [appsRes, offersRes, rejRes, matchRes] = await Promise.all([
        supabase.from("applications").select("id, status, list_state, candidate:ats_candidates(source:candidate_sources(name))").limit(10000),
        supabase.from("offers").select("id, status, responded_at, application:applications(created_at)").limit(10000),
        supabase.from("rejections").select("id, reason:rejection_reasons(label)").limit(10000),
        supabase.from("vacancy_candidate_matches").select("score").limit(10000),
      ]);
      if (appsRes.error) throw appsRes.error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apps = (appsRes.data ?? []) as any[];
      const statusCounts: Record<string, number> = {};
      const byListState: Record<string, number> = {};
      const srcMap = new Map<string, { total: number; hired: number }>();
      for (const a of apps) {
        statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
        if (a.status === "active") byListState[a.list_state] = (byListState[a.list_state] ?? 0) + 1;
        const src = a.candidate?.source?.name ?? NO_SOURCE;
        const cur = srcMap.get(src) ?? { total: 0, hired: 0 };
        cur.total += 1;
        if (a.status === "hired") cur.hired += 1;
        srcMap.set(src, cur);
      }
      const sources: SourceStat[] = [...srcMap.entries()]
        .map(([source, v]) => ({ source, total: v.total, hired: v.hired, conversion: v.total ? Math.round((v.hired / v.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const offers = (offersRes.data ?? []) as any[];
      let accepted = 0, declined = 0, sent = 0;
      const tthDays: number[] = [];
      for (const o of offers) {
        if (o.status === "accepted") accepted += 1;
        else if (o.status === "declined") declined += 1;
        else if (o.status === "sent") sent += 1;
        if (o.status === "accepted" && o.responded_at && o.application?.created_at) {
          const d = (new Date(o.responded_at).getTime() - new Date(o.application.created_at).getTime()) / 86_400_000;
          if (d >= 0 && d < 3650) tthDays.push(d);
        }
      }
      const responded = accepted + declined;
      const acceptanceRate = responded > 0 ? Math.round((accepted / responded) * 100) : null;
      const avgTimeToHireDays = tthDays.length ? Math.round(tthDays.reduce((s, x) => s + x, 0) / tthDays.length) : null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rejections = (rejRes.data ?? []) as any[];
      const rejMap = new Map<string, number>();
      for (const r of rejections) {
        const label = r.reason?.label ?? "Інше";
        rejMap.set(label, (rejMap.get(label) ?? 0) + 1);
      }
      const rejectionReasons: NamedCount[] = [...rejMap.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matches = (matchRes.data ?? []) as any[];
      const scores = matches.map((m) => m.score as number).filter((s) => typeof s === "number");
      const match = { avg: scores.length ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length) : null, count: scores.length };

      return {
        totalApplications: apps.length,
        statusCounts,
        hired: statusCounts.hired ?? 0,
        activePipeline: statusCounts.active ?? 0,
        byListState,
        sources,
        offers: { total: offers.length, accepted, declined, sent, acceptanceRate },
        avgTimeToHireDays,
        rejectionReasons,
        match,
      };
    },
    staleTime: 60_000,
  });
}
