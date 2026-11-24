import type { AxiosInstance } from "axios";
import type {
  AddMonitoredWalletRequest,
  BreachDetection,
  BreachSummary,
  MonitoredNamesResponse,
  MonitoredWallet,
  MonitoringOverview,
} from "../types/account.js";
import type { NameScreenRequest } from "../types/names.js";

const enc = encodeURIComponent;

/** Ongoing monitoring of wallets and names, and the breach detections they raise. */
export class MonitoringEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Monitored wallets of the calling tenant. */
  async listWallets(): Promise<MonitoredWallet[]> {
    const { data } = await this.http.get<MonitoredWallet[]>("/api/v1/monitoring/wallets");
    return data;
  }

  /** Add a wallet to monitoring (plan-limited; a duplicate is a 400 `DUPLICATE`). */
  async addWallet(request: AddMonitoredWalletRequest): Promise<MonitoredWallet> {
    const { data } = await this.http.post<MonitoredWallet>("/api/v1/monitoring/wallets", request);
    return data;
  }

  /** Remove a wallet from monitoring. */
  async removeWallet(id: number | string): Promise<{ deleted: boolean }> {
    const { data } = await this.http.delete<{ deleted: boolean }>(`/api/v1/monitoring/wallets/${enc(String(id))}`);
    return data;
  }

  /** Monitored names of the calling tenant. */
  async listNames(): Promise<MonitoredNamesResponse> {
    const { data } = await this.http.get<MonitoredNamesResponse>("/api/v1/monitoring/names");
    return data;
  }

  /** Save a name to the monitored list (plan-limited like monitored wallets). */
  async addName(request: NameScreenRequest): Promise<Record<string, unknown>> {
    const { data } = await this.http.post<Record<string, unknown>>("/api/v1/monitoring/names", request);
    return data;
  }

  /** Remove a name from the monitored list. */
  async removeName(id: number | string): Promise<{ removed: boolean }> {
    const { data } = await this.http.delete<{ removed: boolean }>(`/api/v1/monitoring/names/${enc(String(id))}`);
    return data;
  }

  /** Names and wallets on the monitored list, with the last known hits of each name. */
  async getOverview(): Promise<MonitoringOverview> {
    const { data } = await this.http.get<MonitoringOverview>("/api/v1/monitoring/overview");
    return data;
  }

  /** All breach detections of the calling tenant, newest first. */
  async listBreaches(): Promise<BreachDetection[]> {
    const { data } = await this.http.get<BreachDetection[]>("/api/v1/monitoring/breaches");
    return data;
  }

  /** Counts of breach detections (unacknowledged, by severity, total). */
  async getBreachSummary(): Promise<BreachSummary> {
    const { data } = await this.http.get<BreachSummary>("/api/v1/monitoring/breaches/summary");
    return data;
  }

  /** Acknowledge a breach detection (a second acknowledge is a 400 `ALREADY_ACKNOWLEDGED`). */
  async acknowledgeBreach(id: number | string): Promise<BreachDetection> {
    const { data } = await this.http.post<BreachDetection>(`/api/v1/monitoring/breaches/${enc(String(id))}/acknowledge`);
    return data;
  }
}
