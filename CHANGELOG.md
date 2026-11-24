# Changelog

## 0.3.2 - 2026-11-24

Requires Node.js 20 or 22.

### Breaking changes
- `chain` is required on every screening call. `screenAddress({ address, chain })` and `screenBulk` / `screenBulkAsync` / `screenBulkAndWait` (`chains`, one per address) must name the network; there is no default. A missing value raises `ValidationError` with `validationCode === "CHAIN_REQUIRED"`.
- `webhooks.create`, `webhooks.delete` and `webhooks.test` are removed: registering, deleting and testing webhook endpoints is done in the CryptaScreen app. `webhooks.list` and `webhooks.getDeliveries` remain.
- Webhook types match the API: `WebhookEventType` is `SANCTIONS_MATCH | CRITICAL | HIGH_RISK | HEURISTICS_COMPLETE | TEST`; `getDeliveries(webhookId)` returns the last 50 deliveries as an array.
- `GraphNode.riskScore` is `number | null` (null means not screened).
- `compliance.identifyVasp(chain, address)` takes a chain and an address and returns `identified`, `vasp_name`, `jurisdiction`, `mica_registered` and `travel_rule_protocol`.
- `cases.updateStatus` uses `PUT`.

### Added
- Webhook verification: `verifyWebhookSignature`, `constructWebhookEvent`, `computeWebhookSignature` and `WebhookSignatureError` (HMAC-SHA256, constant-time compare, 300 s tolerance, key rotation).
- `client.auth.me()` and `client.capabilities.get()`.
- `client.settings` (read-only with an API key): score thresholds, name matching, name lists and their audit trails, configured vendor keys.
- `client.monitoring`: monitored wallets and names, overview, breaches, breach summary and acknowledgement.
- Name screening: `names.screen`, `names.decide`, `names.get`, `names.history`, `names.decisionAudit`, name rows in bulk screening, and `isNameClear(result)`.
- Exposure by category on wallet exposure paths (direct and indirect share per category), with `categoryShareLabel(part)`.
- Vendor layers on screening results for accounts that use their own Chainalysis or Elliptic key.
- Transfer counts with a basis (`EXACT`, `AT_LEAST`, `UPPER_BOUND`, `UNKNOWN`) on wallet sections.
- Protocol income and row kinds on wallet transactions.
- Evaluations and history: `screening.getEvaluation`, `screening.listEvaluations`, `screening.getHistory`; `evaluationId`, `evidenceVersion` and `validity` on results.
- Async jobs: `screening.getJobResults`, `screening.cancelJob`, the `CANCELLED` status, and an `Idempotency-Key` sent on every async bulk request.
- `QuotaExceededError` (monthly screenings used up) and `ServicePausedError` (payment overdue); neither is retried.
- Graph scope and completeness fields, and `intelligence.getEntityLabels(chain, address)`.

### Deprecated
- `intelligence.getEntityLabel`: use `getEntityLabels`.
- `compliance.generateDac8Report`: the output is a draft, not a filing.

### Fixed
- `axios` updated to `^1.21.1`.

## 0.1.0

Deprecated. Upgrade to 0.3.2.
