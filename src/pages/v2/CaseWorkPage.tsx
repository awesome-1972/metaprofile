import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { V2AppLayout } from "@/components/layout/V2AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Building2, ChevronLeft, Send } from "lucide-react";
import { useAuthV2 } from "@/hooks/useAuthV2";
import { useCandidateAssignments, type AssignmentRow } from "@/hooks/useCases";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const difficultyLabel: Record<string, string> = {
  junior: "Junior",
  middle: "Middle",
  senior: "Senior",
};

const difficultyColor: Record<string, string> = {
  junior: "bg-green-100 text-green-800",
  middle: "bg-yellow-100 text-yellow-800",
  senior: "bg-red-100 text-red-800",
};

const CaseWorkPage = () => {
  const { id: assignmentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthV2();
  const { submitCase, markInProgress } = useCandidateAssignments(user?.id ?? null);

  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        id, status, deadline, message, created_at, case_id,
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

    // Mark as in_progress if still pending
    if (data.status === "pending") {
      await markInProgress(assignmentId!);
    }

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

    setIsSubmitting(true);
    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 60000);
    const answersArray = tasks.map((t) => ({
      task_id: t.id,
      answer: answers[t.id] || "",
    }));

    const ok = await submitCase(
      assignment.id,
      assignment.case_id,
      user.id,
      answersArray,
      timeSpent
    );

    setIsSubmitting(false);
    if (ok) navigate("/v2/candidate");
  };

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

  if (!assignment?.cases) {
    return (
      <V2AppLayout role="candidate">
        <div className="p-6 lg:p-8 text-center text-muted-foreground">Кейс не знайдено</div>
      </V2AppLayout>
    );
  }

  const { cases } = assignment;
  const tasks = cases.tasks || [];

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
            {cases.position_title && (
              <Badge variant="outline">{cases.position_title}</Badge>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">{cases.title}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            {cases.companies?.name && (
              <span className="flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {cases.companies.name}
              </span>
            )}
            {cases.duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{cases.duration_minutes} хв
              </span>
            )}
          </div>
        </div>

        {/* Context */}
        {cases.context && (
          <Card className="mb-6 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Контекст</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {cases.context}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Description */}
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Опис завдання</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {cases.description}
            </p>
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
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground">Завдань немає</p>
          )}
          {tasks.map((task, index) => (
            <Card key={task.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Завдання {index + 1}: {task.title}
                </CardTitle>
                {task.description && (
                  <CardDescription className="whitespace-pre-wrap">
                    {task.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Введіть вашу відповідь..."
                  value={answers[task.id] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [task.id]: e.target.value }))
                  }
                  rows={6}
                  className="resize-y"
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            Після відправки відповіді не можна змінити
          </p>
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Відправка..." : "Здати кейс"}
          </Button>
        </div>
      </div>
    </V2AppLayout>
  );
};

export default CaseWorkPage;
