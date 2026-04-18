import type { AxiosInstance } from "axios";
import type {
  SanctionsCheckRequest,
  SanctionsCheckResult,
  SanctionsStatus,
} from "../types/sanctions.js";

export class SanctionsEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Check an address against all sanctions lists */
  async check(request: SanctionsCheckRequest): Promise<SanctionsCheckResult> {
    const { data } = await this.http.post<SanctionsCheckResult>(
      "/api/v1/sanctions/check",
      request,
    );
    return data;
  }

  /** Get the current sanctions status for an address */
  async getStatus(address: string, chain: string): Promise<{ address: string; chain: string; status: SanctionsStatus }> {
    const { data } = await this.http.get<{ address: string; chain: string; status: SanctionsStatus }>(
      `/api/v1/sanctions/status/${chain}/${address}`,
    );
    return data;
  }
}
