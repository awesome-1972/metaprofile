// src/components/ats/CompetenciesTab.tsx
//
// Вкладка "Компетенції" — редактор матриці: групи (name + вага) і компетенції
// (назва, name_en, питання списком, вага, порядок). CRUD через use-competencies.ts.
// Кнопка "Створити стандартну структуру" сідить 4 групи Додатку A (по 25%) без
// компетенцій — рекрутер додає компетенції в кожну групу вручну.
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  useVacancyCompetencies,
  groupCompetencies,
  useCreateCompetency,
  useUpdateCompetency,
  useDeleteCompetency,
  STANDARD_COMPETENCY_GROUPS,
  type VacancyCompetency,
} from "@/hooks/ats/use-competencies";

interface CompetenciesTabProps {
  vacancyId: string;
}

interface CompetencyFormState {
  id: string | null;
  groupName: string;
  groupWeight: string;
  name: string;
  nameEn: string;
  questionsText: string;
  weight: string;
  position: string;
}

const emptyForm = (groupName = "", groupWeight = "0.25"): CompetencyFormState => ({
  id: null,
  groupName,
  groupWeight,
  name: "",
  nameEn: "",
  questionsText: "",
  weight: "0.20",
  position: "0",
});

export function CompetenciesTab({ vacancyId }: CompetenciesTabProps) {
  const { data: competencies, isLoading } = useVacancyCompetencies(vacancyId);
  const createCompetency = useCreateCompetency();
  const updateCompetency = useUpdateCompetency();
  const deleteCompetency = useDeleteCompetency();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CompetencyFormState>(emptyForm());
  const [localExtraGroups, setLocalExtraGroups] = useState<{ groupName: string; groupWeight: number }[]>([]);

  const groups = useMemo(() => groupCompetencies(competencies ?? []), [competencies]);

  const displayGroups = useMemo(() => {
    const existingNames = new Set(groups.map((g) => g.groupName));
    const extra = localExtraGroups
      .filter((g) => !existingNames.has(g.groupName))
      .map((g) => ({ groupName: g.groupName, groupWeight: g.groupWeight, competencies: [] as VacancyCompetency[] }));
    return [...groups, ...extra];
  }, [groups, localExtraGroups]);

  const handleSeedStandard = () => {
    setLocalExtraGroups(STANDARD_COMPETENCY_GROUPS);
  };

  const openCreateDialog = (groupName?: string, groupWeight?: number) => {
    setForm(emptyForm(groupName ?? "", groupWeight !== undefined ? String(groupWeight) : "0.25"));
    setDialogOpen(true);
  };

  const openEditDialog = (c: VacancyCompetency) => {
    const questions = Array.isArray(c.questions) ? (c.questions as unknown[]).map(String) : [];
    setForm({
      id: c.id,
      groupName: c.group_name,
      groupWeight: String(c.group_weight),
      name: c.name,
      nameEn: c.name_en ?? "",
      questionsText: questions.join("\n"),
      weight: String(c.weight),
      position: String(c.position),
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const groupWeight = Number(form.groupWeight);
    const weight = Number(form.weight);
    const position = Number(form.position) || 0;
    const questions = form.questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (!form.groupName.trim() || !form.name.trim() || !Number.isFinite(groupWeight) || !Number.isFinite(weight)) {
      return;
    }

    if (form.id) {
      updateCompetency.mutate(
        {
          id: form.id,
          vacancyId,
          patch: {
            group_name: form.groupName.trim(),
            group_weight: groupWeight,
            name: form.name.trim(),
            name_en: form.nameEn.trim() || null,
            questions,
            weight,
            position,
          },
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createCompetency.mutate(
        {
          vacancy_id: vacancyId,
          group_name: form.groupName.trim(),
          group_weight: groupWeight,
          name: form.name.trim(),
          name_en: form.nameEn.trim() || null,
          questions,
          weight,
          position,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  const handleDelete = (id: string) => {
    deleteCompetency.mutate({ id, vacancyId });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Завантаження матриці компетенцій...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Матриця компетенцій вакансії (групи з вагами, компетенції з питаннями для інтерв'ю)
        </h3>
        <div className="flex gap-2">
          {(competencies ?? []).length === 0 && displayGroups.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedStandard}>
              <Sparkles className="h-4 w-4 mr-2" />
              Створити стандартну структуру
            </Button>
          )}
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Додати компетенцію
          </Button>
        </div>
      </div>

      {displayGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Матриця компетенцій ще не налаштована. Створіть стандартну структуру (4 групи по 25%) або додайте компетенцію вручну.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {displayGroups.map((group) => (
            <Card key={group.groupName}>
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  {group.groupName} <Badge variant="outline">{Math.round(group.groupWeight * 100)}%</Badge>
                </CardTitle>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => openCreateDialog(group.groupName, group.groupWeight)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Компетенція
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.competencies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Немає компетенцій у цій групі</p>
                ) : (
                  group.competencies
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((c) => {
                      const questions = Array.isArray(c.questions) ? (c.questions as unknown[]) : [];
                      return (
                        <div key={c.id} className="flex items-start justify-between gap-2 border rounded-md p-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">
                              {c.name}
                              {c.name_en ? <span className="text-muted-foreground"> / {c.name_en}</span> : ""}
                              <span className="text-xs text-muted-foreground ml-2">вага {c.weight}</span>
                            </div>
                            {questions.length > 0 && (
                              <ul className="text-xs text-muted-foreground list-disc pl-4 mt-1 space-y-0.5">
                                {questions.map((q, idx) => (
                                  <li key={idx}>{String(q)}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDialog(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Редагувати компетенцію" : "Нова компетенція"}</DialogTitle>
            <DialogDescription>Компетенція належить групі з певною вагою (0–1)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Назва групи *</Label>
                <Input value={form.groupName} onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Вага групи (0–1) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.groupWeight}
                  onChange={(e) => setForm((f) => ({ ...f, groupWeight: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Назва компетенції (укр) *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Назва компетенції (англ)</Label>
              <Input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Питання для інтерв'ю (по одному на рядок)</Label>
              <Textarea
                value={form.questionsText}
                onChange={(e) => setForm((f) => ({ ...f, questionsText: e.target.value }))}
                className="min-h-[90px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Вага компетенції (0–1) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Порядок</Label>
                <Input
                  type="number"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit} disabled={createCompetency.isPending || updateCompetency.isPending}>
              {createCompetency.isPending || updateCompetency.isPending ? "Збереження..." : "Зберегти"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
