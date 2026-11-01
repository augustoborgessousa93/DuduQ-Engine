#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {collectQuestionMediaUsages} from '../media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../../scripts/duduq-exact-semantic-match.mjs';
import {
  bundleRel,locate,moduleId,questionsRel,registryRel,sha256,sharedSourceIds,splits,withoutMediaIds
} from '../y1m02-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),official=process.argv.includes('--require-official');
const bundle=JSON.parse(readFileSync(path.join(root,bundleRel,'batch-manifest.json'),'utf8'));
const evidence=JSON.parse(readFileSync(path.join(root,bundleRel,'semantic-evidence.json'),'utf8'));
const questions=JSON.parse(readFileSync(path.join(dist,questionsRel),'utf8'));
const registry=JSON.parse(readFileSync(path.join(dist,registryRel),'utf8'));
const integrity=new Map();
for(const line of readFileSync(path.join(dist,'.duduq-pages-manifest'),'utf8').trimEnd().split(/\r?\n/)){
  const p=line.lastIndexOf(' '),name=line.slice(0,p),hash=line.slice(p+1);assert(p>0&&!integrity.has(name)&&/^[a-f0-9]{64}$/.test(hash),'INVALID_COMPILED_MANIFEST_ENTRY:'+name);
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_COMPILED_FILE:'+name);assert.equal(sha256(readFileSync(file)),hash,'COMPILED_HASH_MISMATCH:'+name);integrity.set(name,hash);
}
assert.equal(questions.moduleId,moduleId);assert.equal(questions.items.length,20);
assert.equal(bundle.originalAuditedPendingIds,92);assert.equal(bundle.originalQuestionUsageRecords,94);assert.equal(bundle.finalBindingIds,93);
assert.equal(bundle.totalQuestionUsageRecords,94);assert.equal(bundle.uniqueNativePngs,10);assert.equal(bundle.assets.length,10);assert.equal(bundle.occurrenceScopedSplits.length,11);
assert.equal(sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions)))),evidence.sourceQuestionInvariantSha256,'QUESTION_CONTENT_ANSWER_OR_MECHANIC_INVARIANT_CHANGED');
for(const split of splits){
  const question=questions.items.find(x=>x.item_id===split.questionId),{node,key}=locate(question,split.field);
  assert.equal(node?.[key],split.to,'SPLIT_TARGET_NOT_APPLIED:'+split.to);assert(isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget),'SPLIT_SEMANTIC_CHANGED:'+split.to);
}

const usages=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,usages);
assert.equal(usages.size,93);assert.equal([...usages.values()].reduce((n,x)=>n+x.length,0),94);
for(const id of sharedSourceIds)assert(!usages.has(id),'SHARED_SOURCE_ID_REMAINS_IN_Y1M02:'+id);
const bindings=bundle.assets.flatMap(asset=>asset.bindings.map(binding=>({asset,...binding})));
assert.equal(bindings.length,93);assert.equal(new Set(bindings.map(x=>x.mediaId)).size,93);assert.equal(new Set(bundle.assets.map(x=>x.sha256)).size,10);
const index=new Map(registry.entries.map(x=>[x.mediaId,x])),runtimePaths=new Set(),runtimeHashes=new Set();
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[],questionIds=[...new Set(records.map(x=>x.questionId))].sort();
  assert(records.length>0,'BOUND_MEDIA_NOT_REFERENCED:'+binding.mediaId);assert.equal(JSON.stringify(questionIds),JSON.stringify([...binding.verifiedQuestionIds].sort()));
  assert(records.every(x=>x.moduleId===moduleId&&isExactPedagogicalConcept(binding.asset.semanticTarget,x.semanticTarget)),'SEMANTIC_GUARD_FAILED:'+binding.mediaId);
  const entry=index.get(binding.mediaId);assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);assert.equal(entry.kind,'image');
  assert.equal(entry.sha256,binding.asset.sha256);assert.equal(entry.altText,binding.asset.semanticTarget);
  if(official){
    assert.equal(entry.temporary,false,'OFFICIAL_ENTRY_STILL_TEMPORARY:'+binding.mediaId);assert.equal(entry.integrationStatus,'OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH');
    assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_APPROVED');assert.equal(entry.verification?.schemaVersion,'DUDUQ_MEDIA_OFFICIAL_QA_V1');
  }else{
    assert.equal(entry.temporary,true,'CANDIDATE_ENTRY_PREMATURELY_FINALIZED:'+binding.mediaId);assert.equal(entry.integrationStatus,'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
  }
  assert(entry.urlOrPath.startsWith('content/english/assets/images/chatgpt/'));const bytes=readFileSync(path.join(dist,entry.urlOrPath));
  assert.equal(sha256(bytes),binding.asset.sha256);assert.equal(integrity.get(entry.urlOrPath),binding.asset.sha256,'PNG_NOT_HASH_BOUND:'+binding.mediaId);
  runtimePaths.add(entry.urlOrPath);runtimeHashes.add(entry.sha256);
}
assert.equal(runtimePaths.size,10);assert.equal(runtimeHashes.size,10);for(const id of usages.keys())assert(bindings.some(x=>x.mediaId===id),'UNCOVERED_FINAL_MEDIA_ID:'+id);

const newIds=new Set(splits.map(x=>x.to)),globalNew=new Map([...newIds].map(id=>[id,[]])),globalOld=new Map(sharedSourceIds.map(id=>[id,[]]));
let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let n=1;n<=6;n++){
  const mm=String(n).padStart(2,'0'),contract=JSON.parse(readFileSync(path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`),'utf8'));
  assert.equal(contract.items?.length,20,'GLOBAL_MODULE_NOT_20:'+contract.moduleId);modules++;activities+=contract.items.length;
  const map=new Map();for(const question of contract.items)collectQuestionMediaUsages(question,map);
  for(const id of newIds)if(map.has(id))globalNew.get(id).push(...map.get(id));
  for(const id of sharedSourceIds)if(map.has(id))globalOld.get(id).push(...map.get(id));
}
assert.equal(modules,30);assert.equal(activities,600);
for(const id of newIds){const records=globalNew.get(id);assert(records.length===1,'NEW_OCCURRENCE_ID_NOT_SINGLE_USE:'+id);assert(records.every(x=>x.moduleId===moduleId),'NEW_SCOPED_ID_ESCAPED_Y1M02:'+id);}
for(const id of sharedSourceIds){
  const records=globalOld.get(id),entry=index.get(id);assert(records.length>0,'SHARED_SOURCE_EXTERNAL_CONSUMER_LOST:'+id);assert(records.every(x=>x.moduleId!==moduleId),'SHARED_SOURCE_REMAINS_LOCAL:'+id);
  assert(entry,'SHARED_SOURCE_REGISTRY_ENTRY_LOST:'+id);assert.equal(entry.temporary,true,'SHARED_SOURCE_WAS_FINALIZED:'+id);
}
console.log(JSON.stringify({status:'PASS',gate:'Y1M02_OFFICIAL_MEDIA_OVERLAY',phase:official?'OFFICIAL_QA_FINALIZED':'CANDIDATE_QA',
  modules,activities,moduleQuestions:20,sourceAuditedIds:92,sourceUsageRecords:94,finalMediaIds:93,finalUsageRecords:94,
  occurrenceScopedSplits:11,sharedSourceIds:10,uniqueNativePngs:10,runtimePaths:10,compiledManifestEntries:integrity.size,
  questionContentAnswerMechanicChanges:0,goldMastersModified:false,productionDeployed:false}));
