import { useState } from "react";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateCandidate } from "@/hooks/ats/use-candidates";
import { useMoveApplication, type ApplicationWithCandidate } from "@/hooks/ats/use-applications";
import type { PipelineStage } from "@/hooks/ats/use-pipeline";

interface LongListTableProps {
  vacancyId: string;
  applications: ApplicationWithCandidate[];
  stages: PipelineStage[];
  canEdit: boolean;
}

interface RowDraft {
  company: string;
  title: string;
  notes: string;
}

/**
 * Таблична робота з лонг-листом — те, що раніше жило в Excel.
 *
 * Kanban зручний для руху по стадіях, але лонг-лист на 100+ рядків читається
 * і правиться саме таблицею: компанія, посада, коментар — прямо в рядку.
 * Стадія тут теж змінюється (select), тому обидва види — про одні й ті самі дані.
 */
export function LongListTable({ vacancyId, applications, stages, canEdit }: LongListTableProps) {
  const updateCandidate = useUpdateCandidate();
  const moveApplication = useMoveApplication();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});

  const getDraft = (application: ApplicationWithCandidate): RowDraft => {
    const candidate = application.candidate;
    return (
      drafts[application.id] ?? {
        company: (candidate as { current_company?: string | null })?.current_company ?? "",
        title: candidate?.headline ?? "",
        notes: candidate?.notes ?? "",
      }
    );
  };

  const setDraft = (applicationId: string, patch: Partial<RowDraft>, base: RowDraft) =>
    setDrafts((prev) => ({ ...prev, [applicationId]: { ...base, ...patch } }));

  const isDirty = (application: ApplicationWithCandidate) => {
    const draft = drafts[application.id];
    if (!draft) return false;
    const candidate = application.candidate;
    return (
      draft.company !== ((candidate as { current_company?: string | null })?.current_company ?? "") ||
      draft.title !== (candidate?.headline ?? "") ||
      draft.notes !== (candidate?.notes ?? "")
    );
  };

  const saveRow = (application: ApplicationWithCandidate) => {
    const draft = drafts[application.id];
    if (!draft) return;
    updateCandidate.mutate(
      {
        id: application.candidate_id,
        patch: {
          current_company: draft.company.trim() || null,
          headline: draft.title.trim() || null,
          notes: draft.notes.trim() || null,
        },
      },
      {
        onSuccess: () =>
          setDrafts((prev) => {
            const next = { ...prev };
            delete next[application.id];
            return next;
          }),
      },
    );
  };

  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
        У цьому етапі ще немає кандидатів — додайте вручну або імпортуйте лонг-лист з Excel
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr className="text-left">
              <th className="p-2 w-48">ПІБ</th>
              <th className="p-2 w-44">Компанія</th>
              <th className="p-2 w-44">Посада</th>
              <th className="p-2 w-44">Стадія</th>
              <th className="p-2">Коментар</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const draft = getDraft(application);
              const dirty = isDirty(application);
              const rejected = application.status !== "active";
              return (
                <tr key={application.id} className={`border-t ${rejected ? "opacity-50" : ""}`}>
                  <td className="p-2 align-top">
                    <Link
                      to={`/ats/candidates/${application.candidate_id}`}
                      className="font-medium hover:underline"
                    >
                      {application.candidate?.full_name ?? "Без імені"}
                    </Link>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {rejected && (
                        <Badge className="bg-red-100 text-red-800 text-[10px]">Відмова</Badge>
                      )}
                      {application.list_state === "short_list" && (
                        <Badge className="bg-amber-100 text-amber-800 text-[10px]">Short list</Badge>
                      )}
                      {application.candidate?.email && (
                        <span className="text-[10px] text-muted-foreground">
                          {application.candidate.email}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 align-top">
                    <Input
                      className="h-7 text-xs"
                      value={draft.company}
                      disabled={!canEdit}
                      onChange={(e) => setDraft(application.id, { company: e.target.value }, draft)}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Input
                      className="h-7 text-xs"
                      value={draft.title}
                      disabled={!canEdit}
                      onChange={(e) => setDraft(application.id, { title: e.target.value }, draft)}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Select
                      value={application.current_stage_id ?? undefined}
                      disabled={!canEdit || rejected}
                      onValueChange={(stageId) =>
                        moveApplication.mutate({ applicationId: application.id, stageId, vacancyId })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id} className="text-xs">
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 align-top">
                    <Input
                      className="h-7 text-xs"
                      value={draft.notes}
                      disabled={!canEdit}
                      onChange={(e) => setDraft(application.id, { notes: e.target.value }, draft)}
                    />
                  </td>
                  <td className="p-2 align-top">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={!dirty || updateCandidate.isPending}
                      onClick={() => saveRow(application)}
                    >
                      Зберегти
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
