import { apiGet, apiPost, getAccessToken, type AssessmentReport } from "./api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

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

async function fetchReportBlob(path: string): Promise<Blob> {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.blob();
}

export function getReportHtmlBlob(reportId: number): Promise<Blob> {
  return fetchReportBlob(`/api/reports/${reportId}/html/`);
}

export function getReportPdfBlob(reportId: number): Promise<Blob> {
  return fetchReportBlob(`/api/reports/${reportId}/pdf/`);
}
