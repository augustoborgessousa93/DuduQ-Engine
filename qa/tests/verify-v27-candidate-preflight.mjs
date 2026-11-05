#!/usr/bin/env node
// Read-only semantic gate for V27 candidate PNGs. This is NOT final pedagogical QA.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const report = read('docs/qa/media-audit-20261029/live-source-and-v27-preflight.json');
const summary = read('docs/qa/media-audit-20261029/summary.json');
const manifest = read('qa/media-inbox/batch-20261029/batch-manifest.json');
const requireEligible = process.argv.includes('--require-eligible');
assert.equal(report.liveQuestions.modules, 30);
assert.equal(report.liveQuestions.activities, 600);
assert.equal(report.liveQuestions.questionIdMediaAndAnswerKeyMismatchesAgainstSnapshot, 0);
assert.equal(report.sourceRegistry.entries, summary.registryEntries);
assert.equal(report.liveQuestions.paths.length, 30);
assert.equal(summary.sourceQuestions, 600);
assert.equal(summary.sourceModules, 30);
assert.equal(manifest.schemaVersion, 'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1');
const seen = new Set(), rejected = [], eligible = [];
for (const p of report.liveQuestions.paths) {
  assert(/^Y[1-5]M0[1-6]$/.test(p.moduleId), 'INVALID_PROVENANCE_MODULE');
  assert(/^[a-f0-9]{40}$/.test(p.gitBlobSha), 'INVALID_SOURCE_GIT_BLOB_SHA');
  assert(!seen.has(p.moduleId), 'DUPLICATE_PROVENANCE_MODULE');
  seen.add(p.moduleId);
}
for (const a of manifest.assets || []) {
  const evidence = report.candidateAssets.find(x => x.assetKey === a.assetKey);
  assert(evidence, 'MISSING_VISUAL_EVIDENCE:' + a.assetKey);
  assert.equal(evidence.sha256, a.sha256, 'STALE_VISUAL_EVIDENCE:' + a.assetKey);
  assert.equal(evidence.concept, a.semanticTarget, 'SEMANTIC_TARGET_DRIFT:' + a.assetKey);
  assert.equal(evidence.width, a.pixelWidth);
  assert.equal(evidence.height, a.pixelHeight);
  assert.equal(evidence.format, 'PNG_RGBA');
  const passed = a.review === 'MODEL_SEMANTIC_PRECHECK_PASSED' &&
    evidence.semanticPrecheck === 'PASSED';
  if (!passed) rejected.push({assetKey:a.assetKey,reason:evidence.reason,review:a.review});
  else eligible.push(a.assetKey);
  if (requireEligible && passed) {
    const file = path.resolve('qa/media-inbox/batch-20261029', a.file);
    assert(existsSync(file), 'MISSING_PNG:' + a.assetKey);
    const bytes = readFileSync(file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), a.sha256, 'PNG_HASH_MISMATCH:' + a.assetKey);
  }
}
assert.equal(manifest.assets.length, report.candidateAssets.length, 'CANDIDATE_EVIDENCE_COUNT_MISMATCH');
const result = {audit:'V27_CANDIDATE_SEMANTIC_PREFLIGHT',sourceModules:30,sourceActivities:600,eligible,rejected,productionReleaseCertified:false};
console.log(JSON.stringify(result));
if (requireEligible && rejected.length) {
  console.error('V27_SEMANTIC_GATE_BLOCKED: replace rejected candidates and update matching visual evidence before overlay QA');
  process.exitCode = 2;
}
