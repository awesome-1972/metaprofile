// /v2/company/settings — профіль компанії (винесено з дашборду в окрему сторінку).
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Building2, Globe, Mail, Users } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanySettings = () => {
  const { profile, user } = useAuthV2();
  const [companyData, setCompanyData] = useState({
    name: "", description: "", industry: "", website: "", logo_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from("companies").select("*").eq("owner_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setCompanyData({
          name: data.name || "", description: data.description || "",
          industry: data.industry || "", website: data.website || "", logo_url: data.logo_url || "",
        });
      });
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase.from("companies").select("id").eq("owner_id", user.id).maybeSingle();
      if (existing) await supabase.from("companies").update({ ...companyData }).eq("id", existing.id);
      else await supabase.from("companies").insert({ ...companyData, owner_id: user.id });
      toast.success("Профіль компанії збережено");
    } catch { toast.error("Помилка збереження"); }
    finally { setIsSaving(false); }
  };

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Налаштування</h1>
          <p className="text-muted-foreground mt-1">Профіль вашої компанії</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Основна інформація</CardTitle>
                <CardDescription>Заповніть дані про вашу компанію</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Назва компанії</Label>
                  <Input value={companyData.name} onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })} placeholder="Назва вашої компанії" />
                </div>
                <div className="space-y-2">
                  <Label>Індустрія</Label>
                  <Input value={companyData.industry} onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })} placeholder="IT, Фінанси, Освіта..." />
                </div>
                <div className="space-y-2">
                  <Label>Опис компанії</Label>
                  <Textarea value={companyData.description} onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })} rows={4} placeholder="Розкажіть про вашу компанію..." />
                </div>
                <div className="space-y-2">
                  <Label>Веб-сайт</Label>
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Input value={companyData.website} onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })} placeholder="https://example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL логотипу</Label>
                  <Input value={companyData.logo_url} onChange={(e) => setCompanyData({ ...companyData, logo_url: e.target.value })} placeholder="https://example.com/logo.png" />
                </div>
                <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Збереження..." : "Зберегти профіль"}</Button>
              </CardContent>
            </Card>
          </div>
          <div>
            <Card>
              <CardHeader><CardTitle className="text-base">Контактна особа</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{profile?.email || "—"}</span></div>
                <div className="flex items-center gap-3"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{profile?.full_name || "Не вказано"}</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CompanySettings;
