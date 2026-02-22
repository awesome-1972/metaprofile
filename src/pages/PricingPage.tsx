import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const pricingModels = [
  {
    title: "Корпоративна підписка",
    description: "Для великих компаній з постійними потребами найму",
    features: [
      "Необмежена кількість вакансій",
      "Необмежена кількість кейсів",
      "Повна аналітика та звітність",
      "AI-підтримка створення кейсів",
      "Інтеграція з ATS",
      "Виділений менеджер",
    ],
    price: "від 500 €/міс",
    note: "Ціна залежить від розміру компанії",
  },
  {
    title: "Оплата за вакансію",
    description: "Для компаній з періодичними потребами найму",
    features: [
      "Публікація вакансії",
      "До 3 кейсів на вакансію",
      "Базова аналітика кандидатів",
      "Звіти по кандидатах",
    ],
    price: "від ххх/міс",
    note: "Залежно від складності позиції",
  },
  {
    title: "Внутрішня оцінка",
    description: "Для оцінки та розвитку існуючих працівників",
    features: [
      "Оцінка компетенцій команди",
      "Виявлення потенціалу",
      "Плани розвитку",
      "Командна аналітика",
    ],
    price: "від 15 €/працівник",
    note: "При оцінці від 10 осіб",
  },
];

const userPricing = [
  {
    role: "Професіонали",
    access: "Безкоштовний базовий доступ",
    paid: "Навчальні підписки від 10 €/міс",
    details: "Виконання кейсів, отримання зворотного зв'язку — безкоштовно. Платний доступ до поглиблених навчальних програм.",
  },
  {
    role: "Студенти та молодь",
    access: "Повністю безкоштовно",
    paid: "Навчальні підписки від 10 €/міс",
    details: "Профорієнтація, тестування, віртуальні стажування — без оплати.",
  },
  {
    role: "Ветерани",
    access: "Повністю безкоштовно",
    paid: "—",
    details: "Усі сервіси платформи, включаючи навчання та підтримку адаптації.",
  },
];

const PricingPage = () => {
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
            Логіка доступу та ціноутворення
          </h1>
          <p className="text-muted-foreground mb-8">
            Демонстрація цінової моделі платформи
          </p>

          {/* Company pricing */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Для компаній та роботодавців
            </h2>
            <p className="text-muted-foreground mb-6">
              Вартість вища за звичайні job-портали (20-100 € за вакансію), але значно нижча 
              за повний стек ATS + assessment інструментів, які замінює платформа.
            </p>

            <div className="grid gap-6">
              {pricingModels.map((model, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-card p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{model.title}</h3>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary text-lg">{model.price}</p>
                      <p className="text-xs text-muted-foreground">{model.note}</p>
                    </div>
                  </div>
                  <ul className="grid grid-cols-2 gap-2">
                    {model.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* User pricing */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Для користувачів
            </h2>

            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Категорія
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Базовий доступ
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      Платні опції
                    </th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wide p-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="flex items-center gap-1">
                            Деталі
                            <HelpCircle className="h-3 w-3" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Детальний опис моделі доступу</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userPricing.map((item, index) => (
                    <tr key={index} className="border-t border-border">
                      <td className="p-4">
                        <span className="font-medium text-foreground">{item.role}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-primary font-medium">{item.access}</span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{item.paid}</td>
                      <td className="p-4 text-sm text-muted-foreground">{item.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Value proposition */}
          <section className="rounded-lg border border-border bg-accent/30 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Цінність для компаній
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-foreground mb-2">Що замінює платформа:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• ATS система (Application Tracking)</li>
                  <li>• Інструменти оцінки кандидатів</li>
                  <li>• Тестові завдання та їх перевірка</li>
                  <li>• Первинний скринінг резюме</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-2">Економія:</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Час рекрутерів на скринінг: -60%</li>
                  <li>• Вартість невдалого найму: -40%</li>
                  <li>• Час до закриття вакансії: -35%</li>
                  <li>• Витрати на окремі assessment-інструменти: -70%</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Це демонстрація цінової логіки для оцінки продукту. 
              Фінальні ціни можуть відрізнятись.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Button asChild>
              <Link to="/">Повернутись до демо</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
