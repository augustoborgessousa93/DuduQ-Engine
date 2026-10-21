import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const origin = process.env.PRODUCTION_BASELINE_ORIGIN || 'https://duduq-engine-13a.pages.dev';
const root = path.resolve(process.env.DUDUQ_BASELINE_ROOT || 'baseline-dist');
const manifestPath = 'ci/fixtures/production-baseline.manifest.gz';
const expectedManifestHash = 'd2155c9f546d3316774af3cea0476877fdf074a6cbebcbe04dedf7ebed7a29c6';
const bytes = gunzipSync(await readFile(manifestPath));
const digest = data => createHash('sha256').update(data).digest('hex');
assert.equal(digest(bytes), expectedManifestHash, 'known production manifest checksum');
const rows = bytes.toString('utf8').trim().split(/\r?\n/).map(line => {
  const i = line.lastIndexOf(' ');
  assert(i > 0, `invalid manifest entry ${line}`);
  return { path: line.slice(0, i), sha256: line.slice(i + 1) };
});
assert.equal(rows.length, 2641, 'expected published file inventory');
assert.equal(new Set(rows.map(row => row.path)).size, 2641, 'unique published paths');
await mkdir(root, { recursive: true });
let next = 0, completed = 0;
const failures = [];
async function fetchOne(row) {
  const urlPath = row.path.split('/').map(part => encodeURIComponent(part)).join('/');
  const url = `${origin}/${urlPath}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
      if (response.status !== 200) throw new Error(`HTTP_${response.status}`);
      const data = Buffer.from(await response.arrayBuffer());
      const actual = digest(data);
      if (actual !== row.sha256) throw new Error(`HASH_MISMATCH:${actual}`);
      const target = path.join(root, row.path);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, data);
      completed++;
      if (completed % 100 === 0 || completed === rows.length) console.log(`BASELINE_BYTES ${completed}/${rows.length}`);
      return;
    } catch (error) {
      if (attempt === 4) { failures.push({ path: row.path, error: String(error?.message || error) }); return; }
      await new Promise(resolve => setTimeout(resolve, attempt * 750));
    }
  }
}
async function worker() { while (true) { const index = next++; if (index >= rows.length) return; await fetchOne(rows[index]); } }
await Promise.all(Array.from({ length: 12 }, worker));
const report = { schema: 'DUDUQ_LIVE_PRODUCTION_BASELINE_RECOVERY_V1', testedAt: new Date().toISOString(), origin,
  manifestSha256: expectedManifestHash, requested: rows.length, recovered: completed, failures };
await writeFile('baseline-recovery.json', JSON.stringify(report, null, 2) + '\n');
assert.equal(failures.length, 0, `baseline not byte-identical: ${JSON.stringify(failures.slice(0, 10))}`);
await writeFile(path.join(root, '.duduq-pages-manifest'), bytes);
console.log(`BASELINE_MATCH=${expectedManifestHash}; FILES=${completed}`);

