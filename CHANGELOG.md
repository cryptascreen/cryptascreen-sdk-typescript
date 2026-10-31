# Changelog

## 0.2.0 — unreleased (API contract alignment; not published)

Aligns the SDK with the CryptaScreen backend controllers and `openapi-customer.json`. Every SDK method is now checked
against a scanned backend route table (`tests/path-table.test.ts`, fixture `tests/fixtures/backend-routes.json`).

### Added
- `QuotaExceededError` (429 `quota_exceeded`: the plan's monthly screenings are used up, with `resetsAt` /
  `upgradeUrl`) and `ServicePausedError` (402 `SERVICE_PAUSED`: payment overdue, plan unchanged). Neither is retried —
  a plain 429 rate limit is still retried and still a `RateLimitError`. No billing/usage methods: the backend has no
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
  are new in the matching backend release.
- `screenBulkAsync(request, { idempotencyKey })`: an `Idempotency-Key` header is always sent (generated when not
  supplied), so the SDK's own 429/5xx retries reuse the same key. `screenBulkAndWait` accepts the same option and also
  stops on `CANCELLED`.
- Graph: `GraphStats.status` / `statusReasons` / `nodeCap`, `GraphResponse.scope: GraphScope`, node/edge `hop`
  and `scopeStatus`, `GraphRequest.timeOrdered`, helper `isGraphComplete`.
- `intelligence.getEntityLabels(chain, address)` → `GET /api/v1/intelligence/entity/{chain}/{address}` (array).

### Changed (breaking for 0.1.x callers of routes that never existed on the backend)
- `GraphNode.riskScore` is `number | null` (null = not screened / UNKNOWN, never 0).
- `compliance.identifyVasp(chain, address)` → `GET /api/v1/compliance/travel-rule/vasp/identify/{chain}/{address}`
  (was `POST /api/v1/compliance/vasp/identify` with a name/LEI body — no backend route). `VaspIdentification` now has
  the served keys `identified`, `vasp_name`, `jurisdiction`, `mica_registered`, `travel_rule_protocol`.
  `VaspLookupRequest` removed. `mica_registered` comes from an internal seed table, not from an official register. Do
  not rely on it.
- Travel Rule request/response types match the backend DTOs (`TravelRuleCheckRequest {txHash?, chain, fromAddress,
  toAddress, transferAmountUsd}`, new `TravelRulePayloadRequest`, `TravelRuleCheckResult`, `TravelRulePayload`).
- `intelligence.getEntityLabel(address, chain)` now reads `/intelligence/entity/{chain}/{address}` and returns the
  first label or `null` (was the unmapped `/intelligence/label/{chain}/{address}`); `EntityLabel` matches the backend
  entity. Deprecated in favour of `getEntityLabels`.
- `cases.updateStatus` uses `PUT /api/v1/cases/{ref}/status` (was `PATCH`, which the backend does not map).

### Documentation
- README Quick Start replaced: current types (`sanctionsMatch`, `riskLevel` incl. `MINIMAL`/`UNKNOWN`, nullable
  `riskScore`), `screenBulk({ addresses, chains })` returning `ScreeningResponse[]`, async jobs read through
  `getJobResults`; a synthetic example address instead of a real mainnet address.
- Installation: pre-release, install from the repository; `baseUrl` must be set to the authorised test environment (the
  README no longer states a public default host or an npm install).
- Added the per-layer result statement, the omitted-`chain` default, address validation, plan-capped bulk/job sizes
  and Idempotency-Key, the Travel Rule threshold note, the `mica_registered` caveat, the webhook event list and the
  support contact (in-app or support@cryptacount.com).

### Deprecated
- `compliance.generateDac8Report`: DAC8 reporting is deferred; output is an unvalidated draft, not a filing. The
  request type now matches the backend (`taxYear`, `jurisdiction`, `operator`, `users`); the 0.1.x shape is rejected
  client-side with `ValidationError` (`validationCode: "DAC8_REQUEST_SHAPE"`) instead of a server 400.
- `intelligence.getVaspInfo`: no backend route; throws `CryptaScreenError` (`code: "ENDPOINT_NOT_AVAILABLE"`)
  without making a request.

## 0.1.1
- See git history.
