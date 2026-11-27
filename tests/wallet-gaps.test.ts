// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";
import { CryptaScreenClient } from "../src/index.js";

const ADDR = "0x" + "ab".repeat(20);
let client: CryptaScreenClient;
let mock: MockAdapter;

beforeEach(() => {
  client = new CryptaScreenClient({ apiKey: "cs_test_synthetic", baseUrl: "http://sdk.test", retries: 0 });
  mock = new MockAdapter((client as unknown as { http: AxiosInstance }).http);
});

describe("wallet sections, alerts, case assignee", () => {
  it("passes paging/sort/filter params and keeps null (not priced) values null", async () => {
    mock.onGet(`/api/v1/screen/address/ethereum-classic/${ADDR}/counterparties`).reply((config) => {
      expect(config.params).toEqual({ page: 2, size: 5, sort: "txCount", order: "desc", listedOnly: true });
      return [200, {
        chain: "ethereum-classic", address: ADDR, section: { state: "TRUNCATED", reasonCode: "EVENT_BUDGET", eventsRead: 500, pagesUsed: 5 },
        page: 2, size: 5, totalItems: 11, totalPages: 3, sort: "txCount", order: "desc", unpricedAssets: ["ETC"],
        items: [{ address: ADDR, direction: "OUT", txCount: 1, inCount: 0, outCount: 1, assets: [], listed: false, listings: [],
          fiat: { currency: "USD", state: "NOT_PRICED", total: null, pricedTxCount: 0, unpricedTxCount: 1 } }],
      }];
    });
    const page = await client.screening.getCounterparties("ethereum-classic", ADDR, { page: 2, size: 5, sort: "txCount", order: "desc", listedOnly: true });
    expect(page.section.state).toBe("TRUNCATED");
    expect(page.items[0].fiat.total).toBeNull();
  });

  it("acknowledge sends the trimmed note, an empty body without one, and surfaces alreadyAcknowledged", async () => {
    const bodies: unknown[] = [];
    mock.onPost("/api/v1/alerts/41/acknowledge").reply((config) => {
      bodies.push(JSON.parse(config.data));
      return [200, { id: 41, acknowledged: true, alreadyAcknowledged: bodies.length > 1, reasons: [], reasonState: "RECORDED", caseRefs: [], auditTrail: [] }];
    });
    expect((await client.alerts.acknowledge(41, "  checked  ")).alreadyAcknowledged).toBe(false);
    expect((await client.alerts.acknowledge(41)).alreadyAcknowledged).toBe(true);
    expect(bodies).toEqual([{ note: "checked" }, {}]);
  });

  it("setAssignee sends userId null to unassign", async () => {
    let body: unknown;
    mock.onPut("/api/v1/cases/CASE-1/assignee").reply((config) => {
      body = JSON.parse(config.data);
      return [200, { caseRef: "CASE-1", assignee: null, evaluationIds: [], changed: true }];
    });
    const r = await client.cases.setAssignee("CASE-1", null);
    expect(body).toEqual({ userId: null });
    expect(r.assignee).toBeNull();
  });
});

describe("wallet section transferCount", () => {
  it("passes the count with its basis through unchanged; UNKNOWN keeps a null value; an older server has none", async () => {
    const sections = [
      { state: "TRUNCATED", reasonCode: "DURATION", eventsRead: 2400, pagesUsed: 3, transferCount: { value: 5000, basis: "AT_LEAST" } },
      { state: "COMPLETE", reasonCode: null, eventsRead: 12, pagesUsed: 1, transferCount: { value: 9000, basis: "UPPER_BOUND" } },
      { state: "TRUNCATED", reasonCode: "PAGE_BUDGET", eventsRead: 7, pagesUsed: 1, transferCount: { value: null, basis: "UNKNOWN" } },
      { state: "COMPLETE", reasonCode: null, eventsRead: 3, pagesUsed: 1 },
    ];
    let i = 0;
    mock.onGet(`/api/v1/screen/address/ethereum/${ADDR}/counterparties`).reply(() => [200, {
      chain: "ethereum", address: ADDR, section: sections[i++], page: 0, size: 10, totalItems: 0, totalPages: 0, sort: "txCount", order: "desc",
      unpricedAssets: [], items: [],
    }]);
    const got = [];
    for (let n = 0; n < sections.length; n++) got.push((await client.screening.getCounterparties("ethereum", ADDR)).section);
    expect(got[0].transferCount).toEqual({ value: 5000, basis: "AT_LEAST" });
    expect(got[1].transferCount?.basis).toBe("UPPER_BOUND");
    expect(got[2].transferCount).toEqual({ value: null, basis: "UNKNOWN" });
    expect(got[3].transferCount).toBeUndefined();
  });
});
