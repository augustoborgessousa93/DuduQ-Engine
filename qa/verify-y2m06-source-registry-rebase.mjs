#!/usr/bin/env node
/** Fail-closed clean-V26 rebase gate for the Y2M06 review overlay. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,PLAN_REL,REGISTRY_PATH,
  allBindings,canonicalLfSha256,parseIntegrity,sha256,withoutVisualMediaIds
} from './y2m06-official-media-model.mjs';

const fail=code=>{throw Error('Y2M06_SOURCE_REGISTRY_REBASE_FAILED:'+code);};

export async function verifyY2M06SourceRegistryContext(options={}){
  const root=path.resolve(options.root||process.cwd()),dist=path.resolve(options.dist||path.join(root,'dist-pages')),
    bundleDir=path.join(root,BUNDLE_REL);
  const [manifestBytes,semanticBytes,rebaseBytes,sourcePinBytes,generationManifestBytes,generationSemanticBytes,
    bindingPlanBytes,inventoryBytes,reviewPlanBytes,questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'semantic-evidence.json')),
    readFile(path.join(bundleDir,'source-registry-rebase.json')),readFile(path.join(bundleDir,'source-registry-pin.json')),
    readFile(path.join(bundleDir,'generation-batch-manifest.json')),readFile(path.join(bundleDir,'generation-semantic-evidence.json')),
    readFile(path.join(bundleDir,'binding-plan.json')),readFile(path.join(bundleDir,'question-inventory.json')),
    readFile(path.join(root,PLAN_REL)),options.questionBytes||readFile(path.join(dist,MODULE_PATH)),
    options.registryBytes||readFile(path.join(dist,REGISTRY_PATH)),
    options.integrityBytes||readFile(path.join(dist,'.duduq-pages-manifest'))
  ]);
  const manifest=JSON.parse(manifestBytes),semantic=JSON.parse(semanticBytes),rebase=JSON.parse(rebaseBytes),
    sourcePin=JSON.parse(sourcePinBytes),questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),
    reviewPlan=JSON.parse(reviewPlanBytes),integrity=parseIntegrity(integrityBytes);
  if(manifest.moduleId!==MODULE_ID||manifest.sourceRegistryPinEvidence!=='source-registry-pin.json'||
     manifest.sourceRegistryPinEvidenceSha256!==EXPECTED.sourceRegistryPinSha256||
     manifest.sourceRegistryRebaseEvidence!=='source-registry-rebase.json'||
     manifest.sourceRegistryRebaseEvidenceSha256!==canonicalLfSha256(rebaseBytes)||
     manifest.integrationBindingPlan!==PLAN_REL||manifest.integrationBindingPlanSha256!==canonicalLfSha256(reviewPlanBytes))
    fail('BUNDLE_EVIDENCE_REFERENCES');
  if(rebase.schemaVersion!=='DUDUQ_Y2M06_SOURCE_REGISTRY_REBASE_V1'||rebase.moduleId!==MODULE_ID||
     rebase.status!=='PASS_REBASE_TO_EXACT_CLEAN_V26_WITH_SOURCE_SCOPE_IDENTITY'||
     rebase.legacyReviewedRegistrySha256!==EXPECTED.legacyReviewedRegistrySha256||
     rebase.legacyReviewedRegistryEntries!==EXPECTED.legacyReviewedRegistryEntries||
     rebase.cleanV26RegistrySha256!==EXPECTED.cleanV26RegistrySha256||
     rebase.cleanV26ManifestSha256!==EXPECTED.cleanV26ManifestSha256||rebase.sourceHashesRewritten!==false||
     rebase.productionApproved!==false)fail('REBASE_SCHEMA_OR_HASH_LINKS');
  if(sourcePin.schemaVersion!=='DUDUQ_Y2M06_SOURCE_REGISTRY_PIN_V1'||sourcePin.moduleId!==MODULE_ID||
     canonicalLfSha256(sourcePinBytes)!==EXPECTED.sourceRegistryPinSha256||
     sourcePin.registrySha256!==EXPECTED.legacyReviewedRegistrySha256||sourcePin.registryEntryCount!==EXPECTED.legacyReviewedRegistryEntries||
     sourcePin.sourceHashesRewritten!==false||sourcePin.productionApproved!==false)fail('LEGACY_SOURCE_PIN');
  const evidenceHashes=[
    [generationManifestBytes,EXPECTED.generationManifestSha256],[generationSemanticBytes,EXPECTED.generationSemanticSha256],
    [bindingPlanBytes,EXPECTED.bindingPlanSha256],[inventoryBytes,EXPECTED.questionInventorySha256]
  ];
  if(evidenceHashes.some(([bytes,expected])=>canonicalLfSha256(bytes)!==expected))fail('GENERATION_EVIDENCE_HASH');
  if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||sha256(registryBytes)!==EXPECTED.cleanV26RegistrySha256||
     sha256(integrityBytes)!==EXPECTED.cleanV26ManifestSha256)fail('EXACT_PRISTINE_V26_HASHES');
  if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||
     registry.entries?.length!==EXPECTED.cleanV26RegistryEntries||
     sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==EXPECTED.cleanV26QuestionInvariantSha256)
    fail('SOURCE_SHAPE_OR_INVARIANT');
  if(integrity.entries.get(MODULE_PATH)?.sha!==sha256(questionBytes)||
     integrity.entries.get(REGISTRY_PATH)?.sha!==sha256(registryBytes))fail('SOURCE_FILES_NOT_MANIFEST_BOUND');

  const sourceIds=[...(sourcePin.sourceMediaIds||[])].sort();
  if(sourceIds.length!==EXPECTED.sourceIds||new Set(sourceIds).size!==EXPECTED.sourceIds)fail('SOURCE_ID_SET');
  const registryIndex=new Map();
  for(const entry of registry.entries){
    if(!entry?.mediaId||registryIndex.has(entry.mediaId))fail('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
    registryIndex.set(entry.mediaId,entry);
  }
  const entries=sourceIds.map(id=>{const entry=registryIndex.get(id);if(!entry)fail('SOURCE_ENTRY_MISSING:'+id);return entry;});
  const entryProjectionSha256=sha256(Buffer.from(JSON.stringify(entries)));
  if(entryProjectionSha256!==EXPECTED.sourceEntryProjectionSha256||
     entryProjectionSha256!==sourcePin.sourceRegistryEntryProjectionSha256||
     entryProjectionSha256!==rebase.sourceRegistryEntryProjectionSha256)fail('SOURCE_SCOPE_PIN');
  const questionHashes=questions.items.map(item=>({questionId:item.item_id,sha256:sha256(Buffer.from(JSON.stringify(item)))}));
  if(JSON.stringify(questionHashes)!==JSON.stringify(sourcePin.sourceQuestionContractHashes)||
     JSON.stringify(questionHashes)!==JSON.stringify(rebase.sourceQuestionContractHashes))fail('QUESTION_HASH_PROJECTION');

  const bindings=allBindings(manifest),sourceSet=new Set(sourceIds);
  if(bindings.length!==EXPECTED.finalIds||new Set(bindings.map(binding=>binding.mediaId)).size!==EXPECTED.finalIds||
     bindings.some(binding=>!sourceSet.has(binding.splitFromMediaId)))fail('REVIEW_BINDING_SCOPE');
  if(reviewPlan.schemaVersion!=='DUDUQ_Y2M06_OFFICIAL_MEDIA_BINDING_PLAN_V1'||reviewPlan.status!=='PASS'||
     reviewPlan.actualMediaFieldSplits?.length!==EXPECTED.actualMediaFieldSplits||
     reviewPlan.logicalBindings?.length!==EXPECTED.finalIds||reviewPlan.productionApproved!==false)fail('REVIEW_PLAN_SCOPE');
  if(semantic.schemaVersion!=='DUDUQ_Y2M06_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2'||
     semantic.sourceRegistryRebaseEvidenceSha256!==canonicalLfSha256(rebaseBytes)||
     semantic.sourceQuestionContractSha256!==EXPECTED.cleanV26QuestionSha256||
     semantic.sourceQuestionInvariantSha256!==EXPECTED.cleanV26QuestionInvariantSha256||
     semantic.humanHomologationClaimed!==false||semantic.productionReleaseCertified!==false)fail('SEMANTIC_EVIDENCE_LINK');
  return {status:'PASS',gate:'Y2M06_SOURCE_REGISTRY_REBASE',
    context:'PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_WITH_LEGACY_PIN_PRESERVED',
    actualManifestSha256:sha256(integrityBytes),actualRegistrySha256:sha256(registryBytes),
    legacyReviewedRegistrySha256:EXPECTED.legacyReviewedRegistrySha256,
    sourceRegistryEntryProjectionSha256:entryProjectionSha256,sourceEntries:sourceIds.length,
    sourceQuestionContracts:questionHashes.length,sourceHashesRewritten:false,answerKeysChanged:0,
    mechanicsChanged:0,goldMastersModified:false,productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyY2M06SourceRegistryContext(),null,2));
