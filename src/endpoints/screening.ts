import type { AxiosInstance } from "axios";
import type {
  ScreenAddressRequest,
  ScreeningResult,
  BulkScreeningRequest,
  BulkScreeningResponse,
  ScreeningJob,
} from "../types/screening.js";

export class ScreeningEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Screen a single address for risk and sanctions */
  async screenAddress(request: ScreenAddressRequest): Promise<ScreeningResult> {
    const { data } = await this.http.post<ScreeningResult>(
      "/api/v1/screening/address",
      request,
    );
    return data;
  }

  /** Screen multiple addresses synchronously. Best for small batches (<= 50) */
  async screenBulk(request: BulkScreeningRequest): Promise<BulkScreeningResponse> {
    const { data } = await this.http.post<BulkScreeningResponse>(
      "/api/v1/screening/bulk",
      request,
    );
    return data;
  }

  /** Submit a bulk screening job for async processing. Returns a jobId to poll */
  async screenBulkAsync(request: BulkScreeningRequest): Promise<ScreeningJob> {
    const { data } = await this.http.post<ScreeningJob>(
      "/api/v1/screening/bulk/async",
      request,
    );
    return data;
  }

  /** Poll the status of a bulk screening job */
  async pollJob(jobId: string): Promise<ScreeningJob> {
    const { data } = await this.http.get<ScreeningJob>(
      `/api/v1/screening/jobs/${jobId}`,
    );
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
      if (status.status === "COMPLETED" || status.status === "FAILED") {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Screening job ${job.jobId} did not complete within ${timeoutMs}ms`,
    );
  }
}
