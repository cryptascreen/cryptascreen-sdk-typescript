export type RiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "NONE" | "UNKNOWN";

export interface ScreeningFlag {
  category: string;
  label: string;
  severity: RiskLevel;
  source: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface ScreeningResult {
  address: string;
  chain: string;
  riskLevel: RiskLevel;
  riskScore: number;
  flags: ScreeningFlag[];
  sanctioned: boolean;
  labels: string[];
  firstSeen?: string;
  lastSeen?: string;
  screenedAt: string;
  cacheHit: boolean;
}

export interface ScreenAddressRequest {
  address: string;
  chain: string;
  /** If true, bypass cache and re-screen */
  fresh?: boolean;
}

export interface BulkScreeningRequest {
  addresses: Array<{
    address: string;
    chain: string;
  }>;
  /** If true, bypass cache for all addresses */
  fresh?: boolean;
}

export interface BulkScreeningResponse {
  results: ScreeningResult[];
  totalScreened: number;
  totalFlagged: number;
  completedAt: string;
}

export type ScreeningJobStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface ScreeningJob {
  jobId: string;
  status: ScreeningJobStatus;
  totalAddresses: number;
  processedAddresses: number;
  results?: ScreeningResult[];
  createdAt: string;
  completedAt?: string;
  error?: string;
}
