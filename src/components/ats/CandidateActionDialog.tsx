import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  useMessageTemplates,
  pickTemplateForPhase,
  renderTemplate,
  useSaveVacancyTemplate,
  type MessageTemplateKind,
} from "@/hooks/ats/use-message-templates";
import { useDraftCommunication } from "@/hooks/ats/use-comm-drafts";
import { useRejectionReasons, useRejectApplication } from "@/hooks/ats/use-rejections";
import { useSendCommunicationNow } from "@/hooks/ats/use-communications";
import { useMoveApplication, type ApplicationWithCandidate } from "@/hooks/ats/use-applications";
import type { PipelineStage } from "@/hooks/ats/use-pipeline";
import type { SearchPhase, SearchPhaseKind } from "@/hooks/ats/use-search-phases";
import type { Database } from "@/integrations/supabase/types";

type RejectionCategory = Database["public"]["Enums"]["rejection_category"];

const CUSTOM_REASON = "__custom__";

interface CandidateActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: MessageTemplateKind;
  application: ApplicationWithCandidate;
  vacancyId: string;
  vacancyTitle: string;
  clientName?: string | null;
  recruiterName?: string | null;
  /** Етап, на якому кандидат зараз (для вибору шаблону). */
  currentPhaseKind: SearchPhaseKind | null;
  phases: SearchPhase[];
  stages: PipelineStage[];
  /** Стадія, на яку перевести при запрошенні (перша стадія наступного етапу). */
  defaultNextStageId: string | null;
}

/**
 * Дія з кандидатом на етапі: «Відмовити» або «Запросити на наступний етап».
 *
 * Обидві дії: шаблон → підстановка змінних → (опційно) AI-персоналізація →
 * рекрутер редагує → відправка листа (Resend) → зміна стану заявки.
 * Рішення завжди ухвалює людина: AI лише готує текст.
 *
 * Відмова: причина обовʼязкова (зі списку або кастомна), лист — за бажанням
 * (чекбокс «без листа»: кандидат уже повідомлений усно / сам знявся).
 * Запрошення: заявка переводиться на обрану стадію наступного етапу.
 */
export function CandidateActionDialog({
  open,
  onOpenChange,
  kind,
  application,
  vacancyId,
  vacancyTitle,
  clientName,
  recruiterName,
  currentPhaseKind,
  phases,
  stages,
  defaultNextStageId,
}: CandidateActionDialogProps) {
  const { data: templates } = useMessageTemplates(vacancyId, kind);
  const { data: reasons } = useRejectionReasons();
  const draft = useDraftCommunication();
  const sendNow = useSendCommunicationNow();
  const rejectApplication = useRejectApplication();
  const moveApplication = useMoveApplication();
  const saveTemplate = useSaveVacancyTemplate();

  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [withoutEmail, setWithoutEmail] = useState(false);
  const [reasonId, setReasonId] = useState<string>("");
  const [customReason, setCustomReason] = useState("");
  const [targetStageId, setTargetStageId] = useState<string>("");
  const [extraNotes, setExtraNotes] = useState("");

  const candidateName = application.candidate?.full_name ?? "Кандидат";
  const candidateEmail = application.candidate?.email ?? null;
  const currentStage = stages.find((s) => s.id === application.current_stage_id) ?? null;

  const vars = useMemo(
    () => ({
      name: candidateName,
      vacancy: vacancyTitle,
      company: clientName ?? null,
      stage: currentStage?.name ?? null,
      recruiter: recruiterName ?? null,
      date: meetingDate ? new Date(meetingDate).toLocaleString("uk-UA") : null,
    }),
    [candidateName, vacancyTitle, clientName, currentStage?.name, recruiterName, meetingDate],
  );

  const selectedTemplate = (templates ?? []).find((t) => t.id === templateId) ?? null;

  // Первинне заповнення: дефолтний шаблон під етап + стадія-ціль для запрошення.
  useEffect(() => {
    if (!open) return;
    const preset = pickTemplateForPhase(templates ?? [], currentPhaseKind);
    if (preset) {
      setTemplateId(preset.id);
      setSubject(renderTemplate(preset.subject ?? "", vars));
      setBody(renderTemplate(preset.body, vars));
    }
    setTargetStageId(defaultNextStageId ?? "");
    // Змінні перерендерюються при зміні дати нижче — тут лише старт діалогу.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templates, currentPhaseKind, defaultNextStageId]);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const template = (templates ?? []).find((t) => t.id === id);
    if (!template) return;
    setSubject(renderTemplate(template.subject ?? "", vars));
    setBody(renderTemplate(template.body, vars));
  };

  const reasonText = useMemo(() => {
    if (reasonId === CUSTOM_REASON) return customReason.trim();
    const reason = (reasons ?? []).find((r) => r.id === reasonId);
    return reason?.label ?? "";
  }, [reasonId, customReason, reasons]);

  const handleAiDraft = () => {
    draft.mutate(
      {
        applicationId: application.id,
        kind,
        reason: kind === "rejection" ? reasonText || undefined : undefined,
        templateBody: body || selectedTemplate?.body || undefined,
        extraNotes: extraNotes.trim() || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.subject) setSubject(renderTemplate(result.subject, vars));
          setBody(renderTemplate(result.body, vars));
          toast.success("Чернетку згенеровано — перевірте текст перед відправкою");
        },
      },
    );
  };

  const canSubmit = (() => {
    if (kind === "rejection") {
      if (!reasonId) return false;
      if (reasonId === CUSTOM_REASON && !customReason.trim()) return false;
      if (!withoutEmail && (!body.trim() || !candidateEmail)) return false;
      return true;
    }
    if (!targetStageId) return false;
    if (!withoutEmail && (!body.trim() || !candidateEmail)) return false;
    return true;
  })();

  const isBusy =
    sendNow.isPending || rejectApplication.isPending || moveApplication.isPending || draft.isPending;

  const sendEmailIfNeeded = async () => {
    if (withoutEmail) return;
    await sendNow.mutateAsync({
      candidate_id: application.candidate_id,
      channel: "email",
      subject: subject.trim() || undefined,
      body: body.trim(),
    });
  };

  const handleSubmit = async () => {
    try {
      await sendEmailIfNeeded();

      if (kind === "rejection") {
        const reason = (reasons ?? []).find((r) => r.id === reasonId);
        const reasonCode: RejectionCategory = reason?.category ?? "other";
        await rejectApplication.mutateAsync({
          applicationId: application.id,
          vacancyId,
          candidateId: application.candidate_id,
          reasonId: reasonId === CUSTOM_REASON ? null : reasonId,
          reasonCode,
          comment: reasonId === CUSTOM_REASON ? customReason.trim() : extraNotes.trim() || null,
          isCandidateInitiated: reasonCode === "candidate_withdrew",
        });
      } else {
        await moveApplication.mutateAsync({
          applicationId: application.id,
          stageId: targetStageId,
          vacancyId,
        });
      }

      onOpenChange(false);
      resetState();
    } catch {
      // Тости про помилку показують самі хуки; діалог лишаємо відкритим,
      // щоб рекрутер не втратив набраний текст.
    }
  };

  const resetState = () => {
    setWithoutEmail(false);
    setReasonId("");
    setCustomReason("");
    setExtraNotes("");
    setMeetingDate("");
  };

  const isRejection = kind === "rejection";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetState();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isRejection ? "Відмова кандидату" : "Запрошення на наступний етап"} — {candidateName}
          </DialogTitle>
          <DialogDescription>
            {isRejection
              ? "Причина обовʼязкова. Лист можна не надсилати (якщо кандидат уже повідомлений)."
              : "Кандидат отримає лист і перейде на обрану стадію наступного етапу."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isRejection ? (
            <div className="space-y-2">
              <Label>Причина відмови *</Label>
              <Select value={reasonId} onValueChange={setReasonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Оберіть причину" />
                </SelectTrigger>
                <SelectContent>
                  {(reasons ?? []).map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_REASON}>Своя причина…</SelectItem>
                </SelectContent>
              </Select>
              {reasonId === CUSTOM_REASON && (
                <Textarea
                  placeholder="Сформулюйте причину (піде в журнал, не в лист дослівно)"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={2}
                />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Перевести на стадію *</Label>
                <Select value={targetStageId} onValueChange={setTargetStageId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть стадію" />
                  </SelectTrigger>
                  <SelectContent>
                    {phases.map((phase) => {
                      const phaseStages = stages.filter((s) => s.phase_id === phase.id);
                      if (phaseStages.length === 0) return null;
                      return (
                        <SelectGroup key={phase.id}>
                          <SelectLabel className="text-[11px]">{phase.name}</SelectLabel>
                          {phaseStages.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="action-date">Дата зустрічі (змінна {"{{date}}"})</Label>
                <Input
                  id="action-date"
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="without-email"
              checked={withoutEmail}
              onCheckedChange={(checked) => setWithoutEmail(checked === true)}
            />
            <Label htmlFor="without-email" className="text-sm font-normal">
              Без листа {isRejection ? "(кандидат уже повідомлений або сам знявся)" : "(домовились інакше)"}
            </Label>
          </div>

          {!withoutEmail && (
            <>
              <div className="space-y-2">
                <Label>Шаблон</Label>
                <Select value={templateId} onValueChange={applyTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Оберіть шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    {(templates ?? []).map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                        {template.vacancy_id ? " (ця вакансія)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Тема</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Текст листа</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={draft.isPending || (isRejection && !reasonText)}
                    onClick={handleAiDraft}
                    title={
                      isRejection && !reasonText
                        ? "Спершу вкажіть причину — AI персоналізує текст під неї"
                        : "Персоналізувати текст під кандидата"
                    }
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {draft.isPending ? "Генерація..." : "AI-чернетка"}
                  </Button>
                </div>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} />
                {!candidateEmail && (
                  <p className="text-xs text-destructive">
                    У кандидата немає email — лист відправити неможливо. Позначте «Без листа».
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Контекст для AI (не потрапляє в лист)
                </Label>
                <Textarea
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  rows={2}
                  placeholder="Напр.: сильний в казначействі, слабший у fundraising; спілкувались 10.07"
                />
              </div>

              {body.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={saveTemplate.isPending}
                  onClick={() =>
                    saveTemplate.mutate({
                      vacancyId,
                      kind,
                      phaseKind: currentPhaseKind,
                      name: `${isRejection ? "Відмова" : "Запрошення"} — ${vacancyTitle}`,
                      subject: subject.trim() || null,
                      body,
                    })
                  }
                >
                  Зберегти як шаблон цієї вакансії
                </Button>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
            Скасувати
          </Button>
          <Button
            variant={isRejection ? "destructive" : "default"}
            disabled={!canSubmit || isBusy}
            onClick={handleSubmit}
          >
            {isBusy
              ? "Виконується..."
              : isRejection
                ? withoutEmail
                  ? "Відмовити без листа"
                  : "Відправити відмову"
                : withoutEmail
                  ? "Перевести без листа"
                  : "Відправити і перевести"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
