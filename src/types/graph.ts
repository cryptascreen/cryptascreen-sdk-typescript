// Canonical investigation/graph contract. Mirrors backend
// com.cryptascreen.graph.GraphRequest / GraphResponse / GraphNode / GraphEdge / GraphStats.

export interface GraphRequest {
  seedAddress: string;
  chain: string;
  /** BOTH (default), FORWARD, or BACKWARD. */
  direction?: "BOTH" | "FORWARD" | "BACKWARD";
  /** 1..10, default 3. */
  maxHops?: number;
  /** 1..1000, default 200. */
  maxNodes?: number;
  minValueUsd?: number;
  dateFrom?: string;
  dateTo?: string;
  aggregateEdges?: boolean;
  forceRefresh?: boolean;
}

export interface GraphNode {
  id: string;
  address: string;
  chain: string;
  label?: string | null;
  category?: string | null;
  riskScore: number;
  riskLevel?: string | null;
  sanctionsMatch: boolean;
  flagTypes: string[];
  isSeed: boolean;
  isFlagged: boolean;
  totalInboundUsd?: number | null;
  totalOutboundUsd?: number | null;
  txCount: number;
  firstSeen?: string | null;
  lastSeen?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  txHash?: string | null;
  chain: string;
  valueUsd?: number | null;
  valueNative?: number | null;
  assetSymbol?: string | null;
  timestamp?: string | null;
  txCount: number;
  isAggregated: boolean;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  flaggedNodes: number;
  sanctionedNodes: number;
  totalValueTracedUsd?: number | null;
  maxHopsReached: number;
  truncated: boolean;
}

export interface GraphResponse {
  seedAddress: string;
  chain: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  flaggedNodeIds: string[];
  sanctionedNodeIds: string[];
  stats: GraphStats;
  generatedAt: string;
}

export type GraphExportFormat = "json" | "csv";
