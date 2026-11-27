// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
/** Events a webhook endpoint can subscribe to. */
export type WebhookEventType = "HIGH_RISK" | "CRITICAL" | "SANCTIONS_MATCH" | "HEURISTICS_COMPLETE" | "TEST";

/** A registered webhook endpoint as `webhooks.list()` returns it. The signing secret is shown once, when the endpoint is registered in the app; here it is only a hint. */
export interface WebhookConfig {
  id: number;
  url: string;
  /** Hint of the signing secret (never the secret itself). */
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  description?: string;
  createdAt: string;
}

/** One delivery attempt record of an endpoint (the last 50, newest first). */
export interface WebhookDelivery {
  id: string;
  webhookConfigId: number;
  eventType: string;
  /** The event envelope `{ id, type, createdAt, source, data }`. */
  payload: Record<string, unknown>;
  /** PENDING | DELIVERED | FAILED | EXHAUSTED (dead letter) */
  status: string;
  attemptCount: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  responseCode?: number | null;
  responseBody?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  eventId?: string;
  sourceType?: string;
  sourceId?: string;
  lastError?: string | null;
}
