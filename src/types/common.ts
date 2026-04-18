export interface CryptaScreenConfig {
  /** Base URL of the CryptaScreen API. Defaults to "https://api.cryptascreen.com" */
  baseUrl?: string;
  /** API key for authentication (csk_...) */
  apiKey: string;
  /** Request timeout in milliseconds. Defaults to 30000 */
  timeout?: number;
  /** Number of retries on 429/5xx errors. Defaults to 3 */
  retries?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId?: string;
}
