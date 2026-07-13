import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CaseTask {
  id: string;
  title: string;
  description?: string;
}

export interface CaseRow {
  id: string;
  title: string;
  description: string;
  context: string | null;
  tasks: CaseTask[];
  position_title: string | null;
  difficulty: string;
  duration_minutes: number | null;
  status: string;
  created_at: string;
  assignment_count?: number;
}

export interface AssignmentRow {
  id: string;
  candidate_id: string;
  status: string;
  deadline: string | null;
  message: string | null;
  created_at: string;
  case_id: string;
  cases: {
    id: string;
    title: string;
    description: string;
    context: string | null;
    tasks: CaseTask[];
    difficulty: string;
    duration_minutes: number | null;
    position_title: string | null;
    companies: { id: string; name: string } | null;
  } | null;
}

/**
 * Сира відповідь Supabase на `case_assignments → cases → companies`.
 * PostgREST повертає вкладені звʼязки або обʼєктом, або масивом (залежно від
 * кардинальності), тому нормалізуємо вручну в `AssignmentRow`.
 */
export interface RawAssignmentRow {
  id: string;
  candidate_id: string;
  status: string;
  deadline: string | null;
  message: string | null;
  created_at: string;
  case_id: string;
  cases:
    | {
        id: string;
        title: string;
        description: string;
        context: string | null;
        tasks: CaseTask[] | null;
        difficulty: string;
        duration_minutes: number | null;
        position_title: string | null;
        companies: { id: string; name: string } | { id: string; name: string }[] | null;
      }
    | null;
}

export interface AIAnalysisResult {
  overallScore: number;
  recommendation: "strong_hire" | "hire" | "maybe" | "no_hire";
  recommendationRationale: string;
  strengths: string[];
  weaknesses: string[];
  cultureFit: number;
  technicalFit: number;
  softSkillsFit: number;
  developmentSuggestions: string[];
  summary: string;
}

// Кейси V1-демо живуть у схемі, яку generated-типи описують не повністю
// (join-и cases→companies тощо). Тому працюємо через нетипізований клієнт —
// але саме нетипізований, а не `any`: жодних німих кастів у прикладних місцях.
const db = supabase as unknown as SupabaseClient;

// ── Company: manage cases ──────────────────────────────────────

export const useCompanyCases = (companyId: string | null) => {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCases = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const { data, error } = await db
      .from("cases")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Помилка завантаження кейсів");
    } else {
      setCases(
        (data || []).map((c: CaseRow) => ({
          ...c,
          tasks: (c.tasks as CaseTask[]) || [],
        }))
      );
    }
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const createCase = async (payload: {
    title: string;
    description: string;
    context?: string;
    position_title?: string;
    difficulty: string;
    duration_minutes: number;
    tasks: CaseTask[];
    userId: string;
  }) => {
    if (!companyId) return null;
    const { data, error } = await db
      .from("cases")
      .insert({
        company_id: companyId,
        created_by: payload.userId,
        title: payload.title,
        description: payload.description,
        context: payload.context || null,
        position_title: payload.position_title || null,
        difficulty: payload.difficulty,
        duration_minutes: payload.duration_minutes,
        tasks: payload.tasks,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      toast.error("Помилка створення кейсу");
      return null;
    }
    toast.success("Кейс створено");
    fetchCases();
    return data;
  };

  const publishCase = async (caseId: string) => {
    const { error } = await db
      .from("cases")
      .update({ status: "active" })
      .eq("id", caseId);
    if (error) {
      toast.error("Помилка публікації");
    } else {
      toast.success("Кейс опубліковано");
      fetchCases();
    }
  };

  const archiveCase = async (caseId: string) => {
    const { error } = await db
      .from("cases")
      .update({ status: "archived" })
      .eq("id", caseId);
    if (error) {
      toast.error("Помилка архівування");
    } else {
      fetchCases();
    }
  };

  const assignCase = async (
    caseId: string,
    candidateEmail: string,
    assignedBy: string,
    message?: string,
    deadline?: string
  ) => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", candidateEmail)
      .maybeSingle();

    if (profileError || !profile) {
      toast.error("Кандидата з таким email не знайдено");
      return false;
    }

    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (candidateError || !candidate) {
      toast.error("Профіль кандидата не знайдено. Кандидат має зареєструватись як candidate.");
      return false;
    }

    const { error: assignError } = await db
      .from("case_assignments")
      .insert({
        case_id: caseId,
        candidate_id: candidate.id,
        assigned_by: assignedBy,
        message: message || null,
        deadline: deadline || null,
        status: "pending",
      });

    if (assignError) {
      if (assignError.code === "23505") {
        toast.error("Цей кандидат вже отримав цей кейс");
      } else {
        toast.error("Помилка призначення");
      }
      return false;
    }

    await db
      .from("cases")
      .update({ status: "active" })
      .eq("id", caseId)
      .eq("status", "draft");

    toast.success("Кейс призначено кандидату");
    fetchCases();
    return true;
  };

  return { cases, isLoading, createCase, publishCase, archiveCase, assignCase, refetch: fetchCases };
};

// ── Candidate: view & submit assignments ──────────────────────

export const useCandidateAssignments = (userId: string | null) => {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAssignments = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!candidate) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await db
      .from("case_assignments")
      .select(`
        id, candidate_id, status, deadline, message, created_at, case_id,
        cases (
          id, title, description, context, tasks,
          difficulty, duration_minutes, position_title,
          companies ( id, name )
        )
      `)
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Помилка завантаження кейсів");
    } else {
      const rows = (data ?? []) as unknown as RawAssignmentRow[];
      setAssignments(
        rows.map((a) => ({
          ...a,
          cases: a.cases
            ? {
                ...a.cases,
                tasks: a.cases.tasks ?? [],
                companies: Array.isArray(a.cases.companies)
                  ? a.cases.companies[0] ?? null
                  : a.cases.companies,
              }
            : null,
        }))
      );
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const submitCase = async (
    assignmentId: string,
    caseId: string,
    userId: string,
    answers: { task_id: string; answer: string }[],
    timeSpentMinutes: number
  ) => {
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!candidate) {
      toast.error("Профіль кандидата не знайдено");
      return false;
    }

    const { error: subError } = await db.from("case_submissions").insert({
      assignment_id: assignmentId,
      case_id: caseId,
      candidate_id: candidate.id,
      answers: answers,
      time_spent_minutes: timeSpentMinutes,
    });

    if (subError) {
      toast.error("Помилка відправки відповіді");
      return false;
    }

    await db
      .from("case_assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);

    toast.success("Кейс успішно здано!");
    fetchAssignments();
    return true;
  };

  const markInProgress = async (assignmentId: string) => {
    await db
      .from("case_assignments")
      .update({ status: "in_progress" })
      .eq("id", assignmentId)
      .eq("status", "pending");
  };

  return { assignments, isLoading, submitCase, markInProgress, refetch: fetchAssignments };
};

// ── AI analysis after submission ──────────────────────────────

export const analyzeSubmission = async (params: {
  assignmentId: string;
  caseId: string;
  candidateId: string;
  companyId: string | null;
  companyName: string;
  positionTitle: string;
  tasks: CaseTask[];
  answers: { task_id: string; answer: string }[];
}): Promise<AIAnalysisResult | null> => {
  const conversationHistory = params.tasks.flatMap((task) => {
    const found = params.answers.find((a) => a.task_id === task.id);
    return [
      {
        role: "interviewer" as const,
        content: task.description
          ? `${task.title}\n\n${task.description}`
          : task.title,
        timestamp: new Date().toISOString(),
      },
      {
        role: "candidate" as const,
        content: found?.answer?.trim() || "(без відповіді)",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const { data: session, error: sessionError } = await db
    .from("interview_sessions")
    .insert({
      candidate_id: params.candidateId,
      company_id: params.companyId,
      case_id: params.caseId,
      assignment_id: params.assignmentId,
      messages: conversationHistory,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    console.error("Failed to create interview session:", sessionError);
    return null;
  }

  let result: AIAnalysisResult | null = null;
  try {
    const { data, error } = await supabase.functions.invoke("conduct-interview", {
      body: {
        action: "generate_report",
        context: {
          interviewerName: "AI Аналітик",
          interviewerRole: "HR Аналітик",
          interviewerPersonality: "Об'єктивний, детальний, конструктивний",
          companyName: params.companyName || "Компанія",
          positionTitle: params.positionTitle || "Позиція",
          currentQuestion: "",
          questionType: "case",
          competencyTargeted: "Загальні компетенції",
          conversationHistory,
        },
      },
    });

    if (!error && data?.result) {
      result = data.result as AIAnalysisResult;

      await db
        .from("interview_sessions")
        .update({
          result: result,
          star_evaluations: null,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", session.id);

      await db
        .from("case_assignments")
        .update({ status: "evaluated" })
        .eq("id", params.assignmentId);
    } else {
      await db
        .from("interview_sessions")
        .update({ status: "cancelled" })
        .eq("id", session.id);
      console.error("AI analysis error:", error);
    }
  } catch (err) {
    await db
      .from("interview_sessions")
      .update({ status: "cancelled" })
      .eq("id", session.id);
    console.error("analyzeSubmission error:", err);
  }

  return result;
};
