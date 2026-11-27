// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import type { ScreeningResponse, VendorLayer, VendorLayerStatus } from "../src/index.js";

// Type-level + shape contract of the additive `vendorLayers` field (wallet rating phase 2).
describe("ScreeningResponse.vendorLayers", () => {
  const layer: VendorLayer = {
    vendor: "CHAINALYSIS",
    status: "OK",
    fetchedAt: "2026-11-21T08:00:00Z",
    cached: false,
    rating: "Severe",
    ratingScale: "Low | Medium | High | Severe (Chainalysis)",
    categories: ["sanctioned entity"],
    reasons: ["Identified as Sanctioned Entity"],
    attribution: "Result from Chainalysis using your own Chainalysis credentials. Not part of the CryptaScreen risk score.",
  };

  it("is optional and separate from our score", () => {
    const base = { address: "0xabc", chain: "ethereum", coverage: "COVERED", riskScore: 12, riskLevel: "LOW", sanctionsMatch: false, flags: [], screenedAt: "2026-11-21T08:00:00Z", cacheHit: false } as ScreeningResponse;
    const withLayers: ScreeningResponse = { ...base, vendorLayers: [layer] };
    expect(withLayers.riskScore).toBe(base.riskScore);
    expect(base.vendorLayers).toBeUndefined();
    expect(withLayers.vendorLayers?.[0].rating).toBe("Severe");
  });

  it("a failed layer carries a status and no rating; unknown statuses are accepted", () => {
    const failed: VendorLayer = { ...layer, vendor: "ELLIPTIC", status: "TIMEOUT", rating: null, ratingScale: null, categories: [], reasons: [] };
    const future: VendorLayer = { ...failed, status: "SOMETHING_NEW" };
    const known: VendorLayerStatus[] = ["OK", "TIMEOUT", "SKIPPED_CAP", "SKIPPED_BREAKER", "AUTH_FAILED", "RATE_LIMITED", "UNAVAILABLE", "NOT_FOUND", "UNSUPPORTED_CHAIN", "UNEXPECTED_RESPONSE"];
    expect(known).toContain(failed.status as VendorLayerStatus);
    expect(future.status).toBe("SOMETHING_NEW");
    expect(failed.rating).toBeNull();
  });
});
