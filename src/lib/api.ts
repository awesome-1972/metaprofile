const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// --- Token storage ---

export function getAccessToken(): string | null {
  return localStorage.getItem("django_access_token");
}

export function setAccessToken(token: string): void {
  localStorage.setItem("django_access_token", token);
}

export function clearAccessToken(): void {
  localStorage.removeItem("django_access_token");
  localStorage.removeItem("django_refresh_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("django_refresh_token");
}

export function setRefreshToken(token: string): void {
  localStorage.setItem("django_refresh_token", token);
}

// --- Base request ---

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      const detail =
        errorData.detail ||
        errorData.message ||
        Object.values(errorData).flat().join(" ") ||
        message;
      message = `${response.status}: ${detail}`;
    } catch {
      // non-JSON error body — keep status message
    }
    throw new Error(message);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// --- TypeScript types ---

export interface AuthUser {
  id: number;
  email: string;
  full_name: string | null;
  role: "admin" | "company" | "candidate";
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
  role?: "company" | "candidate";
}

export interface CaseTask {
  id?: string | number;
  title: string;
  description?: string;
}

export interface DjangoCaseCompany {
  id: number;
  name: string;
}

export interface DjangoCase {
  id: number;
  title: string;
  description: string;
  context: string | null;
  tasks: CaseTask[];
  position_title: string | null;
  role_title: string | null;
  difficulty_level: string;
  duration_minutes: number | null;
  situation_description: string | null;
  details: string | null;
  problem_statement: string | null;
  goal: string | null;
  available_resources: string | null;
  status: string;
  company: DjangoCaseCompany | null;
}

export interface CandidateAssignment {
  id: number;
  status: string;
  message: string | null;
  deadline: string | null;
  assigned_at: string;
  submitted_at: string | null;
  case: DjangoCase;
}

export interface CaseSubmissionPayload {
  answers: { task_id: string; answer: string }[];
  time_spent_minutes?: number | null;
}

// Report types
export interface ReportMetadata {
  candidate_name: string;
  candidate_email: string;
  company_name: string;
  case_title: string;
  position_title: string | null;
  difficulty_level: string;
  submitted_at: string | null;
  language: string;
  time_spent_minutes: number | null;
}

export interface ReportData {
  _mock?: boolean;
  _note?: string;
  metadata: ReportMetadata;
  executive_summary: string;
  overall_score: number;
  key_findings: string[];
  competency_profile: { competency: string; mock_score: number; note?: string }[];
  answer_analysis: { task: string; answer_length: number; note?: string }[];
  strengths: string[];
  risks: string[];
  recommendations: string[];
  development_plan: string[];
}

export interface AssessmentReport {
  id: number;
  assignment: number;
  submission: number | null;
  candidate: number;
  assessment_case: number;
  company: number;
  report_type: string;
  language: string;
  status: string;
  overall_score: string | null;
  summary: string;
  strengths: string[];
  risks: string[];
  competency_scores: { competency: string; score: number }[];
  competency_insights: { competency: string; insight: string }[];
  gap_analysis: { competency: string; gap: string }[];
  recommendations: string[];
  development_plan: string[];
  report_data: ReportData;
  error_message: string;
  created_at: string;
  updated_at: string;
}

// Legacy types kept for company-side Supabase flow (not modified in this step)
export interface CompanyCase {
  id: number;
  title: string;
  description: string;
  competencies?: string[];
  created_at?: string;
}

export interface CaseAssignment {
  id: number;
  case: number | CompanyCase;
  candidate_email: string;
  status: "pending" | "in_progress" | "submitted" | "reviewed";
  created_at?: string;
}
