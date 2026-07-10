import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type HiringProject = Database["public"]["Tables"]["hiring_projects"]["Row"];
export type HiringProjectInsert = Database["public"]["Tables"]["hiring_projects"]["Insert"];
export type HiringProjectUpdate = Database["public"]["Tables"]["hiring_projects"]["Update"];

export type HiringProjectWithClient = HiringProject & {
  client: { id: string; name: string } | null;
};

export type RequisitionApprovalStatus = Database["public"]["Enums"]["requisition_approval_status"];

const PROJECTS_KEY = ["ats", "hiring_projects"] as const;
const projectsByClientKey = (clientId: string) => ["ats", "hiring_projects", "client", clientId] as const;
const projectKey = (id: string) => ["ats", "hiring_projects", id] as const;

function isPermissionDeniedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "42501") return true;
  return typeof error.message === "string" && /permission denied/i.test(error.message);
}

function toFriendlyMessage(error: { code?: string; message?: string } | null): string {
  if (isPermissionDeniedError(error)) return "Немає доступу";
  return error?.message || "Сталася помилка";
}

/** Усі проекти найму, доступні поточному користувачу (RLS: mp_can_access_project). */
export function useHiringProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async (): Promise<HiringProjectWithClient[]> => {
      const { data, error } = await supabase
        .from("hiring_projects")
        .select("*, client:clients(id, name)")
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return (data ?? []) as HiringProjectWithClient[];
    },
    staleTime: 30_000,
  });
}

/** Проекти найму конкретного клієнта. */
export function useHiringProjectsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: clientId ? projectsByClientKey(clientId) : ["ats", "hiring_projects", "client", "unknown"],
    queryFn: async (): Promise<HiringProject[]> => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("hiring_projects")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data ?? [];
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

/** Один проект найму за id, з даними клієнта (RLS: mp_can_access_project). */
export function useHiringProject(id: string | undefined) {
  return useQuery({
    queryKey: id ? projectKey(id) : ["ats", "hiring_projects", "unknown"],
    queryFn: async (): Promise<HiringProjectWithClient | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("hiring_projects")
        .select("*, client:clients(id, name)")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        if (isPermissionDeniedError(error)) throw new Error("Немає доступу");
        throw error;
      }
      return data as HiringProjectWithClient | null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

/**
 * Створення проекту найму — owner/admin, або recruiter з can_edit на клієнта
 * (RLS: hiring_projects_insert).
 */
export function useCreateHiringProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: HiringProjectInsert): Promise<HiringProject> => {
      const { data, error } = await supabase
        .from("hiring_projects")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: projectsByClientKey(data.client_id) });
      toast.success("Проект найму створено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

/** Оновлення проекту найму — потребує can_edit у scope (RLS: hiring_projects_update). */
export function useUpdateHiringProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: HiringProjectUpdate;
    }): Promise<HiringProject> => {
      const { data, error } = await supabase
        .from("hiring_projects")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: projectKey(data.id) });
      qc.invalidateQueries({ queryKey: projectsByClientKey(data.client_id) });
      toast.success("Зміни збережено");
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}

const projectApprovalToast: Record<RequisitionApprovalStatus, string> = {
  draft: "Requisition повернуто в чернетку",
  pending_approval: "Заявку подано на затвердження",
  approved: "Requisition затверджено",
  changes_requested: "Повернуто на доопрацювання",
  rejected: "Requisition відхилено",
};

/**
 * Зміна стану requisition проекту найму (draft→pending_approval→approved /
 * rejected / changes_requested). Серверний guard
 * mp_hiring_projects_requisition_guard: decision-переходи — лише owner/admin
 * або creator проекту; сам проставляє submitted_at / approved_by / approved_at.
 * Тільки approved-проект дозволяє відкривати вакансії (status→open).
 */
export function useSetProjectApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      approvalStatus,
      note,
    }: {
      id: string;
      approvalStatus: RequisitionApprovalStatus;
      note?: string | null;
    }): Promise<HiringProject> => {
      const patch: HiringProjectUpdate = { approval_status: approvalStatus };
      if (note !== undefined) patch.approval_note = note;
      const { data, error } = await supabase.from("hiring_projects").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: PROJECTS_KEY });
      qc.invalidateQueries({ queryKey: projectKey(data.id) });
      qc.invalidateQueries({ queryKey: projectsByClientKey(data.client_id) });
      toast.success(projectApprovalToast[data.approval_status]);
    },
    onError: (error: { code?: string; message?: string }) => {
      toast.error(toFriendlyMessage(error));
    },
  });
}
