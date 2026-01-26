import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Video,
  Play,
  Clock,
  Target,
  Building2,
  GraduationCap,
  FileText,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  mockInterviewers,
  mockCompetencyModels,
  mockInterviewQuestions,
  companiesWithInterviews,
} from "@/data/interviewData";
import { InterviewScreen } from "@/components/interview/InterviewScreen";
import { InterviewReport } from "@/components/interview/InterviewReport";

interface CandidateInterviewPageProps {
  role: "student" | "professional" | "veteran";
}

export const CandidateInterviewPage = ({ role }: CandidateInterviewPageProps) => {
  const [activeTab, setActiveTab] = useState<"available" | "completed">("available");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [interviewType, setInterviewType] = useState<"training" | "real">("training");
  const [isPreparingInterview, setIsPreparingInterview] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [interviewResult, setInterviewResult] = useState<any>(null);

  const roleConfig = {
    student: { title: "Студент", icon: GraduationCap },
    professional: { title: "Професіонал", icon: Target },
    veteran: { title: "Ветеран", icon: Target },
  };

  const handleStartInterview = () => {
    setIsPreparingInterview(false);
    setIsInterviewActive(true);
  };

  const handleInterviewComplete = (result: any) => {
    setInterviewResult(result);
    setIsInterviewActive(false);
    setShowReport(true);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setInterviewResult(null);
    setSelectedCompany(null);
    setSelectedPosition(null);
  };

  const handleSendToCompany = () => {
    // Here would be logic to send interview to company
    handleCloseReport();
  };

  // Mock completed interviews
  const completedInterviews = [
    {
      id: "ci-1",
      company: "TechCorp Ukraine",
      position: "Frontend Developer",
      date: "2024-01-20",
      score: 82,
      recommendation: "hire",
      type: "training" as const,
    },
    {
      id: "ci-2",
      company: "FinTech Solutions",
      position: "Data Analyst",
      date: "2024-01-18",
      score: 75,
      recommendation: "maybe",
      type: "real" as const,
      sentToCompany: true,
    },
  ];

  if (isInterviewActive) {
    const interviewer = mockInterviewers[0];
    const company = companiesWithInterviews.find((c) => c.id === selectedCompany);
    
    return (
      <AppLayout role={role}>
        <InterviewScreen
          interviewer={interviewer}
          companyName={company?.name || "Компанія"}
          positionTitle={selectedPosition || "Позиція"}
          questions={mockInterviewQuestions.slice(0, 5)}
          interviewType={interviewType}
          onComplete={handleInterviewComplete}
          onExit={() => setIsInterviewActive(false)}
        />
      </AppLayout>
    );
  }

  if (showReport && interviewResult) {
    const company = companiesWithInterviews.find((c) => c.id === selectedCompany);
    
    return (
      <AppLayout role={role}>
        <InterviewReport
          report={interviewResult.report}
          positionTitle={selectedPosition || "Позиція"}
          companyName={company?.name || "Компанія"}
          interviewType={interviewType}
          onClose={handleCloseReport}
          onSendToCompany={interviewType === "real" ? handleSendToCompany : undefined}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout role={role}>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Пройти інтерв'ю</h1>
          <p className="text-muted-foreground mt-1">
            Тренувальні та офіційні AI-співбесіди з реальними компаніями
          </p>
        </div>

        {/* Interview Types Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Тренувальне інтерв'ю</h3>
                  <p className="text-sm text-muted-foreground">
                    Практикуйтесь без тиску. Результати видно лише вам. 
                    Отримуйте детальний фідбек для покращення навичок.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-dashed border-destructive/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-destructive/10">
                  <Video className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground mb-1">Офіційне інтерв'ю</h3>
                  <p className="text-sm text-muted-foreground">
                    Запис співбесіди зберігається. Можете надіслати результат 
                    компанії або вони самі побачать його в базі кандидатів.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "available" | "completed")}>
          <TabsList>
            <TabsTrigger value="available" className="gap-2">
              <Building2 className="h-4 w-4" />
              Доступні співбесіди
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Пройдені
            </TabsTrigger>
          </TabsList>

          <TabsContent value="available" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companiesWithInterviews.map((company) => (
                <Card key={company.id} className="hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={company.logo} />
                        <AvatarFallback>{company.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{company.name}</CardTitle>
                        <CardDescription>{company.industry}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {company.positions.map((pos, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {pos}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {company.interviewsAvailable} позицій
                        </span>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedCompany(company.id);
                            setIsPreparingInterview(true);
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Почати
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="space-y-4">
              {completedInterviews.map((interview) => (
                <Card key={interview.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback>{interview.company.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{interview.position}</p>
                          <p className="text-sm text-muted-foreground">{interview.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{interview.score}%</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={interview.type === "real" ? "destructive" : "secondary"}>
                              {interview.type === "real" ? "Офіційна" : "Тренувальна"}
                            </Badge>
                            {interview.sentToCompany && (
                              <Badge variant="outline" className="text-xs">
                                Надіслано
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          Звіт
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Interview Preparation Dialog */}
        <Dialog open={isPreparingInterview} onOpenChange={setIsPreparingInterview}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Підготовка до співбесіди</DialogTitle>
              <DialogDescription>
                Оберіть позицію та тип співбесіди
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Company info */}
              {selectedCompany && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                  <Avatar>
                    <AvatarFallback>
                      {companiesWithInterviews.find((c) => c.id === selectedCompany)?.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {companiesWithInterviews.find((c) => c.id === selectedCompany)?.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {companiesWithInterviews.find((c) => c.id === selectedCompany)?.industry}
                    </p>
                  </div>
                </div>
              )}

              {/* Position selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Позиція</label>
                <Select value={selectedPosition || ""} onValueChange={setSelectedPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть позицію" />
                  </SelectTrigger>
                  <SelectContent>
                    {companiesWithInterviews
                      .find((c) => c.id === selectedCompany)
                      ?.positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Interview type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Тип співбесіди</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      interviewType === "training"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setInterviewType("training")}
                  >
                    <GraduationCap className="h-5 w-5 text-primary mb-2" />
                    <p className="font-medium text-foreground text-sm">Тренувальна</p>
                    <p className="text-xs text-muted-foreground">Без запису</p>
                  </div>
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      interviewType === "real"
                        ? "border-destructive bg-destructive/5"
                        : "border-border hover:border-destructive/50"
                    }`}
                    onClick={() => setInterviewType("real")}
                  >
                    <Video className="h-5 w-5 text-destructive mb-2" />
                    <p className="font-medium text-foreground text-sm">Офіційна</p>
                    <p className="text-xs text-muted-foreground">Під запис</p>
                  </div>
                </div>
              </div>

              {interviewType === "real" && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-sm text-foreground">
                      Офіційна співбесіда записується і може бути надіслана компанії. 
                      Переконайтесь, що ви готові.
                    </p>
                  </div>
                </div>
              )}

              {/* Duration info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Орієнтовна тривалість: 30-45 хвилин</span>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsPreparingInterview(false)} className="flex-1">
                  Скасувати
                </Button>
                <Button
                  onClick={handleStartInterview}
                  disabled={!selectedPosition}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Почати
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default CandidateInterviewPage;
