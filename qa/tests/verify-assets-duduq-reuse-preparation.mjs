#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {inspectPng} from '../../scripts/duduq-image-pipeline.mjs';

const root=process.cwd(),bundle=path.resolve(process.argv[2]||'qa/media-candidates/assets-duduq-reuse-20261030');
const hash=b=>createHash('sha256').update(b).digest('hex');
const manifest=JSON.parse(await readFile(path.join(bundle,'batch-manifest.json'),'utf8'));
const report=JSON.parse(await readFile(path.join(bundle,'preparation-report.json'),'utf8'));
const evidence=JSON.parse(await readFile(path.join(bundle,'semantic-evidence.json'),'utf8'));
assert.equal(manifest.schemaVersion,'DUDUQ_ASSETS_DUDUQ_SOURCE_REUSE_V1');
assert.equal(manifest.sourceRepository,'augustoborgessousa93/Assets-DuduQ');
assert.equal(manifest.sourceCommit,'50fb80a89a5779d73f81c96aab35f6e86193d769');
assert.equal(manifest.productionApproved,false);
assert.equal(manifest.humanPedagogicalApproval,false);
assert.equal(report.status,'PREPARED_NOT_IMPORTED');
assert.equal(report.preparedDistinctAssets,6);
assert.equal(report.preparedBindings,11);
assert.deepEqual(report.affectedQuestions,['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020']);
assert.deepEqual(report.affectedModules,['Y1M04']);
assert.equal(manifest.assets.length,6);
assert.equal(manifest.assets.reduce((n,a)=>n+a.bindings.length,0),11);
assert.equal(evidence.renderedReview.status,'HUMAN_PEDAGOGICAL_REVIEW_PENDING');

const expected={
  'Y1M04-Q010':new Set(['crayon','ruler','pen','backpack']),
  'Y1M04-Q015':new Set(['ruler','pen','backpack','eraser']),
  'Y1M04-Q020':new Set(['backpack','eraser','pencil'])
};
const seen=new Map();
for(const asset of manifest.assets){
  assert.match(asset.sourceGitBlob,/^[a-f0-9]{40}$/);
  assert.match(asset.sha256,/^[a-f0-9]{64}$/);
  assert(asset.visualNote&&asset.sourcePath);
  assert.equal(asset.review,'MODEL_SEMANTIC_PRECHECK_PASSED');
  for(const binding of asset.bindings){
    assert(expected[binding.questionId],`unexpected question ${binding.questionId}`);
    assert(binding.optionIds.length>0);
    const list=seen.get(binding.questionId)||new Set();list.add(asset.semanticTarget);seen.set(binding.questionId,list);
  }
  const bytes=await readFile(path.join(bundle,asset.file));
  assert.equal(hash(bytes),asset.sha256);
  const qc=inspectPng(bytes);
  assert.equal(qc.valid,true);assert.equal(qc.transparent,true);
}
for(const [qid,concepts] of Object.entries(expected))assert.deepEqual(seen.get(qid),concepts,qid);
for(const skip of report.skipped.filter(x=>x.reason==='QUEUE_NOT_EXACT_PROVISIONAL'))assert(skip.mediaId.startsWith('IMG-V11-2B-'));
console.log(JSON.stringify({status:'PASS',bundle:path.relative(root,bundle).replaceAll('\\','/'),distinctAssets:manifest.assets.length,
  bindings:manifest.assets.reduce((n,a)=>n+a.bindings.length,0),affectedQuestions:Object.keys(expected),
  pendingHumanPedagogicalApproval:manifest.humanPedagogicalApproval===false},null,2));
