// Дашборд кандидата: запити від компаній — запрошення на кейс (case_assignments)
// + запити на контакт/інтервʼю (candidate_requests) з діями прийняти/відхилити.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, FileText, MessageSquare, CalendarClock, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Req {
  id: string; company_name: string | null; type: string; message: string | null;
  proposed_at: string | null; status: string; created_at: string;
}
interface CaseInvite { id: string; title: string }

const typeMeta: Record<string, { label: string; icon: any }> = {
  contact: { label: "Запит на контакт", icon: MessageSquare },
  interview: { label: "Запрошення на інтервʼю", icon: CalendarClock },
  case: { label: "Запрошення виконати кейс", icon: FileText },
};

export const CandidateRequests = ({ userId, caseInvites }: { userId?: string | null; caseInvites: CaseInvite[] }) => {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const { data } = await (supabase as any)
        .from("candidate_requests")
        .select("id, company_name, type, message, proposed_at, status, created_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
      setReqs((data as Req[]) ?? []);
    } catch { setReqs([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [userId]);

  const respond = async (id: string, status: "accepted" | "declined") => {
    try {
      await (supabase as any).from("candidate_requests").update({ status }).eq("id", id);
      setReqs((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(status === "accepted" ? "Прийнято" : "Відхилено");
    } catch { toast.error("Не вдалось оновити"); }
  };

  const openReqs = reqs.filter((r) => r.status === "new");
  const total = openReqs.length + caseInvites.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />Запити від компаній
          {total > 0 && <Badge className="ml-1">{total}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Завантаження...</p>
        ) : total === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Поки немає запитів</p>
            <p className="text-xs mt-1">Тут зʼявлятимуться запрошення на кейси, контакт та інтервʼю</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Запрошення на кейси */}
            {caseInvites.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-muted-foreground">Запрошення виконати кейс</p>
                </div>
                <Button asChild size="sm"><Link to={`/v2/candidate/cases/${c.id}`}>Відкрити</Link></Button>
              </div>
            ))}
            {/* Контакт / інтервʼю */}
            {openReqs.map((r) => {
              const m = typeMeta[r.type] || typeMeta.contact;
              const Icon = m.icon;
              return (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.label}{r.company_name ? ` · ${r.company_name}` : ""}</p>
                    {r.message && <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>}
                    {r.proposed_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Пропонована дата: {new Date(r.proposed_at).toLocaleString("uk-UA")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Прийняти" onClick={() => respond(r.id, "accepted")}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Відхилити" onClick={() => respond(r.id, "declined")}>
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateRequests;
