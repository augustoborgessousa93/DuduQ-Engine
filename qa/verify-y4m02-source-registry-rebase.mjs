#!/usr/bin/env node
/** Fail-closed source and registry gate for the Y4M02 candidate overlay. */
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,bindingKey,buildReviewManifest,canonicalTextBytes,deriveOccurrenceGroups,locate,nodeContainsMediaId,
  parseIntegrity,sha256,withoutVisualMediaIds
} from './y4m02-official-media-model.mjs';

const fail=code=>{throw Error('Y4M02_SOURCE_REGISTRY_REBASE_FAILED:'+code);};
const questionHash=question=>sha256(Buffer.from(JSON.stringify(question)));
const projectedSourceEntries=entries=>entries.map(entry=>({
  mediaId:entry.mediaId,status:entry.status,temporary:entry.temporary,
  semantic:entry.semantic??entry.altText??null,urlOrPath:entry.urlOrPath??null,assets:entry.assets??[]
}));

export async function verifyY4M02SourceRegistryContext(options={}){
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
  if(sha256(canonicalTextBytes(generationManifestBytes))!==EXPECTED.generationManifestSha256||
     sha256(canonicalTextBytes(semanticBytes))!==EXPECTED.generationSemanticSha256||
     sha256(canonicalTextBytes(bindingPlanBytes))!==EXPECTED.bindingPlanSha256||
     sha256(canonicalTextBytes(questionInventoryBytes))!==EXPECTED.questionInventorySha256||
     sha256(canonicalTextBytes(sourcePinBytes))!==EXPECTED.sourcePinSha256||
     sha256(canonicalTextBytes(alphaAuditBytes))!==EXPECTED.alphaAuditSha256||
     sha256(canonicalTextBytes(pngValidationBytes))!==EXPECTED.pngValidationSha256)fail('GENERATION_EVIDENCE_HASH');

  const generationManifest=JSON.parse(generationManifestBytes),semantic=JSON.parse(semanticBytes),
    bindingPlan=JSON.parse(bindingPlanBytes),questionInventory=JSON.parse(questionInventoryBytes),
    sourcePin=JSON.parse(sourcePinBytes),questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),
    integrity=parseIntegrity(integrityBytes);
  if(generationManifest.schemaVersion!=='DUDUQ_Y4M02_GENERATION_BATCH_MANIFEST_V1'||
     generationManifest.moduleId!==MODULE_ID||generationManifest.lane!=='generation'||
     generationManifest.questionContractsReviewed!==EXPECTED.questions||
     generationManifest.sourcePendingMediaIds!==EXPECTED.sourceIds||
     generationManifest.coveredSourceMediaIds!==EXPECTED.sourceIds||
     generationManifest.assets?.length!==EXPECTED.reviewAssets||generationManifest.assetCount!==EXPECTED.reviewAssets||
     generationManifest.integrated!==false||generationManifest.productionApproved!==false||
     generationManifest.questionsModified!==false||generationManifest.registryModified!==false)
    fail('GENERATION_MANIFEST_SHAPE');
  if(semantic.schemaVersion!=='DUDUQ_Y4M02_GENERATION_SEMANTIC_EVIDENCE_V1'||semantic.moduleId!==MODULE_ID||
     semantic.assets?.length!==EXPECTED.reviewAssets||semantic.questionContractsReviewed!==EXPECTED.questions||
     semantic.humanApprovalClaimed!==false||semantic.productionApproved!==false||semantic.integrated!==false)
    fail('GENERATION_SEMANTIC_SHAPE');
  if(bindingPlan.schemaVersion!=='DUDUQ_Y4M02_OCCURRENCE_SCOPED_BINDING_PLAN_V1'||
     bindingPlan.moduleId!==MODULE_ID||bindingPlan.sourcePendingMediaIdCount!==EXPECTED.sourceIds||
     bindingPlan.coveredSourceMediaIdCount!==EXPECTED.sourceIds||
     bindingPlan.occurrenceScopedBindingCount!==EXPECTED.finalIds||bindingPlan.bindings?.length!==EXPECTED.finalIds||
     bindingPlan.mode!=='PLAN_ONLY_NO_SOURCE_OR_REGISTRY_MUTATION'||bindingPlan.overlayApplied!==false)
    fail('GENERATION_BINDING_PLAN_SHAPE');
  if(questionInventory.schemaVersion!=='DUDUQ_Y4M02_QUESTION_INVENTORY_V1'||
     questionInventory.questionCount!==EXPECTED.questions||questionInventory.visualUsageCount!==EXPECTED.logicalUsageRecords||
     questionInventory.occurrenceScopedBindingGroupCount!==EXPECTED.finalIds||
     questionInventory.sourcePendingMediaIdCount!==EXPECTED.sourceIds||questionInventory.answersModified!==false)
    fail('GENERATION_QUESTION_INVENTORY_SHAPE');
  if(sourcePin.schemaVersion!=='DUDUQ_Y4M02_SOURCE_REGISTRY_PIN_V1'||sourcePin.moduleId!==MODULE_ID||
     sourcePin.activeQuestionSourceSha256!==EXPECTED.sourceQuestionSha256||
     sourcePin.registrySha256!==EXPECTED.generationRegistrySha256||
     sourcePin.registryEntryCount!==EXPECTED.generationRegistryEntries||
     sourcePin.sourceRegistryEntryProjectionSha256!==EXPECTED.sourceRegistryEntryProjectionSha256||
     sourcePin.sourceMediaIds?.length!==EXPECTED.sourceIds||sourcePin.sourceHashesRewritten!==false)
    fail('GENERATION_SOURCE_PIN_SHAPE');

  let manifest;
  if(sha256(canonicalTextBytes(manifestBytes))===EXPECTED.candidateManifestSha256){
    manifest=JSON.parse(manifestBytes);
    if(manifest.schemaVersion!=='DUDUQ_Y4M02_CANDIDATE_BATCH_V1'||
       JSON.stringify(manifest.assets)!==JSON.stringify(generationManifest.assets))
      fail('INITIAL_CANDIDATE_MANIFEST_SHAPE');
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

  const actualQuestionSha256=sha256(questionBytes),actualRegistrySha256=sha256(registryBytes),
    actualManifestSha256=sha256(integrityBytes);
  if(actualQuestionSha256!==EXPECTED.sourceQuestionSha256||questions.moduleId!==MODULE_ID||
     questions.items?.length!==EXPECTED.questions||
     sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))))!==EXPECTED.sourceQuestionInvariantSha256)
    fail('SOURCE_QUESTION_CONTRACT');
  const pinnedQuestionHashes=new Map(sourcePin.sourceQuestionContractHashes?.map(item=>[item.questionId,item.sha256]));
  if(pinnedQuestionHashes.size!==EXPECTED.questions||questions.items.some(question=>
    pinnedQuestionHashes.get(question.item_id)!==questionHash(question)))fail('SOURCE_QUESTION_ITEM_HASH');

  let context;
  if(actualRegistrySha256===EXPECTED.generationRegistrySha256){
    if(registry.entries?.length!==EXPECTED.generationRegistryEntries||
       actualManifestSha256!==EXPECTED.generationCompiledManifestSha256)fail('GENERATION_COMPOSED_CONTEXT');
    context='GENERATION_AUDITED_COMPOSED_QA_REGISTRY_EXACT_WHOLE_HASH';
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
  const entryProjectionSha256=sha256(Buffer.from(JSON.stringify(projectedSourceEntries(sourceEntries),null,2)+'\n'));
  if(entryProjectionSha256!==EXPECTED.sourceRegistryEntryProjectionSha256)fail('SOURCE_ENTRY_PROJECTION');

  const {records,groups}=deriveOccurrenceGroups(questions,sourceSet),groupByKey=new Map(groups.map(group=>[
    bindingKey(group.sourceMediaId,group.questionId),group
  ]));
  if(records.length!==EXPECTED.rawReferenceFields||groups.length!==EXPECTED.finalIds||
     new Set(records.map(record=>record.mediaId)).size!==EXPECTED.sourceIds)
    fail('SOURCE_USAGE_COUNTS:'+records.length+':'+groups.length);

  const plannedByKey=new Map(),logicalProjection=[];
  for(const planned of bindingPlan.bindings){
    const key=bindingKey(planned.sourceMediaId,planned.questionId),group=groupByKey.get(key),
      question=questions.items.find(item=>item.item_id===planned.questionId),entry=registryIndex.get(planned.sourceMediaId);
    if(plannedByKey.has(key)||!group||!question||!entry||entry.kind!=='image'||
       planned.sourceQuestionContractSha256!==questionHash(question)||
       !isExactPedagogicalConcept(entry.semantic??entry.altText,planned.semanticTarget))
      fail('INVALID_PLANNED_OCCURRENCE:'+key);
    for(const contractPath of planned.contractPaths||[]){
      const {node}=locate(question,contractPath);
      if(!nodeContainsMediaId(node,planned.sourceMediaId))fail('LOGICAL_USAGE_CHANGED:'+key+':'+contractPath);
      logicalProjection.push({sourceMediaId:planned.sourceMediaId,questionId:planned.questionId,contractPath,
        semanticTarget:String(planned.semanticTarget),roles:[...(planned.roles||[])].sort(),
        optionOrCardIds:[...(planned.optionOrCardIds||[])].sort()});
    }
    plannedByKey.set(key,planned);
  }
  logicalProjection.sort((a,b)=>a.sourceMediaId.localeCompare(b.sourceMediaId)||
    a.questionId.localeCompare(b.questionId)||a.contractPath.localeCompare(b.contractPath));
  if(plannedByKey.size!==EXPECTED.finalIds||logicalProjection.length!==EXPECTED.logicalUsageRecords)
    fail('PLANNED_USAGE_COUNT:'+plannedByKey.size+':'+logicalProjection.length);
  const logicalUsageProjectionSha256=sha256(Buffer.from(JSON.stringify(logicalProjection)));

  const finalBindings=allBindings(manifest),finalIds=new Set(),manifestByKey=new Map();
  for(const binding of finalBindings){
    const key=bindingKey(binding.splitFromMediaId,binding.questionId),planned=plannedByKey.get(key),group=groupByKey.get(key);
    if(manifestByKey.has(key)||finalIds.has(binding.mediaId)||!planned||!group||
       binding.mediaId!==planned.plannedMediaId||binding.asset.file!==planned.candidateFile||
       binding.asset.sha256!==planned.candidateSha256||
       !isExactPedagogicalConcept(binding.asset.semanticTarget,planned.semanticTarget)||
       JSON.stringify([...(binding.contractPaths||[])].sort())!==JSON.stringify([...(planned.contractPaths||[])].sort()))
      fail('MANIFEST_OCCURRENCE_BINDING:'+key);
    manifestByKey.set(key,binding);finalIds.add(binding.mediaId);
  }
  if(finalBindings.length!==EXPECTED.finalIds||finalIds.size!==EXPECTED.finalIds||
     manifestByKey.size!==EXPECTED.finalIds)fail('FINAL_BINDING_COUNT');

  let rebase=null,rebaseSha256=null;
  if(requireRebase){
    const rebaseBytes=await readFile(path.join(bundleDir,'source-registry-rebase.json'));
    rebaseSha256=sha256(rebaseBytes);rebase=JSON.parse(rebaseBytes);
    if(rebase.schemaVersion!=='DUDUQ_Y4M02_SOURCE_REGISTRY_REBASE_V1'||rebase.moduleId!==MODULE_ID||
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
  return {status:'PASS',gate:'Y4M02_SOURCE_REGISTRY_REBASE',context,actualQuestionSha256,
    actualRegistrySha256,actualManifestSha256,sourceRegistryEntryProjectionSha256:entryProjectionSha256,
    logicalUsageProjectionSha256,sourceEntries:sourceSet.size,logicalUsageRecords:logicalProjection.length,
    rawReferenceFields:records.length,finalOccurrenceScopedIds:groups.length,rebaseSha256,
    sourceHashesRewritten:false,answerKeysChanged:0,mechanicsChanged:0,goldMastersModified:false,
    productionDeployed:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  console.log(JSON.stringify(await verifyY4M02SourceRegistryContext(),null,2));



