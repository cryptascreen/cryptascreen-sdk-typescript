export type CaseStatus = "OPEN" | "IN_REVIEW" | "ESCALATED" | "RESOLVED" | "CLOSED";
export type CasePriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface InvestigationCase {
  id: string;
  title: string;
  description?: string;
  status: CaseStatus;
  priority: CasePriority;
  assigneeId?: string;
  addresses: Array<{
    address: string;
    chain: string;
  }>;
  notes: CaseNote[];
  evidence: CaseEvidence[];
  events: CaseEvent[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface CaseNote {
  id: string;
  caseId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface CaseEvidence {
  id: string;
  caseId: string;
  type: string;
  label: string;
  url?: string;
  metadata?: Record<string, unknown>;
  addedAt: string;
  addedBy: string;
}

export interface CaseEvent {
  id: string;
  caseId: string;
  eventType: string;
  description: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface CreateCaseRequest {
  title: string;
  description?: string;
  priority?: CasePriority;
  assigneeId?: string;
  addresses: Array<{
    address: string;
    chain: string;
  }>;
}

export interface UpdateCaseStatusRequest {
  status: CaseStatus;
  reason?: string;
}

export interface AddNoteRequest {
  content: string;
}

export interface AddEvidenceRequest {
  type: string;
  label: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface EscalateCaseRequest {
  reason: string;
  assigneeId?: string;
}

export interface ListCasesParams {
  status?: CaseStatus;
  priority?: CasePriority;
  page?: number;
  pageSize?: number;
}
