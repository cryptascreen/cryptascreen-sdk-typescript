import axios, { AxiosInstance, AxiosError } from "axios";
import type { CryptaScreenConfig } from "./types/common.js";
import {
  CryptaScreenError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  QuotaExceededError,
  ServicePausedError,
  ValidationError,
  PlanLimitError,
  SeatLimitReachedError,
  ApiKeyLimitReachedError,
  PLAN_LIMIT_CODES,
} from "./errors.js";
import type { ValidationItem } from "./errors.js";
import { ScreeningEndpoints } from "./endpoints/screening.js";
import { SanctionsEndpoints } from "./endpoints/sanctions.js";
import { GraphEndpoints } from "./endpoints/graph.js";
import { CasesEndpoints } from "./endpoints/cases.js";
import { ComplianceEndpoints } from "./endpoints/compliance.js";
import { IntelligenceEndpoints } from "./endpoints/intelligence.js";
import { WebhookEndpoints } from "./endpoints/webhooks.js";

const DEFAULT_BASE_URL = "https://api.cryptascreen.com";
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_RETRIES = 3;

/** 429 `quota_exceeded` is the plan's monthly cap, not a rate limit. */
function isQuotaExceeded(error: AxiosError): boolean {
  const body = error.response?.data as Record<string, unknown> | undefined;
  return error.response?.status === 429 && (body?.error === "quota_exceeded" || body?.code === "QUOTA_EXCEEDED");
}

export class CryptaScreenClient {
  public readonly screening: ScreeningEndpoints;
  public readonly sanctions: SanctionsEndpoints;
  public readonly graph: GraphEndpoints;
  public readonly cases: CasesEndpoints;
  public readonly compliance: ComplianceEndpoints;
  public readonly intelligence: IntelligenceEndpoints;
  public readonly webhooks: WebhookEndpoints;

  private readonly http: AxiosInstance;
  private readonly maxRetries: number;

  constructor(config: CryptaScreenConfig) {
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }

    this.maxRetries = config.retries ?? DEFAULT_RETRIES;

    this.http = axios.create({
      baseURL: config.baseUrl ?? DEFAULT_BASE_URL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      headers: {
        "X-API-Key": config.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.setupInterceptors();

    this.screening = new ScreeningEndpoints(this.http);
    this.sanctions = new SanctionsEndpoints(this.http);
    this.graph = new GraphEndpoints(this.http);
    this.cases = new CasesEndpoints(this.http);
    this.compliance = new ComplianceEndpoints(this.http);
    this.intelligence = new IntelligenceEndpoints(this.http);
    this.webhooks = new WebhookEndpoints(this.http);
  }

  private setupInterceptors(): void {
    this.http.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config;
        if (!config) {
          throw this.toSdkError(error);
        }

        const configAny = config as unknown as Record<string, unknown>;
        const retryCount = (configAny.__retryCount as number) || 0;
        const status = error.response?.status;

        // Retry on 429 (rate limit) or 5xx — never on 429 quota_exceeded (the monthly plan quota is used up;
        // a retry cannot succeed before the monthly reset)
        if (
          ((status === 429 && !isQuotaExceeded(error)) || (status !== undefined && status >= 500)) &&
          retryCount < this.maxRetries
        ) {
          configAny.__retryCount = retryCount + 1;

          const delay = this.getRetryDelay(error, retryCount);
          await new Promise((resolve) => setTimeout(resolve, delay));

          return this.http.request(config);
        }

        throw this.toSdkError(error);
      },
    );
  }

  private getRetryDelay(error: AxiosError, retryCount: number): number {
    // Use Retry-After header if available
    const retryAfter = error.response?.headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }

    // Exponential backoff: 1s, 2s, 4s, ...
    return Math.min(1000 * Math.pow(2, retryCount), 30_000);
  }

  private toSdkError(error: AxiosError): CryptaScreenError {
    const status = error.response?.status;
    const body = error.response?.data as Record<string, unknown> | undefined;
    const requestId = (error.response?.headers?.["x-request-id"] as string) ?? undefined;
    const message = (body?.message as string) ?? error.message;

    switch (status) {
      case 401:
        return new AuthenticationError(message, requestId);

      case 404:
        return new NotFoundError(
          (body?.resource as string) ?? "Resource",
          (body?.id as string) ?? "",
          requestId,
        );

      case 400: {
        const fieldErrors: Record<string, string[]> = {
          ...((body?.fieldErrors as Record<string, string[]>) ?? {}),
        };
        // Backend error shape: { error, code, field, message, items? }
        const field = body?.field as string | undefined;
        if (field) fieldErrors[field] = [...(fieldErrors[field] ?? []), message];
        const items = (body?.items as ValidationItem[] | undefined) ?? [];
        for (const it of items) {
          const key = `${it.field}[${it.index}]`;
          fieldErrors[key] = [...(fieldErrors[key] ?? []), it.message];
        }
        return new ValidationError(message, fieldErrors, requestId, body?.code as string | undefined, items);
      }

      case 403: {
        const code = (body?.error as string | undefined) ?? (body?.code as string | undefined);
        if (code && (PLAN_LIMIT_CODES as readonly string[]).includes(code)) {
          const used = body?.used as number | undefined;
          const limit = body?.limit as number | undefined;
          const plan = body?.plan as string | undefined;
          if (code === "SEAT_LIMIT_REACHED") return new SeatLimitReachedError(message, requestId, used, limit, plan);
          if (code === "API_KEY_LIMIT_REACHED") return new ApiKeyLimitReachedError(message, requestId, used, limit, plan);
          return new PlanLimitError(message, code, requestId, used, limit, plan);
        }
        return new CryptaScreenError(message, 403, (body?.code as string) ?? (body?.error as string) ?? "FORBIDDEN", requestId, body);
      }

      case 402:
        if (body?.code === "SERVICE_PAUSED" || body?.error === "service_paused") {
          return new ServicePausedError(
            message,
            requestId,
            body?.subscriptionStatus as string | undefined,
            body?.billing_url as string | undefined,
            body?.reason as string | undefined,
          );
        }
        return new CryptaScreenError(message, 402, (body?.code as string) ?? "PAYMENT_REQUIRED", requestId, body);

      case 429: {
        if (isQuotaExceeded(error)) {
          return new QuotaExceededError(
            message,
            requestId,
            body?.resets_at as string | undefined,
            body?.upgrade_url as string | undefined,
          );
        }
        const retryAfter = error.response?.headers?.["retry-after"];
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60_000;
        const resetAt = new Date(Date.now() + retryAfterMs);
        return new RateLimitError(resetAt, retryAfterMs, requestId);
      }

      default:
        return new CryptaScreenError(
          message,
          status ?? 0,
          (body?.code as string) ?? "UNKNOWN_ERROR",
          requestId,
          body,
        );
    }
  }
}
