#!/usr/bin/env node
/**
 * Reproducible Y4M04 generation-lane candidate evidence builder.
 *
 * Every write is constrained to this module-specific candidate batch. The
 * script never changes questions, answers, media registry, runtime, overlays,
 * Gold Masters, approval flags or production state.
 */
import {createHash} from 'node:crypto';
import {access,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';
import {analyzeAlphaComponents} from '../../png-alpha-component-audit.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const batchRel='qa/media-candidates/y4m04-official-20261107';
const moduleId='Y4M04';
const completedAt='2026-11-08T01:36:13.0061667Z';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const slash=value=>String(value).replaceAll('\\','/');
const relative=file=>slash(path.relative(root,file));
const numberByConcept=new Map([
  ['one',1],['two',2],['three',3],['four',4],['five',5],
  ['six',6],['seven',7],['eight',8],['nine',9],['ten',10]
]);
const generatedNativeOutputs=new Map([
  ['basketball','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-708dc5f7-544d-4f73-b3dc-b82add14dd7d.png'],
  ['eight','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-80231788-8726-47fc-9003-3e14f39b76af.png'],
  ['soccer','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-de042ddc-bc03-42ad-899e-81edf1f28423.png'],
  ['ten','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-8f8ef440-4925-4e97-9b87-36020563afde.png'],
  ['tennis','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-4550b5d6-e287-414b-b585-70b335abba36.png'],
  ['three','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-168d7a9f-ed28-4a7f-9700-ef0fc9581e7e.png'],
  ['two','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-d8fdc5f1-1a94-4b08-854c-78b2e4f388a6.png'],
  ['volleyball','C:/Users/augus/.codex/generated_images/01a1b8be-65cc-7d52-929d-2889ab431726/exec-10078ee0-7970-4e9b-8431-0b412e03ec6a.png']
]);

function assertInsideBatch(file){
  const resolved=path.resolve(file);
  if(resolved!==batchDir&&!resolved.startsWith(batchDir+path.sep)){
    throw Error('Y4M04_WRITE_OUTSIDE_BATCH:'+resolved);
  }
}
async function exists(file){try{await access(file);return true}catch{return false}}
async function readJson(file){return JSON.parse(await readFile(file,'utf8'))}
async function writeJson(name,value){
  const destination=path.join(batchDir,name);
  assertInsideBatch(destination);
  await writeFile(destination,jsonBytes(value));
}
async function copyIdempotent(source,destination){
  assertInsideBatch(destination);
  const bytes=await readFile(source),hash=sha256(bytes);
  if(await exists(destination)){
    const existing=await readFile(destination);
    if(sha256(existing)!==hash)throw Error('Y4M04_IDEMPOTENT_COPY_CONFLICT:'+relative(destination));
    return {sha256:hash,copied:false};
  }
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(source,destination);
  return {sha256:hash,copied:true};
}
function unique(values){return [...new Set(values)]}
function unionBbox(components){
  const minX=Math.min(...components.map(item=>item.bbox.x));
  const minY=Math.min(...components.map(item=>item.bbox.y));
  const maxX=Math.max(...components.map(item=>item.bbox.x+item.bbox.width));
  const maxY=Math.max(...components.map(item=>item.bbox.y+item.bbox.height));
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}
function plannedBindings(inventory,concept){
  return inventory.occurrenceGroups.filter(item=>item.semanticTarget===concept).map(item=>({
    mediaId:item.plannedMediaId,
    questionId:item.questionId,
    splitFromMediaId:item.sourceMediaId,
    contractPaths:item.contractPaths,
    roles:item.roles,
    optionOrCardIds:item.optionOrCardIds
  }));
}
function semanticStatement(concept){
  if(numberByConcept.has(concept)){
    const count=numberByConcept.get(concept);
    return `The candidate visibly contains exactly ${count} separate glossy red apple${count===1?'':'s'} and no other countable object.`;
  }
  return {
    basketball:'One boy is visibly dribbling exactly one orange basketball; no competing sport equipment is present.',
    soccer:'One boy is visibly kicking exactly one black-and-white soccer ball; no competing sport equipment is present.',
    tennis:'One boy is visibly swinging exactly one tennis racket toward exactly one yellow-green tennis ball; no competing sport equipment is present.',
    volleyball:"One boy is visibly bumping exactly one blue-and-yellow volleyball with joined forearms, directly supporting 'He is playing volleyball.'; no competing sport equipment is present."
  }[concept];
}

const inventory=await readJson(path.join(batchDir,'question-inventory.json'));
const audit=await readJson(path.join(batchDir,'preexisting-original-audit.json'));
const plan=await readJson(path.join(batchDir,'generation-plan.json'));
if(inventory.moduleId!==moduleId||inventory.questionCount!==20||inventory.visualUsageCount!==70||
  inventory.sourceMediaIdCount!==26||inventory.occurrenceScopedBindingPlanCount!==62||
  inventory.globalPendingMediaIds!==1055){
  throw Error('Y4M04_INVENTORY_CONTRACT_DRIFT');
}
if(plan.sourceQuestionSha256!==inventory.sourceQuestionSha256||
  plan.sourceRegistrySha256!==inventory.sourceRegistrySha256){
  throw Error('Y4M04_GENERATION_PLAN_SOURCE_DRIFT');
}
const generatedPlanByConcept=new Map(plan.generationQueue.map(item=>[item.concept,item]));
if(generatedPlanByConcept.size!==8||audit.reusableCount!==6||audit.missingCount!==8){
  throw Error('Y4M04_EXPECTED_8_GENERATED_6_REUSED');
}

// Re-check every binary copy and exact native output before writing evidence.
for(const item of audit.reusable){
  const slug=item.concept.toUpperCase();
  await copyIdempotent(path.join(root,item.sourceOriginalFile),path.join(batchDir,'provenance/reused-originals',`DUDUQ-Y4M04-${slug}-SOURCE-ORIGINAL.png`));
  await copyIdempotent(path.join(root,item.sourceCandidateFile),path.join(batchDir,'images',`DUDUQ-Y4M04-${slug}.png`));
}

const assetRecords=[];
const pngValidations=[];
const alphaAudits=[];
const provenanceAssets=[];
const semanticAssets=[];
const receipts=[];
const reuseByConcept=new Map(audit.reusable.map(item=>[item.concept,item]));
for(const concept of inventory.visualConcepts){
  const slug=concept.toUpperCase();
  const candidateRel=`images/DUDUQ-Y4M04-${slug}.png`;
  const candidatePath=path.join(batchDir,candidateRel);
  const candidateBytes=await readFile(candidatePath);
  const candidateSha=sha256(candidateBytes);
  const png=validateDuduqRgbaPng(candidateBytes);
  if(png.width<1024||png.height<1024)throw Error('Y4M04_CANDIDATE_BELOW_1024:'+concept);
  const alpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:64});
  const coreAlpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:128});
  const expectedComponents=numberByConcept.get(concept)??({basketball:1,soccer:1,tennis:2,volleyball:2}[concept]);
  const meaningfulCoreComponents=coreAlpha.components.filter(component=>component.pixels>=256).length;
  if(meaningfulCoreComponents!==expectedComponents){
    throw Error(`Y4M04_ALPHA_COMPONENT_COUNT:${concept}:expected_${expectedComponents}:actual_${meaningfulCoreComponents}`);
  }
  if(alpha.microOpaqueIslandCount!==0)throw Error('Y4M04_MICRO_OPAQUE_ISLAND:'+concept);
  const bbox=unionBbox(alpha.components);
  const safeMargins={left:bbox.x,top:bbox.y,right:png.width-(bbox.x+bbox.width),bottom:png.height-(bbox.y+bbox.height)};
  if(Math.min(...Object.values(safeMargins))<8)throw Error('Y4M04_SUBJECT_CUTOFF_RISK:'+concept);

  const bindings=plannedBindings(inventory,concept);
  const sourceMediaIds=unique(bindings.map(item=>item.splitFromMediaId)).sort();
  if(!bindings.length)throw Error('Y4M04_CONCEPT_WITHOUT_VISUAL_BINDING:'+concept);
  const planQuestions=inventory.questions.filter(question=>question.allSemanticTargets.includes(concept));
  const generated=generatedPlanByConcept.get(concept);
  const reused=reuseByConcept.get(concept);
  if(Boolean(generated)===Boolean(reused))throw Error('Y4M04_ASSET_SOURCE_CLASS_COLLISION:'+concept);

  let originalRel,originalSha,generationClass,provenance;
  if(generated){
    originalRel=`provenance/originals/DUDUQ-Y4M04-${slug}-ORIGINAL.png`;
    const originalPath=path.join(batchDir,originalRel);
    const [nativeBytes,originalBytes]=await Promise.all([
      readFile(generatedNativeOutputs.get(concept)),readFile(originalPath)
    ]);
    const nativeSha=sha256(nativeBytes);
    originalSha=sha256(originalBytes);
    if(nativeSha!==originalSha)throw Error('Y4M04_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
    const originalPng=validateDuduqRgbaPng(originalBytes);
    if(originalPng.width<1024||originalPng.height<1024)throw Error('Y4M04_GENERATED_ORIGINAL_BELOW_1024:'+concept);
    generationClass='CODEX_NATIVE_IMAGE_GEN_ORIGINAL';
    const callId=path.basename(generatedNativeOutputs.get(concept),'.png');
    const normalization={
      script:'qa/normalize-transparent-png-alpha.mjs',
      expectedCoreComponents:expectedComponents,
      coreAlpha:128,
      edgeRadius:3,
      minWidth:1024,
      minHeight:1024,
      semanticPixelsChanged:false,
      sourceSha256:originalSha,
      outputSha256:candidateSha,
      operation:'retain the approved opaque subject components plus antialias edges and remove detached or diffuse alpha pixels without inventing semantic content'
    };
    provenance={
      concept,slug,generationClass,
      provider:'Codex built-in image_gen',
      tool:'image_gen.imagegen',
      prompt:generated.prompt,
      promptRecordStatus:'EXACT_SESSION_PROMPT_RECORDED',
      transparentBackgroundRequested:true,
      generatorOutputOriginalPath:generatedNativeOutputs.get(concept),
      generatorCallId:callId,
      nativeSourceExactHashMatch:true,
      originalFile:originalRel,
      originalSha256:originalSha,
      candidateFile:candidateRel,
      candidateSha256:candidateSha,
      alphaNormalization:normalization
    };
    receipts.push({
      concept,slug,provider:'Codex built-in image_gen',tool:'image_gen.imagegen',
      generatorCallId:callId,generatorOutputOriginalPath:generatedNativeOutputs.get(concept),
      originalSha256:originalSha,completedObservedInCurrentSession:true,
      transparentBackgroundRequested:true,status:'COMPLETED_AND_LOCAL_ORIGINAL_HASH_VERIFIED'
    });
  }else{
    originalRel=`provenance/reused-originals/DUDUQ-Y4M04-${slug}-SOURCE-ORIGINAL.png`;
    const originalBytes=await readFile(path.join(batchDir,originalRel));
    originalSha=sha256(originalBytes);
    if(originalSha!==reused.sourceOriginalSha256||candidateSha!==reused.sourceCandidateSha256){
      throw Error('Y4M04_REUSED_SOURCE_HASH_MISMATCH:'+concept);
    }
    generationClass='VERIFIED_PREEXISTING_NATIVE_ORIGINAL_REUSE';
    provenance={
      concept,slug,generationClass,
      provider:reused.provider,
      tool:'image_gen.imagegen',
      prompt:reused.prompt,
      promptRecordStatus:reused.originalPromptRecordStatus,
      transparentBackgroundRequested:true,
      originalFile:originalRel,
      originalSha256:originalSha,
      candidateFile:candidateRel,
      candidateSha256:candidateSha,
      nativeSourceExactHashMatch:true,
      source:{
        sourceBatch:reused.sourceBatch,
        sourceManifest:reused.sourceManifest,
        sourceManifestSha256:reused.sourceManifestSha256,
        sourceAssetKey:reused.sourceAssetKey,
        sourceOriginalFile:reused.sourceOriginalFile,
        sourceOriginalSha256:reused.sourceOriginalSha256,
        sourceCandidateFile:reused.sourceCandidateFile,
        sourceCandidateSha256:reused.sourceCandidateSha256
      },
      alphaNormalization:reused.alphaNormalization
    };
  }
  provenanceAssets.push(provenance);
  pngValidations.push({
    concept,file:candidateRel,sha256:candidateSha,...png,expectedCoreComponents:expectedComponents,
    alphaComponentCountAt64:alpha.componentCount,meaningfulCoreComponentCountAt128:meaningfulCoreComponents,
    microOpaqueIslandCount:alpha.microOpaqueIslandCount,
    visibleSubjectBbox:bbox,safeMargins,status:'PNG_RGBA_ALPHA_QA_PASS'
  });
  alphaAudits.push({concept,file:candidateRel,sha256:candidateSha,...alpha,
    coreAlphaThreshold:128,meaningfulCoreComponentCount:meaningfulCoreComponents,
    coreComponents:coreAlpha.components.filter(component=>component.pixels>=256),
    visibleSubjectBbox:bbox,safeMargins});
  semanticAssets.push({
    concept,file:candidateRel,sha256:candidateSha,generationClass,
    statement:semanticStatement(concept),
    wrongDistractorsExcluded:true,
    questionContracts:planQuestions.map(question=>({
      questionId:question.questionId,sourceSha256:question.sourceSha256,
      mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,
      titleEn:question.titleEn,instructionEn:question.instructionEn,
      visualBindingCount:question.visualUsages.filter(usage=>usage.semanticTarget===concept).length,
      sourceHasNoVisualBinding:question.visualUsages.filter(usage=>usage.semanticTarget===concept).length===0
    })),
    modelReview:'MODEL_SEMANTIC_PRECHECK_PASSED',
    humanHomologation:'PENDING',
    productionApproved:false
  });
  assetRecords.push({
    assetKey:`Y4M04-CANDIDATE-${slug}`,
    file:candidateRel,
    semanticTarget:concept,
    sha256:candidateSha,
    pixelWidth:png.width,pixelHeight:png.height,
    review:'MODEL_SEMANTIC_PRECHECK_PASSED_HUMAN_HOMOLOGATION_PENDING',
    reviewEvidence:`${batchRel}/semantic-evidence.json`,
    bindings,
    provenance:{generationClass,evidenceFile:'generation-provenance.json',preservedOriginal:originalRel,alphaNormalizationApplied:true},
    sourceMediaIds
  });
}

const bindingPlan=inventory.occurrenceGroups.map(item=>{
  const asset=assetRecords.find(record=>record.semanticTarget===item.semanticTarget);
  if(!asset)throw Error('Y4M04_BINDING_ASSET_MISSING:'+item.semanticTarget);
  return {
    candidateAssetKey:asset.assetKey,candidateFile:asset.file,semanticTarget:item.semanticTarget,
    questionId:item.questionId,sourceMediaId:item.sourceMediaId,plannedMediaId:item.plannedMediaId,
    contractPaths:item.contractPaths,roles:item.roles,optionOrCardIds:item.optionOrCardIds,
    action:'INTEGRATION_LANE_MAY_APPLY_ONLY_AFTER_INDEPENDENT_QA'
  };
});
const nonVisualQuestionContracts=inventory.questions.filter(question=>question.visualUsages.length===0).map(question=>({
  questionId:question.questionId,sourceSha256:question.sourceSha256,mechanicId:question.mechanicId,
  mechanicMode:question.mechanicMode,titleEn:question.titleEn,semanticTargets:question.allSemanticTargets,
  action:'NO_MEDIA_BINDING_IN_SOURCE_CONTRACT_DO_NOT_INVENT_ONE'
}));
const coveredSourceIds=unique(bindingPlan.map(item=>item.sourceMediaId)).sort();
if(coveredSourceIds.length!==26||bindingPlan.length!==62)throw Error('Y4M04_BINDING_COVERAGE_DRIFT');

const generationProvenance={
  schemaVersion:'DUDUQ_Y4M04_GENERATION_PROVENANCE_V1',createdAt:completedAt,moduleId,lane:'generation',
  provider:'Codex built-in image_gen',tool:'image_gen.imagegen',apiPurchaseOrExternalCredentialUsed:false,
  nativeGeneratedAssetCount:8,verifiedReuseAssetCount:6,originalGenerationProvenancePreserved:true,
  assets:provenanceAssets,failedAttempts:[],generatorLimitReached:false,blockedGenerator:false,
  productionApproved:false,humanApprovalClaimed:false,integrated:false,deployed:false
};
const batchManifest={
  schemaVersion:'DUDUQ_Y4M04_GENERATION_CANDIDATE_BATCH_V1',createdAt:completedAt,moduleId,lane:'generation',
  candidateOnly:true,questionContractsReviewed:20,visualUsageCount:70,sourceMediaIdCount:26,
  semanticConceptCount:14,allSemanticTargetCount:14,occurrenceScopedBindingPlanCount:62,
  sourceQuestionSha256:inventory.sourceQuestionSha256,sourceRegistrySha256:inventory.sourceRegistrySha256,
  assets:assetRecords,
  generated:14,newlyGenerated:8,reusedVerifiedOriginals:6,integrated:0,verifiedForProduction:0,
  blocked:0,productionApproved:false,humanApprovalClaimed:false,mediaOverlaysApplied:false,
  questionContractsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,
  existingReferencedAssetsRemoved:false,deployed:false
};
const semanticEvidence={
  schemaVersion:'DUDUQ_Y4M04_SEMANTIC_EVIDENCE_V1',createdAt:completedAt,moduleId,
  sourceQuestionSha256:inventory.sourceQuestionSha256,questionContractsReviewed:20,
  assets:semanticAssets,nonVisualQuestionContracts,
  summary:{conceptsReviewed:14,visualUsagesCovered:70,occurrenceScopedBindingsCovered:62,
    sourceMediaIdsCovered:26,wrongDistractorFindings:0,humanHomologationPending:14},
  productionApproved:false,integrated:false
};
const bindingDocument={
  schemaVersion:'DUDUQ_Y4M04_OCCURRENCE_SCOPED_BINDING_PLAN_V1',createdAt:completedAt,moduleId,
  sourceQuestionSha256:inventory.sourceQuestionSha256,sourceRegistrySha256:inventory.sourceRegistrySha256,
  sourceMediaIdCount:26,occurrenceScopedBindingPlanCount:62,visualUsageCount:70,
  bindings:bindingPlan,nonVisualQuestionContracts,
  applyPerformed:false,questionMutation:false,registryMutation:false,overlayApplied:false,
  productionApproved:false
};
const pngValidation={
  schemaVersion:'DUDUQ_Y4M04_PNG_VALIDATION_V1',createdAt:completedAt,moduleId,
  validator:'qa/validate-duduq-png.mjs',assetCount:pngValidations.length,passed:pngValidations.length,
  failed:0,assets:pngValidations,productionApproved:false
};
const alphaAudit={
  schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',
  createdAt:completedAt,candidateDir:batchRel,alphaThreshold:64,assetCount:alphaAudits.length,
  assetsWithMicroOpaqueIslands:alphaAudits.filter(asset=>asset.microOpaqueIslandCount>0).length,
  assets:alphaAudits
};
const receiptDocument={
  schemaVersion:'DUDUQ_Y4M04_NATIVE_GENERATION_RECEIPTS_V1',createdAt:completedAt,moduleId,
  provider:'Codex built-in image_gen',tool:'image_gen.imagegen',receiptCount:receipts.length,
  receipts,apiPurchaseOrExternalCredentialUsed:false,generatorLimitReached:false,blockedGenerator:false
};
const sourcePin={
  schemaVersion:'DUDUQ_Y4M04_SOURCE_PIN_V1',createdAt:completedAt,moduleId,
  questionFile:inventory.sourceQuestionFile,questionSha256:inventory.sourceQuestionSha256,
  registryFile:inventory.sourceRegistryFile,registrySha256:inventory.sourceRegistrySha256,
  ledgerFile:inventory.sourceLedgerFile,ledgerSha256:inventory.sourceLedgerSha256,
  questionCount:20,globalPendingMediaIds:1055,modulePendingMediaIds:26,
  sourceQuestionMutation:false,sourceRegistryMutation:false
};
const verification={
  schemaVersion:'DUDUQ_Y4M04_GENERATION_VERIFICATION_V1',createdAt:completedAt,moduleId,lane:'generation',
  status:'CANDIDATE_SCOPE_PASS_HUMAN_HOMOLOGATION_PENDING',
  checks:{questionContracts20:true,sourceHashesPinned:true,semanticConcepts14:true,
    candidatePngs14:true,newNativePngs8:true,verifiedReusedPngs6:true,rgbaAlphaPass14:true,
    alphaComponentPass14:true,microOpaqueIslandsZero:true,visualUsagesCovered70:true,
    sourceMediaIdsCovered26:true,occurrenceScopedBindingsCovered62:true,
    nonVisualContractsPreserved4:true,productionApprovedFalse:true,integratedFalse:true},
  globalPendingMediaIds:1055,projectStatus:'INCOMPLETE',productionApproved:false,integrated:false,deployed:false
};
const checkpoint={
  schemaVersion:'DUDUQ_TWO_LANE_GENERATION_CHECKPOINT_V1',createdAt:plan.createdAt,updatedAt:completedAt,
  status:'Y4M04_GENERATION_CANDIDATES_COMPLETE',projectStatus:'INCOMPLETE',lane:'generation',moduleId,
  sourceAudit:{questions:20,pendingMediaIds:26,visualUsages:70,semanticConcepts:14,allSemanticTargets:14,
    nonVisualQuestionContracts:nonVisualQuestionContracts.map(item=>item.questionId),globalPendingMediaIds:1055,
    questionSourceSha256:inventory.sourceQuestionSha256,registrySha256:inventory.sourceRegistrySha256},
  candidateAssets:14,newlyGeneratedAssets:8,reusedVerifiedNativeOriginalAssets:6,
  generatorAttempts:{attempted:8,accepted:8,semanticOrAlphaRejected:0,quotaOrLimitBlock:false,blockedGenerator:false},
  coverage:{sourcePendingMediaIds:26,coveredSourceMediaIds:26,visualUsages:70,
    occurrenceScopedBindingPlans:62,missingConcepts:[]},
  writeBoundary:batchRel,questionsModified:false,registryModified:false,runtimeModified:false,
  goldMastersModified:false,approvalFlagsModified:false,productionModified:false,mediaOverlaysApplied:false,
  existingReferencedAssetsRemoved:false,humanApprovalClaimed:false,productionApproved:false,
  integrated:false,deployed:false,candidateBundleCommit:null,candidateReviewPushBranch:null,
  candidateCheckpointCommit:null,remotePushStatus:'PENDING_SAFE_CANDIDATE_COMMIT',remotePushBlocker:null,
  reviewBranch:null,nextAction:'COMMIT_AND_PUSH_SAFE_CANDIDATE_FILES_THEN_SCHEDULER_SELECT_OTHER_LANE',
  completionClaim:'MODULE_CANDIDATE_SCOPE_ONLY_PROJECT_REMAINS_INCOMPLETE'
};

await writeJson('generation-provenance.json',generationProvenance);
await writeJson('generation-receipts.json',receiptDocument);
await writeJson('generation-batch-manifest.json',{
  schemaVersion:'DUDUQ_Y4M04_NATIVE_GENERATION_BATCH_V1',createdAt:completedAt,moduleId,
  requestedConcepts:[...generatedPlanByConcept.keys()],generatedConcepts:receipts.map(item=>item.concept),
  generatedCount:8,acceptedCount:8,failedAttempts:[],generatorLimitReached:false,blockedGenerator:false,
  receiptsFile:'generation-receipts.json',provenanceFile:'generation-provenance.json'
});
await writeJson('batch-manifest.json',batchManifest);
await writeJson('binding-plan.json',bindingDocument);
await writeJson('semantic-evidence.json',semanticEvidence);
await writeJson('generation-semantic-evidence.json',{
  ...semanticEvidence,
  schemaVersion:'DUDUQ_Y4M04_GENERATED_ASSET_SEMANTIC_EVIDENCE_V1',
  assets:semanticAssets.filter(asset=>generatedPlanByConcept.has(asset.concept)),
  summary:{generatedConceptsReviewed:8,wrongDistractorFindings:0,humanHomologationPending:8}
});
await writeJson('png-validation.json',pngValidation);
await writeJson('alpha-component-audit.json',alphaAudit);
await writeJson('source-registry-pin.json',sourcePin);
await writeJson('verification-summary.json',verification);
await writeJson('checkpoint.json',checkpoint);

console.log(JSON.stringify({
  status:'Y4M04_GENERATION_CANDIDATE_BUNDLE_READY',questionContracts:20,candidateAssets:14,
  newlyGenerated:8,reusedVerifiedOriginals:6,pngQaPassed:14,semanticPrecheckPassed:14,
  sourceMediaIdsCovered:26,visualUsagesCovered:70,occurrenceScopedBindings:62,
  humanHomologation:'PENDING',productionApproved:false,integrated:false,globalPendingMediaIds:1055
}));
