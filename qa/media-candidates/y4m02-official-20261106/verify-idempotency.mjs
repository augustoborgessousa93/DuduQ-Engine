import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const batchDir = path.dirname(fileURLToPath(import.meta.url));
const reportName = 'idempotency-verification.json';
const snapshotName = '.idempotency-before.json';

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
  });
}

function snapshot() {
  return Object.fromEntries(
    walk(batchDir)
      .filter((file) => ![reportName, snapshotName].includes(path.basename(file)))
      .sort()
      .map((file) => [
        path.relative(batchDir, file).replaceAll('\\', '/'),
        crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
      ]),
  );
}

const mode = process.argv[2];
const snapshotPath = path.join(batchDir, snapshotName);

if (mode === '--capture') {
  const before = snapshot();
  fs.writeFileSync(snapshotPath, `${JSON.stringify(before, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'IDEMPOTENCY_BASELINE_CAPTURED', fileCount: Object.keys(before).length }));
  process.exit(0);
}

if (mode !== '--verify' || !fs.existsSync(snapshotPath)) {
  console.error('Run --capture, rebuild the bundle, then run --verify.');
  process.exit(1);
}

const before = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const after = snapshot();
const files = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
const changed = files
  .filter((file) => before[file] !== after[file])
  .map((file) => ({ file, before: before[file] ?? null, after: after[file] ?? null }));

const report = {
  schemaVersion: 'DUDUQ_Y4M02_IDEMPOTENCY_VERIFICATION_V1',
  createdAt: '2026-11-06T15:07:26.406Z',
  moduleId: 'Y4M02',
  lane: 'generation',
  command: 'node qa/media-candidates/y4m02-official-20261106/assemble-generation-input.mjs && node qa/media-candidates/y4m02-official-20261106/prepare-generation-bundle.mjs',
  status: changed.length === 0 ? 'IDEMPOTENT_PASS' : 'IDEMPOTENT_FAIL',
  fileCountBefore: Object.keys(before).length,
  fileCountAfter: Object.keys(after).length,
  changed,
};

fs.writeFileSync(path.join(batchDir, reportName), `${JSON.stringify(report, null, 2)}\n`);
fs.rmSync(snapshotPath);
console.log(JSON.stringify(report));
if (changed.length > 0) process.exit(2);
