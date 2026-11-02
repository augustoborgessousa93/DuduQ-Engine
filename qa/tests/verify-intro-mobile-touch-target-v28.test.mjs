import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { applyIntroMobileTouchTargetV28 } from '../apply-intro-mobile-touch-target-v28.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('V28 expands only the hash-bound Intro touch target adapter', async () => {
  const root = process.cwd();
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'duduq-v28-touch-'));
  const dist = path.join(fixture, 'dist-pages');
  const introPath = path.join(dist, 'play/intro-module/index.html');
  const manifestPath = path.join(dist, '.duduq-pages-manifest');
  const reportPath = path.join(fixture, 'report.json');
  const intro = Buffer.from('<!doctype html><html><head></head><body>Intro</body></html>\n');
  try {
    await mkdir(path.dirname(introPath), { recursive: true });
    await writeFile(introPath, intro);
    await writeFile(manifestPath, `play/intro-module/index.html ${sha256(intro)}\n`);

    const plan = await applyIntroMobileTouchTargetV28({ root, dist, reportPath, apply: false });
    assert.equal(plan.status, 'READ_ONLY_PLAN');
    assert.equal(plan.touchTargetOnly, true);
    assert.equal(plan.minimumTargetCssPixels, 44);
    assert.equal((await readFile(introPath)).toString('utf8'), intro.toString('utf8'));

    process.env.DUDUQ_COMPILED_RELEASE_HOTFIX = '1';
    const applied = await applyIntroMobileTouchTargetV28({ root, dist, reportPath, apply: true });
    const html = await readFile(introPath, 'utf8');
    const adapter = await readFile(path.join(dist, applied.adapter));
    const manifest = await readFile(manifestPath, 'utf8');
    assert.equal(applied.status, 'HASH_BOUND_COMPILED_ADAPTER_APPLIED');
    assert.equal(html.split('data-duduq-release="v28-intro-mobile-touch-target"').length, 2);
    assert(manifest.includes(`${applied.adapter} ${sha256(adapter)}\n`));
    assert(manifest.includes(`${applied.intro} ${sha256(Buffer.from(html))}\n`));
    assert.equal(sha256(Buffer.from(manifest)), applied.manifestCandidateSha256);
    await assert.rejects(
      applyIntroMobileTouchTargetV28({ root, dist, reportPath, apply: true }),
      /V28_ADAPTER_ALREADY_HASH_BOUND|V28_RELEASE_LINK_ALREADY_PRESENT/
    );
  } finally {
    delete process.env.DUDUQ_COMPILED_RELEASE_HOTFIX;
    await rm(fixture, { recursive: true, force: true });
  }
});
