import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

interface GeneratedModel {
  name: string;
  description: string;
  competencies: Array<{
    name: string;
    description: string;
    category: string;
    weight: number;
    criteria: Criterion[];
  }>;
}

interface AIModelGeneratorProps {
  onModelGenerated: (model: GeneratedModel) => void;
}

const industries = [
  "IT та розробка ПЗ",
  "Фінанси та банківництво",
  "E-commerce",
  "Виробництво",
  "Консалтинг",
  "Маркетинг",
  "Охорона здоров'я",
  "Освіта",
  "Логістика",
  "Інше",
];

const levels = [
  { value: "junior", label: "Junior" },
  { value: "middle", label: "Middle" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead / Manager" },
];

export const AIModelGenerator = ({ onModelGenerated }: AIModelGeneratorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState("");
  const [industry, setIndustry] = useState("");
  const [level, setLevel] = useState("middle");

  const handleGenerate = async () => {
    if (!position.trim()) {
      toast.error("Введіть назву позиції");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-competency-model", {
        body: { position, industry, level },
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Помилка генерації");
      }

      if (data.error) {
        throw new Error(data.error);
      }

      onModelGenerated(data);
      toast.success("Модель компетенцій згенеровано!");
      setIsOpen(false);
      setPosition("");
      setIndustry("");
      setLevel("middle");
    } catch (error) {
      console.error("Generation error:", error);
      toast.error(error instanceof Error ? error.message : "Помилка генерації моделі");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI-асистент
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI-генерація моделі компетенцій
          </DialogTitle>
          <DialogDescription>
            Введіть назву позиції, і AI створить оптимальну модель компетенцій з критеріями
            та індикаторами для кожного рівня.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ai-position">Назва позиції *</Label>
            <Input
              id="ai-position"
              placeholder="Наприклад: Frontend Developer, Product Manager..."
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Галузь</Label>
            <Select value={industry} onValueChange={setIndustry} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Оберіть галузь (необов'язково)" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Рівень позиції</Label>
            <Select value={level} onValueChange={setLevel} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levels.map((lvl) => (
                  <SelectItem key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-lg bg-accent/30 border border-border text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Що буде згенеровано:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>5-7 релевантних компетенцій</li>
              <li>Ваги для кожної компетенції</li>
              <li>Критерії для 5 рівнів оцінки</li>
              <li>Індикатори поведінки</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Скасувати
          </Button>
          <Button onClick={handleGenerate} disabled={isLoading} className="gap-2">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерація...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Згенерувати
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
