// src/components/ats/UserRoleBadges.tsx
//
// Спільний toggle-механізм ролей користувача — перевикористовується
// UsersPage (/ats/users) і UserDetailPage (/ats/users/:id). Клік по бейджу
// вмикає/вимикає роль через `admin-invite-user` action: 'set_role'
// (useSetUserRole, src/hooks/ats/use-users.ts). Самозняття власної ролі
// admin заборонено (дзеркалить self_lockout на Edge).
//
// Константи ролей і `statusBadge` живуть у `user-role-utils.tsx` — цей файл
// експортує лише компонент (вимога Fast Refresh).
import { Badge } from "@/components/ui/badge";
import { useSetUserRole, type AtsUserRole, type AtsUserRow } from "@/hooks/ats/use-users";
import { ROLE_OPTIONS, roleLabel } from "@/components/ats/user-role-utils";

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
