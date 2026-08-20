import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Target, GitBranch, Star, Users } from "lucide-react";

interface IndustryShare { name: string; share: number }
interface Strategy {
  focus: string; industries: IndustryShare[]; target_companies: string[];
  target_titles: string[]; profile_musts: string[]; out_of_scope: string; notes: string;
}
interface Progress { stages: { name: string; count: number }[]; long_list: number; short_list: number; total: number }
interface ShortItem { name: string; title: string; location: string; report: string | null; summary: string | null }
interface LongItem { label: string; title: string; location: string; experience: string }
interface PortalData {
  vacancy: { title: string; location: string | null; is_remote: boolean };
  sections: { strategy?: Strategy; progress?: Progress; shortlist?: ShortItem[]; longlist?: LongItem[] };
}

/** Дуже простий рендер тексту: рядки-переліки (•/-) у список, решта — абзаци, з інлайн-жирним. */
function renderInline(text: string): (string | JSX.Element)[] {
  const out: (string | JSX.Element)[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, key = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(<strong key={key++}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.length ? out : [text];
}
function TextBlock({ text }: { text: string }) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks: JSX.Element[] = [];
  let bullets: string[] = [];
  const flush = (k: number) => {
    if (bullets.length) { blocks.push(<ul key={`u${k}`} className="list-disc pl-5 space-y-1 my-1.5">{bullets.map((b, i) => <li key={i}>{renderInline(b)}</li>)}</ul>); bullets = []; }
  };
  lines.forEach((l, i) => {
    if (/^[•\-*]\s+/.test(l) || /^\d+\.\s+/.test(l)) bullets.push(l.replace(/^[•\-*]\s+/, "").replace(/^\d+\.\s+/, ""));
    else { flush(i); blocks.push(<p key={`p${i}`} className="my-1.5 leading-relaxed">{renderInline(l)}</p>); }
  });
  flush(lines.length);
  return <div className="text-[15px] text-foreground/90">{blocks}</div>;
}

function Chips({ items }: { items: string[] }) {
  return <div className="flex flex-wrap gap-1.5">{items.map((c, i) => <span key={i} className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs">{c}</span>)}</div>;
}

export default function ClientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "notfound" | "error">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      if (!token) { setState("notfound"); return; }
      const { data: res, error } = await supabase.functions.invoke("public-client-portal", { body: { token } });
      if (!active) return;
      if (error) {
        const ctx = (error as { context?: Response }).context;
        if (ctx && ctx.status === 404) { setState("notfound"); return; }
        setState("error"); return;
      }
      setData(res as PortalData);
      setState("ok");
    })();
    return () => { active = false; };
  }, [token]);

  const s = data?.sections;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">MetaVision Consulting</span>
          <span className="text-xs text-muted-foreground">Портал клієнта</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {state === "loading" && <p className="text-center text-muted-foreground py-20">Завантаження…</p>}
        {state === "notfound" && (
          <div className="text-center py-20">
            <p className="text-lg font-medium">Посилання недоступне</p>
            <p className="text-sm text-muted-foreground mt-1">Можливо, доступ ще не відкрито або посилання відкликано.</p>
          </div>
        )}
        {state === "error" && <p className="text-center text-destructive py-20">Сталася помилка. Спробуйте пізніше.</p>}

        {state === "ok" && data && (
          <>
            <div>
              <h1 className="text-2xl font-semibold">{data.vacancy.title}</h1>
              {(data.vacancy.location || data.vacancy.is_remote) && (
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {[data.vacancy.location, data.vacancy.is_remote ? "віддалено" : null].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {s?.progress && (
              <section className="bg-background rounded-lg border p-6">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-3"><GitBranch className="h-4 w-4" /> Прогрес пошуку</h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="rounded-md border px-3 py-2 text-sm"><span className="text-muted-foreground">Лонг-лист: </span><b>{s.progress.long_list}</b></div>
                  <div className="rounded-md border px-3 py-2 text-sm"><span className="text-muted-foreground">Шорт-лист: </span><b>{s.progress.short_list}</b></div>
                  <div className="rounded-md border px-3 py-2 text-sm"><span className="text-muted-foreground">Усього в роботі: </span><b>{s.progress.total}</b></div>
                </div>
                <div className="space-y-1.5">
                  {s.progress.stages.map((st, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-48 shrink-0 text-muted-foreground truncate">{st.name}</span>
                      <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, st.count * 12)}%` }} />
                      </div>
                      <span className="w-8 text-right font-medium">{st.count}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {s?.strategy && (
              <section className="bg-background rounded-lg border p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Стратегія пошуку</h2>
                {s.strategy.focus && <TextBlock text={s.strategy.focus} />}
                {s.strategy.industries.length > 0 && (
                  <div><div className="text-sm font-medium mb-1">Галузі-джерела</div><Chips items={s.strategy.industries.map((i) => `${i.name}${i.share ? ` — ${i.share}%` : ""}`)} /></div>
                )}
                {s.strategy.target_companies.length > 0 && (
                  <div><div className="text-sm font-medium mb-1">Цільові компанії</div><Chips items={s.strategy.target_companies} /></div>
                )}
                {s.strategy.target_titles.length > 0 && (
                  <div><div className="text-sm font-medium mb-1">Цільові посади</div><Chips items={s.strategy.target_titles} /></div>
                )}
                {s.strategy.profile_musts.length > 0 && (
                  <div><div className="text-sm font-medium mb-1">Що важливо у профілі</div><ul className="list-disc pl-5 text-[15px] text-foreground/90 space-y-1">{s.strategy.profile_musts.map((m, i) => <li key={i}>{m}</li>)}</ul></div>
                )}
                {s.strategy.out_of_scope && <div><div className="text-sm font-medium mb-1">Поза скоупом</div><TextBlock text={s.strategy.out_of_scope} /></div>}
                {s.strategy.notes && <div><div className="text-sm font-medium mb-1">Логіка воронки</div><TextBlock text={s.strategy.notes} /></div>}
              </section>
            )}

            {s?.shortlist && s.shortlist.length > 0 && (
              <section className="bg-background rounded-lg border p-6 space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Star className="h-4 w-4" /> Шорт-лист кандидатів</h2>
                {s.shortlist.map((c, i) => (
                  <div key={i} className="border rounded-md p-4">
                    <div className="font-medium">{c.name}{c.title ? <span className="text-muted-foreground"> · {c.title}</span> : ""}</div>
                    {c.location && <div className="text-xs text-muted-foreground">{c.location}</div>}
                    {c.report ? <div className="mt-2"><TextBlock text={c.report} /></div>
                      : c.summary ? <div className="mt-2"><TextBlock text={c.summary} /></div> : null}
                  </div>
                ))}
              </section>
            )}

            {s?.longlist && s.longlist.length > 0 && (
              <section className="bg-background rounded-lg border p-6 space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Лонг-лист (досвід)</h2>
                <p className="text-xs text-muted-foreground">Знеособлений перелік досвіду кандидатів у роботі. Без приміток рекрутера й контактів.</p>
                {s.longlist.map((c, i) => (
                  <div key={i} className="border rounded-md p-4">
                    <div className="font-medium text-sm">{c.label}{c.title ? <span className="text-muted-foreground"> · {c.title}</span> : ""}</div>
                    {c.location && <div className="text-xs text-muted-foreground">{c.location}</div>}
                    {c.experience && <div className="mt-1.5"><TextBlock text={c.experience} /></div>}
                  </div>
                ))}
              </section>
            )}

            {!s?.progress && !s?.strategy && !s?.shortlist && !s?.longlist && (
              <p className="text-center text-muted-foreground py-12">Розділи для показу ще не увімкнено.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
