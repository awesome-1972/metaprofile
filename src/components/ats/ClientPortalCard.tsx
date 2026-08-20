import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { useClientPortal, useUpdateClientPortal, type ClientPortalSettings } from "@/hooks/ats/use-client-portal";

interface ClientPortalCardProps {
  vacancyId: string;
  canEdit: boolean;
}

const SECTIONS: { key: keyof ClientPortalSettings; label: string; hint: string }[] = [
  { key: "client_show_strategy", label: "Стратегія пошуку", hint: "фокус, компанії, посади, логіка воронки" },
  { key: "client_show_progress", label: "Прогрес воронки", hint: "етапи й кількість кандидатів" },
  { key: "client_show_shortlist", label: "Шорт-лист", hint: "презентовані кандидати зі звітами" },
  { key: "client_show_longlist", label: "Лонг-лист (чистий)", hint: "досвід без приміток рекрутера й контактів" },
];

export function ClientPortalCard({ vacancyId, canEdit }: ClientPortalCardProps) {
  const { data: settings } = useClientPortal(vacancyId);
  const update = useUpdateClientPortal();
  const [copied, setCopied] = useState(false);

  if (!canEdit) return null;

  const enabled = !!settings?.client_share_enabled;
  const url = settings?.client_token ? `${window.location.origin}/client/${settings.client_token}` : "";

  const set = (patch: Partial<ClientPortalSettings>) =>
    update.mutate({ vacancyId, patch, current: settings ?? null });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Посилання скопійовано");
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Не вдалося скопіювати"); }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Share2 className="h-4 w-4 text-muted-foreground" /> Клієнтський портал</span>
          <Switch
            checked={enabled}
            onCheckedChange={(v) => set({ client_share_enabled: v })}
            disabled={update.isPending}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Зовнішнє посилання для клієнта: стратегія, прогрес, шорт-лист і чистий лонг-лист. Доступ — лише за секретним токеном; вимкнення миттєво закриває сторінку.
        </p>

        {enabled && url && (
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Посилання для клієнта</Label>
              <Input readOnly value={url} className="h-8 text-xs" onFocus={(e) => e.currentTarget.select()} />
            </div>
            <Button size="sm" variant="outline" className="h-8" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline" className="h-8" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Показувати клієнту</Label>
          {SECTIONS.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">{s.hint}</div>
              </div>
              <Switch
                checked={!!settings?.[s.key]}
                onCheckedChange={(v) => set({ [s.key]: v } as Partial<ClientPortalSettings>)}
                disabled={update.isPending}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
