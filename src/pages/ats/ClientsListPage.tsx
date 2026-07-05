import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Building2 } from "lucide-react";
import { useClients, useCreateClient } from "@/hooks/ats/use-clients";
import type { Database } from "@/integrations/supabase/types";

type ClientStatus = Database["public"]["Enums"]["client_status"];

const statusLabel: Record<ClientStatus, string> = {
  active: "Активний",
  prospect: "Потенційний",
  archived: "Архів",
};

const statusColor: Record<ClientStatus, string> = {
  active: "bg-green-100 text-green-800",
  prospect: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-600",
};

const clientFormSchema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  status: z.enum(["active", "prospect", "archived"]),
  industry: z.string().optional(),
  website: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email("Некоректний email").optional().or(z.literal("")),
  contact_phone: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const ClientsListPage = () => {
  const navigate = useNavigate();
  const { data: clients, isLoading, isError, error } = useClients();
  const createClient = useCreateClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      status: "prospect",
      industry: "",
      website: "",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      notes: "",
    },
  });

  const onSubmit = (values: ClientFormValues) => {
    createClient.mutate(
      {
        name: values.name,
        status: values.status,
        industry: values.industry || null,
        website: values.website || null,
        contact_name: values.contact_name || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        notes: values.notes || null,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          form.reset();
        },
      },
    );
  };

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Клієнти</h1>
            <p className="text-muted-foreground mt-1">Компанії, для яких ведеться найм</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Новий клієнт
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити клієнтів"}
            </CardContent>
          </Card>
        ) : !clients || clients.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Ще немає клієнтів</p>
              <p className="text-sm mt-1">Додайте першого клієнта, щоб почати найм</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Проектів найму</TableHead>
                  <TableHead>Дата створення</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/clients/${client.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {client.name}
                        {client.is_internal && (
                          <Badge variant="outline" className="text-xs">
                            внутрішній
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[client.status]}>{statusLabel[client.status]}</Badge>
                    </TableCell>
                    <TableCell>{client.hiring_projects_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(client.created_at).toLocaleDateString("uk-UA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Новий клієнт</DialogTitle>
            <DialogDescription>Заповніть основні дані про клієнта</DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Назва *</Label>
              <Input id="client-name" placeholder="Назва компанії" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as ClientStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Потенційний</SelectItem>
                    <SelectItem value="active">Активний</SelectItem>
                    <SelectItem value="archived">Архів</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-industry">Індустрія</Label>
                <Input id="client-industry" placeholder="IT, Фінанси..." {...form.register("industry")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-website">Веб-сайт</Label>
              <Input id="client-website" placeholder="https://example.com" {...form.register("website")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-contact-name">Контактна особа</Label>
                <Input id="client-contact-name" {...form.register("contact_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-contact-email">Email контакту</Label>
                <Input id="client-contact-email" type="email" {...form.register("contact_email")} />
                {form.formState.errors.contact_email && (
                  <p className="text-sm text-destructive">{form.formState.errors.contact_email.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-contact-phone">Телефон контакту</Label>
              <Input id="client-contact-phone" {...form.register("contact_phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-notes">Нотатки</Label>
              <Textarea id="client-notes" rows={3} {...form.register("notes")} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Скасувати
              </Button>
              <Button type="submit" disabled={createClient.isPending}>
                {createClient.isPending ? "Створення..." : "Створити клієнта"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default ClientsListPage;
