import type { AxiosInstance } from "axios";
import type { EntityLabel, VaspInfo } from "../types/intelligence.js";

export class IntelligenceEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Get entity label and attribution for an address */
  async getEntityLabel(address: string, chain: string): Promise<EntityLabel> {
    const { data } = await this.http.get<EntityLabel>(
      `/api/v1/intelligence/label/${chain}/${address}`,
    );
    return data;
  }

  /** Get information about a known VASP */
  async getVaspInfo(vaspId: string): Promise<VaspInfo> {
    const { data } = await this.http.get<VaspInfo>(
      `/api/v1/intelligence/vasp/${vaspId}`,
    );
    return data;
  }
}
