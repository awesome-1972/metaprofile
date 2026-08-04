import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Github, Globe, Mail, Plug, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuthV2 } from "@/hooks/useAuthV2";

const roleLabel: Record<string, string> = {
  owner: "Власник",
  admin: "Адміністратор",
  recruiter: "Рекрутер",
  assistant: "Асистент",
  company: "Компанія",
  candidate: "Кандидат",
};

type IntegrationState = "active" | "pending" | "optional";

const INTEGRATIONS: { icon: typeof Github; name: string; desc: string; state: IntegrationState }[] = [
  { icon: Globe, name: "Google Workspace", desc: "Drive і Calendar — папки вакансій, транскрипти, стоп-лист із Google-документа.", state: "active" },
  { icon: Sparkles, name: "AI (Anthropic)", desc: "Матчинг, магічний імпорт, розбір CV та бріфу з розмови.", state: "active" },
  { icon: Mail, name: "Пошта (Resend)", desc: "Сповіщення про затвердження і листи кандидатам.", state: "active" },
  { icon: Github, name: "AI-сорсинг: GitHub", desc: "Пошук tech-профілів. Активується ключем GITHUB_TOKEN у секретах.", state: "active" },
  { icon: Plug, name: "AI-сорсинг: PDL / Apollo / Proxycurl", desc: "Додаткові джерела профілів. Вмикаються відповідними ключами.", state: "optional" },
  { icon: Clock, name: "Роботні сайти: Work.ua / Robota.ua", desc: "Публікація вакансій + відгуки + база резюме. Очікує офіційний API-доступ (запити надіслано).", state: "pending" },
];

const stateBadge: Record<IntegrationState, { label: string; cls: string }> = {
  active: { label: "Активна", cls: "bg-green-100 text-green-800" },
  optional: { label: "Опційна", cls: "bg-slate-200 text-slate-700" },
  pending: { label: "Очікує доступ", cls: "bg-amber-100 text-amber-800" },
};

export default function SettingsPage() {
  const { profile, getPrimaryRole, isLoading } = useAuthV2();
  const role = getPrimaryRole();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone((profile as unknown as { phone?: string | null }).phone ?? "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, phone: phone.trim() || null } as never)
      .eq("id", profile.id);
    setSaving(false);
    if (error) toast.error(error.message || "Не вдалося зберегти");
    else toast.success("Профіль збережено");
  };

  return (
    <AtsLayout>
      <div className="p-8 max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Налаштування</h1>
          <p className="text-sm text-muted-foreground">Профіль користувача та інтеграції робочого простору</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Профіль
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Завантаження…</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="s-name">Ім'я</Label>
                    <Input id="s-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Прізвище Ім'я" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="s-phone">Телефон</Label>
                    <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380…" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={profile?.email ?? ""} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Роль</Label>
                    <div className="h-10 flex items-center">
                      <Badge variant="outline">{role ? roleLabel[role] ?? role : "—"}</Badge>
                    </div>
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Збереження…" : "Зберегти профіль"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plug className="h-4 w-4" /> Інтеграції
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Джерела й сервіси робочого простору. Ключі керуються в секретах Supabase; роботні сайти
              з'являться після отримання офіційного API-доступу.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {INTEGRATIONS.map((it) => {
              const Icon = it.icon;
              const b = stateBadge[it.state];
              return (
                <div key={it.name} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                    {it.state === "active" ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Icon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{it.name}</span>
                      <Badge className={`text-[10px] ${b.cls}`}>{b.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{it.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AtsLayout>
  );
}
