import { useNavigate } from "react-router-dom";
import { AtsLayout } from "@/components/layout/AtsLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase } from "lucide-react";
import { useHiringProjects } from "@/hooks/ats/use-hiring-projects";
import type { Database } from "@/integrations/supabase/types";

type HiringProjectStatus = Database["public"]["Enums"]["hiring_project_status"];

const statusLabel: Record<HiringProjectStatus, string> = {
  draft: "Чернетка",
  active: "Активний",
  on_hold: "На паузі",
  closed: "Закрито",
  cancelled: "Скасовано",
};

const statusColor: Record<HiringProjectStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  active: "bg-green-100 text-green-800",
  on_hold: "bg-yellow-100 text-yellow-800",
  closed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-700",
};

const ProjectsListPage = () => {
  const navigate = useNavigate();
  const { data: projects, isLoading, isError, error } = useHiringProjects();

  return (
    <AtsLayout>
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground">Проекти найму</h1>
          <p className="text-muted-foreground mt-1">Усі проекти найму, доступні вам</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Завантаження...</div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              {error instanceof Error ? error.message : "Не вдалося завантажити проекти найму"}
            </CardContent>
          </Card>
        ) : !projects || projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Ще немає проектів найму</p>
              <p className="text-sm mt-1">Створіть проект найму з картки клієнта</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Назва</TableHead>
                  <TableHead>Клієнт</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дедлайн</TableHead>
                  <TableHead>Дата створення</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ats/projects/${project.id}`)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {project.name}
                        {project.code && (
                          <span className="text-xs text-muted-foreground">#{project.code}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{project.client?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge className={statusColor[project.status]}>{statusLabel[project.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.target_date
                        ? new Date(project.target_date).toLocaleDateString("uk-UA")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(project.created_at).toLocaleDateString("uk-UA")}
                    </TableCell>
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

export default ProjectsListPage;
