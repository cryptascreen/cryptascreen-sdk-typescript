// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import type { AxiosInstance } from "axios";
import type { WebhookConfig, WebhookDelivery } from "../types/webhooks.js";

const enc = encodeURIComponent;

/**
 * Read access to webhook endpoints. Registering, deleting, testing and re-driving endpoints is a signed-in-user action (the API answers an API key `403 SESSION_REQUIRED`): do it in the app. Verify deliveries with `verifyWebhookSignature`.
 */
export class WebhookEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** List the webhook endpoints of the calling tenant. */
  async list(): Promise<WebhookConfig[]> {
    const { data } = await this.http.get<WebhookConfig[]>("/api/v1/webhooks");
    return data;
  }

  /** Delivery history of one endpoint (the last 50, newest first; 404 for another tenant's endpoint). */
  async getDeliveries(webhookId: number | string): Promise<WebhookDelivery[]> {
    const { data } = await this.http.get<WebhookDelivery[]>(`/api/v1/webhooks/${enc(String(webhookId))}/deliveries`);
    return data;
  }
}
