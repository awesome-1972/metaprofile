import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface ReportData {
  title: string;
  content_md: string;
  position: { title: string };
}

/** Простий рендер markdown: ## → h2/h3, «- » → списки, таблиці |..| , решта — абзаци. */
function renderMarkdown(md: string) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];
  let table: string[][] = [];
  const flushBullets = (k: number) => {
    if (bullets.length) {
      blocks.push(<ul key={`u${k}`} className="list-disc pl-6 space-y-1 my-2">{bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>);
      bullets = [];
    }
  };
  const flushTable = (k: number) => {
    if (table.length) {
      const rows = table.filter((r) => !r.every((c) => /^-+$/.test(c.trim())));
      blocks.push(
        <table key={`t${k}`} className="w-full text-sm my-3 border">
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} className="border-b">
                {r.map((c, ci) => (
                  <td key={ci} className={`border px-2 py-1 ${ri === 0 ? "font-medium bg-muted/40" : ""}`}>{c.trim()}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      table = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      flushBullets(i);
      table.push(line.slice(1, -1).split("|"));
      return;
    }
    flushTable(i);
    if (!line) { flushBullets(i); return; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushBullets(i);
      const lvl = h[1].length;
      const cls = lvl === 1 ? "text-xl font-semibold mt-6 mb-2" : lvl === 2 ? "text-lg font-semibold mt-5 mb-1" : "text-base font-semibold mt-4";
      blocks.push(<div key={`h${i}`} className={cls}>{h[2]}</div>);
      return;
    }
    if (/^[-*]\s+/.test(line)) { bullets.push(line.replace(/^[-*]\s+/, "")); return; }
    flushBullets(i);
    blocks.push(<p key={`p${i}`} className="my-2 leading-relaxed">{line}</p>);
  });
  flushBullets(lines.length);
  flushTable(lines.length);
  return blocks;
}

export default function PublicReportPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setState("notfound"); return; }
      const { data: res, error } = await supabase.functions.invoke("public-report", { body: { token } });
      if (!active) return;
      if (error) {
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && ctx.status === 404) { setState("notfound"); return; }
        } catch { /* ignore */ }
        setState("error");
        return;
      }
      setData(res as ReportData);
      setState("ok");
    })();
    return () => { active = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background print:hidden">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">MetaVision</span>
          <span className="text-xs text-muted-foreground">Висновок щодо кандидата</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {state === "loading" && <p className="text-center text-muted-foreground py-20">Завантаження…</p>}
        {state === "notfound" && (
          <div className="text-center py-20">
            <p className="text-lg font-medium">Звіт недоступний</p>
            <p className="text-sm text-muted-foreground mt-1">Можливо, доступ вимкнено або посилання застаріле.</p>
          </div>
        )}
        {state === "error" && <p className="text-center text-destructive py-20">Сталася помилка. Спробуйте пізніше.</p>}
        {state === "ok" && data && (
          <article className="bg-background rounded-lg border p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="text-xs text-muted-foreground">{data.position.title}</p>
              </div>
              <Button size="sm" variant="outline" className="print:hidden" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Зберегти PDF
              </Button>
            </div>
            <div className="text-[15px] text-foreground/90">{renderMarkdown(data.content_md)}</div>
          </article>
        )}
      </main>
    </div>
  );
}
