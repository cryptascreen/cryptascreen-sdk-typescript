import { describe, it, expect, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import type { AxiosInstance } from "axios";
import fs from "node:fs";
import path from "node:path";
import { CryptaScreenClient, CryptaScreenError, ValidationError, isGraphComplete, isTerminalJobStatus } from "../src/index.js";

// Path table: every public SDK method must hit a (method, path) that is an operation of the public customer API
// (tests/fixtures/openapi-operations.json = method + path of each operation). Methods without an API route must
// make NO request. A new SDK method without a row here, or whose call is not an operation, fails the test.

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "openapi-operations.json"), "utf8")) as {
  operations: string[];
};

function toRegex(route: string): RegExp {
  const [m, p] = route.split(" ");
  return new RegExp(`^${m} ${p.replace(/\{[^}]*\}/g, "[^/]+")}$`);
}
const operations = fixture.operations.map(toRegex);
const mapped = (call: string) => operations.some((re) => re.test(call));

// Operations of the customer API that the SDK does not wrap, each with the reason.
const NOT_WRAPPED: Record<string, string> = {
  "PUT /api/v1/settings/score-thresholds": "tenant administrator session only",
  "DELETE /api/v1/settings/score-thresholds": "tenant administrator session only",
  "PUT /api/v1/settings/name-matching": "tenant administrator session only",
  "DELETE /api/v1/settings/name-matching": "tenant administrator session only",
  "POST /api/v1/settings/name-lists": "tenant administrator session only",
  "DELETE /api/v1/settings/name-lists/{}": "tenant administrator session only",
  "PUT /api/v1/settings/vendor-keys/{}": "signed-in tenant administrator session only",
  "PATCH /api/v1/settings/vendor-keys/{}": "signed-in tenant administrator session only",
  "DELETE /api/v1/settings/vendor-keys/{}": "signed-in tenant administrator session only",
  "POST /api/v1/settings/vendor-keys/{}/test": "signed-in tenant administrator session only",
};

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
    getCounterparties: { call: (c) => c.screening.getCounterparties("ethereum-classic", ADDR, { page: 1, size: 5 }), expect: `GET /api/v1/screen/address/ethereum-classic/${ADDR}/counterparties` },
    getTransactions: { call: (c) => c.screening.getTransactions("ethereum-classic", ADDR), expect: `GET /api/v1/screen/address/ethereum-classic/${ADDR}/transactions` },
    getExposurePaths: { call: (c) => c.screening.getExposurePaths("ethereum-classic", ADDR), expect: `GET /api/v1/screen/address/ethereum-classic/${ADDR}/exposure-paths` },
    screenBulkAndWait: { call: (c) => c.screening.screenBulkAndWait({ addresses: [ADDR], chains: ["ethereum"] }, 1, 1000), expect: "POST /api/v1/screen/bulk" },
  },
  names: {
    screen: { call: (c) => c.names.screen({ name: "Synthetic Person" }, { idempotencyKey: "k-1" }), expect: "POST /api/v1/screen/name" },
    get: { call: (c) => c.names.get("s-1"), expect: "GET /api/v1/screen/name/s-1" },
    history: { call: (c) => c.names.history(5), expect: "GET /api/v1/screen/name/history" },
    decide: { call: (c) => c.names.decide({ hitId: "h-1", value: "FALSE_POSITIVE", reason: "synthetic" }), expect: "POST /api/v1/screen/name/decisions" },
    decisionAudit: { call: (c) => c.names.decisionAudit("json"), expect: "GET /api/v1/screen/name/decisions/audit" },
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
    getAssignment: { call: (c) => c.cases.getAssignment("CASE-1"), expect: "GET /api/v1/cases/CASE-1/assignment" },
    setAssignee: { call: (c) => c.cases.setAssignee("CASE-1", 9), expect: "PUT /api/v1/cases/CASE-1/assignee" },
    linkEvaluation: { call: (c) => c.cases.linkEvaluation("CASE-1", "ev-1"), expect: "POST /api/v1/cases/CASE-1/evaluations" },
  },
  alerts: {
    get: { call: (c) => c.alerts.get(41), expect: "GET /api/v1/alerts/41" },
    acknowledge: { call: (c) => c.alerts.acknowledge(41, "checked"), expect: "POST /api/v1/alerts/41/acknowledge" },
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
    list: { call: (c) => c.webhooks.list(), expect: "GET /api/v1/webhooks" },
    getDeliveries: { call: (c) => c.webhooks.getDeliveries("wh-1"), expect: "GET /api/v1/webhooks/wh-1/deliveries" },
  },
  auth: {
    me: { call: (c) => c.auth.me(), expect: "GET /api/v1/auth/me" },
  },
  capabilities: {
    get: { call: (c) => c.capabilities.get(), expect: "GET /api/v1/capabilities" },
  },
  settings: {
    getScoreThresholds: { call: (c) => c.settings.getScoreThresholds(), expect: "GET /api/v1/settings/score-thresholds" },
    getScoreThresholdAudit: { call: (c) => c.settings.getScoreThresholdAudit(10), expect: "GET /api/v1/settings/score-thresholds/audit" },
    getNameMatching: { call: (c) => c.settings.getNameMatching(), expect: "GET /api/v1/settings/name-matching" },
    getNameMatchingAudit: { call: (c) => c.settings.getNameMatchingAudit(), expect: "GET /api/v1/settings/name-matching/audit" },
    getNameLists: { call: (c) => c.settings.getNameLists(), expect: "GET /api/v1/settings/name-lists" },
    getNameListAudit: { call: (c) => c.settings.getNameListAudit(5), expect: "GET /api/v1/settings/name-lists/audit" },
    listVendorKeys: { call: (c) => c.settings.listVendorKeys(), expect: "GET /api/v1/settings/vendor-keys" },
  },
  monitoring: {
    listWallets: { call: (c) => c.monitoring.listWallets(), expect: "GET /api/v1/monitoring/wallets" },
    addWallet: { call: (c) => c.monitoring.addWallet({ address: ADDR, chain: "ethereum", label: "synthetic" }), expect: "POST /api/v1/monitoring/wallets" },
    removeWallet: { call: (c) => c.monitoring.removeWallet(7), expect: "DELETE /api/v1/monitoring/wallets/7" },
    listNames: { call: (c) => c.monitoring.listNames(), expect: "GET /api/v1/monitoring/names" },
    addName: { call: (c) => c.monitoring.addName({ name: "Synthetic Person" }), expect: "POST /api/v1/monitoring/names" },
    removeName: { call: (c) => c.monitoring.removeName(8), expect: "DELETE /api/v1/monitoring/names/8" },
    getOverview: { call: (c) => c.monitoring.getOverview(), expect: "GET /api/v1/monitoring/overview" },
    listBreaches: { call: (c) => c.monitoring.listBreaches(), expect: "GET /api/v1/monitoring/breaches" },
    getBreachSummary: { call: (c) => c.monitoring.getBreachSummary(), expect: "GET /api/v1/monitoring/breaches/summary" },
    acknowledgeBreach: { call: (c) => c.monitoring.acknowledgeBreach(9), expect: "POST /api/v1/monitoring/breaches/9/acknowledge" },
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
    return [200, url.includes("/intelligence/entity/") || url.endsWith("/api/v1/webhooks") ? [] : {}];
  });
});

describe("SDK path table", () => {
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
      });
    }
  }

  it("every SDK request is an operation of the customer API", () => {
    for (const specs of Object.values(SPECS)) {
      for (const [name, spec] of Object.entries(specs)) {
        if (spec.expect) expect(mapped(spec.expect), name).toBe(true);
      }
    }
  });

  it("the operations the SDK does not wrap are exactly the known list, each with its reason", () => {
    const covered = new Set<string>();
    for (const specs of Object.values(SPECS)) {
      for (const spec of Object.values(specs)) {
        if (!spec.expect) continue;
        // the most specific operation (fewest path parameters) that matches the call
        const hits = fixture.operations.filter((op) => toRegex(op).test(spec.expect as string));
        hits.sort((a, b) => (a.match(/\{\}/g) ?? []).length - (b.match(/\{\}/g) ?? []).length);
        if (hits[0]) covered.add(hits[0]);
      }
    }
    const unwrapped = fixture.operations.filter((op) => !covered.has(op)).sort();
    expect(unwrapped).toEqual(Object.keys(NOT_WRAPPED).sort());
    for (const reason of Object.values(NOT_WRAPPED)) expect(reason.length).toBeGreaterThan(10);
  });

  it("a request outside the contract is not mapped (the parity check does fail)", () => {
    expect(mapped("GET /api/v1/not-in-the-contract")).toBe(false);
    expect(mapped("DELETE /api/v1/webhooks/1")).toBe(false);
    expect(mapped("POST /api/v1/webhooks")).toBe(false);
  });

  it("webhook management by API key was removed (it needs a signed-in user)", () => {
    const w = client.webhooks as unknown as Record<string, unknown>;
    for (const m of ["create", "delete", "test", "redeliver"]) expect(w[m], m).toBeUndefined();
  });
});

describe("contract details", () => {
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

  it("job results: page params, body {totalItems, items[]} and Spring-style content", async () => {
    mock.onGet("/api/v1/screen/jobs/j/results").replyOnce((config) => {
      expect(config.params).toEqual({ page: 1, size: 50 });
      return [200, {
        jobId: "j", status: "PARTIAL", page: 1, size: 50, totalItems: 51, totalPages: 2,
        items: [
          { index: 50, address: ADDR, chain: "ethereum", status: "SCREENED", evaluationId: "e9", riskScore: null, riskLevel: "UNKNOWN", result: null },
        ],
      }];
    });
    const p = await client.screening.getJobResults("j", { page: 1, size: 50 });
    expect(p).toMatchObject({ jobId: "j", status: "PARTIAL", page: 1, size: 50, totalItems: 51, totalPages: 2 });
    expect(p.items[0].riskScore).toBeNull();
    expect(p.items[0].evaluationId).toBe("e9");
    mock.onGet("/api/v1/screen/jobs/j/results").replyOnce(200, { content: [{ index: 0, address: "x", chain: "ethereum", status: "ERROR", errorCode: "UNKNOWN_CHAIN" }], number: 0, totalElements: 1, totalPages: 1 });
    const q = await client.screening.getJobResults("j");
    expect(q.totalItems).toBe(1);
    expect(q.items[0].errorCode).toBe("UNKNOWN_CHAIN");
  });

  it("cancel of a finished job surfaces 409 JOB_ALREADY_TERMINAL", async () => {
    mock.onPost("/api/v1/screen/jobs/j/cancel").reply(409, { error: "JOB_ALREADY_TERMINAL", message: "The job already finished" });
    await expect(client.screening.cancelJob("j")).rejects.toMatchObject({ status: 409 });
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

  it("graph: nullable node riskScore and stats.status drive isGraphComplete", async () => {
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
