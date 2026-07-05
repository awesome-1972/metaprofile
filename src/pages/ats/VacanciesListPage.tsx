import { useNavigate } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { useVacancies } from "@/hooks/ats/use-vacancies";
import type { Database } from "@/integrations/supabase/types";

type VacancyStatus = Database["public"]["Enums"]["vacancy_status"];

const statusLabel: Record<VacancyStatus, string> = {
  draft: "Чернетка",
  open: "Відкрита",
  on_hold: "На паузі",
  filled: "Закрита наймом",
  closed: "Закрита",
  cancelled: "Скасована",
};

const statusColor: Record<VacancyStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  open: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  filled: "bg-blue-100 text-blue-800",
  closed: "bg-slate-200 text-slate-700",
  cancelled: "bg-red-100 text-red-700",
};

const VacanciesListPage = () => {
  const navigate = useNavigate();
  const { data: vacancies, isLoading, isError, error } = useVacancies();

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Вакансії</h1>
          <p className="text-muted-foreground mt-1">Усі вакансії, доступні вам</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити вакансії"}
            </CardContent>
          </Card>
        ) : !vacancies || vacancies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Ще немає вакансій</p>
              <p className="text-sm mt-1">Створіть вакансію з картки проекту найму</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Проект</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Заявок</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacancies.map((vacancy) => (
                  <TableRow
                    key={vacancy.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/vacancies/${vacancy.id}`)}
                  >
                    <TableCell className="font-medium">{vacancy.title}</TableCell>
                    <TableCell>{vacancy.hiring_project?.name ?? "—"}</TableCell>
                    <TableCell>{vacancy.hiring_project?.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[vacancy.status]}>{statusLabel[vacancy.status]}</Badge>
                    </TableCell>
                    <TableCell>{vacancy.applications_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </AtsLayout>
  );
};

export default VacanciesListPage;
