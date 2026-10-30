import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";
import fs from "node:fs";
import path from "node:path";
import { CryptaScreenClient, CryptaScreenError, ValidationError, isGraphComplete, isTerminalJobStatus } from "../src/index.js";

// CS-08 path table: every public SDK method must hit a (method, path) that exists in the backend controllers
// (fixture scanned from the backend at `backendCommit`), or one of the routes the CS-08 backend half adds.
// Methods that have no backend route must make NO request. A new SDK method without a row here fails the test.

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "backend-routes.json"), "utf8"),
) as { backend: string[]; openapi: string[]; pendingCs08: string[]; backendCommit: string };

function toRegex(route: string): RegExp {
  const [m, p] = route.split(" ");
  return new RegExp(`^${m} ${p.replace(/\{[^}]+\}/g, "[^/]+")}$`);
}
const backend = [...fixture.backend, ...fixture.pendingCs08].map(toRegex);
const mapped = (call: string) => backend.some((re) => re.test(call));

const ADDR = "0x" + "ab".repeat(20);
const ANY = { anything: true };

type Spec = { call: (c: CryptaScreenClient) => Promise<unknown>; expect?: string; noRequest?: boolean };

const SPECS: Record<string, Record<string, Spec>> = {
  screening: {
    screenAddress: { call: (c) => c.screening.screenAddress({ address: ADDR, chain: "ethereum" }), expect: "POST /api/v1/screen/address" },
    screenBulk: { call: (c) => c.screening.screenBulk({ addresses: [ADDR], chains: ["ethereum"] }), expect: "POST /api/v1/screen/bulk" },
    screenBulkAsync: { call: (c) => c.screening.screenBulkAsync({ addresses: [ADDR], chains: ["ethereum"] }), expect: "POST /api/v1/screen/bulk" },
    pollJob: { call: (c) => c.screening.pollJob("job-1"), expect: "GET /api/v1/screen/jobs/job-1" },
    listJobs: { call: (c) => c.screening.listJobs(), expect: "GET /api/v1/screen/jobs" },
    getJobResults: { call: (c) => c.screening.getJobResults("job-1", { page: 2 }), expect: "GET /api/v1/screen/jobs/job-1/results" },
    cancelJob: { call: (c) => c.screening.cancelJob("job-1"), expect: "POST /api/v1/screen/jobs/job-1/cancel" },
    getHistory: { call: (c) => c.screening.getHistory("ethereum", ADDR), expect: `GET /api/v1/screen/address/ethereum/${ADDR}/history` },
    listEvaluations: { call: (c) => c.screening.listEvaluations("ethereum", ADDR), expect: `GET /api/v1/screen/address/ethereum/${ADDR}/evaluations` },
    getEvaluation: { call: (c) => c.screening.getEvaluation("ev-1"), expect: "GET /api/v1/screen/evaluations/ev-1" },
    screenBulkAndWait: { call: (c) => c.screening.screenBulkAndWait({ addresses: [ADDR], chains: ["ethereum"] }, 1, 1000), expect: "POST /api/v1/screen/bulk" },
  },
  sanctions: {
    check: { call: (c) => c.sanctions.check("ethereum", ADDR), expect: `GET /api/v1/sanctions/check/ethereum/${ADDR}` },
    getStatus: { call: (c) => c.sanctions.getStatus(), expect: "GET /api/v1/sanctions/status" },
  },
  graph: {
    buildGraph: { call: (c) => c.graph.buildGraph({ seedAddress: ADDR, chain: "ethereum" }), expect: "POST /api/v1/investigate/graph" },
    exportGraph: { call: (c) => c.graph.exportGraph({ seedAddress: ADDR, chain: "ethereum" }), expect: "POST /api/v1/investigate/graph/export" },
    trace: { call: (c) => c.graph.trace({ seedAddress: ADDR, chain: "ethereum" }), expect: "POST /api/v1/investigate/trace" },
  },
  cases: {
    create: { call: (c) => c.cases.create(ANY as never), expect: "POST /api/v1/cases" },
    list: { call: (c) => c.cases.list(), expect: "GET /api/v1/cases" },
    get: { call: (c) => c.cases.get("CASE-1"), expect: "GET /api/v1/cases/CASE-1" },
    updateStatus: { call: (c) => c.cases.updateStatus("CASE-1", ANY as never), expect: "PUT /api/v1/cases/CASE-1/status" },
    addNote: { call: (c) => c.cases.addNote("CASE-1", ANY as never), expect: "POST /api/v1/cases/CASE-1/notes" },
    addEvidence: { call: (c) => c.cases.addEvidence("CASE-1", ANY as never), expect: "POST /api/v1/cases/CASE-1/evidence" },
    escalate: { call: (c) => c.cases.escalate("CASE-1", ANY as never), expect: "POST /api/v1/cases/CASE-1/escalate" },
  },
  compliance: {
    checkTravelRule: {
      call: (c) => c.compliance.checkTravelRule({ chain: "ethereum", fromAddress: ADDR, toAddress: ADDR, transferAmountUsd: 1500 }),
      expect: "POST /api/v1/compliance/travel-rule/check",
    },
    buildTravelRulePayload: {
      call: (c) => c.compliance.buildTravelRulePayload({ chain: "ethereum", originatorWalletAddress: ADDR, transferAmountUsd: 1500 }),
      expect: "POST /api/v1/compliance/travel-rule/payload",
    },
    identifyVasp: { call: (c) => c.compliance.identifyVasp("ethereum", ADDR), expect: `GET /api/v1/compliance/travel-rule/vasp/identify/ethereum/${ADDR}` },
    generateDac8Report: {
      call: (c) =>
        c.compliance.generateDac8Report({
          taxYear: 2026,
          jurisdiction: "LU",
          operator: { name: "Synthetic CASP", tin: "LU00000000", country: "LU" },
          users: [{ userId: "u-1", residenceCountry: "LU" }],
        }),
      expect: "POST /api/v1/compliance/dac8/report",
    },
  },
  intelligence: {
    getEntityLabels: { call: (c) => c.intelligence.getEntityLabels("ethereum", ADDR), expect: `GET /api/v1/intelligence/entity/ethereum/${ADDR}` },
    getEntityLabel: { call: (c) => c.intelligence.getEntityLabel(ADDR, "ethereum"), expect: `GET /api/v1/intelligence/entity/ethereum/${ADDR}` },
    getVaspInfo: { call: (c) => c.intelligence.getVaspInfo("v-1"), noRequest: true },
  },
  webhooks: {
    create: { call: (c) => c.webhooks.create(ANY as never), expect: "POST /api/v1/webhooks" },
    list: { call: (c) => c.webhooks.list(), expect: "GET /api/v1/webhooks" },
    delete: { call: (c) => c.webhooks.delete("wh-1"), expect: "DELETE /api/v1/webhooks/wh-1" },
    test: { call: (c) => c.webhooks.test("wh-1"), expect: "POST /api/v1/webhooks/wh-1/test" },
    getDeliveries: { call: (c) => c.webhooks.getDeliveries("wh-1"), expect: "GET /api/v1/webhooks/wh-1/deliveries" },
  },
};

let client: CryptaScreenClient;
let mock: MockAdapter;
let seen: string[];

beforeEach(() => {
  client = new CryptaScreenClient({ apiKey: "cs_test_synthetic", baseUrl: "http://sdk.test", retries: 0 });
  mock = new MockAdapter((client as unknown as { http: AxiosInstance }).http);
  seen = [];
  mock.onAny().reply((config) => {
    const url = (config.url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    seen.push(`${(config.method ?? "").toUpperCase()} ${url}`);
    if (url.startsWith("/api/v1/screen/jobs/")) return [200, { jobId: "job-1", status: "COMPLETED", items: [] }];
    if (url === "/api/v1/screen/bulk") return [202, { jobId: "job-1", status: "PENDING" }];
    return [200, url.includes("/intelligence/entity/") ? [] : {}];
  });
});

describe("SDK path table vs backend controllers", () => {
  it("covers every public endpoint method", () => {
    for (const [group, specs] of Object.entries(SPECS)) {
      const instance = (client as unknown as Record<string, object>)[group];
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).filter((m) => m !== "constructor");
      expect(methods.sort(), group).toEqual(Object.keys(specs).sort());
    }
  });

  for (const [group, specs] of Object.entries(SPECS)) {
    for (const [name, spec] of Object.entries(specs)) {
      it(`${group}.${name} -> ${spec.expect ?? "no request"}`, async () => {
        if (spec.noRequest) {
          await expect(spec.call(client)).rejects.toBeInstanceOf(CryptaScreenError);
          expect(seen).toEqual([]);
          return;
        }
        await spec.call(client);
        expect(seen[0]).toBe(spec.expect);
        for (const call of seen) expect(mapped(call), `${call} has no backend mapping`).toBe(true);
      });
    }
  }

  it("every operation in openapi-customer.json is a backend route", () => {
    for (const op of fixture.openapi) expect(mapped(op), op).toBe(true);
  });

  it("the 0.1.x unmapped routes are absent from the backend table", () => {
    for (const call of [
      "POST /api/v1/compliance/vasp/identify",
      "GET /api/v1/intelligence/label/ethereum/x",
      "GET /api/v1/intelligence/vasp/v-1",
      "PATCH /api/v1/cases/CASE-1/status",
    ]) {
      expect(mapped(call), call).toBe(false);
    }
  });
});

describe("CS-08 contract details", () => {
  // drop the catch-all route table handler so each test installs its own
  beforeEach(() => mock.resetHandlers());

  it("async submit always carries an Idempotency-Key (caller-supplied or generated)", async () => {
    const headers: string[] = [];
    mock.onPost("/api/v1/screen/bulk").reply((config) => {
      headers.push(String(config.headers?.["Idempotency-Key"] ?? ""));
      return [202, { jobId: "j", status: "PENDING" }];
    });
    await client.screening.screenBulkAsync({ addresses: [ADDR], chains: ["ethereum"] }, { idempotencyKey: "fixed-key" });
    await client.screening.screenBulkAsync({ addresses: [ADDR], chains: ["ethereum"] });
    expect(headers[0]).toBe("fixed-key");
    expect(headers[1]).toMatch(/.{8,}/);
    expect(headers[1]).not.toBe("fixed-key");
  });

  it("5xx retry of an async submit re-sends the SAME Idempotency-Key", async () => {
    const c = new CryptaScreenClient({ apiKey: "cs_test_synthetic", baseUrl: "http://sdk.test", retries: 1 });
    const m = new MockAdapter((c as unknown as { http: AxiosInstance }).http);
    const keys: string[] = [];
    let n = 0;
    m.onPost("/api/v1/screen/bulk").reply((config) => {
      keys.push(String(config.headers?.["Idempotency-Key"]));
      return n++ === 0 ? [503, {}] : [202, { jobId: "j", status: "PENDING" }];
    });
    await c.screening.screenBulkAsync({ addresses: [ADDR], chains: ["ethereum"] });
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  }, 10_000);

  it("job results: page params, items/content normalisation", async () => {
    mock.onGet("/api/v1/screen/jobs/j/results").reply((config) => {
      expect(config.params).toEqual({ page: 1, size: 50 });
      return [200, { content: [{ address: ADDR, riskScore: null, riskLevel: "UNKNOWN" }], number: 1, size: 50, totalElements: 51, totalPages: 2 }];
    });
    const p = await client.screening.getJobResults("j", { page: 1, size: 50 });
    expect(p.page).toBe(1);
    expect(p.totalPages).toBe(2);
    expect(p.items[0].riskScore).toBeNull();
  });

  it("evaluations list passes page/size and keeps a null stored score", async () => {
    mock.onGet(`/api/v1/screen/address/ethereum/${ADDR}/evaluations`).reply((config) => {
      expect(config.params).toEqual({ page: 0, size: 20 });
      return [200, { items: [{ evaluationId: "e1", riskScore: null, riskLevel: "UNKNOWN", latest: true }], page: 0, size: 20, totalElements: 1, totalPages: 1, latestEvaluationId: "e1" }];
    });
    const p = await client.screening.listEvaluations("ethereum", ADDR);
    expect(p.latestEvaluationId).toBe("e1");
    expect(p.items[0].riskScore).toBeNull();
  });

  it("screenBulkAndWait stops on CANCELLED", async () => {
    mock.onPost("/api/v1/screen/bulk").reply(202, { jobId: "j", status: "PENDING" });
    mock.onGet("/api/v1/screen/jobs/j").reply(200, { jobId: "j", status: "CANCELLED" });
    const job = await client.screening.screenBulkAndWait({ addresses: [ADDR], chains: ["ethereum"] }, 1, 1000);
    expect(job.status).toBe("CANCELLED");
  });

  it("DAC8 0.1.x request shape is rejected client-side without a request", async () => {
    await expect(
      client.compliance.generateDac8Report({ periodStart: "2026-01-01", periodEnd: "2026-12-31", jurisdiction: "LU", addresses: [] } as never),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mock.history.post).toHaveLength(0);
  });

  it("getEntityLabel returns the first label or null", async () => {
    mock.onGet(`/api/v1/intelligence/entity/ethereum/${ADDR}`).replyOnce(200, []);
    expect(await client.intelligence.getEntityLabel(ADDR, "ethereum")).toBeNull();
    mock.onGet(`/api/v1/intelligence/entity/ethereum/${ADDR}`).replyOnce(200, [{ address: ADDR, chain: "ethereum", label: "Synthetic Exchange", category: "exchange", confidence: 0.9, source: "fixture", verified: false }]);
    expect((await client.intelligence.getEntityLabel(ADDR, "ethereum"))?.label).toBe("Synthetic Exchange");
  });

  it("graph: nullable node riskScore and CS-05 stats.status drive isGraphComplete", async () => {
    mock.onPost("/api/v1/investigate/graph").reply(200, {
      seedAddress: ADDR, chain: "ethereum", flaggedNodeIds: [], sanctionedNodeIds: [], generatedAt: "2026-10-30T00:00:00Z",
      nodes: [{ id: "n0", address: ADDR, chain: "ethereum", riskScore: null, sanctionsMatch: false, flagTypes: [], isSeed: true, isFlagged: false, txCount: 0, hop: 0, scopeStatus: "NOT_EXPANDED" }],
      edges: [],
      stats: { totalNodes: 1, totalEdges: 0, flaggedNodes: 0, sanctionedNodes: 0, maxHopsReached: 0, truncated: true, status: "UNAVAILABLE", statusReasons: ["NO_PROVIDER"], nodeCap: 200 },
      scope: { chain: "ethereum", direction: "BOTH", maxHops: 3, timeOrdered: false, finalizedBlock: null, provider: "none" },
    });
    const g = await client.graph.buildGraph({ seedAddress: ADDR, chain: "ethereum" });
    expect(g.nodes[0].riskScore).toBeNull();
    expect(g.stats.status).toBe("UNAVAILABLE");
    expect(g.stats.statusReasons).toEqual(["NO_PROVIDER"]);
    expect(g.scope?.provider).toBe("none");
    expect(isGraphComplete(g)).toBe(false);
    expect(isGraphComplete({ stats: { ...g.stats, status: "COMPLETE", truncated: false } })).toBe(true);
    expect(isGraphComplete({ stats: { ...g.stats, status: "SOMETHING_NEW" } })).toBe(false);
    expect(isGraphComplete({ stats: { ...g.stats, status: null, truncated: false } })).toBe(true);
  });

  it("screening response exposes evaluationId, evidenceVersion and validity", async () => {
    mock.onPost("/api/v1/screen/address").reply(200, {
      address: ADDR, chain: "ethereum", coverage: "COVERED", riskScore: null, riskLevel: "UNKNOWN", sanctionsMatch: false, flags: [],
      screenedAt: "2026-10-30T00:00:00Z", cacheHit: true, assessmentStatus: "INCOMPLETE",
      evidenceVersion: "ev-1", evaluationId: "e1",
      validity: { evidenceVersion: "ev-1", cacheDecision: "HIT", mode: "fast", includeHeuristics: false, addressEvidenceVersion: 3, entityLabelVersion: 1, tenantPolicyVersion: 0, resultAgeSeconds: 12, oldestRequiredSourceAgeSeconds: null },
    });
    const r = await client.screening.screenAddress({ address: ADDR, chain: "ethereum" });
    expect(r.evaluationId).toBe("e1");
    expect(r.evidenceVersion).toBe(r.validity?.evidenceVersion);
    expect(r.validity?.cacheDecision).toBe("HIT");
    expect(r.validity?.oldestRequiredSourceAgeSeconds).toBeNull();
    expect(isTerminalJobStatus("CANCELLED")).toBe(true);
    expect(isTerminalJobStatus("SOMETHING_NEW")).toBe(false);
  });
});
