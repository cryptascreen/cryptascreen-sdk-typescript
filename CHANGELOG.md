# Changelog

## 0.3.2 - 2026-11-24

### Changed
- Package metadata: author and maintainer are CryptaCount, Inc. (the copyright and licence holder, as in LICENSE), with no e-mail address.
- Documentation: support is in-app; no e-mail address appears in the package.
- Build and test tooling: tsup 9, vitest 5; CI actions checkout 7 and setup-node 7. No code or API change; same behaviour as 0.3.1.

## 0.3.1 - 2026-11-24

### Fixed
- Documentation: reworded the `PlanLimitError` description. No code or API change; same behaviour as 0.3.0.

## 0.3.0 - 2026-11-23

### Changed (breaking)
- **BREAKING:** `chain` is now required on every screening call; the server returns 400 `CHAIN_REQUIRED` when it is missing. `screenAddress({ address, chain })` and `screenBulk` / `screenBulkAsync` / `screenBulkAndWait` (`chains`, one per address) must name the network; there is no default. The error surfaces as `ValidationError` with `validationCode === "CHAIN_REQUIRED"`.

### Added
- Webhook verification: `verifyWebhookSignature`, `constructWebhookEvent`, `computeWebhookSignature`, `WebhookSignatureError`. Checks `X-CryptaScreen-Signature-V2` (HMAC-SHA256 of `"<t>." + body`, constant-time compare, 300 s tolerance, key rotation); the legacy header only with `allowLegacy`. Same algorithm and shared test vectors as the Python and Java SDKs.
- `client.auth.me()`, `client.capabilities.get()`.
- `client.settings`: `getScoreThresholds`, `getScoreThresholdAudit`, `getNameMatching`, `getNameMatchingAudit`, `getNameLists`, `getNameListAudit`, `listVendorKeys` (read-only with an API key).
- `client.monitoring`: `listWallets`, `addWallet`, `removeWallet`, `listNames`, `addName`, `removeName`, `getOverview`, `listBreaches`, `getBreachSummary`, `acknowledgeBreach`.

### Removed (breaking)
- `webhooks.create`, `webhooks.delete`, `webhooks.test`: the API answers an API key `403 SESSION_REQUIRED` for them (registering, deleting and testing endpoints is done by a signed-in user in the app). `webhooks.list` and `webhooks.getDeliveries` stay.

### Changed (breaking types)
- Webhook types match the API: `WebhookEventType` is `SANCTIONS_MATCH | CRITICAL | HIGH_RISK | HEURISTICS_COMPLETE | TEST`; `WebhookConfig` (`id: number`, `isActive`, `description`, secret hint) and `WebhookDelivery` (`webhookConfigId`, `eventType`, `status`, `responseCode`, ...) are the shapes the API returns; `getDeliveries(webhookId)` returns the last 50 deliveries as an array and takes no paging parameters. `CreateWebhookRequest` and `WebhookTestResult` are gone with their methods.

### Tests
- The path table checks every SDK request against a minimal operations list (method and path of the customer API); a method without a matching operation fails the build.

## 0.2.3 — 2026-11-23

No API change.

### Security
- Runtime dependency `axios` raised to `^1.21.1`; it now resolves `follow-redirects` 1.16.3 (fixes a high-severity advisory in 1.16.1). Development tooling (test runner, bundler and their transitive packages) updated so that `npm audit` reports 0 vulnerabilities.

### Documentation
- Comments, README and CHANGELOG describe only the public customer API.

## 0.2.2 — 2026-11-22

### Added (types)
- `WalletTransaction.kind`, `tokenId`, `protocolIncome` and `WalletCategoryFlow.protocolIncome` (RECEIVED flow): protocol income (block or uncle reward, miner fee, withdrawal, genesis allocation, irregular state) is marked per row and shown as its own line outside every category; it is never exposure. Optional fields: absent on older servers.

### Documentation
- README: sections for name screening, wallet sections and exposure by category, protocol income and row kinds, vendor layers, and the REST-only endpoints (monitoring, name matching, allow and block lists, vendor keys).

## 0.2.1 — 2026-11-22

First npm release of the 0.2 line. Same API as 0.2.0; adds `repository`/`homepage`/`bugs` to package.json so npm can verify the
provenance attestation (0.2.0 was tagged on GitHub but never published to npm: the provenance check rejected an empty repository URL).

## 0.2.0 — 2026-11-22 (GitHub release only; not on npm, see 0.2.1) (API contract alignment)

Aligns the SDK with the CryptaScreen customer API. Every SDK method is checked against its expected request path
(`tests/path-table.test.ts`).

### Added (wallet rating phase 2: vendor layers)
- `ScreeningResponse.vendorLayers?: VendorLayer[] | null`: for a tenant that has stored its own Chainalysis or Elliptic key (paid plan), each
  enabled vendor's own rating of the address as a separate attributed layer (`vendor`, `status`, `fetchedAt`, `cached`, `rating`,
  `ratingScale`, `categories`, `reasons`, `attribution`). It is never part of `riskScore` / `riskLevel` /
  `disposition` / `flags`; a vendor that is down, slow or over its daily limit only changes that layer's `status`
  (`TIMEOUT`, `SKIPPED_CAP`, ...). Types only: the key-management endpoints (`/settings/vendor-keys`) are not wrapped by the SDK.

### Added (exposure by category)
- `WalletExposurePaths.categoryExposure` (`GET .../exposure-paths`): the share of the wallet's received and sent value by CryptaScreen's own categories (`SANCTIONS`, `STATE_LINKED_THEFT`, `HACK`, `SCAM`, `RANSOMWARE`, `SANCTIONS_EVASION`, `ISSUER_FROZEN`, `OTHER_LISTED`), each split into `direct` (the counterparty is itself listed) and `indirect` (reached through at least 2 transfers). A part with `state` `NOT_ANALYZED` has null numbers (not 0%; `ISSUER_FROZEN` is `NOT_ANALYZED` / `CHAIN_FLAG_OFF` until its chain feed is live); `TRUNCATED`/`PARTIAL` are lower bounds. Unpriced transfers appear in `byAsset` units, never as 0 USD. `categoryShareLabel(part)` renders `n/a`, `≥ x%` or `x%`.

### Added (wallet sections: transfer counts with a basis)
- `WalletSectionStatus.transferCount?: { value: number | null; basis: "EXACT" | "AT_LEAST" | "UPPER_BOUND" | "UNKNOWN" }`:
  the provider's count for the read behind a section. Only `EXACT` is a total (the last page of a finished read);
  `AT_LEAST` is a lower bound, `UPPER_BOUND` an upper bound, `UNKNOWN` has no number. Compare with `eventsRead`
  (transfers actually read) and show a TRUNCATED section as "at least N transfers analyzed". Additive: absent on older servers.

### Added (sanctions name screening)
- `names.screen(request, { idempotencyKey })` → `POST /api/v1/screen/name`: screen a person, company, vessel or aircraft
  against the sanctions lists (name, optional date of birth or year, nationalities, country, typed identifiers). The result
  has `outcome` (`CLEAR` | `REVIEW` | `CONFIRMED_MATCH`), per hit the listed entry, the score and `reasons` (`MATCH` |
  `PARTIAL` | `CONTRADICTS` | `ABSENT` with points), the lists and rules version used, and any remembered decision.
  A name screen counts as one screening on your plan. Sanctions only: no PEP, adverse media or ID document checks.
- `names.decide({ hitId, value, reason })` → `POST /api/v1/screen/name/decisions` (`TRUE_MATCH` | `FALSE_POSITIVE`,
  remembered until the listed entry changes), `names.get(id)`, `names.history(limit)`, `names.decisionAudit(format)`.
- `BulkScreeningRequest.names`: name rows in the bulk flow, same limits and metering as address rows.
- `isNameClear(result)`: true only for `CLEAR`.

### Added
- `QuotaExceededError` (429 `quota_exceeded`: the plan's monthly screenings are used up, with `resetsAt` /
  `upgradeUrl`) and `ServicePausedError` (402 `SERVICE_PAUSED`: payment overdue, plan unchanged). Neither is retried —
  a plain 429 rate limit is still retried and still a `RateLimitError`. No billing/usage methods: there is no
  API-key billing endpoint (`/api/v1/screen-billing/*` is cookie-session only).
- `ScreeningResponse.evaluationId`, `evidenceVersion` and `validity: ResultValidity` (versions, cache
  decision, result age, per-source age).
- `screening.getEvaluation(id)` → `GET /api/v1/screen/evaluations/{id}`;
  `screening.listEvaluations(chain, address, { page, size })` → `GET /api/v1/screen/address/{chain}/{address}/evaluations`;
  `screening.getHistory(chain, address)` → `GET /api/v1/screen/address/{chain}/{address}/history`.
  Types `ScreeningEvaluation`, `ScreeningEvaluationPage`.
- Async jobs: status enum adds `CANCELLED`; `ScreeningJob.errorCode`, `cancelRequested`, `resultsUrl`,
  `policyVersion`, `scoreVersion`; `isTerminalJobStatus`, `TERMINAL_JOB_STATUSES`;
  `screening.getJobResults(jobId, { page, size })` → `GET /api/v1/screen/jobs/{id}/results?page=&size=` returning
  `ScreeningJobResultsPage {jobId, status, page, size, totalItems, totalPages, items: ScreeningJobItem[]}`;
  `screening.cancelJob(jobId)` → `POST /api/v1/screen/jobs/{id}/cancel` (202; 409 `JOB_ALREADY_TERMINAL`). Both routes
  are new in the matching API release.
- `screenBulkAsync(request, { idempotencyKey })`: an `Idempotency-Key` header is always sent (generated when not
  supplied), so the SDK's own 429/5xx retries reuse the same key. `screenBulkAndWait` accepts the same option and also
  stops on `CANCELLED`.
- Graph: `GraphStats.status` / `statusReasons` / `nodeCap`, `GraphResponse.scope: GraphScope`, node/edge `hop`
  and `scopeStatus`, `GraphRequest.timeOrdered`, helper `isGraphComplete`.
- `intelligence.getEntityLabels(chain, address)` → `GET /api/v1/intelligence/entity/{chain}/{address}` (array).

### Changed (breaking for 0.1.x callers of routes the API never served)
- `GraphNode.riskScore` is `number | null` (null = not screened / UNKNOWN, never 0).
- `compliance.identifyVasp(chain, address)` → `GET /api/v1/compliance/travel-rule/vasp/identify/{chain}/{address}`
  (was `POST /api/v1/compliance/vasp/identify` with a name/LEI body — not served by the API). `VaspIdentification` now has
  the served keys `identified`, `vasp_name`, `jurisdiction`, `mica_registered`, `travel_rule_protocol`.
  `VaspLookupRequest` removed. `mica_registered` comes from an internal seed table, not from an official register. Do
  not rely on it.
- Travel Rule request/response types match the API (`TravelRuleCheckRequest {txHash?, chain, fromAddress,
  toAddress, transferAmountUsd}`, new `TravelRulePayloadRequest`, `TravelRuleCheckResult`, `TravelRulePayload`).
- `intelligence.getEntityLabel(address, chain)` now reads `/intelligence/entity/{chain}/{address}` and returns the
  first label or `null` (was the unmapped `/intelligence/label/{chain}/{address}`); `EntityLabel` matches the served entity. Deprecated in favour of `getEntityLabels`.
- `cases.updateStatus` uses `PUT /api/v1/cases/{ref}/status` (was `PATCH`, which the API does not accept).

### Documentation
- README Quick Start replaced: current types (`sanctionsMatch`, `riskLevel` incl. `MINIMAL`/`UNKNOWN`, nullable
  `riskScore`), `screenBulk({ addresses, chains })` returning `ScreeningResponse[]`, async jobs read through
  `getJobResults`; a synthetic example address instead of a real mainnet address.
- Installation: pre-release, install from the repository; `baseUrl` must be set to the authorised test environment (the
  README no longer states a public default host or an npm install).
- Added the per-layer result statement, the omitted-`chain` default, address validation, plan-capped bulk/job sizes
  and Idempotency-Key, the Travel Rule threshold note, the `mica_registered` caveat, the webhook event list and the
  support contact (in-app).

### Deprecated
- `compliance.generateDac8Report`: output is an unvalidated draft, not a filing. The
  request type now matches the API (`taxYear`, `jurisdiction`, `operator`, `users`); the 0.1.x shape is rejected
  client-side with `ValidationError` (`validationCode: "DAC8_REQUEST_SHAPE"`) instead of a server 400.
- `intelligence.getVaspInfo`: not served by the API; throws `CryptaScreenError` (`code: "ENDPOINT_NOT_AVAILABLE"`)
  without making a request.

## 0.1.1
- See git history.
