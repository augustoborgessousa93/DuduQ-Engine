#!/usr/bin/env node
/**
 * Reproducible Y3M03 generation-lane candidate builder.
 *
 * Writes only inside this batch directory. It never mutates questions, the
 * media registry, runtime, Gold Masters, approval flags, or production.
 */
import {createHash} from 'node:crypto';
import {access,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';
import {analyzeAlphaComponents} from '../../png-alpha-component-audit.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const moduleId='Y3M03';
const createdAt='2026-11-04T17:47:01.640Z';
const batchRel='qa/media-candidates/y3m03-official-20261104';
const questionRel='dist-pages/content/english/year-3/module-03/questions.json';
const registryRel='dist-pages/content/english/media/media-registry.json';
const ledgerRel='qa/results/media-module-closure.json';
const inventoryRel='qa/results/media-closure-inventory.json';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');

const familyBatch='qa/media-candidates/y2m03-official-20261101';
const numberBatch='qa/media-candidates/y1m02-official-20261030';
const characterBatch='qa/media-candidates/y1m01-official-20261030';

const specs={
  mother:{slug:'MOTHER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-MOTHER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-MOTHER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one mature mother character is isolated; no child, father, grandparent, text, prop, or extra person is present.',
    pedagogicalFit:'Distinct adult-parent age and presentation support the exact family word mother.'},
  father:{slug:'FATHER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-FATHER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-FATHER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one mature father character is isolated; no child, mother, grandparent, text, prop, or extra person is present.',
    pedagogicalFit:'Distinct adult-parent age and presentation support the exact family word father.'},
  brother:{slug:'BROTHER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-BROTHER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-BROTHER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one school-age boy character is isolated; no parent, grandparent, text, prop, or extra person is present.',
    pedagogicalFit:'Child age and presentation support the family vocabulary word brother.'},
  sister:{slug:'SISTER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-SISTER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-SISTER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one school-age girl character is isolated; no parent, grandparent, text, prop, or extra person is present.',
    pedagogicalFit:'Child age and presentation support the family vocabulary word sister.'},
  grandmother:{slug:'GRANDMOTHER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-GRANDMOTHER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-GRANDMOTHER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one clearly elderly grandmother character is isolated with age cues and no text, prop, or extra person.',
    pedagogicalFit:'Older-adult age cues distinguish grandmother from mother and sister.'},
  grandfather:{slug:'GRANDFATHER',sourceBatch:familyBatch,sourceFile:'images/DUDUQ-Y2M03-GRANDFATHER.png',
    originalFile:'provenance/originals/DUDUQ-Y2M03-GRANDFATHER-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one clearly elderly grandfather character is isolated with age cues and no text, prop, or extra person.',
    pedagogicalFit:'Older-adult age cues distinguish grandfather from father and brother.'},
  seven:{slug:'SEVEN',sourceBatch:numberBatch,sourceFile:'images/DUDUQ-Y1M02-SEVEN.png',
    originalFile:'provenance/originals/SEVEN-ORIGINAL.png',expectedObjectCount:7,
    visualObservation:'Exactly seven separated glossy red apples are visible and individually countable; no numeral, text, or extra countable object appears.',
    pedagogicalFit:'The count of seven concrete objects teaches the quantity word seven without answer text.'},
  eight:{slug:'EIGHT',sourceBatch:numberBatch,sourceFile:'images/DUDUQ-Y1M02-EIGHT.png',
    originalFile:'provenance/originals/EIGHT-ORIGINAL.png',expectedObjectCount:8,
    visualObservation:'Exactly eight separated glossy red apples are visible and individually countable; no numeral, text, or extra countable object appears.',
    pedagogicalFit:'The count of eight concrete objects teaches the quantity word eight without answer text.'},
  nine:{slug:'NINE',sourceBatch:numberBatch,sourceFile:'images/DUDUQ-Y1M02-NINE.png',
    originalFile:'provenance/originals/NINE-ORIGINAL.png',expectedObjectCount:9,
    visualObservation:'Exactly nine separated glossy red apples are visible and individually countable; no numeral, text, or extra countable object appears.',
    pedagogicalFit:'The count of nine concrete objects teaches the quantity word nine without answer text.'},
  ten:{slug:'TEN',sourceBatch:numberBatch,sourceFile:'images/DUDUQ-Y1M02-TEN.png',
    originalFile:'provenance/originals/TEN-ORIGINAL.png',expectedObjectCount:10,
    visualObservation:'Exactly ten separated glossy red apples are visible and individually countable; no numeral, text, or extra countable object appears.',
    pedagogicalFit:'The count of ten concrete objects teaches the quantity word ten without answer text.'},
  he:{slug:'HE',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-ADULT-MAN.png',
    originalFile:'provenance/originals/ADULT-MAN-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one generic adult man is isolated; no family-role prop, name label, text, or extra person appears.',
    pedagogicalFit:'A single male referent supports the subject pronoun he while remaining a different character and hash from father, brother, Leo, and Ben.'},
  she:{slug:'SHE',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-ADULT-WOMAN.png',
    originalFile:'provenance/originals/ADULT-WOMAN-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one generic adult woman is isolated; no family-role prop, name label, text, or extra person appears.',
    pedagogicalFit:'A single female referent supports the subject pronoun she while remaining a different character and hash from mother, sister, and Mia.'},
  they:{slug:'THEY',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-CHARACTER-GROUP.png',
    originalFile:'provenance/originals/CHARACTER-GROUP-ORIGINAL.png',expectedObjectCount:4,
    visualObservation:'Four distinct children form one readable plural group; no text, label, prop, or extra distractor appears.',
    pedagogicalFit:'A plural group of people directly supports the subject pronoun they.'},
  mia:{slug:'MIA',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-MIA.png',
    originalFile:'provenance/originals/MIA-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one established DUDUQ character Mia is isolated in her verified coral-and-teal design; no text or extra person appears.',
    pedagogicalFit:'The established character identity is the exact named visual target Mia.'},
  leo:{slug:'LEO',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-LEO.png',
    originalFile:'provenance/originals/LEO-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one established DUDUQ character Leo is isolated in his verified blue design; no text or extra person appears.',
    pedagogicalFit:'The established character identity is the exact named visual target Leo.'},
  ben:{slug:'BEN',sourceBatch:characterBatch,sourceFile:'images/DUDUQ-Y1M01-BEN.png',
    originalFile:'provenance/originals/BEN-ORIGINAL.png',expectedObjectCount:1,
    visualObservation:'Exactly one established DUDUQ character Ben is isolated in his verified red-hair and green-shirt design; no text or extra person appears.',
    pedagogicalFit:'The established character identity is the exact named visual target Ben required by Q015.'}
};

const visibleRoots=['stimulus','options','targetsToFind','items','targets','groups','pairs','bubbleDistractorPool','dragDropContract'];
const failedAttempts=[
  {attempt:1,concept:'he',provider:'OpenAI Codex image_gen.imagegen',transparentBackgroundRequested:true,
    promptSummary:'One generic male referent for the English pronoun he, premium child-friendly rounded 3D concept cutout, one subject filling a transparent square canvas, no text or distractors.',
    verbatimPromptPersisted:false,outcome:'FAILED_OUTPUT_MODERATION_NO_FILE',generatorErrorCode:'moderation_blocked',moderationCategory:'other',
    requestId:'9792c1fc-2496-4fc0-8235-da0296d9c54c',candidateProduced:false,fileProduced:false},
  {attempt:2,concept:'he',provider:'OpenAI Codex image_gen.imagegen',transparentBackgroundRequested:true,
    promptSummary:'Simplified single school-age boy referent for the English pronoun he, premium rounded 3D transparent concept cutout, no text or distractors.',
    verbatimPromptPersisted:false,outcome:'FAILED_INPUT_MODERATION_NO_FILE',generatorErrorCode:'moderation_blocked',moderationCategory:'sexual',
    requestId:'b6708991-fee9-463b-9cee-f358af1f1d45',candidateProduced:false,fileProduced:false}
];

async function exists(file){try{await access(file);return true}catch{return false}}
async function readJson(rel){return JSON.parse(await readFile(path.join(root,rel),'utf8'))}
async function copyIdempotent(source,destination){
  const bytes=await readFile(source),hash=sha256(bytes);
  if(await exists(destination)){
    const existingHash=sha256(await readFile(destination));
    if(existingHash!==hash)throw Error('Y3M03_IDEMPOTENT_COPY_CONFLICT:'+path.relative(root,destination));
    return {sha256:hash,copied:false};
  }
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(source,destination);
  return {sha256:hash,copied:true};
}

function collectVisualUsages(question){
  const records=[];
  function walk(node,field){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+'['+index+']'));return;}
    const media=node.media&&typeof node.media==='object'?node.media:null;
    const mediaId=media?.mediaId??node.mediaId??null;
    const semanticTarget=node.semanticTarget??media?.semanticTarget??null;
    if(typeof mediaId==='string'&&mediaId&&semanticTarget){
      records.push({questionId:question.item_id,mediaId,contractPath:field,
        role:media?.role??node.role??null,semanticTarget,correct:node.correct??null,
        optionOrCardId:node.optionId??node.id??node.targetId??node.pairId??null});
      return;
    }
    for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')walk(value,field?field+'.'+key:key);
  }
  for(const key of visibleRoots)walk(question[key],key);
  for(const [index,binding] of (question.mediaBindings||[]).entries()){
    if(!records.some(record=>record.mediaId===binding.mediaId))records.push({
      questionId:question.item_id,mediaId:binding.mediaId,contractPath:'mediaBindings['+index+']',
      role:binding.role??null,semanticTarget:binding.semanticTarget,correct:null,optionOrCardId:binding.targetId??null
    });
  }
  return records;
}

function contextMediaId(sourceMediaId,questionId,semanticTarget){
  const digest=sha256(Buffer.from(sourceMediaId+'|'+questionId+'|'+normalize(semanticTarget))).slice(0,12).toUpperCase();
  return 'IMG-'+questionId+'-CTX-'+digest;
}

async function buildSourceState(){
  const [questionBytes,registryBytes,ledgerBytes,inventoryBytes]=await Promise.all([
    readFile(path.join(root,questionRel)),readFile(path.join(root,registryRel)),
    readFile(path.join(root,ledgerRel)),readFile(path.join(root,inventoryRel))
  ]);
  const questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),ledger=JSON.parse(ledgerBytes),inventory=JSON.parse(inventoryBytes);
  if(questions.moduleId!==moduleId||questions.itemCount!==20||questions.items?.length!==20)
    throw Error('Y3M03_REQUIRES_EXACT_20_QUESTION_CONTRACT');
  const expectedIds=Array.from({length:20},(_,index)=>moduleId+'-Q'+String(index+1).padStart(3,'0'));
  if(JSON.stringify(questions.items.map(item=>item.item_id))!==JSON.stringify(expectedIds))
    throw Error('Y3M03_QUESTION_SEQUENCE_DRIFT');
  const ledgerModule=ledger.modulesDetail?.find(entry=>entry.moduleId===moduleId);
  if(!ledgerModule||ledger.modules!==30||ledger.activities!==600||inventory.modules!==30||inventory.activities!==600)
    throw Error('Y3M03_CANONICAL_30x600_INVENTORY_UNAVAILABLE');
  if(ledger.distinctPendingMediaIds!==1055||ledgerModule.referencedMediaIds!==29||ledgerModule.provisionalOrBlockedReferencedIds!==29)
    throw Error('Y3M03_CLOSURE_CHECKPOINT_DRIFT:'+ledger.distinctPendingMediaIds+':'+ledgerModule.referencedMediaIds);
  const usages=questions.items.flatMap(question=>collectVisualUsages(question));
  const sourceMediaIds=[...new Set(usages.map(record=>record.mediaId))].sort();
  const concepts=[...new Set(usages.map(record=>normalize(record.semanticTarget)))].sort();
  const expectedConcepts=Object.keys(specs).sort();
  if(sourceMediaIds.length!==29||JSON.stringify(concepts)!==JSON.stringify(expectedConcepts))
    throw Error('Y3M03_INVENTORY_DRIFT:'+sourceMediaIds.length+':'+concepts.join(','));
  const ledgerIds=(ledgerModule.blockers||[]).map(entry=>entry.mediaId).sort();
  if(JSON.stringify(sourceMediaIds)!==JSON.stringify(ledgerIds))throw Error('Y3M03_LEDGER_SOURCE_ID_MISMATCH');
  const registryById=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
  const missingRegistry=sourceMediaIds.filter(mediaId=>!registryById.has(mediaId));
  if(missingRegistry.length)throw Error('Y3M03_REGISTRY_ENTRIES_MISSING:'+missingRegistry.join(','));
  const occurrenceGroups=[];
  for(const sourceMediaId of sourceMediaIds){
    const sourceUsages=usages.filter(record=>record.mediaId===sourceMediaId);
    for(const questionId of [...new Set(sourceUsages.map(record=>record.questionId))]){
      const records=sourceUsages.filter(record=>record.questionId===questionId);
      const semanticTargets=[...new Set(records.map(record=>normalize(record.semanticTarget)))];
      if(semanticTargets.length!==1)throw Error('Y3M03_CONTEXT_SEMANTIC_COLLISION:'+sourceMediaId+':'+questionId);
      occurrenceGroups.push({sourceMediaId,questionId,semanticTarget:semanticTargets[0],
        plannedMediaId:contextMediaId(sourceMediaId,questionId,semanticTargets[0]),
        contractPaths:[...new Set(records.map(record=>record.contractPath))].sort()});
    }
  }
  occurrenceGroups.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId));
  const inventoryById=new Map(inventory.items.map(entry=>[entry.mediaId,entry]));
  return {questionBytes,registryBytes,ledgerBytes,inventoryBytes,questions,registry,ledger,inventory,
    ledgerModule,usages,sourceMediaIds,concepts,registryById,occurrenceGroups,inventoryById};
}

function sourcePromptRecord(concept,asset,generation){
  const promptCatalog=Array.isArray(generation?.promptCatalog)?generation.promptCatalog:[];
  const promptEntry=promptCatalog.find(entry=>normalize(entry.concept)===concept);
  const nativeRecord=(generation?.nativeGeneratedAssets||[]).find(entry=>normalize(entry.concept)===concept);
  return {prompt:asset.provenance?.prompt??promptEntry?.successfulPrompt??null,
    promptRecordStatus:asset.provenance?.originalPromptRecordStatus??(asset.provenance?.prompt||promptEntry?.successfulPrompt?'VERBATIM_SOURCE_PROMPT_PRESERVED':'SOURCE_PROMPT_NOT_AVAILABLE'),
    generatorOutputOriginalPath:nativeRecord?.generatorOutputOriginalPath??asset.provenance?.nativeSourceLocalPathAtReview??null,
    sourceNativeRecord:nativeRecord??null};
}

async function auditAndPrepareSources(state){
  const prepared=[];
  for(const concept of state.concepts){
    const spec=specs[concept];
    const manifestRel=spec.sourceBatch+'/batch-manifest.json';
    const generationRel=spec.sourceBatch+'/generation-provenance.json';
    const manifestBytes=await readFile(path.join(root,manifestRel));
    const manifest=JSON.parse(manifestBytes);
    const generationExists=await exists(path.join(root,generationRel));
    const generationBytes=generationExists?await readFile(path.join(root,generationRel)):null;
    const generation=generationBytes?JSON.parse(generationBytes):null;
    const asset=manifest.assets?.find(candidate=>candidate.file===spec.sourceFile);
    if(!asset)throw Error('Y3M03_REUSE_MANIFEST_ENTRY_MISSING:'+concept);
    const sourcePath=path.join(root,spec.sourceBatch,spec.sourceFile);
    const originalPath=path.join(root,spec.sourceBatch,spec.originalFile);
    const [sourceBytes,originalBytes]=await Promise.all([readFile(sourcePath),readFile(originalPath)]);
    const sourceHash=sha256(sourceBytes),originalHash=sha256(originalBytes);
    if(sourceHash!==String(asset.sha256).toLowerCase())throw Error('Y3M03_REUSE_CANDIDATE_HASH_MISMATCH:'+concept);
    const promptRecord=sourcePromptRecord(concept,asset,generation);
    const expectedOriginalHash=asset.provenance?.originalSha256??promptRecord.sourceNativeRecord?.sha256??null;
    if(expectedOriginalHash&&String(expectedOriginalHash).toLowerCase()!==originalHash)
      throw Error('Y3M03_REUSE_ORIGINAL_HASH_MISMATCH:'+concept);
    const structural=validateDuduqRgbaPng(sourceBytes),alpha=analyzeAlphaComponents(sourceBytes,{alphaThreshold:64});
    const originalStructural=validateDuduqRgbaPng(originalBytes);
    if(!structural.valid||structural.width<1024||structural.height<1024||structural.transparentPixels===0||structural.opaquePixels===0||alpha.microOpaqueIslandCount!==0)
      throw Error('Y3M03_REUSE_PNG_GATE_FAILED:'+concept);
    if(!originalStructural.valid||originalStructural.transparentPixels===0||originalStructural.opaquePixels===0)
      throw Error('Y3M03_REUSE_ORIGINAL_ALPHA_GATE_FAILED:'+concept);
    const candidateRel='images/DUDUQ-Y3M03-'+spec.slug+'.png';
    const originalCopyRel='provenance/reused-originals/DUDUQ-Y3M03-'+spec.slug+'-ORIGINAL.png';
    await copyIdempotent(sourcePath,path.join(batchDir,candidateRel));
    await copyIdempotent(originalPath,path.join(batchDir,originalCopyRel));
    prepared.push({concept,spec,asset,manifest,manifestRel,manifestSha256:sha256(manifestBytes),
      generationRel:generationExists?generationRel:null,generationSha256:generationBytes?sha256(generationBytes):null,
      sourcePath:spec.sourceBatch+'/'+spec.sourceFile,sourceHash,originalPath:spec.sourceBatch+'/'+spec.originalFile,
      originalHash,candidateRel,originalCopyRel,structural,originalStructural,alpha,promptRecord});
  }
  const hashes=prepared.map(item=>item.sourceHash);
  if(new Set(hashes).size!==hashes.length)throw Error('Y3M03_DUPLICATE_CANDIDATE_CONCEPT_HASH');
  return prepared;
}

function subjectBounds(item){
  const boxes=item.alpha.components.filter(component=>component.pixels>item.alpha.microOpaqueIslandPixelLimit).map(component=>component.bbox);
  const minX=Math.min(...boxes.map(box=>box.x)),minY=Math.min(...boxes.map(box=>box.y));
  const maxX=Math.max(...boxes.map(box=>box.x+box.width)),maxY=Math.max(...boxes.map(box=>box.y+box.height));
  const union={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
  return {union,coverage:Number((union.width*union.height/(item.structural.width*item.structural.height)).toFixed(8)),
    margins:{left:minX,top:minY,right:item.structural.width-maxX,bottom:item.structural.height-maxY}};
}

async function buildBundle(){
  await mkdir(batchDir,{recursive:true});
  const state=await buildSourceState();
  const prepared=await auditAndPrepareSources(state);
  const sourceQuestions=state.questions.items.map(question=>{
    const visualUsages=state.usages.filter(record=>record.questionId===question.item_id);
    return {questionId:question.item_id,sequencePosition:question.sequencePosition,topicEn:question.topicEn,
      mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,primaryInstructionEn:question.primaryInstructionEn,
      supportInstructionPt:question.supportInstructionPt,instruction:question.instruction,targetSkill:question.targetSkill,
      curricularObjective:question.curricularObjective,learningTarget:question.learningTarget,answerKey:question.answerKey,
      semanticTargets:[...new Set(visualUsages.map(record=>normalize(record.semanticTarget)))].sort(),
      referencedMediaIds:[...new Set(visualUsages.map(record=>record.mediaId))].sort(),
      visibleMediaUsageCount:visualUsages.length,visualUsages,
      questionContractSha256:sha256(Buffer.from(JSON.stringify(question))),contractSource:question.contractSource??null};
  });
  const questionInventory={schemaVersion:'DUDUQ_MEDIA_QUESTION_INVENTORY_V1',createdAt,moduleId,
    source:questionRel,sourceSha256:sha256(state.questionBytes),registrySource:registryRel,registrySha256:sha256(state.registryBytes),
    scope:'READ_ONLY_CONTRACT_AND_SEMANTIC_TARGET_INVENTORY_BEFORE_CANDIDATE_BINDING',questionCount:20,
    contractResolution:{activities:20,questionsWithVisualMedia:sourceQuestions.filter(q=>q.visibleMediaUsageCount>0).length,
      questionsWithoutVisualMedia:sourceQuestions.filter(q=>q.visibleMediaUsageCount===0).length,
      visibleMediaUsageRecords:state.usages.length,distinctOccurrenceScopedBindings:state.occurrenceGroups.length,
      distinctSourceMediaIds:state.sourceMediaIds.length,exactSemanticConcepts:state.concepts.length},
    canonicalSemanticTargets:state.concepts,generationPlan:{nativeGenerationOutputsThisInvocation:0,
      verifiedReusableOriginalConcepts:state.concepts,totalCandidateConcepts:state.concepts.length,
      reason:'All actual Y3M03 semantics have exact, hash-verified native Codex originals; duplicate generation is prohibited.',
      productionApproved:false,integrationApplied:false},questions:sourceQuestions};

  const assets=prepared.map(item=>{
    const sourceMediaIds=[...new Set(state.usages.filter(record=>normalize(record.semanticTarget)===item.concept).map(record=>record.mediaId))].sort();
    const sourceSet=new Set(sourceMediaIds);
    const bindings=state.occurrenceGroups.filter(group=>sourceSet.has(group.sourceMediaId)).map(group=>({
      mediaId:group.plannedMediaId,questionId:group.questionId,splitFromMediaId:group.sourceMediaId,
      verifiedQuestionIds:[group.questionId],contractPaths:group.contractPaths}));
    const crossModuleSharedMediaIds=sourceMediaIds.filter(mediaId=>(state.inventoryById.get(mediaId)?.modules||[]).some(id=>id!==moduleId));
    return {assetKey:'Y3M03-CANDIDATE-'+item.spec.slug,file:item.candidateRel,semanticTarget:item.concept,
      sha256:item.sourceHash,pixelWidth:item.structural.width,pixelHeight:item.structural.height,
      review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:batchRel+'/generation-semantic-evidence.json',
      bindings,sourceMediaIds,crossModuleSharedMediaIds,provenance:{generationClass:'VERIFIED_PREEXISTING_CODEX_NATIVE_ORIGINAL_REUSE',
        evidenceFile:'generation-provenance.json',sourceManifest:item.manifestRel,sourceFile:item.sourcePath,
        preservedOriginal:item.originalCopyRel,sourceOriginal:item.originalPath}};
  });
  const assetByConcept=new Map(assets.map(asset=>[asset.semanticTarget,asset]));
  const technical=prepared.map(item=>{const bounds=subjectBounds(item);return {concept:item.concept,file:item.candidateRel,
    sha256:item.sourceHash,bytes:item.structural.width&&item.structural.height?(null):null,...item.structural,
    alphaThreshold:item.alpha.alphaThreshold,visiblePixels:item.alpha.visiblePixels,componentCount:item.alpha.componentCount,
    largestComponentCoverage:item.alpha.largestComponentCoverage,secondaryComponentCount:item.alpha.secondaryComponentCount,
    microOpaqueIslandCount:item.alpha.microOpaqueIslandCount,subjectBoundingBox:bounds.union,
    subjectBoundingBoxCanvasCoverage:bounds.coverage,transparentMargins:bounds.margins,realAlpha:true,valid:true};});
  for(const entry of technical)delete entry.bytes;

  const sourceAudit={schemaVersion:'DUDUQ_PREEXISTING_ORIGINAL_PNG_AUDIT_V1',createdAt,moduleId,
    searchScope:[familyBatch,numberBatch,characterBatch],actualQuestionConcepts:state.concepts,
    conceptsAudited:state.concepts.length,verifiedReusableOriginalPngCount:prepared.length,
    generatedConceptCountRequired:0,uniqueCandidateHashes:new Set(prepared.map(item=>item.sourceHash)).size,
    exactHashVerifiedSources:prepared.map(item=>({concept:item.concept,sourceManifest:item.manifestRel,
      sourceManifestSha256:item.manifestSha256,sourceGenerationProvenance:item.generationRel,
      sourceGenerationProvenanceSha256:item.generationSha256,sourceCandidate:item.sourcePath,
      sourceCandidateSha256:item.sourceHash,manifestHashMatches:true,sourceNativeOriginal:item.originalPath,
      sourceNativeOriginalSha256:item.originalHash,preservedOriginalCopy:item.originalCopyRel,
      originalHashMatchesSourceProvenance:true,sourceProvider:item.manifest.provider,
      sourceReview:item.asset.review,technical:{...item.structural,alphaThreshold:item.alpha.alphaThreshold,
        microOpaqueIslandCount:item.alpha.microOpaqueIslandCount},reusable:true})),
    rejectedDuplicates:[{concept:'he',candidate:'DUDUQ-Y1M01-LEO',reason:'Reserved for the distinct named Leo concept; duplicate visual hashes across concepts are prohibited.'},
      {concept:'she',candidate:'DUDUQ-Y1M01-MIA',reason:'Reserved for the distinct named Mia concept; duplicate visual hashes across concepts are prohibited.'}],
    decision:'REUSE_16_EXACT_HASH_VERIFIED_NATIVE_ORIGINALS; GENERATE_0_DUPLICATES',
    currentRegistryAssetsRemainUnchanged:true,canonicalClosureStatus:'CANDIDATE_GENERATION_ONLY_NOT_INTEGRATED'};

  const generationProvenance={schemaVersion:'DUDUQ_CODEX_NATIVE_IMAGE_PROVENANCE_V1',createdAt,moduleId,
    provider:'OpenAI Codex native image generation',tool:'image_gen.imagegen',apiPurchaseOrExternalCredentialUsed:false,
    transparentBackgroundRequired:true,generationResult:'COMPLETE_BY_VERIFIED_PREEXISTING_NATIVE_ORIGINAL_REUSE',
    nativeGeneratedAssetsThisInvocation:[],nativeGeneratedAssetCountThisInvocation:0,
    reusedVerifiedOriginalAssets:prepared.map(item=>({concept:item.concept,sourceBatch:item.spec.sourceBatch,
      sourceManifest:item.manifestRel,sourceManifestSha256:item.manifestSha256,
      sourceGenerationProvenance:item.generationRel,sourceGenerationProvenanceSha256:item.generationSha256,
      sourceCandidate:item.sourcePath,sourceCandidateSha256:item.sourceHash,
      sourceNativeOriginal:item.originalPath,sourceNativeOriginalSha256:item.originalHash,
      preservedOriginalCopy:item.originalCopyRel,candidateFile:item.candidateRel,candidateSha256:item.sourceHash,
      candidateMatchesVerifiedSourceCandidate:true,originalPrompt:item.promptRecord.prompt,
      originalPromptRecordStatus:item.promptRecord.promptRecordStatus,
      originalGeneratorOutputPathAtSourceReview:item.promptRecord.generatorOutputOriginalPath,
      sourceProvider:item.asset.provenance?.provider??item.manifest.provider,
      sourceGenerationClass:item.asset.provenance?.generationClass??'CODEX_NATIVE_IMAGE_GEN_ORIGINAL'})),
    failedAttempts,generatorBlockStatus:'NON_QUOTA_MODERATION_BLOCKS_RECORDED_REUSE_RESOLVED',
    blockedGenerator:false,missingConcepts:[],humanApproval:'PENDING_NOT_CLAIMED',integrationApplied:false,
    productionApproved:false};

  const generationReceipts={schemaVersion:'DUDUQ_CODEX_IMAGE_GENERATION_RECEIPTS_V1',createdAt,moduleId,
    provider:'OpenAI Codex native image generation',tool:'image_gen.imagegen',
    status:'NO_NEW_GENERATION_OUTPUT_REQUIRED_AFTER_COMPLETE_VERIFIED_REUSE_AUDIT',
    assets:prepared.map(item=>({concept:item.concept,disposition:'REUSED_VERIFIED_NATIVE_ORIGINAL',
      candidateFile:item.candidateRel,sha256:item.sourceHash,originalCopy:item.originalCopyRel,originalSha256:item.originalHash})),
    failedAttempts,blockedGenerator:false,blocker:null,productionApproved:false,integrationApplied:false};

  const semanticAssets=assets.map(asset=>{const item=prepared.find(candidate=>candidate.concept===asset.semanticTarget);
    const questionUsages=state.usages.filter(record=>normalize(record.semanticTarget)===asset.semanticTarget);
    return {assetKey:asset.assetKey,concept:asset.semanticTarget,file:asset.file,sha256:asset.sha256,
      expectedObjectCount:item.spec.expectedObjectCount,semanticPrecheck:'PASSED',visualObservation:item.spec.visualObservation,
      pedagogicalFit:item.spec.pedagogicalFit,wrongDistractorsAbsent:true,
      questionIds:[...new Set(asset.bindings.map(binding=>binding.questionId))].sort(),
      sourceMediaIds:asset.sourceMediaIds,contractEvidence:questionUsages,
      technicalQc:technical.find(entry=>entry.file===asset.file),
      provenanceClass:asset.provenance.generationClass,generatedThisInvocation:false};});
  const semanticEvidence={schemaVersion:'DUDUQ_MEDIA_SEMANTIC_EVIDENCE_V1',createdAt,moduleId,
    evidenceBoundary:'Codex generation-lane technical and visual semantic precheck only. Candidate is not integrated, human-homologated, production-approved, merged, or deployed.',
    reviewedQuestionCount:20,exactSemanticConceptCount:state.concepts.length,
    logicalVisualUsageRecords:state.usages.length,sourceMediaIdsReviewed:state.sourceMediaIds.length,
    occurrenceScopedBindingPlans:state.occurrenceGroups.length,assets:semanticAssets,
    missingConcepts:[],approvalGranted:false,humanHomologationClaimed:false,answerKeysModified:false,
    questionContractsModified:false,mechanicsModified:false,registryModified:false,goldMastersModified:false,productionModified:false};

  const bindingRows=state.sourceMediaIds.map(mediaId=>{
    const sourceUsages=state.usages.filter(record=>record.mediaId===mediaId);
    const semanticTargets=[...new Set(sourceUsages.map(record=>normalize(record.semanticTarget)))];
    if(semanticTargets.length!==1)throw Error('Y3M03_SOURCE_MEDIA_SEMANTIC_COLLISION:'+mediaId);
    const semanticTarget=semanticTargets[0],asset=assetByConcept.get(semanticTarget),registry=state.registryById.get(mediaId);
    return {mediaId,canonicalLedgerStatus:state.ledgerModule.blockers.find(entry=>entry.mediaId===mediaId)?.status,
      registryStatus:registry.status,crossModuleShared:(state.inventoryById.get(mediaId)?.modules||[]).some(id=>id!==moduleId),
      allReferencedModules:state.inventoryById.get(mediaId)?.modules||[],
      currentSourceAsset:{kind:registry.kind,urlOrPath:registry.urlOrPath,sha256:registry.assets?.[0]?.sha256??registry.sha256??null,
        format:path.extname(registry.urlOrPath||'').slice(1).toUpperCase(),refinementStatus:registry.refinementStatus??registry.integrationStatus??null},
      candidateFile:asset.file,candidateSha256:asset.sha256,semanticTarget,questionUsages:sourceUsages,
      occurrenceScopedBindings:state.occurrenceGroups.filter(group=>group.sourceMediaId===mediaId),
      integrationInstruction:'Generation lane only: do not mutate this registry ID. Independent integration must review every exact occurrence before any context-scoped overlay or reuse decision.'};
  });
  const coveredOccurrenceIds=new Set(assets.flatMap(asset=>asset.bindings.map(binding=>binding.mediaId)));
  const bindingPlan={schemaVersion:'DUDUQ_MEDIA_BINDING_PLAN_V1',createdAt,moduleId,mode:'CANDIDATE_ONLY_NOT_APPLIED',
    questionSource:questionRel,questionSourceSha256:sha256(state.questionBytes),pendingMediaIdCount:state.sourceMediaIds.length,
    candidateConceptCount:assets.length,totalVisualUsageRecords:state.usages.length,
    distinctOccurrenceScopedBindings:state.occurrenceGroups.length,
    coverage:{pendingMediaIds:state.sourceMediaIds.length,candidateBoundMediaIds:new Set(assets.flatMap(asset=>asset.sourceMediaIds)).size,
      uncoveredMediaIds:[],occurrenceScopedCandidateIds:coveredOccurrenceIds.size,exactSemanticConcepts:assets.length},
    bindings:bindingRows,applicationStatus:'NOT_APPLIED',integrationStatus:'PENDING_INDEPENDENT_INTEGRATION_LANE',
    productionStatus:'NOT_APPROVED'};

  const manifest={schemaVersion:'DUDUQ_CHATGPT_MEDIA_BINDINGS_V1',createdAt,moduleId,
    source:'Codex generation lane using verified pre-existing native image-generation originals',
    provider:'OpenAI Codex native image generation',status:'HASH_BOUND_REUSE_CANDIDATE_BUNDLE_READY_FOR_INDEPENDENT_INTEGRATION_QA',
    questionSource:questionRel,questionSourceSha256:sha256(state.questionBytes),originalAuditedPendingIds:29,
    finalBindingIds:coveredOccurrenceIds.size,totalQuestionUsageRecords:state.usages.length,questionContractsReviewed:20,
    exactSemanticConcepts:assets.length,nativeGeneratedThisInvocation:0,verifiedNativeOriginalsReused:assets.length,
    preservesAnswerKeysAndMechanics:true,productionApproved:false,integrated:false,approvalFlagsChanged:false,
    assets,applicationStatus:'NOT_APPLIED',integrationStatus:'PENDING_INDEPENDENT_INTEGRATION_LANE',productionStatus:'NOT_APPROVED'};

  const sourceEntries=state.sourceMediaIds.map(mediaId=>state.registryById.get(mediaId));
  const sourcePin={schemaVersion:'DUDUQ_Y3M03_SOURCE_REGISTRY_PIN_V1',createdAt,moduleId,
    activeQuestionSource:questionRel,activeQuestionSourceSha256:sha256(state.questionBytes),
    registrySource:registryRel,registrySha256:sha256(state.registryBytes),registryEntryCount:state.registry.entries.length,
    canonicalLedger:ledgerRel,canonicalLedgerSha256:sha256(state.ledgerBytes),
    canonicalInventory:inventoryRel,canonicalInventorySha256:sha256(state.inventoryBytes),
    globalStateAtAudit:{modules:state.ledger.modules,activities:state.ledger.activities,
      completedModules:state.ledger.completedModules,pendingModules:state.ledger.pendingModules,
      distinctPendingMediaIds:state.ledger.distinctPendingMediaIds,distinctVerifiedMediaIds:state.ledger.distinctVerifiedMediaIds},
    moduleStateAtAudit:{referencedMediaIds:state.ledgerModule.referencedMediaIds,
      provisionalOrBlockedReferencedIds:state.ledgerModule.provisionalOrBlockedReferencedIds,
      unverifiedReferencedIds:state.ledgerModule.unverifiedReferencedIds,verifiedReferencedIds:state.ledgerModule.verifiedReferencedIds,
      brokenReferencedIds:state.ledgerModule.brokenReferencedIds,complete:state.ledgerModule.complete},
    sourceMediaIds:state.sourceMediaIds,sourceRegistryEntryProjectionSha256:sha256(Buffer.from(JSON.stringify(sourceEntries))),
    sourceQuestionContractHashes:sourceQuestions.map(question=>({questionId:question.questionId,sha256:question.questionContractSha256})),
    sourceHashesRewritten:false,questionsModified:false,registryModified:false,productionApproved:false};

  const pngValidation={schemaVersion:'DUDUQ_PNG_VALIDATION_V1',createdAt,moduleId,
    validationMode:'READ_ONLY_STRUCTURAL_RGBA_ALPHA_AND_SUBJECT_BOUNDS',assetCount:technical.length,
    validAssetCount:technical.filter(entry=>entry.valid).length,allAssetsHaveRealAlpha:true,allCandidateHashesUnique:true,assets:technical};
  const alphaAudit={schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',createdAt,
    candidateDir:batchRel,manifest:batchRel+'/batch-manifest.json',alphaThreshold:64,assetCount:assets.length,
    assets:prepared.map(item=>({file:item.candidateRel,sha256:item.sourceHash,width:item.structural.width,height:item.structural.height,
      alphaThreshold:item.alpha.alphaThreshold,visiblePixels:item.alpha.visiblePixels,componentCount:item.alpha.componentCount,
      largestComponentPixels:item.alpha.largestComponentPixels,largestComponentCoverage:item.alpha.largestComponentCoverage,
      secondaryComponentCount:item.alpha.secondaryComponentCount,microOpaqueIslandPixelLimit:item.alpha.microOpaqueIslandPixelLimit,
      microOpaqueIslandCount:item.alpha.microOpaqueIslandCount,microOpaqueIslandPixels:item.alpha.microOpaqueIslandPixels,
      components:item.alpha.components}))};

  const checkpoint={schemaVersion:'DUDUQ_TWO_LANE_GENERATION_CHECKPOINT_V1',createdAt,updatedAt:createdAt,
    status:'Y3M03_GENERATION_CANDIDATES_COMPLETE_BY_VERIFIED_REUSE',projectStatus:'INCOMPLETE',lane:'generation',moduleId,
    unattendedStateObserved:{runs:67,status:'IN_PROGRESS',activeLane:'generation',activeModule:'Y3M03',
      lastLane:'integration',lastGeneratedModule:'Y3M02',lastIntegratedModule:'Y2M01',
      pendingBefore:1055,pendingAfterPreviousRun:1055,consecutiveNoProgress:13,observedUpdatedAt:'2026-11-04T17:33:13.180Z'},
    sourceAudit:{questions:20,pendingMediaIds:29,semanticConcepts:16,globalPendingMediaIds:1055,
      questionSourceSha256:sha256(state.questionBytes),registrySha256:sha256(state.registryBytes)},
    candidateAssets:assets.length,newlyGeneratedAssets:0,reusedVerifiedNativeOriginalAssets:assets.length,
    generatorAttempts:{failedModerationNoFile:failedAttempts.length,quotaOrLimitBlock:false,blockedGenerator:false},
    coverage:{sourcePendingMediaIds:29,coveredSourceMediaIds:new Set(assets.flatMap(asset=>asset.sourceMediaIds)).size,
      occurrenceScopedBindingPlans:coveredOccurrenceIds.size,missingConcepts:[]},
    writeBoundary:batchRel,questionsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,
    approvalFlagsModified:false,productionModified:false,mediaOverlaysApplied:false,existingReferencedAssetsRemoved:false,
    humanApprovalClaimed:false,productionApproved:false,integrated:false,deployed:false,
    candidateBundleCommit:null,reviewBranch:'automation/duduq-media-source-only-fix-20261029',
    nextAction:'SCHEDULER_SELECT_OTHER_LANE',completionClaim:'MODULE_CANDIDATE_SCOPE_ONLY_PROJECT_REMAINS_INCOMPLETE'};
  const laneVerification={schemaVersion:'DUDUQ_TWO_LANE_GENERATION_WRITE_BOUNDARY_V1',createdAt,moduleId,lane:'generation',
    allowedWrites:[batchRel+'/**'],forbiddenWrites:['content/**','dist-pages/content/**','core/**','runtime/**','production/**'],
    candidateOnly:true,registryMutation:false,questionMutation:false,overlayApplication:false,approvalMutation:false,
    productionMergeOrDeploy:false,existingAssetRemoval:false,secondCodexProcessStarted:false,
    schedulerSerializationPreserved:true,independentIntegrationRequired:true};

  const manifestBytes=jsonBytes(manifest);
  await Promise.all([
    writeFile(path.join(batchDir,'question-inventory.json'),jsonBytes(questionInventory)),
    writeFile(path.join(batchDir,'preexisting-original-audit.json'),jsonBytes(sourceAudit)),
    writeFile(path.join(batchDir,'generation-provenance.json'),jsonBytes(generationProvenance)),
    writeFile(path.join(batchDir,'generation-receipts.json'),jsonBytes(generationReceipts)),
    writeFile(path.join(batchDir,'generation-semantic-evidence.json'),jsonBytes(semanticEvidence)),
    writeFile(path.join(batchDir,'semantic-evidence.json'),jsonBytes(semanticEvidence)),
    writeFile(path.join(batchDir,'binding-plan.json'),jsonBytes(bindingPlan)),
    writeFile(path.join(batchDir,'batch-manifest.json'),manifestBytes),
    writeFile(path.join(batchDir,'generation-batch-manifest.json'),manifestBytes),
    writeFile(path.join(batchDir,'source-registry-pin.json'),jsonBytes(sourcePin)),
    writeFile(path.join(batchDir,'png-validation.json'),jsonBytes(pngValidation)),
    writeFile(path.join(batchDir,'alpha-component-audit.json'),jsonBytes(alphaAudit)),
    writeFile(path.join(batchDir,'checkpoint.json'),jsonBytes(checkpoint)),
    writeFile(path.join(batchDir,'two-lane-verification.json'),jsonBytes(laneVerification))
  ]);
  console.log(JSON.stringify({status:checkpoint.status,questions:20,pendingSourceMediaIds:29,
    semanticConcepts:16,candidateAssets:assets.length,nativeGeneratedThisInvocation:0,
    reusedVerifiedNativeOriginals:prepared.length,failedModerationAttemptsNoFile:failedAttempts.length,
    logicalVisualUsageRecords:state.usages.length,occurrenceScopedBindings:coveredOccurrenceIds.size,
    allPngsValid:technical.every(entry=>entry.valid),allCandidateHashesUnique:new Set(prepared.map(item=>item.sourceHash)).size===prepared.length,
    projectStatus:'INCOMPLETE',productionApproved:false,integrated:false},null,2));
}

async function recordCommit(commit){
  if(!/^[0-9a-f]{40}$/i.test(commit))throw Error('Y3M03_INVALID_COMMIT_HASH');
  const checkpointPath=path.join(batchDir,'checkpoint.json');
  const checkpoint=JSON.parse(await readFile(checkpointPath,'utf8'));
  checkpoint.candidateBundleCommit=commit.toLowerCase();
  checkpoint.commitRecordedAt=checkpoint.commitRecordedAt??createdAt;
  checkpoint.checkpointCommitRelationship='This checkpoint is committed immediately after the candidate bundle commit it records.';
  await writeFile(checkpointPath,jsonBytes(checkpoint));
  console.log(JSON.stringify({status:'Y3M03_CANDIDATE_BUNDLE_COMMIT_RECORDED',candidateBundleCommit:checkpoint.candidateBundleCommit},null,2));
}

async function verifyExistingBundle(){
  const [manifest,questionInventory,bindingPlan,provenance,checkpoint,pngValidation]=await Promise.all([
    'batch-manifest.json','question-inventory.json','binding-plan.json','generation-provenance.json','checkpoint.json','png-validation.json'
  ].map(file=>readFile(path.join(batchDir,file),'utf8').then(JSON.parse)));
  if(manifest.assets?.length!==16||questionInventory.questions?.length!==20||bindingPlan.bindings?.length!==29)
    throw Error('Y3M03_SELF_CONTAINED_EVIDENCE_COUNT_MISMATCH');
  if(provenance.reusedVerifiedOriginalAssets?.length!==16||provenance.nativeGeneratedAssetCountThisInvocation!==0)
    throw Error('Y3M03_SELF_CONTAINED_PROVENANCE_MISMATCH');
  if(checkpoint.projectStatus!=='INCOMPLETE'||checkpoint.productionApproved!==false||manifest.integrated!==false)
    throw Error('Y3M03_SELF_CONTAINED_SAFETY_STATE_MISMATCH');
  const candidateHashes=[];
  for(const asset of manifest.assets){
    const bytes=await readFile(path.join(batchDir,asset.file));
    const actualHash=sha256(bytes),structural=validateDuduqRgbaPng(bytes);
    if(actualHash!==asset.sha256||!structural.valid||structural.transparentPixels===0||structural.opaquePixels===0)
      throw Error('Y3M03_SELF_CONTAINED_CANDIDATE_INVALID:'+asset.file);
    candidateHashes.push(actualHash);
  }
  for(const record of provenance.reusedVerifiedOriginalAssets){
    const bytes=await readFile(path.join(batchDir,record.preservedOriginalCopy));
    if(sha256(bytes)!==record.sourceNativeOriginalSha256)throw Error('Y3M03_SELF_CONTAINED_ORIGINAL_INVALID:'+record.concept);
  }
  if(new Set(candidateHashes).size!==16||pngValidation.validAssetCount!==16)
    throw Error('Y3M03_SELF_CONTAINED_UNIQUENESS_OR_PNG_GATE_FAILED');
  console.log(JSON.stringify({status:'Y3M03_SELF_CONTAINED_CANDIDATE_VERIFICATION_PASS',
    candidateAssets:16,verifiedNativeOriginalCopies:16,questions:20,sourceMediaIds:29,
    nativeGeneratedThisInvocation:0,allCandidateHashesUnique:true,projectStatus:'INCOMPLETE',
    productionApproved:false,integrated:false},null,2));
}

const recordIndex=process.argv.indexOf('--record-commit');
if(recordIndex>=0)await recordCommit(process.argv[recordIndex+1]);
else if(process.argv.includes('--verify-existing'))await verifyExistingBundle();
else await buildBundle();
