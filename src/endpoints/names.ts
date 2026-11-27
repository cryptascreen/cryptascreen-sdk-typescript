// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import type { AxiosInstance } from "axios";
import type {
  NameDecisionRequest,
  NameMatchDecision,
  NameScreenOptions,
  NameScreenRequest,
  NameScreenResponse,
  NameScreeningHistoryItem,
} from "../types/names.js";

const enc = encodeURIComponent;

/** Sanctions name screening. A name screen counts as one screening on your plan. */
export class NameEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Screen one name. An invalid request is a 400 (ValidationError) and is not counted. */
  async screen(request: NameScreenRequest, options: NameScreenOptions = {}): Promise<NameScreenResponse> {
    const { data } = await this.http.post<NameScreenResponse>(
      "/api/v1/screen/name",
      request,
      options.idempotencyKey ? { headers: { "Idempotency-Key": options.idempotencyKey } } : undefined,
    );
    return data;
  }

  /** A stored name screening of your account. */
  async get(screeningId: string): Promise<NameScreenResponse> {
    const { data } = await this.http.get<NameScreenResponse>(`/api/v1/screen/name/${enc(screeningId)}`);
    return data;
  }

  /** Recent name screenings, newest first. */
  async history(limit = 50): Promise<NameScreeningHistoryItem[]> {
    const { data } = await this.http.get<NameScreeningHistoryItem[]>("/api/v1/screen/name/history", { params: { limit } });
    return data;
  }

  /**
   * Decide a hit: TRUE_MATCH or FALSE_POSITIVE with a reason. The decision is remembered for this subject and this
   * listed entry and applied to later screenings until the listed entry changes.
   */
  async decide(request: NameDecisionRequest): Promise<NameMatchDecision> {
    const { data } = await this.http.post<NameMatchDecision>("/api/v1/screen/name/decisions", request);
    return data;
  }

  /** Decision audit (who, when, why) as JSON, or the same rows as CSV text. */
  async decisionAudit(format: "json" | "csv" = "json"): Promise<unknown> {
    const { data } = await this.http.get("/api/v1/screen/name/decisions/audit", { params: { format } });
    return data;
  }
}
