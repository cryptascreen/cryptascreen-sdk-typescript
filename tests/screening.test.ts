import { describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { CryptaScreenClient } from "../src/index.js";
import type { ScreeningResult, ScreeningJob } from "../src/index.js";

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
  it("screenAddress should return a ScreeningResult", async () => {
    const mockResult: ScreeningResult = {
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      chain: "ethereum",
      riskLevel: "LOW",
      riskScore: 5,
      flags: [],
      sanctioned: false,
      labels: ["vitalik.eth"],
      screenedAt: "2026-04-11T12:00:00Z",
      cacheHit: false,
    };

    mock.onPost("/api/v1/screening/address").reply(200, mockResult);

    const result = await client.screening.screenAddress({
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      chain: "ethereum",
    });

    expect(result.address).toBe(
      "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    );
    expect(result.riskLevel).toBe("LOW");
    expect(result.sanctioned).toBe(false);
    expect(result.labels).toContain("vitalik.eth");
  });

  it("screenBulk should return aggregated results", async () => {
    const mockResponse = {
      results: [
        {
          address: "0xaaa",
          chain: "ethereum",
          riskLevel: "LOW",
          riskScore: 2,
          flags: [],
          sanctioned: false,
          labels: [],
          screenedAt: "2026-04-11T12:00:00Z",
          cacheHit: false,
        },
        {
          address: "0xbbb",
          chain: "ethereum",
          riskLevel: "HIGH",
          riskScore: 85,
          flags: [
            {
              category: "MIXER",
              label: "Tornado Cash",
              severity: "HIGH",
              source: "OFAC",
            },
          ],
          sanctioned: true,
          labels: ["Tornado Cash"],
          screenedAt: "2026-04-11T12:00:00Z",
          cacheHit: false,
        },
      ],
      totalScreened: 2,
      totalFlagged: 1,
      completedAt: "2026-04-11T12:00:01Z",
    };

    mock.onPost("/api/v1/screening/bulk").reply(200, mockResponse);

    const result = await client.screening.screenBulk({
      addresses: [
        { address: "0xaaa", chain: "ethereum" },
        { address: "0xbbb", chain: "ethereum" },
      ],
    });

    expect(result.totalScreened).toBe(2);
    expect(result.totalFlagged).toBe(1);
    expect(result.results).toHaveLength(2);
    expect(result.results[1].sanctioned).toBe(true);
  });

  it("pollJob should return job status", async () => {
    const mockJob: ScreeningJob = {
      jobId: "job_abc123",
      status: "IN_PROGRESS",
      totalAddresses: 100,
      processedAddresses: 42,
      createdAt: "2026-04-11T12:00:00Z",
    };

    mock.onGet("/api/v1/screening/jobs/job_abc123").reply(200, mockJob);

    const result = await client.screening.pollJob("job_abc123");

    expect(result.jobId).toBe("job_abc123");
    expect(result.status).toBe("IN_PROGRESS");
    expect(result.processedAddresses).toBe(42);
  });

  it("screenBulkAsync should submit an async job", async () => {
    const mockJob: ScreeningJob = {
      jobId: "job_xyz789",
      status: "PENDING",
      totalAddresses: 500,
      processedAddresses: 0,
      createdAt: "2026-04-11T12:00:00Z",
    };

    mock.onPost("/api/v1/screening/bulk/async").reply(200, mockJob);

    const result = await client.screening.screenBulkAsync({
      addresses: Array.from({ length: 500 }, (_, i) => ({
        address: `0x${i.toString(16).padStart(40, "0")}`,
        chain: "ethereum",
      })),
    });

    expect(result.jobId).toBe("job_xyz789");
    expect(result.status).toBe("PENDING");
    expect(result.totalAddresses).toBe(500);
  });
});
