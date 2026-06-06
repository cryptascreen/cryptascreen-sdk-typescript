import { describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { CryptaScreenClient } from "../src/index.js";
import type { ScreeningResponse, ScreeningJob } from "../src/index.js";

let mock: MockAdapter;
let client: CryptaScreenClient;

const originalCreate = axios.create.bind(axios);

beforeEach(() => {
  const instance = originalCreate();
  mock = new MockAdapter(instance);

  (axios.create as unknown) = (...args: unknown[]) => {
    const config = args[0] as Record<string, unknown> | undefined;
    if (config) {
      instance.defaults.baseURL = config.baseURL as string;
      instance.defaults.timeout = config.timeout as number;
      instance.defaults.headers = {
        ...instance.defaults.headers,
        ...(config.headers as Record<string, string>),
      };
    }
    return instance;
  };

  client = new CryptaScreenClient({
    apiKey: "csk_test_key_123",
    retries: 0,
  });

  axios.create = originalCreate;
});

describe("ScreeningEndpoints", () => {
  it("screenAddress should POST /api/v1/screen/address and return a ScreeningResponse", async () => {
    const mockResult: ScreeningResponse = {
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      chain: "ethereum",
      coverage: "COVERED",
      riskLevel: "LOW",
      riskScore: 5,
      sanctionsMatch: false,
      entityLabel: "vitalik.eth",
      entityCategory: "WALLET",
      flags: [],
      screeningProvidersUsed: ["TIER2_ENTITY_LABELS"],
      screenedAt: "2026-04-11T12:00:00Z",
      cacheHit: false,
    };

    mock.onPost("/api/v1/screen/address").reply(200, mockResult);

    const result = await client.screening.screenAddress({
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      chain: "ethereum",
    });

    expect(result.address).toBe("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(result.riskLevel).toBe("LOW");
    expect(result.sanctionsMatch).toBe(false);
    expect(result.coverage).toBe("COVERED");
    expect(result.entityLabel).toBe("vitalik.eth");
  });

  it("screenBulk should POST /api/v1/screen/bulk (async=false) and return an array", async () => {
    const mockResponse: ScreeningResponse[] = [
      {
        address: "0xaaa",
        chain: "ethereum",
        coverage: "COVERED",
        riskLevel: "MINIMAL",
        riskScore: 2,
        sanctionsMatch: false,
        flags: [],
        screenedAt: "2026-04-11T12:00:00Z",
        cacheHit: false,
      },
      {
        address: "0xbbb",
        chain: "ethereum",
        coverage: "COVERED",
        riskLevel: "CRITICAL",
        riskScore: 100,
        sanctionsMatch: true,
        flags: [{ flagType: "SANCTIONS_MATCH", source: "OFAC_SDN" }],
        screenedAt: "2026-04-11T12:00:00Z",
        cacheHit: false,
      },
    ];

    let sentBody: Record<string, unknown> = {};
    mock.onPost("/api/v1/screen/bulk").reply((config) => {
      sentBody = JSON.parse(config.data as string);
      return [200, mockResponse];
    });

    const result = await client.screening.screenBulk({
      addresses: ["0xaaa", "0xbbb"],
      chains: ["ethereum", "ethereum"],
    });

    expect(sentBody.async).toBe(false);
    expect(result).toHaveLength(2);
    expect(result[1].sanctionsMatch).toBe(true);
    expect(result[1].riskLevel).toBe("CRITICAL");
  });

  it("pollJob should GET /api/v1/screen/jobs/:id and return job status", async () => {
    const mockJob: ScreeningJob = {
      jobId: "5a1f7b3e-0000-0000-0000-000000000001",
      status: "PROCESSING",
      total: 100,
      processed: 42,
      succeeded: 40,
      failed: 2,
      createdAt: "2026-04-11T12:00:00Z",
    };

    mock
      .onGet("/api/v1/screen/jobs/5a1f7b3e-0000-0000-0000-000000000001")
      .reply(200, mockJob);

    const result = await client.screening.pollJob(
      "5a1f7b3e-0000-0000-0000-000000000001",
    );

    expect(result.jobId).toBe("5a1f7b3e-0000-0000-0000-000000000001");
    expect(result.status).toBe("PROCESSING");
    expect(result.processed).toBe(42);
  });

  it("screenBulkAsync should POST /api/v1/screen/bulk (async=true) and return a job", async () => {
    const mockJob: ScreeningJob = {
      jobId: "5a1f7b3e-0000-0000-0000-000000000002",
      status: "PENDING",
      total: 500,
      processed: 0,
      succeeded: 0,
      failed: 0,
      createdAt: "2026-04-11T12:00:00Z",
    };

    let sentBody: Record<string, unknown> = {};
    mock.onPost("/api/v1/screen/bulk").reply((config) => {
      sentBody = JSON.parse(config.data as string);
      return [202, mockJob];
    });

    const result = await client.screening.screenBulkAsync({
      addresses: Array.from({ length: 500 }, (_, i) =>
        `0x${i.toString(16).padStart(40, "0")}`,
      ),
      chains: Array.from({ length: 500 }, () => "ethereum"),
    });

    expect(sentBody.async).toBe(true);
    expect(result.jobId).toBe("5a1f7b3e-0000-0000-0000-000000000002");
    expect(result.status).toBe("PENDING");
    expect(result.total).toBe(500);
  });
});
