import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { ArrowLeft, Briefcase, Building2, Calendar, Users, Plus } from "lucide-react";
import { useHiringProject, useSetProjectApproval } from "@/hooks/ats/use-hiring-projects";
import { useVacanciesByProject, useCreateVacancy } from "@/hooks/ats/use-vacancies";
import { RequisitionPanel } from "@/components/ats/RequisitionPanel";
import { useAuthV2 } from "@/hooks/useAuthV2";
import type { Database } from "@/integrations/supabase/types";

type HiringProjectStatus = Database["public"]["Enums"]["hiring_project_status"];
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

const vacancyFormSchema = z.object({
  title: z.string().min(1, "Назва обов'язкова"),
  status: z.enum(["draft", "open", "on_hold", "filled", "closed", "cancelled"]),
  employment_type: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]),
  headcount: z.coerce.number().int().min(1, "Мінімум 1"),
  location: z.string().optional(),
  is_remote: z.boolean(),
  description: z.string().optional(),
});

type VacancyFormValues = z.infer<typeof vacancyFormSchema>;

const statusLabel: Record<HiringProjectStatus, string> = {
  draft: "Чернетка",
  active: "Активний",
  on_hold: "На паузі",
  closed: "Закрито",
  cancelled: "Скасовано",
};

const statusColor: Record<HiringProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  closed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};

const ProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error } = useHiringProject(id);
  const { data: vacancies, isLoading: vacanciesLoading } = useVacanciesByProject(id);
  const createVacancy = useCreateVacancy();
  const setApproval = useSetProjectApproval();
  const { user, hasRole } = useAuthV2();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isWorkspaceAdmin = hasRole("owner") || hasRole("admin");
  const isInternal = isWorkspaceAdmin || hasRole("recruiter") || hasRole("assistant");

  const form = useForm<VacancyFormValues>({
    resolver: zodResolver(vacancyFormSchema),
    defaultValues: {
      title: "",
      status: "draft",
      employment_type: "full_time",
      headcount: 1,
      location: "",
      is_remote: false,
      description: "",
    },
  });

  const onSubmit = (values: VacancyFormValues) => {
    if (!id) return;
    createVacancy.mutate(
      {
        hiring_project_id: id,
        title: values.title,
        status: values.status,
        employment_type: values.employment_type,
        headcount: values.headcount,
        location: values.location || null,
        is_remote: values.is_remote,
        description: values.description || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
        },
      },
    );
  };

  if (isLoading) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Завантаження...</div>
      </AtsLayout>
    );
  }

  if (isError || !project) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8">
          <Button variant="ghost" onClick={() => navigate("/ats/projects")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            До списку проектів
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Проект не знайдено або немає доступу"}
            </CardContent>
          </Card>
        </div>
      </AtsLayout>
    );
  }

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate("/ats/projects")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          До списку проектів
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{project.name}</h1>
              {project.code && <span className="text-sm text-muted-foreground">#{project.code}</span>}
            </div>
            {project.client && (
              <Link
                to={`/ats/clients/${project.client.id}`}
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1 w-fit"
              >
                <Building2 className="h-3.5 w-3.5" />
                {project.client.name}
              </Link>
            )}
            <Badge className={`${statusColor[project.status]} mt-2`}>{statusLabel[project.status]}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <RequisitionPanel
              level="project"
              approvalStatus={project.approval_status}
              approvalNote={project.approval_note}
              submittedAt={project.submitted_at}
              approvedAt={project.approved_at}
              canApprove={isWorkspaceAdmin || (!!user && user.id === project.created_by)}
              canEdit={isInternal}
              isBusy={setApproval.isPending}
              onSubmit={() => id && setApproval.mutate({ id, approvalStatus: "pending_approval" })}
              onDecide={(status, note) => id && setApproval.mutate({ id, approvalStatus: status, note })}
              onReturnToDraft={() => id && setApproval.mutate({ id, approvalStatus: "draft", note: null })}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="h-4 w-4" />
                  Реквізити
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {project.description && (
                  <div>
                    <span className="text-muted-foreground">Опис: </span>
                    {project.description}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Старт: </span>
                  {project.start_date ? new Date(project.start_date).toLocaleDateString("uk-UA") : "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Дедлайн: </span>
                  {project.target_date ? new Date(project.target_date).toLocaleDateString("uk-UA") : "—"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Вакансії
              </h2>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Нова вакансія
              </Button>
            </div>

            {vacanciesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
            ) : !vacancies || vacancies.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Ще немає вакансій</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {vacancies.map((vacancy) => (
                  <Link key={vacancy.id} to={`/ats/vacancies/${vacancy.id}`}>
                    <Card className="hover:bg-accent/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="font-medium truncate">{vacancy.title}</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {employmentTypeLabel[vacancy.employment_type]}
                              {vacancy.location ? ` · ${vacancy.location}` : ""}
                              {vacancy.is_remote ? " · віддалено" : ""}
                            </p>
                          </div>
                          <Badge className={vacancyStatusColor[vacancy.status]}>
                            {vacancyStatusLabel[vacancy.status]}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Нова вакансія</DialogTitle>
            <DialogDescription>Для проекту: {project.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vacancy-title">Назва *</Label>
              <Input
                id="vacancy-title"
                placeholder="Наприклад: Senior Backend Engineer"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as VacancyStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Чернетка</SelectItem>
                    <SelectItem value="open">Відкрита</SelectItem>
                    <SelectItem value="on_hold">На паузі</SelectItem>
                    <SelectItem value="filled">Закрита наймом</SelectItem>
                    <SelectItem value="closed">Закрита</SelectItem>
                    <SelectItem value="cancelled">Скасована</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип зайнятості</Label>
                <Select
                  value={form.watch("employment_type")}
                  onValueChange={(v) => form.setValue("employment_type", v as EmploymentType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Повна зайнятість</SelectItem>
                    <SelectItem value="part_time">Часткова зайнятість</SelectItem>
                    <SelectItem value="contract">Контракт</SelectItem>
                    <SelectItem value="internship">Стажування</SelectItem>
                    <SelectItem value="temporary">Тимчасова</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vacancy-headcount">Кількість позицій</Label>
                <Input id="vacancy-headcount" type="number" min={1} {...form.register("headcount")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vacancy-location">Локація</Label>
                <Input id="vacancy-location" placeholder="Київ, Україна" {...form.register("location")} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="vacancy-remote"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.watch("is_remote")}
                onChange={(e) => form.setValue("is_remote", e.target.checked)}
              />
              <Label htmlFor="vacancy-remote" className="cursor-pointer font-normal">
                Віддалена робота
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vacancy-description">Опис</Label>
              <Textarea id="vacancy-description" rows={3} {...form.register("description")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={createVacancy.isPending}>
                {createVacancy.isPending ? "Створення..." : "Створити вакансію"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default ProjectDetailPage;
