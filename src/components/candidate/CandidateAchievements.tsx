// Живий профіль: стрічка верифікованих досягнень + індикатор актуальності.
// Читає candidate_skill_evidence (наповнюється тригерами при виконанні кейсів тощо).
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, FileCheck2, GraduationCap, Target, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Evidence {
  id: string; kind: string; title: string; detail: string | null;
  score: number | null; evidenced_at: string;
}

const kindMeta: Record<string, { label: string; icon: any }> = {
  case_completed: { label: "Кейс виконано", icon: FileCheck2 },
  course_completed: { label: "Курс завершено", icon: GraduationCap },
  assessment: { label: "Оцінювання", icon: Target },
  skill_verified: { label: "Навичку підтверджено", icon: Award },
};

function freshness(dateStr?: string): { label: string; tone: string } {
  if (!dateStr) return { label: "ще без активності", tone: "text-muted-foreground" };
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (days <= 14) return { label: "профіль актуальний", tone: "text-emerald-600" };
  if (days <= 60) return { label: `оновлено ${days} дн. тому`, tone: "text-amber-600" };
  return { label: `давно без активності (${days} дн.)`, tone: "text-muted-foreground" };
}

export const CandidateAchievements = ({ userId }: { userId?: string | null }) => {
  const [items, setItems] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("candidate_skill_evidence")
          .select("id, kind, title, detail, score, evidenced_at")
          .eq("user_id", userId)
          .order("evidenced_at", { ascending: false })
          .limit(30);
        setItems((data as Evidence[]) ?? []);
      } catch { setItems([]); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const fresh = freshness(items[0]?.evidenced_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" />Досягнення</CardTitle>
        <CardDescription className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span className={fresh.tone}>{fresh.label}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Завантаження...</p>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            <FileCheck2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Профіль поки статичний</p>
            <p className="text-xs mt-1">Виконуйте кейси та навчання — досягнення з датами зʼявлятимуться тут і робитимуть профіль «живим»</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((e) => {
              const m = kindMeta[e.kind] || kindMeta.skill_verified;
              const Icon = m.icon;
              return (
                <div key={e.id} className="flex items-start gap-3">
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.label}{e.detail ? ` · ${e.detail}` : ""}
                      {e.score != null ? ` · ${e.score}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(e.evidenced_at).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateAchievements;
