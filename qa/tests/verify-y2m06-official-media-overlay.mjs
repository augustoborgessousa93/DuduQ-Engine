#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {collectQuestionMediaUsages} from '../media-binding-usage-guard.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,PLAN_REL,REGISTRY_PATH,
  allBindings,locate,normalize,parseIntegrity,sha256,withoutVisualMediaIds
} from '../y2m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL);
const manifest=JSON.parse(readFileSync(path.join(bundleDir,'batch-manifest.json'),'utf8')),
  evidence=JSON.parse(readFileSync(path.join(bundleDir,'semantic-evidence.json'),'utf8')),
  pin=JSON.parse(readFileSync(path.join(bundleDir,'source-registry-pin.json'),'utf8')),
  plan=JSON.parse(readFileSync(path.join(root,PLAN_REL),'utf8')),
  questions=JSON.parse(readFileSync(path.join(dist,MODULE_PATH),'utf8')),
  registry=JSON.parse(readFileSync(path.join(dist,REGISTRY_PATH),'utf8')),
  integrity=parseIntegrity(readFileSync(path.join(dist,'.duduq-pages-manifest')));
for(const [name,record] of integrity.entries){
  const file=path.join(dist,name);assert(existsSync(file),'MISSING_MANIFEST_FILE:'+name);
  assert.equal(sha256(readFileSync(file)),record.sha,'COMPILED_HASH_MISMATCH:'+name);
}
assert.equal(questions.moduleId,MODULE_ID);assert.equal(questions.items.length,EXPECTED.questions);
assert.equal(manifest.originalAuditedPendingIds,EXPECTED.sourceIds);
assert.equal(manifest.finalBindingIds,EXPECTED.finalIds);
assert.equal(manifest.totalQuestionUsageRecords,EXPECTED.logicalUsageRecords);
assert.equal(manifest.actualMediaFieldSplits,EXPECTED.actualMediaFieldSplits);
assert.equal(plan.actualMediaFieldSplits.length,EXPECTED.actualMediaFieldSplits);
assert.equal(manifest.assets.length,EXPECTED.reviewAssets);
assert.equal(new Set(manifest.assets.map(asset=>asset.sha256)).size,EXPECTED.uniquePngs);
assert.equal(evidence.humanHomologationClaimed,false);assert.equal(evidence.productionReleaseCertified,false);

const baseline=structuredClone(questions);
for(const split of plan.actualMediaFieldSplits){
  const question=baseline.items.find(item=>item.item_id===split.questionId);assert(question);
  const {node,key}=locate(question,split.field);assert.equal(node?.[key],split.to,'SCOPED_SPLIT_NOT_APPLIED:'+split.field);
  node[key]=split.from;
}
assert.equal(sha256(Buffer.from(JSON.stringify(baseline,null,2)+'\n')),EXPECTED.cleanV26QuestionSha256,
  'QUESTION_CONTRACT_CHANGED_BEYOND_SCOPED_MEDIA_IDS');
assert.equal(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions)))),EXPECTED.cleanV26QuestionInvariantSha256);

const bindings=allBindings(manifest),finalIds=new Set(bindings.map(binding=>binding.mediaId)),usages=new Map();
for(const question of questions.items)collectQuestionMediaUsages(question,usages);
const finalUsageRows=[...usages].filter(([id])=>finalIds.has(id));
assert.equal(bindings.length,EXPECTED.finalIds);assert.equal(finalIds.size,EXPECTED.finalIds);
assert.equal(finalUsageRows.length,EXPECTED.finalIds);
assert.equal(finalUsageRows.reduce((sum,[,records])=>sum+records.length,0),EXPECTED.guardedUsageRecords);
const registryIndex=new Map(registry.entries.map(entry=>[entry.mediaId,entry])),observedPaths=new Set();
for(const binding of bindings){
  const records=usages.get(binding.mediaId)||[];assert(records.length>0,'BOUND_ID_UNUSED:'+binding.mediaId);
  assert(records.every(record=>record.questionId===binding.questionId),'BOUND_ID_ESCAPED_QUESTION:'+binding.mediaId);
  assert(records.every(record=>normalize(record.semanticTarget)===normalize(binding.asset.semanticTarget)),
    'BOUND_SEMANTIC_MISMATCH:'+binding.mediaId);
  const entry=registryIndex.get(binding.mediaId);assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);
  assert.equal(entry.kind,'image');assert.equal(entry.temporary,true);
  assert.equal(entry.integrationStatus,'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
  assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
  assert.equal(entry.sha256,binding.asset.sha256);assert.equal(entry.altText,binding.asset.semanticTarget);
  assert(entry.urlOrPath.startsWith('content/english/assets/images/chatgpt/'));
  const bytes=readFileSync(path.join(dist,entry.urlOrPath));assert.equal(sha256(bytes),binding.asset.sha256);
  assert.equal(integrity.entries.get(entry.urlOrPath)?.sha,binding.asset.sha256,'PNG_NOT_MANIFEST_BOUND:'+binding.mediaId);
  observedPaths.add(entry.urlOrPath);
}
assert.equal(observedPaths.size,EXPECTED.reviewAssets);
assert.equal(new Set([...observedPaths].map(relative=>sha256(readFileSync(path.join(dist,relative))))).size,EXPECTED.uniquePngs);

const sourceIds=new Set(pin.sourceMediaIds),sourceEntries=pin.sourceMediaIds.slice().sort().map(id=>registryIndex.get(id));
assert(sourceEntries.every(Boolean),'SOURCE_REGISTRY_ENTRY_REMOVED');
assert.equal(sha256(Buffer.from(JSON.stringify(sourceEntries))),pin.sourceRegistryEntryProjectionSha256,
  'SOURCE_REGISTRY_ENTRIES_CHANGED_BY_OVERLAY');
for(const id of sourceIds)assert(!usages.has(id),'SOURCE_MEDIA_ID_REMAINS_IN_Y2M06:'+id);

const globalUsages=new Map();let modules=0,activities=0;
for(const year of readdirSync(path.join(dist,'content/english'),{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^year-\d+$/.test(entry.name))){
  for(const module of readdirSync(path.join(dist,'content/english',year.name),{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^module-\d+$/.test(entry.name))){
    const file=path.join(dist,'content/english',year.name,module.name,'questions.json');if(!existsSync(file))continue;
    const contract=JSON.parse(readFileSync(file,'utf8'));modules++;activities+=contract.items.length;
    for(const question of contract.items)collectQuestionMediaUsages(question,globalUsages);
  }
}
assert.equal(modules,30);assert.equal(activities,600);
for(const id of finalIds){
  const records=globalUsages.get(id)||[];
  assert(records.length>0,'FINAL_ID_UNUSED_GLOBALLY:'+id);
  assert(records.every(record=>record.moduleId===MODULE_ID),'SCOPED_ID_ESCAPED_Y2M06:'+id);
}

console.log(JSON.stringify({status:'PASS',gate:'Y2M06_OFFICIAL_MEDIA_QA_OVERLAY',phase:'CANDIDATE_QA',
  modules,activities,moduleQuestions:EXPECTED.questions,sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  logicalUsageRecords:EXPECTED.logicalUsageRecords,guardedUsageRecords:EXPECTED.guardedUsageRecords,
  actualMediaFieldSplits:EXPECTED.actualMediaFieldSplits,reviewAssets:EXPECTED.reviewAssets,
  uniquePngs:EXPECTED.uniquePngs,runtimePaths:observedPaths.size,compiledManifestEntries:integrity.entries.size,
  questionChangesBeyondScopedMediaIds:0,answerKeyChanges:0,mechanicChanges:0,goldMastersModified:false,
  productionDeployed:false,humanHomologationClaimed:false}));
