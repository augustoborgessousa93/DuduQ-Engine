#!/usr/bin/env node
/** Fail-closed pristine-V26 source pin for the Y2M01 review overlay. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  collectVisualUsages,parseIntegrity,sha256,withoutVisualMediaIds
} from './y2m01-official-media-model.mjs';

const fail=code=>{throw Error('Y2M01_SOURCE_REGISTRY_PIN_FAILED:'+code);};

export async function verifyY2M01SourceRegistryContext(options={}){
  const root=path.resolve(options.root||process.cwd()),dist=path.resolve(options.dist||path.join(root,'dist-pages')),
    bundleDir=path.join(root,BUNDLE_REL);
  const [manifestBytes,pinBytes,generationManifestBytes,generationSemanticBytes,bindingPlanBytes,questionInventoryBytes,
    questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'source-registry-pin.json')),
    readFile(path.join(bundleDir,'generation-batch-manifest.json')),readFile(path.join(bundleDir,'generation-semantic-evidence.json')),
    readFile(path.join(bundleDir,'binding-plan.json')),readFile(path.join(bundleDir,'question-inventory.json')),
    options.questionBytes||readFile(path.join(dist,MODULE_PATH)),options.registryBytes||readFile(path.join(dist,REGISTRY_PATH)),
    options.integrityBytes||readFile(path.join(dist,'.duduq-pages-manifest'))
  ]);
  const manifest=JSON.parse(manifestBytes),pin=JSON.parse(pinBytes),questions=JSON.parse(questionBytes),
    registry=JSON.parse(registryBytes),bindingPlan=JSON.parse(bindingPlanBytes),integrity=parseIntegrity(integrityBytes);
  if(manifest.moduleId!==MODULE_ID||manifest.sourceRegistryPinEvidence!=='source-registry-pin.json'||
     manifest.sourceRegistryPinEvidenceSha256!==sha256(pinBytes))fail('BUNDLE_PIN_REFERENCE');
  if(pin.schemaVersion!=='DUDUQ_Y2M01_SOURCE_REGISTRY_PIN_V1'||pin.moduleId!==MODULE_ID||
     pin.status!=='PASS_EXACT_PRISTINE_V26_ONLY'||pin.productionApproved!==false||pin.sourceHashesRewritten!==false)
    fail('PIN_SCHEMA');
  if(sha256(generationManifestBytes)!==EXPECTED.generationManifestSha256||
     sha256(generationSemanticBytes)!==EXPECTED.generationSemanticSha256||sha256(bindingPlanBytes)!==EXPECTED.bindingPlanSha256||
     sha256(questionInventoryBytes)!==EXPECTED.questionInventorySha256)fail('GENERATION_EVIDENCE_HASH');
  if(pin.generationManifestSha256!==EXPECTED.generationManifestSha256||pin.generationSemanticSha256!==EXPECTED.generationSemanticSha256||
     pin.bindingPlanSha256!==EXPECTED.bindingPlanSha256||pin.questionInventorySha256!==EXPECTED.questionInventorySha256)
    fail('PIN_GENERATION_LINKS');
  if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||sha256(registryBytes)!==EXPECTED.cleanV26RegistrySha256||
     sha256(integrityBytes)!==EXPECTED.cleanV26ManifestSha256)fail('EXACT_PRISTINE_V26_HASHES');
  if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||
     registry.entries?.length!==EXPECTED.cleanV26RegistryEntries||
     sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==EXPECTED.cleanV26QuestionInvariantSha256)
    fail('SOURCE_SHAPE_OR_INVARIANT');
  if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(questionBytes)||
     integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(registryBytes))fail('SOURCE_FILES_NOT_MANIFEST_BOUND');

  const sourceIds=new Set((bindingPlan.bindings||[]).map(binding=>binding.mediaId));
  if(sourceIds.size!==EXPECTED.sourceIds||[...sourceIds].sort().join('\0')!==[...pin.sourceMediaIds].sort().join('\0'))
    fail('SOURCE_ID_SET');
  const usages=new Map();for(const question of questions.items)collectVisualUsages(question,sourceIds,usages);
  const usageRecords=[...usages.values()].reduce((sum,records)=>sum+records.length,0);
  if(usages.size!==EXPECTED.sourceIds||usageRecords!==EXPECTED.sourceUsageRecords)fail('SOURCE_USAGE_COUNT');
  const registryIndex=new Map();
  for(const entry of registry.entries){
    if(!entry?.mediaId||registryIndex.has(entry.mediaId))fail('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
    registryIndex.set(entry.mediaId,entry);
  }
  const sortedIds=[...sourceIds].sort(),entries=sortedIds.map(id=>{
    const entry=registryIndex.get(id);if(!entry)fail('SOURCE_ENTRY_MISSING:'+id);return entry;
  });
  const usageProjection=sortedIds.map(mediaId=>({mediaId,records:usages.get(mediaId).map(record=>({
    questionId:record.questionId,moduleId:record.moduleId,field:record.field,semanticTarget:record.semanticTarget
  }))}));
  const entryProjectionSha256=sha256(Buffer.from(JSON.stringify(entries))),
    usageProjectionSha256=sha256(Buffer.from(JSON.stringify(usageProjection)));
  if(entryProjectionSha256!==pin.sourceRegistryEntryProjectionSha256||usageProjectionSha256!==pin.sourceUsageProjectionSha256||
     pin.sourceRegistryEntryCount!==EXPECTED.sourceIds||pin.sourceQuestionUsageRecords!==EXPECTED.sourceUsageRecords||
     pin.finalBindingIds!==EXPECTED.finalIds||pin.occurrenceScopedSplitRecords!==EXPECTED.splitRecords)
    fail('SOURCE_SCOPE_PIN');
  return {status:'PASS',gate:'Y2M01_SOURCE_REGISTRY_PIN',context:'PRISTINE_V26_EXACT_WHOLE_MANIFEST_AND_REGISTRY_PIN',
    actualManifestSha256:sha256(integrityBytes),actualRegistrySha256:sha256(registryBytes),
    sourceRegistryEntryProjectionSha256:entryProjectionSha256,sourceUsageProjectionSha256:usageProjectionSha256,
    sourceEntries:sourceIds.size,sourceUsageRecords:usageRecords,sourceHashesRewritten:false,
    answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyY2M01SourceRegistryContext(),null,2));
