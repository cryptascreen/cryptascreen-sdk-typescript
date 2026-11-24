/**
 * Wallet-result sections of a screened wallet (`GET /api/v1/screen/address/{chain}/{address}/...`).
 *
 * Every section carries the completeness of the chain read behind it. Only `COMPLETE` means nothing more exists inside the
 * window; an empty list under any other state is NOT "none found". Amounts are decimal strings or numbers exactly as the
 * server computed them; a `null` amount/USD value means "unknown / not priced" and is never zero.
 */
export type WalletSectionState = "COMPLETE" | "TRUNCATED" | "PARTIAL" | "NOT_ANALYZED";

/**
 * What the provider says a transfer read's scope holds. Only `basis: "EXACT"` is a total; `AT_LEAST` is a lower bound,
 * `UPPER_BOUND` an upper bound (e.g. a month-index bound), `UNKNOWN` carries no number (`value: null`). Never present
 * anything but EXACT as an exact total; compare with `eventsRead` (the transfers actually read).
 */
export type WalletTransferCountBasis = "EXACT" | "AT_LEAST" | "UPPER_BOUND" | "UNKNOWN";

export interface WalletTransferCount {
  value: number | null;
  basis: WalletTransferCountBasis;
}

export interface WalletSectionStatus {
  state: WalletSectionState;
  /** Machine reason when state is not COMPLETE (truncation/failure reason, MISSING_CAPABILITIES, NO_PROVIDER, ...). */
  reasonCode?: string | null;
  detail?: string | null;
  provider?: string | null;
  windowFrom?: string | null;
  windowTo?: string | null;
  eventsRead: number;
  pagesUsed: number;
  /** The provider's count for the read's scope with its basis; absent/null for older servers or a non-transfer read. */
  transferCount?: WalletTransferCount | null;
}

export interface WalletListing {
  category: "SANCTIONS" | "THREAT_INTEL" | string;
  sourceId?: string | null;
  listType?: string | null;
  entityName?: string | null;
  program?: string | null;
}

export interface WalletAssetTotal {
  /** "native" or the token contract (lower case). Totals are never summed across assets. */
  asset: string;
  symbol?: string | null;
  received?: string | number | null;
  sent?: string | number | null;
  txCount: number;
}

export interface WalletFiat {
  currency: string;
  /** NOT_PRICED => the USD amounts are null (never 0). */
  state: "PRICED" | "PARTIALLY_PRICED" | "NOT_PRICED";
  received?: string | number | null;
  sent?: string | number | null;
  total?: string | number | null;
  pricedTxCount: number;
  unpricedTxCount: number;
}

export interface WalletCounterparty {
  address: string;
  direction: "IN" | "OUT" | "BOTH";
  txCount: number;
  inCount: number;
  outCount: number;
  assets: WalletAssetTotal[];
  fiat: WalletFiat;
  firstSeen?: string | null;
  lastSeen?: string | null;
  /** On an active sanctions or threat list (the source is in `listings`). */
  listed: boolean;
  listings: WalletListing[];
}

interface WalletPageBase {
  chain: string;
  address: string;
  evaluationId?: string | null;
  section: WalletSectionStatus;
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  sort: string;
  order: "asc" | "desc";
}

export interface WalletCounterpartyPage extends WalletPageBase {
  unpricedAssets: string[];
  items: WalletCounterparty[];
}

export interface WalletTransaction {
  txHash: string;
  time?: string | null;
  direction: "IN" | "OUT" | "SELF";
  counterparty: string;
  asset: string;
  symbol?: string | null;
  amount?: string | number | null;
  fiatUsd?: string | number | null;
  priced: boolean;
  category?: "external" | "internal" | "token" | null;
  internal?: boolean | null;
  logIndex?: number | null;
  blockNumber: number;
  /** Explorer link from the explorer configuration of the chain; null when none is configured. */
  explorerUrl?: string | null;
  counterpartyListed: boolean;
  /**
   * Native row kind when the data provider states one: EXTERNAL | INTERNAL | BLOCK_REWARD | UNCLE_REWARD | MINER_FEE |
   * WITHDRAWAL | GENESIS_ALLOC | IRREGULAR_STATE | GAS_FEE | UNKNOWN. Null when it does not say. Treat unknown values as
   * "not a transfer between parties".
   */
  kind?: string | null;
  /** ERC-1155 token id when the row is an NFT transfer (category `token`; `amount` is units of that id); otherwise null. */
  tokenId?: string | null;
  /**
   * True = protocol income (block or uncle reward, miner fee, withdrawal, genesis allocation, irregular state): the row
   * has no counterparty and is never counted as exposure. Absent on older servers (read as false).
   */
  protocolIncome?: boolean;
}

export interface WalletTransactionPage extends WalletPageBase {
  items: WalletTransaction[];
}

export interface WalletPathStep {
  index: number;
  from: string;
  to: string;
  txHash?: string | null;
  time?: string | null;
  asset?: string | null;
  symbol?: string | null;
  amount?: string | number | null;
  fiatUsd?: string | number | null;
  edgeTxCount: number;
  explorerUrl?: string | null;
}

/** Same fields as the hop-distance detector reports per hit: hop, counterparty, category, direction. */
export interface WalletExposureHit {
  hop: number;
  counterparty: string;
  category: "SANCTIONS" | "THREAT_INTEL" | string;
  direction: "SOURCE_OF_FUNDS" | "DESTINATION_OF_FUNDS" | string;
  listings: WalletListing[];
  /** In the direction the funds moved. */
  steps: WalletPathStep[];
}

export interface WalletUsdShare {
  total?: string | number | null;
  direct?: string | number | null;
  withinHops?: string | number | null;
  /** 0..1; null when no transfer of this flow is priced (never 0). */
  directShare?: string | number | null;
  withinHopsShare?: string | number | null;
  pricedTxCount: number;
  unpricedTxCount: number;
}

export interface WalletAssetShare {
  asset: string;
  symbol?: string | null;
  total: string | number;
  direct: string | number;
  withinHops: string | number;
  directShare?: string | number | null;
  withinHopsShare?: string | number | null;
  txCount: number;
}

export interface WalletDirectionShare {
  flow: "RECEIVED" | "SENT";
  usd: WalletUsdShare;
  byAsset: WalletAssetShare[];
}

/** Share of value to/from listed addresses: sanctions + threat lists only, not a category breakdown. */
export interface WalletShareOfValue {
  /** Plain-language method: numerator, denominator, window, meaning of "within N hops". */
  method: string;
  maxHops: number;
  windowFrom?: string | null;
  windowTo?: string | null;
  received: WalletDirectionShare;
  sent: WalletDirectionShare;
}

/** CryptaScreen's own exposure categories (no external labels). `OTHER_LISTED` groups darknet markets, mixers and other listed types. */
export type WalletExposureCategory =
  | "SANCTIONS" | "STATE_LINKED_THEFT" | "HACK" | "SCAM" | "RANSOMWARE" | "SANCTIONS_EVASION" | "ISSUER_FROZEN" | "OTHER_LISTED";

export interface WalletCategoryAssetShare {
  asset: string;
  symbol?: string | null;
  units: string | number;
  assetTotal: string | number;
  /** units / assetTotal, 0..1. */
  share?: string | number | null;
}

/**
 * One cell (direct or indirect part of one category). `state` other than COMPLETE: TRUNCATED/PARTIAL = lower bound,
 * NOT_ANALYZED = no number exists (every figure is null) - never read null as 0%.
 */
export interface WalletCategoryPart {
  state: WalletSectionState;
  /** e.g. CHAIN_FLAG_OFF (issuer-frozen feed not live), NOT_RUN, a truncation reason. */
  reasonCode?: string | null;
  /** USD of the priced transfers in this part; null when NOT_ANALYZED or nothing is priced. */
  usd?: string | number | null;
  /** usd / USD total of the priced transfers of the flow, 0..1; null when not computable. */
  usdShare?: string | number | null;
  txCount?: number | null;
  byAsset: WalletCategoryAssetShare[];
}

export interface WalletCategoryShare {
  category: WalletExposureCategory | string;
  /** The counterparty is itself a listed address of this category. */
  direct: WalletCategoryPart;
  /** Reached through a path of at least 2 transfers, or named by a derived-evidence source; never includes direct. */
  indirect: WalletCategoryPart;
}

export interface WalletCategoryAssetTotal {
  asset: string;
  symbol?: string | null;
  total: string | number;
  txCount: number;
}

export interface WalletCategoryFlow {
  flow: "RECEIVED" | "SENT";
  usdTotal?: string | number | null;
  pricedTxCount: number;
  unpricedTxCount: number;
  assetTotals: WalletCategoryAssetTotal[];
  /** Categories can overlap (a transfer on a path counts in full for each category it reaches): they do not add up. */
  categories: WalletCategoryShare[];
  anyDirect: WalletCategoryPart;
  anyIndirect: WalletCategoryPart;
  /**
   * RECEIVED only: protocol income (block or uncle reward, miner fee, withdrawal, genesis allocation, irregular state) as its
   * own line. It is part of the received total (it dilutes every share) but belongs to no category and is never exposure.
   * Its `state` is the coverage of the read that produced it (`PARTIAL` while the miner-kinds feed is not confirmed for the
   * chain). Null for SENT and on older servers.
   */
  protocolIncome?: WalletCategoryPart | null;
}

export interface WalletCategoryDerivedSource {
  id: string;
  state: WalletSectionState;
  reasonCode?: string | null;
  entries: number;
}

export interface WalletCategoryExposure {
  method: string;
  maxHops: number;
  windowFrom?: string | null;
  windowTo?: string | null;
  section: WalletSectionStatus;
  pathSearch: WalletSectionStatus;
  derivedSources: WalletCategoryDerivedSource[];
  /** null when the transfer read was NOT_ANALYZED. */
  received?: WalletCategoryFlow | null;
  sent?: WalletCategoryFlow | null;
}

/** Display helper: "n/a" for a part without numbers, "≥ x%" for a lower bound, else "x%". Never renders null as 0%. */
export function categoryShareLabel(part: WalletCategoryPart, digits = 1): string {
  if (part.state === "NOT_ANALYZED" || part.usdShare === null || part.usdShare === undefined) return "n/a";
  const pct = (Number(part.usdShare) * 100).toFixed(digits) + "%";
  return part.state === "COMPLETE" ? pct : "≥ " + pct;
}

/** Share of stolen value at one asset of a wallet (raw integer strings in the asset's smallest unit). */
export interface WalletStolenAssetShare {
  symbol?: string | null;
  decimals?: number | null;
  stolenRaw: string;
  receivedRaw: string;
  /** 0..100 */
  sharePct: number;
  priced: boolean;
}

/** One transfer of a stolen-funds trace path, in the direction the funds moved. */
export interface WalletDerivedStep {
  index: number;
  from: string;
  to: string;
  txHash?: string | null;
  block: number;
  time?: string | null;
  asset: string;
  symbol?: string | null;
  decimals?: number | null;
  amountRaw: string;
  stolenRaw: string;
  /** Share of stolen value at the receiving wallet after this transfer, 0..100. */
  shareAtReceiver: number;
  explorerUrl?: string | null;
}

/** A wallet downstream of an officially attributed theft ("received stolen funds"), with its full provenance. */
export interface WalletDerivedExposure {
  hops: number;
  /** Stolen value received / total value received at this wallet since the first stolen receipt, 0..100. */
  sharePct: number;
  category: string;
  seedSourceId: string;
  incidentId?: string | null;
  incidentDate: string;
  incidentDateBasis: "INCIDENT_DATE" | "PUBLISHED_DATE_LOWER_BOUND" | string;
  sourceUrl?: string | null;
  sourcePublished?: string | null;
  seedAddress: string;
  /** Completeness of the whole trace behind this entry. Anything but COMPLETE is partial evidence. */
  completeness: "COMPLETE" | "PARTIAL" | "TRUNCATED" | string;
  completenessReason?: string | null;
  partialEvidence: boolean;
  /** 1, or 0.5 for an EVM address whose source did not state a chain. */
  chainConfidence: number;
  chainNote?: string | null;
  valueByAsset: Record<string, WalletStolenAssetShare>;
  valueUsd?: string | number | null;
  firstReceivedAt: string;
  steps: WalletDerivedStep[];
  points: number;
  why: string;
  traceVersion: string;
  computedAt: string;
}

/** derivedFrom "stolen-funds-trace": context evidence; adds adverse points but NEVER produces BLOCK. */
export interface WalletStolenFundsTrace {
  derivedFrom: "stolen-funds-trace";
  policyVersion: string;
  points: number;
  blocks: false;
  entries: WalletDerivedExposure[];
}

export interface WalletExposurePaths {
  chain: string;
  address: string;
  evaluationId?: string | null;
  /** Completeness of the transfer read behind the share of value. */
  section: WalletSectionStatus;
  /** Completeness of the multi-hop path search. TRUNCATED/NOT_ANALYZED => more paths may exist. */
  pathSearch: WalletSectionStatus;
  maxHops: number;
  /** null when the transfer read was NOT_ANALYZED. */
  shareOfValue?: WalletShareOfValue | null;
  hitCount: number;
  hits: WalletExposureHit[];
  /** Exposure by CryptaScreen category, direct vs indirect, received and sent. */
  categoryExposure?: WalletCategoryExposure | null;
  /** Derived stolen-funds entries; empty when none (older servers omit it). */
  stolenFundsTrace?: WalletStolenFundsTrace | null;
}

export interface WalletSectionOptions {
  page?: number;
  size?: number;
  sort?: string;
  order?: "asc" | "desc";
  /** Window in days back from now. */
  days?: number;
}

export interface WalletCounterpartyOptions extends WalletSectionOptions {
  direction?: "IN" | "OUT" | "BOTH";
  listedOnly?: boolean;
}

export interface WalletTransactionOptions extends WalletSectionOptions {
  direction?: "IN" | "OUT" | "SELF";
  counterparty?: string;
}

// ── alerts ──
export interface AlertReason {
  /** SANCTIONS_LISTED | THREAT_LISTED | INDIRECT_EXPOSURE | ENTITY_LABELED | PEP_LISTED | RISK_SCORE_AT_OR_ABOVE_THRESHOLD | RISK_SCORE_CHANGED */
  code: string;
  params: Record<string, unknown>;
}

export interface AlertAcknowledgement {
  at?: string | null;
  /** "user:<id>" or "api-key:<id>". */
  by?: string | null;
  userId?: number | null;
  note?: string | null;
}

export interface AlertAuditEntry {
  event: string;
  actor: string;
  at: string;
  note?: string | null;
}

export interface AlertDetail {
  id: number;
  address: string;
  chain: string;
  riskLevel: string;
  alertType: string;
  createdAt: string;
  /** NOT_RECORDED = raised before reasons were stored; the reasons are never reconstructed. */
  reasonState: "RECORDED" | "NOT_RECORDED";
  reasons: AlertReason[];
  evaluationId?: string | null;
  caseRefs: string[];
  acknowledged: boolean;
  acknowledgement?: AlertAcknowledgement | null;
  auditTrail: AlertAuditEntry[];
  /** true on an acknowledge call that found the alert already acknowledged; nothing was written. */
  alreadyAcknowledged: boolean;
}

// ── cases ──
export interface CaseAssignee {
  userId: number;
  name?: string | null;
  email: string;
  assignedAt?: string | null;
  assignedBy?: string | null;
}

export interface CaseAssignment {
  caseRef: string;
  /** null = unassigned. */
  assignee?: CaseAssignee | null;
  evaluationIds: string[];
  /** false when the request changed nothing (idempotent repeat). */
  changed: boolean;
}
