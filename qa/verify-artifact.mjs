import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const expected = process.env.EXPECTED_ARTIFACT_SHA256?.toUpperCase();
const manifestPath = 'dist-pages/.duduq-pages-manifest';
const manifestBytes = await readFile(manifestPath);
const manifestSha256 = createHash('sha256').update(manifestBytes).digest('hex').toUpperCase();
if (!expected || manifestSha256 !== expected) throw new Error(`Artifact manifest SHA mismatch: ${manifestSha256}`);

async function filesUnder(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

const files = await filesUnder('dist-pages');
if (files.length !== 2671) throw new Error(`Expected 2671 compiled files, found ${files.length}`);
const manifestEntries = manifestBytes.toString('utf8').trimEnd().split(/\r?\n/).map((line, index) => {
  const match = /^(.*) ([a-f0-9]{64})$/i.exec(line);
  if (!match) throw new Error(`Malformed compiled manifest line ${index + 1}`);
  return { relative: match[1].replaceAll('/', path.sep), expectedSha256: match[2].toLowerCase() };
});
if (manifestEntries.length !== files.length - 1) throw new Error(`Manifest covers ${manifestEntries.length} files, compiled tree has ${files.length - 1} non-manifest files`);
const expectedByPath = new Map(manifestEntries.map(entry => [path.resolve('dist-pages', entry.relative), entry.expectedSha256]));
if (expectedByPath.size !== manifestEntries.length) throw new Error('Duplicate paths in compiled manifest');
const mismatches = [];
for (const file of files) {
  const absolute = path.resolve(file);
  if (absolute === path.resolve(manifestPath)) continue;
  const expectedSha256 = expectedByPath.get(absolute);
  if (!expectedSha256) { mismatches.push({ file: path.relative('dist-pages', file), reason: 'UNLISTED' }); continue; }
  const actualSha256 = createHash('sha256').update(await readFile(file)).digest('hex');
  if (actualSha256 !== expectedSha256) mismatches.push({ file: path.relative('dist-pages', file), expectedSha256, actualSha256 });
}
if (mismatches.length) throw new Error(`Compiled artifact file hashes do not match manifest: ${JSON.stringify(mismatches.slice(0, 10))}`);
const report = {
  manifestSha256,
  manifestBytes: manifestBytes.length,
  compiledFileCount: files.length,
  compiledByteCount: (await Promise.all(files.map(async file => (await stat(file)).size))).reduce((a, b) => a + b, 0),
  manifestEntriesVerified: manifestEntries.length,
  fileHashesVerified: manifestEntries.length,
  pagesFunction: 'functions/play/english/_middleware.js',
  pagesFunctionPresent: (await stat('functions/play/english/_middleware.js')).isFile(),
};
console.log(JSON.stringify(report, null, 2));
