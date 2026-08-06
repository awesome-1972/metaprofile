import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVacancies, type VacancyStatus } from "@/hooks/ats/use-vacancies";
import { useCreateApplication } from "@/hooks/ats/use-applications";

const OPEN_STATUSES: VacancyStatus[] = ["draft", "open", "on_hold"];

interface AddCandidateToVacancyDialogProps {
  candidateId: string;
  /** id вакансій, у яких кандидат уже є — не пропонуємо повторно. */
  existingVacancyIds?: string[];
}

/** Додати кандидата з пулу у відкриту вакансію (створює заявку на першій стадії). */
export function AddCandidateToVacancyDialog({ candidateId, existingVacancyIds = [] }: AddCandidateToVacancyDialogProps) {
  const [open, setOpen] = useState(false);
  const [vacancyId, setVacancyId] = useState<string>("");
  const { data: vacancies } = useVacancies();
  const createApplication = useCreateApplication();

  const existing = useMemo(() => new Set(existingVacancyIds), [existingVacancyIds]);
  const options = useMemo(
    () => (vacancies ?? []).filter((v) => OPEN_STATUSES.includes(v.status) && !existing.has(v.id)),
    [vacancies, existing],
  );

  const handleAdd = () => {
    if (!vacancyId) return;
    createApplication.mutate(
      { vacancy_id: vacancyId, candidate_id: candidateId, list_state: "long_list" } as never,
      {
        onSuccess: () => {
          setOpen(false);
          setVacancyId("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        Додати у вакансію
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Додати кандидата у вакансію</DialogTitle>
          <DialogDescription>Кандидат стане на першу стадію воронки обраної вакансії (лонг-лист).</DialogDescription>
        </DialogHeader>
        <Select value={vacancyId} onValueChange={setVacancyId}>
          <SelectTrigger>
            <SelectValue placeholder="Оберіть відкриту вакансію" />
          </SelectTrigger>
          <SelectContent>
            {options.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">Немає доступних відкритих вакансій</div>
            ) : (
              options.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.title}
                  {v.hiring_project?.client?.name ? ` · ${v.hiring_project.client.name}` : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Скасувати</Button>
          <Button onClick={handleAdd} disabled={!vacancyId || createApplication.isPending}>
            {createApplication.isPending ? "Додавання…" : "Додати"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
