import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Ban, Plus, Trash2 } from "lucide-react";
import {
  useStopList,
  useAddStopListEntry,
  useRemoveStopListEntry,
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

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [reason, setReason] = useState("");

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
    </Card>
  );
}
