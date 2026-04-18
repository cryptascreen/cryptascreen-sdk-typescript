export type SanctionsStatus = "SANCTIONED" | "NOT_SANCTIONED" | "PENDING_REVIEW" | "UNKNOWN";

export interface SanctionsCheckResult {
  address: string;
  chain: string;
  status: SanctionsStatus;
  sanctionLists: SanctionListMatch[];
  checkedAt: string;
}

export interface SanctionListMatch {
  listName: string;
  listAuthority: string;
  entityName?: string;
  entityType?: string;
  addedDate?: string;
  confidence: number;
}

export interface SanctionsCheckRequest {
  address: string;
  chain: string;
}
