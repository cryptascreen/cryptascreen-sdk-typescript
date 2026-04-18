import type { AxiosInstance } from "axios";
import type {
  GraphRequest,
  GraphResponse,
  GraphExportFormat,
  TraceRequest,
  TraceResponse,
} from "../types/graph.js";

export class GraphEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Build a transaction graph around an address */
  async buildGraph(request: GraphRequest): Promise<GraphResponse> {
    const { data } = await this.http.post<GraphResponse>(
      "/api/v1/graph/build",
      request,
    );
    return data;
  }

  /** Export a previously built graph in the specified format */
  async exportGraph(
    address: string,
    chain: string,
    format: GraphExportFormat = "json",
  ): Promise<Blob | string> {
    const { data } = await this.http.get(
      `/api/v1/graph/export/${chain}/${address}`,
      {
        params: { format },
        responseType: format === "json" ? "json" : "blob",
      },
    );
    return data;
  }

  /** Trace the flow of funds between two addresses */
  async trace(request: TraceRequest): Promise<TraceResponse> {
    const { data } = await this.http.post<TraceResponse>(
      "/api/v1/graph/trace",
      request,
    );
    return data;
  }
}
