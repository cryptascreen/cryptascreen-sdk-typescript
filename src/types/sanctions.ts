import type { ReviewStatus, ScreeningFlag, ScreeningLayer } from "./screening.js";

// Canonical sanctions contract. Mirrors backend
// com.cryptascreen.dto.SanctionsCheckResponse and the /sanctions/status payload.

export interface SanctionsCheckResponse {
  address: string;
  chain: string;
  match: boolean;
  listName?: string | null;
  entityName?: string | null;
  program?: string | null;
  /** Sanction list / category enum, e.g. OFAC_SDN, EU_CONSOLIDATED. */
  sanctionType?: string | null;
  confidence: number;
  // Additive. A tenant review/suppression decision is reported in `review` and never hides `match`.
  canonicalChain?: string;
  /** Confirmed active applicable blocking (asset-freeze) designation. */
  blocking?: boolean;
  /** Only ambiguous (unknown-network / unvalidated) rows matched — review, not a confirmed match. */
  candidate?: boolean;
  matchState?: "CONFIRMED" | "CANDIDATE" | "NONE";
  disposition?: string;
  issuer?: string | null;
  restrictionType?: string | null;
  programs?: string[] | null;
  subjectId?: string | null;
  findings?: ScreeningFlag[];
  layer?: ScreeningLayer;
  review?: ReviewStatus;
  policyVersion?: string;
}

/** Back-compat alias. */
export type SanctionsCheckResult = SanctionsCheckResponse;

export interface SanctionsStatusResponse {
  total_active: number;
  by_source: Record<string, number>;
  last_checked: string;
}
