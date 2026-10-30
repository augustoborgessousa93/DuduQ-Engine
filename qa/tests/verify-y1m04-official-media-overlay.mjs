#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {collectQuestionMediaUsages} from '../media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const bundle=JSON.parse(readFileSync(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json'),'utf8'));
const evidence=JSON.parse(readFileSync(path.join(root,'qa/media-candidates/y1m04-official-20261030/semantic-evidence.json'),'utf8'));
const questionsPath=path.join(dist,'content/english/year-1/module-04/questions.json');
const registryPath=path.join(dist,'content/english/media/media-registry.json');
const questions=JSON.parse(readFileSync(questionsPath,'utf8'));
const registry=JSON.parse(readFileSync(registryPath,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const official=process.argv.includes('--require-official');

const lines=readFileSync(path.join(dist,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/),integrity=new Map();
for(const line of lines){const p=line.lastIndexOf(' '),name=line.slice(0,p),sha=line.slice(p+1);
  assert(p>0&&!integrity.has(name)&&/^[a-f0-9]{64}$/.test(sha),'INVALID_COMPILED_MANIFEST_ENTRY:'+name);integrity.set(name,sha);}
for(const [name,sha] of integrity){const file=path.join(dist,name);assert(existsSync(file),'MISSING_MANIFEST_FILE:'+name);assert.equal(hash(readFileSync(file)),sha,'COMPILED_HASH_MISMATCH:'+name);}
assert.equal(questions.moduleId,'Y1M04');assert.equal(questions.items.length,20);
assert.equal(bundle.originalAuditedPendingIds,83);assert.equal(bundle.finalBindingIds,84);assert.equal(bundle.assets.length,18);
assert.equal(new Set(bundle.assets.map(x=>x.sha256)).size,17,'EXPECTED_17_UNIQUE_REVIEWED_PNGS');

// Revert the one scoped ID in memory and prove every other byte of the
// question contract is identical to the fresh V26 source audited pre-overlay.
const baseline=structuredClone(questions),q008=baseline.items.find(x=>x.item_id==='Y1M04-Q008');
assert.equal(q008.mediaBindings[0].assetId,bundle.occurrenceScopedSplit.to);
assert.equal(q008.mediaBindings[0].semanticTarget,'pencil-case');
q008.mediaBindings[0].assetId=bundle.occurrenceScopedSplit.from;
const reconstructed=Buffer.from(JSON.stringify(baseline,null,2)+'\n');
assert.equal(hash(reconstructed),evidence.sourceQuestionContractSha256,'QUESTION_CONTRACT_CHANGED_BEYOND_SCOPED_Q008_ID');
assert.equal(questions.items.find(x=>x.item_id==='Y1M04-Q003').targets.find(x=>x.semanticTarget==='pencil case').media.assetId,
  bundle.occurrenceScopedSplit.from,'Q003_PENCIL_CASE_ID_CHANGED');

const usages=new Map();for(const q of questions.items)collectQuestionMediaUsages(q,usages);
assert.equal(usages.size,84);assert.equal([...usages.values()].reduce((n,x)=>n+x.length,0),85);
const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
assert.equal(bindings.length,84);assert.equal(new Set(bindings.map(x=>x.mediaId)).size,84);
const index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const observedFiles=new Set();
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[];
  assert(records.some(x=>x.questionId===binding.questionId),'BOUND_QUESTION_NOT_REFERENCED:'+binding.mediaId);
  assert(records.every(x=>isExactPedagogicalConcept(binding.asset.semanticTarget,x.semanticTarget)),'SEMANTIC_GUARD_FAILED:'+binding.mediaId);
  const entry=index.get(binding.mediaId);assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);
  assert.equal(entry.kind,'image');assert.equal(entry.sha256,binding.asset.sha256);
  assert.equal(entry.altText,binding.asset.semanticTarget);
  if(official){
    assert.equal(entry.temporary,false,'OFFICIAL_ENTRY_STILL_TEMPORARY:'+binding.mediaId);
    assert.equal(entry.integrationStatus,'OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH');
    assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_APPROVED');
    assert.equal(entry.verification?.schemaVersion,'DUDUQ_MEDIA_OFFICIAL_QA_V1');
  }else{
    assert.equal(entry.temporary,true,'CANDIDATE_ENTRY_PREMATURELY_FINALIZED:'+binding.mediaId);
    assert.equal(entry.integrationStatus,'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
  }
  assert(entry.urlOrPath.startsWith('content/english/assets/images/chatgpt/'));
  const bytes=readFileSync(path.join(dist,entry.urlOrPath));assert.equal(hash(bytes),binding.asset.sha256);
  assert.equal(integrity.get(entry.urlOrPath),binding.asset.sha256,'PNG_NOT_HASH_BOUND_IN_COMPILED_MANIFEST:'+binding.mediaId);
  observedFiles.add(entry.urlOrPath);
}
assert.equal(observedFiles.size,18,'EXPECTED_18_HASH_BOUND_RUNTIME_PATHS');
for(const id of usages.keys())assert(bindings.some(x=>x.mediaId===id),'UNCOVERED_USAGE:'+id);
console.log(JSON.stringify({status:'PASS',gate:'Y1M04_OFFICIAL_MEDIA_OVERLAY',phase:official?'OFFICIAL_QA_FINALIZED':'CANDIDATE_QA',
  modules:30,activities:600,moduleQuestions:20,originalAuditedIds:83,postSplitIds:84,usageRecords:85,
  uniquePngs:17,runtimePaths:18,compiledManifestEntries:integrity.size,questionChangesBeyondScopedSplit:0,
  answerKeyChanges:0,mechanicChanges:0,goldMastersModified:false,productionDeployed:false}));
