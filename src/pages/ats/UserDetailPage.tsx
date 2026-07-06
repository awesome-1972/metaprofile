// src/pages/ats/UserDetailPage.tsx
//
// Картка користувача (/ats/users/:id) — admin/owner. Дані користувача беремо
// з наявного списку `useUsers()` (список уже містить email/full_name/roles/
// статус — окремого 'get' action на Edge немає й не потрібен). Секції:
//   • Шапка — inline-редагування імені (олівець → useUpdateUserProfile,
//     action 'update_profile'), ролі (спільний UserRoleBadges), статус +
//     активація/деактивація (useSetUserActive).
//   • «Відповідальні вакансії» — прямий Supabase select vacancies where
//     assigned_recruiter_id = :id, під RLS (mp_can_access_vacancy), join
//     hiring_project→client для назв.
//   • «Доступи» — гранти цього користувача, перевикористовує useGrants()
//     (список усіх грантів) відфільтрований по user_id — окремого
//     server-side фільтра в grant-management action:'list' немає.
import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Pencil, Check, X, Ban, CheckCircle2, ShieldCheck, Trash2, Briefcase } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { supabase } from "@/integrations/supabase/client";
import { useUsers, useUpdateUserProfile, useSetUserActive } from "@/hooks/ats/use-users";
import { UserRoleBadges, statusBadge } from "@/components/ats/UserRoleBadges";
import { useGrants, useRevokeGrant, type GrantScopeType } from "@/hooks/ats/use-grants";
import type { Database } from "@/integrations/supabase/types";

type VacancyStatus = Database["public"]["Enums"]["vacancy_status"];

const vacancyStatusLabel: Record<VacancyStatus, string> = {
  draft: "Чернетка",
  open: "Відкрита",
  on_hold: "На паузі",
  filled: "Закрита наймом",
  closed: "Закрита",
  cancelled: "Скасована",
};

const vacancyStatusColor: Record<VacancyStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  filled: "bg-blue-100 text-blue-800",
  closed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const scopeTypeLabel: Record<GrantScopeType, string> = {
  client: "Клієнт",
  hiring_project: "Проект найму",
  vacancy: "Вакансія",
};

interface AssignedVacancyRow {
  id: string;
  title: string;
  status: VacancyStatus;
  hiring_project: { id: string; name: string; client: { id: string; name: string } | null } | null;
}

/**
 * Вакансії, де цей користувач — відповідальний рекрутер. Прямий запит під
 * RLS (mp_can_access_vacancy); assigned_recruiter_id є у згенерованих типах
 * (vacancies.Row), додаткового `as unknown as` не потрібно.
 */
function useAssignedVacancies(userId: string | undefined) {
  return useQuery({
    queryKey: ["ats", "vacancies", "assigned_recruiter", userId],
    queryFn: async (): Promise<AssignedVacancyRow[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("vacancies")
        .select(
          "id, title, status, hiring_project:hiring_projects(id, name, client:clients(id, name))",
        )
        .eq("assigned_recruiter_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AssignedVacancyRow[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

const UserDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthV2();

  const { data: users, isLoading: usersLoading } = useUsers();
  const user = useMemo(() => users?.find((u) => u.id === id), [users, id]);

  const updateProfile = useUpdateUserProfile();
  const setUserActive = useSetUserActive();

  const { data: assignedVacancies, isLoading: vacanciesLoading } = useAssignedVacancies(id);

  const { data: allGrants, isLoading: grantsLoading } = useGrants();
  const userGrants = useMemo(() => (allGrants ?? []).filter((g) => g.user_id === id), [allGrants, id]);
  const revokeGrant = useRevokeGrant();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const startEditing = () => {
    setNameDraft(user?.full_name || "");
    setIsEditingName(true);
  };

  const cancelEditing = () => {
    setIsEditingName(false);
    setNameDraft("");
  };

  const saveName = () => {
    if (!id) return;
    const trimmed = nameDraft.trim();
    if (trimmed.length < 1 || trimmed.length > 120) return;
    updateProfile.mutate(
      { user_id: id, full_name: trimmed },
      { onSuccess: () => setIsEditingName(false) },
    );
  };

  if (usersLoading) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Завантаження...</div>
      </AtsLayout>
    );
  }

  if (!user) {
    return (
      <AtsLayout>
        <div className="p-6 lg:p-8">
          <Button variant="ghost" size="sm" onClick={() => navigate("/ats/users")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            До списку користувачів
          </Button>
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Користувача не знайдено
            </CardContent>
          </Card>
        </div>
      </AtsLayout>
    );
  }

  const isSelf = user.id === currentUser?.id;

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/ats/users")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          До списку користувачів
        </Button>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="space-y-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={120}
                      className="max-w-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") cancelEditing();
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={updateProfile.isPending || nameDraft.trim().length < 1}
                      onClick={saveName}
                      title="Зберегти"
                    >
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditing} title="Скасувати">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">{user.full_name || "Без імені"}</h1>
                    <Button size="icon" variant="ghost" onClick={startEditing} title="Редагувати імʼя">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-muted-foreground">{user.email || user.id}</p>
              </div>

              <div className="flex items-center gap-3">
                {statusBadge(user)}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isSelf || setUserActive.isPending}
                  title={isSelf ? "Не можна деактивувати власний обліковий запис" : undefined}
                  onClick={() => setUserActive.mutate({ user_id: user.id, active: user.banned })}
                >
                  {user.banned ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
                      Активувати
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2 text-destructive" />
                      Деактивувати
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Ролі</p>
              <UserRoleBadges user={user} currentUserId={currentUser?.id} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Відповідальні вакансії
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vacanciesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
            ) : !assignedVacancies || assignedVacancies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Немає призначених вакансій</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Вакансія</TableHead>
                    <TableHead>Проект</TableHead>
                    <TableHead>Клієнт</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedVacancies.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Link to={`/ats/vacancies/${v.id}`} className="font-medium text-primary hover:underline">
                          {v.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.hiring_project?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {v.hiring_project?.client?.name || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={vacancyStatusColor[v.status]}>
                          {vacancyStatusLabel[v.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              Доступи
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grantsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Завантаження...</div>
            ) : userGrants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Немає виданих доступів</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Обʼєкт</TableHead>
                    <TableHead>Редагування</TableHead>
                    <TableHead>Фінанси</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userGrants.map((grant) => (
                    <TableRow key={grant.id}>
                      <TableCell>
                        <Badge variant="outline">{scopeTypeLabel[grant.scope_type]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {grant.scope_name || grant.scope_id}
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={grant.can_edit} disabled />
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={grant.can_view_financials} disabled />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => revokeGrant.mutate(grant.id)}
                          disabled={revokeGrant.isPending}
                          title="Відкликати"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AtsLayout>
  );
};

export default UserDetailPage;
