// src/pages/ats/RolesPage.tsx
//
// Адмін-екран «Ролі» (/ats/roles) — керування RBAC: перегляд системних ролей,
// створення й редагування кастомних, налаштування прав галочками. Право =
// флаг домен.дія (див. use-roles PERMISSION_CATALOG). Роль = ЩО можна;
// scope (/ats/access) = НАД ЧИМ.
import { useState } from "react";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ShieldCheck, Plus, Trash2, Lock } from "lucide-react";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  PERMISSION_CATALOG,
  type Role,
} from "@/hooks/ats/use-roles";
import type { Permission } from "@/hooks/ats/use-permissions";

function RoleCard({ role }: { role: Role }) {
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const current = new Set(role.permissions as Permission[]);

  const toggle = (perm: Permission, on: boolean) => {
    const next = new Set(current);
    if (on) next.add(perm);
    else next.delete(perm);
    updateRole.mutate({ id: role.id, permissions: Array.from(next) });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          {role.is_system ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-primary" />
          )}
          {role.name}
          {role.is_system ? (
            <Badge variant="outline" className="text-[10px]">
              системна
            </Badge>
          ) : (
            <Badge className="text-[10px]">кастомна</Badge>
          )}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {role.permissions.length} прав
          </Badge>
          {!role.is_system && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Видалити роль «{role.name}»?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Користувачі з цією роллю втратять надані нею права. Дію не можна скасувати.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Скасувати</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteRole.mutate(role.id)}>
                    Видалити
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSION_CATALOG.map((group) => (
            <div key={group.group} className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">{group.group}</div>
              {group.perms.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={current.has(perm.key)}
                    disabled={updateRole.isPending}
                    onCheckedChange={(v) => toggle(perm.key, v === true)}
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const RolesPage = () => {
  const { data: roles, isLoading } = useRoles();
  const createRole = useCreateRole();
  const [newName, setNewName] = useState("");

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6" />
              Ролі та права
            </h1>
            <p className="text-muted-foreground mt-1">
              Системні ролі — пресети; кастомні створюйте під конкретні потреби. Роль визначає,
              ЩО можна; обсяг (над якими клієнтами/вакансіями) — у «Доступах».
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Нова кастомна роль</Label>
              <Input
                className="h-9 w-56"
                placeholder="Назва ролі"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newName.trim()) {
                    createRole.mutate({ name: newName }, { onSuccess: () => setNewName("") });
                  }
                }}
              />
            </div>
            <Button
              className="h-9"
              disabled={!newName.trim() || createRole.isPending}
              onClick={() =>
                createRole.mutate({ name: newName }, { onSuccess: () => setNewName("") })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Створити
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : (
          <div className="space-y-4">
            {(roles ?? []).map((role) => (
              <RoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </div>
    </AtsLayout>
  );
};

export default RolesPage;
