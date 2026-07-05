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
import { ArrowLeft, Building2, Briefcase, Mail, Phone, Globe, Plus } from "lucide-react";
import { useClient } from "@/hooks/ats/use-clients";
import { useHiringProjectsByClient, useCreateHiringProject } from "@/hooks/ats/use-hiring-projects";
import type { Database } from "@/integrations/supabase/types";

type ClientStatus = Database["public"]["Enums"]["client_status"];
type HiringProjectStatus = Database["public"]["Enums"]["hiring_project_status"];

const clientStatusLabel: Record<ClientStatus, string> = {
  active: "Активний",
  prospect: "Потенційний",
  archived: "Архів",
};

const projectStatusLabel: Record<HiringProjectStatus, string> = {
  draft: "Чернетка",
  active: "Активний",
  on_hold: "На паузі",
  closed: "Закрито",
  cancelled: "Скасовано",
};

const projectStatusColor: Record<HiringProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  closed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};

const projectFormSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  code: z.string().optional(),
  status: z.enum(["draft", "active", "on_hold", "closed", "cancelled"]),
  description: z.string().optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

const ClientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading, isError, error } = useClient(id);
  const { data: projects, isLoading: projectsLoading } = useHiringProjectsByClient(id);
  const createProject = useCreateHiringProject();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      code: "",
      status: "draft",
      description: "",
      start_date: "",
      target_date: "",
    },
  });

  const onSubmit = (values: ProjectFormValues) => {
    if (!id) return;
    createProject.mutate(
      {
        client_id: id,
        name: values.name,
        code: values.code || null,
        status: values.status,
        description: values.description || null,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
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

  if (isError || !client) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8">
          <Button variant="ghost" onClick={() => navigate("/ats/clients")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            До списку клієнтів
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Клієнта не знайдено або немає доступу"}
            </CardContent>
          </Card>
        </div>
      </AtsLayout>
    );
  }

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <Button variant="ghost" onClick={() => navigate("/ats/clients")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          До списку клієнтів
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
              {client.is_internal && <Badge variant="outline">внутрішній</Badge>}
            </div>
            <Badge className="mt-2">{clientStatusLabel[client.status]}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Реквізити
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Індустрія: </span>
                {client.industry || "—"}
              </div>
              {client.website && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              )}
              {client.contact_name && (
                <div>
                  <span className="text-muted-foreground">Контактна особа: </span>
                  {client.contact_name}
                </div>
              )}
              {client.contact_email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {client.contact_email}
                </div>
              )}
              {client.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {client.contact_phone}
                </div>
              )}
              {client.notes && (
                <div>
                  <span className="text-muted-foreground">Нотатки: </span>
                  {client.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Проекти найму
              </h2>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Новий проект
              </Button>
            </div>

            {projectsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
            ) : !projects || projects.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Ще немає проектів найму</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <Link key={project.id} to={`/ats/projects/${project.id}`}>
                    <Card className="hover:bg-accent/40 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{project.name}</span>
                              {project.code && (
                                <span className="text-xs text-muted-foreground">#{project.code}</span>
                              )}
                            </div>
                            {project.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Badge className={projectStatusColor[project.status]}>
                            {projectStatusLabel[project.status]}
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
            <DialogTitle>Новий проект найму</DialogTitle>
            <DialogDescription>Для клієнта: {client.name}</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Назва *</Label>
              <Input id="project-name" placeholder="Наприклад: Senior Backend Engineer" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-code">Код замовлення</Label>
                <Input id="project-code" placeholder="HP-001" {...form.register("code")} />
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as HiringProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Чернетка</SelectItem>
                    <SelectItem value="active">Активний</SelectItem>
                    <SelectItem value="on_hold">На паузі</SelectItem>
                    <SelectItem value="closed">Закрито</SelectItem>
                    <SelectItem value="cancelled">Скасовано</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-start">Дата старту</Label>
                <Input id="project-start" type="date" {...form.register("start_date")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-target">Дедлайн закриття</Label>
                <Input id="project-target" type="date" {...form.register("target_date")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Опис</Label>
              <Textarea id="project-description" rows={3} {...form.register("description")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Створення..." : "Створити проект"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default ClientDetailPage;
