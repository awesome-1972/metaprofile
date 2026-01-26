import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  Target, 
  Users, 
  Wallet, 
  Layers,
  FileText,
  Filter,
  UserCheck,
  MessageSquare,
  ClipboardCheck,
  HelpCircle,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Compass,
  Award,
  CheckCircle2,
  XCircle,
  CreditCard,
  Settings,
  Building2,
  BookOpen,
  UserCog,
  Network
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const UniquenessPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">M</span>
              </div>
              <span className="font-semibold text-foreground text-lg">Metaprofile</span>
            </Link>
          </div>
          <nav className="flex items-center gap-4">
            <Link 
              to="/methodology" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Методологія
            </Link>
            <Link 
              to="/uniqueness" 
              className="text-sm text-foreground font-medium"
            >
              Унікальність
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

      {/* Main content */}
      <main className="container py-12 max-w-5xl">
        {/* Back link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          На головну
        </Link>

        {/* Page title */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Унікальність платформи Metaprofile
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Чому ця платформа змінює логіку підбору, оцінки та розвитку, а не просто автоматизує старі підходи.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              1. Розрив зі стереотипною моделлю підбору
            </h2>
          </div>
          
          {/* Traditional hiring flow - visual */}
          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-4">Традиційний ланцюг найму:</p>
            <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg border border-border">
              {[
                { icon: FileText, label: "Вакансія" },
                { icon: Filter, label: "Резюме" },
                { icon: XCircle, label: "Відсів" },
                { icon: UserCheck, label: "Відбір" },
                { icon: MessageSquare, label: "Співбесіда" },
                { icon: ClipboardCheck, label: "Тех. завдання" },
                { icon: HelpCircle, label: "Непрозорий вибір" },
              ].map((step, index, arr) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-card rounded-md border border-border">
                    <step.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{step.label}</span>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Problems grid */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">Довгий процес</p>
                    <p className="text-xs text-muted-foreground">Виснажливий і для компаній, і для кандидатів</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">Суб'єктивність</p>
                    <p className="text-xs text-muted-foreground">Рішення на основі вражень та інтуїції</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-destructive/10">
                    <XCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm mb-1">Неперевіряємість</p>
                    <p className="text-xs text-muted-foreground">Немає об'єктивних критеріїв успішності</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metaprofile solution */}
          <div className="bg-primary/5 rounded-lg p-6 border border-primary/20">
            <p className="text-sm font-medium text-primary mb-4">Як Metaprofile змінює логіку:</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Фокус на діях</p>
                  <p className="text-xs text-muted-foreground">Реальні дії замість описів і вражень</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Кейс-оцінка</p>
                  <p className="text-xs text-muted-foreground">Результат роботи замість самопрезентації</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Прозорий вибір</p>
                  <p className="text-xs text-muted-foreground">Чіткі критерії для всіх сторін</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              2. Цінність не лише для рекрутера, а й для кандидата
            </h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Платформа створює двосторонню цінність — це не просто інструмент відбору для компаній, а середовище розвитку для кандидатів.
          </p>

          {/* Benefits grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Розвиток</p>
                </div>
                <p className="text-sm text-muted-foreground">Кожен кейс — джерело навчання та зворотного зв'язку, а не лише оцінки</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <UserCog className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Профайлінг</p>
                </div>
                <p className="text-sm text-muted-foreground">Метапрограмний аналіз для розуміння власних сильних сторін та стилю роботи</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Compass className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Профорієнтація</p>
                </div>
                <p className="text-sm text-muted-foreground">Для тих, хто ще не визначився — особливо студентів та молодих спеціалістів</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Стажування</p>
                </div>
                <p className="text-sm text-muted-foreground">Доступ до реальних завдань від компаній для першої роботи</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Професіоналізм</p>
                </div>
                <p className="text-sm text-muted-foreground">Демонстрація через реальні кейси, а не «продаж себе» у резюме</p>
              </CardContent>
            </Card>
            <Card className="bg-accent/50 border-accent">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Активна роль</p>
                </div>
                <p className="text-sm text-muted-foreground">Кандидат — активний учасник, а не пасивний об'єкт відбору</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              3. Прозора і гнучка логіка ціноутворення
            </h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Жодних заплутаних тарифів та «пакетів заради пакетів». Логіка ціноутворення побудована на принципі реальної потреби.
          </p>

          {/* Pricing features */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                <div className="p-2 rounded-md bg-primary/10">
                  <Settings className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Модульна оплата</p>
                  <p className="text-xs text-muted-foreground mt-1">Платіть лише за потрібні модулі — без зайвих функцій</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                <div className="p-2 rounded-md bg-primary/10">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Гнучкі моделі</p>
                  <p className="text-xs text-muted-foreground mt-1">Підписка, оплата за кейс або внутрішні модулі</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border">
                <div className="p-2 rounded-md bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Адаптація під масштаб</p>
                  <p className="text-xs text-muted-foreground mt-1">Від стартапу до корпорації — ціна відповідає розміру</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center p-6 bg-muted/30 rounded-lg border border-border">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground mb-2">Заміна, а не додаткові витрати</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Платформа замінює існуючі витрати на рекрутинг, навчання та оцінку більш ефективним рішенням
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              4. Масштабування від підбору до платформи розвитку
            </h2>
          </div>
          
          <p className="text-muted-foreground mb-6">
            Metaprofile не обмежується рекрутингом. Архітектура дозволяє розширювати функціональність без втрати цілісності.
          </p>

          {/* Scalability diagram */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm mb-1">LMS</p>
                <p className="text-xs text-muted-foreground">Навчальний модуль з інтеграцією кейсів</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm mb-1">Оцінка</p>
                <p className="text-xs text-muted-foreground">Внутрішній портал для співробітників</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm mb-1">Assessment</p>
                <p className="text-xs text-muted-foreground">Регулярна оцінка компетенцій команди</p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="p-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <Network className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground text-sm mb-1">Talent Pools</p>
                <p className="text-xs text-muted-foreground">Внутрішня мобільність та кар'єра</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-accent/50 rounded-lg p-5 border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Єдина архітектура</p>
                <p className="text-sm text-muted-foreground">Усі модулі працюють на спільній методології та базі даних про компетенції — не набір розрізнених інструментів</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final section */}
        <section className="mb-8">
          <div className="bg-card border-2 border-primary/20 rounded-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-6">
              <Target className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Ключовий підсумок
            </h2>
            <div className="max-w-lg mx-auto">
              <p className="text-lg text-foreground leading-relaxed">
                <span className="font-semibold">Metaprofile змінює логіку ринку:</span>
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="text-right">
                  <p className="text-muted-foreground">від підбору за резюме</p>
                  <p className="text-muted-foreground">і враженням</p>
                </div>
                <ArrowRight className="h-6 w-6 text-primary flex-shrink-0" />
                <div className="text-left">
                  <p className="font-medium text-foreground">до оцінки за</p>
                  <p className="font-medium text-foreground">реальними діями</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer navigation */}
        <div className="pt-8 border-t border-border">
          <div className="flex justify-between items-center">
            <Link 
              to="/methodology" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Методологія
            </Link>
            <Link 
              to="/pricing" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Ціноутворення →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UniquenessPage;
