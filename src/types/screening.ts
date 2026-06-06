// Canonical CryptaScreen screening contract. Mirrors backend
// com.cryptascreen.dto.ScreeningResponse / ScreeningRequest / BulkScreeningRequest /
// ScreeningJobDto. See openapi-customer.json in the backend repo.

export type RiskLevel = "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Coverage = "COVERED" | "NOT_ANALYZED";

export interface ScreeningFlag {
  flagType: string;
  description?: string | null;
  hopDistance?: number | null;
  confidence?: number | null;
  source?: string | null;
  sourceAddress?: string | null;
  sourceSanctionType?: string | null;
  sourceEntity?: string | null;
}

export interface ScreeningResponse {
  address: string;
  chain: string;
  /** COVERED, or NOT_ANALYZED when the chain is outside the supported analysis set. */
  coverage: Coverage;
  riskScore: number;
  riskLevel: RiskLevel;
  sanctionsMatch: boolean;
  entityLabel?: string | null;
  entityCategory?: string | null;
  confidence?: number | null;
  flags: ScreeningFlag[];
  screeningProvidersUsed?: string[];
  screenedAt: string;
  cacheHit: boolean;
  /** UNAVAILABLE | SKIPPED | PENDING | COMPLETE | QUOTA_REACHED | NOT_INCLUDED_IN_PLAN */
  heuristicsStatus?: string | null;
  heuristicsJobId?: string | null;
}

/** Back-compat alias — a single screening verdict. */
export type ScreeningResult = ScreeningResponse;

export interface ScreenAddressRequest {
  address: string;
  chain: string;
  includeHeuristics?: boolean;
  forceRefresh?: boolean;
  mode?: "fast" | "full";
}

export interface BulkScreeningRequest {
  addresses: string[];
  chains: string[];
  /** false (default): synchronous, max 1000. true: async job, max 10000. */
  async?: boolean;
}

export type ScreeningJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIAL"
  | "FAILED";

export interface ScreeningJobSummary {
  highRiskAddresses: string[];
  criticalAddresses: string[];
  sanctionedAddresses: string[];
}

export interface ScreeningJob {
  jobId: string;
  status: ScreeningJobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  results?: ScreeningResponse[] | null;
  summary?: ScreeningJobSummary;
  error?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}
