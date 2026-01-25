import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Clock, Play, Pause, CheckCircle2, 
  FileText, Send, RotateCcw, Target,
  Lightbulb, ChevronRight, ArrowLeft, Briefcase,
  Building2, Users, Star, MapPin, MessageSquare,
  Calendar, Coffee, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AIInsightCard } from "@/components/ui/AIInsightCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { internshipCases, getInternshipByRole, InternshipCase } from "@/data/internshipCases";
import { virtualCompanies, industryCategories, VirtualCompany, VirtualMeeting, VirtualTask } from "@/data/virtualCompanies";

type InternshipStage = "map" | "company" | "office" | "intro" | "working" | "meeting" | "submitted" | "feedback";

const generateFeedback = (caseData: InternshipCase, company?: VirtualCompany) => ({
  overallScore: Math.floor(Math.random() * 20) + 70,
  strengths: [
    "Добре структурований аналіз",
    "Чітке формулювання проблеми",
    "Логічний зв'язок між спостереженнями"
  ],
  improvements: [
    "Додати кількісні прогнози для рекомендацій",
    "Враховувати ресурсні обмеження при пріоритизації",
    "Більше уваги до причинно-наслідкових зв'язків"
  ],
  competencyScores: caseData.competencies.map(comp => ({
    name: comp,
    score: Math.floor(Math.random() * 25) + 65,
    benchmark: Math.floor(Math.random() * 15) + 60
  })),
  cultureFit: company ? {
    score: Math.floor(Math.random() * 20) + 75,
    values: company.culture.values.slice(0, 3).map(v => ({
      name: v,
      match: Math.floor(Math.random() * 30) + 70
    }))
  } : undefined
});

const StudentInternship = () => {
  const [searchParams] = useSearchParams();
  const roleParam = searchParams.get("role");
  const companyParam = searchParams.get("company");
  
  const [stage, setStage] = useState<InternshipStage>(
    companyParam ? "office" : roleParam ? "intro" : "map"
  );
  const [selectedCase, setSelectedCase] = useState<InternshipCase | null>(
    roleParam ? getInternshipByRole(roleParam) || null : null
  );
  const [selectedCompany, setSelectedCompany] = useState<VirtualCompany | null>(
    companyParam ? virtualCompanies.find(c => c.id === companyParam) || null : null
  );
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [feedbackData, setFeedbackData] = useState<ReturnType<typeof generateFeedback> | null>(null);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [completedMeetings, setCompletedMeetings] = useState<string[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<VirtualMeeting | null>(null);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (selectedCase) {
      setTimeLeft(selectedCase.duration * 60);
    } else if (selectedCompany) {
      // 4 hours for company internship
      setTimeLeft(4 * 60 * 60);
    }
  }, [selectedCase, selectedCompany]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if ((stage === "working" || stage === "meeting") && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [stage, isPaused, timeLeft]);

  const selectCompany = (company: VirtualCompany) => {
    setSelectedCompany(company);
    setStage("office");
  };

  const selectCase = (internship: InternshipCase) => {
    setSelectedCase(internship);
    setTimeLeft(internship.duration * 60);
    setStage("intro");
  };

  const startInternship = () => {
    setStage("working");
  };

  const startMeeting = (meeting: VirtualMeeting) => {
    setCurrentMeeting(meeting);
    setStage("meeting");
  };

  const completeMeeting = () => {
    if (currentMeeting) {
      setCompletedMeetings([...completedMeetings, currentMeeting.id]);
    }
    setCurrentMeeting(null);
    setStage("working");
  };

  const completeTask = (taskId: string) => {
    setCompletedTasks([...completedTasks, taskId]);
  };

  const submitAnswer = () => {
    setStage("submitted");
    setTimeout(() => {
      if (selectedCase) {
        setFeedbackData(generateFeedback(selectedCase, selectedCompany || undefined));
      }
      setStage("feedback");
    }, 2000);
  };

  const showNextHint = () => {
    setShowHint(true);
    if (selectedCase && currentHint < selectedCase.hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  const restartCase = () => {
    setStage("intro");
    if (selectedCase) {
      setTimeLeft(selectedCase.duration * 60);
    }
    setAnswer("");
    setShowHint(false);
    setCurrentHint(0);
    setFeedbackData(null);
    setCompletedTasks([]);
    setCompletedMeetings([]);
  };

  const goToMap = () => {
    setStage("map");
    setSelectedCase(null);
    setSelectedCompany(null);
    setSelectedIndustry(null);
    setAnswer("");
    setShowHint(false);
    setCurrentHint(0);
    setFeedbackData(null);
    setCompletedTasks([]);
    setCompletedMeetings([]);
  };

  const progress = selectedCase 
    ? ((selectedCase.duration * 60 - timeLeft) / (selectedCase.duration * 60)) * 100 
    : selectedCompany
    ? ((4 * 60 * 60 - timeLeft) / (4 * 60 * 60)) * 100
    : 0;
  const isTimeWarning = timeLeft < 300;

  const currentOffice = selectedCompany?.offices[0];

  // Group cases by area for traditional mode
  const casesByArea = internshipCases.reduce((acc, internship) => {
    if (!acc[internship.area]) {
      acc[internship.area] = [];
    }
    acc[internship.area].push(internship);
    return acc;
  }, {} as Record<string, InternshipCase[]>);

  return (
    <AppLayout role="student">
      <div className="p-6 lg:p-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button onClick={goToMap} className="hover:text-foreground transition-colors">
            Міні-стажування
          </button>
          {selectedCompany && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedCompany.name}</span>
            </>
          )}
          {selectedCase && !selectedCompany && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedCase.role}</span>
            </>
          )}
        </div>

        {/* Company Map Stage */}
        {stage === "map" && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Мапа стажувань</h1>
              <p className="text-muted-foreground">
                Оберіть компанію та пройдіть реалістичне стажування з віртуальним керівником та наставником
              </p>
            </div>

            <Tabs defaultValue="companies" className="space-y-6">
              <TabsList>
                <TabsTrigger value="companies" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Компанії
                </TabsTrigger>
                <TabsTrigger value="professions" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  За професією
                </TabsTrigger>
              </TabsList>

              {/* Companies Tab */}
              <TabsContent value="companies" className="space-y-6">
                {/* Industry Filter */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedIndustry === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedIndustry(null)}
                  >
                    Усі сфери
                  </Button>
                  {industryCategories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedIndustry === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedIndustry(cat.id)}
                    >
                      <span className="mr-1">{cat.icon}</span>
                      {cat.name}
                    </Button>
                  ))}
                </div>

                {/* Companies Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {virtualCompanies
                    .filter(company => {
                      if (!selectedIndustry) return true;
                      const cat = industryCategories.find(c => c.id === selectedIndustry);
                      return cat?.companies.includes(company.id);
                    })
                    .map((company) => (
                      <Card 
                        key={company.id} 
                        className="cursor-pointer hover:border-primary/50 transition-all group"
                        onClick={() => selectCompany(company)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl">{company.logo}</div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                {company.name}
                              </CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {company.industry}
                                </Badge>
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {company.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                              <span>{company.rating}</span>
                              <span className="text-xs">({company.reviewsCount})</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{company.internshipDuration}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {company.culture.values.slice(0, 3).map((value, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {value}
                              </Badge>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-1">Доступні ролі:</p>
                            <p className="text-sm text-foreground">
                              {company.availableRoles.slice(0, 2).join(", ")}
                              {company.availableRoles.length > 2 && ` +${company.availableRoles.length - 2}`}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>

              {/* Professions Tab */}
              <TabsContent value="professions" className="space-y-6">
                {Object.entries(casesByArea).map(([area, cases]) => (
                  <div key={area}>
                    <h2 className="text-lg font-medium text-foreground mb-4">{area}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cases.map((internship) => (
                        <button
                          key={internship.id}
                          onClick={() => selectCase(internship)}
                          className="rounded-lg border border-border bg-card p-5 text-left hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Briefcase className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                                {internship.role}
                              </h3>
                              <p className="text-sm text-muted-foreground">{internship.company}</p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {internship.title}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{internship.duration} хв</span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {internship.competencies.length} компетенцій
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Company Office Stage */}
        {stage === "office" && selectedCompany && currentOffice && (
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" size="sm" onClick={goToMap} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад до мапи
            </Button>

            {/* Company Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{selectedCompany.logo}</div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-foreground">{selectedCompany.name}</h1>
                    <p className="text-muted-foreground mt-1">{selectedCompany.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedCompany.culture.values.map((value, i) => (
                        <Badge key={i} variant="secondary">{value}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg">
                      <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold">{selectedCompany.rating}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{selectedCompany.reviewsCount} відгуків</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Ваша команда
                </CardTitle>
                <CardDescription>Люди, з якими ви будете працювати під час стажування</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {currentOffice.employees.map((emp) => (
                    <div key={emp.id} className="p-4 rounded-lg border border-border bg-accent/30">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{emp.avatar}</span>
                        <div>
                          <p className="font-medium text-foreground">{emp.name}</p>
                          <p className="text-sm text-muted-foreground">{emp.position}</p>
                        </div>
                      </div>
                      <Badge variant={
                        emp.role === "manager" ? "default" :
                        emp.role === "buddy" ? "secondary" : "outline"
                      } className="mb-2">
                        {emp.role === "manager" && "👔 Ваш керівник"}
                        {emp.role === "buddy" && "🤝 Наставник-Buddy"}
                        {emp.role === "colleague" && "👥 Колега"}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{emp.personality}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Culture & Processes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Корпоративна культура</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Місія</p>
                    <p className="text-sm text-foreground">{selectedCompany.culture.mission}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Атмосфера</p>
                    <p className="text-sm text-foreground">{selectedCompany.culture.atmosphere}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Дрес-код</p>
                    <p className="text-sm text-foreground">{currentOffice.culture.dresscode}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Робочі процеси</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {currentOffice.processes.map((process, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="text-foreground">{process}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Schedule Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Розклад стажування
                </CardTitle>
                <CardDescription>Орієнтовний план на {selectedCompany.internshipDuration}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentOffice.meetings.map((meeting) => (
                    <div key={meeting.id} className="flex items-center gap-4 p-3 rounded-lg bg-accent/50">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {meeting.type === "standup" && <Coffee className="h-5 w-5 text-primary" />}
                        {meeting.type === "planning" && <Calendar className="h-5 w-5 text-primary" />}
                        {meeting.type === "review" && <FileText className="h-5 w-5 text-primary" />}
                        {meeting.type === "1on1" && <MessageSquare className="h-5 w-5 text-primary" />}
                        {meeting.type === "team" && <Video className="h-5 w-5 text-primary" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{meeting.title}</p>
                        <p className="text-sm text-muted-foreground">{meeting.description}</p>
                      </div>
                      <Badge variant="outline">{meeting.duration}</Badge>
                    </div>
                  ))}
                  {currentOffice.tasks.slice(0, 2).map((task) => (
                    <div key={task.id} className="flex items-center gap-4 p-3 rounded-lg border border-border">
                      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                        <Target className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{task.title}</p>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      <Badge variant={
                        task.priority === "high" ? "destructive" :
                        task.priority === "medium" ? "default" : "secondary"
                      }>
                        {task.estimatedTime}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button onClick={startInternship} size="lg" className="w-full">
              <Play className="h-5 w-5 mr-2" />
              Розпочати стажування в {selectedCompany.name}
            </Button>

            <AIInsightCard
              title="Що вас очікує"
              insight={`Ви проведете ${selectedCompany.internshipDuration} у віртуальному офісі ${selectedCompany.name}. Вас чекають реальні завдання, зустрічі з командою та зворотній зв'язок від керівника.`}
              factors={[
                { label: "Керівник", value: currentOffice.employees.find(e => e.role === "manager")?.name || "Призначено", weight: 100 },
                { label: "Наставник", value: currentOffice.employees.find(e => e.role === "buddy")?.name || "Призначено", weight: 90 },
                { label: "Завдань", value: `${currentOffice.tasks.length} задач`, weight: 80 }
              ]}
              methodology="Стажування симулює реальний робочий день з урахуванням корпоративної культури компанії."
            />
          </div>
        )}

        {/* Working Stage with Company Context */}
        {stage === "working" && selectedCompany && currentOffice && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Timer Bar */}
              <div className={`rounded-lg border p-4 ${isTimeWarning ? "border-destructive bg-destructive/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedCompany.logo}</span>
                    <div>
                      <p className="font-medium text-foreground">{selectedCompany.name}</p>
                      <p className="text-sm text-muted-foreground">{currentOffice.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-5 w-5 ${isTimeWarning ? "text-destructive" : "text-muted-foreground"}`} />
                      <span className={`text-lg font-mono font-semibold ${isTimeWarning ? "text-destructive" : "text-foreground"}`}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Progress value={progress} className={`h-2 ${isTimeWarning ? "[&>div]:bg-destructive" : ""}`} />
              </div>

              {/* Meetings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Зустрічі
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {currentOffice.meetings.map((meeting) => {
                    const isCompleted = completedMeetings.includes(meeting.id);
                    return (
                      <div 
                        key={meeting.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          isCompleted ? "border-primary/50 bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isCompleted ? "bg-primary text-primary-foreground" : "bg-accent"
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            {meeting.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {meeting.participants.join(", ")} • {meeting.duration}
                          </p>
                        </div>
                        {!isCompleted && (
                          <Button size="sm" onClick={() => startMeeting(meeting)}>
                            Приєднатися
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Tasks */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Завдання
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentOffice.tasks.map((task) => {
                    const isCompleted = completedTasks.includes(task.id);
                    return (
                      <div 
                        key={task.id} 
                        className={`p-4 rounded-lg border ${
                          isCompleted ? "border-primary/50 bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {isCompleted && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            <h4 className={`font-medium ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {task.title}
                            </h4>
                          </div>
                          <Badge variant={
                            task.priority === "high" ? "destructive" :
                            task.priority === "medium" ? "default" : "secondary"
                          }>
                            {task.priority === "high" ? "Терміново" : 
                             task.priority === "medium" ? "Важливо" : "Звичайне"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-1">
                            {task.skills.map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                          {!isCompleted && (
                            <Button size="sm" variant="outline" onClick={() => completeTask(task.id)}>
                              Виконано
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Submit */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Підсумок стажування</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Опишіть, що ви зробили, що дізналися, та які висновки зробили про роботу в цій компанії..."
                    className="min-h-[150px] resize-none mb-4"
                  />
                  <Button 
                    onClick={submitAnswer} 
                    disabled={answer.length < 50 || completedTasks.length < 1}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Завершити стажування
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Team Chat */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Чат з командою
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {currentOffice.employees.map((emp) => (
                    <div key={emp.id} className="flex items-start gap-2">
                      <span className="text-lg">{emp.avatar}</span>
                      <div className="flex-1 p-2 rounded-lg bg-accent/50">
                        <p className="text-xs font-medium text-foreground mb-1">{emp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {emp.role === "manager" && "Перегляньте завдання та розпочніть з найтерміновішого. Якщо будуть питання — звертайтесь."}
                          {emp.role === "buddy" && "Привіт! Я тут, щоб допомогти. Не соромся питати будь-що! 😊"}
                          {emp.role === "colleague" && "Ласкаво просимо до команди! Якщо потрібна допомога з технічними питаннями — пиши."}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Прогрес</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Зустрічі</span>
                      <span className="font-medium">{completedMeetings.length}/{currentOffice.meetings.length}</span>
                    </div>
                    <Progress value={(completedMeetings.length / currentOffice.meetings.length) * 100} className="h-2" />
                    
                    <div className="flex items-center justify-between text-sm mt-4">
                      <span className="text-muted-foreground">Завдання</span>
                      <span className="font-medium">{completedTasks.length}/{currentOffice.tasks.length}</span>
                    </div>
                    <Progress value={(completedTasks.length / currentOffice.tasks.length) * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Meeting Stage */}
        {stage === "meeting" && currentMeeting && currentOffice && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Video className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{currentMeeting.title}</CardTitle>
                    <CardDescription>{currentMeeting.duration}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">{currentMeeting.description}</p>

                <div>
                  <h4 className="font-medium text-foreground mb-3">Учасники</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentMeeting.participants.map((name, i) => {
                      const emp = currentOffice.employees.find(e => e.name === name);
                      return (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
                          <span className="text-lg">{emp?.avatar || "👤"}</span>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
                      <span className="text-lg">🧑‍💻</span>
                      <span className="text-sm font-medium">Ви</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent/50">
                  <h4 className="font-medium text-foreground mb-2">Симуляція зустрічі</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {currentMeeting.type === "standup" && "Кожен член команди ділиться своїм прогресом: що зробив вчора, що планує сьогодні, які є блокери."}
                    {currentMeeting.type === "planning" && "Команда обговорює завдання на тиждень, оцінює складність та розподіляє задачі."}
                    {currentMeeting.type === "review" && "Огляд виконаної роботи, демонстрація результатів та збір фідбеку."}
                    {currentMeeting.type === "1on1" && "Персональна зустріч з наставником для обговорення вашого прогресу та відповідей на питання."}
                    {currentMeeting.type === "team" && "Загальна командна зустріч для синхронізації та обговорення важливих питань."}
                  </p>
                </div>

                <Button onClick={completeMeeting} className="w-full">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Завершити зустріч
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Traditional Case Intro Stage */}
        {stage === "intro" && selectedCase && !selectedCompany && (
          <div className="max-w-3xl mx-auto">
            <Button variant="ghost" size="sm" onClick={goToMap} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад до вибору
            </Button>

            <div className="rounded-lg border border-border bg-card p-8 mb-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-foreground">{selectedCase.title}</h1>
                  <p className="text-muted-foreground mt-1">
                    Роль: {selectedCase.role} • Компанія: {selectedCase.company}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-foreground mb-2">Опис завдання</h3>
                  <p className="text-muted-foreground">{selectedCase.description}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Контекст</h3>
                  <p className="text-muted-foreground">{selectedCase.context}</p>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Ваші завдання</h3>
                  <ul className="space-y-2">
                    {selectedCase.tasks.map((task, index) => (
                      <li key={index} className="flex items-start gap-2 text-muted-foreground">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                          {index + 1}
                        </span>
                        {task}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-foreground mb-2">Компетенції, що оцінюються</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCase.competencies.map((comp) => (
                      <Badge key={comp} variant="secondary">{comp}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Час на виконання: {selectedCase.duration} хвилин</p>
                    <p className="text-sm text-muted-foreground">Таймер почнеться після натискання кнопки "Розпочати"</p>
                  </div>
                </div>
              </div>

              <Button onClick={() => setStage("working")} className="w-full mt-6" size="lg">
                <Play className="h-5 w-5 mr-2" />
                Розпочати міні-стажування
              </Button>
            </div>
          </div>
        )}

        {/* Traditional Working Stage */}
        {stage === "working" && selectedCase && !selectedCompany && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Timer Bar */}
              <div className={`rounded-lg border p-4 ${isTimeWarning ? "border-destructive bg-destructive/5" : "border-border bg-card"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${isTimeWarning ? "text-destructive" : "text-muted-foreground"}`} />
                    <span className={`text-lg font-mono font-semibold ${isTimeWarning ? "text-destructive" : "text-foreground"}`}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                      {isPaused ? "Продовжити" : "Пауза"}
                    </Button>
                  </div>
                </div>
                <Progress value={progress} className={`h-2 ${isTimeWarning ? "[&>div]:bg-destructive" : ""}`} />
              </div>

              {/* Case Content */}
              <div className="rounded-lg border border-border bg-card p-6">
                <h2 className="text-lg font-medium text-foreground mb-4">{selectedCase.title}</h2>
                
                {/* Data Table */}
                {selectedCase.data && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-3">Дані для аналізу</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Метрика</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Q1</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Q2</th>
                            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Зміна</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedCase.data.map((row, index) => (
                            <tr key={index} className="border-b border-border">
                              <td className="py-2 px-3 text-foreground">{row.metric}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{row.q1}</td>
                              <td className="py-2 px-3 text-right text-muted-foreground">{row.q2}</td>
                              <td className={`py-2 px-3 text-right font-medium ${
                                row.change.startsWith('+') ? "text-primary" : 
                                row.change.startsWith('-') ? "text-destructive" : "text-muted-foreground"
                              }`}>
                                {row.change}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Context reminder */}
                <div className="mb-6 p-4 rounded-md bg-muted/50">
                  <h3 className="text-sm font-medium text-foreground mb-2">Контекст</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.context}</p>
                </div>

                {/* Answer Area */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">Ваша відповідь</h3>
                  <Textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Напишіть ваш аналіз та рекомендації тут..."
                    className="min-h-[250px] resize-none"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-sm text-muted-foreground">
                      {answer.length} символів
                    </p>
                    <Button onClick={submitAnswer} disabled={answer.length < 100}>
                      <Send className="h-4 w-4 mr-2" />
                      Надіслати відповідь
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-medium text-foreground mb-3">Завдання</h3>
                <ul className="space-y-2">
                  {selectedCase.tasks.map((task, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium mt-0.5">
                        {index + 1}
                      </span>
                      {task}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground">Підказки</h3>
                  <Badge variant="outline">{currentHint + 1}/{selectedCase.hints.length}</Badge>
                </div>
                {showHint ? (
                  <div className="space-y-3">
                    {selectedCase.hints.slice(0, currentHint + 1).map((hint, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-muted-foreground">{hint}</p>
                      </div>
                    ))}
                    {currentHint < selectedCase.hints.length - 1 && (
                      <Button variant="ghost" size="sm" onClick={showNextHint} className="w-full mt-2">
                        Наступна підказка
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={showNextHint} className="w-full">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Показати підказку
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submitted Stage */}
        {stage === "submitted" && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Обробка відповіді...</h2>
            <p className="text-muted-foreground">Зачекайте, поки система аналізує вашу роботу</p>
          </div>
        )}

        {/* Feedback Stage */}
        {stage === "feedback" && feedbackData && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-primary">{feedbackData.overallScore}%</span>
              </div>
              <h1 className="text-2xl font-semibold text-foreground">Стажування завершено!</h1>
              <p className="text-muted-foreground mt-1">
                {selectedCompany ? `Ви пройшли стажування в ${selectedCompany.name}` : `Ви виконали кейс "${selectedCase?.title}"`}
              </p>
            </div>

            {/* Culture Fit (for company internships) */}
            {feedbackData.cultureFit && selectedCompany && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Відповідність корпоративній культурі
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-3xl font-bold text-primary">{feedbackData.cultureFit.score}%</div>
                    <p className="text-muted-foreground">
                      Ваш стиль роботи добре відповідає культурі {selectedCompany.name}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {feedbackData.cultureFit.values.map((value, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">{value.name}</span>
                          <span className="text-muted-foreground">{value.match}%</span>
                        </div>
                        <Progress value={value.match} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    Сильні сторони
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedbackData.strengths.map((strength, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary">✓</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Зони розвитку
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feedbackData.improvements.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Оцінка компетенцій</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {feedbackData.competencyScores.map((comp, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-foreground">{comp.name}</span>
                        <span className="font-medium text-foreground">{comp.score}%</span>
                      </div>
                      <div className="relative">
                        <Progress value={comp.score} className="h-3" />
                        <div 
                          className="absolute top-0 h-3 w-0.5 bg-muted-foreground"
                          style={{ left: `${comp.benchmark}%` }}
                          title={`Середній показник: ${comp.benchmark}%`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <AIInsightCard
              title="Персоналізовані висновки"
              insight={`На основі вашого стажування ${selectedCompany ? `в ${selectedCompany.name}` : ""}, ми бачимо потенціал у ролях, що потребують аналітичного мислення та структурованого підходу до вирішення проблем.`}
              factors={feedbackData.competencyScores.slice(0, 3).map(c => ({
                label: c.name,
                value: c.score >= 80 ? "Високий" : c.score >= 60 ? "Середній" : "Розвивати",
                weight: c.score
              }))}
              methodology="Аналіз базується на якості виконання завдань, часі на виконання та відповідності очікуваним результатам."
            />

            <div className="flex gap-4">
              <Button variant="outline" onClick={restartCase} className="flex-1">
                <RotateCcw className="h-4 w-4 mr-2" />
                Спробувати ще раз
              </Button>
              <Button onClick={goToMap} className="flex-1">
                Обрати інше стажування
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default StudentInternship;
