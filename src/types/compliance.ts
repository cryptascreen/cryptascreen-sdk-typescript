// Mirrors backend com.cryptascreen.travelrule.dto.* / travelrule.TravelRuleCheckResult / TravelRulePayload and
// com.cryptascreen.dac8.dto.*. Travel Rule and DAC8 are CS-09 scope: payload builders are NOT regulatory filing.

/** Backend TravelRuleCheckRequest. */
export interface TravelRuleCheckRequest {
  txHash?: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  /** USD value of the transfer (threshold logic is server-side). */
  transferAmountUsd: number;
}

/** Backend TravelRuleCheckResult. */
export interface TravelRuleCheckResult {
  txHash?: string | null;
  chain: string;
  required: boolean;
  thresholdExceeded: boolean;
  thresholdUsd?: number | null;
  originatorVaspIdentified: boolean;
  originatorVaspName?: string | null;
  beneficiaryVaspIdentified: boolean;
  beneficiaryVaspName?: string | null;
  travelRuleProtocol?: string | null;
}

/** Backend TravelRulePayloadRequest. */
export interface TravelRulePayloadRequest {
  txHash?: string;
  chain: string;
  originatorName?: string;
  originatorFirstName?: string;
  originatorLastName?: string;
  originatorWalletAddress: string;
  originatorVaspName?: string;
  transferAmountUsd: number;
}

/** Backend TravelRulePayload (IVMS101-shaped draft; transmission is out of scope). */
export interface TravelRulePayload {
  originatorName?: string | null;
  originatorAccount?: string | null;
  originatorVasp?: string | null;
  transferAmount?: number | null;
  currency?: string | null;
  txHash?: string | null;
  chain?: string | null;
  timestamp?: string | null;
  ivms101?: Record<string, unknown> | null;
}

/** GET /api/v1/compliance/travel-rule/vasp/identify/{chain}/{address} (snake_case keys as served). */
export interface VaspIdentification {
  identified: boolean;
  vasp_name?: string | null;
  jurisdiction?: string | null;
  mica_registered?: boolean | null;
  travel_rule_protocol?: string | null;
}

/** Backend Dac8OperatorInfo (reporting crypto-asset service provider). */
export interface Dac8OperatorInfo {
  name: string;
  tin: string;
  tinIssuedBy?: string;
  registrationNumber?: string;
  address?: string;
  country: string;
}

/** Backend Dac8TransactionData. */
export interface Dac8TransactionData {
  txHash?: string;
  chain?: string;
  /** ISO date (yyyy-mm-dd). */
  transactionDate: string;
  transactionType: string;
  cryptoAsset: string;
  units: number;
  fmvAtTransaction?: number;
}

/** Backend Dac8UserData (reportable user). */
export interface Dac8UserData {
  userId: string;
  firstName?: string;
  lastName?: string;
  entityName?: string;
  tin?: string;
  residenceCountry: string;
  transactions?: Dac8TransactionData[];
}

/** Backend Dac8ReportRequest — taxYear, jurisdiction, operator and users are required. */
export interface Dac8ReportRequest {
  taxYear: number;
  /** ISO 3166-1 alpha-2 */
  jurisdiction: string;
  operator: Dac8OperatorInfo;
  users: Dac8UserData[];
}

/** Backend Dac8ReportGenerationResult. */
export interface Dac8ReportResult {
  reportId: string;
  transactionCount: number;
  generatedAt?: string | null;
  status: string;
  xmlPreview?: string | null;
}
