import type { AxiosInstance } from "axios";
import type { EntityLabel, VaspInfo } from "../types/intelligence.js";
import { CryptaScreenError } from "../errors.js";

const enc = encodeURIComponent;

export class IntelligenceEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /**
   * All entity attributions for an address (empty array = no label known; NOT a clean verdict).
   * Backend: GET /api/v1/intelligence/entity/{chain}/{address}.
   */
  async getEntityLabels(chain: string, address: string): Promise<EntityLabel[]> {
    const { data } = await this.http.get<EntityLabel[]>(
      `/api/v1/intelligence/entity/${enc(chain)}/${enc(address)}`,
    );
    return Array.isArray(data) ? data : [];
  }

  /**
   * First entity attribution for an address, or null. 0.1.x called /api/v1/intelligence/label/{chain}/{address},
   * which has no backend route; this now reads /intelligence/entity/{chain}/{address}.
   * @deprecated use getEntityLabels(chain, address) — an address may carry several labels.
   */
  async getEntityLabel(address: string, chain: string): Promise<EntityLabel | null> {
    const labels = await this.getEntityLabels(chain, address);
    return labels[0] ?? null;
  }

  /**
   * @deprecated There is no VASP profile endpoint in the CryptaScreen API (0.1.x called the unmapped
   * /api/v1/intelligence/vasp/{id}). Throws without making a request. For address-level VASP identification use
   * compliance.identifyVasp(chain, address).
   */
  async getVaspInfo(vaspId: string): Promise<VaspInfo> {
    throw new CryptaScreenError(
      `getVaspInfo(${vaspId}) is not available: the API has no VASP profile endpoint. Use compliance.identifyVasp(chain, address).`,
      0,
      "ENDPOINT_NOT_AVAILABLE",
    );
  }
}
