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
  // CS-03 (additive)
  /**
   * Fingerprint of the validity vector (source snapshot / data versions, tenant policy, policy + score version,
   * chain provider, entitlements) this result was computed under. Same value = same data produced the result.
   */
  evidenceVersion?: string | null;
  /** Versions, cache decision, result age and per-source age. */
  validity?: ResultValidity | null;
  // CS-04 (additive)
  /**
   * Id of the append-only evaluation that recorded this decision (`screening.getEvaluation(id)`). On the history
   * endpoint: the newest evaluation for the address. Null only for results stored before V5 without a backfill.
   */
  evaluationId?: string | null;
}

/** CS-03 cache decision of one result. Unknown future values may appear. */
export type CacheDecision =
  | "HIT"
  | "MISS"
  | "FORCE_REFRESH"
  | "FINDINGS_PRESENT"
  | "STALE_VERSION"
  | "SCOPE_MISMATCH"
  | "SAFETY_TTL_EXPIRED"
  | "NOT_REUSABLE"
  | "VERSION_UNKNOWN";

/** CS-03: which data produced a result and how old it is (backend `ResultValidity`). */
export interface ResultValidity {
  evidenceVersion: string;
  cacheDecision: CacheDecision | (string & {});
  /** fast | full (part of the cache scope) */
  mode: string;
  includeHeuristics: boolean;
  addressEvidenceVersion: number;
  entityLabelVersion: number;
  /** Active snapshot version per registry source at evaluation time (null = none). */
  sourceSnapshotVersions?: Record<string, number | null> | null;
  tenantPolicyVersion: number;
  policyVersion?: string | null;
  scoreVersion?: string | null;
  /** Chain provider id ("none" = unavailable). */
  chainProvider?: string | null;
  entitlements?: string | null;
  computedAt?: string | null;
  /** now − computedAt (0 for a fresh evaluation). */
  resultAgeSeconds?: number | null;
  /** Age since the last successful refresh per required/active source. */
  sourceAgeSeconds?: Record<string, number | null> | null;
  /** Max over the fetch-enabled sources (null if none). */
  oldestRequiredSourceAgeSeconds?: number | null;
  /** POSTGRES | REDIS_COMPLETE_SET | POSTGRES_FALLBACK:<reason> */
  tier0Lookup?: string | null;
}

/** CS-04: one append-only evaluation (`GET /api/v1/screen/evaluations/{id}`). */
export interface ScreeningEvaluation {
  evaluationId: string;
  /** Set when the evaluation was produced by an async bulk job. */
  jobId?: string | null;
  origin?: string | null;
  actor?: { type?: string | null; id?: string | null } | null;
  /** Canonical input; address fields are null after an erasure redaction. */
  input?: {
    chain?: string | null;
    address?: string | null;
    addressNormalized?: string | null;
    rawAddress?: string | null;
    rawChain?: string | null;
    mode?: string | null;
    includeHeuristics?: boolean;
    forceRefresh?: boolean;
  } | null;
  evaluatedAt: string;
  /** null = UNKNOWN (not determined); never a 0 placeholder. */
  riskScore: number | null;
  riskLevel: RiskLevel | (string & {});
  assessmentStatus?: AssessmentStatus | (string & {}) | null;
  disposition?: Disposition | (string & {}) | null;
  coverage?: Coverage | (string & {}) | null;
  sanctionsMatch: boolean;
  blockingMatch: boolean;
  cacheHit: boolean;
  policyVersion?: string | null;
  scoreVersion?: string | null;
  scope?: {
    layers?: unknown;
    checkedLayers?: unknown;
    heuristicsStatus?: string | null;
    heuristicsDetectors?: unknown;
    providerId?: string | null;
    providerVersion?: string | null;
    detectorVersions?: unknown;
  } | null;
  evidence?: unknown;
  /** The ScreeningResponse exactly as served (null once redacted). */
  result?: ScreeningResponse | null;
  supersession?: { supersedesEvaluationId?: string | null; supersededByEvaluationId?: string | null } | null;
  latest: boolean;
  /** evidenceHash = SHA-256 over evidencePayload; verified is recomputed on read (null after redaction). */
  integrity?: {
    evidenceHash?: string | null;
    algorithm?: string | null;
    verified?: boolean | null;
    payloadSchema?: string | null;
    evidencePayload?: string | null;
  } | null;
  retention?: {
    retentionClass?: string | null;
    retainUntil?: string | null;
    redacted: boolean;
    redactedAt?: string | null;
    redactionReason?: string | null;
  } | null;
}

/** CS-04: newest-first page of evaluations for one address. */
export interface ScreeningEvaluationPage {
  items: ScreeningEvaluation[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  latestEvaluationId?: string | null;
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
  | "FAILED"
  /** CS-08: cancel requested, workers stopping */
  | "CANCELLING"
  /** CS-08: terminal — cancelled before completion; processed items keep their results */
  | "CANCELLED";

/** Terminal job statuses (polling stops). Unknown future values are NOT terminal. */
export const TERMINAL_JOB_STATUSES: readonly ScreeningJobStatus[] = ["COMPLETED", "PARTIAL", "FAILED", "CANCELLED"];

export function isTerminalJobStatus(status: string | null | undefined): boolean {
  return (TERMINAL_JOB_STATUSES as readonly string[]).includes(status ?? "");
}

export interface ScreeningJobSummary {
  highRiskAddresses: string[];
  criticalAddresses: string[];
  sanctionedAddresses: string[];
}

export interface ScreeningJob {
  jobId: string;
  /** Unknown future values must be treated as non-terminal and not successful. */
  status: ScreeningJobStatus | (string & {});
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

/** Options for `screenBulkAsync`. */
export interface AsyncSubmitOptions {
  /**
   * Sent as the `Idempotency-Key` header. Re-submitting with the same key returns the original job instead of
   * creating a second one. When omitted the SDK generates one per call, so its own 429/5xx retries are safe.
   */
  idempotencyKey?: string;
}

/** CS-08: one page (0-based) of an async job's per-address results. */
export interface ScreeningJobResultsPage {
  items: ScreeningResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PageOptions {
  /** 0-based page index (default 0). */
  page?: number;
  size?: number;
}

/** Narrowing helpers (null-safe). */
export function isAssessed(r: Pick<ScreeningResponse, "riskLevel" | "riskScore">): boolean {
  return r.riskLevel !== "UNKNOWN" && r.riskScore !== null;
}

/** True only when the mandatory sanctions layer was COMPLETE; anything else is not an all-clear. */
export function sanctionsLayerComplete(r: Pick<ScreeningResponse, "layers">): boolean {
  return r.layers?.sanctions?.state === "COMPLETE";
}
