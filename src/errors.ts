export class CryptaScreenError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "CryptaScreenError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

export class AuthenticationError extends CryptaScreenError {
  constructor(message = "Invalid or missing API key", requestId?: string) {
    super(message, 401, "AUTHENTICATION_ERROR", requestId);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends CryptaScreenError {
  public readonly resetAt: Date;
  public readonly retryAfterMs: number;

  constructor(
    resetAt: Date,
    retryAfterMs: number,
    requestId?: string,
  ) {
    super(
      `Rate limit exceeded. Resets at ${resetAt.toISOString()}`,
      429,
      "RATE_LIMIT_EXCEEDED",
      requestId,
    );
    this.name = "RateLimitError";
    this.resetAt = resetAt;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * 429 with `error: "quota_exceeded"`: the plan's monthly screenings are used up. NOT a rate limit — the SDK does not
 * retry it; it clears at `resetsAt` (first day of the next UTC month) or when the plan is upgraded.
 */
export class QuotaExceededError extends CryptaScreenError {
  public readonly resetsAt?: string;
  public readonly upgradeUrl?: string;

  constructor(message: string, requestId?: string, resetsAt?: string, upgradeUrl?: string) {
    super(message, 429, "QUOTA_EXCEEDED", requestId, { resetsAt, upgradeUrl });
    this.name = "QuotaExceededError";
    this.resetsAt = resetsAt;
    this.upgradeUrl = upgradeUrl;
  }
}

/**
 * 402 `SERVICE_PAUSED`: a payment is overdue (subscription past_due / unpaid). The plan is unchanged; screening
 * resumes when the invoice is paid. Not retried.
 */
export class ServicePausedError extends CryptaScreenError {
  public readonly subscriptionStatus?: string;
  public readonly billingUrl?: string;

  constructor(message: string, requestId?: string, subscriptionStatus?: string, billingUrl?: string) {
    super(message, 402, "SERVICE_PAUSED", requestId, { subscriptionStatus, billingUrl });
    this.name = "ServicePausedError";
    this.subscriptionStatus = subscriptionStatus;
    this.billingUrl = billingUrl;
  }
}

/**
 * w2-billing: 403 with a plan-limit code — an ADDITION beyond the plan's catalogue entitlement was refused (body
 * `{ error: CODE, message, used, limit, plan }`). Existing resources are never removed on a downgrade; only the next
 * addition is refused. Not retried. Codes reachable with an API key: MONITORED_WALLET_LIMIT_REACHED (add a monitored
 * wallet), BULK_LIMIT_REACHED (bulk larger than the plan allows), feature_not_in_plan; SEAT_LIMIT_REACHED (team
 * invite / SCIM) and API_KEY_LIMIT_REACHED (key creation) come from session/SCIM routes but share the type.
 */
export class PlanLimitError extends CryptaScreenError {
  public readonly limitCode: string;
  public readonly used?: number;
  public readonly limit?: number;
  public readonly plan?: string;

  constructor(message: string, limitCode: string, requestId?: string, used?: number, limit?: number, plan?: string) {
    super(message, 403, limitCode, requestId, { used, limit, plan });
    this.name = "PlanLimitError";
    this.limitCode = limitCode;
    this.used = used;
    this.limit = limit;
    this.plan = plan;
  }
}

/** 403 SEAT_LIMIT_REACHED: all user seats of the plan are taken (matrix M6). */
export class SeatLimitReachedError extends PlanLimitError {
  constructor(message: string, requestId?: string, used?: number, limit?: number, plan?: string) {
    super(message, "SEAT_LIMIT_REACHED", requestId, used, limit, plan);
    this.name = "SeatLimitReachedError";
  }
}

/** 403 API_KEY_LIMIT_REACHED: the plan's API-key count is reached (matrix M7). */
export class ApiKeyLimitReachedError extends PlanLimitError {
  constructor(message: string, requestId?: string, used?: number, limit?: number, plan?: string) {
    super(message, "API_KEY_LIMIT_REACHED", requestId, used, limit, plan);
    this.name = "ApiKeyLimitReachedError";
  }
}

export const PLAN_LIMIT_CODES = [
  "SEAT_LIMIT_REACHED",
  "API_KEY_LIMIT_REACHED",
  "MONITORED_WALLET_LIMIT_REACHED",
  "BULK_LIMIT_REACHED",
  "feature_not_in_plan",
] as const;

export class NotFoundError extends CryptaScreenError {
  constructor(resource: string, id: string, requestId?: string) {
    super(`${resource} not found: ${id}`, 404, "NOT_FOUND", requestId);
    this.name = "NotFoundError";
  }
}

export interface ValidationItem {
  index: number;
  field: string;
  code: string;
  message: string;
}

export class ValidationError extends CryptaScreenError {
  public readonly fieldErrors: Record<string, string[]>;
  /** CS-02 machine code, e.g. UNKNOWN_CHAIN, INVALID_ADDRESS_FORMAT, INVALID_CHECKSUM, INVALID_BULK_ITEMS. */
  public readonly validationCode?: string;
  /** CS-02 bulk: every invalid item (the whole request was rejected). */
  public readonly items: ValidationItem[];

  constructor(
    message: string,
    fieldErrors: Record<string, string[]> = {},
    requestId?: string,
    validationCode?: string,
    items: ValidationItem[] = [],
  ) {
    super(message, 400, "VALIDATION_ERROR", requestId, { fieldErrors, validationCode, items });
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
    this.validationCode = validationCode;
    this.items = items;
  }
}
