import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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
      <main className="container py-12 max-w-4xl">
        {/* Back link */}
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          На головну
        </Link>

        {/* Page title */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Унікальність платформи Metaprofile
          </h1>
          <p className="text-lg text-muted-foreground">
            Чому ця платформа змінює логіку підбору, оцінки та розвитку, а не просто автоматизує старі підходи.
          </p>
        </div>

        {/* Section 1 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            1. Розрив зі стереотипною моделлю підбору
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <p>
              Традиційний ланцюг найму складається з послідовних етапів, кожен із яких несе ризик втрати якісних кандидатів або прийняття помилкових рішень:
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 border border-border">
              <p className="text-sm font-medium text-foreground">
                вакансія → резюме → відсів → відбір → співбесіда → технічне завдання → непрозорий вибір → формальний або відсутній зворотний зв'язок
              </p>
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="font-medium text-foreground">Проблеми традиційної моделі:</h3>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Цей процес довгий, виснажливий і для компаній, і для кандидатів.</li>
                <li>Більшість рішень ухвалюються суб'єктивно, на основі вражень та інтуїції.</li>
                <li>Якість рішення погано перевіряється — немає об'єктивних критеріїв успішності найму.</li>
              </ul>
            </div>

            <Separator className="my-6" />

            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Як Metaprofile змінює цю логіку:</h3>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Переносить фокус з описів і вражень на реальні дії — кандидат демонструє компетенції через виконання практичних завдань.</li>
                <li>Використовує кейс-орієнтовану оцінку замість фільтрації резюме — оцінюється результат роботи, а не самопрезентація.</li>
                <li>Робить вибір порівнюваним і пояснюваним — кожна оцінка базується на чітких критеріях та є прозорою для всіх сторін.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            2. Цінність не лише для рекрутера, а й для кандидата
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <p>
              Платформа створює двосторонню цінність. Це не просто інструмент відбору для компаній — це середовище, де кандидати отримують реальні можливості для зростання.
            </p>

            <div className="space-y-3 mt-6">
              <h3 className="font-medium text-foreground">Що Metaprofile надає кандидатам:</h3>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Можливість розвитку, а не лише оцінки — кожен кейс стає джерелом навчання та зворотного зв'язку.</li>
                <li>Профайлінг, у тому числі метапрограмний — розуміння власних сильних сторін та стилю роботи.</li>
                <li>Профорієнтацію для тих, хто ще не визначився — особливо для студентів та молодих спеціалістів.</li>
                <li>Можливість першої роботи або стажування для студентів — доступ до реальних завдань від компаній.</li>
                <li>Можливість показати професіоналізм, вирішуючи реальні кейси, а не «продаючи себе» у резюме.</li>
              </ul>
            </div>

            <div className="bg-accent/50 rounded-lg p-4 border border-border mt-6">
              <p className="text-sm text-foreground">
                <span className="font-medium">Ключовий принцип:</span> кандидат перестає бути пасивним об'єктом відбору. Він стає активним учасником процесу, здатним впливати на результат через власні дії та демонстрацію реальних компетенцій.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            3. Прозора і гнучка логіка ціноутворення
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <p>
              Metaprofile не використовує заплутані тарифні сітки та не продає «пакети заради пакетів». Логіка ціноутворення побудована на принципі реальної потреби.
            </p>

            <div className="space-y-3 mt-6">
              <h3 className="font-medium text-foreground">Концептуальна логіка цін:</h3>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Компанії платять лише за ті модулі, які їм потрібні — без зайвих функцій у пакеті.</li>
                <li>Можливі різні моделі оплати: підписка, оплата за кейс, внутрішні модулі.</li>
                <li>Ціна гнучко адаптується під масштаб компанії — від стартапу до корпорації.</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 border border-border mt-6">
              <p className="text-sm text-foreground">
                <span className="font-medium">Важливо:</span> платформа не змушує компанії змінювати фінансову поведінку. Вона замінює існуючі витрати на рекрутинг, навчання та оцінку більш ефективним і вимірюваним рішенням.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4 */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            4. Масштабування від підбору до повноцінної платформи розвитку
          </h2>
          
          <div className="space-y-4 text-muted-foreground">
            <p>
              Metaprofile не обмежується рекрутингом. Архітектура платформи дозволяє розширювати функціональність без втрати цілісності.
            </p>

            <div className="space-y-3 mt-6">
              <h3 className="font-medium text-foreground">Можливості масштабування:</h3>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Розширення до LMS (навчального модуля) — інтеграція кейсів з навчальними програмами.</li>
                <li>Використання як внутрішнього порталу оцінки — для поточних співробітників, а не лише кандидатів.</li>
                <li>Внутрішні assessment-centers — регулярна оцінка компетенцій команди.</li>
                <li>Розвиток talent pools і внутрішньої мобільності — управління кар'єрними траєкторіями всередині організації.</li>
              </ul>
            </div>

            <div className="bg-accent/50 rounded-lg p-4 border border-border mt-6">
              <p className="text-sm text-foreground">
                <span className="font-medium">Це єдина архітектура</span>, а не набір розрізнених інструментів. Усі модулі працюють на спільній методології оцінки та спільній базі даних про компетенції.
              </p>
            </div>
          </div>
        </section>

        {/* Final section */}
        <section className="mb-8">
          <Separator className="mb-8" />
          
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Ключовий підсумок
          </h2>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-foreground text-lg leading-relaxed">
              Metaprofile змінює логіку ринку:
              <br />
              <span className="text-muted-foreground">від підбору за резюме і враженням —</span>
              <br />
              <span className="font-medium">до оцінки за реальними діями, розвитком і доказами.</span>
            </p>
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
