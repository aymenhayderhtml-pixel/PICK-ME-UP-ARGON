#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function printUsage() {
  console.log(`Usage: node scripts/split_by_plan.mjs <plan.json> [--dry-run | --apply]`);
}

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const files = args.filter(a => !a.startsWith('--'));

if (files.length === 0) {
  printUsage();
  process.exit(1);
}

const planPath = path.resolve(process.cwd(), files[0]);
const isApply = flags.includes('--apply');
const isDryRun = flags.includes('--dry-run') || !isApply;

if (!fs.existsSync(planPath)) {
  console.error(`Error: Plan file not found: ${planPath}`);
  process.exit(1);
}

let plan;
try {
  const content = fs.readFileSync(planPath, 'utf8');
  plan = JSON.parse(content);
} catch (err) {
  console.error(`Error parsing plan JSON: ${err.message}`);
  process.exit(1);
}

if (!plan.source || !Array.isArray(plan.parts)) {
  console.error(`Error: Plan must specify "source" and "parts" array.`);
  process.exit(1);
}

const sourcePath = path.resolve(process.cwd(), plan.source);
if (!fs.existsSync(sourcePath)) {
  console.error(`Error: Source file not found: ${sourcePath}`);
  process.exit(1);
}

const sourceRaw = fs.readFileSync(sourcePath, 'utf8');
// Detect line ending (\r\n vs \n)
const lineEnding = sourceRaw.includes('\r\n') ? '\r\n' : '\n';
const lines = sourceRaw.split(lineEnding);
const totalLines = lines.length;

// Collect and validate all ranges
const allRanges = [];
for (let pIdx = 0; pIdx < plan.parts.length; pIdx++) {
  const part = plan.parts[pIdx];
  if (!part.target || !Array.isArray(part.ranges)) {
    console.error(`Error: Part #${pIdx} missing "target" or "ranges".`);
    process.exit(1);
  }

  for (let rIdx = 0; rIdx < part.ranges.length; rIdx++) {
    const r = part.ranges[rIdx];
    if (!Array.isArray(r) || r.length !== 2) {
      console.error(`Error: Part #${pIdx} range #${rIdx} is not [start, end].`);
      process.exit(1);
    }
    const [start, end] = r;
    if (typeof start !== 'number' || typeof end !== 'number' || start < 1 || end < start) {
      console.error(`Error: Invalid range [${start}, ${end}] in part #${pIdx}.`);
      process.exit(1);
    }
    if (end > totalLines) {
      console.error(`Error: Range [${start}, ${end}] exceeds source line count (${totalLines}).`);
      process.exit(1);
    }

    allRanges.push({ start, end, partIndex: pIdx, part });
  }
}

// Check overlaps across all ranges
allRanges.sort((a, b) => a.start - b.start || a.end - b.end);

for (let i = 0; i < allRanges.length - 1; i++) {
  const cur = allRanges[i];
  const next = allRanges[i + 1];
  if (cur.end >= next.start) {
    console.error(`Error: Overlapping ranges detected: [${cur.start}, ${cur.end}] and [${next.start}, ${next.end}].`);
    process.exit(1);
  }
}

console.log(`Plan: Source "${plan.source}" (${totalLines} lines), ${plan.parts.length} target part(s).`);
console.log(`Mode: ${isApply ? 'APPLY (writing changes)' : 'DRY RUN (no changes made)'}`);

// Prepare target file contents
const targetOutputs = [];

for (const part of plan.parts) {
  const targetPath = path.resolve(process.cwd(), part.target);
  let content = '';
  if (part.header) {
    content += part.header + lineEnding;
  }
  const extractedPieces = [];
  for (const [start, end] of part.ranges) {
    // 1-based inclusive slice
    const chunk = lines.slice(start - 1, end).join(lineEnding);
    extractedPieces.push(chunk);
  }
  content += extractedPieces.join(lineEnding);
  if (part.footer) {
    if (!content.endsWith(lineEnding)) {
      content += lineEnding;
    }
    content += part.footer + lineEnding;
  }
  if (content.length > 0 && !content.endsWith(lineEnding)) {
    content += lineEnding;
  }
  targetOutputs.push({ targetPath, relativeTarget: part.target, content, ranges: part.ranges });
}

// Compute remainder of source file
// Keep lines not in any range
const removedLinesMask = new Uint8Array(totalLines + 1); // 1-indexed
for (const r of allRanges) {
  for (let l = r.start; l <= r.end; l++) {
    removedLinesMask[l] = 1;
  }
}

const remainderLines = [];
for (let l = 1; l <= totalLines; l++) {
  if (!removedLinesMask[l]) {
    remainderLines.push(lines[l - 1]);
  }
}
let remainderContent = remainderLines.join(lineEnding);
if (remainderContent.length > 0 && !remainderContent.endsWith(lineEnding)) {
  remainderContent += lineEnding;
}

for (const target of targetOutputs) {
  console.log(`-> Target: ${target.relativeTarget} (${target.ranges.map(r => `[${r[0]}, ${r[1]}]`).join(', ')})`);
}
console.log(`-> Source: ${plan.source} (${totalLines} lines -> ${remainderLines.length} lines after removal)`);

if (isApply) {
  for (const target of targetOutputs) {
    const dir = path.dirname(target.targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(target.targetPath, target.content, 'utf8');
  }
  fs.writeFileSync(sourcePath, remainderContent, 'utf8');
  console.log('Successfully applied plan.');
} else {
  console.log('Dry run complete. Use --apply to execute.');
}
