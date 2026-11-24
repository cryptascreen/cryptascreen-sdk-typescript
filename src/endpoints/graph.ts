import type { AxiosInstance } from "axios";
import type {
  GraphRequest,
  GraphResponse,
  GraphExportFormat,
} from "../types/graph.js";

export class GraphEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Build a flow-of-funds graph via BFS from a seed address. */
  async buildGraph(request: GraphRequest): Promise<GraphResponse> {
    const { data } = await this.http.post<GraphResponse>(
      "/api/v1/investigate/graph",
      request,
    );
    return data;
  }

  /** Export a flow-of-funds graph as a JSON or CSV file download. */
  async exportGraph(
    request: GraphRequest,
    format: GraphExportFormat = "json",
  ): Promise<Blob | string> {
    const { data } = await this.http.post(
      "/api/v1/investigate/graph/export",
      request,
      {
        params: { format },
        responseType: format === "json" ? "json" : "blob",
      },
    );
    return data;
  }

  /** Trace funds forward or backward from a seed address (directional graph build). */
  async trace(request: GraphRequest): Promise<GraphResponse> {
    const { data } = await this.http.post<GraphResponse>(
      "/api/v1/investigate/trace",
      request,
    );
    return data;
  }
}
