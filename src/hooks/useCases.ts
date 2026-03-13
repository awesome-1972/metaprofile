import { useState, useEffect, useCallback } from "react";
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

// ── Company: manage cases ──────────────────────────────────────

export const useCompanyCases = (companyId: string | null) => {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCases = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Помилка завантаження кейсів");
    } else {
      setCases(
        (data || []).map((c) => ({
          ...c,
          tasks: (c.tasks as unknown as CaseTask[]) || [],
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
    const { data, error } = await supabase
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
        tasks: payload.tasks as unknown as never,
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
    const { error } = await supabase
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
    const { error } = await supabase
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
    // 1. Find profile by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("email", candidateEmail)
      .maybeSingle();

    if (profileError || !profile) {
      toast.error("Кандидата з таким email не знайдено");
      return false;
    }

    // 2. Find candidate record
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", profile.user_id)
      .maybeSingle();

    if (candidateError || !candidate) {
      toast.error("Профіль кандидата не знайдено. Кандидат має зареєструватись як candidate.");
      return false;
    }

    // 3. Create assignment
    const { error: assignError } = await supabase
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

    // 4. Auto-publish case if it was a draft
    await supabase
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

    // Get candidate id first
    const { data: candidate } = await supabase
      .from("candidates")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!candidate) {
      setIsLoading(false);
      return;
    }

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
      .eq("candidate_id", candidate.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Помилка завантаження кейсів");
    } else {
      setAssignments(
        (data || []).map((a) => ({
          ...a,
          cases: a.cases
            ? {
                ...a.cases,
                tasks: (a.cases.tasks as unknown as CaseTask[]) || [],
                companies: Array.isArray(a.cases.companies)
                  ? a.cases.companies[0] ?? null
                  : (a.cases.companies as { id: string; name: string } | null),
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

    const { error: subError } = await supabase.from("case_submissions").insert({
      assignment_id: assignmentId,
      case_id: caseId,
      candidate_id: candidate.id,
      answers: answers as unknown as never,
      time_spent_minutes: timeSpentMinutes,
    });

    if (subError) {
      toast.error("Помилка відправки відповіді");
      return false;
    }

    await supabase
      .from("case_assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);

    toast.success("Кейс успішно здано!");
    fetchAssignments();
    return true;
  };

  const markInProgress = async (assignmentId: string) => {
    await supabase
      .from("case_assignments")
      .update({ status: "in_progress" })
      .eq("id", assignmentId)
      .eq("status", "pending");
  };

  return { assignments, isLoading, submitCase, markInProgress, refetch: fetchAssignments };
};
