// Dev tool (not shipped): scans Spring controllers of a backend checkout and prints {method, path} rows; used to
// regenerate tests/fixtures/backend-routes.json. Usage: node scripts/scan-backend-routes.mjs <backend-checkout>
// Scans Spring controllers under a backend checkout and prints {method, path} route rows.
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
const out = [];
function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.java')) scan(p);
  }
}
function scan(file) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/@RestController|@Controller\b/.test(src)) return;
  const cls = src.match(/@RequestMapping\(\s*(?:value\s*=\s*|path\s*=\s*)?"([^"]*)"[^)]*\)\s*(?:@[\w.]+(?:\([^)]*\))?\s*)*public\s+(?:final\s+)?class/);
  const base = cls ? cls[1] : '';
  const re = /@(Get|Post|Put|Patch|Delete)Mapping(?:\(\s*(?:value\s*=\s*|path\s*=\s*)?(?:"([^"]*)"|\{([^}]*)\})?[^)]*\))?/g;
  let m;
  while ((m = re.exec(src))) {
    const subs = m[2] !== undefined ? [m[2]] : m[3] ? [...m[3].matchAll(/"([^"]*)"/g)].map((x) => x[1]) : [''];
    for (const s of subs) {
      out.push({ method: m[1].toUpperCase(), path: (base + s).replace(/\/+$/, '') || '/', source: path.relative(root, file).replace(/\\/g, '/') });
    }
  }
}
walk(path.join(root, 'src/main/java'));
out.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
console.log(JSON.stringify(out, null, 1));
