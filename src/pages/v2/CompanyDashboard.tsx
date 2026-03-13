import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Users, FileText, Building2, Globe, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanyDashboard = () => {
  const { profile, user } = useAuthV2();
  const [companyData, setCompanyData] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    logo_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchCompany();
    }
  }, [user?.id]);

  const fetchCompany = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (data) {
      setCompanyData({
        name: data.name || "",
        description: data.description || "",
        industry: data.industry || "",
        website: data.website || "",
        logo_url: data.logo_url || "",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { data: existing } = await supabase
        .from("companies")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("companies")
          .update({
            name: companyData.name,
            description: companyData.description,
            industry: companyData.industry,
            website: companyData.website,
            logo_url: companyData.logo_url,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("companies").insert({
          name: companyData.name,
          description: companyData.description,
          industry: companyData.industry,
          website: companyData.website,
          logo_url: companyData.logo_url,
          owner_id: user.id,
        });
      }
      toast.success("Профіль компанії збережено");
    } catch {
      toast.error("Помилка збереження");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <V2AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Вітаємо, {profile?.full_name || "Компанія"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Панель управління наймом
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild>
              <Link to="/v2/company/projects/create">
                <Plus className="h-4 w-4 mr-2" />
                Новий проєкт найму
              </Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Профіль компанії</TabsTrigger>
            <TabsTrigger value="dashboard">Дашборд</TabsTrigger>
          </TabsList>

          {/* Company Profile Tab */}
          <TabsContent value="profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Основна інформація
                    </CardTitle>
                    <CardDescription>
                      Заповніть дані про вашу компанію
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Назва компанії</Label>
                      <Input
                        id="company-name"
                        value={companyData.name}
                        onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                        placeholder="Назва вашої компанії"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Індустрія</Label>
                      <Input
                        id="industry"
                        value={companyData.industry}
                        onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                        placeholder="IT, Фінанси, Освіта..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Опис компанії</Label>
                      <Textarea
                        id="description"
                        value={companyData.description}
                        onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                        placeholder="Розкажіть про вашу компанію..."
                        rows={4}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Веб-сайт</Label>
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          value={companyData.website}
                          onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="logo">URL логотипу</Label>
                      <Input
                        id="logo"
                        value={companyData.logo_url}
                        onChange={(e) => setCompanyData({ ...companyData, logo_url: e.target.value })}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                      {isSaving ? "Збереження..." : "Зберегти профіль"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Контактна особа</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Не вказано</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{profile?.full_name || "Не вказано"}</span>
                    </div>
                  </CardContent>
                </Card>

                {companyData.logo_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Логотип</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <img
                        src={companyData.logo_url}
                        alt="Company logo"
                        className="max-w-full h-auto rounded-md"
                      />
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Активні проєкти</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Проєкти найму в роботі</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Кандидати</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Всього запрошено</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Кейси виконано</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Очікують оцінки</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Decision Packs</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Готові звіти</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Проєкти найму
                  </CardTitle>
                  <CardDescription>
                    Створюйте проєкти для оцінки кандидатів на конкретні позиції
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <p>У вас поки немає проєктів найму</p>
                    <Button variant="outline" className="mt-4" asChild>
                      <Link to="/v2/company/projects/create">
                        Створити перший проєкт
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Останні кандидати
                  </CardTitle>
                  <CardDescription>
                    Кандидати, які виконали кейси
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Немає кандидатів для перегляду</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Disclaimer */}
            <div className="mt-8 p-4 bg-accent/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                <strong>AI-підтримка:</strong> Рекомендації на платформі є дорадчими. 
                Фінальне рішення про найм залишається за компанією.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </V2AppLayout>
  );
};

export default CompanyDashboard;
