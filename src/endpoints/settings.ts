import type { AxiosInstance } from "axios";
import type {
  ItemsResponse,
  NameMatchingStrength,
  ScoreThresholdAuditPage,
  ScoreThresholdSettings,
  VendorKeyView,
} from "../types/account.js";

/**
 * Read access to the tenant settings. Changing settings (thresholds, matching strength, allow / block lists, vendor keys)
 * needs a signed-in tenant administrator and is done in the app; an API key may read them.
 */
export class SettingsEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Review / block thresholds of the calling tenant (defaults 40 / 70 until changed; paid plans). */
  async getScoreThresholds(): Promise<ScoreThresholdSettings> {
    const { data } = await this.http.get<ScoreThresholdSettings>("/api/v1/settings/score-thresholds");
    return data;
  }

  /** Change history of the thresholds, newest first. */
  async getScoreThresholdAudit(limit?: number): Promise<ScoreThresholdAuditPage> {
    const { data } = await this.http.get<ScoreThresholdAuditPage>("/api/v1/settings/score-thresholds/audit", {
      params: limit === undefined ? undefined : { limit },
    });
    return data;
  }

  /** Name-matching strength of the calling tenant (default CONSERVATIVE; paid plans). */
  async getNameMatching(): Promise<NameMatchingStrength> {
    const { data } = await this.http.get<NameMatchingStrength>("/api/v1/settings/name-matching");
    return data;
  }

  /** Change history of the matching strength, newest first. */
  async getNameMatchingAudit(limit?: number): Promise<ItemsResponse> {
    const { data } = await this.http.get<ItemsResponse>("/api/v1/settings/name-matching/audit", {
      params: limit === undefined ? undefined : { limit },
    });
    return data;
  }

  /** Allow / block list entries of the calling tenant (exact identifiers, applied before fuzzy matching). */
  async getNameLists(): Promise<ItemsResponse> {
    const { data } = await this.http.get<ItemsResponse>("/api/v1/settings/name-lists");
    return data;
  }

  /** Audit of allow / block entries (added, removed, applied), newest first. */
  async getNameListAudit(limit?: number): Promise<ItemsResponse> {
    const { data } = await this.http.get<ItemsResponse>("/api/v1/settings/name-lists/audit", {
      params: limit === undefined ? undefined : { limit },
    });
    return data;
  }

  /** The vendors with their configured state (last4 and fingerprint only; never the key). */
  async listVendorKeys(): Promise<VendorKeyView[]> {
    const { data } = await this.http.get<VendorKeyView[]>("/api/v1/settings/vendor-keys");
    return data;
  }
}
