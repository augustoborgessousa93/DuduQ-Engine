#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ADAPTER_RELATIVE = 'core/adapters/v28/intro-mobile-touch-target.css';
const INTRO_RELATIVE = 'play/intro-module/index.html';
const MANIFEST_RELATIVE = '.duduq-pages-manifest';
const RELEASE_MARKER = 'data-duduq-release="v28-intro-mobile-touch-target"';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function parseManifest(text) {
  const rows = text.trimEnd().split(/\r?\n/);
  const entries = new Map();
  rows.forEach((row, index) => {
    const split = row.lastIndexOf(' ');
    assert(split > 0, `BAD_MANIFEST_ROW:${index + 1}`);
    const relative = row.slice(0, split);
    const hash = row.slice(split + 1);
    assert(/^[a-f0-9]{64}$/.test(hash), `BAD_MANIFEST_HASH:${relative}`);
    assert(!entries.has(relative), `DUPLICATE_MANIFEST_PATH:${relative}`);
    entries.set(relative, { hash, index });
  });
  return { rows, entries };
}

export async function applyIntroMobileTouchTargetV28({
  root = process.cwd(),
  dist = path.join(root, 'dist-pages'),
  reportPath = path.join(root, 'qa/results/intro-mobile-touch-target-v28.json'),
  apply = false
} = {}) {
  const adapterSource = path.join(root, ADAPTER_RELATIVE);
  const adapterTarget = path.join(dist, ADAPTER_RELATIVE);
  const introPath = path.join(dist, INTRO_RELATIVE);
  const manifestPath = path.join(dist, MANIFEST_RELATIVE);
  const [adapterBytes, introBytes, manifestBytes] = await Promise.all([
    readFile(adapterSource),
    readFile(introPath),
    readFile(manifestPath)
  ]);
  const adapterText = adapterBytes.toString('utf8');
  assert(adapterText.includes('--duduq-intro-start-touch-height'), 'INVALID_V28_TOUCH_METRICS');
  assert(adapterText.includes('touch-action: manipulation'), 'INVALID_V28_TOUCH_BEHAVIOR');

  const manifestText = manifestBytes.toString('utf8');
  const { rows, entries } = parseManifest(manifestText);
  const introRecord = entries.get(INTRO_RELATIVE);
  assert(introRecord, 'INTRO_NOT_HASH_BOUND');
  assert.equal(sha256(introBytes), introRecord.hash, 'INTRO_MANIFEST_HASH_MISMATCH');
  assert(!entries.has(ADAPTER_RELATIVE), 'V28_ADAPTER_ALREADY_HASH_BOUND');

  const introText = introBytes.toString('utf8');
  assert(!introText.includes(RELEASE_MARKER), 'V28_RELEASE_LINK_ALREADY_PRESENT');
  assert(/<\/head>/i.test(introText), 'INTRO_HEAD_CLOSE_MISSING');
  const releaseLink = `<link rel="stylesheet" href="/${ADAPTER_RELATIVE}" ${RELEASE_MARKER}>\n`;
  const nextIntro = introText.replace(/<\/head>/i, `${releaseLink}</head>`);
  assert.equal(nextIntro.split(RELEASE_MARKER).length, 2, 'V28_RELEASE_LINK_NOT_UNIQUE');

  const nextIntroHash = sha256(Buffer.from(nextIntro));
  const adapterHash = sha256(adapterBytes);
  rows[introRecord.index] = `${INTRO_RELATIVE} ${nextIntroHash}`;
  rows.push(`${ADAPTER_RELATIVE} ${adapterHash}`);
  const nextManifest = `${rows.join('\n')}\n`;
  const report = {
    schemaVersion: 'DUDUQ_INTRO_MOBILE_TOUCH_TARGET_V28',
    status: apply ? 'HASH_BOUND_COMPILED_ADAPTER_APPLIED' : 'READ_ONLY_PLAN',
    intro: INTRO_RELATIVE,
    introSourceSha256: introRecord.hash,
    introCandidateSha256: nextIntroHash,
    adapter: ADAPTER_RELATIVE,
    adapterSha256: adapterHash,
    manifestSourceSha256: sha256(manifestBytes),
    manifestCandidateSha256: sha256(Buffer.from(nextManifest)),
    manifestEntryCount: rows.length,
    visualGeometryChanged: false,
    touchTargetOnly: true,
    minimumVerifiedViewportWidth: 280,
    minimumTargetCssPixels: 44,
    curriculumChanged: false,
    answersChanged: false,
    mediaChanged: false,
    pedagogicalApprovalChanged: false,
    releaseApproved: false,
    productionDeployed: false
  };
  if (!apply) return report;
  assert.equal(process.env.DUDUQ_COMPILED_RELEASE_HOTFIX, '1', 'V28_EXPLICIT_APPLY_GATE_REQUIRED');

  let adapterCreated = false;
  try {
    await mkdir(path.dirname(adapterTarget), { recursive: true });
    await writeFile(adapterTarget, adapterBytes, { flag: 'wx' });
    adapterCreated = true;
    await writeFile(introPath, nextIntro, 'utf8');
    await writeFile(manifestPath, nextManifest, 'utf8');
    await mkdir(path.dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    const [writtenAdapter, writtenIntro, writtenManifest] = await Promise.all([
      readFile(adapterTarget), readFile(introPath), readFile(manifestPath)
    ]);
    assert.equal(sha256(writtenAdapter), adapterHash, 'V28_ADAPTER_WRITE_MISMATCH');
    assert.equal(sha256(writtenIntro), nextIntroHash, 'V28_INTRO_WRITE_MISMATCH');
    assert.equal(sha256(writtenManifest), report.manifestCandidateSha256, 'V28_MANIFEST_WRITE_MISMATCH');
  } catch (error) {
    await Promise.allSettled([
      writeFile(introPath, introBytes),
      writeFile(manifestPath, manifestBytes),
      adapterCreated ? unlink(adapterTarget) : Promise.resolve()
    ]);
    throw error;
  }
  return report;
}

function valueAfter(prefix, fallback) {
  const arg = process.argv.slice(2).find(value => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) {
  const root = process.cwd();
  const dist = path.resolve(root, valueAfter('--dist=', 'dist-pages'));
  const reportPath = path.resolve(root, valueAfter('--report=', 'qa/results/intro-mobile-touch-target-v28.json'));
  const report = await applyIntroMobileTouchTargetV28({
    root,
    dist,
    reportPath,
    apply: process.argv.includes('--apply')
  });
  console.log(JSON.stringify(report));
}
