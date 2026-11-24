import type { AxiosInstance } from "axios";
import type { PaginatedResponse } from "../types/common.js";
import type {
  InvestigationCase,
  CreateCaseRequest,
  UpdateCaseStatusRequest,
  AddNoteRequest,
  AddEvidenceRequest,
  EscalateCaseRequest,
  CaseNote,
  CaseEvidence,
  ListCasesParams,
} from "../types/cases.js";
import type { CaseAssignment } from "../types/wallet.js";

export class CasesEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Create a new investigation case */
  async create(request: CreateCaseRequest): Promise<InvestigationCase> {
    const { data } = await this.http.post<InvestigationCase>(
      "/api/v1/cases",
      request,
    );
    return data;
  }

  /** List investigation cases with optional filters */
  async list(params?: ListCasesParams): Promise<PaginatedResponse<InvestigationCase>> {
    const { data } = await this.http.get<PaginatedResponse<InvestigationCase>>(
      "/api/v1/cases",
      { params },
    );
    return data;
  }

  /** Get a single investigation case by ID */
  async get(caseId: string): Promise<InvestigationCase> {
    const { data } = await this.http.get<InvestigationCase>(
      `/api/v1/cases/${caseId}`,
    );
    return data;
  }

  /** Update the status of a case */
  async updateStatus(caseId: string, request: UpdateCaseStatusRequest): Promise<InvestigationCase> {
    const { data } = await this.http.put<InvestigationCase>(
      `/api/v1/cases/${caseId}/status`,
      request,
    );
    return data;
  }

  /** Add a note to a case */
  async addNote(caseId: string, request: AddNoteRequest): Promise<CaseNote> {
    const { data } = await this.http.post<CaseNote>(
      `/api/v1/cases/${caseId}/notes`,
      request,
    );
    return data;
  }

  /** Add evidence to a case */
  async addEvidence(caseId: string, request: AddEvidenceRequest): Promise<CaseEvidence> {
    const { data } = await this.http.post<CaseEvidence>(
      `/api/v1/cases/${caseId}/evidence`,
      request,
    );
    return data;
  }

  /** Escalate a case for higher-level review */
  async escalate(caseId: string, request: EscalateCaseRequest): Promise<InvestigationCase> {
    const { data } = await this.http.post<InvestigationCase>(
      `/api/v1/cases/${caseId}/escalate`,
      request,
    );
    return data;
  }

  /** Assignee and linked screening evaluations of a case. */
  async getAssignment(caseId: string): Promise<CaseAssignment> {
    const { data } = await this.http.get<CaseAssignment>(`/api/v1/cases/${caseId}/assignment`);
    return data;
  }

  /**
   * Assign the case to a user of your organization, or unassign with `null`. Audited in the case events; the same assignee
   * again changes nothing. A user of another organization is refused (422).
   */
  async setAssignee(caseId: string, userId: number | null): Promise<CaseAssignment> {
    const { data } = await this.http.put<CaseAssignment>(`/api/v1/cases/${caseId}/assignee`, { userId });
    return data;
  }

  /** Link a screening evaluation of your organization to the case (idempotent). */
  async linkEvaluation(caseId: string, evaluationId: string): Promise<CaseAssignment> {
    const { data } = await this.http.post<CaseAssignment>(`/api/v1/cases/${caseId}/evaluations`, { evaluationId });
    return data;
  }
}
