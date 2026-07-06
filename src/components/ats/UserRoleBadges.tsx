// src/components/ats/UserRoleBadges.tsx
//
// Спільний toggle-механізм ролей користувача — перевикористовується
// UsersPage (/ats/users) і UserDetailPage (/ats/users/:id). Клік по бейджу
// вмикає/вимикає роль через `admin-invite-user` action: 'set_role'
// (useSetUserRole, src/hooks/ats/use-users.ts). Самозняття власної ролі
// admin заборонено (дзеркалить self_lockout на Edge).
import { Badge } from "@/components/ui/badge";
import { useSetUserRole, type AtsUserRole, type AtsUserRow } from "@/hooks/ats/use-users";

export const roleLabel: Record<AtsUserRole, string> = {
  owner: "Керівний партнер",
  recruiter: "Рекрутер",
  assistant: "Асистент",
  admin: "Адміністратор",
};

export const ROLE_OPTIONS: AtsUserRole[] = ["owner", "recruiter", "assistant", "admin"];

interface UserRoleBadgesProps {
  user: AtsUserRow;
  currentUserId: string | undefined;
}

export function UserRoleBadges({ user, currentUserId }: UserRoleBadgesProps) {
  const setUserRole = useSetUserRole();
  const isSelf = user.id === currentUserId;

  const toggleRole = (r: AtsUserRole, hasRole: boolean) => {
    setUserRole.mutate({ user_id: user.id, role: r, enabled: !hasRole });
  };

  return (
    <div className="flex flex-wrap gap-1">
      {ROLE_OPTIONS.map((r) => {
        const hasRole = user.roles.includes(r);
        const disableSelfAdminRemoval = isSelf && r === "admin" && hasRole;
        return (
          <Badge
            key={r}
            variant={hasRole ? "default" : "outline"}
            className={disableSelfAdminRemoval ? "cursor-not-allowed opacity-60" : "cursor-pointer select-none"}
            title={
              disableSelfAdminRemoval
                ? "Не можна зняти роль адміністратора із себе"
                : hasRole
                  ? `Зняти роль «${roleLabel[r]}»`
                  : `Надати роль «${roleLabel[r]}»`
            }
            onClick={() => {
              if (disableSelfAdminRemoval || setUserRole.isPending) return;
              toggleRole(r, hasRole);
            }}
          >
            {roleLabel[r]}
          </Badge>
        );
      })}
    </div>
  );
}

export function statusBadge(user: AtsUserRow) {
  if (user.banned) {
    return <Badge variant="destructive">Деактивований</Badge>;
  }
  if (!user.confirmed) {
    return <Badge variant="outline">Запрошений</Badge>;
  }
  return <Badge variant="secondary">Активний</Badge>;
}
