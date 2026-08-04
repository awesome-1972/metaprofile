import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, ArrowRight } from "lucide-react";

interface Job {
  token: string;
  title: string;
  location: string | null;
  is_remote: boolean;
  work_style: string | null;
  published_at: string | null;
}

const styleLabel: Record<string, string> = {
  remote: "Віддалено",
  office: "В офісі",
  hybrid: "Гібрид",
};

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke("public-jobs", { body: {} });
      if (!active) return;
      if (error) { setState("error"); return; }
      setJobs(((data as { jobs?: Job[] })?.jobs ?? []));
      setState("ok");
    })();
    return () => { active = false; };
  }, []);

  const filtered = jobs.filter((j) => {
    if (!q.trim()) return true;
    const hay = `${j.title} ${j.location ?? ""}`.toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">MetaVision</span>
          <span className="text-xs text-muted-foreground">Відкриті вакансії</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Відкриті вакансії</h1>
          <p className="text-sm text-muted-foreground mt-1">Оберіть вакансію, щоб переглянути опис.</p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Пошук за назвою або локацією" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {state === "loading" && <p className="text-center text-muted-foreground py-20">Завантаження…</p>}
        {state === "error" && <p className="text-center text-destructive py-20">Сталася помилка. Спробуйте пізніше.</p>}

        {state === "ok" && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-lg font-medium">Наразі відкритих вакансій немає</p>
            <p className="text-sm text-muted-foreground mt-1">Завітайте пізніше.</p>
          </div>
        )}

        {state === "ok" && filtered.length > 0 && (
          <ul className="space-y-3">
            {filtered.map((job) => (
              <li key={job.token}>
                <Link
                  to={`/brief/${job.token}`}
                  className="group flex items-center justify-between gap-4 rounded-lg border bg-background p-4 hover:border-primary hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{job.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                      {(job.location || job.is_remote) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[job.location, job.is_remote ? "віддалено" : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                      {job.work_style && styleLabel[job.work_style] && (
                        <Badge variant="outline" className="text-[10px]">{styleLabel[job.work_style]}</Badge>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
