#!/usr/bin/env node
/**
 * Convert the hash-pinned Y2M01 generation candidates into an occurrence-safe
 * review bundle. Only QA metadata in qa/media-candidates and qa/results is
 * written; source questions, runtime, Gold Masters and production stay intact.
 */
import {readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {validateDuduqRgbaPng} from './validate-duduq-png.mjs';
import {analyzeAlphaComponents} from './png-alpha-component-audit.mjs';
import {
  BUNDLE_REL,EXPECTED,MODULE_ID,MODULE_PATH,REGISTRY_PATH,
  allBindings,canonicalLfSha256,deriveOccurrenceGroups,locate,parseIntegrity,sha256,withoutVisualMediaIds
} from './y2m01-official-media-model.mjs';

const root=process.cwd(),dist=path.join(root,'dist-pages'),bundleDir=path.join(root,BUNDLE_REL);
const generationManifestPath=path.join(bundleDir,'generation-batch-manifest.json');
const reviewManifestPath=path.join(bundleDir,'batch-manifest.json');
const generationSemanticPath=path.join(bundleDir,'generation-semantic-evidence.json');
const reviewSemanticPath=path.join(bundleDir,'semantic-evidence.json');
const bindingPlanPath=path.join(bundleDir,'binding-plan.json');
const questionInventoryPath=path.join(bundleDir,'question-inventory.json');

async function preserveGenerationFile({reviewPath,generationPath,expectedSha256,label}){
  let generationBytes;
  try{generationBytes=await readFile(generationPath);}
  catch(error){
    if(error.code!=='ENOENT')throw error;
    const current=await readFile(reviewPath);
    if(canonicalLfSha256(current)!==expectedSha256)throw Error(label+'_HASH_MISMATCH_BEFORE_PRESERVATION');
    generationBytes=current;await writeFile(generationPath,current);
  }
  if(canonicalLfSha256(generationBytes)!==expectedSha256)throw Error(label+'_PROVENANCE_MISMATCH');
  return generationBytes;
}

const generationManifestBytes=await preserveGenerationFile({reviewPath:reviewManifestPath,generationPath:generationManifestPath,
  expectedSha256:EXPECTED.generationManifestSha256,label:'Y2M01_GENERATION_MANIFEST'});
const generationSemanticBytes=await preserveGenerationFile({reviewPath:reviewSemanticPath,generationPath:generationSemanticPath,
  expectedSha256:EXPECTED.generationSemanticSha256,label:'Y2M01_GENERATION_SEMANTIC'});
const [bindingPlanBytes,questionInventoryBytes,questionBytes,registryBytes,integrityBytes]=await Promise.all([
  readFile(bindingPlanPath),readFile(questionInventoryPath),readFile(path.join(dist,MODULE_PATH)),
  readFile(path.join(dist,REGISTRY_PATH)),readFile(path.join(dist,'.duduq-pages-manifest'))
]);
if(canonicalLfSha256(bindingPlanBytes)!==EXPECTED.bindingPlanSha256||
   canonicalLfSha256(questionInventoryBytes)!==EXPECTED.questionInventorySha256)
  throw Error('Y2M01_GENERATION_PLANNING_EVIDENCE_MISMATCH');
if(sha256(questionBytes)!==EXPECTED.cleanV26QuestionSha256||sha256(registryBytes)!==EXPECTED.cleanV26RegistrySha256||
   sha256(integrityBytes)!==EXPECTED.cleanV26ManifestSha256)
  throw Error('Y2M01_PREPARATION_REQUIRES_EXACT_CLEAN_V26');

const generated=JSON.parse(generationManifestBytes),generationSemantic=JSON.parse(generationSemanticBytes),
  bindingPlan=JSON.parse(bindingPlanBytes),questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),
  integrity=parseIntegrity(integrityBytes);
if(generated.schemaVersion!=='DUDUQ_CHATGPT_MEDIA_BINDINGS_V1'||generated.moduleId!==MODULE_ID||
   generated.assets?.length!==EXPECTED.uniquePngs||generated.originalAuditedPendingIds!==EXPECTED.sourceIds||
   generated.finalBindingIds!==EXPECTED.sourceIds||generated.questionContractsReviewed!==EXPECTED.questions||
   generated.productionApproved!==false||generated.integrated!==false)
  throw Error('STALE_Y2M01_GENERATION_BUNDLE');
if(generationSemantic.schemaVersion!=='DUDUQ_MEDIA_SEMANTIC_EVIDENCE_V1'||generationSemantic.moduleId!==MODULE_ID||
   generationSemantic.assets?.length!==EXPECTED.uniquePngs||generationSemantic.approvalGranted!==false)
  throw Error('STALE_Y2M01_GENERATION_SEMANTIC_EVIDENCE');
if(bindingPlan.schemaVersion!=='DUDUQ_MEDIA_BINDING_PLAN_V1'||bindingPlan.moduleId!==MODULE_ID||
   bindingPlan.bindings?.length!==EXPECTED.sourceIds||bindingPlan.applicationStatus!=='NOT_APPLIED')
  throw Error('STALE_Y2M01_BINDING_PLAN');
if(questions.moduleId!==MODULE_ID||questions.items?.length!==EXPECTED.questions||
   registry.entries?.length!==EXPECTED.cleanV26RegistryEntries||
   integrity.entries.get(MODULE_PATH)?.sha!==EXPECTED.cleanV26QuestionSha256||
   integrity.entries.get(REGISTRY_PATH)?.sha!==EXPECTED.cleanV26RegistrySha256)
  throw Error('Y2M01_CLEAN_V26_SHAPE_MISMATCH');
const invariant=sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(questions))));
if(invariant!==EXPECTED.cleanV26QuestionInvariantSha256)throw Error('Y2M01_SOURCE_QUESTION_INVARIANT_MISMATCH');

const generationAssetsByFile=new Map(generated.assets.map(asset=>[asset.file,asset]));
const generationSemanticsByFile=new Map(generationSemantic.assets.map(asset=>[asset.file,asset]));
const bindingBySourceId=new Map();
for(const binding of bindingPlan.bindings){
  if(bindingBySourceId.has(binding.mediaId))throw Error('DUPLICATE_Y2M01_SOURCE_BINDING:'+binding.mediaId);
  if(!generationAssetsByFile.has(binding.candidateFile))throw Error('Y2M01_BINDING_FILE_NOT_GENERATED:'+binding.mediaId);
  bindingBySourceId.set(binding.mediaId,binding);
}
const sourceIds=new Set(bindingBySourceId.keys());
const generatedSourceIds=new Set(generated.assets.flatMap(asset=>asset.bindings||[]).map(binding=>binding.mediaId));
if(sourceIds.size!==EXPECTED.sourceIds||generatedSourceIds.size!==EXPECTED.sourceIds||
   [...sourceIds].some(id=>!generatedSourceIds.has(id)))throw Error('Y2M01_SOURCE_ID_SET_MISMATCH');

const {usages:sourceUsages,groups}=deriveOccurrenceGroups(questions,sourceIds);
const sourceUsageRecords=[...sourceUsages.values()].reduce((sum,records)=>sum+records.length,0);
if(sourceUsages.size!==EXPECTED.sourceIds||sourceUsageRecords!==EXPECTED.sourceUsageRecords||groups.length!==EXPECTED.finalIds)
  throw Error('Y2M01_SOURCE_USAGE_SCOPE_CHANGED');
const splits=groups.flatMap(group=>group.fields.map(field=>({questionId:group.questionId,field,
  from:group.sourceMediaId,to:group.newMediaId,semanticTarget:group.semanticTarget})))
  .sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.field.localeCompare(b.field));
if(splits.length!==EXPECTED.splitRecords||new Set(groups.map(group=>group.newMediaId)).size!==EXPECTED.finalIds)
  throw Error('Y2M01_OCCURRENCE_SPLIT_COUNT_MISMATCH');

const modeled=structuredClone(questions);
for(const split of splits){
  const question=modeled.items.find(item=>item.item_id===split.questionId),{node,key}=locate(question,split.field);
  if(node?.[key]!==split.from||node?.semanticTarget!==split.semanticTarget)
    throw Error('Y2M01_SPLIT_OCCURRENCE_CHANGED:'+split.questionId+':'+split.field);
  node[key]=split.to;
}
if(sha256(Buffer.from(JSON.stringify(withoutVisualMediaIds(modeled))))!==invariant)
  throw Error('Y2M01_SPLIT_CHANGED_NON_MEDIA_QUESTION_CONTRACT');
const finalIds=new Set(groups.map(group=>group.newMediaId));
const {usages:postSplitUsages}=deriveOccurrenceGroups(modeled,finalIds);
if(postSplitUsages.size!==EXPECTED.finalIds||[...postSplitUsages.values()].reduce((sum,records)=>sum+records.length,0)!==EXPECTED.sourceUsageRecords)
  throw Error('Y2M01_POST_SPLIT_USAGE_SCOPE_INVALID');

const registryIndex=new Map();
for(const entry of registry.entries){
  if(!entry?.mediaId||registryIndex.has(entry.mediaId))throw Error('DUPLICATE_OR_INVALID_REGISTRY_ID:'+entry?.mediaId);
  registryIndex.set(entry.mediaId,entry);
}
const sortedSourceIds=[...sourceIds].sort(),sourceEntries=sortedSourceIds.map(id=>{
  const entry=registryIndex.get(id);if(!entry)throw Error('Y2M01_SOURCE_REGISTRY_ENTRY_MISSING:'+id);return entry;
});
const usageProjection=sortedSourceIds.map(mediaId=>({mediaId,records:sourceUsages.get(mediaId).map(record=>({
  questionId:record.questionId,moduleId:record.moduleId,field:record.field,semanticTarget:record.semanticTarget
}))}));
const sourceEntryProjectionSha256=sha256(Buffer.from(JSON.stringify(sourceEntries)));
const sourceUsageProjectionSha256=sha256(Buffer.from(JSON.stringify(usageProjection)));

const sourcePin={
  schemaVersion:'DUDUQ_Y2M01_SOURCE_REGISTRY_PIN_V1',status:'PASS_EXACT_PRISTINE_V26_ONLY',moduleId:MODULE_ID,
  createdAt:'2026-10-31',cleanV26QuestionSha256:EXPECTED.cleanV26QuestionSha256,
  cleanV26QuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  cleanV26RegistrySha256:EXPECTED.cleanV26RegistrySha256,cleanV26RegistryEntries:EXPECTED.cleanV26RegistryEntries,
  cleanV26ManifestSha256:EXPECTED.cleanV26ManifestSha256,generationManifestSha256:EXPECTED.generationManifestSha256,
  generationSemanticSha256:EXPECTED.generationSemanticSha256,bindingPlanSha256:EXPECTED.bindingPlanSha256,
  questionInventorySha256:EXPECTED.questionInventorySha256,sourceRegistryEntryCount:EXPECTED.sourceIds,
  sourceQuestionUsageRecords:EXPECTED.sourceUsageRecords,finalBindingIds:EXPECTED.finalIds,
  occurrenceScopedSplitRecords:EXPECTED.splitRecords,sourceRegistryEntryProjectionSha256:sourceEntryProjectionSha256,
  sourceUsageProjectionSha256,sourceMediaIds:sortedSourceIds,occurrenceScopedSplits:splits,
  sourceHashesRewritten:false,productionApproved:false,goldMastersModified:false
};
const pinBytes=Buffer.from(JSON.stringify(sourcePin,null,2)+'\n'),pinSha256=canonicalLfSha256(pinBytes);
await writeFile(path.join(bundleDir,'source-registry-pin.json'),pinBytes);

const alphaAssets=[];
for(const asset of generated.assets){
  const bytes=await readFile(path.join(bundleDir,asset.file));
  if(sha256(bytes)!==asset.sha256)throw Error('Y2M01_FINAL_PNG_HASH_MISMATCH:'+asset.assetKey);
  const technical=validateDuduqRgbaPng(bytes),alpha=analyzeAlphaComponents(bytes,{alphaThreshold:64});
  if(technical.width<1024||technical.height<1024||alpha.microOpaqueIslandCount!==0)
    throw Error('Y2M01_PNG_VISUAL_TECHNICAL_GATE_FAILED:'+asset.assetKey);
  alphaAssets.push({file:asset.file,sha256:asset.sha256,...alpha});
}
const alphaReport={schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',
  createdAt:'2026-10-31',candidateDir:BUNDLE_REL,manifest:BUNDLE_REL+'/generation-batch-manifest.json',
  alphaThreshold:64,assetCount:alphaAssets.length,assets:alphaAssets};
const alphaBytes=Buffer.from(JSON.stringify(alphaReport,null,2)+'\n');
await writeFile(path.join(bundleDir,'alpha-component-audit.json'),alphaBytes);

const reviewAssetGroups=new Map();
for(const group of groups){
  const binding=bindingBySourceId.get(group.sourceMediaId),sourceAsset=generationAssetsByFile.get(binding.candidateFile);
  const key=binding.candidateFile+'\0'+group.semanticTarget;
  if(!reviewAssetGroups.has(key)){
    const suffix=sha256(Buffer.from(key)).slice(0,10).toUpperCase();
    reviewAssetGroups.set(key,{...structuredClone(sourceAsset),assetKey:sourceAsset.assetKey+'-SEM-'+suffix,
      semanticTarget:group.semanticTarget,visualSemanticTarget:sourceAsset.semanticTarget,
      review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:BUNDLE_REL+'/semantic-evidence.json',
      bindings:[],sourceMediaIds:new Set()});
  }
  const asset=reviewAssetGroups.get(key);
  asset.sourceMediaIds.add(group.sourceMediaId);
  asset.bindings.push({mediaId:group.newMediaId,questionId:group.questionId,splitFromMediaId:group.sourceMediaId});
}
const reviewAssets=[...reviewAssetGroups.values()].map(asset=>({...asset,sourceMediaIds:[...asset.sourceMediaIds].sort(),
  bindings:asset.bindings.sort((a,b)=>a.mediaId.localeCompare(b.mediaId))}));
reviewAssets.sort((a,b)=>a.assetKey.localeCompare(b.assetKey));
if(reviewAssets.length!==EXPECTED.reviewAssets||new Set(reviewAssets.map(asset=>asset.sha256)).size!==EXPECTED.uniquePngs)
  throw Error('Y2M01_REVIEW_ASSET_GROUP_COUNT_MISMATCH');

const manifest={...structuredClone(generated),status:'HASH_BOUND_OCCURRENCE_SCOPED_REVIEW_BUNDLE_READY_FOR_QA_OVERLAY',
  originalAuditedPendingIds:EXPECTED.sourceIds,finalBindingIds:EXPECTED.finalIds,
  totalQuestionUsageRecords:EXPECTED.sourceUsageRecords,occurrenceScopedSplits:splits,
  sourceRegistryPinEvidence:'source-registry-pin.json',sourceRegistryPinEvidenceSha256:pinSha256,
  generationManifestEvidence:'generation-batch-manifest.json',generationManifestSha256:EXPECTED.generationManifestSha256,
  generationSemanticEvidence:'generation-semantic-evidence.json',generationSemanticSha256:EXPECTED.generationSemanticSha256,
  alphaComponentAudit:'alpha-component-audit.json',alphaComponentAuditSha256:canonicalLfSha256(alphaBytes),
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  assets:reviewAssets,integrated:false,productionApproved:false,approvalFlagsChanged:false};
const bindings=allBindings(manifest);
if(bindings.length!==EXPECTED.finalIds||new Set(bindings.map(binding=>binding.mediaId)).size!==EXPECTED.finalIds)
  throw Error('Y2M01_PREPARED_BINDING_COUNT_MISMATCH');
for(const binding of bindings){
  const records=postSplitUsages.get(binding.mediaId)||[];
  if(!records.length||records.some(record=>record.questionId!==binding.questionId||record.semanticTarget!==binding.asset.semanticTarget))
    throw Error('Y2M01_PREPARED_BINDING_SEMANTIC_MISMATCH:'+binding.mediaId);
}

const candidateAssets=reviewAssets.map(asset=>{
  const sourceEvidence=generationSemanticsByFile.get(asset.file);
  if(!sourceEvidence)throw Error('Y2M01_GENERATION_SEMANTIC_RECORD_MISSING:'+asset.file);
  const generatedAsset=generationAssetsByFile.get(asset.file),technical=alphaAssets.find(row=>row.file===asset.file);
  return {assetKey:asset.assetKey,concept:asset.semanticTarget,visualConcept:asset.visualSemanticTarget,
    file:asset.file,width:generatedAsset.pixelWidth,height:generatedAsset.pixelHeight,format:'PNG_RGBA8_NONINTERLACED',
    sha256:asset.sha256,semanticPrecheck:'PASSED',visualObservation:sourceEvidence.visualObservation,
    wrongDistractorsAbsent:sourceEvidence.wrongDistractorsAbsent||[],technicalQc:{width:technical.width,height:technical.height,
      alphaThreshold:technical.alphaThreshold,microOpaqueIslandCount:technical.microOpaqueIslandCount},
    visualReview:'PASSED_CONCEPT_LEGIBLE_TRANSPARENT_NO_TEXT_OR_WATERMARK'};
});
const semantic={
  schemaVersion:'DUDUQ_Y2M01_NATIVE_MEDIA_SEMANTIC_EVIDENCE_V2',createdAt:'2026-10-31',moduleId:MODULE_ID,
  provider:'Codex built-in image_gen',reviewAuthority:'CODEX_DELEGATED_BY_OWNER_REQUEST',
  evidenceBoundary:'Codex technical/visual review for an isolated compiled QA overlay. Human homologation and production approval remain pending.',
  generationSemanticEvidence:'generation-semantic-evidence.json',generationSemanticEvidenceSha256:EXPECTED.generationSemanticSha256,
  alphaComponentAudit:'alpha-component-audit.json',alphaComponentAuditSha256:canonicalLfSha256(alphaBytes),
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,
  sourceRegistrySha256:EXPECTED.cleanV26RegistrySha256,reviewedQuestionCount:EXPECTED.questions,
  auditedPendingIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,usageRecords:EXPECTED.sourceUsageRecords,
  splitReview:{status:'PASS_EXACT_QUESTION_AND_SEMANTIC_CONTEXT_SPLITS',count:splits.length,
    reason:'Every visual field receives a question/context-scoped IMG ID. Shared Y1M01, reusable letter and Y2M01 source IDs remain unchanged outside the exact audited occurrences.'},
  renderedReview:{status:'PASSED_BY_CODEX_DELEGATED_VISUAL_REVIEW',criteria:[
    'all 28 hash-pinned PNGs visually match their reviewed Y2M01 concepts',
    'all exact semantic variants are bound only to the matching question context',
    'transparent cutouts are legible with no written answer, watermark or unrelated distractor',
    '64-alpha connected-component audit found zero micro opaque pixel islands'
  ]},candidateAssets,productionReleaseCertified:false,humanHomologationClaimed:false,
  answerKeysModified:false,mechanicsModified:false,goldMastersModified:false
};
const plan={schemaVersion:'DUDUQ_Y2M01_OFFICIAL_MEDIA_BINDING_PLAN_V1',moduleId:MODULE_ID,status:'PASS',
  sourceQuestionContractSha256:EXPECTED.cleanV26QuestionSha256,
  sourceQuestionInvariantSha256:EXPECTED.cleanV26QuestionInvariantSha256,sourceRegistryPinSha256:pinSha256,
  inputMediaIds:EXPECTED.sourceIds,outputMediaIds:EXPECTED.finalIds,usageRecords:EXPECTED.sourceUsageRecords,
  occurrenceScopedSplits:splits,reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,
  bindings:bindings.map(({asset,...binding})=>({assetKey:asset.assetKey,semanticTarget:asset.semanticTarget,...binding}))
    .sort((a,b)=>a.mediaId.localeCompare(b.mediaId)),productionApproved:false};

await writeFile(reviewManifestPath,JSON.stringify(manifest,null,2)+'\n');
await writeFile(reviewSemanticPath,JSON.stringify(semantic,null,2)+'\n');
await writeFile(path.join(root,'qa/results/y2m01-official-media-binding-plan.json'),JSON.stringify(plan,null,2)+'\n');
const manifestStats=await stat(reviewManifestPath);
console.log(JSON.stringify({status:'Y2M01_OFFICIAL_MEDIA_BUNDLE_PREPARED',questions:EXPECTED.questions,
  sourceIds:EXPECTED.sourceIds,postSplitIds:EXPECTED.finalIds,usageRecords:EXPECTED.sourceUsageRecords,
  occurrenceScopedSplitRecords:EXPECTED.splitRecords,reviewAssets:EXPECTED.reviewAssets,uniquePngs:EXPECTED.uniquePngs,
  manifestBytes:manifestStats.size,sourceHashesRewritten:false,productionApproved:false},null,2));
