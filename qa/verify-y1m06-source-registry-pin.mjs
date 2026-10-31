#!/usr/bin/env node
/**
 * Fail-closed source pin for the Y1M06 overlay. Accepts only pristine V26 or
 * the exact hash-bound Y1M04 official predecessor. It never rewrites hashes.
 */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,parseIntegrity,sha256,withoutMediaIds
} from './y1m06-official-media-model.mjs';

const fail=code=>{throw Error('Y1M06_SOURCE_REGISTRY_PIN_FAILED:'+code)};

function sourceProjection(questions,registry){
  const usages=new Map();
  for(const question of questions.items||[])collectQuestionMediaUsages(question,usages);
  const ids=[...usages.keys()].sort(),usageRecords=[...usages.values()].reduce((n,x)=>n+x.length,0);
  if(ids.length!==EXPECTED.sourceIds||usageRecords!==EXPECTED.usageRecords)fail('SOURCE_USAGE_COUNT:'+ids.length+':'+usageRecords);
  const registryIndex=new Map();
  for(const entry of registry.entries||[]){
    if(!entry?.mediaId||registryIndex.has(entry.mediaId))fail('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
    registryIndex.set(entry.mediaId,entry);
  }
  const entries=ids.map(id=>{
    const entry=registryIndex.get(id);
    if(!entry)fail('SOURCE_ENTRY_MISSING:'+id);
    if(entry.kind!=='image'||entry.temporary!==true)fail('SOURCE_ENTRY_NOT_PROVISIONAL_IMAGE:'+id);
    for(const record of usages.get(id))if(!isExactPedagogicalConcept(entry.semantic,record.semanticTarget))
      fail('SOURCE_ENTRY_SEMANTIC_MISMATCH:'+id+':'+entry.semantic+':'+record.semanticTarget);
    return entry;
  });
  const usageProjection=ids.map(mediaId=>({mediaId,records:usages.get(mediaId).map(record=>({
    questionId:record.questionId,moduleId:record.moduleId,semanticTarget:record.semanticTarget
  }))}));
  return {ids,usages,usageRecords,entries,registryIndex,
    entryProjectionSha256:sha256(Buffer.from(JSON.stringify(entries))),
    usageProjectionSha256:sha256(Buffer.from(JSON.stringify(usageProjection)))};
}

function outsideY1M04Projection(registry,y1m04Bundle){
  const bindings=allBindings(y1m04Bundle),ids=new Set(bindings.map(x=>x.mediaId));
  if(y1m04Bundle.moduleId!=='Y1M04'||bindings.length!==84||ids.size!==84)fail('Y1M04_SCOPE_BINDINGS_INVALID');
  const present=registry.entries.filter(entry=>ids.has(entry.mediaId));
  const outside=registry.entries.filter(entry=>!ids.has(entry.mediaId));
  return {ids,present:present.length,outside,count:outside.length,sha256:sha256(Buffer.from(JSON.stringify(outside)))};
}

async function verifyY1M04Predecessor({root,dist,registry,integrity,projection,y1m04Bundle,outside}){
  if(registry.entries?.length!==EXPECTED.cleanV26RegistryEntries+1)fail('PREDECESSOR_REGISTRY_ENTRY_COUNT');
  if(outside.present!==84)fail('PREDECESSOR_Y1M04_ENTRY_COUNT');
  const evidenceRel='content/english/media/qa-evidence/y1m04-official-media-qa.json';
  const evidenceBytes=await readFile(path.join(dist,evidenceRel)),evidenceSha256=sha256(evidenceBytes);
  if(integrity.entries.get(evidenceRel)?.sha!==evidenceSha256)fail('Y1M04_EVIDENCE_NOT_MANIFEST_BOUND');
  const evidence=JSON.parse(evidenceBytes);
  if(evidence.schemaVersion!=='DUDUQ_MEDIA_OFFICIAL_QA_V1'||evidence.status!=='PASS'||evidence.moduleId!=='Y1M04'||
     evidence.pedagogicalQaApproved!==true||evidence.visualQaApproved!==true||evidence.browserQaApproved!==true||
     evidence.productionReleaseApproved!==false||evidence.finalMediaIds!==84||evidence.globalActivitiesVerified!==600)
    fail('Y1M04_EVIDENCE_INVALID');
  const questions=JSON.parse(await readFile(path.join(dist,'content/english/year-1/module-04/questions.json')));
  const usages=new Map();for(const question of questions.items||[])collectQuestionMediaUsages(question,usages);
  if(questions.moduleId!=='Y1M04'||questions.items?.length!==20||usages.size!==84||
     [...usages.values()].reduce((n,x)=>n+x.length,0)!==85)fail('Y1M04_QUESTION_SCOPE_INVALID');
  for(const binding of allBindings(y1m04Bundle)){
    const entry=projection.registryIndex.get(binding.mediaId),records=usages.get(binding.mediaId)||[];
    if(!entry||entry.temporary!==false||entry.integrationStatus!=='OFFICIAL_MEDIA_QA_PASSED_REVIEW_BRANCH'||
       entry.sha256!==binding.asset.sha256||entry.verification?.evidenceSha256!==evidenceSha256||!records.length||
       records.some(record=>!isExactPedagogicalConcept(binding.asset.semanticTarget,record.semanticTarget)))
      fail('Y1M04_PREDECESSOR_ENTRY_INVALID:'+binding.mediaId);
    if(integrity.entries.get(entry.urlOrPath)?.sha!==binding.asset.sha256||
       sha256(await readFile(path.join(dist,entry.urlOrPath)))!==binding.asset.sha256)
      fail('Y1M04_PREDECESSOR_ASSET_HASH:'+binding.mediaId);
  }
  return {moduleId:'Y1M04',mediaIds:84,evidencePath:evidenceRel,evidenceSha256,
    browserReportSha256:evidence.browserQa?.sha256,productionReleaseApproved:false};
}

export async function verifyY1M06SourceRegistryContext(options={}){
  const root=path.resolve(options.root||process.cwd()),dist=path.resolve(options.dist||path.join(root,'dist-pages'));
  const bundleDir=path.join(root,BUNDLE_REL);
  const [manifestBytes,pinBytes,y1m04Bytes,questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'source-registry-pin.json')),
    readFile(path.join(root,'qa/media-candidates/y1m04-official-20261030/batch-manifest.json')),
    options.questionBytes||readFile(path.join(dist,MODULE_PATH)),options.registryBytes||readFile(path.join(dist,REGISTRY_PATH)),
    options.integrityBytes||readFile(path.join(dist,'.duduq-pages-manifest'))
  ]);
  const manifest=JSON.parse(manifestBytes),pin=JSON.parse(pinBytes),y1m04Bundle=JSON.parse(y1m04Bytes),
    questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),integrity=parseIntegrity(integrityBytes);
  if(manifest.moduleId!==MODULE_ID||manifest.sourceRegistryPinEvidence!=='source-registry-pin.json'||
     manifest.sourceRegistryPinEvidenceSha256!==sha256(pinBytes))fail('BUNDLE_PIN_REFERENCE');
  if(pin.schemaVersion!=='DUDUQ_Y1M06_SOURCE_REGISTRY_PIN_V1'||pin.moduleId!==MODULE_ID||
     pin.status!=='PASS_EXACT_CLEAN_V26_AND_SCOPED_Y1M04_PREDECESSOR'||pin.productionApproved!==false||
     pin.sourceHashesRewritten!==false)fail('PIN_SCHEMA');
  if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||questions.moduleId!==MODULE_ID||
     questions.items?.length!==EXPECTED.questions||
     sha256(Buffer.from(JSON.stringify(withoutMediaIds(questions))))!==EXPECTED.cleanV26QuestionInvariantSha256)
    fail('SOURCE_QUESTION_CONTRACT');
  if(integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(registryBytes)||integrity.entries.get(MODULE_PATH)?.sha!==sha256(questionBytes))
    fail('SOURCE_FILES_NOT_MANIFEST_BOUND');
  const projection=sourceProjection(questions,registry);
  if(projection.entryProjectionSha256!==EXPECTED.sourceRegistryEntryProjectionSha256||
     projection.usageProjectionSha256!==EXPECTED.sourceUsageProjectionSha256)
    fail('Y1M06_SOURCE_SCOPE_PIN');
  const outside=outsideY1M04Projection(registry,y1m04Bundle);
  if(outside.count!==EXPECTED.registryEntriesOutsideY1M04||outside.sha256!==EXPECTED.registryEntriesOutsideY1M04Sha256)
    fail('REGISTRY_OUTSIDE_Y1M04_SCOPE_PIN');
  const actualRegistrySha256=sha256(registryBytes);
  let context,predecessor=null;
  if(actualRegistrySha256===EXPECTED.cleanV26RegistrySha256){
    if(registry.entries.length!==EXPECTED.cleanV26RegistryEntries||outside.present!==83)fail('CLEAN_V26_REGISTRY_SHAPE');
    context='PRISTINE_V26_EXACT_WHOLE_REGISTRY_PIN';
  }else{
    predecessor=await verifyY1M04Predecessor({root,dist,registry,integrity,projection,y1m04Bundle,outside});
    context='Y1M04_OFFICIAL_PREDECESSOR_WITH_HASH_BOUND_EVIDENCE_AND_EXACT_Y1M06_SCOPE_PIN';
  }
  return {status:'PASS',gate:'Y1M06_SOURCE_REGISTRY_PIN',context,actualRegistrySha256,
    cleanV26RegistrySha256:EXPECTED.cleanV26RegistrySha256,
    sourceRegistryEntryProjectionSha256:projection.entryProjectionSha256,
    sourceUsageProjectionSha256:projection.usageProjectionSha256,sourceEntries:projection.ids.length,
    sourceUsageRecords:projection.usageRecords,registryEntriesOutsideY1M04:outside.count,
    registryEntriesOutsideY1M04Sha256:outside.sha256,predecessor,sourceHashesRewritten:false,
    answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyY1M06SourceRegistryContext(),null,2));
