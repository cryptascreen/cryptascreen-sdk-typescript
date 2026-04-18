export interface GraphRequest {
  address: string;
  chain: string;
  /** Maximum depth of the graph traversal. Defaults to 2 */
  depth?: number;
  /** Minimum transfer value (in USD) to include in the graph */
  minValue?: number;
  /** Only include transfers after this date (ISO 8601) */
  startDate?: string;
  /** Only include transfers before this date (ISO 8601) */
  endDate?: string;
}

export interface GraphNode {
  id: string;
  address: string;
  chain: string;
  label?: string;
  entityType?: string;
  riskLevel?: string;
  sanctioned: boolean;
  totalInflow: number;
  totalOutflow: number;
  transactionCount: number;
}

export interface GraphEdge {
  id: string;
  sourceAddress: string;
  targetAddress: string;
  chain: string;
  totalValue: number;
  transactionCount: number;
  firstTransfer: string;
  lastTransfer: string;
  tokens: string[];
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  flaggedNodes: number;
  sanctionedNodes: number;
  totalValue: number;
}

export interface GraphResponse {
  rootAddress: string;
  chain: string;
  depth: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
  generatedAt: string;
}

export type GraphExportFormat = "json" | "csv" | "graphml";

export interface TraceRequest {
  sourceAddress: string;
  targetAddress: string;
  chain: string;
  /** Maximum hops to search. Defaults to 5 */
  maxHops?: number;
  minValue?: number;
}

export interface TracePath {
  hops: GraphNode[];
  edges: GraphEdge[];
  totalValue: number;
  pathLength: number;
}

export interface TraceResponse {
  sourceAddress: string;
  targetAddress: string;
  chain: string;
  paths: TracePath[];
  shortestPath: number;
  tracedAt: string;
}
