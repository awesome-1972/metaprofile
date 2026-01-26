import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Video,
  Users,
  Target,
  Brain,
  FileText,
  Settings,
  Play,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import {
  mockInterviewers,
  mockCompetencyModels,
  mockInterviewQuestions,
} from "@/data/interviewData";

interface CreatedInterview {
  id: string;
  position: string;
  interviewer: string;
  competencyModel: string;
  questionsCount: number;
  duration: number;
  status: "draft" | "active" | "completed";
  candidatesCompleted: number;
}

const CompanyVirtualInterview = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("interviews");

  // Form state
  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedInterviewer, setSelectedInterviewer] = useState("");
  const [selectedCompetencyModel, setSelectedCompetencyModel] = useState("");
  const [customInterviewer, setCustomInterviewer] = useState({
    name: "",
    role: "",
    photo: "",
    personality: "",
  });
  const [useCustomInterviewer, setUseCustomInterviewer] = useState(false);

  // Mock created interviews
  const [interviews] = useState<CreatedInterview[]>([
    {
      id: "int-1",
      position: "Frontend Developer",
      interviewer: "Олена Петренко",
      competencyModel: "cm-frontend",
      questionsCount: 8,
      duration: 45,
      status: "active",
      candidatesCompleted: 12,
    },
    {
      id: "int-2",
      position: "Product Manager",
      interviewer: "Марія Шевченко",
      competencyModel: "cm-pm",
      questionsCount: 10,
      duration: 60,
      status: "active",
      candidatesCompleted: 5,
    },
    {
      id: "int-3",
      position: "Backend Developer",
      interviewer: "Андрій Коваль",
      competencyModel: "cm-frontend",
      questionsCount: 8,
      duration: 45,
      status: "draft",
      candidatesCompleted: 0,
    },
  ]);

  const handleCreateInterview = () => {
    // Here would be actual creation logic
    setIsCreateDialogOpen(false);
    // Reset form
    setSelectedPosition("");
    setSelectedInterviewer("");
    setSelectedCompetencyModel("");
    setUseCustomInterviewer(false);
  };

  return (
    <AppLayout role="company">
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Віртуальні співбесіди</h1>
            <p className="text-muted-foreground mt-1">
              Створюйте AI-співбесіди з оцінкою компетенцій та STAR-аналізом
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Створити співбесіду
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Створення віртуальної співбесіди
                </DialogTitle>
                <DialogDescription>
                  Налаштуйте AI-інтерв'юера та модель компетенцій для автоматизованої оцінки кандидатів
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Position */}
                <div className="space-y-2">
                  <Label>Позиція</Label>
                  <Input
                    placeholder="Наприклад: Frontend Developer"
                    value={selectedPosition}
                    onChange={(e) => setSelectedPosition(e.target.value)}
                  />
                </div>

                {/* Competency Model */}
                <div className="space-y-2">
                  <Label>Модель компетенцій</Label>
                  <Select value={selectedCompetencyModel} onValueChange={setSelectedCompetencyModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть або створіть модель" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCompetencyModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.positionTitle}
                        </SelectItem>
                      ))}
                      <SelectItem value="create-new">+ Створити нову модель</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedCompetencyModel && selectedCompetencyModel !== "create-new" && (
                    <div className="p-3 rounded-lg bg-accent/30 border border-border mt-2">
                      <p className="text-sm font-medium text-foreground mb-2">Компетенції:</p>
                      <div className="flex flex-wrap gap-1">
                        {mockCompetencyModels
                          .find((m) => m.id === selectedCompetencyModel)
                          ?.competencies.map((c, i) => (
                            <Badge key={i} variant={c.category === "hard" ? "default" : "secondary"}>
                              {c.name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interviewer Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>AI-інтерв'юер</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUseCustomInterviewer(!useCustomInterviewer)}
                    >
                      {useCustomInterviewer ? "Обрати існуючого" : "Створити власного"}
                    </Button>
                  </div>

                  {!useCustomInterviewer ? (
                    <div className="grid grid-cols-2 gap-3">
                      {mockInterviewers.map((interviewer) => (
                        <div
                          key={interviewer.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedInterviewer === interviewer.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedInterviewer(interviewer.id)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={interviewer.photo} />
                              <AvatarFallback>{interviewer.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {interviewer.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{interviewer.role}</p>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {interviewer.personality}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 rounded-lg border border-border">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Ім'я</Label>
                          <Input
                            placeholder="Ім'я співробітника"
                            value={customInterviewer.name}
                            onChange={(e) =>
                              setCustomInterviewer({ ...customInterviewer, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Посада</Label>
                          <Input
                            placeholder="HR Manager"
                            value={customInterviewer.role}
                            onChange={(e) =>
                              setCustomInterviewer({ ...customInterviewer, role: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">URL фото</Label>
                        <Input
                          placeholder="https://..."
                          value={customInterviewer.photo}
                          onChange={(e) =>
                            setCustomInterviewer({ ...customInterviewer, photo: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Опис особистості</Label>
                        <Textarea
                          placeholder="Дружній, уважний до деталей, фокусується на soft skills..."
                          value={customInterviewer.personality}
                          onChange={(e) =>
                            setCustomInterviewer({
                              ...customInterviewer,
                              personality: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Question Settings */}
                <div className="space-y-2">
                  <Label>Налаштування питань</Label>
                  <div className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Поведінкові (STAR)</span>
                      <Badge>4 питання</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Технічні</span>
                      <Badge>3 питання</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Ситуаційні</span>
                      <Badge>2 питання</Badge>
                    </div>
                    <div className="pt-2 border-t border-border flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Орієнтовна тривалість</span>
                      <span className="text-sm text-muted-foreground">~45 хвилин</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Скасувати
                  </Button>
                  <Button onClick={handleCreateInterview}>Створити співбесіду</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-sm text-muted-foreground">Активних співбесід</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/10">
                  <Users className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">17</p>
                  <p className="text-sm text-muted-foreground">Кандидатів пройшли</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <Target className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">78%</p>
                  <p className="text-sm text-muted-foreground">Середній бал</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <Brain className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-sm text-muted-foreground">Hire рекомендацій</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="interviews" className="gap-2">
              <Video className="h-4 w-4" />
              Співбесіди
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Результати
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Налаштування
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interviews" className="mt-6">
            <div className="grid gap-4">
              {interviews.map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-primary/10">
                          <Video className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">{interview.position}</h3>
                          <p className="text-sm text-muted-foreground">
                            Інтерв'юер: {interview.interviewer} • {interview.questionsCount} питань •{" "}
                            ~{interview.duration} хв
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge
                            variant={interview.status === "active" ? "default" : "secondary"}
                          >
                            {interview.status === "active"
                              ? "Активна"
                              : interview.status === "draft"
                              ? "Чернетка"
                              : "Завершена"}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            {interview.candidatesCompleted} кандидатів
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {interview.status === "draft" && (
                            <Button size="icon">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="results" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Результати кандидатів</CardTitle>
                <CardDescription>
                  Перегляд звітів та рекомендацій за результатами AI-співбесід
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: "Олена Коваленко", position: "Frontend Developer", score: 87, recommendation: "hire" },
                    { name: "Андрій Мельник", position: "Frontend Developer", score: 72, recommendation: "maybe" },
                    { name: "Марія Іванова", position: "Product Manager", score: 91, recommendation: "strong_hire" },
                  ].map((candidate, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{candidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{candidate.score}%</p>
                          <Badge
                            variant={
                              candidate.recommendation === "strong_hire" || candidate.recommendation === "hire"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {candidate.recommendation === "strong_hire"
                              ? "Strong Hire"
                              : candidate.recommendation === "hire"
                              ? "Hire"
                              : "Maybe"}
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Звіт
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Налаштування співбесід</CardTitle>
                <CardDescription>
                  Загальні параметри для всіх віртуальних співбесід компанії
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium text-foreground mb-2">Корпоративний стиль</h4>
                  <p className="text-sm text-muted-foreground">
                    AI-інтерв'юери будуть дотримуватись корпоративного tone of voice вашої компанії
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <h4 className="font-medium text-foreground mb-2">Автоматичний фідбек</h4>
                  <p className="text-sm text-muted-foreground">
                    Кандидати автоматично отримують детальний звіт після завершення співбесіди
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default CompanyVirtualInterview;
