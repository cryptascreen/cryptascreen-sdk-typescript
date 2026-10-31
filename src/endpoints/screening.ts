import type { AxiosInstance } from "axios";
import type {
  ScreenAddressRequest,
  ScreeningResponse,
  BulkScreeningRequest,
  ScreeningJob,
  AsyncSubmitOptions,
  ScreeningJobResultsPage,
  ScreeningJobItem,
  PageOptions,
  ScreeningEvaluation,
  ScreeningEvaluationPage,
} from "../types/screening.js";
import { isTerminalJobStatus } from "../types/screening.js";

const enc = encodeURIComponent;

/** Random idempotency key (RFC 4122 v4 when available). */
export function generateIdempotencyKey(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `cs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export class ScreeningEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Screen a single address for risk and sanctions. */
  async screenAddress(request: ScreenAddressRequest): Promise<ScreeningResponse> {
    const { data } = await this.http.post<ScreeningResponse>(
      "/api/v1/screen/address",
      request,
    );
    return data;
  }

  /**
   * Screen multiple addresses synchronously (max 1000). Returns one result per address.
   * `async` is forced to false regardless of the request value.
   */
  async screenBulk(request: BulkScreeningRequest): Promise<ScreeningResponse[]> {
    const { data } = await this.http.post<ScreeningResponse[]>(
      "/api/v1/screen/bulk",
      { ...request, async: false },
    );
    return data;
  }

  /**
   * Submit a bulk screening job for async processing (max 10000). Returns a job to poll.
   * `async` is forced to true regardless of the request value. An `Idempotency-Key` header is always sent
   * (caller-supplied or generated), so a retried submit cannot create a second job.
   */
  async screenBulkAsync(request: BulkScreeningRequest, options: AsyncSubmitOptions = {}): Promise<ScreeningJob> {
    const { data } = await this.http.post<ScreeningJob>(
      "/api/v1/screen/bulk",
      { ...request, async: true },
      { headers: { "Idempotency-Key": options.idempotencyKey ?? generateIdempotencyKey() } },
    );
    return data;
  }

  /** Poll the status of a bulk screening job. */
  async pollJob(jobId: string): Promise<ScreeningJob> {
    const { data } = await this.http.get<ScreeningJob>(
      `/api/v1/screen/jobs/${enc(jobId)}`,
    );
    return data;
  }

  /** List recent screening jobs for the authenticated tenant (max 20). */
  async listJobs(): Promise<ScreeningJob[]> {
    const { data } = await this.http.get<ScreeningJob[]>("/api/v1/screen/jobs");
    return data;
  }

  /**
   * One page (0-based, size 1..1000) of a job's stored per-address items, input order.
   * Body: {jobId, status, page, size, totalItems, totalPages, items[]}; a Spring-style `content` page is also accepted.
   */
  async getJobResults(jobId: string, options: PageOptions = {}): Promise<ScreeningJobResultsPage> {
    const page = options.page ?? 0;
    const size = options.size ?? 100;
    const { data } = await this.http.get<Record<string, unknown>>(
      `/api/v1/screen/jobs/${enc(jobId)}/results`,
      { params: { page, size } },
    );
    const d = data ?? {};
    const items = (Array.isArray(d.items) ? d.items : Array.isArray(d.content) ? d.content : []) as ScreeningJobItem[];
    const num = (...vals: unknown[]) => vals.find((v): v is number => typeof v === "number");
    return {
      jobId: typeof d.jobId === "string" ? d.jobId : jobId,
      status: typeof d.status === "string" ? d.status : null,
      items,
      page: num(d.page, d.number) ?? page,
      size: num(d.size) ?? size,
      totalItems: num(d.totalItems, d.totalElements) ?? items.length,
      totalPages: num(d.totalPages) ?? 1,
    };
  }

  /**
   * Request cancellation of a PENDING/PROCESSING job (202 with the job; CANCELLED at once when it had not
   * started, otherwise `cancelRequested=true`). A finished job yields 409 JOB_ALREADY_TERMINAL (CryptaScreenError).
   */
  async cancelJob(jobId: string): Promise<ScreeningJob> {
    const { data } = await this.http.post<ScreeningJob>(`/api/v1/screen/jobs/${enc(jobId)}/cancel`);
    return data;
  }

  /** Last persisted screening result for an address (its `evaluationId` is the newest evaluation). */
  async getHistory(chain: string, address: string): Promise<ScreeningResponse> {
    const { data } = await this.http.get<ScreeningResponse>(
      `/api/v1/screen/address/${enc(chain)}/${enc(address)}/history`,
    );
    return data;
  }

  /** Append-only evaluations of one address, newest first. */
  async listEvaluations(chain: string, address: string, options: PageOptions = {}): Promise<ScreeningEvaluationPage> {
    const { data } = await this.http.get<ScreeningEvaluationPage>(
      `/api/v1/screen/address/${enc(chain)}/${enc(address)}/evaluations`,
      { params: { page: options.page ?? 0, size: options.size ?? 20 } },
    );
    return data;
  }

  /** One evaluation by id (`ScreeningResponse.evaluationId`). */
  async getEvaluation(evaluationId: string): Promise<ScreeningEvaluation> {
    const { data } = await this.http.get<ScreeningEvaluation>(
      `/api/v1/screen/evaluations/${enc(evaluationId)}`,
    );
    return data;
  }

  /**
   * Submit a bulk screening job and poll until it reaches a terminal status
   * (COMPLETED | PARTIAL | FAILED | CANCELLED). Unknown statuses keep polling until the timeout.
   * @param request - The bulk screening request
   * @param pollIntervalMs - How often to poll (default 2000ms)
   * @param timeoutMs - Maximum time to wait (default 300000ms / 5min)
   * @param options - idempotency key for the submit
   */
  async screenBulkAndWait(
    request: BulkScreeningRequest,
    pollIntervalMs = 2000,
    timeoutMs = 300_000,
    options: AsyncSubmitOptions = {},
  ): Promise<ScreeningJob> {
    const job = await this.screenBulkAsync(request, options);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.pollJob(job.jobId);
      if (isTerminalJobStatus(status.status)) {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Screening job ${job.jobId} did not complete within ${timeoutMs}ms`,
    );
  }
}
