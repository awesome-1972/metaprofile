import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Compass, MapPin, Briefcase, Star, ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const professionAreas = [
  { name: "Інформаційні технології", match: 92, roles: 45 },
  { name: "Дизайн та креатив", match: 78, roles: 28 },
  { name: "Бізнес та аналітика", match: 74, roles: 35 },
  { name: "Комунікації та маркетинг", match: 68, roles: 22 },
];

const StudentDashboard = () => {
  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вітаємо на платформі</h1>
            <p className="text-muted-foreground mt-1">Відкрийте свій професійний потенціал</p>
          </div>
          <Button asChild>
            <Link to="/student/orientation">
              Профорієнтування
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Ваш прогрес відкриття</h2>
              <p className="text-sm text-muted-foreground">Пройдіть усі етапи для повної картини</p>
            </div>
            <span className="text-2xl font-semibold text-primary">45%</span>
          </div>
          <Progress value={45} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Реєстрація</p>
                <p className="text-xs text-muted-foreground">Завершено</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Тест орієнтації</p>
                <p className="text-xs text-muted-foreground">Завершено</p>
              </div>
            </div>
            <Link
              to="/student/professions"
              className="flex items-center gap-3 p-3 rounded-md border border-dashed border-primary bg-primary/5"
            >
              <Play className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Огляд професій</p>
                <p className="text-xs text-primary">В процесі →</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Міні-стажування</p>
                <p className="text-xs text-muted-foreground">Очікує</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Відповідних сфер"
            value={4}
            icon={Compass}
            subtitle="На основі тесту"
          />
          <StatCard
            title="Рекомендованих професій"
            value={12}
            icon={Briefcase}
            subtitle="З високою відповідністю"
          />
          <StatCard
            title="Доступних стажувань"
            value={8}
            icon={MapPin}
            subtitle="Віртуальних"
          />
          <StatCard
            title="Ваш потенціал"
            value="Високий"
            icon={Star}
            subtitle="За результатами оцінки"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profession areas */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Рекомендовані сфери</h2>
              <Link to="/student/professions" className="text-sm text-primary hover:underline">
                Детальна карта
              </Link>
            </div>
            
            <div className="grid gap-4">
              {professionAreas.map((area, index) => (
                <Link
                  key={index}
                  to="/student/professions"
                  className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-foreground">{area.name}</h3>
                    <span className="text-lg font-semibold text-primary">{area.match}%</span>
                  </div>
                  <Progress value={area.match} className="h-2 mb-2" />
                  <p className="text-sm text-muted-foreground">{area.roles} професій у цій сфері</p>
                </Link>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Аналіз результатів</h2>
            
            <AIInsightCard
              title="Ваші сильні сторони"
              insight="Аналіз показує високий потенціал у аналітичному мисленні та роботі з технологіями. Рекомендуємо розглянути IT-сферу."
              factors={[
                { label: "Аналітичне мислення", value: "Високе", weight: 92 },
                { label: "Креативність", value: "Середнє+", weight: 68 },
                { label: "Комунікативність", value: "Добре", weight: 74 },
              ]}
              methodology="Результат базується на тесті професійної орієнтації з 48 питань, який оцінює 6 ключових параметрів особистості."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Рекомендовані ролі</h3>
              <ul className="space-y-3">
                {[
                  { title: "Data Analyst", match: 94 },
                  { title: "Frontend Developer", match: 88 },
                  { title: "UX Researcher", match: 82 },
                  { title: "Product Manager", match: 78 },
                ].map((role, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{role.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-primary font-medium">{role.match}%</span>
                      <div className="w-12 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${role.match}%` }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                <Link to="/student/internship">Спробувати міні-стажування</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StudentDashboard;
