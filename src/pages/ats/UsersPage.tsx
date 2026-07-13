// src/pages/ats/UsersPage.tsx
//
// Адмін-екран "Користувачі" (/ats/users) — онбординг внутрішніх користувачів
// агенції (owner/recruiter/assistant/admin). CRUD іде через Edge Function
// `admin-invite-user` (use-users.ts) — якщо функція ще не задеплоєна, хуки
// самі показують toast.error, сторінка просто лишається з порожнім списком.
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { Users as UsersIcon, Plus, Ban, CheckCircle2, Pencil } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useUsers, useInviteUser, useSetUserActive, type AtsUserRole } from "@/hooks/ats/use-users";
import { UserRoleBadges } from "@/components/ats/UserRoleBadges";
import { statusBadge, roleLabel } from "@/components/ats/user-role-utils";

const ROLE_OPTIONS: AtsUserRole[] = ["owner", "recruiter", "assistant", "admin"];

const UsersPage = () => {
  const { user: currentUser } = useAuthV2();
  const { data: users, isLoading } = useUsers();
  const navigate = useNavigate();

  const inviteUser = useInviteUser();
  const setUserActive = useSetUserActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<AtsUserRole>("recruiter");

  const resetDialog = () => {
    setEmail("");
    setFullName("");
    setRole("recruiter");
  };

  const handleSubmit = () => {
    if (!email) return;
    inviteUser.mutate(
      { email, full_name: fullName || undefined, role },
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
              <UsersIcon className="h-6 w-6" />
              Користувачі
            </h1>
            <p className="text-muted-foreground mt-1">Онбординг та ролі внутрішніх користувачів агенції</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Запросити користувача
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : !users || users.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <UsersIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Користувачів ще немає (або функція admin-invite-user ще не задеплоєна)</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Імʼя</TableHead>
                  <TableHead>Ролі</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <TableRow
                      key={u.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/ats/users/${u.id}`)}
                    >
                      <TableCell className="font-medium">{u.email || u.id}</TableCell>
                      <TableCell className="text-muted-foreground">{u.full_name || "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <UserRoleBadges user={u} currentUserId={currentUser?.id} />
                      </TableCell>
                      <TableCell>{statusBadge(u)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("uk-UA")}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Редагувати"
                            onClick={() => navigate(`/ats/users/${u.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={isSelf || setUserActive.isPending}
                            title={
                              isSelf
                                ? "Не можна деактивувати власний обліковий запис"
                                : u.banned
                                  ? "Активувати"
                                  : "Деактивувати"
                            }
                            onClick={() => setUserActive.mutate({ user_id: u.id, active: u.banned })}
                          >
                            {u.banned ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            <DialogTitle>Запросити користувача</DialogTitle>
            <DialogDescription>Надішліть запрошення на email із призначеною роллю</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="name@yodezeen.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Імʼя</Label>
              <Input
                id="invite-name"
                placeholder="Іван Іванов"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AtsUserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit} disabled={!email || inviteUser.isPending}>
              {inviteUser.isPending ? "Надсилання..." : "Надіслати запрошення"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AtsLayout>
  );
};

export default UsersPage;
