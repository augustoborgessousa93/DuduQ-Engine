import assert from 'node:assert/strict';
import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const baseline = path.resolve(process.env.DUDUQ_BASELINE_ROOT || 'source/dist-pages');
const candidate = path.resolve(process.env.DUDUQ_CANDIDATE_ROOT || 'candidate-dist');
const payload = path.resolve('ci/payload');
const baselineExpected = 'd2155c9f546d3316774af3cea0476877fdf074a6cbebcbe04dedf7ebed7a29c6';
const candidateExpected = 'a94b510cf4178a4ae84aba352d15ea9fe1a0ed66545a8071822f3ec49434b829';
const allowed = [
  'core/duduq-live-hud.css',
  'play/drag-drop-multimedia/drag-drop-multimedia.css',
  'play/drag-drop/drag-drop.css',
  'play/intro-module/intro-module.css'
];
const expectedCss = {
  'core/duduq-live-hud.css': 'a6e77a2de7b9928fe2fc5482e1e828edf6ec161773d3ad3d7e063d96c62da8ba',
  'play/drag-drop-multimedia/drag-drop-multimedia.css': '2a5aa9665c642ff5bb621d924e054b02a187cafcdba2ff7b3d8e15b09ca78175',
  'play/drag-drop/drag-drop.css': '4ed80343a9e24cff70b3b30b6dbe4a4833835f4beaa9c01b613c9e0a5c9a90f5',
  'play/intro-module/intro-module.css': '512a5daa57c0ea27e59737a15fb1a6d23073dd4397c7b258caf3eb35fdddd34f'
};
const hash = b => createHash('sha256').update(b).digest('hex');
const baseText = await readFile(path.join(baseline, '.duduq-pages-manifest'), 'utf8');
assert.equal(hash(Buffer.from(baseText)), baselineExpected, 'exact production baseline manifest');
const baseRows = baseText.trim().split(/\r?\n/).map(line => {
  const i = line.lastIndexOf(' ');
  assert(i > 0, 'valid manifest row');
  return { path: line.slice(0, i), sha256: line.slice(i + 1) };
});
assert.equal(baseRows.length, 2641, 'baseline file count');
const baselineMap = new Map(baseRows.map(row => [row.path, row.sha256]));
assert.equal(baselineMap.size, 2641, 'unique baseline paths');
await rm(candidate, { recursive: true, force: true });
await cp(baseline, candidate, { recursive: true });
for (const rel of allowed) {
  const source = path.join(payload, path.basename(rel));
  const bytes = await readFile(source);
  assert.equal(hash(bytes), expectedCss[rel], `authorized payload hash: ${rel}`);
  await mkdir(path.dirname(path.join(candidate, rel)), { recursive: true });
  await copyFile(source, path.join(candidate, rel));
}
async function files(dir, prefix = '') {
  const rows = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (rel === '.duduq-pages-manifest') continue;
    if (entry.isDirectory()) rows.push(...await files(path.join(dir, entry.name), rel));
    else if (entry.isFile()) rows.push(rel.replaceAll('\\', '/'));
  }
  return rows;
}
const paths = (await files(candidate)).sort();
assert.equal(paths.length, 2641, 'candidate file count');
assert.deepEqual(paths, [...baselineMap.keys()].sort(), 'candidate path inventory equals baseline');
const rows = [];
for (const rel of paths) rows.push({ path: rel, sha256: hash(await readFile(path.join(candidate, rel))) });
const changed = rows.filter(row => baselineMap.get(row.path) !== row.sha256).map(row => row.path).sort();
assert.deepEqual(changed, [...allowed].sort(), 'only the four authorized CSS files differ');
const manifest = rows.map(row => `${row.path} ${row.sha256}`).join('\n') + '\n';
const candidateHash = hash(Buffer.from(manifest));
assert.equal(candidateHash, candidateExpected, 'exact candidate manifest');
await writeFile(path.join(candidate, '.duduq-pages-manifest'), manifest);
await writeFile('ci-output-artifact.json', JSON.stringify({
  schema: 'DUDUQ_CI_RESPONSIVE_RELEASE_ARTIFACT_V1',
  status: 'PASS', baseline: { root: baseline, manifestSha256: baselineExpected, fileCount: 2641 },
  candidate: { root: candidate, manifestSha256: candidateHash, fileCount: paths.length, changedFiles: changed,
    cssHashes: Object.fromEntries(rows.filter(row => allowed.includes(row.path)).map(row => [row.path, row.sha256])) }
}, null, 2) + '\n');
console.log(`BASELINE_MATCH=${baselineExpected}`);
console.log(`CANDIDATE_MATCH=${candidateHash}`);
console.log(`CANDIDATE_FILES=${paths.length}; CHANGED=${changed.join(',')}`);

