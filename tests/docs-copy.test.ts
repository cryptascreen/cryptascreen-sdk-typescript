/**
 * Copy guard for everything a customer of the SDK can read (review finding F-09: the previous guard only matched
 * upper-case OWNER/TODO on README/CHANGELOG, so "CS-10 owner ruling" passed).
 *
 * Scanned surfaces (SCANNED below):
 * - README.md (ships in the npm tarball) and CHANGELOG.md (repository-facing, customer-read);
 * - every file under src/ — package.json "files" is ["dist"], and tsup emits the JSDoc into dist/*.d.ts and the full
 *   source text into dist/*.map `sourcesContent`, so source comments are published documentation. The first test
 *   fails if "files" or the tsup entry changes, so any new published surface is added here deliberately.
 *
 * Rules — one shared list each, mirroring the app claims guard (cryptascreen-app tests/claimsGuard.test.ts) and the
 * landing claims scripts (cryptascreen-landing scripts/lib/*Claims.mjs):
 * - FORBIDDEN_CLAIMS: no "Unlimited", no SLA / service-level promise, no "free forever";
 * - INTERNAL_LABELS: no planning/review vocabulary — task ids (CS-xx), OWNER, rulings, programme/lane/wave names,
 *   approval markers, review/claim/gap ids, dated ruling ids, placeholder markers;
 * - ALLOWED_CONTACT: the only e-mail address is support@cryptacount.com.
 * Job-status enum values (`PENDING|PROCESSING`, "a PENDING/PROCESSING job") are product vocabulary and stay allowed;
 * PENDING is an internal label only as an approval marker ("PENDING OWNER", "[PENDING", "PENDING:").
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(__dirname, "..");
const read = (f: string) => readFileSync(resolve(ROOT, f), "utf8");
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [relative(ROOT, p).split(sep).join("/")];
  });

/** Forbidden customer claims. */
const FORBIDDEN_CLAIMS: Array<[string, RegExp]> = [
  ["Unlimited", /\bunlimited\b/i],
  ["SLA", /\bSLAs?\b|service[- ]level/i],
  ["free forever", /free\s+forever|\bforever\b/i],
];

/** Internal labels that must never reach customer-readable text (shared by every scanned surface). */
const INTERNAL_LABELS: Array<[string, RegExp]> = [
  ["OWNER label", /\bOWNER\b/],
  ["owner ruling / ruling", /\bowner\s+(?:ruling|decision|approval|sign-?off)\b|\brulings?\b/i],
  ["task id (CS-xx)", /\bCS-\d{1,3}[A-Z]?\b/i],
  ["programme / lane / wave", /\bT7\b|\b[TW]\d{1,2}[-/][a-z]|\b(?:lane|wave)s?\b/i],
  ["approval marker", /APPROVAL\s+NEEDED|NEEDS\s+APPROVAL|\bPENDING\s+(?:OWNER|APPROVAL|DECISION|RULING|REVIEW|SIGN-?OFF)\b|\[PENDING\b|\bPENDING:/i],
  ["review / claim / gap id", /\bPart\s+[A-E]\b|\b[AB]\d{2,3}\b|\b[CFK]-\d{2,3}\b|\bgap\s+rows?\b/],
  ["dated ruling id", /\b20\d\d-\d\d-\d\d[a-z]\b/],
  ["placeholder marker", /\b(?:TODO|TBD|FIXME|XXX|PLACEHOLDER|REPLACE_ME|WIP)\b|price_REPLACE|\[HELD/],
];

const ALLOWED_CONTACT = "support@cryptacount.com";

const SCANNED = ["README.md", "CHANGELOG.md", ...walk(resolve(ROOT, "src"))];
const TEXT: Record<string, string> = Object.fromEntries(SCANNED.map((f) => [f, read(f)]));

/** "file:line: text" for every line of every scanned surface that matches. */
const hits = (re: RegExp) =>
  SCANNED.flatMap((f) =>
    TEXT[f].split(/\r?\n/).flatMap((line, i) => (re.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
  );

describe("SDK docs copy guard", () => {
  it('scans every published surface: package.json "files" is ["dist"], built from src/', () => {
    expect(JSON.parse(read("package.json")).files).toEqual(["dist"]);
    expect(read("tsup.config.ts")).toMatch(/entry:\s*\["src\/index\.ts"\]/);
    expect(SCANNED).toEqual(expect.arrayContaining(["README.md", "CHANGELOG.md", "src/index.ts", "src/client.ts"]));
  });

  it.each(FORBIDDEN_CLAIMS)("no forbidden claim: %s", (_label, re) => {
    expect(hits(re)).toEqual([]);
  });

  it.each(INTERNAL_LABELS)("no internal label: %s", (_label, re) => {
    expect(hits(re)).toEqual([]);
  });

  it(`the only contact address is ${ALLOWED_CONTACT}`, () => {
    const addrs = SCANNED.flatMap((f) =>
      [...TEXT[f].matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => [f, m[0]] as const),
    );
    expect(addrs.filter(([, a]) => a !== ALLOWED_CONTACT && !a.startsWith("@cryptascreen/"))).toEqual([]);
  });

  it("the internal-label list catches the known leak forms and spares product vocabulary (self-check)", () => {
    const leaky = ["CS-10 owner ruling", "OWNER", "cs-08B", "ruling 2026-10-31n", "T7", "w5-sdk", "lane B", "wave 14",
      "APPROVAL NEEDED", "PENDING OWNER", "[PENDING]", "B59", "C-137", "F-09", "Part A", "TODO"];
    for (const s of leaky) expect(INTERNAL_LABELS.some(([, re]) => re.test(s)), s).toBe(true);
    const fine = ["status: PENDING|PROCESSING|COMPLETED", "a PENDING/PROCESSING job", "cs-policy-2026.10", "[A1, A2]",
      "0x5eed000000000000000000000000000000c50101", "Support: in-app or support@cryptacount.com.", "DAC8", "ERC-20"];
    for (const s of fine) expect(INTERNAL_LABELS.some(([, re]) => re.test(s)), s).toBe(false);
  });

  it("README: removed content stays removed (stale snippets, real mainnet address, public host/npm claims, stale enums)", () => {
    const r = TEXT["README.md"];
    expect(r).not.toContain("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"); // A45 (C-137)
    expect(r).not.toMatch(/result\.sanctioned\b|totalScreened|totalFlagged|job\.results/); // A44 (C-136)
    expect(r).not.toContain('// "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"'); // A5 (C-05)
    expect(r).not.toMatch(/npm install @cryptascreen\/sdk|Default: "https:\/\/api\.cryptascreen\.com"|\/\/ default/); // B56 (C-138)
    expect(r).not.toMatch(/max 1000|max 10000/); // B59 corrected: caps per plan, no hard-coded numbers
    expect(r).toContain("0x5eed000000000000000000000000000000c50101");
    expect(r).toContain('"MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN"');
    expect(r).toContain("Support: in-app or support@cryptacount.com.");
    expect(r).toContain("Webhook events: SANCTIONS_MATCH, CRITICAL, HIGH_RISK, HEURISTICS_COMPLETE, TEST.");
  });
});
