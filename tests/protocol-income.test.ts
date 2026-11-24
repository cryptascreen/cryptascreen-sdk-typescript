import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";
import { CryptaScreenClient } from "../src/index.js";

const ADDR = "0x" + "cd".repeat(20);
let client: CryptaScreenClient;
let mock: MockAdapter;

beforeEach(() => {
  client = new CryptaScreenClient({ apiKey: "cs_test_synthetic", baseUrl: "http://sdk.test", retries: 0 });
  mock = new MockAdapter((client as unknown as { http: AxiosInstance }).http);
});

const section = { state: "COMPLETE", eventsRead: 2, pagesUsed: 1 };

describe("protocol income and row kind", () => {
  it("transactions carry kind, tokenId and protocolIncome; absent fields stay undefined (older servers)", async () => {
    mock.onGet(`/api/v1/screen/address/ethereum-classic/${ADDR}/transactions`).reply(200, {
      chain: "ethereum-classic", address: ADDR, section, items: [
        { txHash: "0x1", direction: "IN", counterparty: "", asset: "ETC", priced: true, blockNumber: 7, counterpartyListed: false, kind: "BLOCK_REWARD", protocolIncome: true },
        { txHash: "0x2", direction: "IN", counterparty: "0x" + "ee".repeat(20), asset: "0xnft", priced: false, blockNumber: 8, counterpartyListed: false, category: "token", tokenId: "42", kind: null, protocolIncome: false },
        { txHash: "0x3", direction: "OUT", counterparty: "0x" + "ff".repeat(20), asset: "ETC", priced: true, blockNumber: 9, counterpartyListed: false },
      ],
    });
    const page = await client.screening.getTransactions("ethereum-classic", ADDR);
    expect(page.items[0].kind).toBe("BLOCK_REWARD");
    expect(page.items[0].protocolIncome).toBe(true);
    expect(page.items[1].tokenId).toBe("42");
    expect(page.items[1].protocolIncome).toBe(false);
    expect(page.items[2].protocolIncome).toBeUndefined();
  });

  it("category exposure: RECEIVED has a protocolIncome line outside every category; SENT has null", async () => {
    const part = { state: "PARTIAL", reasonCode: "PROTOCOL_INCOME_FEED_NOT_CONFIRMED", usd: 5, usdShare: 0.05, txCount: 1, byAsset: [] };
    const none = { state: "COMPLETE", usd: 0, usdShare: 0, txCount: 0, byAsset: [] };
    mock.onGet(`/api/v1/screen/address/ethereum-classic/${ADDR}/exposure-paths`).reply(200, {
      chain: "ethereum-classic", address: ADDR, maxHops: 3, hitCount: 0, hits: [], section, pathSearch: section,
      categoryExposure: { method: "m", maxHops: 3, section, pathSearch: section, derivedSources: [],
        received: { flow: "RECEIVED", usdTotal: 100, pricedTxCount: 2, unpricedTxCount: 0, assetTotals: [], categories: [], anyDirect: none, anyIndirect: none, protocolIncome: part },
        sent: { flow: "SENT", usdTotal: 10, pricedTxCount: 1, unpricedTxCount: 0, assetTotals: [], categories: [], anyDirect: none, anyIndirect: none, protocolIncome: null } },
    });
    const c = (await client.screening.getExposurePaths("ethereum-classic", ADDR)).categoryExposure!;
    expect(c.received!.protocolIncome!.state).toBe("PARTIAL");
    expect(c.received!.protocolIncome!.usdShare).toBe(0.05);
    expect(c.sent!.protocolIncome).toBeNull();
  });
});
