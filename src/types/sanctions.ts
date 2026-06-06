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
}

/** Back-compat alias. */
export type SanctionsCheckResult = SanctionsCheckResponse;

export interface SanctionsStatusResponse {
  total_active: number;
  by_source: Record<string, number>;
  last_checked: string;
}
