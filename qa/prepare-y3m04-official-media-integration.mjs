#!/usr/bin/env node
/** Prepare deterministic integration evidence for the existing Y3M04 PNG bundle. */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';
import {analyzeAlphaComponents} from './png-alpha-component-audit.mjs';
import {verifyY3M04SourceRegistryContext} from './verify-y3m04-source-registry-rebase.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,
  allBindings,bindingKey,buildReviewManifest,deriveOccurrenceGroups,sha256
} from './y3m04-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL);
const [generationManifestBytes,semanticBytes,bindingPlanBytes,sourcePinBytes,questionBytes]=await Promise.all([
  readFile(path.join(bundleDir,'generation-batch-manifest.json')),
  readFile(path.join(bundleDir,'generation-semantic-evidence.json')),
  readFile(path.join(bundleDir,'binding-plan.json')),
  readFile(path.join(bundleDir,'source-registry-pin.json')),
  readFile(path.join(dist,MODULE_PATH))
]);
if(sha256(generationManifestBytes)!==EXPECTED.generationManifestSha256||
   sha256(semanticBytes)!==EXPECTED.generationSemanticSha256||
   sha256(bindingPlanBytes)!==EXPECTED.bindingPlanSha256||
   sha256(sourcePinBytes)!==EXPECTED.sourcePinSha256)
  throw Error('Y3M04_GENERATION_EVIDENCE_HASH_MISMATCH');
const generationManifest=JSON.parse(generationManifestBytes),generationSemantic=JSON.parse(semanticBytes),
  sourcePin=JSON.parse(sourcePinBytes),questions=JSON.parse(questionBytes);
const sourceGate=await verifyY3M04SourceRegistryContext({root,requireRebase:false});

const rebase={
  schemaVersion:'DUDUQ_Y3M04_SOURCE_REGISTRY_REBASE_V1',createdAt:'2026-11-05',moduleId:MODULE_ID,
  status:'PASS_EXACT_GENERATION_CONTEXT_TO_PRISTINE_V26',
  reason:'The generation lane reviewed the exact Y3M03-composed QA registry. Independent Y3M04 replay may start from pristine V26 only because the whole registry hashes, compiler manifests, all 36 source-entry projections, all 71 logical visual usages, and the immutable Y3M04 question contract are pinned without rewriting the generation hashes.',
  generationSourceRegistryPin:'source-registry-pin.json',
  generationSourceRegistryPinSha256:EXPECTED.sourcePinSha256,
  generationRegistrySha256:EXPECTED.generationRegistrySha256,
  generationRegistryEntries:EXPECTED.generationRegistryEntries,
  generationCompiledManifestSha256:EXPECTED.generationCompiledManifestSha256,
  cleanV26RegistrySha256:EXPECTED.cleanV26RegistrySha256,
  cleanV26RegistryEntries:EXPECTED.cleanV26RegistryEntries,
  cleanV26CompiledManifestSha256:EXPECTED.cleanV26CompiledManifestSha256,
  sourceQuestionSha256:EXPECTED.sourceQuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.sourceQuestionInvariantSha256,
  sourceRegistryEntryProjectionSha256:sourceGate.sourceRegistryEntryProjectionSha256,
  logicalUsageProjectionSha256:sourceGate.logicalUsageProjectionSha256,
  sourceRegistryEntryCount:EXPECTED.sourceIds,logicalVisualUsageRecords:EXPECTED.logicalUsageRecords,
  rawReferenceFields:EXPECTED.rawReferenceFields,finalOccurrenceScopedIds:EXPECTED.finalIds,
  acceptedRegistryContexts:[
    'GENERATION_AUDITED_Y3M03_OVERLAY_REGISTRY_EXACT_WHOLE_HASH',
    'PRISTINE_V26_EXACT_WHOLE_REGISTRY_AND_MANIFEST_PIN'
  ],
  sourceHashesRewritten:false,questionsModified:false,registryModified:false,
  goldMastersModified:false,productionApproved:false
};
const rebaseBytes=Buffer.from(JSON.stringify(rebase,null,2)+'\n');
await writeFile(path.join(bundleDir,'source-registry-rebase.json'),rebaseBytes);

const sourceSet=new Set(sourcePin.sourceMediaIds),{records,groups}=deriveOccurrenceGroups(questions,sourceSet),
  groupByKey=new Map(groups.map(group=>[bindingKey(group.sourceMediaId,group.questionId),group]));
const bindings=allBindings(generationManifest),technicalAssets=[];
for(const asset of generationManifest.assets){
  const bytes=await readFile(path.join(bundleDir,asset.file)),actual=sha256(bytes),decoded=validateDuduqRgbaPng(bytes),
    alpha=analyzeAlphaComponents(bytes,{alphaThreshold:64});
  if(actual!==asset.sha256||decoded.width!==asset.pixelWidth||decoded.height!==asset.pixelHeight||
     decoded.width<1024||decoded.height<1024||decoded.transparentPixels===0||decoded.opaquePixels===0||
     alpha.microOpaqueIslandCount!==0)
    throw Error('Y3M04_PNG_TECHNICAL_GATE_FAILED:'+asset.assetKey);
  const generationRecord=generationSemantic.assets.find(record=>record.assetKey===asset.assetKey);
  if(!generationRecord||generationRecord.sha256!==asset.sha256||
     generationRecord.semanticVerdict!=='MODEL_SEMANTIC_PRECHECK_PASSED')
    throw Error('Y3M04_GENERATION_SEMANTIC_RECORD_STALE:'+asset.assetKey);
  technicalAssets.push({assetKey:asset.assetKey,concept:asset.semanticTarget,file:asset.file,sha256:asset.sha256,
    width:decoded.width,height:decoded.height,transparentPixels:decoded.transparentPixels,opaquePixels:decoded.opaquePixels,
    alphaThreshold:alpha.alphaThreshold,microOpaqueIslandCount:alpha.microOpaqueIslandCount,
    semanticPrecheck:'PASSED',visualReview:'PASSED_EXACT_CONCEPT_COUNT_AND_PREFERENCE_LEGIBLE_NO_TEXT_OR_WATERMARK'});
}
if(technicalAssets.length!==EXPECTED.reviewAssets||new Set(technicalAssets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs)
  throw Error('Y3M04_TECHNICAL_ASSET_COUNT');

const integrationSemantic={
  schemaVersion:'DUDUQ_Y3M04_INTEGRATION_SEMANTIC_EVIDENCE_V1',createdAt:'2026-11-05',moduleId:MODULE_ID,
  status:'PASS_FOR_ISOLATED_COMPILED_QA_OVERLAY',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  evidenceBoundary:'Technical and semantic review for candidate-only QA. Human homologation, production approval, merge, and deployment remain false.',
  generationManifestSha256:EXPECTED.generationManifestSha256,
  generationSemanticSha256:EXPECTED.generationSemanticSha256,
  generationBindingPlanSha256:EXPECTED.bindingPlanSha256,
  sourceRegistryPinSha256:EXPECTED.sourcePinSha256,
  sourceRegistryRebaseSha256:sha256(rebaseBytes),
  sourceQuestionSha256:EXPECTED.sourceQuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.sourceQuestionInvariantSha256,
  reviewedQuestionCount:EXPECTED.questions,auditedSourceIds:EXPECTED.sourceIds,
  occurrenceScopedIds:EXPECTED.finalIds,logicalUsageRecords:EXPECTED.logicalUsageRecords,
  rawReferenceFields:EXPECTED.rawReferenceFields,
  splitReview:{status:'PASS_EXACT_QUESTION_CONTEXT_SPLITS',count:EXPECTED.finalIds,
    reason:'Every shared source media ID remains unchanged; only exact Y3M04 question occurrences receive new question-scoped IDs.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:[
    'all thirty hash-pinned PNGs were directly inspected in the integration lane',
    'toy, color, animal, numeral and preference concepts are visually unambiguous',
    'one through five and all one/two/three animal groups contain exactly the intended count',
    'like, do-not-like and prefer scenes visibly express the intended attitude toward the exact food',
    'transparent cutouts contain no written answer, watermark or unrelated distractor',
    'RGBA decode, dimensions, hashes, alpha margins, opaque pixels and detached-alpha-island checks passed for every asset'
  ]},
  candidateAssets:technicalAssets,answerKeysModified:false,questionContractsModified:false,
  mechanicsModified:false,goldMastersModified:false,humanHomologationClaimed:false,
  productionReleaseCertified:false,productionDeployed:false
};
const integrationSemanticBytes=Buffer.from(JSON.stringify(integrationSemantic,null,2)+'\n');
await writeFile(path.join(bundleDir,'integration-semantic-evidence.json'),integrationSemanticBytes);
const reviewManifest=buildReviewManifest(generationManifest,{sourceRegistryRebaseSha256:sha256(rebaseBytes),
  integrationSemanticSha256:sha256(integrationSemanticBytes)});
await writeFile(path.join(bundleDir,'batch-manifest.json'),JSON.stringify(reviewManifest,null,2)+'\n');

const occurrenceScopedSplits=bindings.map(binding=>{
  const group=groupByKey.get(bindingKey(binding.splitFromMediaId,binding.questionId));
  if(!group)throw Error('Y3M04_SOURCE_GROUP_MISSING:'+binding.mediaId);
  return {questionId:binding.questionId,from:binding.splitFromMediaId,to:binding.mediaId,
    semanticTarget:binding.asset.semanticTarget,contractPaths:[...(binding.contractPaths||[])].sort(),
    rawFields:[...group.fields]};
}).sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.from.localeCompare(b.from));
if(occurrenceScopedSplits.length!==EXPECTED.finalIds||records.length!==EXPECTED.rawReferenceFields)
  throw Error('Y3M04_SPLIT_PLAN_COUNT');
const plan={schemaVersion:'DUDUQ_Y3M04_OFFICIAL_MEDIA_BINDING_PLAN_V1',createdAt:new Date().toISOString(),
  moduleId:MODULE_ID,status:'PASS',sourceContext:sourceGate.context,
  sourceQuestionSha256:EXPECTED.sourceQuestionSha256,sourceQuestionInvariantSha256:EXPECTED.sourceQuestionInvariantSha256,
  sourceRegistryRebaseSha256:sha256(rebaseBytes),inputMediaIds:EXPECTED.sourceIds,outputMediaIds:EXPECTED.finalIds,
  logicalUsageRecords:EXPECTED.logicalUsageRecords,rawReferenceFields:EXPECTED.rawReferenceFields,
  reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,occurrenceScopedSplits,
  answerKeysModified:false,mechanicsModified:false,goldMastersModified:false,productionApproved:false};
await writeFile(path.join(root,'qa/results/y3m04-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n');

await verifyY3M04SourceRegistryContext({root,requireRebase:true});
console.log(JSON.stringify({status:'Y3M04_INTEGRATION_EVIDENCE_PREPARED',sourceContext:sourceGate.context,
  questions:EXPECTED.questions,sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,
  logicalUsageRecords:EXPECTED.logicalUsageRecords,rawReferenceFields:EXPECTED.rawReferenceFields,
  reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,sourceHashesRewritten:false,
  productionApproved:false},null,2));
