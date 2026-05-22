import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Clock, Building2, ChevronLeft, Send, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { getCandidateAssignment, submitCandidateAssignment } from "@/lib/candidateApi";
import { type CandidateAssignment, type CaseTask } from "@/lib/api";
import { toast } from "sonner";

const difficultyLabel: Record<string, string> = {
  junior: "Junior", middle: "Middle", senior: "Senior",
};
const difficultyColor: Record<string, string> = {
  junior: "bg-green-100 text-green-800",
  middle: "bg-yellow-100 text-yellow-800",
  senior: "bg-red-100 text-red-800",
};

type Stage = "filling" | "submitting" | "submitted";

const taskKey = (task: CaseTask, index: number): string =>
  task.id != null ? String(task.id) : `task-${index + 1}`;

const CaseWorkPage = () => {
  const { id: assignmentIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthV2();

  const [assignment, setAssignment] = useState<CandidateAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>("filling");
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!assignmentIdParam) return;
    const id = parseInt(assignmentIdParam, 10);
    if (isNaN(id)) {
      toast.error("Невірний ідентифікатор кейсу");
      navigate("/v2/candidate");
      return;
    }

    getCandidateAssignment(id)
      .then(data => {
        setAssignment(data);
        // Pre-fill answers if already submitted
        if (data.status === "submitted" || data.status === "evaluated") {
          setStage("submitted");
        }
      })
      .catch(() => {
        toast.error("Кейс не знайдено або немає доступу");
        navigate("/v2/candidate");
      })
      .finally(() => setIsLoading(false));
  }, [assignmentIdParam]);

  const handleSubmit = async () => {
    if (!assignment) return;

    const tasks = assignment.case?.tasks || [];
    const answersArray = tasks.map((task, index) => ({
      task_id: taskKey(task, index),
      answer: answers[taskKey(task, index)] || "",
    }));

    const unanswered = answersArray.filter(a => !a.answer.trim()).length;
    if (unanswered > 0) {
      toast.error(`Заповніть всі завдання (${unanswered} залишилось)`);
      return;
    }

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 60000);

    setStage("submitting");
    try {
      await submitCandidateAssignment(assignment.id, {
        answers: answersArray,
        time_spent_minutes: timeSpent,
      });
      toast.success("Кейс успішно здано!");
      setStage("submitted");
    } catch (error: any) {
      console.error("Submit error:", error);
      toast.error(error.message || "Помилка відправки відповіді");
      setStage("filling");
    }
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

  // ── Submitted success screen ─────────────────────────────────
  if (stage === "submitted") {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold">Кейс успішно здано!</h1>
            <p className="text-muted-foreground mt-2">
              {assignment?.case?.title}
              {assignment?.case?.company?.name ? ` · ${assignment.case.company.name}` : ""}
            </p>
          </div>

          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>Ваші відповіді збережено. Компанія отримає сповіщення та розгляне ваш кейс.</p>
            </CardContent>
          </Card>

          <Button className="w-full mt-6" onClick={() => navigate("/v2/candidate")}>
            До кабінету кандидата
          </Button>
        </div>
      </V2AppLayout>
    );
  }

  // ── No assignment data ────────────────────────────────────────
  if (!assignment?.case) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Кейс не знайдено</div>
      </V2AppLayout>
    );
  }

  const { case: c } = assignment;
  const tasks = c.tasks || [];
  const answeredCount = tasks.filter((t, i) => answers[taskKey(t, i)]?.trim()).length;
  const isAlreadySubmitted = assignment.status === "submitted" || assignment.status === "evaluated";

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
            {c.difficulty_level && (
              <Badge className={difficultyColor[c.difficulty_level] || ""}>
                {difficultyLabel[c.difficulty_level] || c.difficulty_level}
              </Badge>
            )}
            {c.position_title && <Badge variant="outline">{c.position_title}</Badge>}
            {isAlreadySubmitted && (
              <Badge className="bg-green-100 text-green-800">Здано</Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{c.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {c.company?.name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />{c.company.name}
              </span>
            )}
            {c.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />~{c.duration_minutes} хв
              </span>
            )}
          </div>
          {assignment.deadline && (
            <p className="text-sm text-muted-foreground mt-1">
              Дедлайн: {new Date(assignment.deadline).toLocaleDateString("uk-UA")}
            </p>
          )}
          {/* Progress bar */}
          {tasks.length > 0 && !isAlreadySubmitted && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Відповіді</span>
                <span>{answeredCount}/{tasks.length}</span>
              </div>
              <Progress value={(answeredCount / tasks.length) * 100} className="h-1.5" />
            </div>
          )}
        </div>

        {/* Structured case frame */}
        {c.situation_description && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ситуація</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.situation_description}</p>
            </CardContent>
          </Card>
        )}

        {c.problem_statement && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Проблема</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.problem_statement}</p>
            </CardContent>
          </Card>
        )}

        {/* Context */}
        {c.context && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Контекст</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.context}</p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Опис завдання</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.description}</p>
          </CardContent>
        </Card>

        {/* Goal / Available resources */}
        {c.goal && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Мета</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.goal}</p>
            </CardContent>
          </Card>
        )}

        {c.available_resources && (
          <Card className="mb-6 bg-accent/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Доступні ресурси</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{c.available_resources}</p>
            </CardContent>
          </Card>
        )}

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
        {tasks.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-medium">Завдання</h2>
            {tasks.map((task, index) => {
              const key = taskKey(task, index);
              const filled = !!answers[key]?.trim();
              return (
                <Card key={key} className={filled ? "border-green-200" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {filled && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                      Завдання {index + 1}{task.title ? `: ${task.title}` : ""}
                    </CardTitle>
                    {task.description && (
                      <CardDescription className="whitespace-pre-wrap">{task.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder={isAlreadySubmitted ? "Кейс вже здано" : "Введіть вашу відповідь..."}
                      value={answers[key] || ""}
                      onChange={(e) =>
                        !isAlreadySubmitted &&
                        setAnswers((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      rows={6}
                      className="resize-y"
                      disabled={isAlreadySubmitted}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Submit */}
        {!isAlreadySubmitted && (
          <div className="flex items-center justify-between border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">
              {tasks.length === 0
                ? "Немає завдань у кейсі"
                : answeredCount < tasks.length
                  ? `Залишилось ${tasks.length - answeredCount} завдань`
                  : "Всі завдання заповнені — можна здавати"}
            </p>
            <Button
              onClick={handleSubmit}
              disabled={stage === "submitting" || (tasks.length > 0 && answeredCount < tasks.length)}
              size="lg"
            >
              {stage === "submitting" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Збереження...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" />Здати кейс</>
              )}
            </Button>
          </div>
        )}
      </div>
    </V2AppLayout>
  );
};

export default CaseWorkPage;
