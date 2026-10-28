import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyReplacementOverlay, V19_MANIFEST_SHA256 } from '../scripts/lib/media-replacement.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist-pages');
const editorialDir = path.join(root, 'content/english/editorial/media-replacements');
const mode = process.env.DUDUQ_MEDIA_OVERLAY_MODE || 'release';
if (!['qa', 'release'].includes(mode)) throw new Error('DUDUQ_MEDIA_OVERLAY_MODE must be qa or release.');
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const safe = relative => {
  const normalized = String(relative || '').replaceAll('\\', '/');
  if (!normalized || normalized.startsWith('/') || normalized.split('/').some(part => !part || part === '.' || part === '..')) throw new Error(`Unsafe editorial path: ${relative}`);
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(root + path.sep)) throw new Error(`Editorial path escapes repository: ${relative}`);
  return absolute;
};
const readJson = async file => JSON.parse(await readFile(file, 'utf8'));

const baseManifest = await readFile(path.join(output, '.duduq-pages-manifest'));
const baseSha = sha(baseManifest).toUpperCase();
if (baseSha !== V19_MANIFEST_SHA256) throw new Error(`Pinned V19 manifest mismatch: ${baseSha}`);
let overlayNames = [];
try { overlayNames = (await readdir(editorialDir)).filter(name => /^[A-Za-z0-9_-]+\.json$/.test(name)).sort(); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const overlays = [];
for (const name of overlayNames) {
  const overlay = await readJson(path.join(editorialDir, name));
  if (overlay.status === 'ROLLED_BACK' || overlay.status === 'REJECTED') continue;
  if (mode === 'qa' || overlay.status === 'APPROVED') overlays.push(overlay);
}
if (mode === 'release' && overlayNames.length && !overlays.length) console.log(`EDITORIAL_OVERLAYS_RELEASE=0/${overlayNames.length} (pending human approval; intentionally excluded)`);

const registryPath = path.join(output, 'content/english/media/media-registry.json');
let registry = await readJson(registryPath);
const questionsByModule = new Map();
for (let year = 1; year <= 5; year++) for (let n = 1; n <= 6; n++) {
  const moduleId = `Y${year}M${String(n).padStart(2, '0')}`;
  const file = path.join(output, `content/english/year-${year}/module-${String(n).padStart(2, '0')}/questions.json`);
  questionsByModule.set(moduleId, await readJson(file));
}
const applied = [], changedFiles = new Set();
for (const overlay of overlays.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))) {
  if (overlay.schemaVersion !== 1 || overlay.v19ManifestSha256 !== baseSha) throw new Error(`Overlay ${overlay.revisionId} targets a different V19 base.`);
  const assetFile = safe(overlay.asset.path);
  const assetBytes = await readFile(assetFile);
  if (sha(assetBytes) !== overlay.asset.sha256) throw new Error(`Overlay asset SHA mismatch: ${overlay.revisionId}`);
  const result = applyReplacementOverlay({ overlay, registry, questionsByModule, assetBytes, v19ManifestSha256: baseSha });
  registry = result.registry;
  questionsByModule.clear(); for (const [id, data] of result.questionsByModule) questionsByModule.set(id, data);
  const targetAsset = path.join(output, overlay.asset.path);
  await mkdir(path.dirname(targetAsset), { recursive: true });
  try { await copyFile(assetFile, targetAsset, 1); }
  catch (error) { if (error.code !== 'EEXIST') throw error; if (sha(await readFile(targetAsset)) !== overlay.asset.sha256) throw new Error(`Immutable asset path collision: ${overlay.asset.path}`); }
  changedFiles.add('content/english/media/media-registry.json');
  for (const patch of overlay.questionPatches || []) changedFiles.add(`content/english/year-${patch.moduleId.slice(1,2)}/module-${patch.moduleId.slice(4,6)}/questions.json`);
  applied.push({ revisionId: overlay.revisionId, scope: overlay.scope, assetPath: overlay.asset.path, assetSha256: overlay.asset.sha256, counts: overlay.counts });
}

// The player resolves only APPROVED registry entries. Promote staged references
// in this disposable QA build only; the source overlay remains pending and the
// release-mode filter above never applies it until a separate human approval.
if (mode === 'qa' && applied.length) {
  for (const entry of registry.entries || []) {
    if (entry.editorialStatus === 'STAGED_FOR_HUMAN_REVIEW') {
      entry.status = 'APPROVED';
      entry.qaOnlyApproval = true;
    }
  }
}

if (applied.length) {
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + '\n');
  for (const moduleId of questionsByModule.keys()) {
    const year = Number(moduleId[1]), moduleNumber = moduleId.slice(3);
    const relative = `content/english/year-${year}/module-${moduleNumber}/questions.json`;
    if (!changedFiles.has(relative)) continue;
    const file = path.join(output, relative);
    await writeFile(file, JSON.stringify(questionsByModule.get(moduleId), null, 2) + '\n');
  }
}
const fileRecords = [];
for (const relative of [...changedFiles].sort()) fileRecords.push({ path: relative, sha256: sha(await readFile(path.join(output, relative))) });
for (const asset of applied.map(record => record.assetPath)) if (!fileRecords.some(record => record.path === asset)) fileRecords.push({ path: asset, sha256: sha(await readFile(path.join(output, asset))) });
const releaseManifest = { schemaVersion: 1, base: { v19ManifestSha256: baseSha, entries: 2670 }, mode, generatedAt: new Date().toISOString(), appliedOverlayCount: applied.length, overlays: applied, changedFiles: fileRecords.sort((a,b) => a.path.localeCompare(b.path)) };
const releaseBytes = Buffer.from(JSON.stringify(releaseManifest, null, 2) + '\n');
await writeFile(path.join(output, '.duduq-editorial-release-manifest.json'), releaseBytes);
console.log(`EDITORIAL_OVERLAY_MODE=${mode}`);
console.log(`EDITORIAL_OVERLAYS_APPLIED=${applied.length}`);
console.log(`EDITORIAL_RELEASE_MANIFEST_SHA256=${sha(releaseBytes).toUpperCase()}`);
console.log(`EDITORIAL_CHANGED_FILES=${fileRecords.length}`);
