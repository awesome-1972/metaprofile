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
import { useUpdateClient, useArchiveClient, type Client } from "@/hooks/ats/use-clients";

const editSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  industry: z.string().optional(),
  website: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Некоректний email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

/** Кнопки «Редагувати» і «Архівувати/Відновити» для клієнта (лише для internal). */
export function ClientActions({ client, canEdit }: { client: Client; canEdit: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const updateClient = useUpdateClient();
  const archiveClient = useArchiveClient();
  const isArchived = client.status === "archived";

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      name: client.name,
      industry: client.industry ?? "",
      website: client.website ?? "",
      contact_name: client.contact_name ?? "",
      contact_email: client.contact_email ?? "",
      contact_phone: client.contact_phone ?? "",
      notes: client.notes ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    updateClient.mutate(
      {
        id: client.id,
        patch: {
          name: values.name,
          industry: values.industry || null,
          website: values.website || null,
          contact_name: values.contact_name || null,
          contact_email: values.contact_email || null,
          contact_phone: values.contact_phone || null,
          notes: values.notes || null,
        },
      },
      { onSuccess: () => setEditOpen(false) },
    );
  });

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4 mr-2" />
        Редагувати
      </Button>

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
              {isArchived ? "Відновити клієнта?" : "Архівувати клієнта?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isArchived
                ? `«${client.name}» повернеться до активних клієнтів.`
                : `«${client.name}» зникне з активних списків. Дані, проекти й вакансії збережуться — клієнта видно через фільтр «Архів».`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => archiveClient.mutate({ id: client.id, archived: !isArchived })}
            >
              {isArchived ? "Відновити" : "Архівувати"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Редагувати клієнта</DialogTitle>
            <DialogDescription>Основні реквізити й контакти</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Назва *</Label>
              <Input id="c-name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-industry">Галузь</Label>
                <Input id="c-industry" {...form.register("industry")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-website">Сайт</Label>
                <Input id="c-website" {...form.register("website")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-contact">Контактна особа</Label>
                <Input id="c-contact" {...form.register("contact_name")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Телефон</Label>
                <Input id="c-phone" {...form.register("contact_phone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" {...form.register("contact_email")} />
              {form.formState.errors.contact_email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.contact_email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-notes">Нотатки</Label>
              <Textarea id="c-notes" rows={3} {...form.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={updateClient.isPending}>
                {updateClient.isPending ? "Збереження..." : "Зберегти"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
