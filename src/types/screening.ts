// Canonical CryptaScreen screening contract. Mirrors backend
// com.cryptascreen.dto.ScreeningResponse / ScreeningRequest / BulkScreeningRequest /
// ScreeningJobDto. See openapi-customer.json in the backend repo.

export type RiskLevel =
  | "MINIMAL"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"
  /**
   * Not assessed: chain outside the supported set (coverage NOT_ANALYZED) or the mandatory sanctions layer is
   * incomplete (assessmentStatus INCOMPLETE), with no finding. riskScore is null.
   */
  | "UNKNOWN";

export type Coverage = "COVERED" | "NOT_ANALYZED";

/** June values + CS-05 additions. New values may be added: treat unknown values as "not COMPLETE". */
export type HeuristicsStatus =
  | "UNAVAILABLE"
  | "SKIPPED"
  | "PENDING"
  | "COMPLETE"
  | "PARTIAL"
  | "FAILED"
  | "UNSUPPORTED"
  | "QUOTA_REACHED"
  | "NOT_INCLUDED_IN_PLAN";

export type DetectorOutcome =
  | "RAN"
  | "TRUNCATED"
  | "PARTIAL"
  | "FAILED"
  | "SKIPPED_UNSUPPORTED"
  | "DISABLED";

/** CS-05 per-detector outcome of a synchronous Tier-3 run. */
export interface HeuristicDetectorStatus {
  detector: string;
  outcome: DetectorOutcome;
  /** Machine code (truncation/failure reason, MISSING_CAPABILITIES, …) or null. */
  reason?: string | null;
  missingCapabilities: string[];
  flagCount: number;
}

/** CS-02 policy version, e.g. "cs-policy-2026.10". */
export type PolicyVersion = string;

export type LayerState =
  | "COMPLETE"
  | "PARTIAL"
  | "STALE"
  | "UNAVAILABLE"
  | "FAILED"
  | "NOT_REQUESTED"
  | "NOT_ENTITLED"
  | "NOT_CONFIGURED"
  | "PENDING";

export type AssessmentStatus = "COMPLETE" | "CHECKED_LAYERS_ONLY" | "INCOMPLETE" | "NOT_ANALYZED";

export type Disposition =
  | "BLOCKING_MATCH"
  | "RESTRICTION_MATCH"
  | "CANDIDATE_REVIEW"
  | "RISK_INDICATORS"
  | "CONTEXT_ONLY"
  | "NO_MATCH_IN_CHECKED_LAYERS";

export type MatchState = "CONFIRMED" | "CANDIDATE" | "CONTEXT" | "EXPIRED" | "DISPUTED";

export type FindingCategory = "SANCTIONS" | "THREAT_INTEL" | "PEP" | "ENTITY_LABEL" | "ON_CHAIN";

/** CS-01 registry freshness of one source. */
export interface SourceFreshness {
  sourceId: string;
  issuer?: string | null;
  listName?: string | null;
  required: boolean;
  fetchEnabled: boolean;
  /** FRESH | STALE | NO_SNAPSHOT | NOT_INGESTED */
  freshnessState: string;
  staleReason?: string | null;
  snapshotVersion?: number | null;
  snapshotHash?: string | null;
  publishedAt?: string | null;
  lastSuccessAt?: string | null;
  errorState?: string | null;
}

export interface ScreeningLayer {
  /** LayerState; unknown future values must be treated as not COMPLETE. */
  state: LayerState | (string & {});
  reason?: string | null;
  checked: boolean;
  findings: number;
  sources?: SourceFreshness[] | null;
  provider?: string | null;
  missingCapabilities?: string[] | null;
  truncated?: boolean | null;
  truncationReasons?: string[] | null;
}

export interface ScreeningLayers {
  sanctions: ScreeningLayer;
  threatIntel: ScreeningLayer;
  entity: ScreeningLayer;
  onChain: ScreeningLayer;
}

/** Tenant review/suppression decision — never changes riskScore, riskLevel or flags. */
export interface ReviewStatus {
  /** NONE | ACTIVE | EXPIRED */
  status: "NONE" | "ACTIVE" | "EXPIRED";
  decisionId?: number | null;
  decisionType?: "ALLOWLIST" | "SUPPRESS_ALERTS" | "FALSE_POSITIVE" | "ACCEPTED_RISK" | null;
  /** Always ALERT_ROUTING. */
  effect?: string | null;
  reason?: string | null;
  actor?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  /** True only for an ACTIVE decision on non-blocking evidence. */
  alertRoutingSuppressed: boolean;
  /** True when an ACTIVE decision coexists with a blocking finding (the finding is kept). */
  blockingFindingPreserved: boolean;
}

export interface ScreeningFlag {
  flagType: string;
  description?: string | null;
  hopDistance?: number | null;
  confidence?: number | null;
  source?: string | null;
  sourceAddress?: string | null;
  sourceSanctionType?: string | null;
  sourceEntity?: string | null;
  // CS-02 evidence / policy fields (additive)
  category?: FindingCategory | null;
  matchState?: MatchState | null;
  blocking?: boolean | null;
  contextOnly?: boolean | null;
  scoreContribution?: number | null;
  dedupKey?: string | null;
  counted?: boolean | null;
  policyReason?: string | null;
  policyVersion?: PolicyVersion | null;
  sourceId?: string | null;
  issuer?: string | null;
  listName?: string | null;
  programs?: string[] | null;
  restrictionType?: string | null;
  subjectId?: string | null;
  aliasIds?: string | null;
  currencyTag?: string | null;
  chainBasis?: string | null;
  matchQuality?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  snapshotId?: number | null;
  snapshotVersion?: number | null;
}

export interface ScreeningResponse {
  address: string;
  /** Canonical chain id (aliases such as "eth" or "matic" are resolved by the server). */
  chain: string;
  /** COVERED, or NOT_ANALYZED when the chain is outside the supported analysis set. */
  coverage: Coverage;
  /**
   * Ordinal policy score 0–100 (not a probability). Null when riskLevel is UNKNOWN: chain not analyzed or the
   * mandatory sanctions layer is incomplete, with no finding.
   */
  riskScore: number | null;
  riskLevel: RiskLevel;
  /** Confirmed active applicable sanctions-list match (blocking or non-blocking restriction). */
  sanctionsMatch: boolean;
  entityLabel?: string | null;
  entityCategory?: string | null;
  confidence?: number | null;
  flags: ScreeningFlag[];
  screeningProvidersUsed?: string[];
  screenedAt: string;
  cacheHit: boolean;
  heuristicsStatus?: HeuristicsStatus | (string & {}) | null;
  heuristicsJobId?: string | null;
  /** CS-05: per-detector outcomes; null when Tier-3 did not run in this request. */
  heuristicsDetectors?: HeuristicDetectorStatus[] | null;
  // CS-02 (additive)
  policyVersion?: PolicyVersion | null;
  scoreVersion?: string | null;
  /** Confirmed blocking (asset-freeze) designation — the only path to CRITICAL. */
  blockingMatch?: boolean;
  disposition?: Disposition | (string & {}) | null;
  assessmentStatus?: AssessmentStatus | null;
  /** Layers whose state is COMPLETE; "no match" applies to these layers only. */
  checkedLayers?: string[] | null;
  layers?: ScreeningLayers | null;
  review?: ReviewStatus | null;
}

/** Back-compat alias — a single screening verdict. */
export type ScreeningResult = ScreeningResponse;

export interface ScreenAddressRequest {
  address: string;
  /**
   * Network id or alias (eth, mainnet, matic, arb, op, bnb, btc, trx, sol, …). Required: an EVM address does not
   * identify its network. Unknown ids are rejected with 400.
   */
  chain: string;
  includeHeuristics?: boolean;
  forceRefresh?: boolean;
  mode?: "fast" | "full";
}

export interface BulkScreeningRequest {
  addresses: string[];
  chains: string[];
  /** false (default): synchronous, max 1000. true: async job, max 10000. Any invalid item → whole-request 400. */
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

/** Narrowing helpers (null-safe). */
export function isAssessed(r: Pick<ScreeningResponse, "riskLevel" | "riskScore">): boolean {
  return r.riskLevel !== "UNKNOWN" && r.riskScore !== null;
}

/** True only when the mandatory sanctions layer was COMPLETE; anything else is not an all-clear. */
export function sanctionsLayerComplete(r: Pick<ScreeningResponse, "layers">): boolean {
  return r.layers?.sanctions?.state === "COMPLETE";
}
