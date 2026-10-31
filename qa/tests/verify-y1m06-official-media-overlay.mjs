#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {collectQuestionMediaUsages} from '../media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../../scripts/duduq-exact-semantic-match.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,SPLITS,
  allBindings,locate,parseIntegrity,sha256
} from '../y1m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),official=process.argv.includes('--require-official');
const manifest=JSON.parse(readFileSync(path.join(root,BUNDLE_REL,'batch-manifest.json'),'utf8'));
const evidence=JSON.parse(readFileSync(path.join(root,BUNDLE_REL,'semantic-evidence.json'),'utf8'));
const questionPath=path.join(dist,MODULE_PATH),registryPath=path.join(dist,REGISTRY_PATH);
const questions=JSON.parse(readFileSync(questionPath,'utf8')),registry=JSON.parse(readFileSync(registryPath,'utf8'));
const integrity=parseIntegrity(readFileSync(path.join(dist,'.duduq-pages-manifest')));
for(const [name,record] of integrity.entries){
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_MANIFEST_FILE:'+name);
  assert.equal(sha256(readFileSync(file)),record.sha,'COMPILED_HASH_MISMATCH:'+name);
}
assert.equal(questions.moduleId,MODULE_ID);assert.equal(questions.items.length,EXPECTED.questions);
assert.equal(manifest.originalAuditedPendingIds,EXPECTED.sourceIds);
assert.equal(manifest.finalBindingIds,EXPECTED.finalIds);
assert.equal(manifest.totalQuestionUsageRecords,EXPECTED.usageRecords);
assert.equal(manifest.assets.length,EXPECTED.assets);
assert.equal(manifest.occurrenceScopedSplits.length,EXPECTED.splits);
assert.equal(new Set(manifest.assets.map(x=>x.sha256)).size,EXPECTED.assets);

const baseline=structuredClone(questions);
for(const split of SPLITS){
  const question=baseline.items.find(x=>x.item_id===split.questionId);assert(question);
  const {node,key}=locate(question,split.field);
  assert.equal(node?.[key],split.to,'SCOPED_SPLIT_NOT_APPLIED:'+split.to);
  assert(isExactPedagogicalConcept(node?.semanticTarget,split.semanticTarget),'SCOPED_SPLIT_SEMANTIC_MISMATCH:'+split.to);
  node[key]=split.from;
}
assert.equal(sha256(Buffer.from(JSON.stringify(baseline,null,2)+'\n')),EXPECTED.cleanV26QuestionSha256,
  'QUESTION_CONTRACT_CHANGED_BEYOND_SIX_SCOPED_IDS');
assert.equal(evidence.sourceQuestionContractSha256,EXPECTED.cleanV26QuestionSha256);

const usages=new Map();for(const question of questions.items)collectQuestionMediaUsages(question,usages);
assert.equal(usages.size,EXPECTED.finalIds);assert.equal([...usages.values()].reduce((n,x)=>n+x.length,0),EXPECTED.usageRecords);
const bindings=allBindings(manifest);assert.equal(bindings.length,EXPECTED.usageRecords);
assert.equal(new Set(bindings.map(x=>x.mediaId)).size,EXPECTED.finalIds);
const registryIndex=new Map(registry.entries.map(entry=>[entry.mediaId,entry])),observedFiles=new Set();
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[];
  assert.equal(records.length,1,'BOUND_ID_NOT_OCCURRENCE_SCOPED:'+binding.mediaId);
  assert.equal(records[0].questionId,binding.questionId,'BOUND_QUESTION_MISMATCH:'+binding.mediaId);
  assert(isExactPedagogicalConcept(binding.asset.semanticTarget,records[0].semanticTarget),'BOUND_SEMANTIC_MISMATCH:'+binding.mediaId);
  const entry=registryIndex.get(binding.mediaId);assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);
  assert.equal(entry.kind,'image');assert.equal(entry.sha256,binding.asset.sha256);assert.equal(entry.altText,binding.asset.semanticTarget);
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
  const bytes=readFileSync(path.join(dist,entry.urlOrPath));assert.equal(sha256(bytes),binding.asset.sha256);
  assert.equal(integrity.entries.get(entry.urlOrPath)?.sha,binding.asset.sha256,'PNG_NOT_MANIFEST_BOUND:'+binding.mediaId);
  observedFiles.add(entry.urlOrPath);
}
assert.equal(observedFiles.size,EXPECTED.assets);for(const id of usages.keys())assert(bindings.some(x=>x.mediaId===id),'UNCOVERED_USAGE:'+id);

const globalUsages=new Map();let modules=0,activities=0;
for(const year of readdirSync(path.join(dist,'content/english'),{withFileTypes:true}).filter(x=>x.isDirectory()&&/^year-\d+$/.test(x.name))){
  for(const module of readdirSync(path.join(dist,'content/english',year.name),{withFileTypes:true}).filter(x=>x.isDirectory()&&/^module-\d+$/.test(x.name))){
    const file=path.join(dist,'content/english',year.name,module.name,'questions.json');if(!existsSync(file))continue;
    const contract=JSON.parse(readFileSync(file,'utf8'));modules++;activities+=contract.items.length;
    for(const question of contract.items)collectQuestionMediaUsages(question,globalUsages);
  }
}
assert.equal(modules,30);assert.equal(activities,600);
for(const split of SPLITS){
  const oldRecords=globalUsages.get(split.from)||[];
  assert(oldRecords.length>0,'SHARED_SOURCE_ID_LOST:'+split.from);
  assert(oldRecords.every(x=>x.moduleId===split.externalModule),'SHARED_SOURCE_ESCAPED_EXTERNAL_SCOPE:'+split.from);
  const oldEntry=registryIndex.get(split.from);assert(oldEntry,'SHARED_SOURCE_REGISTRY_ENTRY_LOST:'+split.from);
  assert.equal(oldEntry.temporary,true,'EXTERNAL_SHARED_ID_PREMATURELY_FINALIZED:'+split.from);
  const newRecords=globalUsages.get(split.to)||[];
  assert.equal(newRecords.length,1,'SCOPED_ID_USAGE_COUNT:'+split.to);
  assert.equal(newRecords[0].questionId,split.questionId,'SCOPED_ID_ESCAPED_Y1M06:'+split.to);
}

console.log(JSON.stringify({status:'PASS',gate:'Y1M06_OFFICIAL_MEDIA_OVERLAY',phase:official?'OFFICIAL_QA_FINALIZED':'CANDIDATE_QA',
  modules,activities,moduleQuestions:EXPECTED.questions,sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  usageRecords:EXPECTED.usageRecords,occurrenceScopedSplits:EXPECTED.splits,uniquePngs:EXPECTED.assets,
  runtimePaths:observedFiles.size,compiledManifestEntries:integrity.entries.size,questionChangesBeyondScopedSplits:0,
  answerKeyChanges:0,mechanicChanges:0,goldMastersModified:false,productionDeployed:false}));
