// Пікер спільного довідника компетенцій (майстер — studio) для матриці вакансії.
// Тягне майстер через Edge `competency-master` і дозволяє обрати компетенції, щоб
// не набирати вручну. Обрані повертає через onApply — CompetenciesTab створює
// відповідні рядки матриці.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export interface MasterComp {
  code: string | null; name: string; definition: string; category: string | null;
  indicators: { scope: string | null; description: string }[];
}

export function MasterLibraryPicker({
  open, onOpenChange, onApply,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (comps: MasterComp[]) => Promise<void> | void;
}) {
  const [state, setState] = useState<"loading" | "idle" | "error">("loading");
  const [err, setErr] = useState("");
  const [comps, setComps] = useState<MasterComp[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState("loading"); setSel(new Set()); setErr("");
    supabase.functions.invoke("competency-master", { body: {} }).then(({ data, error }) => {
      const b = data as { categories?: { id: string; name: string }[]; competencies?: unknown[]; error?: string } | null;
      if (error || !b || b.error) { setErr(b?.error || error?.message || "fetch_failed"); setState("error"); return; }
      const catById = new Map((b.categories ?? []).map((c) => [c.id, c.name]));
      const cm: MasterComp[] = (b.competencies ?? []).map((raw) => {
        const c = raw as { code: string | null; name: string; definition?: string; categoryId?: string | null; indicators?: { scope: string | null; description?: string; label?: string }[] };
        return {
          code: c.code ?? null, name: c.name, definition: c.definition ?? "",
          category: c.categoryId ? (catById.get(c.categoryId) ?? null) : null,
          indicators: (c.indicators ?? []).map((i) => ({ scope: i.scope ?? null, description: i.description || i.label || "" })),
        };
      });
      setComps(cm); setState("idle");
    }).catch((e) => { setErr(String(e)); setState("error"); });
  }, [open]);

  const key = (c: MasterComp) => c.code || c.name;
  const toggle = (c: MasterComp) => setSel((s) => { const n = new Set(s); const k = key(c); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const grouped = useMemo(() => {
    const m = new Map<string, MasterComp[]>();
    for (const c of comps) { const g = c.category ?? "Без категорії"; const a = m.get(g) ?? []; a.push(c); m.set(g, a); }
    return Array.from(m.entries());
  }, [comps]);

  const apply = async () => {
    setApplying(true);
    try { await onApply(comps.filter((c) => sel.has(key(c)))); onOpenChange(false); }
    finally { setApplying(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Додати з бібліотеки компетенцій</DialogTitle>
          <DialogDescription>Оберіть компетенції зі спільного довідника — вони додадуться в матрицю вакансії (групою за категорією). Питання й ваги відредагуєте після.</DialogDescription>
        </DialogHeader>

        {state === "loading" ? (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
        ) : state === "error" ? (
          <div className="py-8 text-center space-y-1">
            <p className="text-sm text-destructive">Не вдалося завантажити довідник.</p>
            <p className="text-xs text-muted-foreground">{err}</p>
          </div>
        ) : comps.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Довідник порожній.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([cat, list]) => (
              <div key={cat}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{cat}</p>
                <div className="space-y-1">
                  {list.map((c) => (
                    <label key={key(c)} className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40">
                      <Checkbox checked={sel.has(key(c))} onCheckedChange={() => toggle(c)} className="mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{c.name}{c.code && <span className="text-xs text-muted-foreground ml-2 font-mono">{c.code}</span>}</div>
                        {c.definition && <p className="text-xs text-muted-foreground">{c.definition}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Скасувати</Button>
          <Button onClick={apply} disabled={applying || sel.size === 0}>
            {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Додати обрані ({sel.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
