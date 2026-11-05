#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,collectReferenceFields,locate,parseIntegrity,sha256,withoutVisualMediaIds
} from '../y3m04-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL);
const manifest=JSON.parse(readFileSync(path.join(bundleDir,'batch-manifest.json'),'utf8')),
  evidence=JSON.parse(readFileSync(path.join(bundleDir,'integration-semantic-evidence.json'),'utf8')),
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
assert.equal(manifest.assets.length,EXPECTED.reviewAssets);
assert.equal(new Set(manifest.assets.map(asset=>asset.sha256)).size,EXPECTED.uniquePngs);
assert.equal(evidence.humanHomologationClaimed,false);assert.equal(evidence.productionReleaseCertified,false);

const bindings=allBindings(manifest),bindingById=new Map(bindings.map(binding=>[binding.mediaId,binding])),
  finalIds=new Set(bindingById.keys()),records=[];
for(const question of questions.items)collectReferenceFields(question,finalIds,records);
assert.equal(bindings.length,EXPECTED.finalIds);assert.equal(finalIds.size,EXPECTED.finalIds);
assert.equal(records.length,EXPECTED.rawReferenceFields);assert.equal(new Set(records.map(record=>record.mediaId)).size,EXPECTED.finalIds);

const reconstructed=structuredClone(questions);
for(const record of records){
  const binding=bindingById.get(record.mediaId);assert(binding,'UNKNOWN_FINAL_BINDING:'+record.mediaId);
  assert.equal(record.questionId,binding.questionId,'BOUND_ID_ESCAPED_QUESTION:'+record.mediaId);
  const question=reconstructed.items.find(item=>item.item_id===record.questionId),{node,key}=locate(question,record.field);
  assert.equal(node?.[key],record.mediaId,'FINAL_FIELD_NOT_APPLIED:'+record.field);node[key]=binding.splitFromMediaId;
}
assert.equal(sha256(Buffer.from(JSON.stringify(reconstructed,null,2)+'\n')),EXPECTED.sourceQuestionSha256,
  'QUESTION_CONTRACT_CHANGED_BEYOND_SCOPED_MEDIA_IDS');
assert.equal(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions)))),EXPECTED.sourceQuestionInvariantSha256);

const registryIndex=new Map(registry.entries.map(entry=>[entry.mediaId,entry])),observedPaths=new Set();
for(const binding of bindings){
  const entry=registryIndex.get(binding.mediaId);assert(entry,'MISSING_REGISTRY_ENTRY:'+binding.mediaId);
  assert.equal(entry.kind,'image');assert.equal(entry.temporary,true);
  assert.equal(entry.integrationStatus,'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING');
  assert.equal(entry.humanResolutionStatus,'PEDAGOGICAL_QA_PENDING');
  assert.equal(entry.sha256,binding.asset.sha256);assert.equal(entry.altText,binding.asset.semanticTarget);
  assert.equal(entry.splitAudit?.questionId,binding.questionId);assert.equal(entry.splitAudit?.fromMediaId,binding.splitFromMediaId);
  assert(entry.urlOrPath.startsWith('content/english/assets/images/chatgpt/'));
  const bytes=readFileSync(path.join(dist,entry.urlOrPath));assert.equal(sha256(bytes),binding.asset.sha256);
  assert.equal(integrity.entries.get(entry.urlOrPath)?.sha,binding.asset.sha256,'PNG_NOT_MANIFEST_BOUND:'+binding.mediaId);
  observedPaths.add(entry.urlOrPath);
  assert(registryIndex.has(binding.splitFromMediaId),'SOURCE_REGISTRY_ENTRY_REMOVED:'+binding.splitFromMediaId);
}
assert.equal(observedPaths.size,EXPECTED.reviewAssets);
assert.equal(new Set([...observedPaths].map(relative=>sha256(readFileSync(path.join(dist,relative))))).size,EXPECTED.uniquePngs);

const globalFinalRecords=[];let modules=0,activities=0;
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
  const mm=String(module).padStart(2,'0'),file=path.join(dist,`content/english/year-${year}/module-${mm}/questions.json`),
    contract=JSON.parse(readFileSync(file,'utf8'));
  modules++;activities+=contract.items.length;
  for(const question of contract.items)collectReferenceFields(question,finalIds,globalFinalRecords);
}
assert.equal(modules,30);assert.equal(activities,600);
assert(globalFinalRecords.every(record=>record.moduleId===MODULE_ID),'SCOPED_ID_ESCAPED_Y3M04');
assert.equal(globalFinalRecords.length,EXPECTED.rawReferenceFields);

console.log(JSON.stringify({status:'PASS',gate:'Y3M04_OFFICIAL_MEDIA_QA_OVERLAY',phase:'CANDIDATE_QA',
  modules,activities,moduleQuestions:EXPECTED.questions,sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  logicalUsageRecords:EXPECTED.logicalUsageRecords,rawReferenceFields:EXPECTED.rawReferenceFields,
  reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,runtimePaths:observedPaths.size,
  compiledManifestEntries:integrity.entries.size,questionChangesBeyondScopedSplits:0,answerKeyChanges:0,
  mechanicChanges:0,goldMastersModified:false,productionDeployed:false,humanHomologationClaimed:false}));
