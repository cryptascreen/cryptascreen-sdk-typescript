# @cryptascreen/sdk

Type-safe TypeScript client for the CryptaScreen REST API.

## Installation

```bash
npm install @cryptascreen/sdk
```

## Quick Start

```typescript
import { CryptaScreenClient } from "@cryptascreen/sdk";

const client = new CryptaScreenClient({
  apiKey: "csk_live_your_api_key_here",
  // baseUrl: "https://api.cryptascreen.com", // default
});

// Screen a single address
const result = await client.screening.screenAddress({
  address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  chain: "ethereum",
});

console.log(result.riskLevel); // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
console.log(result.sanctioned); // false
console.log(result.flags); // []

// Bulk screening (sync)
const bulk = await client.screening.screenBulk({
  addresses: [
    { address: "0xaaa...", chain: "ethereum" },
    { address: "0xbbb...", chain: "ethereum" },
  ],
});
console.log(`Screened: ${bulk.totalScreened}, Flagged: ${bulk.totalFlagged}`);

// Bulk screening (async with polling)
const job = await client.screening.screenBulkAndWait({
  addresses: largeAddressList,
});
console.log(job.results);
```

## API Reference

### Screening

```typescript
client.screening.screenAddress({ address, chain, includeHeuristics?, forceRefresh?, mode? })
client.screening.screenBulk({ addresses, chains })                       // sync, max 1000
client.screening.screenBulkAsync({ addresses, chains }, { idempotencyKey? }) // async job, max 10000; Idempotency-Key always sent
client.screening.pollJob(jobId)                                           // status: PENDING|PROCESSING|COMPLETED|PARTIAL|FAILED|CANCELLING|CANCELLED
client.screening.getJobResults(jobId, { page?, size? })                   // per-address results, 0-based pages
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

### Sanctions

```typescript
client.sanctions.check({ address, chain })
client.sanctions.getStatus(address, chain)
```

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
client.compliance.checkTravelRule({ chain, fromAddress, toAddress, transferAmountUsd, txHash? })
client.compliance.buildTravelRulePayload({ chain, originatorWalletAddress, transferAmountUsd, ... }) // draft, not transmitted
client.compliance.identifyVasp(chain, address)
client.compliance.generateDac8Report({ taxYear, jurisdiction, operator, users }) // @deprecated: DAC8 is deferred, output is an unvalidated draft
```

### Intelligence

```typescript
client.intelligence.getEntityLabels(chain, address)   // all attributions (empty = no label known, not a clean verdict)
client.intelligence.getEntityLabel(address, chain)    // @deprecated: first label or null
// getVaspInfo was removed from the API surface (no backend route); it throws ENDPOINT_NOT_AVAILABLE
```

### Webhooks

```typescript
client.webhooks.create({ url, events, secret? })
client.webhooks.list()
client.webhooks.delete(webhookId)
client.webhooks.test(webhookId)
client.webhooks.getDeliveries(webhookId, { page?, pageSize? })
```

## Error Handling

```typescript
import {
  CryptaScreenError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from "@cryptascreen/sdk";

try {
  await client.screening.screenAddress({ address: "0x...", chain: "ethereum" });
} catch (error) {
  if (error instanceof RateLimitError) {
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
  baseUrl: "https://...",        // Default: "https://api.cryptascreen.com"
  timeout: 30000,                // Default: 30s
  retries: 3,                    // Default: 3 (retries on 429/5xx with exponential backoff)
});
```

## License

MIT
