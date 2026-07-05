// src/components/ats/BriefTab.tsx
//
// Вкладка "Бріф" на сторінці вакансії — форма по 15 секціях Додатку C
// (акордеон), autosave кнопкою "Зберегти", перемикач статусу draft/completed.
// Фінансові питання секції "Умови" — окремий блок, пише в vacancy_brief_financials;
// якщо читання падає RLS-ом (mp_can_view_vacancy_financials) — показуємо
// "Фінансова інформація прихована" без падіння сторінки.
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BRIEF_SECTIONS, CONDITIONS_SECTION_KEY } from "@/lib/ats/brief-questions";
import type { Json } from "@/integrations/supabase/types";
import {
  useVacancyBrief,
  useVacancyBriefFinancials,
  useCanViewVacancyFinancials,
  useSaveVacancyBrief,
  useSetVacancyBriefStatus,
  useSaveVacancyBriefFinancials,
} from "@/hooks/ats/use-vacancy-brief";

interface BriefTabProps {
  vacancyId: string;
}

type AnswersMap = Record<string, Record<string, string>>;

export function BriefTab({ vacancyId }: BriefTabProps) {
  const { data: brief, isLoading } = useVacancyBrief(vacancyId);
  const { data: canViewFinancials } = useCanViewVacancyFinancials(vacancyId);
  const { data: financials } = useVacancyBriefFinancials(canViewFinancials ? brief?.id : undefined);
  const saveBrief = useSaveVacancyBrief();
  const setStatus = useSetVacancyBriefStatus();
  const saveFinancials = useSaveVacancyBriefFinancials();

  const [answers, setAnswers] = useState<AnswersMap>({});
  const [financialAnswers, setFinancialAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (brief?.answers && typeof brief.answers === "object") {
      setAnswers(brief.answers as AnswersMap);
    }
  }, [brief?.id]);

  useEffect(() => {
    if (financials?.answers && typeof financials.answers === "object") {
      setFinancialAnswers(financials.answers as Record<string, string>);
    }
  }, [financials?.id]);

  const setAnswer = (sectionKey: string, questionKey: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [questionKey]: value },
    }));
  };

  const handleSave = () => {
    saveBrief.mutate({ vacancyId, answers: answers as Json });
  };

  const handleToggleStatus = (checked: boolean) => {
    if (!brief?.id) {
      // Немає ще жодного збереженого брифу — спершу створюємо його зі статусом одразу.
      saveBrief.mutate({ vacancyId, answers: answers as Json, status: checked ? "completed" : "draft" });
      return;
    }
    setStatus.mutate({ briefId: brief.id, vacancyId, status: checked ? "completed" : "draft" });
  };

  const handleSaveFinancials = () => {
    if (!brief?.id) {
      saveBrief.mutate(
        { vacancyId, answers: answers as Json },
        {
          onSuccess: (data) => {
            saveFinancials.mutate({ vacancyBriefId: data.id, answers: financialAnswers as Json });
          },
        },
      );
      return;
    }
    saveFinancials.mutate({ vacancyBriefId: brief.id, answers: financialAnswers as Json });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Завантаження брифу...</div>;
  }

  const isCompleted = brief?.status === "completed";
  const financialsHidden = !canViewFinancials;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Badge variant={isCompleted ? "default" : "outline"}>{isCompleted ? "Завершено" : "Чернетка"}</Badge>
          <div className="flex items-center gap-2 ml-4">
            <Switch id="brief-status" checked={isCompleted} onCheckedChange={handleToggleStatus} />
            <Label htmlFor="brief-status" className="text-sm cursor-pointer">
              Бріф завершено
            </Label>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saveBrief.isPending}>
          {saveBrief.isPending ? "Збереження..." : "Зберегти"}
        </Button>
      </div>

      <Accordion type="multiple" className="w-full">
        {BRIEF_SECTIONS.map((section) => (
          <AccordionItem key={section.sectionKey} value={section.sectionKey}>
            <AccordionTrigger className="text-sm font-medium">{section.title}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {section.questions
                .filter((q) => !q.financial)
                .map((q) => (
                  <div key={q.key} className="space-y-1.5">
                    <Label htmlFor={`${section.sectionKey}-${q.key}`}>{q.label}</Label>
                    {q.type === "textarea" ? (
                      <Textarea
                        id={`${section.sectionKey}-${q.key}`}
                        value={answers[section.sectionKey]?.[q.key] ?? ""}
                        onChange={(e) => setAnswer(section.sectionKey, q.key, e.target.value)}
                        className="min-h-[70px]"
                      />
                    ) : q.type === "radio" && q.options ? (
                      <RadioGroup
                        value={answers[section.sectionKey]?.[q.key] ?? ""}
                        onValueChange={(v) => setAnswer(section.sectionKey, q.key, v)}
                        className="flex flex-wrap gap-4"
                      >
                        {q.options.map((opt) => (
                          <div key={opt} className="flex items-center gap-1.5">
                            <RadioGroupItem value={opt} id={`${section.sectionKey}-${q.key}-${opt}`} />
                            <Label htmlFor={`${section.sectionKey}-${q.key}-${opt}`} className="text-sm font-normal cursor-pointer">
                              {opt}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <Input
                        id={`${section.sectionKey}-${q.key}`}
                        value={answers[section.sectionKey]?.[q.key] ?? ""}
                        onChange={(e) => setAnswer(section.sectionKey, q.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}

              {section.sectionKey === CONDITIONS_SECTION_KEY && (
                <Card className="border-dashed">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Фінансові умови (компенсація/бонуси)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {financialsHidden ? (
                      <p className="text-sm text-muted-foreground">Фінансова інформація прихована</p>
                    ) : (
                      <>
                        {section.questions
                          .filter((q) => q.financial)
                          .map((q) => (
                            <div key={q.key} className="space-y-1.5">
                              <Label htmlFor={`fin-${q.key}`}>{q.label}</Label>
                              <Textarea
                                id={`fin-${q.key}`}
                                value={financialAnswers[q.key] ?? ""}
                                onChange={(e) =>
                                  setFinancialAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                                }
                                className="min-h-[60px]"
                              />
                            </div>
                          ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleSaveFinancials}
                          disabled={saveFinancials.isPending}
                        >
                          {saveFinancials.isPending ? "Збереження..." : "Зберегти фінансові умови"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
