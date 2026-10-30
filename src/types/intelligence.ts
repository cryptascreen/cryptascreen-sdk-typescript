/**
 * One entity attribution row for an address (backend `EntityLabel`, served by
 * GET /api/v1/intelligence/entity/{chain}/{address}). Labels are context, not sanctions findings.
 */
export interface EntityLabel {
  id?: number;
  address: string;
  chain: string;
  label: string;
  category: string;
  subcategory?: string | null;
  /** 0..1 */
  confidence: number;
  source: string;
  verified: boolean;
  firstSeen?: string | null;
  lastSeen?: string | null;
  metadata?: string | null;
  ingestedAt?: string | null;
  validTo?: string | null;
  reviewStatus?: string | null;
}

/** @deprecated No backend route serves VASP profiles; kept only so 0.1.x imports compile. */
export interface VaspInfo {
  vaspId: string;
  name: string;
  website?: string;
  jurisdiction: string;
  regulatoryStatus: string;
  supportedChains: string[];
  knownAddresses: Array<{
    address: string;
    chain: string;
    label?: string;
  }>;
  riskScore?: number | null;
  updatedAt: string;
}
