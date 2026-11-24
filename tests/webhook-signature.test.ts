import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  WebhookSignatureError,
  CryptaScreenError,
  computeWebhookSignature,
  constructWebhookEvent,
  verifyWebhookSignature,
} from "../src/index.js";

// Shared cross-SDK vectors (identical file in the Python and Java SDKs).
type Vec = {
  name: string;
  secret: string;
  body: string;
  now: number;
  tolerance: number;
  allowLegacy: boolean;
  headers: Record<string, string>;
  expect: { ok: boolean; code?: string };
};
const V = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "webhook_vectors.json"), "utf8")) as {
  sign: { secret: string; body: string; timestamp: number | null; hex: string }[];
  verify: Vec[];
};

describe("webhook signature (shared vectors)", () => {
  it("has the full vector set", () => {
    expect(V.sign.length).toBe(4);
    expect(V.verify.length).toBe(25);
  });

  for (const [i, vec] of V.sign.entries()) {
    it(`sign vector ${i}`, () => {
      const ts = vec.timestamp ?? undefined;
      expect(computeWebhookSignature(vec.secret, vec.body, ts)).toBe(vec.hex);
      expect(computeWebhookSignature(vec.secret, new TextEncoder().encode(vec.body), ts)).toBe(vec.hex);
    });
  }

  for (const vec of V.verify) {
    it(`verify: ${vec.name}`, () => {
      const opts = { tolerance: vec.tolerance, allowLegacy: vec.allowLegacy, now: vec.now };
      if (vec.expect.ok) {
        expect(verifyWebhookSignature(vec.secret, vec.body, vec.headers, opts)).toBe(true);
      } else {
        let err: unknown;
        try {
          verifyWebhookSignature(vec.secret, vec.body, vec.headers, opts);
        } catch (e) {
          err = e;
        }
        expect(err).toBeInstanceOf(WebhookSignatureError);
        expect((err as WebhookSignatureError).code).toBe(vec.expect.code);
      }
    });
  }

  it("bytes body equals string body (unicode)", () => {
    const vec = V.verify.find((v) => v.name === "valid-v2-unicode")!;
    expect(verifyWebhookSignature(vec.secret, new TextEncoder().encode(vec.body), vec.headers, { now: vec.now })).toBe(true);
  });

  it("accepts a Headers-like object (get)", () => {
    const vec = V.verify.find((v) => v.name === "valid-v2-simple")!;
    expect(verifyWebhookSignature(vec.secret, vec.body, new Headers(vec.headers), { now: vec.now })).toBe(true);
  });

  it("constructWebhookEvent returns the parsed payload; the error is a CryptaScreenError", () => {
    const vec = V.verify.find((v) => v.name === "valid-v2-simple")!;
    const ev = constructWebhookEvent<{ evaluationId: string }>(vec.secret, vec.body, vec.headers, { now: vec.now });
    expect(ev.type).toBe("screening.flagged");
    expect(ev.data.evaluationId).toBe("ev-test-1");
    expect(() => constructWebhookEvent("wrong", vec.body, vec.headers, { now: vec.now })).toThrow(CryptaScreenError);
  });
});
