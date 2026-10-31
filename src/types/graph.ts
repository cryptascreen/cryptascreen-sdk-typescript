// Canonical investigation/graph contract. Mirrors backend
// com.cryptascreen.graph.GraphRequest / GraphResponse / GraphNode / GraphEdge / GraphStats / GraphScope.

export interface GraphRequest {
  seedAddress: string;
  chain: string;
  /** BOTH (default), FORWARD, or BACKWARD. */
  direction?: "BOTH" | "FORWARD" | "BACKWARD";
  /** 1..10, default 3. */
  maxHops?: number;
  /** 1..1000, default 200 (capped server-side by the chain budget; see stats.nodeCap). */
  maxNodes?: number;
  minValueUsd?: number;
  dateFrom?: string;
  dateTo?: string;
  aggregateEdges?: boolean;
  forceRefresh?: boolean;
  /** Follow only transfers at/after (FORWARD) or at/before (BACKWARD) the time funds reached a node. */
  timeOrdered?: boolean;
}

/** Per-node/edge read completion. NOT_EXPANDED = terminal depth / node cap / unavailable provider. */
export type GraphScopeStatus = "COMPLETE" | "TRUNCATED" | "PARTIAL" | "FAILED" | "UNSUPPORTED" | "NOT_EXPANDED";

export interface GraphNode {
  id: string;
  address: string;
  chain: string;
  label?: string | null;
  category?: string | null;
  /** null = not screened / UNKNOWN (never a 0 placeholder). */
  riskScore: number | null;
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
  /** BFS depth (seed = 0). */
  hop?: number;
  scopeStatus?: GraphScopeStatus | (string & {}) | null;
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
  /** BFS depth of the far endpoint (1 = adjacent to the seed). */
  hop?: number;
  firstBlock?: number | null;
  lastBlock?: number | null;
  scopeStatus?: GraphScopeStatus | (string & {}) | null;
}

/** Overall graph completeness. Unknown future values must be treated as not COMPLETE. */
export type GraphStatus = "COMPLETE" | "PARTIAL" | "TRUNCATED" | "FAILED" | "UNSUPPORTED" | "UNAVAILABLE";

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  flaggedNodes: number;
  sanctionedNodes: number;
  totalValueTracedUsd?: number | null;
  maxHopsReached: number;
  /** Legacy flag: true whenever `status` is not COMPLETE. */
  truncated: boolean;
  /** Overall status (null from older servers: fall back to `truncated`). */
  status?: GraphStatus | (string & {}) | null;
  /** Machine reason codes (TruncationReason / FailureReason names) or the unavailability reason. */
  statusReasons?: string[] | null;
  /** Effective node cap = min(request.maxNodes, server chain budget). */
  nodeCap?: number;
}

/** The read scope every node/edge was read within. */
export interface GraphScope {
  chain: string;
  direction: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  maxHops: number;
  timeOrdered: boolean;
  /** Fixed finality watermark of the read session (null = unknown -> expansions PARTIAL). */
  finalizedBlock?: number | null;
  provider?: string | null;
}

export interface GraphResponse {
  seedAddress: string;
  chain: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  flaggedNodeIds: string[];
  sanctionedNodeIds: string[];
  stats: GraphStats;
  scope?: GraphScope | null;
  generatedAt: string;
}

export type GraphExportFormat = "json" | "csv";

/** True only when the backend states the graph read was COMPLETE (null status: legacy `truncated` flag). */
export function isGraphComplete(r: Pick<GraphResponse, "stats">): boolean {
  const s = r.stats;
  if (!s) return false;
  if (s.status != null) return s.status === "COMPLETE";
  return s.truncated === false;
}
