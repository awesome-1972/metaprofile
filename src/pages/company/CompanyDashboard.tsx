import { AppLayout } from "@/components/layout/AppLayout";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { CaseCard } from "@/components/ui/CaseCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { CompetencyModelBuilder } from "@/components/company/CompetencyModelBuilder";
import { AssignAssessment } from "@/components/company/AssignAssessment";
import { CompanyStatsDashboard } from "@/components/company/CompanyStatsDashboard";
import { Plus, Building2, Globe, Mail, Phone, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CompanyDashboard = () => {
  const [companyData, setCompanyData] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    logo_url: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Дашборд компанії</h1>
            <p className="text-muted-foreground mt-1">Зведена статистика та аналітика</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <CompetencyModelBuilder />
            <AssignAssessment />
            <Button variant="outline" asChild>
              <Link to="/company/cases/create">
                <Plus className="h-4 w-4 mr-2" />
                Створити кейс
              </Link>
            </Button>
            <Button asChild>
              <Link to="/company/vacancies/create">
                <Plus className="h-4 w-4 mr-2" />
                Додати вакансію
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
                    <CardDescription>Заповніть дані про вашу компанію</CardDescription>
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
            {/* Stats Dashboard */}
            <CompanyStatsDashboard />

            {/* Candidates & AI section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
              {/* Recent candidates */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-foreground">Нові кандидати</h2>
                  <Link to="/company/candidates" className="text-sm text-primary hover:underline">
                    Переглянути всіх
                  </Link>
                </div>
                
                <div className="grid gap-4">
                  <CandidateCard
                    name="Олена Коваленко"
                    position="Frontend Developer"
                    caseCompleted="E-commerce платформа"
                    completionDate="Завершено 2 години тому"
                    overallScore={87}
                    competencies={[
                      { name: "React/TypeScript", score: 92 },
                      { name: "Архітектура", score: 85 },
                      { name: "Комунікація", score: 78 },
                    ]}
                    status="new"
                  />
                  <CandidateCard
                    name="Андрій Мельник"
                    position="Product Manager"
                    caseCompleted="Розробка стратегії MVP"
                    completionDate="Завершено вчора"
                    overallScore={79}
                    competencies={[
                      { name: "Стратегічне мислення", score: 88 },
                      { name: "Аналіз даних", score: 75 },
                      { name: "Лідерство", score: 74 },
                    ]}
                    status="reviewed"
                  />
                </div>
              </div>

              {/* AI Insights */}
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-foreground">AI-аналітика</h2>
                
                <AIInsightCard
                  title="Рекомендація щодо найму"
                  insight="На основі аналізу 47 кандидатів, 3 демонструють високу відповідність позиції Frontend Developer з показниками вище 85%."
                  factors={[
                    { label: "Технічні навички", value: "Високі", weight: 90 },
                    { label: "Досвід з React", value: "3+ роки", weight: 85 },
                    { label: "Командна робота", value: "Середній+", weight: 70 },
                  ]}
                  methodology="Оцінка базується на результатах виконання практичного кейсу, аналізі коду та структурованої відповіді. Враховано 12 критеріїв оцінювання."
                />

                <AIInsightCard
                  title="Тренд ринку"
                  insight="Середній час закриття вакансій Frontend Developer скоротився на 15% порівняно з минулим кварталом."
                  methodology="Дані агреговано з 150+ вакансій на платформі за останні 90 днів."
                />
              </div>
            </div>

            {/* Active cases */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-foreground">Активні кейси</h2>
                <Link to="/company/cases" className="text-sm text-primary hover:underline">
                  Усі кейси
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <CaseCard
                  title="E-commerce платформа"
                  description="Розробка модуля кошика з оптимізацією продуктивності та інтеграцією платіжної системи."
                  duration="4-6 годин"
                  participants={23}
                  competencies={["React", "TypeScript", "API"]}
                  status="open"
                  link="/company/cases/1"
                />
                <CaseCard
                  title="Аналіз ринку SaaS"
                  description="Дослідження конкурентного середовища та формування стратегії виходу на ринок."
                  duration="2-3 години"
                  participants={15}
                  competencies={["Аналітика", "Стратегія", "Презентація"]}
                  status="open"
                  link="/company/cases/2"
                />
                <CaseCard
                  title="UX редизайн дашборду"
                  description="Покращення користувацького досвіду адміністративної панелі з фокусом на доступність."
                  duration="3-4 години"
                  participants={8}
                  competencies={["UX/UI", "Figma", "Дослідження"]}
                  status="in_progress"
                  link="/company/cases/3"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CompanyDashboard;
