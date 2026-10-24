import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\)/g;

let broken = 0;
for (const file of walk(SRC)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    let m;
    const re = new RegExp(importRe.source, 'g');
    while ((m = re.exec(line)) !== null) {
      const spec = m[1] || m[2];
      if (!spec || !(spec.startsWith('./') || spec.startsWith('../'))) continue;
      const resolved = resolve(dirname(file), spec);
      const candidates = [resolved, resolved + '.js', resolved + '/index.js'];
      if (!candidates.some((c) => existsSync(c))) {
        // suggest by basename
        const base = spec.split('/').pop();
        let suggestion = '(not found)';
        for (const f2 of walk(SRC)) {
          if (f2.endsWith('/' + base) || f2.endsWith('/' + base + '.js')) {
            suggestion = relative(dirname(file), f2);
            if (!suggestion.startsWith('.')) suggestion = './' + suggestion;
            break;
          }
        }
        console.log(`${relative(ROOT, file)}:${i + 1} -> ${spec} -> ${suggestion}`);
        broken++;
      }
    }
  });
}
console.log(`Broken imports: ${broken}`);
process.exit(broken ? 1 : 0);
EOF