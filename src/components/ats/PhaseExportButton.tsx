import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { buildAndDownloadPhaseXlsx, type PhaseExportRow } from "@/lib/phase-export";

interface AppLite {
  candidate_id: string;
  status: string;
  list_state: string | null;
  candidate: { full_name: string | null } | null;
}

interface PhaseExportButtonProps {
  vacancyTitle: string;
  phaseName: string;
  applications: AppLite[];
}

interface CandidateDetail {
  id: string;
  full_name: string | null;
  messengers: Record<string, unknown> | null;
  resume_parsed: Record<string, unknown> | null;
}

interface ParsedPosition {
  title?: string | null;
  company?: string | null;
  from?: string | null;
  to?: string | null;
}

/** Наш стан заявки → статус зі зразкового списку (префіл; редагується в Excel). */
function statusFromApp(app: AppLite): string {
  if (app.status === "rejected") return "Відмова агенції";
  if (app.list_state === "short_list") return "Шорт лист";
  return "Розглядається";
}

function socialsFromMessengers(m: Record<string, unknown> | null): string {
  if (!m) return "";
  const labels: Record<string, string> = {
    linkedin: "LinkedIn",
    telegram: "Telegram",
    viber: "Viber",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
  };
  const parts: string[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const val = m[key];
    if (typeof val === "string" && val.trim()) parts.push(`${label}: ${val.trim()}`);
  }
  return parts.join("\n");
}

function positionsOf(rp: Record<string, unknown> | null): ParsedPosition[] {
  if (!rp) return [];
  const p = (rp as { positions?: unknown }).positions;
  return Array.isArray(p) ? (p as ParsedPosition[]) : [];
}

function experienceText(positions: ParsedPosition[]): string {
  return positions
    .slice(0, 8)
    .map((p) => {
      const head = [p.title, p.company].filter(Boolean).join(" — ");
      const dates = [p.from, p.to].filter(Boolean).join(" – ");
      return `• ${head}${dates ? ` · ${dates}` : ""}`;
    })
    .join("\n");
}

export function PhaseExportButton({ vacancyTitle, phaseName, applications }: PhaseExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (applications.length === 0) {
      toast.info("На цьому етапі немає кандидатів для експорту");
      return;
    }
    setBusy(true);
    try {
      const ids = Array.from(new Set(applications.map((a) => a.candidate_id)));
      const { data, error } = await supabase
        .from("ats_candidates")
        .select("id, full_name, messengers, resume_parsed")
        .in("id", ids);
      if (error) throw error;
      const byId = new Map<string, CandidateDetail>();
      for (const c of (data ?? []) as CandidateDetail[]) byId.set(c.id, c);

      const rows: PhaseExportRow[] = applications.map((app) => {
        const det = byId.get(app.candidate_id);
        const positions = positionsOf(det?.resume_parsed ?? null);
        const first = positions[0] ?? {};
        const positionText = [first.title, first.from || first.to ? `· ${[first.from, first.to].filter(Boolean).join(" – ")}` : ""]
          .filter(Boolean)
          .join(" ");
        return {
          company: first.company ?? "",
          fullName: det?.full_name ?? app.candidate?.full_name ?? "",
          position: positionText,
          category: "",
          experience: experienceText(positions),
          socials: socialsFromMessengers(det?.messengers ?? null),
          status: statusFromApp(app),
        };
      });

      await buildAndDownloadPhaseXlsx(phaseName, vacancyTitle, rows);
      toast.success(`Експортовано ${rows.length} кандидат(ів)`);
    } catch (err) {
      toast.error((err as Error).message || "Не вдалося сформувати Excel");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleExport} disabled={busy}>
      <FileDown className="h-3.5 w-3.5 mr-1.5" />
      {busy ? "Формування..." : "Експорт в Excel"}
    </Button>
  );
}
