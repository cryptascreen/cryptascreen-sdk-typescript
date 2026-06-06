import type { AxiosInstance } from "axios";
import type {
  ScreenAddressRequest,
  ScreeningResponse,
  BulkScreeningRequest,
  ScreeningJob,
} from "../types/screening.js";

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
   * `async` is forced to true regardless of the request value.
   */
  async screenBulkAsync(request: BulkScreeningRequest): Promise<ScreeningJob> {
    const { data } = await this.http.post<ScreeningJob>(
      "/api/v1/screen/bulk",
      { ...request, async: true },
    );
    return data;
  }

  /** Poll the status of a bulk screening job. */
  async pollJob(jobId: string): Promise<ScreeningJob> {
    const { data } = await this.http.get<ScreeningJob>(
      `/api/v1/screen/jobs/${jobId}`,
    );
    return data;
  }

  /** List recent screening jobs for the authenticated tenant (max 20). */
  async listJobs(): Promise<ScreeningJob[]> {
    const { data } = await this.http.get<ScreeningJob[]>("/api/v1/screen/jobs");
    return data;
  }

  /**
   * Submit a bulk screening job and poll until complete.
   * Convenience wrapper around screenBulkAsync + pollJob.
   * @param request - The bulk screening request
   * @param pollIntervalMs - How often to poll (default 2000ms)
   * @param timeoutMs - Maximum time to wait (default 300000ms / 5min)
   */
  async screenBulkAndWait(
    request: BulkScreeningRequest,
    pollIntervalMs = 2000,
    timeoutMs = 300_000,
  ): Promise<ScreeningJob> {
    const job = await this.screenBulkAsync(request);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const status = await this.pollJob(job.jobId);
      if (
        status.status === "COMPLETED" ||
        status.status === "PARTIAL" ||
        status.status === "FAILED"
      ) {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Screening job ${job.jobId} did not complete within ${timeoutMs}ms`,
    );
  }
}
