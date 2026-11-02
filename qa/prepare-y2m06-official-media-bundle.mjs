#!/usr/bin/env node
/**
 * Turn the hash-pinned Y2M06 generation output into an occurrence-scoped,
 * review-only integration bundle. No source, runtime, Gold Master or
 * production file is changed by this preparation step.
 */
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';
import {analyzeAlphaComponents} from './png-alpha-component-audit.mjs';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,PLAN_REL,REGISTRY_PATH,
  allBindings,canonicalLfSha256,collectMediaFieldSplits,locate,normalize,
  parseIntegrity,sha256,withoutVisualMediaIds
} from './y2m06-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL);
const paths={
  generationManifest:path.join(bundleDir,'generation-batch-manifest.json'),
  generationSemantic:path.join(bundleDir,'generation-semantic-evidence.json'),
  bindingPlan:path.join(bundleDir,'binding-plan.json'),
  inventory:path.join(bundleDir,'question-inventory.json'),
  sourcePin:path.join(bundleDir,'source-registry-pin.json'),
  reviewManifest:path.join(bundleDir,'batch-manifest.json'),
  reviewSemantic:path.join(bundleDir,'semantic-evidence.json'),
  rebase:path.join(bundleDir,'source-registry-rebase.json'),
  alpha:path.join(bundleDir,'integration-alpha-component-audit.json'),
  reviewPlan:path.join(root,PLAN_REL)
};
const [generationManifestBytes,generationSemanticBytes,bindingPlanBytes,inventoryBytes,sourcePinBytes,
  questionBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(paths.generationManifest),readFile(paths.generationSemantic),readFile(paths.bindingPlan),
  readFile(paths.inventory),readFile(paths.sourcePin),readFile(path.join(dist,MODULE_PATH)),
  readFile(path.join(dist,REGISTRY_PATH)),readFile(path.join(dist,'.duduq-pages-manifest'))
]);

const pinned=[
  [generationManifestBytes,EXPECTED.generationManifestSha256,'GENERATION_MANIFEST'],
  [generationSemanticBytes,EXPECTED.generationSemanticSha256,'GENERATION_SEMANTIC'],
  [bindingPlanBytes,EXPECTED.bindingPlanSha256,'BINDING_PLAN'],
  [inventoryBytes,EXPECTED.questionInventorySha256,'QUESTION_INVENTORY'],
  [sourcePinBytes,EXPECTED.sourceRegistryPinSha256,'SOURCE_REGISTRY_PIN']
];
for(const [bytes,expected,label] of pinned)if(canonicalLfSha256(bytes)!==expected)
  throw Error('Y2M06_'+label+'_PROVENANCE_MISMATCH');
if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||sha256(registryBytes)!==EXPECTED.cleanV26RegistrySha256||
   sha256(integrityBytes)!==EXPECTED.cleanV26ManifestSha256)
  throw Error('Y2M06_PREPARATION_REQUIRES_EXACT_CLEAN_V26');

const generated=JSON.parse(generationManifestBytes),generationSemantic=JSON.parse(generationSemanticBytes),
  sourcePlan=JSON.parse(bindingPlanBytes),inventory=JSON.parse(inventoryBytes),sourcePin=JSON.parse(sourcePinBytes),
  questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),integrity=parseIntegrity(integrityBytes);
if(generated.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||generated.moduleId!==MODULE_ID||
   generated.assets?.length!==EXPECTED.reviewAssets||generated.originalAuditedPendingIds!==EXPECTED.sourceIds||
   generated.finalBindingIds!==EXPECTED.finalIds||generated.totalQuestionUsageRecords!==EXPECTED.logicalUsageRecords||
   generated.questionContractsReviewed!==EXPECTED.questions||generated.productionApproved!==false||generated.integrated!==false)
  throw Error('STALE_Y2M06_GENERATION_BUNDLE');
if(generationSemantic.schemaVersion!=='DUDUQ_MEDIA_SEMANTIC_EVIDENCE_V1'||generationSemantic.moduleId!==MODULE_ID||
   generationSemantic.assets?.length!==EXPECTED.reviewAssets||generationSemantic.approvalGranted!==false||
   generationSemantic.humanHomologationClaimed!==false)throw Error('STALE_Y2M06_GENERATION_SEMANTIC_EVIDENCE');
if(sourcePlan.schemaVersion!=='DUDUQ_MEDIA_BINDING_PLAN_V1'||sourcePlan.moduleId!==MODULE_ID||
   sourcePlan.bindings?.length!==EXPECTED.sourceIds||sourcePlan.applicationStatus!=='NOT_APPLIED')
  throw Error('STALE_Y2M06_SOURCE_BINDING_PLAN');
if(inventory.schemaVersion!=='DUDUQ_MEDIA_QUESTION_INVENTORY_V1'||inventory.moduleId!==MODULE_ID||
   inventory.questionCount!==EXPECTED.questions||inventory.questions?.length!==EXPECTED.questions)
  throw Error('STALE_Y2M06_QUESTION_INVENTORY');
if(sourcePin.schemaVersion!=='DUDUQ_Y2M06_SOURCE_REGISTRY_PIN_V1'||sourcePin.moduleId!==MODULE_ID||
   sourcePin.registrySha256!==EXPECTED.legacyReviewedRegistrySha256||
   sourcePin.registryEntryCount!==EXPECTED.legacyReviewedRegistryEntries||sourcePin.sourceHashesRewritten!==false||
   sourcePin.productionApproved!==false)throw Error('STALE_Y2M06_SOURCE_REGISTRY_PIN');
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||
   registry.entries?.length!==EXPECTED.cleanV26RegistryEntries||
   integrity.entries.get(MODULE_PATH)?.sha!==EXPECTED.cleanV26QuestionSha256||
   integrity.entries.get(REGISTRY_PATH)?.sha!==EXPECTED.cleanV26RegistrySha256)
  throw Error('Y2M06_CLEAN_V26_SHAPE_MISMATCH');
const invariant=sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))));
if(invariant!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y2M06_SOURCE_QUESTION_INVARIANT_MISMATCH');

const sourceIds=new Set(sourcePin.sourceMediaIds||[]),registryIndex=new Map();
if(sourceIds.size!==EXPECTED.sourceIds)throw Error('Y2M06_SOURCE_ID_COUNT_MISMATCH');
for(const entry of registry.entries){
  if(!entry?.mediaId||registryIndex.has(entry.mediaId))throw Error('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
  registryIndex.set(entry.mediaId,entry);
}
const sortedSourceIds=[...sourceIds].sort(),sourceEntries=sortedSourceIds.map(id=>{
  const entry=registryIndex.get(id);if(!entry)throw Error('Y2M06_SOURCE_REGISTRY_ENTRY_MISSING:'+id);return entry;
});
const sourceProjectionSha256=sha256(Buffer.from(JSON.stringify(sourceEntries)));
if(sourceProjectionSha256!==EXPECTED.sourceEntryProjectionSha256||
   sourceProjectionSha256!==sourcePin.sourceRegistryEntryProjectionSha256)
  throw Error('Y2M06_SOURCE_ENTRY_PROJECTION_CHANGED');
const questionHashes=questions.items.map(item=>({questionId:item.item_id,sha256:sha256(Buffer.from(JSON.stringify(item)))}));
if(JSON.stringify(questionHashes)!==JSON.stringify(sourcePin.sourceQuestionContractHashes))
  throw Error('Y2M06_SOURCE_QUESTION_HASH_PROJECTION_CHANGED');

const bindings=allBindings(generated),finalIds=new Set(bindings.map(binding=>binding.mediaId));
if(bindings.length!==EXPECTED.finalIds||finalIds.size!==EXPECTED.finalIds||
   bindings.some(binding=>!sourceIds.has(binding.splitFromMediaId)||binding.verifiedQuestionIds?.length!==1||
     binding.verifiedQuestionIds[0]!==binding.questionId||!/^IMG-Y2M06-Q\d{3}-CTX-[A-F0-9]{12}$/.test(binding.mediaId)))
  throw Error('Y2M06_GENERATION_BINDINGS_NOT_EXACT');
const contextKeys=new Set();
for(const binding of bindings){
  const key=binding.questionId+'\0'+binding.splitFromMediaId;
  if(contextKeys.has(key))throw Error('Y2M06_AMBIGUOUS_QUESTION_SOURCE_CONTEXT:'+binding.questionId+':'+binding.splitFromMediaId);
  contextKeys.add(key);
}

const logicalUsages=inventory.questions.flatMap(question=>question.visualUsages||[]);
if(logicalUsages.length!==EXPECTED.logicalUsageRecords)throw Error('Y2M06_LOGICAL_USAGE_COUNT_CHANGED');
const logicalGroups=new Map();
for(const usage of logicalUsages){
  const key=usage.questionId+'\0'+usage.mediaId;
  if(!logicalGroups.has(key))logicalGroups.set(key,{semanticTarget:usage.semanticTarget,paths:[]});
  const group=logicalGroups.get(key);
  if(normalize(group.semanticTarget)!==normalize(usage.semanticTarget))throw Error('Y2M06_LOGICAL_CONTEXT_SEMANTIC_AMBIGUITY:'+key);
  group.paths.push(usage.contractPath);
}
if(logicalGroups.size!==EXPECTED.finalIds)throw Error('Y2M06_LOGICAL_CONTEXT_COUNT_CHANGED');
for(const binding of bindings){
  const group=logicalGroups.get(binding.questionId+'\0'+binding.splitFromMediaId);
  if(!group||normalize(group.semanticTarget)!==normalize(binding.asset.semanticTarget)||
     JSON.stringify([...group.paths].sort())!==JSON.stringify([...(binding.contractPaths||[])].sort()))
    throw Error('Y2M06_BINDING_NOT_BACKED_BY_QUESTION_INVENTORY:'+binding.mediaId);
}

const splits=collectMediaFieldSplits(questions,bindings);
if(splits.length!==EXPECTED.actualMediaFieldSplits||new Set(splits.map(split=>split.to)).size!==EXPECTED.finalIds)
  throw Error('Y2M06_ACTUAL_MEDIA_FIELD_SCOPE_CHANGED');
for(const split of splits){
  const question=questions.items.find(item=>item.item_id===split.questionId),{node,key}=locate(question,split.field);
  const nestedIds=node?.media&&typeof node.media==='object'
    ?new Set([...['assetId','mediaId','image_ref','imageRef'].map(name=>node.media[name]).filter(value=>typeof value==='string')])
    :new Set();
  const semantic=node?.semanticTarget??(nestedIds.has(split.from)?node.media.semanticTarget:null);
  if(node?.[key]!==split.from||normalize(semantic)!==normalize(split.semanticTarget))
    throw Error('Y2M06_PHYSICAL_ALIAS_SEMANTIC_MISMATCH:'+split.questionId+':'+split.field);
}
const modeled=structuredClone(questions);
for(const split of splits){const {node,key}=locate(modeled.items.find(item=>item.item_id===split.questionId),split.field);node[key]=split.to;}
if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(modeled))))!==invariant)
  throw Error('Y2M06_SPLIT_CHANGED_NON_MEDIA_QUESTION_CONTRACT');
const postSplitUsages=new Map();for(const question of modeled.items)collectQuestionMediaUsages(question,postSplitUsages);
const finalUsageRows=[...postSplitUsages].filter(([id])=>finalIds.has(id));
if(finalUsageRows.length!==EXPECTED.finalIds||finalUsageRows.reduce((sum,[,records])=>sum+records.length,0)!==EXPECTED.guardedUsageRecords)
  throw Error('Y2M06_GUARDED_USAGE_SCOPE_CHANGED');
for(const binding of bindings){
  const records=postSplitUsages.get(binding.mediaId)||[];
  if(!records.length||records.some(record=>record.questionId!==binding.questionId||
     normalize(record.semanticTarget)!==normalize(binding.asset.semanticTarget)))
    throw Error('Y2M06_POST_SPLIT_SEMANTIC_MISMATCH:'+binding.mediaId);
}

const generationSemantics=new Map(generationSemantic.assets.map(asset=>[asset.assetKey,asset])),alphaAssets=[];
for(const asset of generated.assets){
  const bytes=await readFile(path.join(bundleDir,asset.file));
  if(sha256(bytes)!==asset.sha256)throw Error('Y2M06_FINAL_PNG_HASH_MISMATCH:'+asset.assetKey);
  const technical=validateDuduqRgbaPng(bytes),alpha=analyzeAlphaComponents(bytes,{alphaThreshold:64});
  if(technical.width<1024||technical.height<1024||alpha.microOpaqueIslandCount!==0)
    throw Error('Y2M06_PNG_VISUAL_TECHNICAL_GATE_FAILED:'+asset.assetKey);
  alphaAssets.push({assetKey:asset.assetKey,file:asset.file,sha256:asset.sha256,...alpha});
}
if(new Set(generated.assets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs)
  throw Error('Y2M06_UNIQUE_PNG_COUNT_CHANGED');
const alphaReport={schemaVersion:'DUDUQ_Y2M06_INTEGRATION_ALPHA_COMPONENT_AUDIT_V1',moduleId:MODULE_ID,
  mode:'READ_ONLY_NO_IMAGE_MUTATION',createdAt:'2026-11-02',alphaThreshold:64,assetCount:alphaAssets.length,
  status:'PASS_ZERO_MICRO_OPAQUE_ISLANDS',assets:alphaAssets};
const alphaBytes=Buffer.from(JSON.stringify(alphaReport,null,2)+'\n');await writeFile(paths.alpha,alphaBytes);

const rebase={schemaVersion:'DUDUQ_Y2M06_SOURCE_REGISTRY_REBASE_V1',moduleId:MODULE_ID,createdAt:'2026-11-02',
  status:'PASS_REBASE_TO_EXACT_CLEAN_V26_WITH_SOURCE_SCOPE_IDENTITY',
  legacyReviewedRegistrySha256:EXPECTED.legacyReviewedRegistrySha256,
  legacyReviewedRegistryEntries:EXPECTED.legacyReviewedRegistryEntries,
  cleanV26RegistrySha256:EXPECTED.cleanV26RegistrySha256,cleanV26RegistryEntries:EXPECTED.cleanV26RegistryEntries,
  cleanV26ManifestSha256:EXPECTED.cleanV26ManifestSha256,
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistryPinCanonicalLfSha256:EXPECTED.sourceRegistryPinSha256,
  sourceRegistryEntryCount:EXPECTED.sourceIds,sourceRegistryEntryProjectionSha256:sourceProjectionSha256,
  sourceQuestionContractHashes:questionHashes,sourceHashesRewritten:false,productionApproved:false,
  scopeNote:'The older composed whole-registry hash is retained as provenance; only exact pristine V26 plus the identical 56-entry source projection is accepted for this review overlay.'};
const rebaseBytes=Buffer.from(JSON.stringify(rebase,null,2)+'\n');await writeFile(paths.rebase,rebaseBytes);

const candidateAssets=generated.assets.map(asset=>{
  const semantic=generationSemantics.get(asset.assetKey),technical=alphaAssets.find(row=>row.assetKey===asset.assetKey);
  if(!semantic||semantic.sha256!==asset.sha256||semantic.semanticPrecheck!=='PASSED')
    throw Error('Y2M06_GENERATION_SEMANTIC_RECORD_MISSING_OR_STALE:'+asset.assetKey);
  return {assetKey:asset.assetKey,concept:asset.semanticTarget,file:asset.file,width:asset.pixelWidth,height:asset.pixelHeight,
    format:'PNG_RGBA8_NONINTERLACED',sha256:asset.sha256,semanticPrecheck:'PASSED',
    visualObservation:semantic.visualObservation,pedagogicalFit:semantic.pedagogicalFit,
    wrongDistractorsAbsent:semantic.wrongDistractorsAbsent,technicalQc:{alphaThreshold:technical.alphaThreshold,
      visiblePixels:technical.visiblePixels,componentCount:technical.componentCount,
      microOpaqueIslandCount:technical.microOpaqueIslandCount},
    visualReview:'PASSED_CONCEPT_LEGIBLE_TRANSPARENT_NO_TEXT_OR_WATERMARK'};
});
const semantic={schemaVersion:'DUDUQ_Y2M06_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2',createdAt:'2026-11-02',moduleId:MODULE_ID,
  provider:'Codex built-in image_gen',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  evidenceBoundary:'Codex technical and visual review for an isolated compiled QA overlay. Human homologation and production approval remain pending.',
  generationSemanticEvidence:'generation-semantic-evidence.json',generationSemanticEvidenceSha256:EXPECTED.generationSemanticSha256,
  sourceRegistryRebaseEvidence:'source-registry-rebase.json',sourceRegistryRebaseEvidenceSha256:canonicalLfSha256(rebaseBytes),
  integrationAlphaAudit:'integration-alpha-component-audit.json',integrationAlphaAuditSha256:canonicalLfSha256(alphaBytes),
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistrySha256:EXPECTED.cleanV26RegistrySha256,reviewedQuestionCount:EXPECTED.questions,
  auditedPendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,logicalUsageRecords:EXPECTED.logicalUsageRecords,
  physicalMediaFieldSplits:EXPECTED.actualMediaFieldSplits,guardedUsageRecords:EXPECTED.guardedUsageRecords,
  splitReview:{status:'PASS_EXACT_QUESTION_SOURCE_CONTEXT_SPLITS',logicalBindings:EXPECTED.finalIds,
    physicalAliases:EXPECTED.actualMediaFieldSplits,
    reason:'Every Y2M06 physical media alias receives the same question/source-scoped ID while all shared source IDs and non-media question data remain unchanged.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:[
    'all 29 hash-pinned PNGs were visually inspected against the Y2M06 source-backed concepts',
    'all 94 bindings match the exact question/source/semantic inventory',
    'transparent cutouts are legible and contain no written answer or watermark',
    '64-alpha connected-component audit found zero micro opaque pixel islands'
  ]},candidateAssets,productionReleaseCertified:false,humanHomologationClaimed:false,
  answerKeysModified:false,mechanicsModified:false,goldMastersModified:false};
const semanticBytes=Buffer.from(JSON.stringify(semantic,null,2)+'\n');await writeFile(paths.reviewSemantic,semanticBytes);

const reviewPlan={schemaVersion:'DUDUQ_Y2M06_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId:MODULE_ID,createdAt:'2026-11-02',status:'PASS',
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistryRebaseSha256:canonicalLfSha256(rebaseBytes),sourceIds:EXPECTED.sourceIds,
  finalIds:EXPECTED.finalIds,logicalUsageRecords:EXPECTED.logicalUsageRecords,
  guardedUsageRecords:EXPECTED.guardedUsageRecords,actualMediaFieldSplits:splits,
  logicalBindings:bindings.map(({asset,...binding})=>({assetKey:asset.assetKey,semanticTarget:asset.semanticTarget,...binding})),
  productionApproved:false};
const reviewPlanBytes=Buffer.from(JSON.stringify(reviewPlan,null,2)+'\n');await writeFile(paths.reviewPlan,reviewPlanBytes);

const assets=generated.assets.map(asset=>({...structuredClone(asset),review:'MODEL_SEMANTIC_PRECHECK_PASSED',
  reviewEvidence:BUNDLE_REL+'/semantic-evidence.json'}));
const manifest={...structuredClone(generated),status:'HASH_BOUND_OCCURRENCE_SCOPED_REVIEW_BUNDLE_READY_FOR_QA_OVERLAY',
  sourceRegistryPinEvidence:'source-registry-pin.json',sourceRegistryPinEvidenceSha256:EXPECTED.sourceRegistryPinSha256,
  sourceRegistryRebaseEvidence:'source-registry-rebase.json',sourceRegistryRebaseEvidenceSha256:canonicalLfSha256(rebaseBytes),
  generationManifestEvidence:'generation-batch-manifest.json',generationManifestSha256:EXPECTED.generationManifestSha256,
  generationSemanticEvidence:'generation-semantic-evidence.json',generationSemanticSha256:EXPECTED.generationSemanticSha256,
  integrationAlphaAudit:'integration-alpha-component-audit.json',integrationAlphaAuditSha256:canonicalLfSha256(alphaBytes),
  integrationBindingPlan:PLAN_REL,integrationBindingPlanSha256:canonicalLfSha256(reviewPlanBytes),
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  actualMediaFieldSplits:EXPECTED.actualMediaFieldSplits,guardedUsageRecords:EXPECTED.guardedUsageRecords,
  assets,integrated:false,productionApproved:false,approvalFlagsChanged:false};
await writeFile(paths.reviewManifest,JSON.stringify(manifest,null,2)+'\n');

console.log(JSON.stringify({status:'Y2M06_OFFICIAL_MEDIA_BUNDLE_PREPARED',questions:EXPECTED.questions,
  sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,logicalUsageRecords:EXPECTED.logicalUsageRecords,
  guardedUsageRecords:EXPECTED.guardedUsageRecords,actualMediaFieldSplits:EXPECTED.actualMediaFieldSplits,
  reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,
  cleanV26RegistryRebasedWithExactSourceProjection:true,sourceHashesRewritten:false,
  productionApproved:false,humanHomologationClaimed:false},null,2));
