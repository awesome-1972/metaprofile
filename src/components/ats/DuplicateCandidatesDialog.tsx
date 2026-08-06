import { useMemo, useState } from "react";
import { Merge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMergeCandidates } from "@/hooks/ats/use-candidates";

interface Candidate {
  id: string;
  full_name: string;
  email: string | null;
  applications_refs: { id: string }[];
}
interface DupGroup {
  key: string;
  reason: "email" | "name";
  members: Candidate[];
}

interface DuplicateCandidatesDialogProps {
  candidates: Candidate[];
}

function normName(s: string | null): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findGroups(list: Candidate[]): DupGroup[] {
  const byEmail = new Map<string, Candidate[]>();
  const byName = new Map<string, Candidate[]>();
  for (const c of list) {
    if (c.email && c.email.trim()) {
      const k = c.email.trim().toLowerCase();
      byEmail.set(k, [...(byEmail.get(k) ?? []), c]);
    }
    const n = normName(c.full_name);
    if (n) byName.set(n, [...(byName.get(n) ?? []), c]);
  }
  const groups: DupGroup[] = [];
  for (const [k, members] of byEmail) if (members.length > 1) groups.push({ key: `e:${k}`, reason: "email", members });
  for (const [k, members] of byName) {
    if (members.length > 1) {
      // не дублюємо групу, якщо ті самі люди вже згруповані за email
      const ids = new Set(members.map((m) => m.id));
      const covered = groups.some((g) => g.members.length === members.length && g.members.every((m) => ids.has(m.id)));
      if (!covered) groups.push({ key: `n:${k}`, reason: "name", members });
    }
  }
  return groups;
}

export function DuplicateCandidatesDialog({ candidates }: DuplicateCandidatesDialogProps) {
  const [open, setOpen] = useState(false);
  const merge = useMergeCandidates();
  const [primaryByGroup, setPrimaryByGroup] = useState<Record<string, string>>({});

  const groups = useMemo(() => findGroups(candidates), [candidates]);

  const handleMerge = async (group: DupGroup) => {
    const primaryId = primaryByGroup[group.key] ?? group.members[0].id;
    const dups = group.members.filter((m) => m.id !== primaryId);
    for (const d of dups) {
      await merge.mutateAsync({ primaryId, duplicateId: d.id });
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={groups.length === 0}>
        <Merge className="h-4 w-4 mr-1.5" />
        Дублікати{groups.length > 0 ? ` (${groups.length})` : ""}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Можливі дублікати кандидатів</DialogTitle>
            <DialogDescription>
              Оберіть, який запис лишити основним — решту буде злито в нього (заявки, комунікації, теги й поля перенесуться).
            </DialogDescription>
          </DialogHeader>

          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Дублікатів не знайдено</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => {
                const primaryId = primaryByGroup[group.key] ?? group.members[0].id;
                return (
                  <div key={group.key} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {group.reason === "email" ? "Однаковий email" : "Однакове ПІБ"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{group.members.length} записи</span>
                    </div>
                    <div className="space-y-1">
                      {group.members.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-1.5 py-1 hover:bg-accent">
                          <input
                            type="radio"
                            name={`primary-${group.key}`}
                            checked={primaryId === m.id}
                            onChange={() => setPrimaryByGroup((prev) => ({ ...prev, [group.key]: m.id }))}
                          />
                          <span className="font-medium">{m.full_name}</span>
                          {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                          <span className="text-[11px] text-muted-foreground ml-auto">
                            {m.applications_refs.length} заявок
                          </span>
                        </label>
                      ))}
                    </div>
                    <Button size="sm" onClick={() => handleMerge(group)} disabled={merge.isPending}>
                      {merge.isPending ? "Об'єднання…" : "Об'єднати в основний"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
