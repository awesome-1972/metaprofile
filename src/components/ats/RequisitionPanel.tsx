// src/components/ats/RequisitionPanel.tsx
//
// Requisition + approval flow (roadmap-ATS-platform.md розділ 2, MVP+):
// формальна заявка на підбір із затвердженням draft→pending_approval→approved
// (або changes_requested / rejected). Той самий компонент для ОБОХ рівнів —
// вакансії й проекту найму (рішення власника «обидва рівні»).
//
// Хто що може (гейти дублюють серверний guard mp_*_requisition_guard —
// UI лише ховає кнопки; фінальне рішення завжди за БД):
//   • подати на затвердження / відкликати / повернути в чернетку — будь-який
//     редактор scope (canEdit);
//   • затвердити / на доопрацювання / відхилити — owner/admin або відповідальний
//     (canApprove).
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, ClipboardCheck, RotateCcw, Send, XCircle } from "lucide-react";
import type { RequisitionApprovalStatus } from "@/hooks/ats/use-vacancies";

const statusLabel: Record<RequisitionApprovalStatus, string> = {
  draft: "Чернетка",
  pending_approval: "Очікує затвердження",
  approved: "Затверджено",
  changes_requested: "На доопрацюванні",
  rejected: "Відхилено",
};

const statusColor: Record<RequisitionApprovalStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  changes_requested: "bg-orange-100 text-orange-800",
  rejected: "bg-red-100 text-red-700",
};

type DecisionStatus = "approved" | "changes_requested" | "rejected";

export interface RequisitionPanelProps {
  level: "vacancy" | "project";
  approvalStatus: RequisitionApprovalStatus;
  approvalNote: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  /** owner/admin або відповідальний — бачить кнопки рішення. */
  canApprove: boolean;
  /** редактор scope — бачить submit/відкликати/повернути в чернетку. */
  canEdit: boolean;
  isBusy?: boolean;
  onSubmit: () => void;
  onDecide: (status: DecisionStatus, note: string | null) => void;
  onReturnToDraft: () => void;
  /** підказка про блокування відкриття (напр. проект-батько ще не затверджений). */
  gateHint?: React.ReactNode;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RequisitionPanel({
  level,
  approvalStatus,
  approvalNote,
  submittedAt,
  approvedAt,
  canApprove,
  canEdit,
  isBusy = false,
  onSubmit,
  onDecide,
  onReturnToDraft,
  gateHint,
}: RequisitionPanelProps) {
  const [decision, setDecision] = useState<DecisionStatus | null>(null);
  const [note, setNote] = useState("");

  const levelWord = level === "vacancy" ? "вакансії" : "проекту";
  const openWord = level === "vacancy" ? "відкрити вакансію" : "активувати проект";

  const openDecision = (status: DecisionStatus) => {
    setDecision(status);
    setNote(approvalNote ?? "");
  };

  const confirmDecision = () => {
    if (!decision) return;
    onDecide(decision, note.trim() || null);
    setDecision(null);
    setNote("");
  };

  const decisionTitle: Record<DecisionStatus, string> = {
    approved: "Затвердити requisition",
    changes_requested: "Повернути на доопрацювання",
    rejected: "Відхилити requisition",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Заявка на підбір (Requisition)
          </CardTitle>
          <Badge className={statusColor[approvalStatus]}>{statusLabel[approvalStatus]}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {approvalStatus === "draft" &&
            `Чернетка ${levelWord}. Подайте заявку на затвердження — після approve можна ${openWord}.`}
          {approvalStatus === "pending_approval" &&
            `Заявку подано на затвердження ${formatDate(submittedAt)}. Очікує рішення відповідального (owner/admin або відповідальний).`}
          {approvalStatus === "approved" && `Requisition затверджено ${formatDate(approvedAt)}. Можна ${openWord}.`}
          {approvalStatus === "changes_requested" &&
            "Повернуто на доопрацювання. Внесіть правки й подайте заявку повторно."}
          {approvalStatus === "rejected" && "Requisition відхилено."}
        </p>

        {approvalNote?.trim() && (approvalStatus === "changes_requested" || approvalStatus === "rejected" || approvalStatus === "approved") && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Коментар до рішення
            </div>
            {approvalNote}
          </div>
        )}

        {gateHint && <div className="text-xs text-amber-700">{gateHint}</div>}

        <div className="flex flex-wrap gap-2 pt-1">
          {/* submit / повторна подача */}
          {canEdit && (approvalStatus === "draft" || approvalStatus === "changes_requested") && (
            <Button size="sm" onClick={onSubmit} disabled={isBusy}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Подати на затвердження
            </Button>
          )}

          {/* рішення відповідального */}
          {canApprove && approvalStatus === "pending_approval" && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => openDecision("approved")}
                disabled={isBusy}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Затвердити
              </Button>
              <Button size="sm" variant="outline" onClick={() => openDecision("changes_requested")} disabled={isBusy}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                На доопрацювання
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => openDecision("rejected")} disabled={isBusy}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Відхилити
              </Button>
            </>
          )}

          {/* відкликати подану заявку назад у чернетку */}
          {canEdit && approvalStatus === "pending_approval" && (
            <Button size="sm" variant="ghost" onClick={onReturnToDraft} disabled={isBusy}>
              Відкликати
            </Button>
          )}

          {/* повернути відхилену в чернетку для переробки */}
          {canEdit && approvalStatus === "rejected" && (
            <Button size="sm" variant="ghost" onClick={onReturnToDraft} disabled={isBusy}>
              Повернути в чернетку
            </Button>
          )}
        </div>
      </CardContent>

      <Dialog open={!!decision} onOpenChange={(open) => !open && setDecision(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{decision ? decisionTitle[decision] : ""}</DialogTitle>
            <DialogDescription>
              {decision === "approved"
                ? "Коментар необовʼязковий."
                : "Вкажіть причину / що саме треба доопрацювати — коментар побачить автор заявки."}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={decision === "approved" ? "Напр.: погоджено з клієнтом" : "Напр.: уточніть вилку/бюджет і рівень позиції"}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>
              Скасувати
            </Button>
            <Button onClick={confirmDecision} disabled={isBusy}>
              Підтвердити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
