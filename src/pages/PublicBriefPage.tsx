import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, MapPin } from "lucide-react";
import { openPrintableDocument } from "@/lib/ats/print-document";

interface BriefSection {
  heading: string;
  body: string;
}
interface PublicBriefData {
  brief: { title: string | null; intro: string | null; sections: BriefSection[] };
  position: { title: string; location: string | null; is_remote: boolean };
}

/** Простий рендер тексту секції: рядки з «- » / «• » → список, решта — абзаци. */
function renderBody(body: string) {
  const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];
  const flush = (key: number) => {
    if (bullets.length) {
      blocks.push(
        <ul key={`u${key}`} className="list-disc pl-5 space-y-1 my-2">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  lines.forEach((line, i) => {
    if (/^[-•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-•]\s+/, ""));
    } else {
      flush(i);
      blocks.push(
        <p key={`p${i}`} className="my-2 leading-relaxed">
          {line}
        </p>,
      );
    }
  });
  flush(lines.length);
  return blocks;
}

export default function PublicBriefPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicBriefData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) {
        setState("notfound");
        return;
      }
      const { data: res, error } = await supabase.functions.invoke("public-brief", { body: { token } });
      if (!active) return;
      if (error) {
        // 404 приходить як error з контекстом.
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx && ctx.status === 404) {
            setState("notfound");
            return;
          }
        } catch {
          /* ignore */
        }
        setState("error");
        return;
      }
      setData(res as PublicBriefData);
      setState("ok");
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const handlePrint = () => {
    if (!data) return;
    openPrintableDocument({
      title: data.brief.title || data.position.title,
      subtitle: "Бріф для кандидатів",
      intro: data.brief.intro || undefined,
      sections: data.brief.sections.filter((s) => s.heading?.trim() || s.body?.trim()),
    });
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">MetaVision</span>
          <span className="text-xs text-muted-foreground">Бріф для кандидатів</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {state === "loading" && <p className="text-center text-muted-foreground py-20">Завантаження…</p>}

        {state === "notfound" && (
          <div className="text-center py-20">
            <p className="text-lg font-medium">Посилання недоступне</p>
            <p className="text-sm text-muted-foreground mt-1">
              Можливо, бріф ще не опубліковано або посилання відкликано.
            </p>
          </div>
        )}

        {state === "error" && (
          <p className="text-center text-destructive py-20">Сталася помилка. Спробуйте пізніше.</p>
        )}

        {state === "ok" && data && (
          <article className="bg-background rounded-lg border p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <h1 className="text-2xl font-semibold">{data.brief.title || data.position.title}</h1>
                {(data.position.location || data.position.is_remote) && (
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[data.position.location, data.position.is_remote ? "віддалено" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Зберегти PDF
              </Button>
            </div>

            {data.brief.intro && (
              <div className="text-[15px] text-foreground/90 border-l-2 pl-4 my-4">
                {renderBody(data.brief.intro)}
              </div>
            )}

            {data.brief.sections.map((s, i) => (
              <section key={i} className="mt-6">
                {s.heading && <h2 className="text-lg font-semibold mb-1">{s.heading}</h2>}
                <div className="text-[15px] text-foreground/90">{renderBody(s.body)}</div>
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  );
}
