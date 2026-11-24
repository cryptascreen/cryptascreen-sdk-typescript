# @cryptascreen/sdk

Type-safe TypeScript client for the CryptaScreen REST API.

REST API (API key or browser session) and a TypeScript SDK (pre-release).

## Installation

Supported Node.js versions: 20 and 22 (the versions CI tests).

Pre-release: install from the repository. Set `baseUrl` to the authorised test environment you were given.

## Quick Start

```typescript
import { CryptaScreenClient } from "@cryptascreen/sdk";

// A synthetic, syntactically valid test address (never a real customer or mainnet address in examples).
const SYNTHETIC_ADDRESS = "0x5eed000000000000000000000000000000c50101";

const client = new CryptaScreenClient({ apiKey: process.env.CRYPTASCREEN_API_KEY!, baseUrl: process.env.CRYPTASCREEN_BASE_URL! });
const result = await client.screening.screenAddress({ address: SYNTHETIC_ADDRESS, chain: "ethereum" });
console.log(result.riskLevel);       // "MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN"
console.log(result.riskScore);       // number, or null when UNKNOWN
console.log(result.sanctionsMatch);  // boolean
const bulk = await client.screening.screenBulk({ addresses: [A1, A2], chains: ["ethereum", "ethereum"] }); // ScreeningResponse[]
const job = await client.screening.screenBulkAsync({ addresses, chains });
const page = await client.screening.getJobResults(job.jobId, { page: 0, size: 100 });
```

The same request over plain HTTP (to be run against the authorised synthetic environment; the address is a placeholder
for a documented synthetic EIP-55 address):

```bash
curl -X POST "$CRYPTASCREEN_BASE_URL/api/v1/screen/address" \
  -H "X-API-Key: $CRYPTASCREEN_API_KEY" -H "Content-Type: application/json" \
  -d '{"address":"<synthetic EIP-55 address>","chain":"ethereum"}'
# → { "chain": "ethereum", "riskLevel": "...", "riskScore": <0-100 or null>, "sanctionsMatch": <bool>,
#     "assessmentStatus": "...", "layers": { ... }, "evaluationId": "..." }
```

## API Reference

### Screening

```typescript
client.screening.screenAddress({ address, chain, includeHeuristics?, forceRefresh?, mode? })
client.screening.screenBulk({ addresses, chains })                       // sync; addresses per request capped by your plan
client.screening.screenBulkAsync({ addresses, chains }, { idempotencyKey? }) // async job; addresses per job capped by your plan; Idempotency-Key always sent
client.screening.pollJob(jobId)                                           // status: PENDING|PROCESSING|COMPLETED|PARTIAL|FAILED|CANCELLED (+ cancelRequested)
client.screening.getJobResults(jobId, { page?, size? })                   // stored per-address items, 0-based pages
client.screening.cancelJob(jobId)
client.screening.listJobs()
client.screening.screenBulkAndWait(request, pollIntervalMs?, timeoutMs?, { idempotencyKey? })
client.screening.getHistory(chain, address)                               // last stored result
client.screening.listEvaluations(chain, address, { page?, size? })        // append-only evaluation history (newest first)
client.screening.getEvaluation(evaluationId)                              // ScreeningResponse.evaluationId
```

`riskScore` is `null` whenever `riskLevel` is `UNKNOWN` (chain not analyzed, or the mandatory sanctions layer
incomplete) — never treat it as 0. Every response carries `evidenceVersion` + `validity` (which data produced it and
how old it is) and `evaluationId` (the append-only record). Unknown status values must be treated as not complete.

Every result lists each layer (sanctions, threat intelligence, entity attribution, on-chain analysis) and whether it was complete, partial, unavailable or not configured. If a required layer was not checked, the result is UNKNOWN with no score, never a clean verdict. 'No match' means no match in the layers listed as checked.

`chain` is required on every screening call, single and bulk (`chains`, one per address). An address does not identify its network, so there is no default: a missing or empty chain is rejected with `400` `CHAIN_REQUIRED` (`ValidationError.validationCode`).

Addresses are validated for the stated network. Malformed addresses, bad checksums and unknown networks are rejected and not counted against your quota.

Bulk and asynchronous job sizes are capped per plan (see your plan in the app). Resubmitting with the same Idempotency-Key does not create or bill a second job.

### Sanctions

```typescript
client.sanctions.check({ address, chain })
client.sanctions.getStatus(address, chain)
```

### Name screening

Sanctions screening of a person, company, vessel or aircraft. Sanctions only: no PEP, adverse media or identity-document checks. One name screen counts as one screening on your plan.

```typescript
const r = await client.names.screen(
  { name: "Example Trading LLC", type: "ENTITY", country: "AE", aliases: ["Example Trade"],
    identifiers: [{ type: "REGISTRATION_NUMBER", value: "12345" }] },
  { idempotencyKey: "order-2041" },                    // optional; the same key returns the stored result
);
r.outcome;             // "CLEAR" | "REVIEW" | "CONFIRMED_MATCH" - treat any value you do not know as REVIEW
r.listMatch;           // "ALLOW_LIST" | "BLOCK_LIST" | null (a tenant list decided before fuzzy matching)
r.hits[0].reasons;     // per field: MATCH | PARTIAL | CONTRADICTS | ABSENT, with points
await client.names.decide({ hitId: r.hits[0].hitId, value: "FALSE_POSITIVE", reason: "different date of birth" });
await client.names.get(r.screeningId);
await client.names.history(50);
await client.names.decisionAudit("json");              // or "csv"
isNameClear(r);                                        // true only for CLEAR
```

- A hit lists the listed entry, the score, its matched and conflicting fields and the lists and rules version used. A decision (`TRUE_MATCH` or `FALSE_POSITIVE`) is remembered for that subject and listed entry until the listed entry changes.
- If the lists cannot be read, the call fails with an error; it never returns `CLEAR`.
- Bulk: `BulkScreeningRequest.names` adds name rows to the bulk flow, with the same limits and metering as address rows.
- `request.monitor: true` also saves the subject to the monitored list (plan-limited; see Monitoring below).
- HTTP: `POST /api/v1/screen/name`, `GET /api/v1/screen/name/{id}`, `GET /api/v1/screen/name/history`, `POST /api/v1/screen/name/decisions`, `GET /api/v1/screen/name/decisions/audit`.

### Wallet sections and exposure by category

For an address you have screened, the wallet sections give counterparties, transactions and exposure paths.

```typescript
await client.screening.getCounterparties("ethereum-classic", address, { page: 0, size: 50 });
await client.screening.getTransactions("ethereum-classic", address);
const paths = await client.screening.getExposurePaths("ethereum-classic", address);
const exposure = paths.categoryExposure;               // null on older servers
exposure?.received?.categories[0].direct;              // WalletCategoryPart
categoryShareLabel(exposure!.received!.anyDirect);     // "n/a" | "≥ 5.0%" | "5.0%"
```

- Value received and value sent are broken down by CryptaScreen's own categories: `SANCTIONS`, `STATE_LINKED_THEFT`, `HACK`, `SCAM`, `RANSOMWARE`, `SANCTIONS_EVASION`, `ISSUER_FROZEN`, `OTHER_LISTED`. No third-party labels are used.
- Each category has a `direct` part (the counterparty is itself listed) and an `indirect` part (reached through a path of at least two transfers, or through a derived-evidence source such as stolen-funds tracing).
- Categories can overlap (a transfer on a path counts in full for every category it reaches), so they do not add up. `anyDirect` and `anyIndirect` count each transfer once.
- Every part has a `state`: `COMPLETE`, `PARTIAL`, `TRUNCATED` or `NOT_ANALYZED`. `PARTIAL` and `TRUNCATED` figures are lower bounds. `NOT_ANALYZED` has null numbers: never read null as 0%. A part with a `reasonCode` (for example `CHAIN_FLAG_OFF`) tells you why.
- Transfers without a USD price are never counted as 0 USD; they appear per asset in `byAsset` (own units, never mixed across assets).
- `derivedSources` lists the derived-evidence sources feeding the indirect part and their state.
- `GET /api/v1/capabilities` lists the chains the API accepts and the live state of each layer. A chain or layer that is not analysed is reported as such, never as clean.

### Protocol income and row kinds

Native transfers can be protocol income (block or uncle reward, miner fee, withdrawal, genesis allocation, irregular state) rather than a transfer between two parties.

- `WalletTransaction.protocolIncome` (boolean, absent on older servers: read as false): true for protocol income. Such a row has no counterparty and is never counted as exposure.
- `WalletTransaction.kind`: `EXTERNAL`, `INTERNAL`, `BLOCK_REWARD`, `UNCLE_REWARD`, `MINER_FEE`, `WITHDRAWAL`, `GENESIS_ALLOC`, `IRREGULAR_STATE`, `GAS_FEE` or `UNKNOWN`; null when the data provider does not state one. Treat a value you do not know as "not a transfer between parties".
- `WalletTransaction.tokenId`: the ERC-1155 token id of an NFT transfer (`category` is `token`, `amount` is units of that id); otherwise null.
- `WalletCategoryFlow.protocolIncome` (RECEIVED flow only; null for SENT): protocol income as its own line. It is part of the received total, so it dilutes every share, but it belongs to no category. Its `state` is the coverage of the read that produced it (`PARTIAL` while the miner-kinds feed is not confirmed for the chain).

### Vendor layers (your own Chainalysis or Elliptic key)

If you store your own Chainalysis or Elliptic key in the app (paid plans), each enabled vendor's own rating of the address is returned as a separate, attributed layer.

```typescript
const result = await client.screening.screenAddress({ address, chain: "ethereum-classic" });
for (const layer of result.vendorLayers ?? []) {
  layer.vendor;       // "CHAINALYSIS" | "ELLIPTIC"
  layer.status;       // "OK" | "TIMEOUT" | "SKIPPED_CAP" | "SKIPPED_BREAKER" | "AUTH_FAILED" | "RATE_LIMITED" | "UNAVAILABLE" | "NOT_FOUND" | "UNSUPPORTED_CHAIN" | "UNEXPECTED_RESPONSE"
  layer.rating;       // the vendor's own rating, verbatim; not on the 0-100 scale; null when none
  layer.attribution;  // "Result from <vendor> using your own <vendor> credentials. Not part of the CryptaScreen risk score."
}
```

- A vendor layer is never part of `riskScore`, `riskLevel`, `disposition` or `flags`. A vendor that is down, slow or over its daily cap only changes that layer's `status`.
- `vendorLayers` is absent or empty when you have no vendor key.
- Keys are managed with `/api/v1/settings/vendor-keys` (changed in the app). A key is never returned; reads show only the last four characters and a fingerprint.

### Account, capabilities, settings and monitoring

These calls accept an API key. Plans without a feature get 403 `feature_not_in_plan`.

```typescript
await client.auth.me();                       // the calling identity (authMethod "API_KEY")
await client.capabilities.get();              // chains the API accepts + live layer state

// Settings: read-only with an API key
await client.settings.getScoreThresholds();   // review / block thresholds (defaults 40 / 70)
await client.settings.getScoreThresholdAudit(limit?);
await client.settings.getNameMatching();      // CONSERVATIVE | BALANCED | STRICT (default CONSERVATIVE)
await client.settings.getNameMatchingAudit(limit?);
await client.settings.getNameLists();         // allow / block entries (exact identifiers, applied before fuzzy matching)
await client.settings.getNameListAudit(limit?);
await client.settings.listVendorKeys();       // configured state, last four characters and fingerprint; never a key

// Monitoring
await client.monitoring.getOverview();        // names and wallets with the last hits
await client.monitoring.listWallets();
await client.monitoring.addWallet({ address, chain, label? });
await client.monitoring.removeWallet(id);
await client.monitoring.listNames();
await client.monitoring.addName({ name, type?, dateOfBirth?, country? });
await client.monitoring.removeName(id);
await client.monitoring.listBreaches();
await client.monitoring.getBreachSummary();
await client.monitoring.acknowledgeBreach(id);
```

- Changing thresholds, name matching, the allow and block lists or a vendor key needs a signed-in tenant administrator in the app; an API key gets 403 and the SDK does not wrap those calls.
- Monitored names and wallets share one list and count against your plan's monitored-wallet limit. A new or changed hit after a list change raises an alert or case; an unchanged hit does not.

### Graph Analysis

```typescript
client.graph.buildGraph({ address, chain, depth?, minValue?, startDate?, endDate? })
client.graph.exportGraph(address, chain, format?)
client.graph.trace({ sourceAddress, targetAddress, chain, maxHops?, minValue? })
```

### Investigation Cases

```typescript
client.cases.create({ title, description?, priority?, assigneeId?, addresses })
client.cases.list({ status?, priority?, page?, pageSize? })
client.cases.get(caseId)
client.cases.updateStatus(caseId, { status, reason? })
client.cases.addNote(caseId, { content })
client.cases.addEvidence(caseId, { type, label, url?, metadata? })
client.cases.escalate(caseId, { reason, assigneeId? })
```

### Compliance

```typescript
client.compliance.checkTravelRule({ chain, fromAddress, toAddress, transferAmountUsd, txHash? }) // threshold logic is not validated
client.compliance.buildTravelRulePayload({ chain, originatorWalletAddress, transferAmountUsd, ... }) // draft, not transmitted
client.compliance.identifyVasp(chain, address)
client.compliance.generateDac8Report({ taxYear, jurisdiction, operator, users }) // @deprecated: output is an unvalidated draft, not a filing
```

`mica_registered` comes from an internal seed table, not from an official register. Do not rely on it.

### Intelligence

```typescript
client.intelligence.getEntityLabels(chain, address)   // all attributions (empty = no label known, not a clean verdict)
client.intelligence.getEntityLabel(address, chain)    // @deprecated: first label or null
// getVaspInfo was removed from the API surface (not served by the API); it throws ENDPOINT_NOT_AVAILABLE
```

### Webhooks

Webhook endpoints are registered, tested and deleted by a signed-in user in the app (an API key gets 403 `SESSION_REQUIRED`); the signing secret is shown once, at registration. With an API key the SDK reads:

```typescript
client.webhooks.list()                     // your endpoints (the secret is only a hint)
client.webhooks.getDeliveries(webhookId)   // the last 50 deliveries of an endpoint, newest first
```

Webhook events: SANCTIONS_MATCH, CRITICAL, HIGH_RISK, HEURISTICS_COMPLETE, TEST.

#### Verifying a delivery

Every delivery is signed. Verify the **raw** request body (not re-serialised JSON) before you trust it:

```typescript
import { constructWebhookEvent, WebhookSignatureError } from "@cryptascreen/sdk";

// Express: use express.raw({ type: "application/json" }) so req.body is the raw Buffer
app.post("/cryptascreen", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const event = constructWebhookEvent(process.env.CRYPTASCREEN_WEBHOOK_SECRET!, req.body, req.headers);
    // event = { id, type, createdAt, source, data }; de-duplicate on event.id (retries re-send the same id)
    res.sendStatus(204);
  } catch (e) {
    if (e instanceof WebhookSignatureError) return res.sendStatus(400); // e.code says why
    throw e;
  }
});
```

- Header `X-CryptaScreen-Signature-V2: t=<unix>,v1=<hex>` = HMAC-SHA256 of `"<t>." + body` with your secret. The timestamp must be within 300 seconds of now (`tolerance`, both directions); several `v1=` values are accepted, any one may match.
- The older header `X-CryptaScreen-Signature: sha256=<hex>` (no timestamp, cannot detect a replay) is refused unless you pass `allowLegacy: true`.
- `verifyWebhookSignature(secret, body, headers, { tolerance?, allowLegacy?, now? })` returns `true` or throws `WebhookSignatureError` with `code` `WEBHOOK_SIGNATURE_MALFORMED`, `WEBHOOK_SIGNATURE_MISMATCH`, `WEBHOOK_TIMESTAMP_OUT_OF_TOLERANCE` or `WEBHOOK_SIGNATURE_MISSING`. The Python and Java SDKs use the same algorithm and the same test vectors.

## Error Handling

```typescript
import {
  CryptaScreenError,
  AuthenticationError,
  RateLimitError,
  QuotaExceededError,
  ServicePausedError,
  NotFoundError,
  ValidationError,
} from "@cryptascreen/sdk";

try {
  await client.screening.screenAddress({ address: "0x...", chain: "ethereum" });
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // The plan's monthly screenings are used up (429 quota_exceeded). Not retried; clears at error.resetsAt.
    console.log(`Monthly quota used up; resets ${error.resetsAt}`);
  } else if (error instanceof ServicePausedError) {
    // A payment is overdue (402 SERVICE_PAUSED). The plan is unchanged; screening resumes once the invoice is paid.
    console.log(`Screening paused (${error.subscriptionStatus})`);
  } else if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after: ${error.resetAt}`);
  } else if (error instanceof AuthenticationError) {
    console.log("Invalid API key");
  } else if (error instanceof ValidationError) {
    console.log("Validation errors:", error.fieldErrors);
  } else if (error instanceof CryptaScreenError) {
    console.log(`API error ${error.status}: ${error.message}`);
  }
}
```

## Configuration

```typescript
const client = new CryptaScreenClient({
  apiKey: "csk_live_...",        // Required
  baseUrl: "https://...",        // Set it to the authorised test environment you were given
  timeout: 30000,                // Default: 30s
  retries: 3,                    // Default: 3 (retries on 429/5xx with exponential backoff)
});
```

## Support

Support: in-app.

## License

MIT
