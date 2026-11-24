import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";
import { CryptaScreenClient, categoryShareLabel } from "../src/index.js";
import type { WalletCategoryPart } from "../src/index.js";

const ADDR = "0x" + "ab".repeat(20);
let client: CryptaScreenClient;
let mock: MockAdapter;

beforeEach(() => {
  client = new CryptaScreenClient({ apiKey: "cs_test_synthetic", baseUrl: "http://sdk.test", retries: 0 });
  mock = new MockAdapter((client as unknown as { http: AxiosInstance }).http);
});

const part = (over: Partial<WalletCategoryPart>): WalletCategoryPart => ({ state: "COMPLETE", byAsset: [], ...over });

describe("exposure by category", () => {
  it("exposure-paths carries categoryExposure with nulls kept as nulls", async () => {
    const off = { state: "NOT_ANALYZED", reasonCode: "CHAIN_FLAG_OFF", usd: null, usdShare: null, txCount: null, byAsset: [] };
    mock.onGet(`/api/v1/screen/address/ethereum-classic/${ADDR}/exposure-paths`).reply(200, {
      chain: "ethereum-classic", address: ADDR, maxHops: 3, hitCount: 0, hits: [],
      section: { state: "COMPLETE", eventsRead: 3, pagesUsed: 1 }, pathSearch: { state: "COMPLETE", eventsRead: 0, pagesUsed: 0 },
      categoryExposure: {
        method: "m", maxHops: 3, section: { state: "COMPLETE", eventsRead: 3, pagesUsed: 1 },
        pathSearch: { state: "COMPLETE", eventsRead: 0, pagesUsed: 0 }, derivedSources: [{ id: "STOLEN_FUNDS_TRACE", state: "NOT_ANALYZED", reasonCode: "SOURCE_NOT_AVAILABLE", entries: 0 }],
        received: { flow: "RECEIVED", usdTotal: 2000, pricedTxCount: 3, unpricedTxCount: 0, assetTotals: [], anyDirect: part({ usd: 200, usdShare: 0.1 }),
          anyIndirect: part({ usd: 0, usdShare: 0 }),
          categories: [{ category: "ISSUER_FROZEN", direct: off, indirect: off }] },
        sent: null,
      },
    });
    const x = await client.screening.getExposurePaths("ethereum-classic", ADDR);
    const c = x.categoryExposure!;
    expect(c.received!.categories[0].direct.usd).toBeNull();
    expect(c.received!.categories[0].direct.state).toBe("NOT_ANALYZED");
    expect(c.sent).toBeNull();
    expect(c.derivedSources[0].reasonCode).toBe("SOURCE_NOT_AVAILABLE");
  });

  it("categoryShareLabel never renders an unknown share as 0%", () => {
    expect(categoryShareLabel(part({ state: "NOT_ANALYZED", usdShare: null }))).toBe("n/a");
    expect(categoryShareLabel(part({ usdShare: null }))).toBe("n/a");
    expect(categoryShareLabel(part({ usdShare: 0 }))).toBe("0.0%");
    expect(categoryShareLabel(part({ usdShare: 0.123 }))).toBe("12.3%");
    expect(categoryShareLabel(part({ state: "TRUNCATED", usdShare: 0.05 }))).toBe("≥ 5.0%");
  });
});
