import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkuaDictionaries, usePublishToWorkua, useWorkuaAvailablePublications, type WorkuaDictItem } from "@/hooks/ats/use-workua";

interface WorkuaPublishDialogProps {
  vacancyId: string;
  isEdit: boolean; // якщо workua_job_id уже є
}

function Chips({ items, selected, onToggle, max }: { items: WorkuaDictItem[]; selected: string[]; onToggle: (id: string) => void; max: number }) {
  return (
    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
      {items.map((it) => {
        const on = selected.includes(it.id);
        const disabled = !on && selected.length >= max;
        return (
          <button
            key={it.id}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(it.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              on ? "bg-primary text-primary-foreground border-primary" : disabled ? "text-muted-foreground/40" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

export function WorkuaPublishDialog({ vacancyId, isEdit }: WorkuaPublishDialogProps) {
  const dicts = useWorkuaDictionaries();
  const publish = usePublishToWorkua();
  const balances = useWorkuaAvailablePublications();
  const [open, setOpen] = useState(false);

  const [regionId, setRegionId] = useState("");
  const [townFilter, setTownFilter] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [jobtypeIds, setJobtypeIds] = useState<string[]>([]);
  const [experienceId, setExperienceId] = useState("");
  const [educationId, setEducationId] = useState("");
  const [publication, setPublication] = useState("");
  const [salary, setSalary] = useState("");

  const d = dicts.data;
  const towns = useMemo(() => {
    const list = d?.town ?? [];
    if (!townFilter.trim()) return list.slice(0, 60);
    const q = townFilter.trim().toLowerCase();
    return list.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 60);
  }, [d, townFilter]);

  const openDialog = () => {
    setOpen(true);
    if (!dicts.data) dicts.mutate();
    if (!balances.data) balances.mutate();
  };

  const totalPublications = (balances.data ?? []).reduce((s, b) => s + b.total, 0);
  const balanceFor = (id: string) => balances.data?.find((b) => b.id === id)?.total ?? 0;

  const toggle = (arr: string[], set: (v: string[]) => void, id: string, max: number) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id));
    else if (arr.length < max) set([...arr, id]);
  };

  const handleSubmit = () => {
    publish.mutate(
      {
        vacancyId,
        region_id: regionId,
        category_ids: categoryIds,
        jobtype_ids: jobtypeIds,
        experience_id: experienceId,
        education_id: educationId || undefined,
        publication: publication || undefined,
        salary_value: salary ? Number(salary) : undefined,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  const canSubmit = regionId && categoryIds.length > 0 && jobtypeIds.length > 0 && experienceId;

  return (
    <>
      <Button size="sm" variant="outline" className="h-8" onClick={openDialog}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {isEdit ? "Оновити на work.ua" : "Опублікувати на work.ua"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Публікація на Work.ua</DialogTitle>
            <DialogDescription>Назва й опис беруться з вакансії. Оберіть параметри work.ua і тип публікації.</DialogDescription>
          </DialogHeader>

          {dicts.isPending ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Завантаження довідників…</div>
          ) : !d ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Не вдалося завантажити довідники work.ua</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Регіон *</Label>
                <Input className="h-8 text-sm" placeholder="Фільтр міста…" value={townFilter} onChange={(e) => setTownFilter(e.target.value)} />
                <Select value={regionId} onValueChange={setRegionId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Оберіть місто" /></SelectTrigger>
                  <SelectContent>
                    {towns.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Категорії * (до 3) {categoryIds.length > 0 && <Badge variant="outline" className="text-[10px] ml-1">{categoryIds.length}</Badge>}</Label>
                <Chips items={d.category} selected={categoryIds} onToggle={(id) => toggle(categoryIds, setCategoryIds, id, 3)} max={3} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Зайнятість * (до 3)</Label>
                <Chips items={d.jobtype} selected={jobtypeIds} onToggle={(id) => toggle(jobtypeIds, setJobtypeIds, id, 3)} max={3} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Досвід *</Label>
                  <Select value={experienceId} onValueChange={setExperienceId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{d.experience.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Освіта</Label>
                  <Select value={educationId} onValueChange={setEducationId}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Не важливо" /></SelectTrigger>
                    <SelectContent>{d.education.map((e) => <SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Зарплата (грн)</Label>
                  <Input className="h-8 text-sm" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="напр. 30000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Тип публікації</Label>
                  <Select value={publication} onValueChange={setPublication}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Чернетка (не публікувати)" /></SelectTrigger>
                    <SelectContent>{d.publication_type.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} · доступно: {balanceFor(p.id)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {publication && balanceFor(publication) === 0 && (
                <p className="text-xs text-destructive">
                  На акаунті немає куплених публікацій цього типу — вакансія створиться, але лишиться неактивною. Придбайте публікації на work.ua або оберіть інший тип.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Без типу публікації вакансія створюється як чернетка. З типом — активується й списується публікація відповідного пакета.
                {balances.data && ` Усього доступно публікацій: ${totalPublications}.`}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Скасувати</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || publish.isPending}>
              {publish.isPending ? "Публікація…" : isEdit ? "Оновити" : "Опублікувати"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
