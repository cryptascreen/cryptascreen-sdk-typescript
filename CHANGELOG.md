# Changelog

## 0.2.0 — unreleased (CS-08 contract alignment; not published)

Aligns the SDK with the CryptaScreen backend controllers and `openapi-customer.json`. Every SDK method is now checked
against a scanned backend route table (`tests/path-table.test.ts`, fixture `tests/fixtures/backend-routes.json`).

### Added
- `ScreeningResponse.evaluationId` (CS-04), `evidenceVersion` and `validity: ResultValidity` (CS-03: versions, cache
  decision, result age, per-source age).
- `screening.getEvaluation(id)` → `GET /api/v1/screen/evaluations/{id}`;
  `screening.listEvaluations(chain, address, { page, size })` → `GET /api/v1/screen/address/{chain}/{address}/evaluations`;
  `screening.getHistory(chain, address)` → `GET /api/v1/screen/address/{chain}/{address}/history`.
  Types `ScreeningEvaluation`, `ScreeningEvaluationPage`.
- Async jobs: status enum adds `CANCELLING` / `CANCELLED`; `isTerminalJobStatus`, `TERMINAL_JOB_STATUSES`;
  `screening.getJobResults(jobId, { page, size })` → `GET /api/v1/screen/jobs/{id}/results?page=&size=`;
  `screening.cancelJob(jobId)` → `POST /api/v1/screen/jobs/{id}/cancel` (both added by the CS-08 backend half).
- `screenBulkAsync(request, { idempotencyKey })`: an `Idempotency-Key` header is always sent (generated when not
  supplied), so the SDK's own 429/5xx retries reuse the same key. `screenBulkAndWait` accepts the same option and also
  stops on `CANCELLED`.
- Graph (CS-05): `GraphStats.status` / `statusReasons` / `nodeCap`, `GraphResponse.scope: GraphScope`, node/edge `hop`
  and `scopeStatus`, `GraphRequest.timeOrdered`, helper `isGraphComplete`.
- `intelligence.getEntityLabels(chain, address)` → `GET /api/v1/intelligence/entity/{chain}/{address}` (array).

### Changed (breaking for 0.1.x callers of routes that never existed on the backend)
- `GraphNode.riskScore` is `number | null` (null = not screened / UNKNOWN, never 0).
- `compliance.identifyVasp(chain, address)` → `GET /api/v1/compliance/travel-rule/vasp/identify/{chain}/{address}`
  (was `POST /api/v1/compliance/vasp/identify` with a name/LEI body — no backend route). `VaspIdentification` now has
  the served keys `identified`, `vasp_name`, `jurisdiction`, `mica_registered`, `travel_rule_protocol`.
  `VaspLookupRequest` removed.
- Travel Rule request/response types match the backend DTOs (`TravelRuleCheckRequest {txHash?, chain, fromAddress,
  toAddress, transferAmountUsd}`, new `TravelRulePayloadRequest`, `TravelRuleCheckResult`, `TravelRulePayload`).
- `intelligence.getEntityLabel(address, chain)` now reads `/intelligence/entity/{chain}/{address}` and returns the
  first label or `null` (was the unmapped `/intelligence/label/{chain}/{address}`); `EntityLabel` matches the backend
  entity. Deprecated in favour of `getEntityLabels`.
- `cases.updateStatus` uses `PUT /api/v1/cases/{ref}/status` (was `PATCH`, which the backend does not map).

### Deprecated
- `compliance.generateDac8Report`: DAC8 is DEFERRED (CS-09); output is an unvalidated draft, not a filing. The
  request type now matches the backend (`taxYear`, `jurisdiction`, `operator`, `users`); the 0.1.x shape is rejected
  client-side with `ValidationError` (`validationCode: "DAC8_REQUEST_SHAPE"`) instead of a server 400.
- `intelligence.getVaspInfo`: no backend route; throws `CryptaScreenError` (`code: "ENDPOINT_NOT_AVAILABLE"`)
  without making a request.

## 0.1.1
- See git history.
