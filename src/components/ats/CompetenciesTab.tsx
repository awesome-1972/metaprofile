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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Pencil, Trash2, Sparkles, ShieldAlert, FileStack, Wand2, Save, Loader2 } from "lucide-react";
import {
  useVacancyCompetencies,
  groupCompetencies,
  useCreateCompetency,
  useUpdateCompetency,
  useDeleteCompetency,
  useSeedCompetencyTemplate,
  toStringList,
  toRubric,
  STANDARD_COMPETENCY_GROUPS,
  type VacancyCompetency,
} from "@/hooks/ats/use-competencies";
import {
  useCustomCompetencyTemplates,
  useSaveCompetencyTemplate,
  useDeleteCompetencyTemplate,
  useSeedCompetencyGroups,
  useGenerateCompetencies,
  type TemplateGroup,
} from "@/hooks/ats/use-competency-templates";
import { COMPETENCY_TEMPLATES } from "@/lib/ats/competency-templates";
import { useVacancy, useUpdateVacancy } from "@/hooks/ats/use-vacancies";
import { toCompetencyScale } from "@/lib/ats/competency-scale";

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
  probesText: string;
  redFlagsText: string;
  rubric1: string;
  rubric2: string;
  rubric3: string;
  isMustHave: boolean;
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
  probesText: "",
  redFlagsText: "",
  rubric1: "",
  rubric2: "",
  rubric3: "",
  isMustHave: false,
  weight: "0.20",
  position: "0",
});

export function CompetenciesTab({ vacancyId }: CompetenciesTabProps) {
  const { data: competencies, isLoading } = useVacancyCompetencies(vacancyId);
  const createCompetency = useCreateCompetency();
  const updateCompetency = useUpdateCompetency();
  const deleteCompetency = useDeleteCompetency();
  const seedTemplate = useSeedCompetencyTemplate();
  const seedGroups = useSeedCompetencyGroups();
  const { data: customTemplates } = useCustomCompetencyTemplates();
  const saveTemplate = useSaveCompetencyTemplate();
  const deleteTemplate = useDeleteCompetencyTemplate();
  const generate = useGenerateCompetencies();
  const { data: vacancy } = useVacancy(vacancyId);
  const updateVacancy = useUpdateVacancy();
  const savedScale = toCompetencyScale((vacancy as unknown as { competency_scale?: unknown })?.competency_scale);
  const [scaleHigh, setScaleHigh] = useState<string>("");
  const [scaleMedium, setScaleMedium] = useState<string>("");
  const scaleHighVal = scaleHigh === "" ? savedScale.high : Number(scaleHigh);
  const scaleMediumVal = scaleMedium === "" ? savedScale.medium : Number(scaleMedium);
  const handleSaveScale = () => {
    const high = Number.isFinite(scaleHighVal) ? scaleHighVal : savedScale.high;
    const medium = Number.isFinite(scaleMediumVal) ? Math.min(scaleMediumVal, high) : savedScale.medium;
    updateVacancy.mutate({ id: vacancyId, patch: { competency_scale: { high, medium } } as never });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CompetencyFormState>(emptyForm());
  const [localExtraGroups, setLocalExtraGroups] = useState<{ groupName: string; groupWeight: number }[]>([]);

  // Зберегти як шаблон
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  // AI-прев'ю згенерованої матриці
  const [aiGroups, setAiGroups] = useState<TemplateGroup[] | null>(null);

  const handleGenerate = () => {
    generate.mutate(vacancyId, { onSuccess: (groups) => setAiGroups(groups) });
  };
  const applyAiGroups = () => {
    if (!aiGroups) return;
    seedGroups.mutate({ vacancyId, groups: aiGroups }, { onSuccess: () => setAiGroups(null) });
  };
  const handleSaveTemplate = () => {
    if (!tplName.trim()) return;
    saveTemplate.mutate(
      { vacancyId, name: tplName.trim(), description: tplDesc.trim() || undefined },
      { onSuccess: () => { setSaveOpen(false); setTplName(""); setTplDesc(""); } },
    );
  };
  const aiCount = aiGroups?.reduce((s, g) => s + g.competencies.length, 0) ?? 0;
  const hasMatrix = (competencies ?? []).length > 0;

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
    const probes = toStringList(c.probes);
    const redFlags = toStringList(c.red_flags);
    const rubric = toRubric(c.rubric);
    setForm({
      id: c.id,
      groupName: c.group_name,
      groupWeight: String(c.group_weight),
      name: c.name,
      nameEn: c.name_en ?? "",
      questionsText: questions.join("\n"),
      probesText: probes.join("\n"),
      redFlagsText: redFlags.join("\n"),
      rubric1: rubric["1"] ?? "",
      rubric2: rubric["2"] ?? "",
      rubric3: rubric["3"] ?? "",
      isMustHave: c.is_must_have,
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
    const probes = form.probesText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    const redFlags = form.redFlagsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);
    const rubric: Record<string, string> = {};
    if (form.rubric1.trim()) rubric["1"] = form.rubric1.trim();
    if (form.rubric2.trim()) rubric["2"] = form.rubric2.trim();
    if (form.rubric3.trim()) rubric["3"] = form.rubric3.trim();

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
            probes,
            red_flags: redFlags,
            rubric,
            is_must_have: form.isMustHave,
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
          probes,
          red_flags: redFlags,
          rubric,
          is_must_have: form.isMustHave,
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
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generate.isPending}>
            {generate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
            Згенерувати з AI
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={seedTemplate.isPending || seedGroups.isPending}>
                <FileStack className="h-4 w-4 mr-2" />
                Засіяти шаблон
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              {(customTemplates ?? []).length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Мої шаблони</div>
                  {(customTemplates ?? []).map((t) => (
                    <div key={t.id} className="flex items-center">
                      <DropdownMenuItem
                        className="flex-1"
                        onClick={() => seedGroups.mutate({ vacancyId, groups: t.groups })}
                      >
                        {t.name}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {t.groups.reduce((s, g) => s + g.competencies.length, 0)}
                        </span>
                      </DropdownMenuItem>
                      <button
                        type="button"
                        className="px-2 text-muted-foreground hover:text-destructive"
                        title="Видалити шаблон"
                        onClick={(e) => { e.stopPropagation(); deleteTemplate.mutate(t.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Вбудовані</div>
              {COMPETENCY_TEMPLATES.map((t) => (
                <DropdownMenuItem key={t.key} onClick={() => seedTemplate.mutate({ vacancyId, template: t })}>
                  {t.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {(competencies ?? []).length === 0 && displayGroups.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeedStandard}>
              <Sparkles className="h-4 w-4 mr-2" />
              Стандартна структура
            </Button>
          )}
          {hasMatrix && (
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
              <Save className="h-4 w-4 mr-2" />
              Зберегти як шаблон
            </Button>
          )}
          <Button size="sm" onClick={() => openCreateDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Додати компетенцію
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-3 flex flex-wrap items-end gap-3">
          <div className="text-sm font-medium text-muted-foreground w-full sm:w-auto sm:mr-2">
            Шкала рівнів відповідності (1–3):
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Висока ≥</Label>
            <Input
              type="number" step="0.01" min={1} max={3}
              className="h-8 w-24 text-sm"
              value={scaleHigh === "" ? String(savedScale.high) : scaleHigh}
              onChange={(e) => setScaleHigh(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Середня ≥</Label>
            <Input
              type="number" step="0.01" min={1} max={3}
              className="h-8 w-24 text-sm"
              value={scaleMedium === "" ? String(savedScale.medium) : scaleMedium}
              onChange={(e) => setScaleMedium(e.target.value)}
            />
          </div>
          <span className="text-xs text-muted-foreground">нижче — низька</span>
          <Button size="sm" variant="outline" className="h-8" onClick={handleSaveScale} disabled={updateVacancy.isPending}>
            Зберегти шкалу
          </Button>
        </CardContent>
      </Card>

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
                            <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                              {c.name}
                              {c.name_en ? <span className="text-muted-foreground"> / {c.name_en}</span> : ""}
                              <span className="text-xs text-muted-foreground">вага {c.weight}</span>
                              {c.is_must_have && (
                                <Badge variant="destructive" className="text-[10px] gap-1">
                                  <ShieldAlert className="h-3 w-3" />
                                  must-have
                                </Badge>
                              )}
                            </div>
                            {questions.length > 0 && (
                              <ul className="text-xs text-muted-foreground list-disc pl-4 mt-1 space-y-0.5">
                                {questions.map((q, idx) => (
                                  <li key={idx}>{String(q)}</li>
                                ))}
                              </ul>
                            )}
                            {toStringList(c.probes).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Probes:</span> {toStringList(c.probes).join(" · ")}
                              </p>
                            )}
                            {toStringList(c.red_flags).length > 0 && (
                              <p className="text-xs text-amber-700 mt-1">
                                <span className="font-medium">Red flags:</span> {toStringList(c.red_flags).join(" · ")}
                              </p>
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

      {/* Зберегти поточну матрицю як шаблон */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Зберегти матрицю як шаблон</DialogTitle>
            <DialogDescription>Застосовуватимете цю матрицю до інших вакансій одним кліком.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Назва шаблону *</Label>
              <Input value={tplName} onChange={(e) => setTplName(e.target.value)} placeholder="напр. Регіональний директор" />
            </div>
            <div className="space-y-1.5">
              <Label>Опис (необовʼязково)</Label>
              <Input value={tplDesc} onChange={(e) => setTplDesc(e.target.value)} placeholder="коротко про роль" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Скасувати</Button>
            <Button onClick={handleSaveTemplate} disabled={!tplName.trim() || saveTemplate.isPending}>
              {saveTemplate.isPending ? "Збереження…" : "Зберегти шаблон"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI-прев'ю згенерованої матриці */}
      <Dialog open={!!aiGroups} onOpenChange={(o) => !o && setAiGroups(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Згенерована матриця (прев'ю)</DialogTitle>
            <DialogDescription>
              AI склав {aiGroups?.length ?? 0} груп · {aiCount} компетенцій із бріфу вакансії. Застосуйте — і за потреби відредагуйте кожну картку.
              {hasMatrix && " Увага: у вакансії вже є компетенції — застосування додасть нові до наявних."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(aiGroups ?? []).map((g, gi) => (
              <div key={gi} className="border rounded-md p-3">
                <div className="text-sm font-medium mb-1.5">
                  {g.group_name} <Badge variant="outline">{Math.round(g.group_weight * 100)}%</Badge>
                </div>
                <ul className="space-y-1.5">
                  {g.competencies.map((c, ci) => (
                    <li key={ci} className="text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.name_en ? <span className="text-muted-foreground"> / {c.name_en}</span> : ""}
                      <span className="text-xs text-muted-foreground"> · вага {c.weight}</span>
                      {c.is_must_have && <Badge variant="destructive" className="text-[10px] ml-1.5">must-have</Badge>}
                      <span className="text-xs text-muted-foreground"> · {c.questions.length} питань</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGroups(null)}>Скасувати</Button>
            <Button variant="ghost" onClick={handleGenerate} disabled={generate.isPending}>
              {generate.isPending ? "Генерація…" : "Перегенерувати"}
            </Button>
            <Button onClick={applyAiGroups} disabled={seedGroups.isPending}>
              {seedGroups.isPending ? "Застосування…" : "Застосувати матрицю"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
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
            <div className="space-y-1.5">
              <Label>Уточнюючі питання / probes (по одному на рядок)</Label>
              <Textarea
                value={form.probesText}
                onChange={(e) => setForm((f) => ({ ...f, probesText: e.target.value }))}
                placeholder="Якщо відповідь неповна — задайте..."
                className="min-h-[70px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Red flags — ознаки невідповідності (по одному на рядок)</Label>
              <Textarea
                value={form.redFlagsText}
                onChange={(e) => setForm((f) => ({ ...f, redFlagsText: e.target.value }))}
                className="min-h-[70px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Рубрика — що означає кожен бал</Label>
              <div className="grid gap-2">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1.5 shrink-0">1</Badge>
                  <Input
                    value={form.rubric1}
                    onChange={(e) => setForm((f) => ({ ...f, rubric1: e.target.value }))}
                    placeholder="Опис бала 1 (низька відповідність)"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1.5 shrink-0">2</Badge>
                  <Input
                    value={form.rubric2}
                    onChange={(e) => setForm((f) => ({ ...f, rubric2: e.target.value }))}
                    placeholder="Опис бала 2 (часткова відповідність)"
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-1.5 shrink-0">3</Badge>
                  <Input
                    value={form.rubric3}
                    onChange={(e) => setForm((f) => ({ ...f, rubric3: e.target.value }))}
                    placeholder="Опис бала 3 (висока відповідність)"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-must-have"
                checked={form.isMustHave}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, isMustHave: checked === true }))}
              />
              <Label htmlFor="is-must-have" className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5 text-destructive" />
                Must-have (бал нижче 2 блокує автоматичний short list у порівнянні)
              </Label>
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
