export interface EntityLabel {
  address: string;
  chain: string;
  label: string;
  entityType: string;
  entityName?: string;
  source: string;
  confidence: number;
  tags: string[];
  updatedAt: string;
}

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
  riskScore?: number;
  updatedAt: string;
}
