import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Globe, Link2, Lock, Plus, Printer, Sparkles, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  usePublicBrief,
  useSavePublicBrief,
  useGeneratePublicBrief,
  useSetPublicBriefLink,
  useSetVacancyBoardPublished,
  toBriefSections,
  type BriefSection,
} from "@/hooks/ats/use-preparation";
import { openPrintableDocument } from "@/lib/ats/print-document";

interface PublicBriefCardProps {
  vacancyId: string;
  vacancyTitle: string;
  canEdit: boolean;
  /** Конфіденційний пошук (з етапу Підготовки) — керує розкриттям клієнта. */
  isConfidential: boolean;
  /** Чи опублікована вакансія на публічному порталі /jobs. */
  isBoardPublished?: boolean;
}

/**
 * Бріф для кандидатів (етап 1) — зовнішній документ, який кандидат отримує
 * перед співбесідою. Dual job profile: AI робить чернетку з внутрішнього брифу
 * (68 питань) + матриці компетенцій, людина редагує і затверджує.
 *
 * Конфіденційність: за замовчуванням клієнт НЕ називається («Наш Клієнт — …»);
 * розкриття — свідомий чекбокс рекрутера.
 */
export function PublicBriefCard({ vacancyId, vacancyTitle, canEdit, isConfidential, isBoardPublished = false }: PublicBriefCardProps) {
  const { data: brief, isLoading } = usePublicBrief(vacancyId);
  const saveBrief = useSavePublicBrief();
  const generate = useGeneratePublicBrief();
  const setLink = useSetPublicBriefLink();
  const setBoard = useSetVacancyBoardPublished();

  const linkEnabled = !!(brief as unknown as { is_link_enabled?: boolean })?.is_link_enabled;
  const publicToken = (brief as unknown as { public_token?: string | null })?.public_token ?? null;
  const publicUrl = publicToken ? `${window.location.origin}/brief/${publicToken}` : "";

  const handleCopyLink = () => {
    if (!publicUrl) return;
    navigator.clipboard
      .writeText(publicUrl)
      .then(() => toast.success("Посилання скопійовано"))
      .catch(() => toast.error("Не вдалося скопіювати"));
  };

  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [sections, setSections] = useState<BriefSection[]>([]);
  const [extraNotes, setExtraNotes] = useState("");
  const [aiModel, setAiModel] = useState<string | null>(null);

  useEffect(() => {
    if (!brief) return;
    setTitle(brief.title ?? "");
    setIntro(brief.intro ?? "");
    setSections(toBriefSections(brief.sections));
    setAiModel(brief.ai_model);
  }, [brief]);

  const isApproved = brief?.status === "completed";

  const handleGenerate = () => {
    generate.mutate(
      { vacancyId, discloseClient: !isConfidential, extraNotes: extraNotes.trim() || undefined },
      {
        onSuccess: (draft) => {
          setTitle(draft.title || vacancyTitle);
          setIntro(draft.intro);
          setSections(draft.sections);
          setAiModel(draft.model);
          toast.success("Чернетку згенеровано — перевірте й відредагуйте перед відправкою кандидатам");
        },
      },
    );
  };

  const handleSave = (status?: "draft" | "completed") => {
    saveBrief.mutate({
      vacancyId,
      title: title.trim() || vacancyTitle,
      intro: intro.trim() || null,
      sections: sections.filter((s) => s.heading.trim() || s.body.trim()),
      status,
      aiModel,
    });
  };

  const handlePrint = () => {
    const printable = sections.filter((s) => s.heading.trim() || s.body.trim());
    if (printable.length === 0 && !intro.trim()) {
      toast.error("Бріф порожній — нема що друкувати");
      return;
    }
    const opened = openPrintableDocument({
      title: title.trim() || vacancyTitle,
      subtitle: isConfidential ? "Конфіденційний бріф для кандидатів" : "Бріф для кандидатів",
      intro: intro.trim() || undefined,
      sections: printable,
    });
    if (!opened) toast.error("Не вдалося відкрити нове вікно (заблоковано браузером)");
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Завантаження бріфу...</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            Бріф для кандидатів
            {isApproved && <Badge className="bg-green-100 text-green-800 text-[10px]">Затверджено</Badge>}
            {aiModel && (
              <Badge variant="outline" className="text-[10px] font-normal">
                AI-чернетка: {aiModel}
              </Badge>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5 mr-1.5" />
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!canEdit || saveBrief.isPending}
              onClick={() => handleSave()}
            >
              Зберегти
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!canEdit || saveBrief.isPending || sections.length === 0}
              onClick={() => handleSave(isApproved ? "draft" : "completed")}
            >
              {isApproved ? "Зняти затвердження" : "Затвердити"}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI-генерація з внутрішнього брифу */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {isConfidential ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-amber-800">
                  Пошук конфіденційний — клієнт не називається. Змінити — перемикачем на етапі «Підготовка».
                </span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Клієнта дозволено називати у бріфі.</span>
              </>
            )}
          </div>
          <Textarea
            value={extraNotes}
            onChange={(e) => setExtraNotes(e.target.value)}
            disabled={!canEdit}
            rows={2}
            placeholder="Вказівки для AI: на чому зробити акцент, що НЕ згадувати, який тон"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!canEdit || generate.isPending}
            onClick={handleGenerate}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {generate.isPending ? "Генерація..." : "AI-чернетка з внутрішнього бріфу"}
          </Button>
        </div>

        {/* Публічне посилання на бріф (для відправки кандидату). */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id="brief-public-link"
              checked={linkEnabled}
              disabled={!canEdit || !brief?.id || setLink.isPending}
              onCheckedChange={(v) => setLink.mutate({ vacancyId, enabled: v, currentToken: publicToken })}
            />
            <Label htmlFor="brief-public-link" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
              <Link2 className="h-3.5 w-3.5" />
              Публічне посилання на бріф
            </Label>
          </div>
          {!brief?.id && (
            <p className="text-xs text-muted-foreground pl-1">Спершу збережіть бріф, щоб увімкнути посилання.</p>
          )}
          {linkEnabled && publicUrl && (
            <div className="flex items-center gap-2">
              <Input readOnly value={publicUrl} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
              <Button size="icon" variant="outline" className="h-9 w-9 flex-shrink-0" onClick={handleCopyLink} title="Копіювати">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 flex-shrink-0"
                onClick={() => window.open(publicUrl, "_blank", "noopener")}
                title="Відкрити"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground pl-1">
            Надішліть кандидату це посилання або PDF (кнопка «PDF» вгорі). Клієнт у бріфі не називається,
            якщо пошук конфіденційний.
          </p>
        </div>

        {/* Публікація на публічному порталі /jobs (окремо від приватного лінка). */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id="board-publish"
              checked={isBoardPublished}
              disabled={!canEdit || !brief?.id || setBoard.isPending}
              onCheckedChange={(v) => setBoard.mutate({ vacancyId, published: v, currentToken: publicToken })}
            />
            <Label htmlFor="board-publish" className="text-sm font-normal flex items-center gap-1.5 cursor-pointer">
              <Globe className="h-3.5 w-3.5" />
              Опублікувати на порталі вакансій
            </Label>
            {isBoardPublished && <Badge className="bg-green-100 text-green-800 text-[10px]">На порталі</Badge>}
          </div>
          {!brief?.id ? (
            <p className="text-xs text-muted-foreground pl-1">Спершу збережіть бріф, щоб опублікувати вакансію.</p>
          ) : (
            <p className="text-xs text-muted-foreground pl-1">
              Вакансія з'явиться у відкритій вітрині <span className="font-mono">/jobs</span>. Вмикання приватного
              посилання вище саме по собі вакансію на портал не виводить.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Назва документа</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={!canEdit}
            placeholder={vacancyTitle}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Вступ (про Клієнта і контекст)</Label>
          <Textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            disabled={!canEdit}
            rows={4}
            placeholder="Наш Клієнт — масштабний регіональний гравець у сфері роздрібної торгівлі…"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Секції документа</Label>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={!canEdit}
              onClick={() => setSections((prev) => [...prev, { heading: "", body: "" }])}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Секція
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              Секцій ще немає — згенеруйте чернетку або додайте вручну
            </div>
          ) : (
            sections.map((section, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 text-sm font-medium"
                    value={section.heading}
                    disabled={!canEdit}
                    placeholder="Заголовок секції"
                    onChange={(e) =>
                      setSections((prev) =>
                        prev.map((s, i) => (i === index ? { ...s, heading: e.target.value } : s)),
                      )
                    }
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!canEdit || index === 0}
                    onClick={() => moveSection(index, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={!canEdit || index === sections.length - 1}
                    onClick={() => moveSection(index, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive"
                    disabled={!canEdit}
                    onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea
                  value={section.body}
                  disabled={!canEdit}
                  rows={6}
                  placeholder="Текст секції (можна списки через «- »)"
                  onChange={(e) =>
                    setSections((prev) =>
                      prev.map((s, i) => (i === index ? { ...s, body: e.target.value } : s)),
                    )
                  }
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
