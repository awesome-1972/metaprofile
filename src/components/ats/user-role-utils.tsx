// src/components/ats/user-role-utils.tsx
//
// Константи й дрібні рендер-хелпери для ролей/статусів користувача.
// Живуть окремо від компонента `UserRoleBadges` навмисно: Fast Refresh
// коректно працює лише коли файл експортує САМІ компоненти, тож усе, що
// компонентом не є (мапа підписів, список ролей, бейдж статусу), винесене сюди.
import { Badge } from "@/components/ui/badge";
import type { AtsUserRole, AtsUserRow } from "@/hooks/ats/use-users";

export const roleLabel: Record<AtsUserRole, string> = {
  owner: "Керівний партнер",
  recruiter: "Рекрутер",
  assistant: "Асистент",
  admin: "Адміністратор",
};

export const ROLE_OPTIONS: AtsUserRole[] = ["owner", "recruiter", "assistant", "admin"];

/** Бейдж стану користувача: деактивований / запрошений / активний. */
export function statusBadge(user: AtsUserRow) {
  if (user.banned) {
    return <Badge variant="destructive">Деактивований</Badge>;
  }
  if (!user.confirmed) {
    return <Badge variant="outline">Запрошений</Badge>;
  }
  return <Badge variant="secondary">Активний</Badge>;
}
