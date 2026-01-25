import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/StatCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Shield, Target, Compass, BookOpen, Briefcase, ArrowRight, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const transferableSkills = [
  { name: "Лідерство та управління", military: "Командування підрозділом", civilian: "Менеджмент команди", score: 94 },
  { name: "Стресостійкість", military: "Бойові операції", civilian: "Кризовий менеджмент", score: 98 },
  { name: "Стратегічне планування", military: "Тактичне планування", civilian: "Проєктне управління", score: 88 },
  { name: "Технічні навички", military: "Робота з технікою", civilian: "Інженерія / IT", score: 75 },
];

const VeteranDashboard = () => {
  return (
    <AppLayout role="veteran">
      <div className="p-6 lg:p-8">
        {/* Welcome banner */}
        <div className="rounded-lg border border-border bg-card p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Вітаємо, Захиснику
              </h1>
              <p className="text-muted-foreground mb-4">
                Ця платформа створена для допомоги в адаптації вашого військового досвіду 
                до цивільних професій. Усі сервіси для ветеранів надаються безкоштовно.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/veteran/skills">
                    Оцінити навички
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/veteran/matching">
                    Підібрати професію
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Ваш шлях адаптації</h2>
              <p className="text-sm text-muted-foreground">Рухайтесь у своєму темпі</p>
            </div>
            <span className="text-2xl font-semibold text-primary">35%</span>
          </div>
          <Progress value={35} className="h-2 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-primary/10">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Реєстрація</p>
                <p className="text-xs text-muted-foreground">Завершено</p>
              </div>
            </div>
            <Link
              to="/veteran/skills"
              className="flex items-center gap-3 p-3 rounded-md border border-dashed border-primary bg-primary/5"
            >
              <Play className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Оцінка навичок</p>
                <p className="text-xs text-primary">Розпочати →</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Підбір професій</p>
                <p className="text-xs text-muted-foreground">Очікує</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Навчання</p>
                <p className="text-xs text-muted-foreground">Очікує</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border">
              <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Стажування</p>
                <p className="text-xs text-muted-foreground">Очікує</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Переносимі навички"
            value={12}
            icon={Target}
            subtitle="Ідентифіковано"
          />
          <StatCard
            title="Відповідних професій"
            value={18}
            icon={Briefcase}
            subtitle="На основі досвіду"
          />
          <StatCard
            title="Навчальних модулів"
            value={6}
            icon={BookOpen}
            subtitle="Рекомендовано"
          />
          <StatCard
            title="Стажувань"
            value={4}
            icon={Compass}
            subtitle="Доступно"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transferable skills */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">Переносимі навички</h2>
              <Link to="/veteran/skills" className="text-sm text-primary hover:underline">
                Повна оцінка
              </Link>
            </div>
            
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Навичка
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Військовий досвід
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Цивільне застосування
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Відповідність
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transferableSkills.map((skill, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="p-4">
                        <span className="font-medium text-foreground">{skill.name}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{skill.military}</td>
                      <td className="p-4 text-sm text-muted-foreground">{skill.civilian}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-sm font-medium text-primary">{skill.score}%</span>
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${skill.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* AI Insights */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Аналітика</h2>
            
            <AIInsightCard
              title="Рекомендації адаптації"
              insight="Ваш військовий досвід демонструє сильні лідерські якості та стресостійкість. Рекомендуємо розглянути ролі в кризовому менеджменті або управлінні проєктами."
              factors={[
                { label: "Лідерство", value: "Дуже високе", weight: 94 },
                { label: "Стресостійкість", value: "Виняткове", weight: 98 },
                { label: "Технічні навички", value: "Потребує розвитку", weight: 75 },
              ]}
              methodology="Аналіз базується на типових переносимих навичках військовослужбовців та потребах цивільного ринку праці України."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Рекомендовані професії</h3>
              <ul className="space-y-3">
                {[
                  { title: "Менеджер проєктів", match: 92 },
                  { title: "Спеціаліст з безпеки", match: 88 },
                  { title: "Кризовий менеджер", match: 85 },
                  { title: "Тренер / Коуч", match: 78 },
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
                <Link to="/veteran/matching">Детальний підбір</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Support note */}
        <div className="mt-8 rounded-lg border border-border bg-accent/30 p-4">
          <p className="text-sm text-muted-foreground text-center">
            Усі сервіси платформи для ветеранів надаються безкоштовно. 
            Ви можете рухатись у власному темпі, без жодного тиску.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default VeteranDashboard;
