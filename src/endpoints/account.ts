// Copyright (c) 2024-2026 CryptaCount, Inc.
// SPDX-License-Identifier: MIT
import type { AxiosInstance } from "axios";
import type { AuthMe, Capabilities } from "../types/account.js";

export class AuthEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** The calling identity. With an API key this is the key's tenant owner (`authMethod: "API_KEY"`). */
  async me(): Promise<AuthMe> {
    const { data } = await this.http.get<AuthMe>("/api/v1/auth/me");
    return data;
  }
}

export class CapabilitiesEndpoints {
  constructor(private readonly http: AxiosInstance) {}

  /** Chains the screening API accepts (with on-chain COVERED / UNAVAILABLE) and the live layer state (ON / OFF). */
  async get(): Promise<Capabilities> {
    const { data } = await this.http.get<Capabilities>("/api/v1/capabilities");
    return data;
  }
}
