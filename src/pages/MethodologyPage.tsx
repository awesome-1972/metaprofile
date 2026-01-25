import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Eye, Target, Shield, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIInsightCard } from "@/components/ui/AIInsightCard";

const MethodologyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="font-semibold text-foreground text-lg">Metaprofile</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Методологія платформи
          </h1>
          <p className="text-muted-foreground mb-8">
            Принципи оцінювання, прозорості та довіри за дизайном
          </p>

          {/* Core principles */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Ключові принципи
            </h2>

            <div className="grid gap-6">
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      Робота замість слів
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Оцінка кандидатів базується на виконанні реальних кейсів, а не на аналізі резюме. 
                      Це дозволяє об'єктивно оцінити практичні навички та підхід до вирішення задач.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground">Кейси моделюють реальні робочі ситуації</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground">Оцінюється процес мислення, а не лише результат</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground">Рівні умови для всіх кандидатів</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      AI — асистент, а не джерело рішень
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Штучний інтелект використовується для аналізу та підтримки прийняття рішень, 
                      але ніколи не виступає як фінальний арбітр. Усі AI-інсайти чітко марковані.
                    </p>
                    
                    <AIInsightCard
                      title="Приклад AI-інсайту"
                      insight="Цей блок демонструє, як виглядають AI-рекомендації на платформі. Вони завжди супроводжуються поясненням методології."
                      factors={[
                        { label: "Приклад фактору 1", value: "Значення", weight: 80 },
                        { label: "Приклад фактору 2", value: "Значення", weight: 65 },
                      ]}
                      methodology="AI-аналітика базується на структурованих даних і завжди може бути пояснена. Користувач бачить усі фактори, що вплинули на висновок."
                      className="mt-4"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      Trust-by-design (довіра за дизайном)
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Кожен результат має пояснення. Ніяких «чорних скриньок». 
                      Чітке розмежування між даними, інтерпретацією та рекомендаціями.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div className="p-4 rounded-md bg-accent/50">
                        <h4 className="font-medium text-foreground text-sm mb-1">Дані</h4>
                        <p className="text-xs text-muted-foreground">
                          Об'єктивна інформація: час виконання, відповіді, результати тестів
                        </p>
                      </div>
                      <div className="p-4 rounded-md bg-accent/50">
                        <h4 className="font-medium text-foreground text-sm mb-1">Інтерпретація</h4>
                        <p className="text-xs text-muted-foreground">
                          Аналіз даних з поясненням методології та факторів впливу
                        </p>
                      </div>
                      <div className="p-4 rounded-md bg-accent/50">
                        <h4 className="font-medium text-foreground text-sm mb-1">Рекомендація</h4>
                        <p className="text-xs text-muted-foreground">
                          Пропозиції дій з обґрунтуванням, але рішення — за людиною
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-lg mb-2">
                      Соціальний вплив — структурний
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Підтримка ветеранів та молоді вбудована в архітектуру платформи, 
                      а не є маркетинговою надбудовою.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-md border border-border">
                        <h4 className="font-medium text-foreground mb-2">Для ветеранів</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Повністю безкоштовний доступ</li>
                          <li>• Спеціалізований UX без тиску</li>
                          <li>• Оцінка переносимих навичок</li>
                          <li>• Адаптаційні програми</li>
                        </ul>
                      </div>
                      <div className="p-4 rounded-md border border-border">
                        <h4 className="font-medium text-foreground mb-2">Для молоді</h4>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Безкоштовна профорієнтація</li>
                          <li>• Віртуальні стажування</li>
                          <li>• Мапа професій</li>
                          <li>• Зворотний зв'язок для розвитку</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* What we avoid */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-6">
              Чого ми уникаємо
            </h2>

            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Гейміфікація та емоційний тиск",
                  "Яскраві CTA та маркетинговий копірайтинг",
                  "AI-вердикти без пояснень",
                  "Оцінка лише за резюме",
                  "Приховані алгоритми",
                  "Нерівні умови для кандидатів",
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="text-center">
            <Button asChild>
              <Link to="/">Повернутись до демо</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MethodologyPage;
