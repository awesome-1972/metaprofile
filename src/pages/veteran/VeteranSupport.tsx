import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Heart, 
  MessageCircle, 
  Phone, 
  Video, 
  Calendar, 
  Clock, 
  User, 
  Star, 
  Shield, 
  Briefcase,
  Target,
  TrendingUp,
  BookOpen,
  Users,
  CheckCircle2,
  ArrowRight
} from "lucide-react";

const psychologists = [
  {
    id: 1,
    name: "Олена Коваленко",
    specialization: "Посттравматичний стресовий розлад",
    experience: "12 років досвіду",
    rating: 4.9,
    reviews: 156,
    available: true,
    photo: null,
    methods: ["Когнітивно-поведінкова терапія", "EMDR", "Групова терапія"],
  },
  {
    id: 2,
    name: "Андрій Петренко",
    specialization: "Адаптація до цивільного життя",
    experience: "8 років досвіду",
    rating: 4.8,
    reviews: 98,
    available: true,
    photo: null,
    methods: ["Системна терапія", "Коучинг", "Арт-терапія"],
  },
  {
    id: 3,
    name: "Марія Шевченко",
    specialization: "Сімейне консультування ветеранів",
    experience: "15 років досвіду",
    rating: 4.9,
    reviews: 203,
    available: false,
    photo: null,
    methods: ["Сімейна терапія", "Парне консультування", "Медіація"],
  },
];

const careerConsultants = [
  {
    id: 1,
    name: "Ігор Мельник",
    specialization: "Перехід з військової сфери в IT",
    experience: "10 років досвіду",
    rating: 4.7,
    reviews: 87,
    available: true,
    expertise: ["IT-сфера", "Проектний менеджмент", "Лідерство"],
  },
  {
    id: 2,
    name: "Наталія Бондаренко",
    specialization: "Підприємництво та власний бізнес",
    experience: "14 років досвіду",
    rating: 4.9,
    reviews: 134,
    available: true,
    expertise: ["Стартапи", "Малий бізнес", "Франчайзинг"],
  },
  {
    id: 3,
    name: "Василь Козак",
    specialization: "Державна служба та безпека",
    experience: "20 років досвіду",
    rating: 4.8,
    reviews: 112,
    available: true,
    expertise: ["Державний сектор", "Безпека", "Управління"],
  },
];

const supportServices = [
  {
    icon: MessageCircle,
    title: "Онлайн-чат",
    description: "Миттєва підтримка через чат з психологом",
    availability: "Цілодобово",
  },
  {
    icon: Video,
    title: "Відеоконсультації",
    description: "Особисті сесії через відеозв'язок",
    availability: "За записом",
  },
  {
    icon: Phone,
    title: "Телефонна лінія",
    description: "Гаряча лінія психологічної підтримки",
    availability: "24/7",
  },
  {
    icon: Users,
    title: "Групові сесії",
    description: "Терапевтичні групи для ветеранів",
    availability: "Щотижня",
  },
];

const careerServices = [
  {
    icon: Target,
    title: "Визначення цілей",
    description: "Допомога у формуванні кар'єрних цілей",
  },
  {
    icon: BookOpen,
    title: "Аналіз навичок",
    description: "Оцінка переносних компетенцій",
  },
  {
    icon: Briefcase,
    title: "Підготовка до співбесід",
    description: "Тренування та симуляції інтерв'ю",
  },
  {
    icon: TrendingUp,
    title: "План розвитку",
    description: "Індивідуальна стратегія кар'єри",
  },
];

const VeteranSupport = () => {
  return (
    <AppLayout role="veteran">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Психологічна підтримка</h1>
          <p className="text-muted-foreground mt-1">
            Професійна допомога для адаптації до цивільного життя та розвитку кар'єри
          </p>
        </div>

        {/* Quick Access Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {supportServices.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{service.title}</h3>
                      <p className="text-sm text-muted-foreground">{service.description}</p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {service.availability}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="psychological" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="psychological" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Психологічна підтримка
            </TabsTrigger>
            <TabsTrigger value="career" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Кар'єрне консультування
            </TabsTrigger>
          </TabsList>

          {/* Psychological Support Tab */}
          <TabsContent value="psychological" className="space-y-6">
            {/* Info Banner */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">Конфіденційність гарантована</h3>
                    <p className="text-sm text-muted-foreground">
                      Усі консультації проводяться анонімно. Ваші дані захищені та не передаються третім особам.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Psychologists Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Наші психологи</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {psychologists.map((psychologist) => (
                  <Card key={psychologist.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{psychologist.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {psychologist.specialization}
                          </CardDescription>
                        </div>
                        {psychologist.available ? (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Доступний
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Зайнятий</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {psychologist.experience}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {psychologist.rating} ({psychologist.reviews})
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {psychologist.methods.map((method, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {method}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        className="w-full" 
                        variant={psychologist.available ? "default" : "secondary"}
                        disabled={!psychologist.available}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {psychologist.available ? "Записатися на консультацію" : "Немає вільних слотів"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Support Programs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Програми підтримки</CardTitle>
                <CardDescription>
                  Комплексні програми для роботи з різними аспектами адаптації
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Робота з ПТСР</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      8-тижнева програма для опрацювання травматичного досвіду
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">8 тижнів</Badge>
                      <Badge variant="secondary">Індивідуально</Badge>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Групова підтримка</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Щотижневі зустрічі з іншими ветеранами та фасилітатором
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Постійно</Badge>
                      <Badge variant="secondary">Група до 10 осіб</Badge>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Сімейна терапія</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Підтримка у відновленні сімейних стосунків після служби
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">6 тижнів</Badge>
                      <Badge variant="secondary">Сім'я</Badge>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Стрес-менеджмент</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Техніки управління стресом та емоційної регуляції
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">4 тижні</Badge>
                      <Badge variant="secondary">Онлайн</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Career Consulting Tab */}
          <TabsContent value="career" className="space-y-6">
            {/* Career Services Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {careerServices.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Card key={index}>
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-medium text-foreground">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Career Consultants Grid */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Кар'єрні консультанти</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {careerConsultants.map((consultant) => (
                  <Card key={consultant.id} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                          <Briefcase className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base">{consultant.name}</CardTitle>
                          <CardDescription className="text-sm">
                            {consultant.specialization}
                          </CardDescription>
                        </div>
                        {consultant.available && (
                          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                            Доступний
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {consultant.experience}
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          {consultant.rating} ({consultant.reviews})
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {consultant.expertise.map((exp, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {exp}
                          </Badge>
                        ))}
                      </div>
                      <Button className="w-full">
                        <Calendar className="h-4 w-4 mr-2" />
                        Записатися на консультацію
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Career Path Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Популярні напрямки переходу</CardTitle>
                <CardDescription>
                  Найуспішніші кар'єрні шляхи для ветеранів за нашою статистикою
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">IT та технології</h3>
                      <Badge className="bg-green-500/10 text-green-600">78% успіху</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Проектний менеджмент, кібербезпека, системне адміністрування
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span>Дізнатися більше</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Безпека та охорона</h3>
                      <Badge className="bg-green-500/10 text-green-600">85% успіху</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Корпоративна безпека, ризик-менеджмент, консалтинг
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span>Дізнатися більше</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Власний бізнес</h3>
                      <Badge className="bg-green-500/10 text-green-600">72% успіху</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Підприємництво, консалтинг, тренерська діяльність
                    </p>
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <span>Дізнатися більше</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Success Stories Teaser */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg">
                      Понад 500 ветеранів успішно працевлаштовані
                    </h3>
                    <p className="text-muted-foreground">
                      Середній час до першої роботи — 3 місяці. 92% задоволені новою кар'єрою.
                    </p>
                  </div>
                  <Button variant="outline">
                    Історії успіху
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default VeteranSupport;
