import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Sparkles, Users } from "lucide-react";
import { useVacancies, useCreateVacancy } from "@/hooks/ats/use-vacancies";
import { useHiringProjects } from "@/hooks/ats/use-hiring-projects";
import { useImportVacancy } from "@/hooks/ats/use-vacancy-import";
import { usePermissions } from "@/hooks/ats/use-permissions";
import type { Database } from "@/integrations/supabase/types";

type VacancyStatus = Database["public"]["Enums"]["vacancy_status"];
type EmploymentType = Database["public"]["Enums"]["employment_type"];

const statusLabel: Record<VacancyStatus, string> = {
  draft: "Чернетка",
  open: "Відкрита",
  on_hold: "На паузі",
  filled: "Закрита наймом",
  closed: "Закрита",
  cancelled: "Скасована",
};

const statusColor: Record<VacancyStatus, string> = {
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

const formSchema = z.object({
  hiring_project_id: z.string().min(1, "Оберіть проект"),
  title: z.string().min(1, "Назва обов'язкова"),
  status: z.enum(["draft", "open", "on_hold", "filled", "closed", "cancelled"]),
  employment_type: z.enum(["full_time", "part_time", "contract", "internship", "temporary"]),
  headcount: z.coerce.number().int().min(1, "Мінімум 1"),
  location: z.string().optional(),
  is_remote: z.boolean(),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const VacanciesListPage = () => {
  const navigate = useNavigate();
  const { data: vacancies, isLoading, isError, error } = useVacancies();
  const { data: projects } = useHiringProjects();
  const createVacancy = useCreateVacancy();
  const importVacancy = useImportVacancy();
  const { can } = usePermissions();
  const canCreate = can("vacancies.create");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<"url" | "text">("url");
  const [importValue, setImportValue] = useState("");

  const activeProjects = (projects ?? []).filter((p) => p.status !== "archived");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hiring_project_id: "",
      title: "",
      status: "draft",
      employment_type: "full_time",
      headcount: 1,
      location: "",
      is_remote: false,
      description: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    createVacancy.mutate(
      {
        hiring_project_id: values.hiring_project_id,
        title: values.title,
        status: values.status,
        employment_type: values.employment_type,
        headcount: values.headcount,
        location: values.location || null,
        is_remote: values.is_remote,
        description: values.description || null,
      },
      {
        onSuccess: (data) => {
          setDialogOpen(false);
          form.reset();
          if (data?.id) navigate(`/ats/vacancies/${data.id}`);
        },
      },
    );
  });

  const handleMagicImport = () => {
    if (!importValue.trim()) return;
    importVacancy.mutate(
      importMode === "url" ? { url: importValue.trim() } : { text: importValue.trim() },
      {
        onSuccess: ({ parsed }) => {
          if (parsed.title) form.setValue("title", parsed.title);
          if (parsed.employment_type) form.setValue("employment_type", parsed.employment_type);
          if (parsed.location) form.setValue("location", parsed.location);
          if (parsed.is_remote !== null) form.setValue("is_remote", parsed.is_remote);
          const extra: string[] = [];
          if (parsed.requirements.length) extra.push("Вимоги:\n" + parsed.requirements.map((r) => `• ${r}`).join("\n"));
          if (parsed.skills.length) extra.push("Навички: " + parsed.skills.join(", "));
          const desc = [parsed.description, ...extra].filter(Boolean).join("\n\n");
          if (desc) form.setValue("description", desc);
          toast.success("Поля заповнено з оголошення — перевірте й створіть");
          setImportValue("");
        },
      },
    );
  };

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Вакансії</h1>
            <p className="text-muted-foreground mt-1">Усі вакансії, доступні вам</p>
          </div>
          {canCreate && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Нова вакансія
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити вакансії"}
            </CardContent>
          </Card>
        ) : !vacancies || vacancies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Ще немає вакансій</p>
              <p className="text-sm mt-1">Створіть вакансію кнопкою «Нова вакансія» або з картки проекту</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Проект</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Заявок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacancies.map((vacancy) => (
                  <TableRow
                    key={vacancy.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/vacancies/${vacancy.id}`)}
                  >
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>{vacancy.hiring_project?.name ?? "—"}</TableCell>
                    <TableCell>{vacancy.hiring_project?.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[vacancy.status]}>{statusLabel[vacancy.status]}</Badge>
                    </TableCell>
                    <TableCell>{vacancy.applications_count}</TableCell>
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
          if (!open) {
            form.reset();
            setImportValue("");
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Нова вакансія</DialogTitle>
            <DialogDescription>Оберіть проект, у якому ведеться найм</DialogDescription>
          </DialogHeader>

          {/* Магічний імпорт: посилання/текст оголошення → AI заповнить поля. */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Магічний імпорт</span>
              <span className="text-xs text-muted-foreground">AI заповнить поля з оголошення</span>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant={importMode === "url" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setImportMode("url")}>
                Посилання
              </Button>
              <Button type="button" size="sm" variant={importMode === "text" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setImportMode("text")}>
                Текст
              </Button>
            </div>
            <div className="flex items-start gap-2">
              {importMode === "url" ? (
                <Input placeholder="https://... посилання на вакансію" value={importValue} onChange={(e) => setImportValue(e.target.value)} />
              ) : (
                <Textarea rows={3} placeholder="Встав текст оголошення про вакансію" value={importValue} onChange={(e) => setImportValue(e.target.value)} />
              )}
              <Button type="button" size="sm" onClick={handleMagicImport} disabled={!importValue.trim() || importVacancy.isPending} className="whitespace-nowrap">
                {importVacancy.isPending ? "Аналіз..." : "Заповнити"}
              </Button>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Проект *</Label>
              <Select value={form.watch("hiring_project_id")} onValueChange={(v) => form.setValue("hiring_project_id", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть проект" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                      {p.client?.name ? ` — ${p.client.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.hiring_project_id && (
                <p className="text-sm text-destructive">{form.formState.errors.hiring_project_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="v-title">Назва *</Label>
              <Input id="v-title" placeholder="Наприклад: Senior Backend Engineer" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Статус</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as VacancyStatus)}>
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
              <div className="space-y-1.5">
                <Label>Тип зайнятості</Label>
                <Select value={form.watch("employment_type")} onValueChange={(v) => form.setValue("employment_type", v as EmploymentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(employmentTypeLabel).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="v-headcount">Кількість позицій</Label>
                <Input id="v-headcount" type="number" min={1} {...form.register("headcount")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-location">Локація</Label>
                <Input id="v-location" placeholder="Київ, Україна" {...form.register("location")} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.watch("is_remote")} onChange={(e) => form.setValue("is_remote", e.target.checked)} />
              Віддалена робота
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="v-desc">Опис</Label>
              <Textarea id="v-desc" rows={4} {...form.register("description")} />
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

export default VacanciesListPage;
