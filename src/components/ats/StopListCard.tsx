import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ban, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import {
  useStopList,
  useAddStopListEntry,
  useRemoveStopListEntry,
  useParseStopList,
  type ParsedStopEntry,
} from "@/hooks/ats/use-stop-list";

interface StopListCardProps {
  vacancyId: string;
  canEdit: boolean;
}

/**
 * Стоп-лист вакансії — заборонені клієнтом кандидати. Прив'язаний виключно до
 * цієї вакансії. Кожного нового кандидата система звірятиме з цим списком
 * (попередження при збігу ПІБ у діалозі додавання).
 */
export function StopListCard({ vacancyId, canEdit }: StopListCardProps) {
  const { data: entries, isLoading } = useStopList(vacancyId);
  const addEntry = useAddStopListEntry();
  const removeEntry = useRemoveStopListEntry();
  const parseStopList = useParseStopList();

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");

  const [importOpen, setImportOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedStopEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parsedEmpty, setParsedEmpty] = useState(false);

  const handleAdd = () => {
    if (!fullName.trim()) return;
    addEntry.mutate(
      { vacancyId, fullName, company: company || null, reason: reason || null },
      {
        onSuccess: () => {
          setFullName("");
          setCompany("");
          setReason("");
        },
      },
    );
  };

  const handleParse = () => {
    if (transcript.trim().length < 20) return;
    parseStopList.mutate(
      { vacancyId, transcript: transcript.trim() },
      {
        onSuccess: (list) => {
          setParsed(list);
          setSelected(new Set(list.map((_, i) => i)));
          setParsedEmpty(list.length === 0);
        },
      },
    );
  };

  const handleAddSelected = () => {
    const toAdd = parsed.filter((_, i) => selected.has(i));
    toAdd.forEach((e) =>
      addEntry.mutate({ vacancyId, fullName: e.full_name, company: e.company, reason: e.reason }),
    );
    setImportOpen(false);
    setTranscript("");
    setParsed([]);
    setSelected(new Set());
    setParsedEmpty(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Ban className="h-4 w-4 text-red-500" />
          Стоп-лист від клієнта
          <Badge variant="outline" className="text-[10px]">
            {entries?.length ?? 0}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Кандидати, яких клієнт заборонив розглядати на цю вакансію. Нові кандидати
          звіряються за ПІБ — при збігу з'явиться попередження.
        </p>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 w-fit"
            onClick={() => { setImportOpen(true); setParsed([]); setParsedEmpty(false); }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Завантажити зі розмови
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {canEdit && (
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto] items-end">
            <div className="space-y-1">
              <Label className="text-xs">ПІБ *</Label>
              <Input
                className="h-8 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Прізвище Ім'я"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Компанія</Label>
              <Input
                className="h-8 text-sm"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="необов'язково"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Причина</Label>
              <Input
                className="h-8 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="необов'язково"
              />
            </div>
            <Button
              size="sm"
              className="h-8"
              disabled={!fullName.trim() || addEntry.isPending}
              onClick={handleAdd}
            >
              <Plus className="h-4 w-4 mr-1" />
              Додати
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Завантаження...</div>
        ) : (entries?.length ?? 0) === 0 ? (
          <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
            Стоп-лист порожній
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {entries!.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-2.5 text-sm">
                <span className="font-medium">{entry.full_name}</span>
                {entry.company && (
                  <span className="text-xs text-muted-foreground">{entry.company}</span>
                )}
                {entry.reason && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {entry.reason}
                  </Badge>
                )}
                {canEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 ml-auto text-destructive"
                    disabled={removeEntry.isPending}
                    onClick={() => removeEntry.mutate({ id: entry.id, vacancyId })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Стоп-лист із розмови</DialogTitle>
            <DialogDescription>
              Вставте транскрибацію розмови — AI виділить людей, яких клієнт просив не розглядати.
              Перевірте перелік, зніміть зайве й додайте.
            </DialogDescription>
          </DialogHeader>

          {parsed.length === 0 ? (
            <>
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Вставте сюди текст транскрипції розмови…"
                className="min-h-[200px]"
              />
              {parsedEmpty && (
                <p className="text-sm text-muted-foreground">
                  У тексті не знайдено конкретних людей для стоп-листа.
                </p>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setImportOpen(false)}>Закрити</Button>
                <Button onClick={handleParse} disabled={parseStopList.isPending || transcript.trim().length < 20}>
                  {parseStopList.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Розпізнати
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="rounded-lg border divide-y max-h-72 overflow-auto">
                {parsed.map((e, i) => (
                  <label key={i} className="flex items-start gap-2 p-2.5 text-sm cursor-pointer">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(i)}
                      onCheckedChange={(c) =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (c) next.add(i); else next.delete(i);
                          return next;
                        })
                      }
                    />
                    <div className="min-w-0">
                      <span className="font-medium">{e.full_name}</span>
                      {e.company && <span className="text-xs text-muted-foreground ml-2">{e.company}</span>}
                      {e.reason && <div className="text-xs text-muted-foreground">{e.reason}</div>}
                    </div>
                  </label>
                ))}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => { setParsed([]); setSelected(new Set()); }}>Назад</Button>
                <Button onClick={handleAddSelected} disabled={selected.size === 0 || addEntry.isPending}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Додати обрані ({selected.size})
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
