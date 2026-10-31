/**
 * CS-10 copy guard for the SDK docs (owner ruling 2026-10-31n: "no "Unlimited", "SLA", "free forever", "OWNER" or other
 * internal labels; contact address = support@cryptacount.com only"; Parts A/B applied to README/CHANGELOG).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(resolve(__dirname, "..", f), "utf8");
const DOCS = { "README.md": read("README.md"), "CHANGELOG.md": read("CHANGELOG.md") };

describe("SDK docs copy guard", () => {
  it.each(Object.keys(DOCS))("%s: no Unlimited / SLA / forever / internal owner labels", (f) => {
    const s = DOCS[f as keyof typeof DOCS];
    expect(s).not.toMatch(/\bunlimited\b/i);
    expect(s).not.toMatch(/\bSLAs?\b|service[- ]level/i);
    expect(s).not.toMatch(/free\s+forever|\bforever\b/i);
    expect(s).not.toMatch(/\b(OWNER|TODO|TBD|PLACEHOLDER|REPLACE_ME)\b/);
  });

  it.each(Object.keys(DOCS))("%s: the only contact address is support@cryptacount.com", (f) => {
    const addrs = [...DOCS[f as keyof typeof DOCS].matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)].map((m) => m[0]);
    expect(addrs.filter((a) => a !== "support@cryptacount.com" && !a.startsWith("@cryptascreen/"))).toEqual([]);
  });

  it("README: Part A removals applied (stale snippets, real mainnet address, public host/npm claims, stale enums)", () => {
    const r = DOCS["README.md"];
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
