#!/usr/bin/env node
/** Fail-closed source and registry gate for the Y3M03 candidate overlay. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,bindingKey,buildReviewManifest,deriveOccurrenceGroups,locate,nodeContainsMediaId,
  parseIntegrity,sha256,withoutVisualMediaIds
} from './y3m03-official-media-model.mjs';

const fail=code=>{throw Error('Y3M03_SOURCE_REGISTRY_REBASE_FAILED:'+code);};

export async function verifyY3M03SourceRegistryContext(options={}){
  const root=path.resolve(options.root||process.cwd()),dist=path.resolve(options.dist||path.join(root,'dist-pages')),
    bundleDir=path.join(root,BUNDLE_REL),requireRebase=options.requireRebase!==false;
  const [manifestBytes,generationManifestBytes,semanticBytes,bindingPlanBytes,questionInventoryBytes,sourcePinBytes,
    alphaAuditBytes,pngValidationBytes,questionBytes,registryBytes,integrityBytes]=await Promise.all([
    readFile(path.join(bundleDir,'batch-manifest.json')),readFile(path.join(bundleDir,'generation-batch-manifest.json')),
    readFile(path.join(bundleDir,'generation-semantic-evidence.json')),
    readFile(path.join(bundleDir,'binding-plan.json')),readFile(path.join(bundleDir,'question-inventory.json')),
    readFile(path.join(bundleDir,'source-registry-pin.json')),readFile(path.join(bundleDir,'alpha-component-audit.json')),
    readFile(path.join(bundleDir,'png-validation.json')),options.questionBytes||readFile(path.join(dist,MODULE_PATH)),
    options.registryBytes||readFile(path.join(dist,REGISTRY_PATH)),
    options.integrityBytes||readFile(path.join(dist,'.duduq-pages-manifest'))
  ]);
  if(sha256(generationManifestBytes)!==EXPECTED.generationManifestSha256||
     sha256(semanticBytes)!==EXPECTED.generationSemanticSha256||
     sha256(bindingPlanBytes)!==EXPECTED.bindingPlanSha256||
     sha256(questionInventoryBytes)!==EXPECTED.questionInventorySha256||
     sha256(sourcePinBytes)!==EXPECTED.sourcePinSha256||
     sha256(alphaAuditBytes)!==EXPECTED.alphaAuditSha256||
     sha256(pngValidationBytes)!==EXPECTED.pngValidationSha256)fail('GENERATION_EVIDENCE_HASH');

  const generationManifest=JSON.parse(generationManifestBytes),semantic=JSON.parse(semanticBytes),bindingPlan=JSON.parse(bindingPlanBytes),
    sourcePin=JSON.parse(sourcePinBytes),questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),
    integrity=parseIntegrity(integrityBytes);
  if(generationManifest.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||generationManifest.moduleId!==MODULE_ID||
     generationManifest.originalAuditedPendingIds!==EXPECTED.sourceIds||generationManifest.finalBindingIds!==EXPECTED.finalIds||
     generationManifest.totalQuestionUsageRecords!==EXPECTED.logicalUsageRecords||generationManifest.questionContractsReviewed!==EXPECTED.questions||
     generationManifest.assets?.length!==EXPECTED.reviewAssets||generationManifest.integrated!==false||generationManifest.productionApproved!==false||
     generationManifest.applicationStatus!=='NOT_APPLIED'||generationManifest.integrationStatus!=='PENDING_INDEPENDENT_INTEGRATION_LANE')
    fail('GENERATION_MANIFEST_SHAPE');
  let manifest;
  if(sha256(manifestBytes)===EXPECTED.generationManifestSha256){
    manifest=JSON.parse(manifestBytes);
  }else{
    const [reviewRebaseBytes,integrationSemanticBytes]=await Promise.all([
      readFile(path.join(bundleDir,'source-registry-rebase.json')),
      readFile(path.join(bundleDir,'integration-semantic-evidence.json'))
    ]);
    const expectedReview=buildReviewManifest(generationManifest,{
      sourceRegistryRebaseSha256:sha256(reviewRebaseBytes),integrationSemanticSha256:sha256(integrationSemanticBytes)
    });
    manifest=JSON.parse(manifestBytes);
    if(JSON.stringify(manifest)!==JSON.stringify(expectedReview))fail('REVIEW_MANIFEST_NOT_EXACT_GENERATION_DERIVATIVE');
  }
  if(semantic.schemaVersion!=='DUDUQ_MEDIA_SEMANTIC_EVIDENCE_V1'||semantic.moduleId!==MODULE_ID||
     semantic.assets?.length!==EXPECTED.reviewAssets||semantic.approvalGranted!==false||
     semantic.humanHomologationClaimed!==false||semantic.productionModified!==false)fail('GENERATION_SEMANTIC_SHAPE');
  if(bindingPlan.schemaVersion!=='DUDUQ_MEDIA_BINDING_PLAN_V1'||bindingPlan.moduleId!==MODULE_ID||
     bindingPlan.pendingMediaIdCount!==EXPECTED.sourceIds||bindingPlan.totalVisualUsageRecords!==EXPECTED.logicalUsageRecords||
     bindingPlan.distinctOccurrenceScopedBindings!==EXPECTED.finalIds||bindingPlan.bindings?.length!==EXPECTED.sourceIds||
     bindingPlan.applicationStatus!=='NOT_APPLIED')fail('GENERATION_BINDING_PLAN_SHAPE');
  if(sourcePin.schemaVersion!=='DUDUQ_Y3M03_SOURCE_REGISTRY_PIN_V1'||sourcePin.moduleId!==MODULE_ID||
     sourcePin.activeQuestionSourceSha256!==EXPECTED.sourceQuestionSha256||
     sourcePin.registrySha256!==EXPECTED.generationRegistrySha256||
     sourcePin.registryEntryCount!==EXPECTED.generationRegistryEntries||
     sourcePin.sourceRegistryEntryProjectionSha256!==EXPECTED.sourceRegistryEntryProjectionSha256||
     sourcePin.sourceMediaIds?.length!==EXPECTED.sourceIds||sourcePin.sourceHashesRewritten!==false)
    fail('GENERATION_SOURCE_PIN_SHAPE');

  const actualQuestionSha256=sha256(questionBytes),actualRegistrySha256=sha256(registryBytes),
    actualManifestSha256=sha256(integrityBytes);
  if(actualQuestionSha256!==EXPECTED.sourceQuestionSha256||questions.moduleId!==MODULE_ID||
     questions.items?.length!==EXPECTED.questions||
     sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==EXPECTED.sourceQuestionInvariantSha256)
    fail('SOURCE_QUESTION_CONTRACT');
  let context;
  if(actualRegistrySha256===EXPECTED.generationRegistrySha256){
    if(registry.entries?.length!==EXPECTED.generationRegistryEntries||
       actualManifestSha256!==EXPECTED.generationCompiledManifestSha256)fail('GENERATION_COMPOSED_CONTEXT');
    context='GENERATION_AUDITED_COMPOSED_REGISTRY_EXACT_WHOLE_HASH';
  }else if(actualRegistrySha256===EXPECTED.cleanV26RegistrySha256){
    if(registry.entries?.length!==EXPECTED.cleanV26RegistryEntries||
       actualManifestSha256!==EXPECTED.cleanV26CompiledManifestSha256)fail('CLEAN_V26_CONTEXT');
    context='PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_PIN';
  }else fail('UNRECOGNIZED_WHOLE_REGISTRY_HASH:'+actualRegistrySha256);
  if(integrity.entries.get(MODULE_PATH)?.sha!==actualQuestionSha256||
     integrity.entries.get(REGISTRY_PATH)?.sha!==actualRegistrySha256)fail('SOURCE_FILES_NOT_MANIFEST_BOUND');

  const registryIndex=new Map();
  for(const entry of registry.entries||[]){
    if(!entry?.mediaId||registryIndex.has(entry.mediaId))fail('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
    registryIndex.set(entry.mediaId,entry);
  }
  const sourceIds=[...sourcePin.sourceMediaIds].sort(),sourceSet=new Set(sourceIds);
  if(sourceSet.size!==EXPECTED.sourceIds)fail('SOURCE_ID_SET');
  const sourceEntries=sourceIds.map(id=>{const entry=registryIndex.get(id);if(!entry)fail('SOURCE_ENTRY_MISSING:'+id);return entry;});
  const entryProjectionSha256=sha256(Buffer.from(JSON.stringify(sourceEntries)));
  if(entryProjectionSha256!==EXPECTED.sourceRegistryEntryProjectionSha256)fail('SOURCE_ENTRY_PROJECTION');

  const bindingBySource=new Map();
  for(const binding of bindingPlan.bindings){
    if(bindingBySource.has(binding.mediaId)||!sourceSet.has(binding.mediaId))fail('DUPLICATE_OR_UNKNOWN_SOURCE_BINDING:'+binding.mediaId);
    const entry=registryIndex.get(binding.mediaId);
    if(entry.kind!=='image'||!isExactPedagogicalConcept(entry.semantic,binding.semanticTarget))
      fail('SOURCE_ENTRY_SEMANTIC_OR_STATUS:'+binding.mediaId);
    bindingBySource.set(binding.mediaId,binding);
  }
  if(bindingBySource.size!==EXPECTED.sourceIds)fail('SOURCE_BINDING_COUNT');

  let logicalUsageRecords=0;const logicalProjection=[];
  for(const binding of bindingPlan.bindings){
    for(const usage of binding.questionUsages||[]){
      const question=questions.items.find(item=>item.item_id===usage.questionId),{node}=locate(question,usage.contractPath);
      if(!question||!nodeContainsMediaId(node,binding.mediaId)||
         !isExactPedagogicalConcept(binding.semanticTarget,usage.semanticTarget))
        fail('LOGICAL_USAGE_CHANGED:'+binding.mediaId+':'+usage.questionId+':'+usage.contractPath);
      logicalProjection.push({mediaId:binding.mediaId,questionId:usage.questionId,contractPath:usage.contractPath,
        semanticTarget:String(usage.semanticTarget),role:usage.role??null,correct:usage.correct??null});
      logicalUsageRecords++;
    }
  }
  logicalProjection.sort((a,b)=>a.mediaId.localeCompare(b.mediaId)||a.questionId.localeCompare(b.questionId)||
    a.contractPath.localeCompare(b.contractPath));
  const logicalUsageProjectionSha256=sha256(Buffer.from(JSON.stringify(logicalProjection)));

  const {records,groups}=deriveOccurrenceGroups(questions,sourceSet),groupByKey=new Map(groups.map(group=>[
    bindingKey(group.sourceMediaId,group.questionId),group
  ]));
  if(logicalUsageRecords!==EXPECTED.logicalUsageRecords||records.length!==EXPECTED.rawReferenceFields||
     groups.length!==EXPECTED.finalIds)fail('SOURCE_USAGE_COUNTS:'+logicalUsageRecords+':'+records.length+':'+groups.length);

  const plannedByKey=new Map();
  for(const source of bindingPlan.bindings)for(const planned of source.occurrenceScopedBindings||[]){
    const key=bindingKey(planned.sourceMediaId,planned.questionId);
    if(plannedByKey.has(key)||planned.sourceMediaId!==source.mediaId||!sourceSet.has(planned.sourceMediaId)||
       !isExactPedagogicalConcept(source.semanticTarget,planned.semanticTarget))fail('INVALID_PLANNED_OCCURRENCE:'+key);
    plannedByKey.set(key,planned);
  }
  const finalBindings=allBindings(manifest),finalIds=new Set(),manifestByKey=new Map();
  for(const binding of finalBindings){
    const key=bindingKey(binding.splitFromMediaId,binding.questionId),planned=plannedByKey.get(key),group=groupByKey.get(key);
    if(manifestByKey.has(key)||finalIds.has(binding.mediaId)||!planned||!group||binding.mediaId!==planned.plannedMediaId||
       binding.asset.file!==bindingBySource.get(binding.splitFromMediaId)?.candidateFile||
       binding.asset.sha256!==bindingBySource.get(binding.splitFromMediaId)?.candidateSha256||
       !isExactPedagogicalConcept(binding.asset.semanticTarget,bindingBySource.get(binding.splitFromMediaId)?.semanticTarget)||
       JSON.stringify([...(binding.contractPaths||[])].sort())!==JSON.stringify([...(planned.contractPaths||[])].sort()))
      fail('MANIFEST_OCCURRENCE_BINDING:'+key);
    manifestByKey.set(key,binding);finalIds.add(binding.mediaId);
  }
  if(finalBindings.length!==EXPECTED.finalIds||finalIds.size!==EXPECTED.finalIds||
     manifestByKey.size!==EXPECTED.finalIds||plannedByKey.size!==EXPECTED.finalIds)
    fail('FINAL_BINDING_COUNT');

  let rebase=null,rebaseSha256=null;
  if(requireRebase){
    const rebaseBytes=await readFile(path.join(bundleDir,'source-registry-rebase.json'));
    rebaseSha256=sha256(rebaseBytes);rebase=JSON.parse(rebaseBytes);
    if(rebase.schemaVersion!=='DUDUQ_Y3M03_SOURCE_REGISTRY_REBASE_V1'||rebase.moduleId!==MODULE_ID||
       rebase.status!=='PASS_EXACT_GENERATION_CONTEXT_TO_PRISTINE_V26'||
       rebase.generationSourceRegistryPinSha256!==EXPECTED.sourcePinSha256||
       rebase.generationRegistrySha256!==EXPECTED.generationRegistrySha256||
       rebase.cleanV26RegistrySha256!==EXPECTED.cleanV26RegistrySha256||
       rebase.sourceQuestionSha256!==EXPECTED.sourceQuestionSha256||
       rebase.sourceQuestionInvariantSha256!==EXPECTED.sourceQuestionInvariantSha256||
       rebase.sourceRegistryEntryProjectionSha256!==entryProjectionSha256||
       rebase.logicalUsageProjectionSha256!==logicalUsageProjectionSha256||
       rebase.sourceHashesRewritten!==false||rebase.productionApproved!==false)
      fail('REBASE_EVIDENCE');
  }
  return {status:'PASS',gate:'Y3M03_SOURCE_REGISTRY_REBASE',context,actualQuestionSha256,
    actualRegistrySha256,actualManifestSha256,sourceRegistryEntryProjectionSha256:entryProjectionSha256,
    logicalUsageProjectionSha256,sourceEntries:sourceSet.size,logicalUsageRecords,
    rawReferenceFields:records.length,finalOccurrenceScopedIds:groups.length,rebaseSha256,
    sourceHashesRewritten:false,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,
    productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyY3M03SourceRegistryContext(),null,2));
