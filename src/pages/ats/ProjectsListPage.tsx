import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Plus } from "lucide-react";
import { useHiringProjects, useCreateHiringProject } from "@/hooks/ats/use-hiring-projects";
import { useClients } from "@/hooks/ats/use-clients";
import { usePermissions } from "@/hooks/ats/use-permissions";
import type { Database } from "@/integrations/supabase/types";

type HiringProjectStatus = Database["public"]["Enums"]["hiring_project_status"];

const statusLabel: Record<HiringProjectStatus, string> = {
  draft: "Чернетка",
  active: "Активний",
  on_hold: "На паузі",
  closed: "Закрито",
  cancelled: "Скасовано",
  archived: "Архів",
};

const statusColor: Record<HiringProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  closed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
  archived: "bg-muted text-muted-foreground",
};

const formSchema = z.object({
  client_id: z.string().min(1, "Оберіть клієнта"),
  name: z.string().min(1, "Назва обов'язкова"),
  code: z.string().optional(),
  status: z.enum(["draft", "active", "on_hold", "closed", "cancelled"]),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const ProjectsListPage = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading, isError, error } = useHiringProjects();
  const { data: clients } = useClients();
  const createProject = useCreateHiringProject();
  const { can } = usePermissions();
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canCreate = can("projects.edit");
  // Створювати проект можна лише під активного (не архівного) клієнта.
  const activeClients = (clients ?? []).filter((c) => c.status !== "archived");

  const visibleProjects = (projects ?? []).filter(
    (p) => showArchived || p.status !== "archived",
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      name: "",
      code: "",
      status: "draft",
      start_date: "",
      target_date: "",
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createProject.mutate(
      {
        client_id: values.client_id,
        name: values.name,
        code: null, // авто-код генерує тригер mp_hiring_project_code (per-client)
        status: values.status,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
        description: values.description || null,
      },
      {
        onSuccess: (data) => {
          setDialogOpen(false);
          form.reset();
          navigate(`/ats/projects/${data.id}`);
        },
      },
    );
  });

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Проекти найму</h1>
            <p className="text-muted-foreground mt-1">Усі проекти найму, доступні вам</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <Checkbox checked={showArchived} onCheckedChange={(v) => setShowArchived(v === true)} />
              Показати архів
            </label>
            {canCreate && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Новий проект
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити проекти найму"}
            </CardContent>
          </Card>
        ) : visibleProjects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Ще немає проектів найму</p>
              <p className="text-sm mt-1">
                Створіть проект кнопкою «Новий проект» або з картки клієнта
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Дата створення</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {project.name}
                        {project.code && (
                          <span className="text-xs text-muted-foreground">#{project.code}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[project.status]}>{statusLabel[project.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.target_date
                        ? new Date(project.target_date).toLocaleDateString("uk-UA")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString("uk-UA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новий проект найму</DialogTitle>
            <DialogDescription>Оберіть клієнта, для якого ведеться найм</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Клієнт *</Label>
              <Select
                value={form.watch("client_id")}
                onValueChange={(v) => form.setValue("client_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть клієнта" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.client_id && (
                <p className="text-sm text-destructive">{form.formState.errors.client_id.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-name">Назва *</Label>
              <Input id="pl-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">Код замовлення згенерується автоматично.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pl-start">Дата старту</Label>
                <Input id="pl-start" type="date" {...form.register("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pl-target">Дедлайн закриття</Label>
                <Input id="pl-target" type="date" {...form.register("target_date")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pl-desc">Опис</Label>
              <Textarea id="pl-desc" rows={3} {...form.register("description")} />
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

export default ProjectsListPage;
