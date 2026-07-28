import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useRoles, useUserCustomRoles, useSetUserCustomRole } from "@/hooks/ats/use-roles";

/**
 * Призначення КАСТОМНИХ ролей користувачу (галочки). Системні ролі
 * (owner/admin/recruiter/assistant/visitor) керуються окремо через
 * UserRoleBadges — тут лише кастомні (roles.is_system = false).
 */
export function UserCustomRoles({ userId }: { userId: string }) {
  const { data: roles } = useRoles();
  const { data: assigned } = useUserCustomRoles(userId);
  const setRole = useSetUserCustomRole();

  const customRoles = (roles ?? []).filter((r) => !r.is_system);
  const assignedSet = new Set(assigned ?? []);

  if (customRoles.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Кастомних ролей ще немає. Створіть їх на «Ролі та права».
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {customRoles.map((role) => (
        <label key={role.id} className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={assignedSet.has(role.id)}
            disabled={setRole.isPending}
            onCheckedChange={(v) =>
              setRole.mutate({ userId, roleId: role.id, assigned: v === true })
            }
          />
          {role.name}
          <Badge variant="outline" className="text-[10px]">
            {role.permissions.length} прав
          </Badge>
        </label>
      ))}
    </div>
  );
}
