import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Building2, ChevronLeft, Send, CheckCircle2,
  TrendingUp, TrendingDown, Lightbulb, Loader2,
} from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCandidateAssignments, analyzeSubmission, type AssignmentRow, type AIAnalysisResult } from "@/hooks/useCases";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
import { toast } from "sonner";

const difficultyLabel: Record<string, string> = {
  junior: "Junior", middle: "Middle", senior: "Senior",
};
const difficultyColor: Record<string, string> = {
  junior: "bg-green-100 text-green-800",
  middle: "bg-yellow-100 text-yellow-800",
  senior: "bg-red-100 text-red-800",
};
const recommendationLabel: Record<string, { label: string; color: string }> = {
  strong_hire: { label: "Рекомендовано до найму", color: "text-green-700 bg-green-50 border-green-200" },
  hire:        { label: "Підходить", color: "text-blue-700 bg-blue-50 border-blue-200" },
  maybe:       { label: "Потребує обговорення", color: "text-yellow-700 bg-yellow-50 border-yellow-200" },
  no_hire:     { label: "Не підходить", color: "text-red-700 bg-red-50 border-red-200" },
};

type Stage = "filling" | "submitting" | "analyzing" | "done";

const CaseWorkPage = () => {
  const { id: assignmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthV2();
  const { submitCase, markInProgress } = useCandidateAssignments(user?.id ?? null);

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("filling");
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!assignmentId) return;
    fetchAssignment();
  }, [assignmentId]);

  const fetchAssignment = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("case_assignments")
      .select(`
        id, candidate_id, status, deadline, message, created_at, case_id,
        cases (
          id, title, description, context, tasks,
          difficulty, duration_minutes, position_title,
          companies ( id, name )
        )
      `)
      .eq("id", assignmentId!)
      .maybeSingle();

    if (error || !data) {
      toast.error("Кейс не знайдено");
      navigate("/v2/candidate");
      return;
    }

    const mapped: AssignmentRow = {
      ...data,
      cases: data.cases
        ? {
            ...data.cases,
            tasks: (data.cases.tasks as unknown as { id: string; title: string; description?: string }[]) || [],
            companies: Array.isArray(data.cases.companies)
              ? data.cases.companies[0] ?? null
              : (data.cases.companies as { id: string; name: string } | null),
          }
        : null,
    };

    setAssignment(mapped);
    if (data.status === "pending") await markInProgress(assignmentId!);
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!assignment || !user) return;

    const tasks = assignment.cases?.tasks || [];
    const unanswered = tasks.filter((t) => !answers[t.id]?.trim());
    if (unanswered.length > 0) {
      toast.error(`Заповніть всі завдання (${unanswered.length} залишилось)`);
      return;
    }

    const answersArray = tasks.map((t) => ({
      task_id: t.id,
      answer: answers[t.id] || "",
    }));
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 60000);

    // Step 1: submit
    setStage("submitting");
    const ok = await submitCase(
      assignment.id,
      assignment.case_id,
      user.id,
      answersArray,
      timeSpent
    );
    if (!ok) { setStage("filling"); return; }

    // Step 2: AI analysis
    setStage("analyzing");
    const result = await analyzeSubmission({
      assignmentId: assignment.id,
      caseId: assignment.case_id,
      candidateId: assignment.candidate_id,
      companyId: assignment.cases?.companies?.id ?? null,
      companyName: assignment.cases?.companies?.name ?? "Компанія",
      positionTitle: assignment.cases?.position_title ?? "Позиція",
      tasks,
      answers: answersArray,
    });

    setAiResult(result);
    setStage("done");
  };

  // ── Loading skeleton ─────────────────────────────────────────
  if (isLoading) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </V2AppLayout>
    );
  }

  // ── Analyzing overlay ────────────────────────────────────────
  if (stage === "analyzing") {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-xl mx-auto mt-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-6" />
          <h2 className="text-xl font-semibold mb-2">Аналізуємо ваші відповіді</h2>
          <p className="text-muted-foreground">
            AI оцінює відповіді на відповідність вимогам позиції.<br />
            Це займе кілька секунд...
          </p>
        </div>
      </V2AppLayout>
    );
  }

  // ── Done: show AI result ─────────────────────────────────────
  if (stage === "done") {
    const rec = aiResult
      ? recommendationLabel[aiResult.recommendation] ?? { label: aiResult.recommendation, color: "" }
      : null;

    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold">Кейс успішно здано!</h1>
            <p className="text-muted-foreground mt-2">
              {assignment?.cases?.title} · {assignment?.cases?.companies?.name}
            </p>
          </div>

          {aiResult ? (
            <div className="space-y-4">
              {/* Overall score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Загальна оцінка</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold text-primary">{aiResult.overallScore}/100</span>
                    {rec && (
                      <span className={`text-sm font-medium px-3 py-1 rounded-full border ${rec.color}`}>
                        {rec.label}
                      </span>
                    )}
                  </div>
                  <Progress value={aiResult.overallScore} className="h-2" />
                  {aiResult.summary && (
                    <p className="text-sm text-muted-foreground mt-2">{aiResult.summary}</p>
                  )}
                </CardContent>
              </Card>

              {/* Fit scores */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Культура", value: aiResult.cultureFit },
                  { label: "Технічне", value: aiResult.technicalFit },
                  { label: "Soft skills", value: aiResult.softSkillsFit },
                ].map(({ label, value }) => (
                  <Card key={label}>
                    <CardContent className="p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{value}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                      <Progress value={value} className="h-1 mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiResult.strengths?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                        <TrendingUp className="h-4 w-4" />
                        Сильні сторони
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {aiResult.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {aiResult.weaknesses?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
                        <TrendingDown className="h-4 w-4" />
                        Зони розвитку
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {aiResult.weaknesses.map((w, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">•</span>{w}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Development suggestions */}
              {aiResult.developmentSuggestions?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                      <Lightbulb className="h-4 w-4" />
                      Рекомендації для розвитку
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {aiResult.developmentSuggestions.map((s, i) => (
                        <li key={i} className="text-sm text-foreground flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>{s}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="p-3 bg-accent/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>AI-аналіз:</strong> Цей звіт є дорадчим. Компанія може враховувати його при прийнятті рішення.
                </p>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>Ваші відповіді збережено. AI-аналіз буде доступний пізніше.</p>
              </CardContent>
            </Card>
          )}

          <Button className="w-full mt-6" onClick={() => navigate("/v2/candidate")}>
            До кабінету кандидата
          </Button>
        </div>
      </V2AppLayout>
    );
  }

  // ── Filling form ─────────────────────────────────────────────
  if (!assignment?.cases) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Кейс не знайдено</div>
      </V2AppLayout>
    );
  }

  const { cases } = assignment;
  const tasks = cases.tasks || [];
  const answeredCount = tasks.filter((t) => answers[t.id]?.trim()).length;

  return (
    <V2AppLayout role="candidate">
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate("/v2/candidate")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Назад до кабінету
        </button>

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge className={difficultyColor[cases.difficulty] || ""}>
              {difficultyLabel[cases.difficulty] || cases.difficulty}
            </Badge>
            {cases.position_title && <Badge variant="outline">{cases.position_title}</Badge>}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{cases.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {cases.companies?.name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />{cases.companies.name}
              </span>
            )}
            {cases.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />~{cases.duration_minutes} хв
              </span>
            )}
          </div>
          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Відповіді</span>
                <span>{answeredCount}/{tasks.length}</span>
              </div>
              <Progress value={(answeredCount / tasks.length) * 100} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Context */}
        {cases.context && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Контекст</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{cases.context}</p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Опис завдання</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{cases.description}</p>
          </CardContent>
        </Card>

        {/* Company message */}
        {assignment.message && (
          <Card className="mb-6 bg-accent/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Повідомлення від компанії</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground italic">{assignment.message}</p>
            </CardContent>
          </Card>
        )}

        {/* Tasks */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-medium">Завдання</h2>
          {tasks.map((task, index) => {
            const filled = !!answers[task.id]?.trim();
            return (
              <Card key={task.id} className={filled ? "border-green-200" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {filled && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                    Завдання {index + 1}: {task.title}
                  </CardTitle>
                  {task.description && (
                    <CardDescription className="whitespace-pre-wrap">{task.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Введіть вашу відповідь..."
                    value={answers[task.id] || ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [task.id]: e.target.value }))}
                    rows={6}
                    className="resize-y"
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            {answeredCount < tasks.length
              ? `Залишилось ${tasks.length - answeredCount} завдань`
              : "Всі завдання заповнені — можна здавати"}
          </p>
          <Button
            onClick={handleSubmit}
            disabled={stage === "submitting" || answeredCount < tasks.length}
            size="lg"
          >
            {stage === "submitting" ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Збереження...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Здати кейс</>
            )}
          </Button>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CaseWorkPage;
