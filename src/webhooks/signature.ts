// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import { createHmac, timingSafeEqual } from "node:crypto";
import { CryptaScreenError } from "../errors.js";

/**
 * Webhook signature verification.
 *
 * The API signs every delivery twice:
 * - `X-CryptaScreen-Signature-V2: t=<unix>,v1=<hex(HMAC_SHA256(secret, "<unix>." + body))>` (replay-resistant)
 * - `X-CryptaScreen-Signature: sha256=<hex(HMAC_SHA256(secret, body))>` (legacy, no timestamp)
 *
 * `verifyWebhookSignature` checks V2 (constant-time compare, timestamp within `tolerance` seconds, default 300). The legacy
 * header is accepted only with `allowLegacy: true` (it cannot detect a replay). The Python and Java SDKs implement the same
 * algorithm and pass the same shared vectors (`tests/fixtures/webhook_vectors.json`).
 */

export const SIGNATURE_HEADER = "X-CryptaScreen-Signature";
export const SIGNATURE_V2_HEADER = "X-CryptaScreen-Signature-V2";
export const TIMESTAMP_HEADER = "X-CryptaScreen-Timestamp";
export const EVENT_HEADER = "X-CryptaScreen-Event";
export const EVENT_ID_HEADER = "X-CryptaScreen-Event-Id";
export const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export type WebhookSignatureErrorCode =
  | "WEBHOOK_SIGNATURE_MALFORMED"
  | "WEBHOOK_SIGNATURE_MISMATCH"
  | "WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE"
  | "WEBHOOK_SIGNATURE_MISSING";

/** The webhook payload could not be authenticated (`code` says why). */
export class WebhookSignatureError extends CryptaScreenError {
  constructor(message: string, code: WebhookSignatureErrorCode) {
    super(message, 0, code);
    this.name = "WebhookSignatureError";
  }
}

export interface VerifyWebhookOptions {
  /** Maximum clock difference in seconds between `t` and now (both directions). Default 300. */
  tolerance?: number;
  /** Accept the legacy `X-CryptaScreen-Signature` header when no V2 header is present. Default false. */
  allowLegacy?: boolean;
  /** Unix time in seconds override (tests). */
  now?: number;
}

/** Request headers as Node (`IncomingHttpHeaders`), `Headers`-like objects (`get`) or a plain map. */
export type WebhookHeaders = Record<string, string | string[] | undefined> | { get(name: string): string | null };

/** The delivered event: `{ id, type, createdAt, source, data }`. */
export interface WebhookEvent<T = Record<string, unknown>> {
  id: string;
  type: string;
  createdAt: string;
  source?: unknown;
  data: T;
}

/** Hex HMAC-SHA256 of `body` (legacy) or of `"<timestamp>." + body` when a timestamp is given. */
export function computeWebhookSignature(secret: string, body: string | Uint8Array, timestamp?: number): string {
  const raw = typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body);
  const msg = timestamp === undefined ? raw : Buffer.concat([Buffer.from(`${timestamp}.`, "utf8"), raw]);
  return createHmac("sha256", Buffer.from(secret, "utf8")).update(msg).digest("hex");
}

function header(headers: WebhookHeaders, name: string): string | undefined {
  if (typeof (headers as { get?: unknown }).get === "function") {
    return (headers as { get(n: string): string | null }).get(name) ?? undefined;
  }
  const lname = name.toLowerCase();
  for (const [k, v] of Object.entries(headers as Record<string, string | string[] | undefined>)) {
    if (k.toLowerCase() === lname) return Array.isArray(v) ? v[0] : v;
  }
  return undefined;
}

function safeEqualHex(expected: string, given: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(given.toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Returns `true` when the delivery is authentic; throws {@link WebhookSignatureError} otherwise.
 *
 * @param secret  The webhook secret (shown once when the endpoint is registered in the app).
 * @param body    The RAW request body exactly as received (not re-serialised JSON).
 * @param headers The request headers (case-insensitive lookup).
 */
export function verifyWebhookSignature(
  secret: string,
  body: string | Uint8Array,
  headers: WebhookHeaders,
  options: VerifyWebhookOptions = {},
): true {
  const tolerance = options.tolerance ?? DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
  const now = options.now ?? Date.now() / 1000;
  const v2 = header(headers, SIGNATURE_V2_HEADER);
  if (v2) {
    const parts = v2.split(",").map((p) => p.trim());
    const tRaw = parts.find((p) => p.startsWith("t="))?.slice(2);
    const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
    if (tRaw === undefined || !/^[0-9]{1,15}$/.test(tRaw) || sigs.length === 0) {
      throw new WebhookSignatureError("Malformed X-CryptaScreen-Signature-V2 header", "WEBHOOK_SIGNATURE_MALFORMED");
    }
    const t = Number(tRaw);
    const expected = computeWebhookSignature(secret, body, t);
    if (!sigs.some((s) => safeEqualHex(expected, s))) {
      throw new WebhookSignatureError("Webhook signature does not match", "WEBHOOK_SIGNATURE_MISMATCH");
    }
    if (Math.abs(now - t) > tolerance) {
      throw new WebhookSignatureError(
        `Webhook timestamp outside the tolerance of ${tolerance}s`,
        "WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE",
      );
    }
    return true;
  }
  const legacy = header(headers, SIGNATURE_HEADER);
  if (legacy && options.allowLegacy) {
    if (!legacy.startsWith("sha256=")) {
      throw new WebhookSignatureError("Malformed X-CryptaScreen-Signature header", "WEBHOOK_SIGNATURE_MALFORMED");
    }
    if (!safeEqualHex(computeWebhookSignature(secret, body), legacy.slice(7))) {
      throw new WebhookSignatureError("Webhook signature does not match", "WEBHOOK_SIGNATURE_MISMATCH");
    }
    return true;
  }
  throw new WebhookSignatureError("No usable signature header (X-CryptaScreen-Signature-V2)", "WEBHOOK_SIGNATURE_MISSING");
}

/** Verify (see {@link verifyWebhookSignature}) and return the parsed event. */
export function constructWebhookEvent<T = Record<string, unknown>>(
  secret: string,
  body: string | Uint8Array,
  headers: WebhookHeaders,
  options: VerifyWebhookOptions = {},
): WebhookEvent<T> {
  verifyWebhookSignature(secret, body, headers, options);
  const text = typeof body === "string" ? body : Buffer.from(body).toString("utf8");
  return JSON.parse(text) as WebhookEvent<T>;
}
