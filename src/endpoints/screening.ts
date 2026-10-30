import type { AxiosInstance } from "axios";
import type {
  ScreenAddressRequest,
  ScreeningResponse,
  BulkScreeningRequest,
  ScreeningJob,
  AsyncSubmitOptions,
  ScreeningJobResultsPage,
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
   * CS-08: one page (0-based) of a job's per-address results. Accepts the server's `items` or a Spring-style
   * `content` array.
   */
  async getJobResults(jobId: string, options: PageOptions = {}): Promise<ScreeningJobResultsPage> {
    const page = options.page ?? 0;
    const size = options.size ?? 100;
    const { data } = await this.http.get<Record<string, unknown>>(
      `/api/v1/screen/jobs/${enc(jobId)}/results`,
      { params: { page, size } },
    );
    const d = data ?? {};
    const items = (Array.isArray(d.items) ? d.items : Array.isArray(d.content) ? d.content : []) as ScreeningResponse[];
    return {
      items,
      page: typeof d.page === "number" ? d.page : typeof d.number === "number" ? d.number : page,
      size: typeof d.size === "number" ? d.size : size,
      totalElements: typeof d.totalElements === "number" ? d.totalElements : items.length,
      totalPages: typeof d.totalPages === "number" ? d.totalPages : 1,
    };
  }

  /** CS-08: request cancellation of a PENDING/PROCESSING job. Returns the job as the server now reports it. */
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

  /** CS-04: append-only evaluations of one address, newest first. */
  async listEvaluations(chain: string, address: string, options: PageOptions = {}): Promise<ScreeningEvaluationPage> {
    const { data } = await this.http.get<ScreeningEvaluationPage>(
      `/api/v1/screen/address/${enc(chain)}/${enc(address)}/evaluations`,
      { params: { page: options.page ?? 0, size: options.size ?? 20 } },
    );
    return data;
  }

  /** CS-04: one evaluation by id (`ScreeningResponse.evaluationId`). */
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
