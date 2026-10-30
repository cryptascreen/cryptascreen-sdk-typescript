import { describe, it, expect, beforeEach } from "vitest";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import {
  CryptaScreenClient,
  ValidationError,
  isAssessed,
  sanctionsLayerComplete,
} from "../src/index.js";
import type {
  ScreeningResponse,
  SanctionsCheckResponse,
  HeuristicsStatus,
  ScreeningLayer,
} from "../src/index.js";

// CS-02 contract: policyVersion, layers, review/suppression, candidate state, UNKNOWN/null, 400 validation.

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
      instance.defaults.headers = {
        ...instance.defaults.headers,
        ...(config.headers as Record<string, string>),
      };
    }
    return instance;
  };
  client = new CryptaScreenClient({ apiKey: "csk_test_cs02", retries: 0 });
  axios.create = originalCreate;
});

const layer = (state: string, extra: Partial<ScreeningLayer> = {}): ScreeningLayer => ({
  state,
  reason: null,
  checked: true,
  findings: 0,
  sources: null,
  provider: null,
  missingCapabilities: null,
  truncated: null,
  truncationReasons: null,
  ...extra,
});

describe("CS-02 screening contract", () => {
  it("whitelisted blocking match keeps CRITICAL and exposes the separate review block", async () => {
    const body: ScreeningResponse = {
      address: "0x5eed000000000000000000000000000000c50101",
      chain: "ethereum",
      coverage: "COVERED",
      riskScore: 100,
      riskLevel: "CRITICAL",
      sanctionsMatch: true,
      blockingMatch: true,
      disposition: "BLOCKING_MATCH",
      assessmentStatus: "CHECKED_LAYERS_ONLY",
      checkedLayers: ["sanctions"],
      policyVersion: "cs-policy-2026.10",
      scoreVersion: "cs-score-2026.10",
      flags: [
        {
          flagType: "SANCTIONS_MATCH",
          category: "SANCTIONS",
          matchState: "CONFIRMED",
          blocking: true,
          issuer: "US-OFAC",
          listName: "OFAC_SDN",
          programs: ["SYNTH"],
          restrictionType: "OFAC_SDN_BLOCKING",
          subjectId: "SEED-0001",
          scoreContribution: 100,
          counted: true,
        },
      ],
      screenedAt: "2026-10-30T12:00:00Z",
      cacheHit: false,
      heuristicsStatus: "UNAVAILABLE",
      heuristicsDetectors: null,
      layers: {
        sanctions: layer("COMPLETE", {
          sources: [
            {
              sourceId: "OFAC_SDN",
              issuer: "US-OFAC",
              listName: "SDN",
              required: true,
              fetchEnabled: true,
              freshnessState: "FRESH",
              snapshotVersion: 4,
              lastSuccessAt: "2026-10-30T11:50:00Z",
            },
          ],
        }),
        threatIntel: layer("NOT_CONFIGURED"),
        entity: layer("NOT_CONFIGURED"),
        onChain: layer("UNAVAILABLE", { reason: "NO_CHAIN_PROVIDER", checked: false }),
      },
      review: {
        status: "ACTIVE",
        decisionId: 5,
        decisionType: "ALLOWLIST",
        effect: "ALERT_ROUTING",
        reason: "customer wallet",
        actor: "api-key:7",
        createdAt: "2026-10-30T11:00:00Z",
        expiresAt: null,
        revokedAt: null,
        alertRoutingSuppressed: false,
        blockingFindingPreserved: true,
      },
    };
    mock.onPost("/api/v1/screen/address").reply(200, body);
    const r = await client.screening.screenAddress({ address: body.address, chain: "eth" });
    expect(r.riskLevel).toBe("CRITICAL");
    expect(r.blockingMatch).toBe(true);
    expect(r.review?.status).toBe("ACTIVE");
    expect(r.review?.blockingFindingPreserved).toBe(true);
    expect(r.flags[0].matchState).toBe("CONFIRMED");
    expect(r.layers?.sanctions.sources?.[0].freshnessState).toBe("FRESH");
    expect(sanctionsLayerComplete(r)).toBe(true);
    expect(isAssessed(r)).toBe(true);
  });

  it("stale sanctions feed: UNKNOWN with null score is not an all-clear", async () => {
    const body: ScreeningResponse = {
      address: "0x00000000000000000000000000000000000c1ea7",
      chain: "ethereum",
      coverage: "COVERED",
      riskScore: null,
      riskLevel: "UNKNOWN",
      sanctionsMatch: false,
      disposition: "NO_MATCH_IN_CHECKED_LAYERS",
      assessmentStatus: "INCOMPLETE",
      checkedLayers: [],
      flags: [],
      screenedAt: "2026-10-30T12:00:00Z",
      cacheHit: false,
      layers: {
        sanctions: layer("STALE", { reason: "REQUIRED_SOURCE_STALE" }),
        threatIntel: layer("NOT_CONFIGURED"),
        entity: layer("NOT_CONFIGURED"),
        onChain: layer("UNAVAILABLE", { reason: "NO_CHAIN_PROVIDER" }),
      },
      review: { status: "NONE", alertRoutingSuppressed: false, blockingFindingPreserved: false },
    };
    mock.onPost("/api/v1/screen/address").reply(200, body);
    const r = await client.screening.screenAddress({ address: body.address, chain: "ethereum" });
    expect(r.riskScore).toBeNull();
    expect(isAssessed(r)).toBe(false);
    expect(sanctionsLayerComplete(r)).toBe(false);
    expect(r.assessmentStatus).toBe("INCOMPLETE");
  });

  it("heuristicsStatus union includes CS-05 values and per-detector statuses", () => {
    const values: HeuristicsStatus[] = ["PARTIAL", "FAILED", "UNSUPPORTED", "COMPLETE", "NOT_INCLUDED_IN_PLAN"];
    const r: Pick<ScreeningResponse, "heuristicsStatus" | "heuristicsDetectors"> = {
      heuristicsStatus: values[0],
      heuristicsDetectors: [
        { detector: "PEEL_CHAIN", outcome: "TRUNCATED", reason: "PAGE_BUDGET", missingCapabilities: [], flagCount: 1 },
      ],
    };
    expect(r.heuristicsDetectors?.[0].outcome).toBe("TRUNCATED");
  });

  it("sanctions check reports the match and the suppression, plus candidate state", async () => {
    const body: SanctionsCheckResponse = {
      address: "0x5eed000000000000000000000000000000c50101",
      chain: "ethereum",
      canonicalChain: "ethereum",
      match: true,
      blocking: true,
      candidate: false,
      matchState: "CONFIRMED",
      confidence: 1,
      disposition: "BLOCKING_MATCH",
      review: { status: "ACTIVE", decisionType: "ALLOWLIST", alertRoutingSuppressed: false, blockingFindingPreserved: true },
      findings: [],
      layer: layer("COMPLETE"),
      policyVersion: "cs-policy-2026.10",
    };
    mock.onGet("/api/v1/sanctions/check/eth/0x5eed000000000000000000000000000000c50101").reply(200, body);
    const r = await client.sanctions.check("eth", "0x5eed000000000000000000000000000000c50101");
    expect(r.match).toBe(true);
    expect(r.review?.status).toBe("ACTIVE");
  });

  it("maps the CS-02 400 body to ValidationError with code and items", async () => {
    mock.onPost("/api/v1/screen/address").reply(400, {
      error: "VALIDATION_ERROR",
      code: "INVALID_CHECKSUM",
      field: "address",
      message: "Mixed-case EVM address fails the EIP-55 checksum",
    });
    await expect(
      client.screening.screenAddress({ address: "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAeD", chain: "ethereum" }),
    ).rejects.toMatchObject({ status: 400, validationCode: "INVALID_CHECKSUM" });

    mock.onPost("/api/v1/screen/bulk").reply(400, {
      error: "VALIDATION_ERROR",
      code: "INVALID_BULK_ITEMS",
      message: "1 invalid item(s) in bulk request",
      items: [{ index: 1, field: "chain", code: "UNKNOWN_CHAIN", message: "Unknown chain identifier 'etherium'" }],
    });
    try {
      await client.screening.screenBulk({ addresses: ["0x1", "0x2"], chains: ["ethereum", "etherium"] });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      const v = e as ValidationError;
      expect(v.items).toHaveLength(1);
      expect(v.fieldErrors["chain[1]"]).toEqual(["Unknown chain identifier 'etherium'"]);
    }
  });
});
