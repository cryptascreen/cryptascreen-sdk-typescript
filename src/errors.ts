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
