import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  MapPin,
  Plus,
  Users,
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
import { BriefTab } from "@/components/ats/BriefTab";
import { CompetenciesTab } from "@/components/ats/CompetenciesTab";
import { ReportsTab } from "@/components/ats/ReportsTab";
import { CompetencyScoreDialog } from "@/components/ats/CompetencyScoreDialog";
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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [draggedApplicationId, setDraggedApplicationId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const [scoreDialogApplication, setScoreDialogApplication] = useState<ApplicationWithCandidate | null>(null);

  const { data: allCandidates } = useCandidates();
  const { data: searchResults } = useSearchCandidates(search);
  const candidateOptions = search.trim() ? searchResults ?? [] : allCandidates ?? [];

  const newCandidateForm = useForm<NewCandidateFormValues>({
    resolver: zodResolver(newCandidateFormSchema),
    defaultValues: { full_name: "", email: "", phone: "", source_id: "" },
  });

  const sortedStages = useMemo(() => [...(stages ?? [])].sort((a, b) => a.position - b.position), [stages]);

  const allApplicationsFlat = useMemo(
    () => Object.values(applicationsByStage).flat(),
    [applicationsByStage],
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
          </div>
          {activeTab === "pipeline" && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Додати кандидата
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pipeline">Воронка</TabsTrigger>
            <TabsTrigger value="brief">Бріф</TabsTrigger>
            <TabsTrigger value="competencies">Компетенції</TabsTrigger>
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
                                  <Link
                                    to={`/ats/candidates/${application.candidate_id}`}
                                    className="font-medium text-sm hover:underline block truncate"
                                  >
                                    {application.candidate?.full_name ?? "Без імені"}
                                  </Link>
                                  <div className="text-xs text-muted-foreground space-y-0.5">
                                    <div>{application.candidate?.source?.name ?? "Джерело невідоме"}</div>
                                    <div>{daysSince(application.applied_at)} дн. на стадії/у процесі</div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs"
                                    onClick={() => setScoreDialogApplication(application)}
                                  >
                                    <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
                                    Оцінка компетенцій
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
          </TabsContent>

          <TabsContent value="brief" className="pt-4">
            {id && <BriefTab vacancyId={id} />}
          </TabsContent>

          <TabsContent value="competencies" className="pt-4">
            {id && <CompetenciesTab vacancyId={id} />}
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
    </AtsLayout>
  );
};

export default VacancyDetailPage;
