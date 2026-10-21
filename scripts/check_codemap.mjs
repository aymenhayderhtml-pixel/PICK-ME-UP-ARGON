#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const CODEMAP_PATH = 'docs/CODEMAP.md';
const isFixList = process.argv.includes('--fix-list');

function isIgnored(entryPath) {
  const parts = entryPath.split(path.sep);
  return parts.some(p => p === 'node_modules' || p === 'dist' || p === '.git' || p === 'assets' || p === 'public');
}

function getDiskFiles() {
  const files = [];

  // Root html files
  for (const entry of fs.readdirSync('.')) {
    if (entry.endsWith('.html') && !isIgnored(entry)) {
      files.push(entry);
    }
  }

  // Walk src/ and scripts/
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir);
    for (const name of entries) {
      const fullPath = path.join(dir, name);
      if (isIgnored(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.html') || name.endsWith('.css')) {
        files.push(fullPath.replace(/\\/g, '/'));
      }
    }
  }

  walk('src');
  walk('scripts');
  return files.sort();
}

function parseExports(filePath) {
  if (filePath.endsWith('.html') || filePath.endsWith('.css')) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const exports = new Set();
  const namedMatch = [...content.matchAll(/export\s+(?:async\s+)?(?:function\*?|class|const|let|var)\s+([a-zA-Z0-9_$]+)/g)];
  for (const m of namedMatch) exports.add(m[1]);
  const listMatch = [...content.matchAll(/export\s*\{([^}]+)\}/g)];
  for (const m of listMatch) {
    m[1].split(',').forEach(s => {
      const trimmed = s.trim().split(/\s+as\s+/);
      const name = (trimmed[1] || trimmed[0]).trim();
      if (name && /^[a-zA-Z0-9_$]+$/.test(name)) exports.add(name);
    });
  }
  const defMatch = content.match(/export\s+default\s+(?:class|function\*?)?\s*([a-zA-Z0-9_$]+)?/);
  if (defMatch) exports.add('default');
  return [...exports];
}

function parseImports(filePath) {
  if (filePath.endsWith('.html') || filePath.endsWith('.css')) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = new Set();
  const matches = [...content.matchAll(/(?:import|from)\s+['\"]([^'\"]+)['\"]/g)];
  for (const m of matches) {
    let p = m[1];
    if (p.startsWith('.')) {
      p = p.replace(/\.js$/, '');
      const parts = p.split('/');
      imports.add(parts[parts.length - 1]);
    } else {
      imports.add(p);
    }
  }
  return [...imports];
}

function parseCodemap() {
  if (!fs.existsSync(CODEMAP_PATH)) {
    console.error(`Error: ${CODEMAP_PATH} does not exist.`);
    process.exit(1);
  }

  const content = fs.readFileSync(CODEMAP_PATH, 'utf8');
  const lines = content.split('\n');
  const mapFiles = new Map();

  for (const line of lines) {
    if (!line.includes('|')) continue;
    const parts = line.split('|').map(s => s.trim().replace(/^`|`$/g, ''));
    if (parts.length >= 5) {
      const p = parts[0];
      if (p.includes('.') && (p.startsWith('src/') || p.startsWith('scripts/') || p.endsWith('.html'))) {
        mapFiles.set(p, {
          path: p,
          purpose: parts[1],
          exportsStr: parts[2],
          importsStr: parts[3],
          status: parts[4]
        });
      }
    }
  }

  return mapFiles;
}

const diskFiles = getDiskFiles();
const mapFiles = parseCodemap();

const missingFromMap = diskFiles.filter(f => !mapFiles.has(f));
const deadInMap = [...mapFiles.keys()].filter(f => !fs.existsSync(f));
const missingExports = [];

for (const [filePath, entry] of mapFiles.entries()) {
  if (!fs.existsSync(filePath)) continue;
  const diskExps = parseExports(filePath);
  const listedExps = entry.exportsStr;
  for (const exp of diskExps) {
    // Check if listed in exportsStr column
    const tokenRegex = new RegExp(`(^|[,\\s])${exp}([,\\s\\(]|$)`);
    if (!tokenRegex.test(listedExps) && !listedExps.includes(exp)) {
      missingExports.push({ file: filePath, exportName: exp });
    }
  }
}

if (isFixList) {
  if (missingFromMap.length === 0) {
    console.log('# No missing files to fix.');
  } else {
    console.log('# Generated fix lines for missing files:');
    for (const f of missingFromMap) {
      const exps = parseExports(f).join(', ') || '(none)';
      const imps = parseImports(f).join(', ') || '(none)';
      const status = f.startsWith('scripts/') ? 'dev only' : (f.includes('test') || f.includes('dev') ? 'dev only' : 'live game');
      console.log(`${f} |  | ${exps} | ${imps} | ${status}`);
    }
  }
}

let hasError = false;

if (missingFromMap.length > 0) {
  hasError = true;
  console.error(`\n[MISSING FROM MAP] (${missingFromMap.length} files exist on disk but not in ${CODEMAP_PATH}):`);
  for (const f of missingFromMap) console.error(`  - ${f}`);
}

if (deadInMap.length > 0) {
  hasError = true;
  console.error(`\n[DEAD IN MAP] (${deadInMap.length} files in ${CODEMAP_PATH} do not exist on disk):`);
  for (const f of deadInMap) console.error(`  - ${f}`);
}

if (missingExports.length > 0) {
  hasError = true;
  console.error(`\n[UNLISTED EXPORTS] (${missingExports.length} exported names missing from map):`);
  for (const item of missingExports) {
    console.error(`  - ${item.file}: export '${item.exportName}' not listed in map`);
  }
}

if (hasError) {
  console.error('\nCODEMAP check failed. Run with --fix-list for templates.');
  process.exit(1);
} else {
  console.log('CODEMAP OK');
  process.exit(0);
}
