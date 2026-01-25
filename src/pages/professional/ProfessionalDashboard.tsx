import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { CaseCard } from "@/components/ui/CaseCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { MetaprogramsAnalysis } from "@/components/professional/MetaprogramsAnalysis";
import { Target, BookOpen, Award, TrendingUp, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const ProfessionalDashboard = () => {
  return (
    <AppLayout role="professional">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вітаємо, Максиме</h1>
            <p className="text-muted-foreground mt-1">Ваш професійний профіль та можливості</p>
          </div>
          <Button asChild>
            <Link to="/professional/cases">
              Знайти кейси
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Profile completeness */}
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Повнота профілю</h2>
              <p className="text-sm text-muted-foreground">Завершіть оцінювання для кращих рекомендацій</p>
            </div>
            <span className="text-2xl font-semibold text-primary">68%</span>
          </div>
          <Progress value={68} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-accent/50">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Базова інформація</p>
                <p className="text-xs text-muted-foreground">Заповнено</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-accent/50">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Метапрограми</p>
                <p className="text-xs text-muted-foreground">Пройдено</p>
              </div>
            </div>
            <Link 
              to="/professional/assessments"
              className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border hover:border-primary transition-colors"
            >
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Оцінка компетенцій</p>
                <p className="text-xs text-primary">Розпочати →</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Виконано кейсів"
            value={5}
            icon={Target}
            trend={{ value: 2, label: "цього місяця" }}
          />
          <StatCard
            title="Отримано запрошень"
            value={3}
            icon={Award}
            subtitle="На співбесіди"
          />
          <StatCard
            title="Курси в процесі"
            value={2}
            icon={BookOpen}
            subtitle="1 майже завершено"
          />
          <StatCard
            title="Рейтинг профілю"
            value="Топ 15%"
            icon={TrendingUp}
            subtitle="Серед спеціалістів"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommended cases */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Рекомендовані кейси</h2>
              <Link to="/professional/cases" className="text-sm text-primary hover:underline">
                Переглянути всі
              </Link>
            </div>
            
            <div className="grid gap-4">
              <CaseCard
                title="Оптимізація бази даних"
                company="TechCorp Ukraine"
                description="Аналіз та оптимізація запитів PostgreSQL для високонавантаженого додатку з мільйонами записів."
                duration="3-4 години"
                participants={12}
                competencies={["SQL", "PostgreSQL", "Оптимізація"]}
                status="open"
                link="/professional/cases/1"
              />
              <CaseCard
                title="Архітектура мікросервісів"
                company="FinTech Solutions"
                description="Проєктування системи обробки платежів з урахуванням масштабованості та відмовостійкості."
                duration="4-5 годин"
                participants={8}
                competencies={["Архітектура", "Node.js", "Docker"]}
                status="open"
                link="/professional/cases/2"
              />
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Персональні рекомендації</h2>
            
            <AIInsightCard
              title="Розвиток компетенцій"
              insight="На основі ваших результатів кейсів, рекомендуємо зосередитись на покращенні навичок системного проєктування."
              factors={[
                { label: "Технічні навички", value: "Високі", weight: 88 },
                { label: "Системний дизайн", value: "Середній", weight: 62 },
                { label: "Комунікація", value: "Добрий", weight: 75 },
              ]}
              methodology="Аналіз базується на 5 виконаних кейсах та порівнянні з профілями успішних кандидатів на аналогічні позиції."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Рекомендовані курси</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">System Design Fundamentals</p>
                    <p className="text-xs text-muted-foreground">8 годин • Початковий</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Distributed Systems</p>
                    <p className="text-xs text-muted-foreground">12 годин • Середній</p>
                  </div>
                </li>
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link to="/professional/learning">Переглянути всі курси</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Metaprograms Analysis */}
        <div className="mt-8">
          <MetaprogramsAnalysis />
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfessionalDashboard;
