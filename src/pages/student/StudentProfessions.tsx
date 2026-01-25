import { AppLayout } from "@/components/layout/AppLayout";
import { useState } from "react";
import { 
  Code, Palette, BarChart3, MessageCircle, Building2, 
  Stethoscope, Wrench, ArrowLeft, Star, Users, TrendingUp,
  BookOpen, Briefcase, ChevronRight, GraduationCap, Clock, 
  PlayCircle, CheckCircle2, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Link } from "react-router-dom";

const professionAreas = [
  {
    id: "it",
    name: "Інформаційні технології",
    icon: Code,
    match: 92,
    description: "Розробка програмного забезпечення, аналіз даних, кібербезпека",
    color: "hsl(var(--primary))",
    roles: [
      { title: "Frontend Developer", match: 94, salary: "25-60k", demand: "Високий" },
      { title: "Data Analyst", match: 92, salary: "20-50k", demand: "Високий" },
      { title: "Backend Developer", match: 88, salary: "30-70k", demand: "Високий" },
      { title: "DevOps Engineer", match: 76, salary: "35-80k", demand: "Середній" },
      { title: "QA Engineer", match: 72, salary: "15-40k", demand: "Високий" },
    ]
  },
  {
    id: "design",
    name: "Дизайн та креатив",
    icon: Palette,
    match: 78,
    description: "UI/UX дизайн, графічний дизайн, моушн-дизайн",
    color: "hsl(var(--chart-2))",
    roles: [
      { title: "UX Designer", match: 82, salary: "20-50k", demand: "Високий" },
      { title: "UI Designer", match: 78, salary: "18-45k", demand: "Середній" },
      { title: "Graphic Designer", match: 74, salary: "12-35k", demand: "Середній" },
      { title: "Motion Designer", match: 68, salary: "20-50k", demand: "Низький" },
    ]
  },
  {
    id: "business",
    name: "Бізнес та аналітика",
    icon: BarChart3,
    match: 74,
    description: "Бізнес-аналіз, управління проектами, консалтинг",
    color: "hsl(var(--chart-3))",
    roles: [
      { title: "Business Analyst", match: 78, salary: "25-55k", demand: "Високий" },
      { title: "Product Manager", match: 76, salary: "30-70k", demand: "Високий" },
      { title: "Project Manager", match: 72, salary: "25-60k", demand: "Середній" },
      { title: "Consultant", match: 68, salary: "35-80k", demand: "Середній" },
    ]
  },
  {
    id: "marketing",
    name: "Комунікації та маркетинг",
    icon: MessageCircle,
    match: 68,
    description: "Digital-маркетинг, PR, контент-менеджмент",
    color: "hsl(var(--chart-4))",
    roles: [
      { title: "Digital Marketer", match: 72, salary: "15-40k", demand: "Високий" },
      { title: "Content Manager", match: 68, salary: "12-30k", demand: "Середній" },
      { title: "SMM Specialist", match: 64, salary: "10-25k", demand: "Високий" },
      { title: "PR Manager", match: 60, salary: "18-45k", demand: "Низький" },
    ]
  },
  {
    id: "engineering",
    name: "Інженерія та виробництво",
    icon: Wrench,
    match: 58,
    description: "Механіка, електроніка, автоматизація процесів",
    color: "hsl(var(--chart-5))",
    roles: [
      { title: "Mechanical Engineer", match: 62, salary: "20-45k", demand: "Середній" },
      { title: "Automation Engineer", match: 58, salary: "25-55k", demand: "Високий" },
      { title: "Electronics Engineer", match: 54, salary: "18-40k", demand: "Низький" },
    ]
  },
  {
    id: "finance",
    name: "Фінанси та облік",
    icon: Building2,
    match: 52,
    description: "Фінансовий аналіз, бухгалтерія, аудит",
    color: "hsl(var(--muted-foreground))",
    roles: [
      { title: "Financial Analyst", match: 56, salary: "20-50k", demand: "Середній" },
      { title: "Accountant", match: 52, salary: "12-30k", demand: "Високий" },
      { title: "Auditor", match: 48, salary: "18-45k", demand: "Низький" },
    ]
  },
];

const careerPathData = {
  levels: [
    {
      level: "Junior",
      timeframe: "Старт",
      salaryRange: "15-30k",
      courses: [
        { title: "Основи професії", duration: "4 тижні", type: "Базовий", platform: "Coursera" },
        { title: "Практичні інструменти", duration: "3 тижні", type: "Практика", platform: "Udemy" },
        { title: "Soft skills для початківців", duration: "2 тижні", type: "Soft skills", platform: "LinkedIn Learning" },
      ]
    },
    {
      level: "Middle",
      timeframe: "2-4 роки",
      salaryRange: "35-55k",
      courses: [
        { title: "Поглиблені технології", duration: "6 тижнів", type: "Просунутий", platform: "Pluralsight" },
        { title: "Проектний менеджмент", duration: "4 тижні", type: "Менеджмент", platform: "Coursera" },
        { title: "Комунікація в команді", duration: "3 тижні", type: "Soft skills", platform: "Skillshare" },
      ]
    },
    {
      level: "Senior",
      timeframe: "4-6 років",
      salaryRange: "60-85k",
      courses: [
        { title: "Архітектура та системний дизайн", duration: "8 тижнів", type: "Експертний", platform: "O'Reilly" },
        { title: "Технічне лідерство", duration: "5 тижнів", type: "Лідерство", platform: "LinkedIn Learning" },
        { title: "Менторинг та наставництво", duration: "4 тижні", type: "Soft skills", platform: "Udemy" },
      ]
    },
    {
      level: "Lead",
      timeframe: "6+ років",
      salaryRange: "90-120k+",
      courses: [
        { title: "Стратегічне управління", duration: "6 тижнів", type: "Стратегія", platform: "Harvard Online" },
        { title: "Управління командами", duration: "5 тижнів", type: "Менеджмент", platform: "Coursera" },
        { title: "Бізнес-аналітика для лідерів", duration: "4 тижні", type: "Бізнес", platform: "MIT OpenCourseWare" },
      ]
    },
  ]
};

const getCourseTypeColor = (type: string) => {
  switch (type) {
    case "Базовий": return "bg-primary/10 text-primary border-primary/20";
    case "Практика": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Soft skills": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Просунутий": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Менеджмент": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "Експертний": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Лідерство": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "Стратегія": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "Бізнес": return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    default: return "bg-muted text-muted-foreground border-border";
  }
};

const StudentProfessions = () => {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const currentArea = professionAreas.find(a => a.id === selectedArea);
  const currentRole = currentArea?.roles.find(r => r.title === selectedRole);

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case "Високий": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Середній": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Низький": return "bg-muted text-muted-foreground border-border";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {(selectedArea || selectedRole) && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                if (selectedRole) {
                  setSelectedRole(null);
                } else {
                  setSelectedArea(null);
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {selectedRole ? currentRole?.title : selectedArea ? currentArea?.name : "Карта професій"}
            </h1>
            <p className="text-muted-foreground mt-1">
              {selectedRole 
                ? "Детальний огляд ролі"
                : selectedArea 
                  ? currentArea?.description 
                  : "Оберіть сферу для детального огляду професій"
              }
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <button 
            onClick={() => { setSelectedArea(null); setSelectedRole(null); }}
            className="hover:text-foreground transition-colors"
          >
            Всі сфери
          </button>
          {selectedArea && (
            <>
              <ChevronRight className="h-4 w-4" />
              <button 
                onClick={() => setSelectedRole(null)}
                className="hover:text-foreground transition-colors"
              >
                {currentArea?.name}
              </button>
            </>
          )}
          {selectedRole && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{currentRole?.title}</span>
            </>
          )}
        </div>

        {/* Main Content */}
        {!selectedArea ? (
          /* Areas Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {professionAreas.map((area) => {
              const Icon = area.icon;
              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area.id)}
                  className="rounded-lg border border-border bg-card p-5 text-left hover:border-primary/50 transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="p-3 rounded-lg"
                      style={{ backgroundColor: `${area.color}20` }}
                    >
                      <Icon className="h-6 w-6" style={{ color: area.color }} />
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary">{area.match}%</span>
                      <p className="text-xs text-muted-foreground">відповідність</p>
                    </div>
                  </div>
                  <h3 className="font-medium text-foreground mb-2 group-hover:text-primary transition-colors">
                    {area.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{area.description}</p>
                  <Progress value={area.match} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {area.roles.length} професій у цій сфері
                  </p>
                </button>
              );
            })}
          </div>
        ) : !selectedRole ? (
          /* Roles in Area */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-medium text-foreground">Професії у сфері</h2>
              <div className="space-y-3">
                {currentArea?.roles.map((role, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedRole(role.title)}
                    className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{role.title}</h3>
                          <p className="text-sm text-muted-foreground">Зарплата: ${role.salary}/рік</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-primary">{role.match}%</span>
                        <Badge variant="outline" className={`ml-2 ${getDemandColor(role.demand)}`}>
                          {role.demand} попит
                        </Badge>
                      </div>
                    </div>
                    <Progress value={role.match} className="h-1.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <AIInsightCard
                title="Аналіз сфери"
                insight={`Сфера "${currentArea?.name}" має ${currentArea?.match}% відповідності вашому профілю. Рекомендуємо розглянути ролі з найвищою відповідністю для початку кар'єри.`}
                factors={[
                  { label: "Аналітичні здібності", value: "Високі", weight: 85 },
                  { label: "Технічні навички", value: "Потенціал", weight: 72 },
                  { label: "Комунікація", value: "Добре", weight: 68 },
                ]}
                methodology="Відповідність розрахована на основі тесту орієнтації та аналізу ринку праці."
              />

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-3">Статистика сфери</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Конкуренція</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">Середня</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ріст галузі</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">+15% / рік</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Навчання</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">3-6 місяців</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Role Detail */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Role Overview */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">{currentRole?.title}</h2>
                        <p className="text-muted-foreground">{currentArea?.name}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-5 w-5 text-primary fill-primary" />
                      <span className="text-2xl font-bold text-primary">{currentRole?.match}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">відповідність</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Зарплата</p>
                    <p className="text-lg font-semibold text-foreground">${currentRole?.salary}</p>
                    <p className="text-xs text-muted-foreground">на рік</p>
                  </div>
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Попит</p>
                    <p className="text-lg font-semibold text-foreground">{currentRole?.demand}</p>
                    <p className="text-xs text-muted-foreground">на ринку</p>
                  </div>
                  <div className="p-4 rounded-md bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Старт</p>
                    <p className="text-lg font-semibold text-foreground">3-6 міс</p>
                    <p className="text-xs text-muted-foreground">до першої роботи</p>
                  </div>
                </div>

                <h3 className="font-medium text-foreground mb-3">Опис ролі</h3>
                <p className="text-muted-foreground mb-4">
                  Ця роль передбачає роботу над реальними проектами, аналіз даних та комунікацію з командою. 
                  Підходить для людей з аналітичним складом розуму та бажанням постійно розвиватися.
                </p>

                <h3 className="font-medium text-foreground mb-3">Необхідні навички</h3>
                <div className="flex flex-wrap gap-2">
                  {["Аналітичне мислення", "Комунікація", "Робота в команді", "Вирішення проблем", "Тайм-менеджмент"].map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>

              {/* Career Path with Courses */}
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-medium text-foreground">Кар'єрний шлях та навчання</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    {careerPathData.levels.reduce((acc, l) => acc + l.courses.length, 0)} курсів
                  </Badge>
                </div>
                
                <div className="space-y-6">
                  {careerPathData.levels.map((levelData, index) => (
                    <div key={levelData.level} className="relative">
                      {/* Level Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                          index === 0 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-medium ${index === 0 ? "text-primary" : "text-foreground"}`}>
                              {levelData.level}
                            </h4>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{levelData.timeframe}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">Зарплата: ${levelData.salaryRange}/рік</p>
                        </div>
                        {index === 0 && (
                          <Badge className="bg-primary/10 text-primary border-0">Ваш старт</Badge>
                        )}
                      </div>

                      {/* Courses for this level */}
                      <div className="ml-14 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                          Рекомендовані курси для переходу на наступний рівень:
                        </p>
                        {levelData.courses.map((course, courseIndex) => (
                          <div 
                            key={courseIndex}
                            className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 rounded bg-background">
                                <PlayCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                  {course.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {course.duration}
                                  </span>
                                  <span className="text-xs text-muted-foreground">•</span>
                                  <span className="text-xs text-muted-foreground">{course.platform}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${getCourseTypeColor(course.type)}`}>
                                {course.type}
                              </Badge>
                              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Connector line */}
                      {index < careerPathData.levels.length - 1 && (
                        <div className="absolute left-5 top-14 w-0.5 h-[calc(100%-2rem)] bg-border" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-md bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Персоналізований план навчання</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Проходьте курси послідовно для оптимального кар'єрного росту. 
                        Середній час до рівня Middle — 2-3 роки активного навчання та практики.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <AIInsightCard
                title="Персональна рекомендація"
                insight={`Роль "${currentRole?.title}" добре відповідає вашим сильним сторонам. Рекомендуємо почати з міні-стажування для практичного досвіду.`}
                factors={[
                  { label: "Аналітичні здібності", value: "Відповідає", weight: 92 },
                  { label: "Технічні задатки", value: "Потенціал", weight: 78 },
                  { label: "Soft skills", value: "Добре", weight: 74 },
                ]}
                methodology="Рекомендація базується на результатах тесту орієнтації та аналізі вимог до ролі."
              />

              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-3">Наступні кроки</h3>
                <div className="space-y-3">
                  <Button variant="default" className="w-full justify-start" asChild>
                    <Link to="/student/internship">
                      Спробувати міні-стажування
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Переглянути навчальні ресурси
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Зберегти в обрані
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentProfessions;
