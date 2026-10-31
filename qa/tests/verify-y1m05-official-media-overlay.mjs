#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {collectQuestionMediaUsages} from '../media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../../scripts/duduq-exact-semantic-match.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages');
const bundle=JSON.parse(readFileSync(path.join(root,'qa/media-candidates/y1m05-official-20261030/batch-manifest.json'),'utf8'));
const evidence=JSON.parse(readFileSync(path.join(root,'qa/media-candidates/y1m05-official-20261030/semantic-evidence.json'),'utf8'));
const questionsPath=path.join(dist,'content/english/year-1/module-05/questions.json');
const registryPath=path.join(dist,'content/english/media/media-registry.json');
const questions=JSON.parse(readFileSync(questionsPath,'utf8'));
const registry=JSON.parse(readFileSync(registryPath,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const official=process.argv.includes('--require-official');

const lines=readFileSync(path.join(dist,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/),integrity=new Map();
for(const line of lines){
  const p=line.lastIndexOf(' '),name=line.slice(0,p),sha=line.slice(p+1);
  assert(p>0&&!integrity.has(name)&&/^[a-f0-9]{64}$/.test(sha),'INVALID_COMPILED_MANIFEST_ENTRY:'+name);
  integrity.set(name,sha);
}
for(const [name,sha] of integrity){
  const file=path.join(dist,name);
  assert(existsSync(file),'MISSING_MANIFEST_FILE:'+name);
  assert.equal(hash(readFileSync(file)),sha,'COMPILED_HASH_MISMATCH:'+name);
}

assert.equal(questions.moduleId,'Y1M05');
assert.equal(questions.items.length,20);
assert.equal(bundle.originalAuditedPendingIds,101);
assert.equal(bundle.finalBindingIds,101);
assert.equal(bundle.totalQuestionUsageRecords,101);
assert.equal(bundle.assets.length,10);
assert.equal(bundle.occurrenceScopedSplits.length,5);
assert.equal(new Set(bundle.assets.map(x=>x.sha256)).size,10,'EXPECTED_10_UNIQUE_REVIEWED_PNGS');

// Revert only the five audited occurrence-scoped IDs in memory. The resulting
// bytes must exactly match the pre-overlay Y1M05 contract, proving that no
// answer key, mechanic, prompt, or unrelated media binding changed.
const baseline=structuredClone(questions);
function splitSlot(item,field){
  let match=field.match(/^options\[(\d+)]\.media\.assetId$/);
  if(match)return item.options[Number(match[1])].media;
  match=field.match(/^pairs\[(\d+)]\.b\.media\.assetId$/);
  if(match)return item.pairs[Number(match[1])].b.media;
  throw new Error('UNSUPPORTED_SCOPED_SPLIT_FIELD:'+field);
}
for(const split of bundle.occurrenceScopedSplits){
  const item=baseline.items.find(x=>x.item_id===split.questionId);
  assert(item,'SPLIT_QUESTION_NOT_FOUND:'+split.questionId);
  const slot=splitSlot(item,split.field);
  assert.equal(slot.assetId,split.to,'SCOPED_SPLIT_NOT_APPLIED:'+split.to);
  assert(isExactPedagogicalConcept(split.semanticTarget,slot.semanticTarget),'SCOPED_SPLIT_SEMANTIC_MISMATCH:'+split.to);
  slot.assetId=split.from;
}
const reconstructed=Buffer.from(JSON.stringify(baseline,null,2)+'\n');
assert.equal(hash(reconstructed),evidence.sourceQuestionContractSha256,'QUESTION_CONTRACT_CHANGED_BEYOND_FIVE_SCOPED_IDS');

const usages=new Map();
for(const q of questions.items)collectQuestionMediaUsages(q,usages);
assert.equal(usages.size,101);
assert.equal([...usages.values()].reduce((n,x)=>n+x.length,0),101);
const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
assert.equal(bindings.length,101);
assert.equal(new Set(bindings.map(x=>x.mediaId)).size,101);
const index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const observedFiles=new Set();
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[];
  assert(records.some(x=>x.questionId===binding.questionId),'BOUND_QUESTION_NOT_REFERENCED:'+binding.mediaId);
  assert(records.every(x=>isExactPedagogicalConcept(binding.asset.semanticTarget,x.semanticTarget)),'SEMANTIC_GUARD_FAILED:'+binding.mediaId);
  const entry=index.get(binding.mediaId);
  assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);
  assert.equal(entry.kind,'image');
  assert.equal(entry.sha256,binding.asset.sha256);
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
  const bytes=readFileSync(path.join(dist,entry.urlOrPath));
  assert.equal(hash(bytes),binding.asset.sha256);
  assert.equal(integrity.get(entry.urlOrPath),binding.asset.sha256,'PNG_NOT_HASH_BOUND_IN_COMPILED_MANIFEST:'+binding.mediaId);
  observedFiles.add(entry.urlOrPath);
}
assert.equal(observedFiles.size,10,'EXPECTED_10_HASH_BOUND_RUNTIME_PATHS');
for(const id of usages.keys())assert(bindings.some(x=>x.mediaId===id),'UNCOVERED_USAGE:'+id);

// The old five shared IDs stay untouched and provisional for their actual
// remaining Y2M06 occurrences. The five new IDs are scoped to Y1M05 only.
const globalUsages=new Map();
let moduleCount=0,activityCount=0;
for(const year of readdirSync(path.join(dist,'content/english'),{withFileTypes:true}).filter(x=>x.isDirectory()&&/^year-\d+$/.test(x.name))){
  for(const module of readdirSync(path.join(dist,'content/english',year.name),{withFileTypes:true}).filter(x=>x.isDirectory()&&/^module-\d+$/.test(x.name))){
    const file=path.join(dist,'content/english',year.name,module.name,'questions.json');
    if(!existsSync(file))continue;
    const contract=JSON.parse(readFileSync(file,'utf8'));
    moduleCount+=1;activityCount+=contract.items.length;
    for(const question of contract.items)collectQuestionMediaUsages(question,globalUsages);
  }
}
assert.equal(moduleCount,30);assert.equal(activityCount,600);
for(const split of bundle.occurrenceScopedSplits){
  const oldRecords=globalUsages.get(split.from)||[];
  assert(oldRecords.length>0,'SHARED_SOURCE_ID_LOST:'+split.from);
  assert(oldRecords.every(x=>x.questionId==='Y2M06-Q015'),'SHARED_SOURCE_ID_ESCAPED_EXPECTED_CONSUMER:'+split.from);
  const oldEntry=index.get(split.from);
  assert(oldEntry,'SHARED_SOURCE_REGISTRY_ENTRY_LOST:'+split.from);
  assert.equal(oldEntry.temporary,true,'UNRELATED_Y2_SHARED_ID_WAS_FINALIZED:'+split.from);
  const newRecords=globalUsages.get(split.to)||[];
  assert.equal(newRecords.length,1,'SCOPED_ID_USAGE_COUNT:'+split.to);
  assert.equal(newRecords[0].questionId,split.questionId,'SCOPED_ID_ESCAPED_MODULE:'+split.to);
}

console.log(JSON.stringify({
  status:'PASS',gate:'Y1M05_OFFICIAL_MEDIA_OVERLAY',phase:official?'OFFICIAL_QA_FINALIZED':'CANDIDATE_QA',
  modules:moduleCount,activities:activityCount,moduleQuestions:20,originalAuditedIds:101,postSplitIds:101,
  usageRecords:101,occurrenceScopedSplits:5,uniquePngs:10,runtimePaths:10,
  compiledManifestEntries:integrity.size,questionChangesBeyondScopedSplits:0,answerKeyChanges:0,
  mechanicChanges:0,goldMastersModified:false,productionDeployed:false
}));
