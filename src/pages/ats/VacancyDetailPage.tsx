import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  MapPin,
  Plus,
  Users,
  Video,
} from "lucide-react";
import { useVacancy } from "@/hooks/ats/use-vacancies";
import { usePipelineStages, useSeedVacancyStages } from "@/hooks/ats/use-pipeline";
import {
  useApplicationsByStage,
  useCreateApplication,
  useMoveApplication,
  type ApplicationWithCandidate,
} from "@/hooks/ats/use-applications";
import { useCandidates, useCandidateSources, useCreateCandidate, useSearchCandidates } from "@/hooks/ats/use-candidates";
import { useAssignRecruiter, useProfilesList } from "@/hooks/ats/use-grants";
import {
  useQueueBatchCommunication,
  useSendBatchCommunication,
  useCancelBatchCommunication,
} from "@/hooks/ats/use-communications";
import { useScheduleInterview, useUpcomingInterviewsByApplications } from "@/hooks/ats/use-interviews";
import { BriefTab } from "@/components/ats/BriefTab";
import { CompetenciesTab } from "@/components/ats/CompetenciesTab";
import { ReportsTab } from "@/components/ats/ReportsTab";
import { ComparisonMatrixTab } from "@/components/ats/ComparisonMatrixTab";
import { CompetencyScoreDialog } from "@/components/ats/CompetencyScoreDialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Database } from "@/integrations/supabase/types";

type VacancyStatus = Database["public"]["Enums"]["vacancy_status"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];

const vacancyStatusLabel: Record<VacancyStatus, string> = {
  draft: "Чернетка",
  open: "Відкрита",
  on_hold: "На паузі",
  filled: "Закрита наймом",
  closed: "Закрита",
  cancelled: "Скасована",
};

const vacancyStatusColor: Record<VacancyStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  filled: "bg-blue-100 text-blue-800",
  closed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const employmentTypeLabel: Record<EmploymentType, string> = {
  full_time: "Повна зайнятість",
  part_time: "Часткова зайнятість",
  contract: "Контракт",
  internship: "Стажування",
  temporary: "Тимчасова",
};

function daysSince(dateIso: string): number {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

const newCandidateFormSchema = z.object({
  full_name: z.string().min(1, "Ім'я обов'язкове"),
  email: z.string().email("Некоректний email").optional().or(z.literal("")),
  phone: z.string().optional(),
  source_id: z.string().optional(),
  telegram: z.string().optional(),
  viber: z.string().optional(),
  whatsapp: z.string().optional(),
  linkedin: z.string().optional(),
  facebook: z.string().optional(),
});

type NewCandidateFormValues = z.infer<typeof newCandidateFormSchema>;

const VacancyDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: vacancy, isLoading, isError, error } = useVacancy(id);
  const { data: stages, isLoading: stagesLoading } = usePipelineStages(id);
  const { groupedData: applicationsByStage, isLoading: applicationsLoading } = useApplicationsByStage(id);
  const seedStages = useSeedVacancyStages();
  const createApplication = useCreateApplication();
  const moveApplicationMutation = useMoveApplication();
  const createCandidate = useCreateCandidate();
  const { data: sources } = useCandidateSources();
  const { data: profiles } = useProfilesList();
  const assignRecruiter = useAssignRecruiter();
  const queueBatch = useQueueBatchCommunication();
  const sendBatch = useSendBatchCommunication();
  const cancelBatch = useCancelBatchCommunication();
  const scheduleInterview = useScheduleInterview();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [scoreDialogApplication, setScoreDialogApplication] = useState<ApplicationWithCandidate | null>(null);

  const [meetingDialogApplication, setMeetingDialogApplication] = useState<ApplicationWithCandidate | null>(null);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("60");
  const [meetingCandidateEmail, setMeetingCandidateEmail] = useState("");
  const [meetingNote, setMeetingNote] = useState("");
  const [meetingResult, setMeetingResult] = useState<{ meetLink: string | null; eventLink: string | null } | null>(null);

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<Set<string>>(new Set());
  const [bulkComposeOpen, setBulkComposeOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);

  const { data: allCandidates } = useCandidates();
  const { data: searchResults } = useSearchCandidates(search);
  const candidateOptions = search.trim() ? searchResults ?? [] : allCandidates ?? [];

  const newCandidateForm = useForm<NewCandidateFormValues>({
    resolver: zodResolver(newCandidateFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      source_id: "",
      telegram: "",
      viber: "",
      whatsapp: "",
      linkedin: "",
      facebook: "",
    },
  });

  const sortedStages = useMemo(() => [...(stages ?? [])].sort((a, b) => a.position - b.position), [stages]);

  const allApplicationsFlat = useMemo(
    () => Object.values(applicationsByStage).flat(),
    [applicationsByStage],
  );

  const { data: upcomingInterviewsByApplication } = useUpcomingInterviewsByApplications(
    allApplicationsFlat.map((a) => a.id),
  );

  const existingCandidateIds = useMemo(() => {
    return new Set(allApplicationsFlat.map((a) => a.candidate_id));
  }, [allApplicationsFlat]);

  const resetAddDialog = () => {
    setMode("existing");
    setSearch("");
    setSelectedCandidateId("");
    setSelectedSourceId("");
    newCandidateForm.reset();
  };

  const handleAddExisting = () => {
    if (!id || !selectedCandidateId) return;
    createApplication.mutate(
      { vacancy_id: id, candidate_id: selectedCandidateId },
      {
        onSuccess: () => {
          setAddDialogOpen(false);
          resetAddDialog();
        },
      },
    );
  };

  const handleCreateAndAdd = newCandidateForm.handleSubmit((values) => {
    if (!id) return;
    createCandidate.mutate(
      {
        full_name: values.full_name,
        email: values.email || null,
        phone: values.phone || null,
        source_id: values.source_id || null,
        // messengers — jsonb-колонка з міграції 20260706090000, ще не в
        // AtsCandidateInsert (types.ts не регенеровано); useCreateCandidate
        // приймає її окремим полем (TODO: типи після gen types).
        messengers: {
          telegram: values.telegram || undefined,
          viber: values.viber || undefined,
          whatsapp: values.whatsapp || undefined,
          linkedin: values.linkedin || undefined,
          facebook: values.facebook || undefined,
        },
      },
      {
        onSuccess: (candidate) => {
          createApplication.mutate(
            { vacancy_id: id, candidate_id: candidate.id },
            {
              onSuccess: () => {
                setAddDialogOpen(false);
                resetAddDialog();
              },
            },
          );
        },
      },
    );
  });

  const handleMoveTo = (application: ApplicationWithCandidate, direction: "prev" | "next") => {
    if (!id) return;
    const currentIndex = sortedStages.findIndex((s) => s.id === application.current_stage_id);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    const target = sortedStages[targetIndex];
    if (!target) return;
    moveApplicationMutation.mutate({ applicationId: application.id, stageId: target.id, vacancyId: id });
  };

  const handleMoveToStage = (application: ApplicationWithCandidate, stageId: string) => {
    if (!id) return;
    moveApplicationMutation.mutate({ applicationId: application.id, stageId, vacancyId: id });
  };

  const handleQueueBulk = () => {
    if (!id || !bulkBody.trim() || selectedForBulk.size === 0) return;
    queueBatch.mutate(
      {
        candidate_ids: Array.from(selectedForBulk),
        vacancy_id: id,
        subject: bulkSubject.trim() || undefined,
        body: bulkBody.trim(),
      },
      {
        onSuccess: ({ batch_id }) => {
          setBulkComposeOpen(false);
          setPendingBatchId(batch_id);
        },
      },
    );
  };

  const handleConfirmSendBatch = () => {
    if (!pendingBatchId) return;
    sendBatch.mutate(pendingBatchId, {
      onSuccess: () => {
        setPendingBatchId(null);
        setBulkMode(false);
        setSelectedForBulk(new Set());
        setBulkSubject("");
        setBulkBody("");
      },
    });
  };

  const handleCancelBatch = () => {
    if (!pendingBatchId) {
      setBulkComposeOpen(false);
      return;
    }
    cancelBatch.mutate(pendingBatchId, {
      onSuccess: () => {
        setPendingBatchId(null);
      },
    });
  };

  const openMeetingDialog = (application: ApplicationWithCandidate) => {
    setMeetingDialogApplication(application);
    setMeetingDate("");
    setMeetingDuration("60");
    setMeetingCandidateEmail(application.candidate?.email ?? "");
    setMeetingNote("");
    setMeetingResult(null);
  };

  const handleScheduleMeeting = () => {
    if (!meetingDialogApplication || !meetingDate) return;
    const scheduledAtIso = new Date(meetingDate).toISOString();
    scheduleInterview.mutate(
      {
        application_id: meetingDialogApplication.id,
        scheduled_at: scheduledAtIso,
        duration_minutes: Number(meetingDuration),
        candidate_email: meetingCandidateEmail.trim() || undefined,
        note: meetingNote.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setMeetingResult({ meetLink: data.meet_link, eventLink: data.event_link });
        },
      },
    );
  };

  const handleCopyMeetLink = () => {
    if (!meetingResult?.meetLink) return;
    navigator.clipboard
      .writeText(meetingResult.meetLink)
      .then(() => toast.success("Meet-лінк скопійовано"))
      .catch(() => toast.error("Не вдалося скопіювати"));
  };

  const handleCardDragStart = (e: React.DragEvent<HTMLDivElement>, application: ApplicationWithCandidate) => {
    setDraggedApplicationId(application.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", application.id);
  };

  const handleCardDragEnd = () => {
    setDraggedApplicationId(null);
    setDragOverStageId(null);
  };

  const handleColumnDragOver = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStageId !== stageId) setDragOverStageId(stageId);
  };

  const handleColumnDragLeave = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverStageId((current) => (current === stageId ? null : current));
  };

  const handleColumnDrop = (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
    e.preventDefault();
    const applicationId = draggedApplicationId ?? e.dataTransfer.getData("text/plain");
    setDraggedApplicationId(null);
    setDragOverStageId(null);
    if (!id || !applicationId) return;

    const application = Object.values(applicationsByStage)
      .flat()
      .find((a) => a.id === applicationId);
    if (!application || application.current_stage_id === stageId) return;

    moveApplicationMutation.mutate({ applicationId, stageId, vacancyId: id });
  };

  if (isLoading) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Завантаження...</div>
      </AtsLayout>
    );
  }

  if (isError || !vacancy) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8">
          <Button variant="ghost" onClick={() => navigate("/ats/vacancies")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            До списку вакансій
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Вакансію не знайдено або немає доступу"}
            </CardContent>
          </Card>
        </div>
      </AtsLayout>
    );
  }

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate("/ats/vacancies")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          До списку вакансій
        </Button>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{vacancy.title}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {vacancy.hiring_project && (
                <Link
                  to={`/ats/projects/${vacancy.hiring_project.id}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  {vacancy.hiring_project.name}
                </Link>
              )}
              {vacancy.hiring_project?.client && (
                <Link
                  to={`/ats/clients/${vacancy.hiring_project.client.id}`}
                  className="text-sm text-muted-foreground hover:underline flex items-center gap-1"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {vacancy.hiring_project.client.name}
                </Link>
              )}
              {vacancy.location && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {vacancy.location}
                  {vacancy.is_remote ? " (віддалено)" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={vacancyStatusColor[vacancy.status]}>{vacancyStatusLabel[vacancy.status]}</Badge>
              <span className="text-xs text-muted-foreground">
                {employmentTypeLabel[vacancy.employment_type]} · {vacancy.headcount} позиц.
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Відповідальний рекрутер</Label>
              <Select
                // TODO: типи після gen types — assigned_recruiter_id додано міграцією
                // 20260706090000, ще не в types.ts (Vacancy Row).
                value={(vacancy as unknown as { assigned_recruiter_id: string | null }).assigned_recruiter_id ?? ""}
                onValueChange={(recruiterId) => {
                  if (!id) return;
                  assignRecruiter.mutate({ vacancy_id: id, recruiter_id: recruiterId || null });
                }}
              >
                <SelectTrigger className="h-8 w-56 text-xs">
                  <SelectValue placeholder="Не призначено" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(() => {
                const assignedId = (vacancy as unknown as { assigned_recruiter_id: string | null })
                  .assigned_recruiter_id;
                const assignedProfile = (profiles ?? []).find((p) => p.user_id === assignedId);
                return assignedProfile ? (
                  <Badge variant="outline" className="text-xs">
                    {assignedProfile.full_name || assignedProfile.email}
                  </Badge>
                ) : null;
              })()}
            </div>
          </div>
          {activeTab === "pipeline" && (
            <div className="flex items-center gap-2">
              <Button
                variant={bulkMode ? "default" : "outline"}
                onClick={() => {
                  setBulkMode((v) => !v);
                  setSelectedForBulk(new Set());
                }}
              >
                Масова розсилка
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Додати кандидата
              </Button>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pipeline">Воронка</TabsTrigger>
            <TabsTrigger value="brief">Бріф</TabsTrigger>
            <TabsTrigger value="competencies">Компетенції</TabsTrigger>
            <TabsTrigger value="comparison">Порівняння</TabsTrigger>
            <TabsTrigger value="reports">Звіти</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="pt-4">
            {stagesLoading ? (
              <div className="text-center py-12 text-muted-foreground">Завантаження воронки...</div>
            ) : sortedStages.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>У вакансії ще немає стадій воронки</p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => id && seedStages.mutate({ vacancyId: id })}
                    disabled={seedStages.isPending}
                  >
                    {seedStages.isPending ? "Створення..." : "Створити стадії за замовчуванням"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {sortedStages.map((stage, stageIndex) => {
                    const cards = applicationsByStage[stage.id] ?? [];
                    return (
                      <div key={stage.id} className="w-72 flex-shrink-0">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <h3 className="font-medium text-sm text-foreground">{stage.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {cards.length}
                          </Badge>
                        </div>
                        <div
                          className={`space-y-2 min-h-[120px] rounded-lg p-2 transition-colors ${
                            dragOverStageId === stage.id ? "bg-accent ring-2 ring-primary" : "bg-muted/30"
                          }`}
                          onDragOver={(e) => handleColumnDragOver(e, stage.id)}
                          onDragLeave={(e) => handleColumnDragLeave(e, stage.id)}
                          onDrop={(e) => handleColumnDrop(e, stage.id)}
                        >
                          {applicationsLoading ? (
                            <div className="text-xs text-muted-foreground text-center py-4">Завантаження...</div>
                          ) : cards.length === 0 ? (
                            <div className="text-xs text-muted-foreground text-center py-4">Порожньо</div>
                          ) : (
                            cards.map((application) => (
                              <Card
                                key={application.id}
                                draggable
                                onDragStart={(e) => handleCardDragStart(e, application)}
                                onDragEnd={handleCardDragEnd}
                                className={`shadow-sm cursor-grab active:cursor-grabbing transition-opacity ${
                                  draggedApplicationId === application.id ? "opacity-50 ring-2 ring-primary" : ""
                                }`}
                              >
                                <CardContent className="p-3 space-y-2">
                                  <div className="flex items-start gap-2">
                                    {bulkMode && (
                                      <Checkbox
                                        className="mt-0.5"
                                        checked={selectedForBulk.has(application.candidate_id)}
                                        onCheckedChange={(checked) => {
                                          setSelectedForBulk((prev) => {
                                            const next = new Set(prev);
                                            if (checked) next.add(application.candidate_id);
                                            else next.delete(application.candidate_id);
                                            return next;
                                          });
                                        }}
                                      />
                                    )}
                                    <Link
                                      to={`/ats/candidates/${application.candidate_id}`}
                                      className="font-medium text-sm hover:underline block truncate flex-1"
                                    >
                                      {application.candidate?.full_name ?? "Без імені"}
                                    </Link>
                                  </div>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    <div>{application.candidate?.source?.name ?? "Джерело невідоме"}</div>
                                    <div>{daysSince(application.applied_at)} дн. на стадії/у процесі</div>
                                  </div>
                                  {upcomingInterviewsByApplication?.[application.id] && (
                                    <Badge variant="outline" className="text-xs gap-1 font-normal">
                                      <CalendarClock className="h-3 w-3" />
                                      {new Date(
                                        upcomingInterviewsByApplication[application.id].scheduled_at!,
                                      ).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                    </Badge>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs"
                                    onClick={() => setScoreDialogApplication(application)}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                    Оцінка компетенцій
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs"
                                    onClick={() => openMeetingDialog(application)}
                                  >
                                    <Video className="h-3.5 w-3.5 mr-1.5" />
                                    Зустріч
                                  </Button>
                                  <div className="flex items-center justify-between gap-1 pt-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      disabled={stageIndex === 0 || moveApplicationMutation.isPending}
                                      onClick={() => handleMoveTo(application, "prev")}
                                      title="Попередня стадія"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <Select
                                      value={application.current_stage_id ?? undefined}
                                      onValueChange={(stageId) => handleMoveToStage(application, stageId)}
                                    >
                                      <SelectTrigger className="h-7 text-xs flex-1">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {sortedStages.map((s) => (
                                          <SelectItem key={s.id} value={s.id} className="text-xs">
                                            {s.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-7 w-7"
                                      disabled={stageIndex === sortedStages.length - 1 || moveApplicationMutation.isPending}
                                      onClick={() => handleMoveTo(application, "next")}
                                      title="Наступна стадія"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bulkMode && selectedForBulk.size > 0 && (
              <div className="sticky bottom-4 mt-4 flex justify-center">
                <Card className="shadow-lg">
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-sm font-medium">Обрано {selectedForBulk.size}</span>
                    <Button size="sm" onClick={() => setBulkComposeOpen(true)}>
                      Написати всім
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedForBulk(new Set())}>
                      Скасувати вибір
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="brief" className="pt-4">
            {id && <BriefTab vacancyId={id} />}
          </TabsContent>

          <TabsContent value="competencies" className="pt-4">
            {id && <CompetenciesTab vacancyId={id} />}
          </TabsContent>

          <TabsContent value="comparison" className="pt-4">
            {id && <ComparisonMatrixTab vacancyId={id} />}
          </TabsContent>

          <TabsContent value="reports" className="pt-4">
            {id && <ReportsTab vacancyId={id} applications={allApplicationsFlat} />}
          </TabsContent>
        </Tabs>
      </div>

      {scoreDialogApplication && id && (
        <CompetencyScoreDialog
          open={!!scoreDialogApplication}
          onOpenChange={(open) => {
            if (!open) setScoreDialogApplication(null);
          }}
          vacancyId={id}
          applicationId={scoreDialogApplication.id}
          candidateName={scoreDialogApplication.candidate?.full_name ?? "Без імені"}
        />
      )}

      {/* Діалог "Зустріч" — призначення інтервʼю з Google Meet-лінком (schedule-interview) */}
      <Dialog
        open={!!meetingDialogApplication}
        onOpenChange={(open) => {
          if (!open) {
            setMeetingDialogApplication(null);
            setMeetingResult(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Запланувати зустріч</DialogTitle>
            <DialogDescription>
              {meetingDialogApplication?.candidate?.full_name ?? "Кандидат"} — створюється подія в Google Calendar
              з Meet-лінком (організатор — ви, поточний користувач)
            </DialogDescription>
          </DialogHeader>

          {!meetingResult ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-datetime">Дата й час *</Label>
                <Input
                  id="meeting-datetime"
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Тривалість</Label>
                <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 хв</SelectItem>
                    <SelectItem value="45">45 хв</SelectItem>
                    <SelectItem value="60">60 хв</SelectItem>
                    <SelectItem value="90">90 хв</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-candidate-email">Email кандидата</Label>
                <Input
                  id="meeting-candidate-email"
                  type="email"
                  value={meetingCandidateEmail}
                  onChange={(e) => setMeetingCandidateEmail(e.target.value)}
                  placeholder="candidate@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-note">Примітка</Label>
                <Textarea
                  id="meeting-note"
                  value={meetingNote}
                  onChange={(e) => setMeetingNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Зустріч заплановано. Google Meet-лінк:</p>
              <div className="flex items-center gap-2">
                <Input readOnly value={meetingResult.meetLink ?? "—"} className="text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopyMeetLink} disabled={!meetingResult.meetLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {meetingResult.eventLink && (
                <a
                  href={meetingResult.eventLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Відкрити подію в Google Calendar
                </a>
              )}
            </div>
          )}

          <DialogFooter>
            {!meetingResult ? (
              <>
                <Button type="button" variant="outline" onClick={() => setMeetingDialogApplication(null)}>
                  Скасувати
                </Button>
                <Button onClick={handleScheduleMeeting} disabled={!meetingDate || scheduleInterview.isPending}>
                  {scheduleInterview.isPending ? "Створення..." : "Створити зустріч"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setMeetingDialogApplication(null)}>Готово</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open);
          if (!open) resetAddDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Додати кандидата</DialogTitle>
            <DialogDescription>Оберіть наявного кандидата або створіть нового</DialogDescription>
          </DialogHeader>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="existing">Наявний кандидат</TabsTrigger>
              <TabsTrigger value="new">Новий кандидат</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="candidate-search">Пошук за іменем або email</Label>
                <Input
                  id="candidate-search"
                  placeholder="Введіть імʼя або email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Кандидат</Label>
                <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть кандидата" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateOptions.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Нічого не знайдено</div>
                    ) : (
                      candidateOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id} disabled={existingCandidateIds.has(c.id)}>
                          {c.full_name}
                          {c.email ? ` (${c.email})` : ""}
                          {existingCandidateIds.has(c.id) ? " — вже подано" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Скасувати
                </Button>
                <Button
                  onClick={handleAddExisting}
                  disabled={!selectedCandidateId || createApplication.isPending}
                >
                  {createApplication.isPending ? "Додавання..." : "Додати заявку"}
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="new" className="space-y-4 pt-4">
              <form onSubmit={handleCreateAndAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-candidate-name">Імʼя *</Label>
                  <Input id="new-candidate-name" {...newCandidateForm.register("full_name")} />
                  {newCandidateForm.formState.errors.full_name && (
                    <p className="text-sm text-destructive">
                      {newCandidateForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-candidate-email">Email</Label>
                    <Input id="new-candidate-email" type="email" {...newCandidateForm.register("email")} />
                    {newCandidateForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {newCandidateForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-candidate-phone">Телефон</Label>
                    <Input id="new-candidate-phone" {...newCandidateForm.register("phone")} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Джерело</Label>
                  <Select
                    value={newCandidateForm.watch("source_id")}
                    onValueChange={(v) => newCandidateForm.setValue("source_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть джерело" />
                    </SelectTrigger>
                    <SelectContent>
                      {(sources ?? []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Месенджери</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Telegram (@username)" {...newCandidateForm.register("telegram")} />
                    <Input placeholder="Viber (+380...)" {...newCandidateForm.register("viber")} />
                    <Input placeholder="WhatsApp (+380...)" {...newCandidateForm.register("whatsapp")} />
                    <Input placeholder="LinkedIn URL" {...newCandidateForm.register("linkedin")} />
                    <Input placeholder="Facebook URL" {...newCandidateForm.register("facebook")} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Скасувати
                  </Button>
                  <Button type="submit" disabled={createCandidate.isPending || createApplication.isPending}>
                    {createCandidate.isPending || createApplication.isPending
                      ? "Створення..."
                      : "Створити і додати"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Діалог "Написати всім" — постановка масової розсилки в чергу */}
      <Dialog
        open={bulkComposeOpen}
        onOpenChange={(open) => {
          setBulkComposeOpen(open);
          if (!open) {
            setBulkSubject("");
            setBulkBody("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Написати всім ({selectedForBulk.size})</DialogTitle>
            <DialogDescription>
              У тексті можна використати <code>{"{{name}}"}</code> — буде замінено на імʼя кожного кандидата
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Тема</Label>
              <Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Текст листа</Label>
              <Textarea
                value={bulkBody}
                onChange={(e) => setBulkBody(e.target.value)}
                placeholder="Привіт, {{name}}!..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkComposeOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleQueueBulk} disabled={!bulkBody.trim() || queueBatch.isPending}>
              {queueBatch.isPending ? "Постановка в чергу..." : "Поставити в чергу"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Підтвердження відправки/скасування партії (batch_id вже отримано з queue_batch) */}
      <Dialog
        open={!!pendingBatchId}
        onOpenChange={(open) => {
          if (!open) setPendingBatchId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Партія готова до відправки</DialogTitle>
            <DialogDescription>
              Розсилку поставлено в чергу ({selectedForBulk.size} кандидатів). Підтвердіть відправку або скасуйте.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancelBatch} disabled={cancelBatch.isPending}>
              {cancelBatch.isPending ? "Скасування..." : "Скасувати"}
            </Button>
            <Button onClick={handleConfirmSendBatch} disabled={sendBatch.isPending}>
              {sendBatch.isPending ? "Відправка..." : "Відправити batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default VacancyDetailPage;
