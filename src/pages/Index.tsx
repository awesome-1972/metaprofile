import { Link } from "react-router-dom";
import { Building2, User, GraduationCap, Shield, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const roles = [
  {
    id: "company",
    title: "Компанія",
    subtitle: "Роботодавець",
    description: "Знаходьте найкращих кандидатів через реальні кейси, а не резюме",
    icon: Building2,
    features: [
      "Створення кейсів з AI-підтримкою",
      "Порівняльна аналітика кандидатів",
      "Прозора оцінка компетенцій",
    ],
    link: "/company",
  },
  {
    id: "professional",
    title: "Професіонал",
    subtitle: "Шукач роботи",
    description: "Демонструйте свої здібності через реальні завдання",
    icon: User,
    features: [
      "Оцінка метапрограм та компетенцій",
      "Персоналізовані рекомендації",
      "Навчальні програми розвитку",
    ],
    link: "/professional",
  },
  {
    id: "student",
    title: "Студент",
    subtitle: "Молодь",
    description: "Відкрийте свій потенціал та знайдіть професійний шлях",
    icon: GraduationCap,
    features: [
      "Професійна орієнтація",
      "Віртуальні міні-стажування",
      "Карта розвитку кар'єри",
    ],
    link: "/student",
  },
  {
    id: "veteran",
    title: "Ветеран",
    subtitle: "Захисник",
    description: "Адаптація військового досвіду до цивільних професій",
    icon: Shield,
    features: [
      "Оцінка переносимих навичок",
      "Підбір цивільних професій",
      "Адаптаційний навчальний трек",
    ],
    link: "/veteran",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <span className="font-semibold text-foreground text-lg">Metaprofile</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link 
              to="/methodology" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Методологія
            </Link>
            <Link 
              to="/pricing" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ціноутворення
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <section className="container py-16 text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Наступне покоління HR-платформи
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Оцінка компетенцій через реальні кейси. 
          Прозора AI-аналітика. Довіра за дизайном.
        </p>
        
        {/* Key principles */}
        <div className="flex flex-wrap justify-center gap-6 mb-16">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Робота замість слів</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>AI — асистент, не рішення</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Прозорість результатів</span>
          </div>
        </div>
      </section>

      {/* Role selection */}
      <section className="container pb-16">
        <h2 className="text-xl font-semibold text-foreground text-center mb-8">
          Оберіть свою роль для демонстрації
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.id}
                to={role.link}
                className="group rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">{role.title}</h3>
                  <p className="text-sm text-muted-foreground">{role.subtitle}</p>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {role.description}
                </p>
                
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="flex items-center text-primary text-sm font-medium group-hover:gap-2 transition-all">
                  <span>Увійти як {role.title.toLowerCase()}</span>
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Info banner */}
      <section className="border-t border-border bg-card">
        <div className="container py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Це демонстраційний прототип для оцінки продукту. 
            Усі дані є симульованими для презентаційних цілей.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Index;
