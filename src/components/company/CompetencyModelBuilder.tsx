import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  GripVertical,
  Settings2,
  Target,
  Save,
  Eye,
  ChevronRight,
  Info,
  Layers,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface Criterion {
  level: number;
  description: string;
  indicators: string[];
}

interface Competency {
  id: string;
  name: string;
  description: string;
  weight: number;
  category: string;
  criteria: Criterion[];
}

interface CompetencyModel {
  id: string;
  name: string;
  description: string;
  positionTitle: string;
  competencies: Competency[];
}

const defaultCriteria: Criterion[] = [
  { level: 1, description: "Початковий рівень", indicators: [] },
  { level: 2, description: "Базовий рівень", indicators: [] },
  { level: 3, description: "Середній рівень", indicators: [] },
  { level: 4, description: "Просунутий рівень", indicators: [] },
  { level: 5, description: "Експертний рівень", indicators: [] },
];

const categoryOptions = [
  "Технічні навички",
  "Soft Skills",
  "Лідерство",
  "Комунікація",
  "Аналітика",
  "Управління",
  "Інше",
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export const CompetencyModelBuilder = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [model, setModel] = useState<CompetencyModel>({
    id: generateId(),
    name: "",
    description: "",
    positionTitle: "",
    competencies: [],
  });

  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [isCompetencyDialogOpen, setIsCompetencyDialogOpen] = useState(false);

  const addCompetency = () => {
    const newCompetency: Competency = {
      id: generateId(),
      name: "",
      description: "",
      weight: 5,
      category: "Технічні навички",
      criteria: [...defaultCriteria],
    };
    setEditingCompetency(newCompetency);
    setIsCompetencyDialogOpen(true);
  };

  const saveCompetency = () => {
    if (!editingCompetency) return;
    if (!editingCompetency.name.trim()) {
      toast.error("Введіть назву компетенції");
      return;
    }

    const existingIndex = model.competencies.findIndex(
      (c) => c.id === editingCompetency.id
    );

    if (existingIndex >= 0) {
      setModel({
        ...model,
        competencies: model.competencies.map((c, i) =>
          i === existingIndex ? editingCompetency : c
        ),
      });
    } else {
      setModel({
        ...model,
        competencies: [...model.competencies, editingCompetency],
      });
    }

    setIsCompetencyDialogOpen(false);
    setEditingCompetency(null);
  };

  const removeCompetency = (id: string) => {
    setModel({
      ...model,
      competencies: model.competencies.filter((c) => c.id !== id),
    });
  };

  const editCompetency = (competency: Competency) => {
    setEditingCompetency({ ...competency });
    setIsCompetencyDialogOpen(true);
  };

  const updateCriterion = (level: number, field: keyof Criterion, value: string | string[]) => {
    if (!editingCompetency) return;
    setEditingCompetency({
      ...editingCompetency,
      criteria: editingCompetency.criteria.map((c) =>
        c.level === level ? { ...c, [field]: value } : c
      ),
    });
  };

  const addIndicator = (level: number, indicator: string) => {
    if (!editingCompetency || !indicator.trim()) return;
    setEditingCompetency({
      ...editingCompetency,
      criteria: editingCompetency.criteria.map((c) =>
        c.level === level
          ? { ...c, indicators: [...c.indicators, indicator.trim()] }
          : c
      ),
    });
  };

  const removeIndicator = (level: number, index: number) => {
    if (!editingCompetency) return;
    setEditingCompetency({
      ...editingCompetency,
      criteria: editingCompetency.criteria.map((c) =>
        c.level === level
          ? { ...c, indicators: c.indicators.filter((_, i) => i !== index) }
          : c
      ),
    });
  };

  const getTotalWeight = () => model.competencies.reduce((sum, c) => sum + c.weight, 0);

  const handleSaveModel = () => {
    if (!model.name.trim()) {
      toast.error("Введіть назву моделі");
      return;
    }
    if (model.competencies.length === 0) {
      toast.error("Додайте хоча б одну компетенцію");
      return;
    }
    // Here would be API call to save the model
    toast.success("Модель компетенцій збережено");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Створити модель компетенцій
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Конструктор моделі компетенцій
          </DialogTitle>
          <DialogDescription>
            Створіть власну модель компетенцій для оцінки кандидатів на конкретну позицію
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model-name">Назва моделі *</Label>
              <Input
                id="model-name"
                placeholder="Наприклад: Senior Developer Assessment"
                value={model.name}
                onChange={(e) => setModel({ ...model, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Позиція</Label>
              <Input
                id="position"
                placeholder="Наприклад: Senior Software Engineer"
                value={model.positionTitle}
                onChange={(e) => setModel({ ...model, positionTitle: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-desc">Опис моделі</Label>
            <Textarea
              id="model-desc"
              placeholder="Опишіть мету та контекст використання цієї моделі..."
              value={model.description}
              onChange={(e) => setModel({ ...model, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Competencies list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-foreground">Компетенції</h3>
                {model.competencies.length > 0 && (
                  <Badge variant="secondary">{model.competencies.length}</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={addCompetency} className="gap-1">
                <Plus className="h-4 w-4" />
                Додати
              </Button>
            </div>

            {model.competencies.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-border rounded-lg">
                <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">Ще немає компетенцій</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Натисніть «Додати» щоб створити першу компетенцію
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {model.competencies.map((comp, index) => (
                  <div
                    key={comp.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {comp.name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {comp.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {comp.description || "Без опису"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-sm font-medium text-foreground">
                          Вага: {comp.weight}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((comp.weight / getTotalWeight()) * 100)}%
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => editCompetency(comp)}
                      >
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCompetency(comp.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weight distribution */}
            {model.competencies.length > 0 && (
              <div className="p-4 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">
                    Розподіл ваг компетенцій
                  </span>
                </div>
                <div className="flex gap-1 h-6 rounded-md overflow-hidden">
                  {model.competencies.map((comp, index) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-center text-xs font-medium text-primary-foreground"
                      style={{
                        width: `${(comp.weight / getTotalWeight()) * 100}%`,
                        backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                      }}
                      title={`${comp.name}: ${Math.round((comp.weight / getTotalWeight()) * 100)}%`}
                    >
                      {Math.round((comp.weight / getTotalWeight()) * 100) > 10 &&
                        `${Math.round((comp.weight / getTotalWeight()) * 100)}%`}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {model.competencies.map((comp, index) => (
                    <div key={comp.id} className="flex items-center gap-1.5 text-xs">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                      />
                      <span className="text-muted-foreground">{comp.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info block */}
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Як це працює?</p>
                <p>
                  Модель компетенцій дозволяє оцінювати кандидатів за конкретними критеріями.
                  Кожна компетенція має вагу (від 1 до 10), яка визначає її важливість.
                  Для кожного рівня (1-5) можна задати опис та індикатори поведінки.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Скасувати
          </Button>
          <Button variant="outline" className="gap-1">
            <Eye className="h-4 w-4" />
            Попередній перегляд
          </Button>
          <Button onClick={handleSaveModel} className="gap-1">
            <Save className="h-4 w-4" />
            Зберегти модель
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Competency edit dialog */}
      <Dialog open={isCompetencyDialogOpen} onOpenChange={setIsCompetencyDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompetency?.name ? "Редагування компетенції" : "Нова компетенція"}
            </DialogTitle>
          </DialogHeader>

          {editingCompetency && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="comp-name">Назва компетенції *</Label>
                  <Input
                    id="comp-name"
                    placeholder="Наприклад: Алгоритмічне мислення"
                    value={editingCompetency.name}
                    onChange={(e) =>
                      setEditingCompetency({ ...editingCompetency, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Категорія</Label>
                  <Select
                    value={editingCompetency.category}
                    onValueChange={(v) =>
                      setEditingCompetency({ ...editingCompetency, category: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comp-desc">Опис</Label>
                <Textarea
                  id="comp-desc"
                  placeholder="Опишіть цю компетенцію..."
                  value={editingCompetency.description}
                  onChange={(e) =>
                    setEditingCompetency({ ...editingCompetency, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Вага компетенції</Label>
                  <span className="text-sm font-medium text-primary">
                    {editingCompetency.weight}
                  </span>
                </div>
                <Slider
                  value={[editingCompetency.weight]}
                  onValueChange={([v]) =>
                    setEditingCompetency({ ...editingCompetency, weight: v })
                  }
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Чим вища вага, тим більший вплив на загальну оцінку
                </p>
              </div>

              <div className="space-y-2">
                <Label>Критерії за рівнями</Label>
                <Accordion type="multiple" className="w-full">
                  {editingCompetency.criteria.map((criterion) => (
                    <AccordionItem key={criterion.level} value={`level-${criterion.level}`}>
                      <AccordionTrigger className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Рівень {criterion.level}</Badge>
                          <span className="text-muted-foreground font-normal">
                            {criterion.description || "Без опису"}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 pt-2">
                        <div className="space-y-2">
                          <Label className="text-xs">Опис рівня</Label>
                          <Input
                            placeholder="Опишіть очікування для цього рівня..."
                            value={criterion.description}
                            onChange={(e) =>
                              updateCriterion(criterion.level, "description", e.target.value)
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs">Індикатори поведінки</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Додати індикатор..."
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  addIndicator(criterion.level, e.currentTarget.value);
                                  e.currentTarget.value = "";
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={(e) => {
                                const input = e.currentTarget
                                  .previousElementSibling as HTMLInputElement;
                                addIndicator(criterion.level, input.value);
                                input.value = "";
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          {criterion.indicators.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {criterion.indicators.map((ind, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="gap-1 cursor-pointer hover:bg-destructive/20"
                                  onClick={() => removeIndicator(criterion.level, idx)}
                                >
                                  {ind}
                                  <Trash2 className="h-3 w-3" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompetencyDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={saveCompetency}>Зберегти компетенцію</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
