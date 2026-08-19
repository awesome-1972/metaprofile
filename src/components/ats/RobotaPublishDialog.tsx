import { useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRobotaDictionaries, usePublishToRobota, type RobotaDictItem } from "@/hooks/ats/use-robota";

interface RobotaPublishDialogProps {
  vacancyId: string;
  isEdit: boolean;
}

function Chips({ items, selected, onToggle }: { items: RobotaDictItem[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = selected.includes(it.id);
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
              on ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

export function RobotaPublishDialog({ vacancyId, isEdit }: RobotaPublishDialogProps) {
  const dicts = useRobotaDictionaries();
  const publish = usePublishToRobota();
  const [open, setOpen] = useState(false);

  const [cityId, setCityId] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [publishType, setPublishType] = useState("");
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [salary, setSalary] = useState("");
  const [forStudent, setForStudent] = useState(false);
  const [activate, setActivate] = useState(true);

  const d = dicts.data;
  const cities = useMemo(() => {
    const list = d?.city ?? [];
    if (!cityFilter.trim()) return list.slice(0, 60);
    const q = cityFilter.trim().toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 60);
  }, [d, cityFilter]);

  const openDialog = () => {
    setOpen(true);
    if (!dicts.data) dicts.mutate();
  };

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) => {
    if (arr.includes(id)) set(arr.filter((x) => x !== id));
    else set([...arr, id]);
  };

  const handleSubmit = () => {
    publish.mutate(
      {
        vacancyId,
        city_id: cityId,
        publish_type: publishType,
        employment_types: employmentTypes,
        work_types: workTypes,
        publish: activate,
        salary_value: salary ? Number(salary) : undefined,
        is_for_student: forStudent || undefined,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  const canSubmit = cityId && publishType;

  return (
    <>
      <Button size="sm" variant="outline" className="h-8" onClick={openDialog}>
        <Send className="h-3.5 w-3.5 mr-1.5" />
        {isEdit ? "Оновити на robota.ua" : "Опублікувати на robota.ua"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Публікація на Robota.ua</DialogTitle>
            <DialogDescription>Назва й опис беруться з вакансії (опис — від 150 символів). Оберіть місто й тип публікації.</DialogDescription>
          </DialogHeader>

          {dicts.isPending ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Завантаження довідників…</div>
          ) : !d ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Не вдалося завантажити довідники robota.ua</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Місто *</Label>
                <Input className="h-8 text-sm" placeholder="Фільтр міста…" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} />
                <Select value={cityId} onValueChange={setCityId}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Оберіть місто" /></SelectTrigger>
                  <SelectContent>
                    {cities.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Тип публікації *</Label>
                  <Select value={publishType} onValueChange={setPublishType}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>{d.publication_type.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Зарплата (грн)</Label>
                  <Input className="h-8 text-sm" type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="напр. 30000" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Зайнятість {employmentTypes.length > 0 && <Badge variant="outline" className="text-[10px] ml-1">{employmentTypes.length}</Badge>}</Label>
                <Chips items={d.employment_type} selected={employmentTypes} onToggle={(id) => toggle(employmentTypes, setEmploymentTypes, id)} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Характер роботи</Label>
                <Chips items={d.work_type} selected={workTypes} onToggle={(id) => toggle(workTypes, setWorkTypes, id)} />
              </div>

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={forStudent} onCheckedChange={(v) => setForStudent(!!v)} />
                Розглянемо студентів / без досвіду
              </label>

              <label className="flex items-center gap-2 text-sm cursor-pointer border-t pt-3">
                <Checkbox checked={activate} onCheckedChange={(v) => setActivate(!!v)} />
                Опублікувати одразу (списується публікація «{d.publication_type.find((p) => p.id === publishType)?.name ?? "—"}»). Без галочки — чернетка.
              </label>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Скасувати</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || publish.isPending}>
              {publish.isPending ? "Публікація…" : activate ? (isEdit ? "Оновити й опублікувати" : "Опублікувати") : "Зберегти чернетку"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
