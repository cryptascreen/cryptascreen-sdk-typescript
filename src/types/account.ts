/** Types of the account, capability, settings and monitoring endpoints. */

/** `GET /auth/me`: the calling identity (an API key resolves to its tenant owner). */
export interface AuthMe {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  /** Derived server-side from the subscription; FREE when none. */
  tier?: "FREE" | "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE" | (string & {});
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  createdAt?: string;
  platformRole?: string | null;
  tenantId?: string;
  screeningRole?: string;
  dataRegion?: string | null;
  authMethod?: "SESSION" | "API_KEY" | (string & {});
  /** Landing edition of the legal pages for the tenant's declared country (`eu` | `us`), null when none. */
  legalRegion?: "eu" | "us" | null;
}

export interface CapabilityChain {
  chain: string;
  displayName: string;
  /** COVERED | UNAVAILABLE */
  onChain: string;
  sanctionsScreenable: boolean;
}

export interface CapabilityLayer {
  /** SANCTIONS | THREAT_INTEL | ATTRIBUTION | ON_CHAIN */
  layer: string;
  /** ON | OFF */
  state: string;
  /** COMPLETE, STALE, NOT_CONFIGURED, UNAVAILABLE, FAILED */
  status: string;
  sources: string[];
}

/** `GET /capabilities`: chains the screening API accepts and the live layer state. */
export interface Capabilities {
  chains: CapabilityChain[];
  layers: CapabilityLayer[];
}

export interface ScoreThresholdValues {
  reviewAt?: number;
  blockAt?: number;
}

/** Tenant review / block thresholds (defaults 40 / 70 until changed). */
export interface ScoreThresholdSettings extends ScoreThresholdValues {
  /** DEFAULT | TENANT */
  source?: string;
  version?: number;
  defaults?: ScoreThresholdValues;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

export interface ScoreThresholdAuditEntry {
  changedAt?: string;
  actor?: string;
  /** SET | RESET */
  action?: string;
  previous?: ScoreThresholdValues;
  current?: ScoreThresholdValues;
  version?: number;
}

export interface ScoreThresholdAuditPage {
  items: ScoreThresholdAuditEntry[];
}

/** Tenant name-matching strength (CONSERVATIVE | BALANCED | STRICT; default CONSERVATIVE). */
export interface NameMatchingStrength {
  strength?: string;
  source?: string;
  version?: number;
  threshold?: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
  /** The values the setting accepts. */
  options?: string[];
}

/** A paged list as the settings / monitoring endpoints return it. Entries are open objects (fields may be added). */
export interface ItemsResponse<T = Record<string, unknown>> {
  items: T[];
  [key: string]: unknown;
}

/** A customer-supplied vendor key as shown to the caller (last4 and fingerprint only, never the key). */
export interface VendorKeyView {
  vendor?: string;
  displayName?: string;
  configured?: boolean;
  enabled?: boolean;
  needsSecret?: boolean;
  last4?: string;
  fingerprint?: string;
  dailyCap?: number;
  usedToday?: number;
  lastTestAt?: string;
  lastTestStatus?: string;
  updatedAt?: string;
}

export interface MonitoredWallet {
  id: number;
  address: string;
  chain: string;
  label?: string | null;
  addedAt?: string;
  lastCheckedAt?: string | null;
}

export interface AddMonitoredWalletRequest {
  address: string;
  chain: string;
  label?: string;
}

export interface BreachDetection {
  id: number;
  address: string;
  chain: string;
  breachSource?: string;
  breachDate?: string | null;
  severity?: string;
  description?: string;
  detectedAt?: string;
  acknowledgedAt?: string | null;
}

export interface BreachSummary {
  unacknowledgedCount: number;
  bySeverity: Record<string, number>;
  totalBreaches: number;
}

/** `GET /monitoring/names`: the monitored names and how many the plan has used. */
export interface MonitoredNamesResponse {
  items: Record<string, unknown>[];
  used: number;
}

/** `GET /monitoring/overview`: names and wallets on the monitored list with the last known hits of each name. */
export interface MonitoringOverview {
  names: Record<string, unknown>[];
  wallets: Record<string, unknown>[];
  nameHits: Record<string, unknown>[];
}
