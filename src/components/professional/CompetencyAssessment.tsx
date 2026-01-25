import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Building2,
  User,
  ChevronRight,
  BookOpen,
  Target,
  Award,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CompetencyModel {
  id: string;
  name: string;
  source: "employer" | "standard";
  company?: string;
  competencies: string[];
  duration: string;
  questions: number;
  description: string;
}

const employerModels: CompetencyModel[] = [
  {
    id: "techcorp-dev",
    name: "Модель TechCorp для розробників",
    source: "employer",
    company: "TechCorp Ukraine",
    competencies: ["Алгоритми", "System Design", "Code Review", "Комунікація"],
    duration: "45 хв",
    questions: 30,
    description: "Оцінка технічних та soft-skills для позиції Senior Developer",
  },
  {
    id: "fintech-arch",
    name: "Архітектор FinTech Solutions",
    source: "employer",
    company: "FinTech Solutions",
    competencies: ["Архітектура", "Безпека", "Масштабування", "Лідерство"],
    duration: "60 хв",
    questions: 40,
    description: "Комплексна оцінка для позиції Solution Architect",
  },
];

const standardModels: CompetencyModel[] = [
  {
    id: "soft-skills",
    name: "Soft Skills Assessment",
    source: "standard",
    competencies: ["Комунікація", "Робота в команді", "Лідерство", "Адаптивність"],
    duration: "30 хв",
    questions: 25,
    description: "Універсальна оцінка міжособистісних навичок",
  },
  {
    id: "tech-general",
    name: "Технічні компетенції IT",
    source: "standard",
    competencies: ["Програмування", "Бази даних", "DevOps", "Тестування"],
    duration: "40 хв",
    questions: 35,
    description: "Базова оцінка технічних навичок для IT-спеціалістів",
  },
  {
    id: "management",
    name: "Управлінські компетенції",
    source: "standard",
    competencies: ["Планування", "Делегування", "Мотивація", "Контроль"],
    duration: "35 хв",
    questions: 28,
    description: "Оцінка навичок управління командою та проєктами",
  },
  {
    id: "problem-solving",
    name: "Аналітичне мислення",
    source: "standard",
    competencies: ["Логіка", "Аналіз даних", "Прийняття рішень", "Креативність"],
    duration: "25 хв",
    questions: 20,
    description: "Оцінка здатності вирішувати складні задачі",
  },
];

interface CompetencyAssessmentProps {
  onStartAssessment?: (modelId: string) => void;
}

export const CompetencyAssessment = ({ onStartAssessment }: CompetencyAssessmentProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"employer" | "standard">("employer");

  const allModels = activeTab === "employer" ? employerModels : standardModels;
  const selectedModelData = [...employerModels, ...standardModels].find(
    (m) => m.id === selectedModel
  );

  const handleStartAssessment = () => {
    if (selectedModel) {
      onStartAssessment?.(selectedModel);
      setIsDialogOpen(false);
      // Here would be navigation to assessment page
    }
  };

  const CompetencyCard = ({ model }: { model: CompetencyModel }) => (
    <div
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        selectedModel === model.id
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={() => setSelectedModel(model.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {model.source === "employer" ? (
            <Building2 className="h-4 w-4 text-chart-2" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
          <span className="font-medium text-foreground text-sm">{model.name}</span>
        </div>
        <RadioGroupItem value={model.id} id={model.id} />
      </div>

      {model.company && (
        <p className="text-xs text-muted-foreground mb-2">від {model.company}</p>
      )}

      <p className="text-xs text-muted-foreground mb-3">{model.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {model.competencies.map((comp, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            {comp}
          </Badge>
        ))}
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {model.duration}
        </span>
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {model.questions} питань
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex items-center gap-3 p-3 rounded-md border border-dashed border-border hover:border-primary transition-colors">
      <Clock className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">Оцінка компетенцій</p>
        <p className="text-xs text-muted-foreground">Пройдіть тест для покращення профілю</p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            Розпочати
            <ChevronRight className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Оцінка компетенцій
            </DialogTitle>
            <DialogDescription>
              Оберіть модель компетенцій для проходження тесту. Результати покращать ваш
              профіль та допоможуть роботодавцям краще оцінити вашу відповідність.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as "employer" | "standard");
              setSelectedModel(null);
            }}
            className="mt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employer" className="gap-2">
                <Building2 className="h-4 w-4" />
                Від роботодавців
                {employerModels.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {employerModels.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="standard" className="gap-2">
                <User className="h-4 w-4" />
                Стандартні
              </TabsTrigger>
            </TabsList>

            <TabsContent value="employer" className="mt-4">
              {employerModels.length > 0 ? (
                <RadioGroup value={selectedModel || ""} onValueChange={setSelectedModel}>
                  <div className="space-y-3">
                    {employerModels.map((model) => (
                      <CompetencyCard key={model.id} model={model} />
                    ))}
                  </div>
                </RadioGroup>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Наразі немає запрошень від роботодавців</p>
                  <p className="text-xs mt-1">
                    Виконуйте кейси, щоб отримати персональні запрошення
                  </p>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      Як це працює?
                    </p>
                    <p>
                      Роботодавці можуть запропонувати вам пройти оцінку за їхньою
                      моделлю компетенцій. Це допомагає їм краще зрозуміти вашу
                      відповідність конкретній позиції.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="standard" className="mt-4">
              <RadioGroup value={selectedModel || ""} onValueChange={setSelectedModel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {standardModels.map((model) => (
                    <CompetencyCard key={model.id} model={model} />
                  ))}
                </div>
              </RadioGroup>

              <div className="mt-4 p-3 rounded-lg bg-accent/30 border border-border">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">
                      Універсальні оцінки
                    </p>
                    <p>
                      Стандартні моделі компетенцій дозволяють продемонструвати
                      ваші навички всім роботодавцям на платформі.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {selectedModelData && (
            <div className="mt-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-foreground">{selectedModelData.name}</p>
                  {selectedModelData.company && (
                    <p className="text-xs text-muted-foreground">
                      від {selectedModelData.company}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">
                    {selectedModelData.duration}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedModelData.questions} питань
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {selectedModelData.competencies.map((comp, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {comp}
                  </Badge>
                ))}
              </div>

              <Button onClick={handleStartAssessment} className="w-full gap-2">
                <Target className="h-4 w-4" />
                Розпочати тестування
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
