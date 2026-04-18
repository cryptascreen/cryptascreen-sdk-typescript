import type { AxiosInstance } from "axios";
import type {
  TravelRuleCheckRequest,
  TravelRuleCheckResult,
  TravelRulePayload,
  Dac8ReportRequest,
  Dac8ReportResult,
  VaspIdentification,
  VaspLookupRequest,
} from "../types/compliance.js";

export class ComplianceEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Check if a transaction meets Travel Rule requirements */
  async checkTravelRule(request: TravelRuleCheckRequest): Promise<TravelRuleCheckResult> {
    const { data } = await this.http.post<TravelRuleCheckResult>(
      "/api/v1/compliance/travel-rule/check",
      request,
    );
    return data;
  }

  /** Build a Travel Rule payload for submission to a counterparty VASP */
  async buildTravelRulePayload(request: TravelRuleCheckRequest): Promise<TravelRulePayload> {
    const { data } = await this.http.post<TravelRulePayload>(
      "/api/v1/compliance/travel-rule/payload",
      request,
    );
    return data;
  }

  /** Generate a DAC8 report for a given period and jurisdiction */
  async generateDac8Report(request: Dac8ReportRequest): Promise<Dac8ReportResult> {
    const { data } = await this.http.post<Dac8ReportResult>(
      "/api/v1/compliance/dac8/report",
      request,
    );
    return data;
  }

  /** Identify a VASP by name, LEI, or jurisdiction */
  async identifyVasp(request: VaspLookupRequest): Promise<VaspIdentification[]> {
    const { data } = await this.http.post<VaspIdentification[]>(
      "/api/v1/compliance/vasp/identify",
      request,
    );
    return data;
  }
}
