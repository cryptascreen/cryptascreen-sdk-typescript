export type WebhookEventType =
  | "screening.completed"
  | "screening.flagged"
  | "sanctions.match"
  | "case.created"
  | "case.escalated"
  | "case.resolved"
  | "job.completed"
  | "job.failed";

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEventType[];
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  statusCode?: number;
  response?: string;
  success: boolean;
  attemptCount: number;
  deliveredAt: string;
}

export interface WebhookTestResult {
  webhookId: string;
  success: boolean;
  statusCode?: number;
  responseTime: number;
  error?: string;
}
