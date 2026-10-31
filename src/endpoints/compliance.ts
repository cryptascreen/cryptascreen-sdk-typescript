import type { AxiosInstance } from "axios";
import type {
  TravelRuleCheckRequest,
  TravelRuleCheckResult,
  TravelRulePayload,
  TravelRulePayloadRequest,
  Dac8ReportRequest,
  Dac8ReportResult,
  VaspIdentification,
} from "../types/compliance.js";
import { ValidationError } from "../errors.js";

const enc = encodeURIComponent;

export class ComplianceEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Check whether the Travel Rule applies to a transfer (plan feature TRAVEL_RULE). */
  async checkTravelRule(request: TravelRuleCheckRequest): Promise<TravelRuleCheckResult> {
    const { data } = await this.http.post<TravelRuleCheckResult>(
      "/api/v1/compliance/travel-rule/check",
      request,
    );
    return data;
  }

  /** Build an IVMS101-shaped Travel Rule payload draft. Transmission to a counterparty VASP is not performed. */
  async buildTravelRulePayload(request: TravelRulePayloadRequest): Promise<TravelRulePayload> {
    const { data } = await this.http.post<TravelRulePayload>(
      "/api/v1/compliance/travel-rule/payload",
      request,
    );
    return data;
  }

  /**
   * Identify the VASP that controls an address, if known.
   * Backend: GET /api/v1/compliance/travel-rule/vasp/identify/{chain}/{address}.
   * (0.1.x posted a name/LEI lookup to /api/v1/compliance/vasp/identify, which has no backend route.)
   */
  async identifyVasp(chain: string, address: string): Promise<VaspIdentification> {
    const { data } = await this.http.get<VaspIdentification>(
      `/api/v1/compliance/travel-rule/vasp/identify/${enc(chain)}/${enc(address)}`,
    );
    return data;
  }

  /**
   * @deprecated DAC8 reporting is deferred: the generated XML is an unvalidated draft, not a filing, and
   * no national submission channel is implemented. The request shape now matches the backend
   * (taxYear, jurisdiction, operator, users); the 0.1.x shape (periodStart/periodEnd/addresses) is rejected
   * client-side with a ValidationError instead of a server 400.
   */
  async generateDac8Report(request: Dac8ReportRequest): Promise<Dac8ReportResult> {
    const r = request as Partial<Dac8ReportRequest> | undefined;
    const missing = (["taxYear", "jurisdiction", "operator", "users"] as const).filter((k) => r?.[k] == null);
    if (missing.length > 0) {
      const fieldErrors: Record<string, string[]> = {};
      for (const k of missing) fieldErrors[k] = ["required"];
      throw new ValidationError(
        `DAC8 report request requires ${missing.join(", ")} (DAC8 is deferred; see CHANGELOG 0.2.0)`,
        fieldErrors,
        undefined,
        "DAC8_REQUEST_SHAPE",
      );
    }
    const { data } = await this.http.post<Dac8ReportResult>(
      "/api/v1/compliance/dac8/report",
      request,
    );
    return data;
  }
}
