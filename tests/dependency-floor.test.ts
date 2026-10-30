import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// axios is a runtime dependency that the published package does NOT bundle
// (dist requires "axios"), so the range declared in package.json is the floor
// every consumer resolves. It must exclude the axios releases affected by the
// HIGH advisories CVE-2026-101898 / -101901 / -101906 (fixed in 1.20.0), which
// also covers the 1.15.1-1.16.0 fixes (CVE-2026-42033/42035/42043/42264,
// CVE-2026-44486..44496) and pulls form-data >= 4.0.6 (CVE-2026-12143).
const AXIOS_FIXED = "1.20.0";
const FORM_DATA_FIXED = "4.0.6";

const root = resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(resolve(root, "package-lock.json"), "utf8"));

function parse(v: string): [number, number, number] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  if (!m) throw new Error(`not a plain x.y.z version: "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function gte(a: string, b: string): boolean {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] > y[i];
  }
  return true;
}

// Lowest version a single-comparator range admits. Only ^x.y.z, ~x.y.z,
// >=x.y.z and x.y.z are accepted: anything wider (||, *, x-ranges, hyphen
// ranges) could admit a vulnerable release, so it is refused outright.
function rangeMinimum(range: string): string {
  const m = /^(\^|~|>=)?\s*(\d+\.\d+\.\d+)$/.exec(range.trim());
  if (!m) throw new Error(`unsupported axios range: "${range}"`);
  return m[2];
}

describe("axios dependency floor", () => {
  it("is a runtime dependency (not bundled, not a devDependency)", () => {
    expect(pkg.dependencies?.axios).toBeTypeOf("string");
    expect(pkg.devDependencies?.axios).toBeUndefined();
  });

  it(`package.json axios range has a minimum >= ${AXIOS_FIXED}`, () => {
    const min = rangeMinimum(pkg.dependencies.axios);
    expect(gte(min, AXIOS_FIXED), `range ${pkg.dependencies.axios} admits ${min}`).toBe(true);
  });

  it("package-lock.json root records the same axios range as package.json", () => {
    expect(lock.packages[""].dependencies.axios).toBe(pkg.dependencies.axios);
  });

  it(`lockfile-resolved axios is >= ${AXIOS_FIXED}`, () => {
    const v = lock.packages["node_modules/axios"].version;
    expect(gte(v, AXIOS_FIXED), `lockfile resolves axios ${v}`).toBe(true);
  });

  it(`lockfile-resolved form-data (axios transitive) is >= ${FORM_DATA_FIXED}`, () => {
    const v = lock.packages["node_modules/form-data"].version;
    expect(gte(v, FORM_DATA_FIXED), `lockfile resolves form-data ${v}`).toBe(true);
  });
});
