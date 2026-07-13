import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useSearchStrategy,
  useSaveSearchStrategy,
  toIndustryShares,
  toStringArray,
  type IndustryShare,
} from "@/hooks/ats/use-preparation";
import { openPrintableDocument } from "@/lib/ats/print-document";

interface SearchStrategyCardProps {
  vacancyId: string;
  vacancyTitle: string;
  canEdit: boolean;
}

/** Список рядків редагується як текст (по рядку на пункт) — швидше за окремі інпути. */
const linesToArray = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Стратегія пошуку (етап 1) — внутрішній документ: де шукаємо, кого шукаємо,
 * що важливо в профілі, що поза скоупом. Структура повторює документ, яким
 * MetaVision уже користується (фокус-галузі з частками, цільові компанії й посади).
 */
export function SearchStrategyCard({ vacancyId, vacancyTitle, canEdit }: SearchStrategyCardProps) {
  const { data: strategy, isLoading } = useSearchStrategy(vacancyId);
  const saveStrategy = useSaveSearchStrategy();

  const [focus, setFocus] = useState("");
  const [industries, setIndustries] = useState<IndustryShare[]>([]);
  const [companies, setCompanies] = useState("");
  const [titles, setTitles] = useState("");
  const [musts, setMusts] = useState("");
  const [outOfScope, setOutOfScope] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!strategy) return;
    setFocus(strategy.focus ?? "");
    setIndustries(toIndustryShares(strategy.industries));
    setCompanies(toStringArray(strategy.target_companies).join("\n"));
    setTitles(toStringArray(strategy.target_titles).join("\n"));
    setMusts(toStringArray(strategy.profile_musts).join("\n"));
    setOutOfScope(strategy.out_of_scope ?? "");
    setNotes(strategy.notes ?? "");
  }, [strategy]);

  const sharesTotal = industries.reduce((sum, item) => sum + (Number(item.share) || 0), 0);

  const handleSave = () => {
    saveStrategy.mutate({
      vacancyId,
      focus: focus.trim() || null,
      industries: industries.filter((i) => i.name.trim()),
      targetCompanies: linesToArray(companies),
      targetTitles: linesToArray(titles),
      profileMusts: linesToArray(musts),
      outOfScope: outOfScope.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const handlePrint = () => {
    const sections = [
      focus.trim() && { heading: "Фокус пошуку", body: focus },
      industries.length > 0 && {
        heading: "З яких компаній дивитися",
        body: industries.map((i) => `- ${i.name}${i.share ? ` — ${i.share}%` : ""}`).join("\n"),
      },
      linesToArray(companies).length > 0 && {
        heading: "Цільові компанії",
        body: linesToArray(companies).map((c) => `- ${c}`).join("\n"),
      },
      linesToArray(titles).length > 0 && {
        heading: "З яких посад дивитися",
        body: linesToArray(titles).map((t) => `- ${t}`).join("\n"),
      },
      linesToArray(musts).length > 0 && {
        heading: "Що є важливим у профілі",
        body: linesToArray(musts).map((m) => `- ${m}`).join("\n"),
      },
      outOfScope.trim() && { heading: "Поза скоупом", body: outOfScope },
      notes.trim() && { heading: "Нотатки", body: notes },
    ].filter(Boolean) as Array<{ heading: string; body: string }>;

    if (sections.length === 0) {
      toast.error("Стратегія порожня — нема що друкувати");
      return;
    }
    const opened = openPrintableDocument({
      title: `${vacancyTitle} — стратегія пошуку`,
      subtitle: "Внутрішній документ MetaVision Consulting",
      sections,
    });
    if (!opened) toast.error("Не вдалося відкрити нове вікно (заблоковано браузером)");
  };

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Завантаження стратегії...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          Стратегія пошуку
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              PDF
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!canEdit || saveStrategy.isPending}
              onClick={handleSave}
            >
              {saveStrategy.isPending ? "Збереження..." : "Зберегти"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Фокус пошуку</Label>
          <Textarea
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            disabled={!canEdit}
            rows={2}
            placeholder="Напр.: ритейл, FMCG, продуктовий бізнес, аптеки та fast food"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Галузі з частками</Label>
            <Badge variant={sharesTotal === 100 ? "default" : "outline"} className="text-[10px]">
              {sharesTotal}%
            </Badge>
          </div>
          <div className="space-y-2">
            {industries.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  className="h-8 text-xs flex-1"
                  value={item.name}
                  disabled={!canEdit}
                  placeholder="продуктовий ритейл"
                  onChange={(e) =>
                    setIndustries((prev) =>
                      prev.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                    )
                  }
                />
                <Input
                  type="number"
                  className="h-8 w-20 text-xs"
                  value={item.share || ""}
                  disabled={!canEdit}
                  placeholder="%"
                  onChange={(e) =>
                    setIndustries((prev) =>
                      prev.map((row, i) =>
                        i === index ? { ...row, share: Number(e.target.value) || 0 } : row,
                      ),
                    )
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={!canEdit}
                  onClick={() => setIndustries((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!canEdit}
              onClick={() => setIndustries((prev) => [...prev, { name: "", share: 0 }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Галузь
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Цільові компанії (по рядку)</Label>
            <Textarea
              value={companies}
              onChange={(e) => setCompanies(e.target.value)}
              disabled={!canEdit}
              rows={6}
              placeholder={"Метро\nMcDonald's\nАТБ"}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Цільові посади (по рядку)</Label>
            <Textarea
              value={titles}
              onChange={(e) => setTitles(e.target.value)}
              disabled={!canEdit}
              rows={6}
              placeholder={"CFO\nFinance Director\nHead of Finance"}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Що важливо у профілі (по рядку)</Label>
          <Textarea
            value={musts}
            onChange={(e) => setMusts(e.target.value)}
            disabled={!canEdit}
            rows={4}
            placeholder={"повна відповідальність за P&L\nдосвід мережевого бізнесу"}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Поза скоупом</Label>
            <Textarea
              value={outOfScope}
              onChange={(e) => setOutOfScope(e.target.value)}
              disabled={!canEdit}
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Нотатки</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              rows={3}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
