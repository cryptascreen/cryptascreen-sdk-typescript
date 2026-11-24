/**
 * Copy guard for everything a customer of the SDK can read.
 *
 * Scanned surfaces (SCANNED below):
 * - README.md (ships in the npm tarball) and CHANGELOG.md;
 * - every file under src/ — package.json "files" is ["dist"], and tsup emits the JSDoc into dist/*.d.ts and the full
 *   source text into dist/*.map `sourcesContent`, so source comments are published documentation. The first test
 *   fails if "files" or the tsup entry changes, so any new published surface is added here deliberately.
 *
 * Rules:
 * - FORBIDDEN_CLAIMS: no "Unlimited", no SLA / service-level promise, no "free forever";
 * - ALLOWED_CONTACT: the only e-mail address is support@cryptacount.com.
 * Job-status enum values (`PENDING|PROCESSING`, "a PENDING/PROCESSING job") are product vocabulary and stay allowed.
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

  it(`the only contact address is ${ALLOWED_CONTACT}`, () => {
    const addrs = SCANNED.flatMap((f) =>
      [...TEXT[f].matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => [f, m[0]] as const),
    );
    expect(addrs.filter(([, a]) => a !== ALLOWED_CONTACT && !a.startsWith("@cryptascreen/"))).toEqual([]);
  });

  it("README: removed content stays removed (stale snippets, real mainnet address, public host claims, stale enums)", () => {
    const r = TEXT["README.md"];
    expect(r).not.toContain("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045");
    expect(r).not.toMatch(/result\.sanctioned\b|totalScreened|totalFlagged|job\.results/);
    expect(r).not.toContain('// "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"');
    expect(r).not.toMatch(/npm install @cryptascreen\/sdk|Default: "https:\/\/api\.cryptascreen\.com"|\/\/ default/);
    expect(r).not.toMatch(/max 1000|max 10000/); // caps per plan, no hard-coded numbers
    expect(r).toContain("0x5eed000000000000000000000000000000c50101");
    expect(r).toContain('"MINIMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN"');
    expect(r).toContain("Support: in-app or support@cryptacount.com.");
    expect(r).toContain("Webhook events: SANCTIONS_MATCH, CRITICAL, HIGH_RISK, HEURISTICS_COMPLETE, TEST.");
  });
});
