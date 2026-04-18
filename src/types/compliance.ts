export interface TravelRuleCheckRequest {
  originatorVaspId: string;
  beneficiaryVaspId: string;
  originatorAddress: string;
  beneficiaryAddress: string;
  chain: string;
  amount: number;
  asset: string;
  originatorName?: string;
  beneficiaryName?: string;
}

export interface TravelRuleCheckResult {
  id: string;
  status: "COMPLIANT" | "NON_COMPLIANT" | "PENDING" | "NOT_APPLICABLE";
  requiredFields: string[];
  missingFields: string[];
  jurisdiction: string;
  thresholdExceeded: boolean;
  threshold: number;
  thresholdCurrency: string;
  checkedAt: string;
}

export interface TravelRulePayload {
  originatorVasp: VaspIdentification;
  beneficiaryVasp: VaspIdentification;
  originator: {
    name?: string;
    address?: string;
    accountNumber?: string;
  };
  beneficiary: {
    name?: string;
    address?: string;
    accountNumber?: string;
  };
  amount: number;
  asset: string;
  chain: string;
}

export interface VaspIdentification {
  vaspId: string;
  name: string;
  lei?: string;
  jurisdiction: string;
  registrationNumber?: string;
  website?: string;
  travelRuleProtocols: string[];
  verified: boolean;
}

export interface Dac8ReportRequest {
  /** Tax reporting period start (ISO 8601) */
  periodStart: string;
  /** Tax reporting period end (ISO 8601) */
  periodEnd: string;
  /** Jurisdiction code (ISO 3166-1 alpha-2) */
  jurisdiction: string;
  /** Addresses to include in the report */
  addresses: Array<{
    address: string;
    chain: string;
  }>;
}

export interface Dac8ReportResult {
  id: string;
  status: "GENERATING" | "READY" | "FAILED";
  periodStart: string;
  periodEnd: string;
  jurisdiction: string;
  reportUrl?: string;
  transactionCount: number;
  totalVolume: number;
  generatedAt?: string;
}

export interface VaspLookupRequest {
  name?: string;
  lei?: string;
  jurisdiction?: string;
}
