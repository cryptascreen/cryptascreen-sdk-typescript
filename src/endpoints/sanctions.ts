import type { AxiosInstance } from "axios";
import type {
  SanctionsCheckResponse,
  SanctionsStatusResponse,
} from "../types/sanctions.js";

export class SanctionsEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Exact-match check of an address against all self-hosted sanctions lists. */
  async check(chain: string, address: string): Promise<SanctionsCheckResponse> {
    const { data } = await this.http.get<SanctionsCheckResponse>(
      `/api/v1/sanctions/check/${chain}/${address}`,
    );
    return data;
  }

  /** Sanctions ingestion status — total active addresses per source. */
  async getStatus(): Promise<SanctionsStatusResponse> {
    const { data } = await this.http.get<SanctionsStatusResponse>(
      "/api/v1/sanctions/status",
    );
    return data;
  }
}
