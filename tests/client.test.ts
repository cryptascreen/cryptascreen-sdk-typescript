import { describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  CryptaScreenClient,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
  CryptaScreenError,
} from "../src/index.js";

// We need to intercept the axios instance created inside the client.
// Since the client creates its own axios instance, we'll mock at the axios.create level.
let mock: MockAdapter;
let client: CryptaScreenClient;

// Patch axios.create to return a mock-able instance
const originalCreate = axios.create.bind(axios);

beforeEach(() => {
  // Create a real axios instance then attach mock to it
  const instance = originalCreate();
  mock = new MockAdapter(instance);

  // Override axios.create to return our mocked instance
  const createSpy = (axios.create as unknown) = (...args: unknown[]) => {
    // Apply config to our instance
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
    baseUrl: "https://api.cryptascreen.com",
    retries: 1,
  });

  // Restore axios.create after client is constructed
  axios.create = originalCreate;
});

describe("CryptaScreenClient", () => {
  it("should throw if apiKey is not provided", () => {
    axios.create = originalCreate;
    expect(() => new CryptaScreenClient({ apiKey: "" })).toThrow(
      "apiKey is required",
    );
  });

  it("should set X-API-Key header on requests", async () => {
    mock.onPost("/api/v1/screening/address").reply((config) => {
      expect(config.headers?.["X-API-Key"]).toBe("csk_test_key_123");
      return [200, { address: "0x123", riskLevel: "LOW", riskScore: 10 }];
    });

    await client.screening.screenAddress({
      address: "0x123",
      chain: "ethereum",
    });
  });

  it("should throw AuthenticationError on 401", async () => {
    mock.onPost("/api/v1/screening/address").reply(401, {
      message: "Invalid API key",
    });

    await expect(
      client.screening.screenAddress({ address: "0x123", chain: "ethereum" }),
    ).rejects.toThrow(AuthenticationError);
  });

  it("should throw NotFoundError on 404", async () => {
    mock.onGet("/api/v1/cases/nonexistent").reply(404, {
      message: "Case not found",
      resource: "Case",
      id: "nonexistent",
    });

    await expect(client.cases.get("nonexistent")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("should throw ValidationError on 400", async () => {
    mock.onPost("/api/v1/cases").reply(400, {
      message: "Validation failed",
      fieldErrors: { title: ["Title is required"] },
    });

    await expect(
      client.cases.create({ title: "", addresses: [] }),
    ).rejects.toThrow(ValidationError);
  });

  it("should throw RateLimitError on 429 after retries exhausted", async () => {
    mock.onPost("/api/v1/screening/address").reply(429, {
      message: "Rate limit exceeded",
    }, { "retry-after": "1" });

    await expect(
      client.screening.screenAddress({ address: "0x123", chain: "ethereum" }),
    ).rejects.toThrow(RateLimitError);
  });

  it("should retry on 5xx and succeed", async () => {
    let callCount = 0;
    mock.onPost("/api/v1/screening/address").reply(() => {
      callCount++;
      if (callCount === 1) {
        return [500, { message: "Internal server error" }];
      }
      return [200, { address: "0x123", riskLevel: "LOW", riskScore: 5 }];
    });

    const result = await client.screening.screenAddress({
      address: "0x123",
      chain: "ethereum",
    });

    expect(result.riskLevel).toBe("LOW");
    expect(callCount).toBe(2);
  });

  it("should throw CryptaScreenError on unknown errors", async () => {
    mock.onPost("/api/v1/screening/address").reply(503, {
      message: "Service unavailable",
      code: "SERVICE_UNAVAILABLE",
    });

    // With retries=1, it will retry once then fail
    await expect(
      client.screening.screenAddress({ address: "0x123", chain: "ethereum" }),
    ).rejects.toThrow(CryptaScreenError);
  });
});
