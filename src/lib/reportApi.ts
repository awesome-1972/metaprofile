import { apiGet, apiPost, type AssessmentReport } from "./api";

export function getReports(): Promise<AssessmentReport[]> {
  return apiGet<AssessmentReport[]>("/api/reports/");
}

export function getReport(id: number): Promise<AssessmentReport> {
  return apiGet<AssessmentReport>(`/api/reports/${id}/`);
}

export function generateReport(
  assignmentId: number,
  language = "uk"
): Promise<AssessmentReport> {
  return apiPost<AssessmentReport>(
    `/api/assignments/${assignmentId}/generate-report/`,
    { language }
  );
}
