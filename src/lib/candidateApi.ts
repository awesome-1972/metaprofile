import {
  apiGet,
  apiPost,
  type CandidateAssignment,
  type CaseSubmissionPayload,
} from "./api";

export function getCandidateAssignments(): Promise<CandidateAssignment[]> {
  return apiGet<CandidateAssignment[]>("/api/candidate/assignments/");
}

export function getCandidateAssignment(id: number): Promise<CandidateAssignment> {
  return apiGet<CandidateAssignment>(`/api/candidate/assignments/${id}/`);
}

export function submitCandidateAssignment(
  id: number,
  payload: CaseSubmissionPayload
): Promise<CandidateAssignment> {
  return apiPost<CandidateAssignment>(`/api/candidate/assignments/${id}/submit/`, payload);
}
