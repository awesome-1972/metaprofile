import { AppLayout } from "@/components/layout/AppLayout";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { 
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Target,
  Briefcase,
  BookOpen,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const transferableSkillsData = [
  {
    category: "Лідерство та управління",
    skills: [
      { military: "Командування підрозділом", civilian: "Управління командою", score: 95 },
      { military: "Планування операцій", civilian: "Проєктний менеджмент", score: 92 },
      { military: "Прийняття рішень під тиском", civilian: "Кризовий менеджмент", score: 98 },
    ],
  },
  {
    category: "Технічні навички",
    skills: [
      { military: "Робота з технікою та обладнанням", civilian: "Технічне обслуговування", score: 85 },
      { military: "Комунікаційні системи", civilian: "IT-інфраструктура", score: 75 },
      { military: "Логістика та забезпечення", civilian: "Операційний менеджмент", score: 88 },
    ],
  },
  {
    category: "Особисті якості",
    skills: [
      { military: "Дисципліна та відповідальність", civilian: "Надійність", score: 98 },
      { military: "Робота в команді", civilian: "Командна взаємодія", score: 92 },
      { military: "Адаптивність", civilian: "Гнучкість", score: 90 },
    ],
  },
];

const recommendedProfessions = [
  {
    title: "Менеджер проєктів",
    match: 94,
    description: "Управління командами та проєктами, планування та контроль виконання",
    requiredTraining: "1-2 місяці",
  },
  {
    title: "Спеціаліст з безпеки",
    match: 91,
    description: "Фізична безпека, оцінка ризиків, розробка протоколів",
    requiredTraining: "2-4 тижні",
  },
  {
    title: "Кризовий менеджер",
    match: 88,
    description: "Управління кризовими ситуаціями, швидке прийняття рішень",
    requiredTraining: "1 місяць",
  },
  {
    title: "Тренер / Інструктор",
    match: 85,
    description: "Навчання та розвиток персоналу, проведення тренінгів",
    requiredTraining: "1-2 місяці",
  },
];

const VeteranSkills = () => {
  return (
    <AppLayout role="veteran">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/veteran" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Оцінка переносимих навичок
            </h1>
            <p className="text-muted-foreground mt-1">
              Аналіз вашого військового досвіду для цивільного ринку праці
            </p>
          </div>
        </div>

        {/* Progress summary */}
        <div className="rounded-lg border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-medium text-foreground">Профіль навичок</h2>
              <p className="text-sm text-muted-foreground">
                На основі типового досвіду військовослужбовця
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-semibold text-primary">89%</p>
              <p className="text-xs text-muted-foreground">загальна переносимість</p>
            </div>
          </div>
          <Progress value={89} className="h-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skills breakdown */}
          <div className="lg:col-span-2 space-y-6">
            {transferableSkillsData.map((category, categoryIndex) => (
              <div key={categoryIndex} className="rounded-lg border border-border bg-card p-6">
                <h3 className="font-semibold text-foreground text-lg mb-4">
                  {category.category}
                </h3>
                <div className="space-y-4">
                  {category.skills.map((skill, skillIndex) => (
                    <div key={skillIndex} className="p-4 rounded-md bg-accent/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Військовий досвід
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {skill.military}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-primary" />
                          <div className="text-center">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              Цивільне застосування
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {skill.civilian}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-primary">{skill.score}%</p>
                          <p className="text-xs text-muted-foreground">відповідність</p>
                        </div>
                      </div>
                      <Progress value={skill.score} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <AIInsightCard
              title="Аналіз профілю"
              insight="Ваш військовий досвід демонструє виняткові лідерські якості та здатність працювати в стресових умовах. Це цінні навички для багатьох цивільних професій."
              factors={[
                { label: "Лідерство", value: "Виняткове", weight: 95 },
                { label: "Стресостійкість", value: "Максимальна", weight: 98 },
                { label: "Технічні навички", value: "Потребує адаптації", weight: 75 },
              ]}
              methodology="Аналіз базується на дослідженнях успішної адаптації ветеранів на цивільному ринку праці."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-4">
                Рекомендовані професії
              </h3>
              <div className="space-y-3">
                {recommendedProfessions.map((prof, index) => (
                  <div
                    key={index}
                    className="p-3 rounded-md border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{prof.title}</h4>
                      <span className="text-primary font-semibold">{prof.match}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {prof.description}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BookOpen className="h-3 w-3" />
                      <span>Підготовка: {prof.requiredTraining}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/veteran/matching">
                  Детальний підбір
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/veteran/adaptation">
                  Переглянути навчання
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="mt-8 rounded-lg border border-border bg-accent/30 p-4">
          <p className="text-sm text-muted-foreground text-center">
            Ця оцінка є орієнтовною та базується на типовому військовому досвіді. 
            Для більш точного аналізу ви можете пройти детальне опитування.
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default VeteranSkills;
