import { AppLayout } from "@/components/layout/AppLayout";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { CaseCard } from "@/components/ui/CaseCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { CompetencyModelBuilder } from "@/components/company/CompetencyModelBuilder";
import { AssignAssessment } from "@/components/company/AssignAssessment";
import { CompanyStatsDashboard } from "@/components/company/CompanyStatsDashboard";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CompanyDashboard = () => {
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
      </div>
    </AppLayout>
  );
};

export default CompanyDashboard;
