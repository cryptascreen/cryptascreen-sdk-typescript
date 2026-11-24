import type { AxiosInstance } from "axios";
import type { AlertDetail } from "../types/wallet.js";

const enc = encodeURIComponent;

export class AlertsEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** One alert with its machine reason codes, acknowledgement and audit trail (404 for another organization's alert). */
  async get(id: number | string): Promise<AlertDetail> {
    const { data } = await this.http.get<AlertDetail>(`/api/v1/alerts/${enc(String(id))}`);
    return data;
  }

  /**
   * Acknowledge an alert (who / when / note are recorded server-side and audited). Idempotent: a repeat changes nothing and
   * returns the stored acknowledgement with `alreadyAcknowledged: true`.
   */
  async acknowledge(id: number | string, note?: string): Promise<AlertDetail> {
    const { data } = await this.http.post<AlertDetail>(
      `/api/v1/alerts/${enc(String(id))}/acknowledge`,
      note && note.trim() ? { note: note.trim() } : {},
    );
    return data;
  }
}
