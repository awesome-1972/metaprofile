import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import {
  useUpdateHiringProject,
  useArchiveHiringProject,
  type HiringProject,
} from "@/hooks/ats/use-hiring-projects";
import { usePermissions } from "@/hooks/ats/use-permissions";

const editSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  code: z.string().optional(),
  description: z.string().optional(),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

/** Кнопки «Редагувати» і «Архівувати/Відновити» для проекту найму. */
export function ProjectActions({ project }: { project: HiringProject }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateProject = useUpdateHiringProject();
  const archiveProject = useArchiveHiringProject();
  const { can } = usePermissions();
  const canEditProject = can("projects.edit");
  const canArchiveProject = can("projects.archive");
  const isArchived = project.status === "archived";

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      name: project.name,
      code: project.code ?? "",
      description: project.description ?? "",
      start_date: project.start_date ?? "",
      target_date: project.target_date ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateProject.mutate(
      {
        id: project.id,
        patch: {
          name: values.name,
          code: values.code || null,
          description: values.description || null,
          start_date: values.start_date || null,
          target_date: values.target_date || null,
        },
      },
      { onSuccess: () => setEditOpen(false) },
    );
  });

  if (!canEditProject && !canArchiveProject) return null;

  return (
    <div className="flex items-center gap-2">
      {canEditProject && (
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          Редагувати
        </Button>
      )}

      {canArchiveProject && (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            {isArchived ? (
              <>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Відновити
              </>
            ) : (
              <>
                <Archive className="h-4 w-4 mr-2" />
                Архівувати
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isArchived ? "Відновити проект?" : "Архівувати проект?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? `«${project.name}» повернеться до активних проектів.`
                : `«${project.name}» зникне з активних списків. Вакансії й дані збережуться — проект видно через фільтр «Архів».`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveProject.mutate({ id: project.id, archived: !isArchived })}
            >
              {isArchived ? "Відновити" : "Архівувати"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редагувати проект</DialogTitle>
            <DialogDescription>Назва, код, опис і терміни</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-name">Назва *</Label>
                <Input id="p-name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-code">Код</Label>
                <Input id="p-code" className="w-28" {...form.register("code")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Опис</Label>
              <Textarea id="p-desc" rows={3} {...form.register("description")} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Старт</Label>
                <Input id="p-start" type="date" {...form.register("start_date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-target">Цільова дата</Label>
                <Input id="p-target" type="date" {...form.register("target_date")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={updateProject.isPending}>
                {updateProject.isPending ? "Збереження..." : "Зберегти"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
