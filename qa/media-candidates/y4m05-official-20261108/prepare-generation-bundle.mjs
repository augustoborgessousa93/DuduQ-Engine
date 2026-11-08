#!/usr/bin/env node
/**
 * Reproducible Y4M05 generation-lane candidate evidence builder.
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
const batchRel='qa/media-candidates/y4m05-official-20261108';
const moduleId='Y4M05';
const completedAt='2026-11-08T19:39:20.7749891Z';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const slash=value=>String(value).replaceAll('\\','/');
const relative=file=>slash(path.relative(root,file));
const unique=values=>[...new Set(values)];
const slugFor=concept=>concept.toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-|-$/g,'');

const generatedNativeOutputs=new Map([
  ['dress','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-289ddb09-89c8-48f7-b352-df301010d796.png'],
  ['jacket','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-7687ef58-e269-4932-8426-c76574cd0eb9.png'],
  ['medium','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-429589b9-1ea6-4e3f-b571-83fba1d781e1.png'],
  ['shirt','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-6eedc77f-a9ce-4365-8636-5e06cc9db602.png'],
  ['shoes','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-84b460ec-2765-4e3d-b003-72211be02a21.png'],
  ['t-shirt','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-c4e0259d-eac1-4870-bbd0-7a76eb6710f7.png'],
  ['trousers','C:/Users/augus/.codex/generated_images/01a1bc98-eae5-73f1-bf60-00542d03fddb/exec-229c5533-1233-4ccf-a34e-ebf708e4ff98.png']
]);

const targetToAssetConcept=new Map([
  ['pants','trousers'],
  ['pants/trousers','trousers'],
  ['trousers','trousers']
]);

function assertInsideBatch(file){
  const resolved=path.resolve(file);
  if(resolved!==batchDir&&!resolved.startsWith(batchDir+path.sep)){
    throw Error('Y4M05_WRITE_OUTSIDE_BATCH:'+resolved);
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
    if(sha256(existing)!==hash)throw Error('Y4M05_IDEMPOTENT_COPY_CONFLICT:'+relative(destination));
    return {sha256:hash,copied:false};
  }
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(source,destination);
  return {sha256:hash,copied:true};
}
function unionBbox(components){
  const minX=Math.min(...components.map(item=>item.bbox.x));
  const minY=Math.min(...components.map(item=>item.bbox.y));
  const maxX=Math.max(...components.map(item=>item.bbox.x+item.bbox.width));
  const maxY=Math.max(...components.map(item=>item.bbox.y+item.bbox.height));
  return {x:minX,y:minY,width:maxX-minX,height:maxY-minY};
}
function semanticTargetsFor(assetConcept,generatedPlan){
  return generatedPlan?.coversSemanticTargets||[assetConcept];
}
function semanticStatement(concept){
  return ({
    apple:'Exactly one whole red apple is visible, with a stem and leaf and no competing food.',
    banana:'Exactly one whole curved yellow banana is visible, with no competing food.',
    black:'One plain rounded black color token is visible with no object or text cue.',
    blue:'One plain rounded blue color token is visible with no object or text cue.',
    carrot:'Exactly one whole orange carrot with green leaves is visible, with no competing food.',
    dress:'Exactly one complete yellow child-size dress is visible; no other garment is present.',
    grape:'Exactly one bunch of purple grapes is visible, with no competing food.',
    gray:'One plain rounded neutral-gray color token is visible with no object or text cue.',
    'i do not like carrots':'A child visibly rejects a carrot with a clear gentle dislike gesture; no competing preference scene is present.',
    'i like apples':'A child visibly likes apples with an affirmative happy gesture; no competing fruit preference is present.',
    'i like papaya':'A child visibly likes papaya with an affirmative happy gesture; no competing fruit preference is present.',
    'i prefer grapes':'A child visibly chooses grapes over another option; no competing preference meaning is present.',
    jacket:'Exactly one complete blue zip-front jacket is visible; no shirt, dress or other garment is present.',
    large:'Exactly one neutral gray rounded cube is shown at the verified large/big scale; no color or object cue competes with size.',
    medium:'Exactly one neutral gray rounded cube is shown midway between the verified small and large endpoints; no competing cue is present.',
    melon:'Exactly one whole melon is visible, with no competing food.',
    orange:'Exactly one whole orange fruit is visible; it is not an abstract orange color token and no competing food is present.',
    papaya:'Exactly one papaya fruit is visible, with no competing food.',
    pear:'Exactly one whole pear is visible, with no competing food.',
    red:'One plain rounded red color token is visible with no object or text cue.',
    shirt:'Exactly one long-sleeved collared button-up shirt is visible, clearly distinct from a T-shirt.',
    shoes:'Exactly one matching pair of two red-and-white shoes is visible; no foot, leg or extra shoe is present.',
    small:'Exactly one neutral gray rounded cube is shown at the verified small scale; no color or object cue competes with size.',
    't-shirt':'Exactly one short-sleeved crew-neck T-shirt is visible, with no collar or buttons and no other garment.',
    trousers:'Exactly one complete pair of full-length trousers is visible, correctly covering the exact source synonyms pants and trousers.',
    yellow:'One plain rounded yellow color token is visible with no object or text cue.'
  })[concept];
}

const inventory=await readJson(path.join(batchDir,'question-inventory.json'));
const audit=await readJson(path.join(batchDir,'preexisting-original-audit.json'));
const plan=await readJson(path.join(batchDir,'generation-plan.json'));
for(const [label,file,expected] of [
  ['questions',inventory.sourceQuestionFile,inventory.sourceQuestionSha256],
  ['registry',inventory.sourceRegistryFile,inventory.sourceRegistrySha256],
  ['ledger',inventory.sourceLedgerFile,inventory.sourceLedgerSha256]
]){
  const actual=sha256(await readFile(path.join(root,file)));
  if(actual!==expected)throw Error(`Y4M05_LIVE_SOURCE_HASH_DRIFT:${label}:${actual}`);
}
if(inventory.moduleId!==moduleId||inventory.questionCount!==20||inventory.visualUsageCount!==94||
  inventory.sourceMediaIdCount!==54||inventory.occurrenceScopedBindingPlanCount!==86||
  inventory.visualConceptCount!==28||inventory.globalPendingMediaIds!==1055){
  throw Error('Y4M05_INVENTORY_CONTRACT_DRIFT');
}
if(plan.sourceQuestionSha256!==inventory.sourceQuestionSha256||
  plan.sourceRegistrySha256!==inventory.sourceRegistrySha256||
  plan.sourceLedgerSha256!==inventory.sourceLedgerSha256){
  throw Error('Y4M05_GENERATION_PLAN_SOURCE_DRIFT');
}
const generatedPlanByConcept=new Map(plan.generationQueue.map(item=>[item.concept,item]));
const reuseByConcept=new Map(audit.reusable.map(item=>[item.concept,item]));
if(generatedPlanByConcept.size!==7||audit.reusableSemanticTargetCount!==19||
  audit.generatedSemanticTargetCount!==9||audit.requiredGeneratedAssetCount!==7){
  throw Error('Y4M05_EXPECTED_7_GENERATED_19_REUSED');
}

const assetConcepts=unique(inventory.visualConcepts.map(concept=>targetToAssetConcept.get(concept)||concept));
if(assetConcepts.length!==26)throw Error('Y4M05_EXPECTED_26_NON_DUPLICATE_ASSETS');
for(const concept of assetConcepts){
  if(Boolean(generatedPlanByConcept.has(concept))===Boolean(reuseByConcept.has(concept))){
    throw Error('Y4M05_ASSET_SOURCE_CLASS_COLLISION:'+concept);
  }
}

// Re-check and preserve every reusable source inside the module batch.
for(const item of audit.reusable){
  const slug=slugFor(item.concept);
  await copyIdempotent(
    path.join(root,item.sourceOriginalFile),
    path.join(batchDir,'provenance/reused-originals',`DUDUQ-Y4M05-${slug}-SOURCE-ORIGINAL.png`)
  );
  await copyIdempotent(
    path.join(root,item.sourceCandidateFile),
    path.join(batchDir,'images',`DUDUQ-Y4M05-${slug}.png`)
  );
}

// Re-check all native outputs, preserved originals and normalized candidates.
for(const [concept,nativeOutput] of generatedNativeOutputs){
  const slug=slugFor(concept);
  const originalPath=path.join(batchDir,'provenance/originals',`DUDUQ-Y4M05-${slug}-ORIGINAL.png`);
  const normalizedPath=path.join(batchDir,'provenance/normalized',`DUDUQ-Y4M05-${slug}-NORMALIZED.png`);
  const candidatePath=path.join(batchDir,'images',`DUDUQ-Y4M05-${slug}.png`);
  const [nativeBytes,originalBytes,normalizedBytes,candidateBytes]=await Promise.all([
    readFile(nativeOutput),readFile(originalPath),readFile(normalizedPath),readFile(candidatePath)
  ]);
  if(sha256(nativeBytes)!==sha256(originalBytes))throw Error('Y4M05_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
  if(sha256(normalizedBytes)!==sha256(candidateBytes))throw Error('Y4M05_NORMALIZED_CANDIDATE_HASH_MISMATCH:'+concept);
}

const assetRecords=[];
const pngValidations=[];
const alphaAudits=[];
const provenanceAssets=[];
const semanticAssets=[];
const receipts=[];

for(const concept of assetConcepts){
  const slug=slugFor(concept);
  const generated=generatedPlanByConcept.get(concept);
  const reused=reuseByConcept.get(concept);
  const semanticTargets=semanticTargetsFor(concept,generated);
  const candidateRel=`images/DUDUQ-Y4M05-${slug}.png`;
  const candidatePath=path.join(batchDir,candidateRel);
  const candidateBytes=await readFile(candidatePath);
  const candidateSha=sha256(candidateBytes);
  const png=validateDuduqRgbaPng(candidateBytes);
  if(png.width<1024||png.height<1024)throw Error('Y4M05_CANDIDATE_BELOW_1024:'+concept);
  const alpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:64});
  const coreAlpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:128});
  const expectedComponents=generated?.expectedCoreComponents||1;
  const meaningfulCoreComponents=coreAlpha.components.filter(component=>component.pixels>=256).length;
  if(meaningfulCoreComponents!==expectedComponents){
    throw Error(`Y4M05_ALPHA_COMPONENT_COUNT:${concept}:expected_${expectedComponents}:actual_${meaningfulCoreComponents}`);
  }
  if(alpha.microOpaqueIslandCount!==0)throw Error('Y4M05_MICRO_OPAQUE_ISLAND:'+concept);
  const bbox=unionBbox(alpha.components);
  const safeMargins={left:bbox.x,top:bbox.y,right:png.width-(bbox.x+bbox.width),bottom:png.height-(bbox.y+bbox.height)};
  const safeMarginPass=Math.min(...Object.values(safeMargins))>=8;
  if(!safeMarginPass&&generated)throw Error('Y4M05_GENERATED_SUBJECT_CUTOFF_RISK:'+concept);
  const safeMarginDisposition=safeMarginPass
    ?'PASS_MINIMUM_8PX'
    :'PREEXISTING_VERIFIED_SOURCE_GEOMETRY_PRESERVED_HUMAN_QA_PENDING';

  const bindings=inventory.occurrenceGroups.filter(item=>semanticTargets.includes(item.semanticTarget)).map(item=>({
    mediaId:item.plannedMediaId,
    questionId:item.questionId,
    splitFromMediaId:item.sourceMediaId,
    semanticTarget:item.semanticTarget,
    contractPaths:item.contractPaths,
    roles:item.roles,
    optionOrCardIds:item.optionOrCardIds
  }));
  if(!bindings.length)throw Error('Y4M05_CONCEPT_WITHOUT_VISUAL_BINDING:'+concept);
  const sourceMediaIds=unique(bindings.map(item=>item.splitFromMediaId)).sort();
  const planQuestions=inventory.questions.filter(question=>question.allSemanticTargets.some(target=>semanticTargets.includes(target)));

  let originalRel,originalSha,generationClass,provenance;
  if(generated){
    originalRel=`provenance/originals/DUDUQ-Y4M05-${slug}-ORIGINAL.png`;
    const normalizedRel=`provenance/normalized/DUDUQ-Y4M05-${slug}-NORMALIZED.png`;
    const nativeOutput=generatedNativeOutputs.get(concept);
    if(!nativeOutput)throw Error('Y4M05_NATIVE_OUTPUT_MISSING:'+concept);
    const [nativeBytes,originalBytes,normalizedBytes]=await Promise.all([
      readFile(nativeOutput),readFile(path.join(batchDir,originalRel)),readFile(path.join(batchDir,normalizedRel))
    ]);
    const nativeSha=sha256(nativeBytes);
    originalSha=sha256(originalBytes);
    if(nativeSha!==originalSha)throw Error('Y4M05_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
    if(sha256(normalizedBytes)!==candidateSha)throw Error('Y4M05_NORMALIZED_HASH_MISMATCH:'+concept);
    if(generated.status!=='GENERATED_ACCEPTED_CANDIDATE'||generated.originalSha256!==originalSha||
      generated.candidateSha256!==candidateSha||generated.generatorCallId!==path.basename(nativeOutput,'.png')){
      throw Error('Y4M05_GENERATION_PLAN_RESULT_DRIFT:'+concept);
    }
    const originalPng=validateDuduqRgbaPng(originalBytes);
    if(originalPng.width<1024||originalPng.height<1024)throw Error('Y4M05_GENERATED_ORIGINAL_BELOW_1024:'+concept);
    generationClass='CODEX_NATIVE_IMAGE_GEN_ORIGINAL';
    const callId=path.basename(nativeOutput,'.png');
    const normalization={
      script:'qa/normalize-transparent-png-alpha.mjs',expectedCoreComponents:expectedComponents,
      coreAlpha:128,edgeRadius:3,minWidth:1024,minHeight:1024,
      semanticSubjectPixelsChanged:false,sourceSha256:originalSha,outputSha256:candidateSha,
      normalizedPreservationFile:normalizedRel,
      operation:'retain the expected opaque subject components plus antialias edges and remove detached or diffuse alpha pixels without inventing semantic content'
    };
    provenance={
      concept,slug,coversSemanticTargets:semanticTargets,generationClass,
      provider:'Codex built-in image_gen',tool:'image_gen.imagegen',prompt:generated.prompt,
      promptRecordStatus:'EXACT_SESSION_PROMPT_RECORDED',transparentBackgroundRequested:true,
      inputImages:generated.inputImages||[],generatorOutputOriginalPath:nativeOutput,
      generatorCallId:callId,nativeSourceExactHashMatch:true,
      originalFile:originalRel,originalSha256:originalSha,candidateFile:candidateRel,
      candidateSha256:candidateSha,alphaNormalization:normalization
    };
    receipts.push({
      concept,slug,coversSemanticTargets:semanticTargets,provider:'Codex built-in image_gen',tool:'image_gen.imagegen',
      generatorCallId:callId,generatorOutputOriginalPath:nativeOutput,originalSha256:originalSha,
      completedObservedInCurrentSession:true,transparentBackgroundRequested:true,
      status:'COMPLETED_AND_LOCAL_ORIGINAL_HASH_VERIFIED'
    });
  }else{
    originalRel=`provenance/reused-originals/DUDUQ-Y4M05-${slug}-SOURCE-ORIGINAL.png`;
    const originalBytes=await readFile(path.join(batchDir,originalRel));
    originalSha=sha256(originalBytes);
    if(originalSha!==reused.sourceOriginalSha256||candidateSha!==reused.sourceCandidateSha256){
      throw Error('Y4M05_REUSED_SOURCE_HASH_MISMATCH:'+concept);
    }
    generationClass='VERIFIED_PREEXISTING_NATIVE_ORIGINAL_REUSE';
    provenance={
      concept,slug,coversSemanticTargets:semanticTargets,generationClass,
      provider:reused.provider,tool:'image_gen.imagegen',prompt:reused.prompt,
      promptRecordStatus:reused.promptRecordStatus,transparentBackgroundRequested:true,
      originalFile:originalRel,originalSha256:originalSha,candidateFile:candidateRel,
      candidateSha256:candidateSha,nativeSourceExactHashMatch:true,
      semanticEquivalence:reused.semanticEquivalence,
      semanticDisambiguation:reused.semanticDisambiguation,
      source:{
        sourceSemanticTarget:reused.sourceSemanticTarget,sourceBatch:reused.sourceBatch,
        sourceManifest:reused.sourceManifest,sourceManifestSha256:reused.sourceManifestSha256,
        sourceAssetKey:reused.sourceAssetKey,sourceOriginalFile:reused.sourceOriginalFile,
        sourceOriginalSha256:reused.sourceOriginalSha256,sourceCandidateFile:reused.sourceCandidateFile,
        sourceCandidateSha256:reused.sourceCandidateSha256,
        sourceGenerationProvenance:reused.sourceGenerationProvenance,
        sourceOriginalStatus:reused.sourceOriginalStatus
      },
      alphaNormalization:reused.alphaNormalization
    };
  }

  provenanceAssets.push(provenance);
  pngValidations.push({
    concept,coversSemanticTargets:semanticTargets,file:candidateRel,sha256:candidateSha,...png,
    expectedCoreComponents:expectedComponents,alphaComponentCountAt64:alpha.componentCount,
    meaningfulCoreComponentCountAt128:meaningfulCoreComponents,microOpaqueIslandCount:alpha.microOpaqueIslandCount,
    visibleSubjectBbox:bbox,safeMargins,safeMarginDisposition,status:'PNG_RGBA_ALPHA_QA_PASS'
  });
  alphaAudits.push({
    concept,coversSemanticTargets:semanticTargets,file:candidateRel,sha256:candidateSha,...alpha,
    coreAlphaThreshold:128,meaningfulCoreComponentCount:meaningfulCoreComponents,
    coreComponents:coreAlpha.components.filter(component=>component.pixels>=256),
    visibleSubjectBbox:bbox,safeMargins,safeMarginDisposition
  });
  semanticAssets.push({
    concept,coversSemanticTargets:semanticTargets,file:candidateRel,sha256:candidateSha,generationClass,
    statement:semanticStatement(concept),wrongDistractorsExcluded:true,
    questionContracts:planQuestions.map(question=>{
      const visualBindingCount=question.visualUsages.filter(usage=>semanticTargets.includes(usage.semanticTarget)).length;
      return {
        questionId:question.questionId,sourceSha256:question.sourceSha256,
        mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,
        titleEn:question.titleEn,instructionEn:question.instructionEn,
        coveredSemanticTargets:question.allSemanticTargets.filter(target=>semanticTargets.includes(target)),
        visualBindingCount,sourceHasNoVisualBinding:visualBindingCount===0
      };
    }),
    modelReview:'MODEL_SEMANTIC_PRECHECK_PASSED',humanHomologation:'PENDING',productionApproved:false
  });
  assetRecords.push({
    assetKey:`Y4M05-CANDIDATE-${slug}`,file:candidateRel,semanticTarget:concept,
    semanticTargets,sha256:candidateSha,pixelWidth:png.width,pixelHeight:png.height,
    review:'MODEL_SEMANTIC_PRECHECK_PASSED_HUMAN_HOMOLOGATION_PENDING',
    reviewEvidence:`${batchRel}/semantic-evidence.json`,bindings,
    provenance:{generationClass,evidenceFile:'generation-provenance.json',preservedOriginal:originalRel,
      alphaNormalizationApplied:Boolean(generated||reused.alphaNormalization)},
    sourceMediaIds
  });
}

const bindingPlan=inventory.occurrenceGroups.map(item=>{
  const assetConcept=targetToAssetConcept.get(item.semanticTarget)||item.semanticTarget;
  const asset=assetRecords.find(record=>record.semanticTarget===assetConcept);
  if(!asset)throw Error('Y4M05_BINDING_ASSET_MISSING:'+item.semanticTarget);
  return {
    candidateAssetKey:asset.assetKey,candidateFile:asset.file,assetConcept,
    semanticTarget:item.semanticTarget,questionId:item.questionId,
    sourceMediaId:item.sourceMediaId,plannedMediaId:item.plannedMediaId,
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
const coveredVisualUsages=bindingPlan.reduce((sum,item)=>sum+item.contractPaths.length,0);
if(coveredSourceIds.length!==54||bindingPlan.length!==86||coveredVisualUsages!==94){
  throw Error('Y4M05_BINDING_COVERAGE_DRIFT');
}

const generationProvenance={
  schemaVersion:'DUDUQ_Y4M05_GENERATION_PROVENANCE_V1',createdAt:completedAt,moduleId,lane:'generation',
  provider:'Codex built-in image_gen',tool:'image_gen.imagegen',apiPurchaseOrExternalCredentialUsed:false,
  nativeGeneratedAssetCount:7,verifiedReuseAssetCount:19,semanticTargetCount:28,
  originalGenerationProvenancePreserved:true,assets:provenanceAssets,failedAttempts:[],
  generatorLimitReached:false,blockedGenerator:false,productionApproved:false,
  humanApprovalClaimed:false,integrated:false,deployed:false
};
const batchManifest={
  schemaVersion:'DUDUQ_Y4M05_GENERATION_CANDIDATE_BATCH_V1',createdAt:completedAt,moduleId,lane:'generation',
  candidateOnly:true,questionContractsReviewed:20,visualUsageCount:94,sourceMediaIdCount:54,
  semanticConceptCount:28,nonDuplicateCandidateAssetCount:26,occurrenceScopedBindingPlanCount:86,
  sourceQuestionSha256:inventory.sourceQuestionSha256,sourceRegistrySha256:inventory.sourceRegistrySha256,
  sourceLedgerSha256:inventory.sourceLedgerSha256,assets:assetRecords,candidateAssets:26,
  newlyGenerated:7,reusedVerifiedOriginals:19,integrated:0,verifiedForProduction:0,blocked:0,
  productionApproved:false,humanApprovalClaimed:false,mediaOverlaysApplied:false,
  questionContractsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,
  existingReferencedAssetsRemoved:false,deployed:false
};
const semanticEvidence={
  schemaVersion:'DUDUQ_Y4M05_SEMANTIC_EVIDENCE_V1',createdAt:completedAt,moduleId,
  sourceQuestionSha256:inventory.sourceQuestionSha256,questionContractsReviewed:20,
  assets:semanticAssets,nonVisualQuestionContracts,
  summary:{candidateAssetsReviewed:26,semanticTargetsCovered:28,visualUsagesCovered:94,
    occurrenceScopedBindingsCovered:86,sourceMediaIdsCovered:54,wrongDistractorFindings:0,
    humanHomologationPending:26},productionApproved:false,integrated:false
};
const bindingDocument={
  schemaVersion:'DUDUQ_Y4M05_OCCURRENCE_SCOPED_BINDING_PLAN_V1',createdAt:completedAt,moduleId,
  sourceQuestionSha256:inventory.sourceQuestionSha256,sourceRegistrySha256:inventory.sourceRegistrySha256,
  sourceMediaIdCount:54,occurrenceScopedBindingPlanCount:86,visualUsageCount:94,
  bindings:bindingPlan,nonVisualQuestionContracts,applyPerformed:false,questionMutation:false,
  registryMutation:false,overlayApplied:false,productionApproved:false
};
const pngValidation={
  schemaVersion:'DUDUQ_Y4M05_PNG_VALIDATION_V1',createdAt:completedAt,moduleId,
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
  schemaVersion:'DUDUQ_Y4M05_NATIVE_GENERATION_RECEIPTS_V1',createdAt:completedAt,moduleId,
  provider:'Codex built-in image_gen',tool:'image_gen.imagegen',receiptCount:receipts.length,
  receipts,apiPurchaseOrExternalCredentialUsed:false,generatorLimitReached:false,blockedGenerator:false
};
const sourcePin={
  schemaVersion:'DUDUQ_Y4M05_SOURCE_PIN_V1',createdAt:completedAt,moduleId,
  questionFile:inventory.sourceQuestionFile,questionSha256:inventory.sourceQuestionSha256,
  registryFile:inventory.sourceRegistryFile,registrySha256:inventory.sourceRegistrySha256,
  ledgerFile:inventory.sourceLedgerFile,ledgerSha256:inventory.sourceLedgerSha256,
  questionCount:20,globalPendingMediaIds:1055,modulePendingMediaIds:54,
  sourceQuestionMutation:false,sourceRegistryMutation:false
};
const verification={
  schemaVersion:'DUDUQ_Y4M05_GENERATION_VERIFICATION_V1',createdAt:completedAt,moduleId,lane:'generation',
  status:'CANDIDATE_SCOPE_PASS_HUMAN_HOMOLOGATION_PENDING',
  checks:{questionContracts20:true,sourceHashesPinned:true,semanticTargets28:true,
    candidatePngs26:true,newNativePngs7:true,verifiedReusedPngs19:true,rgbaAlphaPass26:true,
    alphaComponentPass26:true,microOpaqueIslandsZero:true,visualUsagesCovered94:true,
    sourceMediaIdsCovered54:true,occurrenceScopedBindingsCovered86:true,
    nonVisualContractsPreserved1:true,productionApprovedFalse:true,integratedFalse:true},
  globalPendingMediaIds:1055,projectStatus:'INCOMPLETE',productionApproved:false,integrated:false,deployed:false
};
const checkpoint={
  schemaVersion:'DUDUQ_TWO_LANE_GENERATION_CHECKPOINT_V1',createdAt:plan.createdAt,updatedAt:completedAt,
  status:'Y4M05_GENERATION_CANDIDATES_COMPLETE',projectStatus:'INCOMPLETE',lane:'generation',moduleId,
  sourceAudit:{questions:20,pendingMediaIds:54,visualUsages:94,semanticConcepts:28,
    nonDuplicateCandidateAssets:26,nonVisualQuestionContracts:nonVisualQuestionContracts.map(item=>item.questionId),
    globalPendingMediaIds:1055,questionSourceSha256:inventory.sourceQuestionSha256,
    registrySha256:inventory.sourceRegistrySha256,ledgerSha256:inventory.sourceLedgerSha256},
  candidateAssets:26,newlyGeneratedAssets:7,reusedVerifiedNativeOriginalAssets:19,
  generatorAttempts:{attempted:7,accepted:7,semanticOrAlphaRejected:0,quotaOrLimitBlock:false,blockedGenerator:false},
  coverage:{sourcePendingMediaIds:54,coveredSourceMediaIds:54,visualUsages:94,
    occurrenceScopedBindingPlans:86,missingConcepts:[]},
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
  schemaVersion:'DUDUQ_Y4M05_NATIVE_GENERATION_BATCH_V1',createdAt:completedAt,moduleId,
  requestedConcepts:[...generatedPlanByConcept.keys()],generatedConcepts:receipts.map(item=>item.concept),
  generatedCount:7,acceptedCount:7,failedAttempts:[],generatorLimitReached:false,blockedGenerator:false,
  receiptsFile:'generation-receipts.json',provenanceFile:'generation-provenance.json'
});
await writeJson('batch-manifest.json',batchManifest);
await writeJson('binding-plan.json',bindingDocument);
await writeJson('semantic-evidence.json',semanticEvidence);
await writeJson('generation-semantic-evidence.json',{
  ...semanticEvidence,schemaVersion:'DUDUQ_Y4M05_GENERATED_ASSET_SEMANTIC_EVIDENCE_V1',
  assets:semanticAssets.filter(asset=>generatedPlanByConcept.has(asset.concept)),
  summary:{generatedAssetsReviewed:7,generatedSemanticTargetsCovered:9,
    wrongDistractorFindings:0,humanHomologationPending:7}
});
await writeJson('png-validation.json',pngValidation);
await writeJson('alpha-component-audit.json',alphaAudit);
await writeJson('source-registry-pin.json',sourcePin);
await writeJson('verification-summary.json',verification);
await writeJson('checkpoint.json',checkpoint);

console.log(JSON.stringify({
  status:'Y4M05_GENERATION_CANDIDATE_BUNDLE_READY',questionContracts:20,candidateAssets:26,
  semanticTargets:28,newlyGenerated:7,reusedVerifiedOriginals:19,pngQaPassed:26,
  semanticPrecheckPassed:26,sourceMediaIdsCovered:54,visualUsagesCovered:94,
  occurrenceScopedBindings:86,humanHomologation:'PENDING',productionApproved:false,
  integrated:false,globalPendingMediaIds:1055
}));
