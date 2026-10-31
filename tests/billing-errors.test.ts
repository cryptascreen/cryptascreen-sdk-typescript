import { describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  CryptaScreenClient,
  CryptaScreenError,
  QuotaExceededError,
  RateLimitError,
  ServicePausedError,
} from "../src/index.js";

// CS-08B: billing outcomes of a screening call, as the backend sends them to API-key clients.
//  - 429 { error: "quota_exceeded", code: "QUOTA_EXCEEDED", resets_at, upgrade_url } — the plan's monthly cap: NOT retried
//  - 402 { error: "service_paused", code: "SERVICE_PAUSED", subscriptionStatus, billing_url } — payment overdue: NOT retried
//  - plain 429 (rate limit) is still retried and still a RateLimitError
// There is no customer-facing billing/usage endpoint for API keys (the /api/v1/screen-billing/* routes are session-only),
// so the SDK gets no billing methods and no new path-table row.

let mock: MockAdapter;
let client: CryptaScreenClient;
const originalCreate = axios.create.bind(axios);

beforeEach(() => {
  const instance = originalCreate();
  mock = new MockAdapter(instance);
  (axios.create as unknown) = (...args: unknown[]) => {
    const config = args[0] as Record<string, unknown> | undefined;
    if (config) instance.defaults.baseURL = config.baseURL as string;
    return instance;
  };
  client = new CryptaScreenClient({ apiKey: "csk_test_billing", baseUrl: "https://api.cryptascreen.com", retries: 2 });
  axios.create = originalCreate;
});

const ADDR = "0x" + "ab".repeat(20);

describe("CS-08B billing errors", () => {
  it("429 quota_exceeded -> QuotaExceededError, sent once (no retry)", async () => {
    mock.onPost("/api/v1/screen/address").reply(429, {
      error: "quota_exceeded",
      code: "QUOTA_EXCEEDED",
      message: "Monthly screening cap reached. Upgrade your plan.",
      resets_at: "2026-12-01",
      upgrade_url: "/api/v1/screen-billing/upgrade",
    });
    const err = await client.screening.screenAddress({ address: ADDR, chain: "ethereum" }).catch((e) => e);
    expect(err).toBeInstanceOf(QuotaExceededError);
    expect(err).toBeInstanceOf(CryptaScreenError);
    expect(err).not.toBeInstanceOf(RateLimitError);
    expect(err.status).toBe(429);
    expect(err.code).toBe("QUOTA_EXCEEDED");
    expect(err.resetsAt).toBe("2026-12-01");
    expect(err.upgradeUrl).toBe("/api/v1/screen-billing/upgrade");
    expect(mock.history.post.length).toBe(1);
  });

  it("402 SERVICE_PAUSED -> ServicePausedError, sent once", async () => {
    mock.onPost("/api/v1/screen/bulk").reply(402, {
      error: "service_paused",
      code: "SERVICE_PAUSED",
      subscriptionStatus: "PAST_DUE",
      message: "Screening is paused: payment overdue.",
      billing_url: "/settings/billing",
    });
    const err = await client.screening.screenBulk({ addresses: [ADDR], chains: ["ethereum"] }).catch((e) => e);
    expect(err).toBeInstanceOf(ServicePausedError);
    expect(err.status).toBe(402);
    expect(err.code).toBe("SERVICE_PAUSED");
    expect(err.subscriptionStatus).toBe("PAST_DUE");
    expect(err.billingUrl).toBe("/settings/billing");
    expect(mock.history.post.length).toBe(1);
  });

  it("a plain 429 is still a retried RateLimitError", async () => {
    mock.onPost("/api/v1/screen/address").reply(429, { error: "rate_limited" }, { "retry-after": "0" });
    const err = await client.screening.screenAddress({ address: ADDR, chain: "ethereum" }).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(mock.history.post.length).toBe(3);
  });

  it("another 402 stays a generic CryptaScreenError", async () => {
    mock.onPost("/api/v1/screen/address").reply(402, { code: "SOMETHING_ELSE", message: "x" });
    const err = await client.screening.screenAddress({ address: ADDR, chain: "ethereum" }).catch((e) => e);
    expect(err).not.toBeInstanceOf(ServicePausedError);
    expect(err.status).toBe(402);
    expect(err.code).toBe("SOMETHING_ELSE");
  });
});
