import {
  apiGet,
  apiPost,
  type CaseAssignment,
  type CompanyCase,
} from "./api";

export function getCompanyCases(): Promise<CompanyCase[]> {
  return apiGet<CompanyCase[]>("/api/company/cases/");
}

export function createCompanyCase(payload: Omit<CompanyCase, "id" | "created_at">): Promise<CompanyCase> {
  return apiPost<CompanyCase>("/api/company/cases/", payload);
}

export function getCompanyAssignments(): Promise<CaseAssignment[]> {
  return apiGet<CaseAssignment[]>("/api/company/assignments/");
}

export function createCompanyAssignment(payload: {
  case: number;
  candidate_email: string;
}): Promise<CaseAssignment> {
  return apiPost<CaseAssignment>("/api/company/assignments/", payload);
}
