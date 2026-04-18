import type { AxiosInstance } from "axios";
import type { PaginatedResponse, PaginationParams } from "../types/common.js";
import type {
  WebhookConfig,
  CreateWebhookRequest,
  WebhookDelivery,
  WebhookTestResult,
} from "../types/webhooks.js";

export class WebhookEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Create a new webhook configuration */
  async create(request: CreateWebhookRequest): Promise<WebhookConfig> {
    const { data } = await this.http.post<WebhookConfig>(
      "/api/v1/webhooks",
      request,
    );
    return data;
  }

  /** List all webhook configurations */
  async list(): Promise<WebhookConfig[]> {
    const { data } = await this.http.get<WebhookConfig[]>("/api/v1/webhooks");
    return data;
  }

  /** Delete a webhook configuration */
  async delete(webhookId: string): Promise<void> {
    await this.http.delete(`/api/v1/webhooks/${webhookId}`);
  }

  /** Send a test event to a webhook */
  async test(webhookId: string): Promise<WebhookTestResult> {
    const { data } = await this.http.post<WebhookTestResult>(
      `/api/v1/webhooks/${webhookId}/test`,
    );
    return data;
  }

  /** Get delivery history for a webhook */
  async getDeliveries(
    webhookId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<WebhookDelivery>> {
    const { data } = await this.http.get<PaginatedResponse<WebhookDelivery>>(
      `/api/v1/webhooks/${webhookId}/deliveries`,
      { params },
    );
    return data;
  }
}
