import { AppLayout } from "@/components/layout/AppLayout";
import { CandidateCard } from "@/components/ui/CandidateCard";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { ArrowLeft, Users, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const candidates = [
  {
    name: "Олена Коваленко",
    position: "Frontend Developer",
    caseCompleted: "E-commerce платформа",
    completionDate: "Завершено 2 години тому",
    overallScore: 87,
    competencies: [
      { name: "React/TypeScript", score: 92 },
      { name: "Архітектура", score: 85 },
      { name: "Комунікація", score: 78 },
    ],
    status: "new" as const,
  },
  {
    name: "Андрій Мельник",
    position: "Frontend Developer",
    caseCompleted: "E-commerce платформа",
    completionDate: "Завершено 5 годин тому",
    overallScore: 79,
    competencies: [
      { name: "React/TypeScript", score: 82 },
      { name: "Архітектура", score: 75 },
      { name: "Комунікація", score: 80 },
    ],
    status: "reviewed" as const,
  },
  {
    name: "Марія Шевченко",
    position: "Frontend Developer",
    caseCompleted: "E-commerce платформа",
    completionDate: "Завершено вчора",
    overallScore: 91,
    competencies: [
      { name: "React/TypeScript", score: 95 },
      { name: "Архітектура", score: 88 },
      { name: "Комунікація", score: 90 },
    ],
    status: "shortlisted" as const,
  },
  {
    name: "Олександр Петренко",
    position: "Frontend Developer",
    caseCompleted: "E-commerce платформа",
    completionDate: "Завершено 2 дні тому",
    overallScore: 62,
    competencies: [
      { name: "React/TypeScript", score: 65 },
      { name: "Архітектура", score: 58 },
      { name: "Комунікація", score: 63 },
    ],
    status: "rejected" as const,
  },
];

const CompanyCandidates = () => {
  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/company" 
            className="p-2 rounded-md hover:bg-accent transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">Кандидати</h1>
            <p className="text-muted-foreground mt-1">Перегляд та управління кандидатами</p>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-5 w-5" />
            <span className="text-lg font-medium text-foreground">47</span>
            <span className="text-sm">кандидатів</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Input 
            placeholder="Пошук за ім'ям..." 
            className="max-w-xs"
          />
          <Select defaultValue="all">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі статуси</SelectItem>
              <SelectItem value="new">Нові</SelectItem>
              <SelectItem value="reviewed">Переглянуті</SelectItem>
              <SelectItem value="shortlisted">У шорт-лісті</SelectItem>
              <SelectItem value="rejected">Відхилені</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Кейс" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Усі кейси</SelectItem>
              <SelectItem value="ecommerce">E-commerce платформа</SelectItem>
              <SelectItem value="saas">Аналіз ринку SaaS</SelectItem>
              <SelectItem value="ux">UX редизайн</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Candidates list */}
          <div className="lg:col-span-2 space-y-4">
            {candidates.map((candidate, index) => (
              <CandidateCard
                key={index}
                {...candidate}
                onView={() => {}}
                onInvite={() => {}}
                onReject={() => {}}
              />
            ))}
          </div>

          {/* AI Analysis sidebar */}
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-foreground">Аналітика відбору</h2>
            
            <AIInsightCard
              title="Порівняльний аналіз"
              insight="З 4 кандидатів, 2 демонструють результати вище порогового значення 80%. Рекомендуємо зосередитись на Марії Шевченко та Олені Коваленко."
              factors={[
                { label: "Вище 80%", value: "2 кандидати", weight: 50 },
                { label: "60-80%", value: "1 кандидат", weight: 25 },
                { label: "Нижче 60%", value: "1 кандидат", weight: 25 },
              ]}
              methodology="Порівняння базується на загальному балі та ключових компетенціях для позиції Frontend Developer."
            />

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-medium text-foreground mb-3">Розподіл за компетенціями</h3>
              <div className="space-y-3">
                {[
                  { name: "React/TypeScript", avg: 84 },
                  { name: "Архітектура", avg: 77 },
                  { name: "Комунікація", avg: 78 },
                ].map((comp, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{comp.name}</span>
                      <span className="text-sm text-muted-foreground">сер. {comp.avg}%</span>
                    </div>
                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${comp.avg}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-accent/30 p-4">
              <h3 className="font-medium text-foreground mb-2">Дії з вибраними</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Запросити на співбесіду
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Надіслати додатковий тест
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive">
                  Відхилити вибраних
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default CompanyCandidates;
