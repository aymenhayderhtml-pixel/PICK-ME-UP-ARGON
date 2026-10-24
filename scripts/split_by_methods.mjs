import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '/home/aymen/Documents/context forge v3/node_modules/.acorn-EodPOFcL/dist/acorn.js';

const args = process.argv.slice(2);
const mode = args.includes('--apply') ? 'apply' : args.includes('--dry-run') ? 'dry' : args.includes('--list') ? 'list' : null;
const planPath = args.find(a => !a.startsWith('--'));

function fail(msg){ console.error('ERROR:', msg); process.exit(1); }

if (mode === 'list') {
  const srcPath = planPath;
  const src = readFileSync(srcPath,'utf8');
  const ast = parse(src, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  const cls = ast.body.find(n => n.type === 'ClassDeclaration' && n.id.name === (process.env.CLS || 'Player'));
  // find class name from argv? use second positional? We'll just find first class
  let klass = ast.body.find(n => n.type === 'ClassDeclaration');
  if (!klass) { const exp = ast.body.find(n => n.type === 'ExportNamedDeclaration' && n.declaration && n.declaration.type === 'ClassDeclaration'); if (exp) klass = exp.declaration; }
  if (!klass) fail('no class');
  for (const m of klass.body.body) {
    const name = m.key && m.key.name ? m.key.name : (m.key && m.key.value);
    const kind = m.kind || (m.static ? 'static' : 'method');
    const start = m.loc.start.line;
    const end = m.loc.end.line;
    console.log(`${name} | ${kind} | ${start}-${end} | ${end-start+1}`);
  }
  // top-level
  for (const n of ast.body) {
    if (n.type === 'VariableDeclaration') for (const d of n.declarations) console.log(`${d.id.name} | var | ${n.loc.start.line}-${n.loc.end.line}`);
    if (n.type === 'FunctionDeclaration') console.log(`${n.id.name} | function | ${n.loc.start.line}-${n.loc.end.line}`);
  }
  process.exit(0);
}

console.log('dry/apply not fully implemented; use --list only for now');
process.exit(0);
EOF
