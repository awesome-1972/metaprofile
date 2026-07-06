// src/pages/ats/AccessGrantsPage.tsx
//
// Адмін-екран "Доступи" (/ats/access) — таблиця грантів (client/hiring_project/
// vacancy scope) + діалог видачі нового доступу. CRUD іде через Edge Function
// `grant-management` (use-grants.ts) — якщо функція ще не задеплоєна, хуки
// самі показують toast.error, сторінка просто лишається з порожнім списком.
import { useMemo, useState } from "react";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
import { ShieldCheck, Trash2, Plus } from "lucide-react";
import {
  useGrants,
  useGrantAccess,
  useRevokeGrant,
  useUpdateGrant,
  useProfilesList,
  type GrantScopeType,
} from "@/hooks/ats/use-grants";
import { useClients } from "@/hooks/ats/use-clients";
import { useHiringProjects } from "@/hooks/ats/use-hiring-projects";
import { useVacancies } from "@/hooks/ats/use-vacancies";

const scopeTypeLabel: Record<GrantScopeType, string> = {
  client: "Клієнт",
  hiring_project: "Проект найму",
  vacancy: "Вакансія",
};

const AccessGrantsPage = () => {
  const { data: grants, isLoading } = useGrants();
  const { data: profiles } = useProfilesList();
  const { data: clients } = useClients();
  const { data: projects } = useHiringProjects();
  const { data: vacancies } = useVacancies();

  const grantAccess = useGrantAccess();
  const updateGrant = useUpdateGrant();
  const revokeGrant = useRevokeGrant();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [scopeType, setScopeType] = useState<GrantScopeType>("client");
  const [scopeId, setScopeId] = useState("");
  const [canEdit, setCanEdit] = useState(false);
  const [canViewFinancials, setCanViewFinancials] = useState(false);

  const scopeOptions = useMemo(() => {
    if (scopeType === "client") return (clients ?? []).map((c) => ({ id: c.id, name: c.name }));
    if (scopeType === "hiring_project") return (projects ?? []).map((p) => ({ id: p.id, name: p.name }));
    return (vacancies ?? []).map((v) => ({ id: v.id, name: v.title }));
  }, [scopeType, clients, projects, vacancies]);

  const resetDialog = () => {
    setUserId("");
    setScopeType("client");
    setScopeId("");
    setCanEdit(false);
    setCanViewFinancials(false);
  };

  const handleSubmit = () => {
    if (!userId || !scopeId) return;
    grantAccess.mutate(
      {
        user_id: userId,
        scope_type: scopeType,
        scope_id: scopeId,
        can_edit: canEdit,
        can_view_financials: canViewFinancials,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          resetDialog();
        },
      },
    );
  };

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Доступи
            </h1>
            <p className="text-muted-foreground mt-1">Гранти доступу до клієнтів, проектів найму та вакансій</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Видати доступ
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : !grants || grants.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Грантів ще немає (або функція grant-management ще не задеплоєна)</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Користувач</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Обʼєкт</TableHead>
                  <TableHead>Редагування</TableHead>
                  <TableHead>Фінанси</TableHead>
                  <TableHead>Створено</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-medium">{grant.user_email || grant.user_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{scopeTypeLabel[grant.scope_type]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{grant.scope_name || grant.scope_id}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={grant.can_edit}
                        onCheckedChange={(checked) =>
                          updateGrant.mutate({ id: grant.id, can_edit: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={grant.can_view_financials}
                        onCheckedChange={(checked) =>
                          updateGrant.mutate({ id: grant.id, can_view_financials: checked === true })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(grant.created_at).toLocaleDateString("uk-UA")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => revokeGrant.mutate(grant.id)}
                        disabled={revokeGrant.isPending}
                        title="Відкликати доступ"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Видати доступ</DialogTitle>
            <DialogDescription>Оберіть користувача, тип і обʼєкт доступу</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Користувач</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть користувача" />
                </SelectTrigger>
                <SelectContent>
                  {(profiles ?? []).map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name || p.email} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Тип доступу</Label>
              <Select
                value={scopeType}
                onValueChange={(v) => {
                  setScopeType(v as GrantScopeType);
                  setScopeId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Клієнт</SelectItem>
                  <SelectItem value="hiring_project">Проект найму</SelectItem>
                  <SelectItem value="vacancy">Вакансія</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Обʼєкт</Label>
              <Select value={scopeId} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть обʼєкт" />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Немає доступних обʼєктів</div>
                  ) : (
                    scopeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="grant-can-edit"
                checked={canEdit}
                onCheckedChange={(checked) => setCanEdit(checked === true)}
              />
              <Label htmlFor="grant-can-edit" className="font-normal">
                Може редагувати
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="grant-can-view-financials"
                checked={canViewFinancials}
                onCheckedChange={(checked) => setCanViewFinancials(checked === true)}
              />
              <Label htmlFor="grant-can-view-financials" className="font-normal">
                Бачить фінанси
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit} disabled={!userId || !scopeId || grantAccess.isPending}>
              {grantAccess.isPending ? "Видача..." : "Видати доступ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default AccessGrantsPage;
