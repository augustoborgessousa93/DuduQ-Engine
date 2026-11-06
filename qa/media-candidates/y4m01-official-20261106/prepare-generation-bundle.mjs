#!/usr/bin/env node
/**
 * Reproducible Y4M01 generation-lane candidate builder.
 *
 * This script writes only inside its module-specific candidate batch. It does
 * not mutate questions, answers, the media registry, runtime, Gold Masters,
 * approval flags, overlays or production state.
 */
import {createHash} from 'node:crypto';
import {access,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';
import {analyzeAlphaComponents} from '../../png-alpha-component-audit.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const moduleId='Y4M01';
const createdAt='2026-11-06T09:13:52.327Z';
const batchRel='qa/media-candidates/y4m01-official-20261106';
const questionRel='dist-pages/content/english/year-4/module-01/questions.json';
const registryRel='dist-pages/content/english/media/media-registry.json';
const ledgerRel='qa/results/media-module-closure.json';
const inventoryRel='qa/results/media-closure-inventory.json';
const inputRel=batchRel+'/generation-input.json';
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');
const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const slash=value=>String(value).replaceAll('\\','/');
const visibleRoots=['stimulus','options','targetsToFind','items','targets','groups','pairs','bubbleDistractorPool','dragDropContract'];

async function exists(file){try{await access(file);return true}catch{return false}}
async function writeJson(name,value){
  const destination=path.join(batchDir,name);
  assertInsideBatch(destination);
  await writeFile(destination,jsonBytes(value));
}
function assertInsideBatch(file){
  const resolved=path.resolve(file);
  if(resolved!==batchDir&&!resolved.startsWith(batchDir+path.sep))throw Error('Y4M01_WRITE_OUTSIDE_BATCH:'+resolved);
}
async function copyIdempotent(source,destination){
  assertInsideBatch(destination);
  const bytes=await readFile(source),hash=sha256(bytes);
  if(await exists(destination)){
    const existingHash=sha256(await readFile(destination));
    if(existingHash!==hash)throw Error('Y4M01_IDEMPOTENT_COPY_CONFLICT:'+slash(path.relative(root,destination)));
    return {sha256:hash,copied:false};
  }
  await mkdir(path.dirname(destination),{recursive:true});
  await copyFile(source,destination);
  return {sha256:hash,copied:true};
}
let normalizerRun=0;
async function runAlphaNormalizer(source,destination,expectedComponents){
  assertInsideBatch(destination);
  const script=path.join(root,'qa/normalize-transparent-png-alpha.mjs');
  const previousArgv=process.argv;
  process.argv=[process.execPath,script,'--input',source,'--output',destination,
    '--components',String(expectedComponents),'--core-alpha','128','--edge-radius','3',
    '--min-width','1024','--min-height','1024'];
  try{
    await import(pathToFileURL(script).href+'?y4m01='+normalizerRun++);
  }finally{
    process.argv=previousArgv;
  }
  const [sourceBytes,outputBytes]=await Promise.all([readFile(source),readFile(destination)]);
  return {status:'ALPHA_NORMALIZED_IN_PROCESS',expectedComponents,coreAlpha:128,edgeRadius:3,
    minWidth:1024,minHeight:1024,sourceSha256:sha256(sourceBytes),outputSha256:sha256(outputBytes)};
}

function collectVisualUsages(question){
  const records=[];
  function walk(node,field){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach((value,index)=>walk(value,field+'['+index+']'));return;}
    const media=node.media&&typeof node.media==='object'?node.media:null;
    const mediaId=media?.mediaId??media?.assetId??node.mediaId??node.assetId??node.image_ref??node.imageRef??null;
    const semanticTarget=node.semanticTarget??media?.semanticTarget??null;
    if(typeof mediaId==='string'&&mediaId&&semanticTarget){
      records.push({questionId:question.item_id,mediaId,contractPath:field,
        role:media?.role??node.role??null,semanticTarget:normalize(semanticTarget),correct:node.correct??null,
        optionOrCardId:node.optionId??node.id??node.targetId??node.pairId??null});
      return;
    }
    for(const [key,value] of Object.entries(node))if(value&&typeof value==='object')walk(value,field?field+'.'+key:key);
  }
  for(const key of visibleRoots)walk(question[key],key);
  for(const [index,binding] of (question.mediaBindings||[]).entries()){
    if(!records.some(record=>record.mediaId===binding.mediaId))records.push({
      questionId:question.item_id,mediaId:binding.mediaId,contractPath:'mediaBindings['+index+']',
      role:binding.role??null,semanticTarget:normalize(binding.semanticTarget),correct:null,
      optionOrCardId:binding.targetId??null
    });
  }
  return records;
}
function collectAllSemanticTargets(question){
  const values=[];
  function walk(node){
    if(!node||typeof node!=='object')return;
    if(Array.isArray(node)){node.forEach(walk);return;}
    if(node.semanticTarget)values.push(normalize(node.semanticTarget));
    for(const value of Object.values(node))if(value&&typeof value==='object')walk(value);
  }
  walk(question);
  return [...new Set(values)].sort();
}
function contextMediaId(sourceMediaId,questionId,semanticTarget){
  const digest=sha256(Buffer.from(sourceMediaId+'|'+questionId+'|'+normalize(semanticTarget))).slice(0,12).toUpperCase();
  return 'IMG-'+questionId+'-CTX-'+digest;
}
function questionHash(question){return sha256(Buffer.from(JSON.stringify(question)))}
function sourceProjectionHash(entries){
  return sha256(jsonBytes(entries.map(entry=>({mediaId:entry.mediaId,status:entry.status,temporary:entry.temporary,
    semantic:entry.semantic??entry.altText??null,urlOrPath:entry.urlOrPath??null,assets:entry.assets??[]}))));
}
function boundsFromAlpha(alpha,structural){
  const significant=alpha.components.filter(component=>component.pixels>alpha.microOpaqueIslandPixelLimit);
  if(!significant.length)throw Error('Y4M01_NO_SIGNIFICANT_ALPHA_COMPONENTS');
  const minX=Math.min(...significant.map(x=>x.bbox.x)),minY=Math.min(...significant.map(x=>x.bbox.y));
  const maxX=Math.max(...significant.map(x=>x.bbox.x+x.bbox.width)),maxY=Math.max(...significant.map(x=>x.bbox.y+x.bbox.height));
  const union={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
  return {union,canvasCoverage:Number((union.width*union.height/(structural.width*structural.height)).toFixed(8)),
    widthFill:Number((union.width/structural.width).toFixed(8)),heightFill:Number((union.height/structural.height).toFixed(8)),
    margins:{left:minX,top:minY,right:structural.width-maxX,bottom:structural.height-maxY},
    touchesCanvasEdge:minX===0||minY===0||maxX===structural.width||maxY===structural.height};
}
function locatePrompt(generation,concept,sourceFile){
  const target=normalize(concept);
  if(generation?.promptCatalog&&typeof generation.promptCatalog==='object'&&!Array.isArray(generation.promptCatalog)){
    const key=Object.keys(generation.promptCatalog).find(value=>normalize(value)===target);
    const entry=key?generation.promptCatalog[key]:null;
    const prompt=entry?.successfulPrompt??entry?.prompt??entry?.provenance?.prompt;
    if(prompt)return prompt;
  }
  const catalogs=[generation?.promptCatalog,generation?.assets,generation?.nativeGeneratedAssets].filter(Array.isArray);
  for(const catalog of catalogs){
    const found=catalog.find(record=>normalize(record.concept??record.semanticTarget)===target||record.candidateFile===sourceFile);
    const prompt=found?.successfulPrompt??found?.prompt??found?.provenance?.prompt;
    if(prompt)return prompt;
  }
  return null;
}
function locateGenerationRecord(generation,concept,sourceFile){
  const target=normalize(concept);
  for(const catalog of [generation?.assets,generation?.nativeGeneratedAssets,generation?.promptCatalog].filter(Array.isArray)){
    const record=catalog.find(value=>normalize(value.concept??value.semanticTarget)===target||value.candidateFile===sourceFile);
    if(record)return record;
  }
  return null;
}
async function sessionEvidence(spec){
  if(!spec.sourceSessionTranscript)return null;
  const transcriptPath=path.resolve(spec.sourceSessionTranscript);
  const bytes=await readFile(transcriptPath),text=bytes.toString('utf8');
  if(!spec.generatorCallId||!text.includes(spec.generatorCallId))throw Error('Y4M01_SESSION_CALL_EVIDENCE_MISSING:'+spec.concept);
  let generationRecord=null;
  for(const line of text.split(/\r?\n/)){
    if(!line.includes(spec.generatorCallId)||!line.includes('image_gen.generation'))continue;
    try{
      const parsed=JSON.parse(line),item=parsed.payload?.item;
      if(item?.kind==='image_gen.generation'&&item.id===spec.generatorCallId){
        generationRecord={id:item.id,status:item.status,revisedPrompt:item.revisedPrompt};
        break;
      }
    }catch{}
  }
  if(!generationRecord)throw Error('Y4M01_SESSION_GENERATION_RECORD_MISSING:'+spec.concept);
  if(spec.prompt&&generationRecord.revisedPrompt!==spec.prompt)throw Error('Y4M01_SESSION_PROMPT_EVIDENCE_MISSING:'+spec.concept);
  return {transcript:slash(transcriptPath),generatorCallId:spec.generatorCallId,
    stableGenerationRecordSha256:sha256(jsonBytes(generationRecord)),generationStatus:generationRecord.status,
    promptEvidence:'VERBATIM_REVISED_PROMPT_PRESENT_IN_CODEX_SESSION'};
}

const inputBytes=await readFile(path.join(root,inputRel));
const input=JSON.parse(inputBytes);
if(input.moduleId!==moduleId||input.lane!=='generation'||input.writeBoundary!==batchRel)
  throw Error('Y4M01_GENERATION_INPUT_SCOPE_INVALID');
if(input.provider!=='OpenAI Codex native image generation'||input.tool!=='image_gen.imagegen'||input.apiPurchaseOrExternalCredentialUsed!==false)
  throw Error('Y4M01_NATIVE_PROVIDER_PROVENANCE_INVALID');
if(input.generated?.length!==11||input.reused?.length!==0||input.failedAttempts?.length!==1)
  throw Error('Y4M01_REQUIRES_11_GENERATED_0_REUSED_AND_1_REJECTED_ATTEMPT');
const specRecords=[...input.generated.map(record=>({...record,generationMode:'NATIVE_GENERATED'})),
  ...input.reused.map(record=>({...record,generationMode:'VERIFIED_REUSE'}))];
const specByConcept=new Map();
for(const record of specRecords){
  const concept=normalize(record.concept);
  if(!concept||specByConcept.has(concept))throw Error('Y4M01_DUPLICATE_OR_EMPTY_CONCEPT:'+concept);
  specByConcept.set(concept,{...record,concept});
}

const [questionBytes,registryBytes,ledgerBytes,inventoryBytes]=await Promise.all([
  readFile(path.join(root,questionRel)),readFile(path.join(root,registryRel)),
  readFile(path.join(root,ledgerRel)),readFile(path.join(root,inventoryRel))
]);
const questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),ledger=JSON.parse(ledgerBytes),inventory=JSON.parse(inventoryBytes);
if(questions.moduleId!==moduleId||questions.itemCount!==20||questions.items?.length!==20)
  throw Error('Y4M01_REQUIRES_EXACT_20_QUESTION_CONTRACT');
const expectedQuestionIds=Array.from({length:20},(_,index)=>moduleId+'-Q'+String(index+1).padStart(3,'0'));
if(JSON.stringify(questions.items.map(item=>item.item_id))!==JSON.stringify(expectedQuestionIds))throw Error('Y4M01_QUESTION_SEQUENCE_DRIFT');
const ledgerModule=ledger.modulesDetail?.find(entry=>entry.moduleId===moduleId);
if(ledger.modules!==30||ledger.activities!==600||inventory.modules!==30||inventory.activities!==600||!ledgerModule)
  throw Error('Y4M01_CANONICAL_30x600_INVENTORY_UNAVAILABLE');
if(ledger.distinctPendingMediaIds!==1055||ledgerModule.referencedMediaIds!==33||ledgerModule.provisionalOrBlockedReferencedIds!==33||
  ledgerModule.unverifiedReferencedIds!==0||ledgerModule.brokenReferencedIds!==0)
  throw Error('Y4M01_CLOSURE_CHECKPOINT_DRIFT:'+ledger.distinctPendingMediaIds+':'+ledgerModule.referencedMediaIds);

const usages=questions.items.flatMap(collectVisualUsages);
const sourceMediaIds=[...new Set(usages.map(record=>record.mediaId))].sort();
const visualConcepts=[...new Set(usages.map(record=>record.semanticTarget))].sort();
const expectedConcepts=[...specByConcept.keys()].sort();
if(usages.length!==81||sourceMediaIds.length!==33||JSON.stringify(visualConcepts)!==JSON.stringify(expectedConcepts))
  throw Error('Y4M01_VISUAL_INVENTORY_DRIFT:'+usages.length+':'+sourceMediaIds.length+':'+visualConcepts.join(','));
const allSemanticTargets=[...new Set(questions.items.flatMap(collectAllSemanticTargets))].sort();
const nonVisualOnly=allSemanticTargets.filter(concept=>!specByConcept.has(concept));
if(allSemanticTargets.length!==12||JSON.stringify(nonVisualOnly)!==JSON.stringify(['name']))
  throw Error('Y4M01_NON_VISUAL_SEMANTIC_SCOPE_DRIFT:'+nonVisualOnly.join(','));
const ledgerIds=(ledgerModule.blockers||[]).map(entry=>entry.mediaId).sort();
if(JSON.stringify(sourceMediaIds)!==JSON.stringify(ledgerIds))throw Error('Y4M01_LEDGER_SOURCE_ID_MISMATCH');
const registryById=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
const missingRegistry=sourceMediaIds.filter(mediaId=>!registryById.has(mediaId));
if(missingRegistry.length)throw Error('Y4M01_REGISTRY_ENTRIES_MISSING:'+missingRegistry.join(','));

const occurrenceGroups=[];
for(const sourceMediaId of sourceMediaIds){
  const sourceUsages=usages.filter(record=>record.mediaId===sourceMediaId);
  for(const questionId of [...new Set(sourceUsages.map(record=>record.questionId))]){
    const records=sourceUsages.filter(record=>record.questionId===questionId);
    const semanticTargets=[...new Set(records.map(record=>record.semanticTarget))];
    if(semanticTargets.length!==1)throw Error('Y4M01_CONTEXT_SEMANTIC_COLLISION:'+sourceMediaId+':'+questionId);
    occurrenceGroups.push({sourceMediaId,questionId,semanticTarget:semanticTargets[0],
      plannedMediaId:contextMediaId(sourceMediaId,questionId,semanticTargets[0]),
      contractPaths:[...new Set(records.map(record=>record.contractPath))].sort(),
      roles:[...new Set(records.map(record=>record.role).filter(Boolean))].sort(),
      optionOrCardIds:[...new Set(records.map(record=>record.optionOrCardId).filter(Boolean))].sort()});
  }
}
occurrenceGroups.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId));
if(new Set(occurrenceGroups.map(group=>group.plannedMediaId)).size!==occurrenceGroups.length)
  throw Error('Y4M01_PLANNED_MEDIA_ID_COLLISION');

const priorProvenancePath=path.join(batchDir,'generation-provenance.json');
const priorProvenance=await exists(priorProvenancePath)?JSON.parse(await readFile(priorProvenancePath,'utf8')):null;
const priorByConcept=new Map((priorProvenance?.assets||[]).map(asset=>[normalize(asset.concept),asset]));
const prepared=[];
for(const concept of expectedConcepts){
  const spec=specByConcept.get(concept);
  const candidateRel='images/DUDUQ-Y4M01-'+spec.slug+'.png';
  const candidatePath=path.join(batchDir,candidateRel);
  let originalRel,originalPath,originalHash,originalStructural,normalization=null,prompt=spec.prompt??null;
  let promptRecordStatus=prompt?'VERBATIM_GENERATION_PROMPT_PRESERVED':'PROMPT_NOT_AVAILABLE';
  let source={},session=null;
  if(spec.generationMode==='NATIVE_GENERATED'){
    originalPath=path.resolve(spec.generatorOutputOriginalPath);
    const originalBytes=await readFile(originalPath);
    originalHash=sha256(originalBytes);
    if(originalHash!==spec.expectedOriginalSha256)throw Error('Y4M01_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
    const prior=priorByConcept.get(concept);
    if(prior?.originalSha256&&prior.originalSha256!==originalHash)throw Error('Y4M01_NATIVE_ORIGINAL_DRIFT:'+concept);
    originalStructural=validateDuduqRgbaPng(originalBytes);
    if(originalStructural.width<1024||originalStructural.height<1024)throw Error('Y4M01_NATIVE_ORIGINAL_BELOW_MINIMUM:'+concept);
    session=await sessionEvidence(spec);
    originalRel='provenance/originals/DUDUQ-Y4M01-'+spec.slug+'-ORIGINAL.png';
    await copyIdempotent(originalPath,path.join(batchDir,originalRel));
    normalization=await runAlphaNormalizer(originalPath,candidatePath,spec.normalizationExpectedComponents??1);
    source={provider:input.provider,tool:input.tool,nativeOutputPath:slash(originalPath),nativeOutputSha256:originalHash,
      generationInput:inputRel,generationInputSha256:sha256(inputBytes),sessionEvidence:session};
  }else{
    const sourceFile=path.join(root,spec.sourceBatch,spec.sourceFile);
    const sourceBytes=await readFile(sourceFile),sourceHash=sha256(sourceBytes);
    if(sourceHash!==spec.expectedSourceSha256)throw Error('Y4M01_REUSED_SOURCE_HASH_MISMATCH:'+concept);
    const prior=priorByConcept.get(concept);
    if(prior?.source?.sourceSha256&&prior.source.sourceSha256!==sourceHash)throw Error('Y4M01_REUSED_SOURCE_DRIFT:'+concept);
    let sourceManifest=null,sourceManifestHash=null,sourceAsset=null,sourceGeneration=null,sourceGenerationHash=null,generationRecord=null;
    if(spec.sourceManifest){
      const manifestPath=path.join(root,spec.sourceBatch,spec.sourceManifest),manifestBytes=await readFile(manifestPath);
      sourceManifest=JSON.parse(manifestBytes);sourceManifestHash=sha256(manifestBytes);
      sourceAsset=(sourceManifest.assets||[]).find(asset=>asset.file===spec.sourceFile);
      if(!sourceAsset)throw Error('Y4M01_REUSE_MANIFEST_ENTRY_MISSING:'+concept);
      if(String(sourceAsset.sha256).toLowerCase()!==sourceHash)throw Error('Y4M01_REUSE_MANIFEST_HASH_MISMATCH:'+concept);
      if(/REJECTED|PENDING_REGEN/i.test(String(sourceAsset.review||'')))throw Error('Y4M01_REUSE_SOURCE_REJECTED:'+concept);
      if(normalize(sourceAsset.semanticTarget)!==concept)throw Error('Y4M01_REUSE_SEMANTIC_MISMATCH:'+concept);
      prompt=prompt??sourceAsset.provenance?.prompt??null;
    }
    if(spec.sourceGenerationProvenance){
      const generationPath=path.join(root,spec.sourceBatch,spec.sourceGenerationProvenance),generationBytes=await readFile(generationPath);
      sourceGeneration=JSON.parse(generationBytes);sourceGenerationHash=sha256(generationBytes);
      generationRecord=locateGenerationRecord(sourceGeneration,concept,spec.sourceFile);
      prompt=prompt??locatePrompt(sourceGeneration,concept,spec.sourceFile);
      if(prompt)promptRecordStatus='SOURCE_GENERATION_EVIDENCE_PROMPT_PRESERVED';
    }
    originalPath=path.join(root,spec.sourceBatch,spec.sourceOriginal);
    const originalBytes=await readFile(originalPath);
    originalHash=sha256(originalBytes);
    if(originalHash!==spec.expectedOriginalSha256)throw Error('Y4M01_REUSED_ORIGINAL_HASH_MISMATCH:'+concept);
    originalStructural=validateDuduqRgbaPng(originalBytes);
    const nativeOutputPath=spec.nativeOutputPath??sourceAsset?.provenance?.generatorOutputOriginalPath??generationRecord?.generatorOutputOriginalPath??null;
    if(nativeOutputPath){
      const nativeBytes=await readFile(path.resolve(nativeOutputPath));
      if(sha256(nativeBytes)!==originalHash)throw Error('Y4M01_REUSED_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
    }
    session=await sessionEvidence(spec);
    originalRel='provenance/reused-originals/DUDUQ-Y4M01-'+spec.slug+'-SOURCE-ORIGINAL.png';
    await copyIdempotent(originalPath,path.join(batchDir,originalRel));
    await copyIdempotent(sourceFile,candidatePath);
    source={provider:generationRecord?.provider??sourceGeneration?.provider??input.provider,
      tool:generationRecord?.tool??sourceGeneration?.tool??input.tool,
      sourceBatch:spec.sourceBatch,sourceFile:slash(path.join(spec.sourceBatch,spec.sourceFile)),sourceSha256:sourceHash,
      sourceOriginal:slash(path.join(spec.sourceBatch,spec.sourceOriginal)),sourceOriginalSha256:originalHash,
      sourceManifest:spec.sourceManifest?slash(path.join(spec.sourceBatch,spec.sourceManifest)):null,sourceManifestSha256:sourceManifestHash,
      sourceGenerationProvenance:spec.sourceGenerationProvenance?slash(path.join(spec.sourceBatch,spec.sourceGenerationProvenance)):null,
      sourceGenerationProvenanceSha256:sourceGenerationHash,nativeOutputPath:nativeOutputPath?slash(path.resolve(nativeOutputPath)):null,
      nativeExactOriginalHashVerified:Boolean(nativeOutputPath),sessionEvidence:session};
  }
  if(!prompt)throw Error('Y4M01_PROMPT_PROVENANCE_MISSING:'+concept);
  const candidateBytes=await readFile(candidatePath),candidateHash=sha256(candidateBytes);
  const structural=validateDuduqRgbaPng(candidateBytes),alpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:64});
  if(structural.width<1024||structural.height<1024||structural.transparentPixels===0||structural.opaquePixels===0||alpha.microOpaqueIslandCount!==0)
    throw Error('Y4M01_CANDIDATE_PNG_GATE_FAILED:'+concept);
  const bounds=boundsFromAlpha(alpha,structural);
  // New native renders must retain a transparent safe margin. A reused asset
  // may contain edge antialias pixels from its already-reviewed source batch;
  // keep its hash exact and rely on the source manifest plus visual review
  // rather than silently rewriting that verified candidate.
  if(bounds.widthFill<0.25||bounds.heightFill<0.25||
    (spec.generationMode==='NATIVE_GENERATED'&&bounds.touchesCanvasEdge))
    throw Error('Y4M01_SUBJECT_FRAMING_GATE_FAILED:'+concept+':'+JSON.stringify(bounds));
  const bindings=occurrenceGroups.filter(group=>group.semanticTarget===concept).map(group=>({
    mediaId:group.plannedMediaId,questionId:group.questionId,splitFromMediaId:group.sourceMediaId,
    contractPaths:group.contractPaths,roles:group.roles,optionOrCardIds:group.optionOrCardIds
  }));
  if(!bindings.length)throw Error('Y4M01_CONCEPT_WITHOUT_VISUAL_BINDINGS:'+concept);
  prepared.push({concept,spec,candidateRel,candidateHash,structural,alpha,bounds,bindings,
    originalRel,originalHash,originalStructural,normalization,prompt,promptRecordStatus,source,session});
}
if(new Set(prepared.map(item=>item.candidateHash)).size!==prepared.length)throw Error('Y4M01_DUPLICATE_CONCEPT_CANDIDATE_HASH');
const coveredSourceMediaIds=[...new Set(prepared.flatMap(item=>item.bindings.map(binding=>binding.splitFromMediaId)))].sort();
if(JSON.stringify(coveredSourceMediaIds)!==JSON.stringify(sourceMediaIds))throw Error('Y4M01_INCOMPLETE_BINDING_COVERAGE');

const questionInventory={
  schemaVersion:'DUDUQ_Y4M01_QUESTION_INVENTORY_V1',createdAt,moduleId,lane:'generation',candidateOnly:true,
  sourceQuestionFile:questionRel,sourceQuestionSha256:sha256(questionBytes),questionCount:20,
  allSemanticTargetCount:allSemanticTargets.length,allSemanticTargets,visualSemanticTargetCount:visualConcepts.length,
  visualSemanticTargets:visualConcepts,nonVisualOnlySemanticTargets:nonVisualOnly,
  sourcePendingMediaIdCount:sourceMediaIds.length,sourcePendingMediaIds:sourceMediaIds,
  visualUsageCount:usages.length,occurrenceScopedBindingGroupCount:occurrenceGroups.length,
  questions:questions.items.map(question=>({
    questionId:question.item_id,sequencePosition:question.sequencePosition,topicEn:question.topicEn,
    taskType:question.taskType,targetSkill:question.targetSkill,learningTarget:question.learningTarget,
    mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,primaryInstructionEn:question.primaryInstructionEn,
    supportInstructionPt:question.supportInstructionPt,answerKey:question.answerKey,
    semanticTargets:collectAllSemanticTargets(question),visualUsages:collectVisualUsages(question),
    sourceQuestionContractSha256:questionHash(question)
  })),
  questionContractsModified:false,answersModified:false
};
const sourceRegistryPin={
  schemaVersion:'DUDUQ_Y4M01_SOURCE_REGISTRY_PIN_V1',createdAt,moduleId,
  activeQuestionSource:questionRel,activeQuestionSourceSha256:sha256(questionBytes),
  registrySource:registryRel,registrySha256:sha256(registryBytes),registryEntryCount:registry.entries.length,
  canonicalLedger:ledgerRel,canonicalLedgerSha256:sha256(ledgerBytes),canonicalInventory:inventoryRel,
  canonicalInventorySha256:sha256(inventoryBytes),generationInput:inputRel,generationInputSha256:sha256(inputBytes),
  globalStateAtAudit:{modules:ledger.modules,activities:ledger.activities,completedModules:ledger.completedModules,
    pendingModules:ledger.pendingModules,distinctPendingMediaIds:ledger.distinctPendingMediaIds,
    distinctVerifiedMediaIds:ledger.distinctVerifiedMediaIds},moduleStateAtAudit:{...ledgerModule},
  sourceMediaIds,sourceRegistryEntryProjectionSha256:sourceProjectionHash(sourceMediaIds.map(id=>registryById.get(id))),
  sourceQuestionContractHashes:questionInventory.questions.map(question=>({questionId:question.questionId,sha256:question.sourceQuestionContractSha256})),
  sourceHashesRewritten:false,questionsModified:false,registryModified:false,productionApproved:false
};
const provenanceAssets=prepared.map(item=>({
  concept:item.concept,slug:item.spec.slug,
  generationClass:item.spec.generationMode==='NATIVE_GENERATED'?'CODEX_NATIVE_IMAGE_GEN_ORIGINAL':'VERIFIED_PREEXISTING_ORIGINAL_REUSE',
  provider:item.spec.generationMode==='NATIVE_GENERATED'?input.provider:item.source.provider,
  tool:item.spec.generationMode==='NATIVE_GENERATED'?input.tool:item.source.tool,
  prompt:item.prompt,promptRecordStatus:item.promptRecordStatus,transparentBackgroundRequested:true,
  generatorOutputOriginalPath:item.spec.generationMode==='NATIVE_GENERATED'?slash(path.resolve(item.spec.generatorOutputOriginalPath)):item.source.nativeOutputPath,
  originalFile:item.originalRel,originalSha256:item.originalHash,candidateFile:item.candidateRel,candidateSha256:item.candidateHash,
  alphaNormalization:item.normalization?{script:'qa/normalize-transparent-png-alpha.mjs',semanticPixelsChanged:false,
    expectedCoreComponents:item.spec.normalizationExpectedComponents??1,
    operation:'retain expected opaque subject components plus antialias edge; remove detached alpha artifacts; preserve source original'}:null,
  source:item.source
}));
const generationProvenance={
  schemaVersion:'DUDUQ_Y4M01_GENERATION_PROVENANCE_V1',createdAt,moduleId,lane:'generation',provider:input.provider,tool:input.tool,
  apiPurchaseOrExternalCredentialUsed:false,nativeGeneratedAssetCount:input.generated.length,verifiedReuseAssetCount:input.reused.length,
  originalGenerationProvenancePreserved:true,assets:provenanceAssets,failedAttempts:input.failedAttempts,
  productionApproved:false,humanApprovalClaimed:false,integrated:false,deployed:false
};
const semanticAssets=prepared.map(item=>({
  assetKey:'Y4M01-CANDIDATE-'+item.spec.slug,concept:item.concept,file:item.candidateRel,sha256:item.candidateHash,
  expectedObjectCount:item.spec.expectedObjectCount??null,visualObservation:item.spec.visualObservation,
  pedagogicalFit:item.spec.pedagogicalFit,semanticVerdict:'MODEL_SEMANTIC_PRECHECK_PASSED',
  noWrongDistractorObserved:true,transparentCutoutObserved:true,humanPedagogicalApproval:false,
  questionBindings:item.bindings.map(binding=>({questionId:binding.questionId,sourceMediaId:binding.splitFromMediaId,
    plannedMediaId:binding.mediaId,contractPaths:binding.contractPaths,
    sourceQuestionContractSha256:questionHash(questions.items.find(q=>q.item_id===binding.questionId))}))
}));
const semanticEvidence={
  schemaVersion:'DUDUQ_Y4M01_GENERATION_SEMANTIC_EVIDENCE_V1',createdAt,moduleId,lane:'generation',
  sourceQuestionFile:questionRel,sourceQuestionSha256:sha256(questionBytes),questionContractsReviewed:20,
  semanticConceptsReviewed:prepared.length,modelVisualReviewOnly:true,humanApprovalClaimed:false,assets:semanticAssets,
  rejectedAttempts:input.failedAttempts,candidateOnly:true,productionApproved:false,integrated:false
};
const bindingPlan={
  schemaVersion:'DUDUQ_Y4M01_OCCURRENCE_SCOPED_BINDING_PLAN_V1',createdAt,moduleId,lane:'generation',
  mode:'PLAN_ONLY_NO_SOURCE_OR_REGISTRY_MUTATION',sourceQuestionFile:questionRel,sourceQuestionSha256:sha256(questionBytes),
  sourcePendingMediaIdCount:sourceMediaIds.length,coveredSourceMediaIdCount:coveredSourceMediaIds.length,
  occurrenceScopedBindingCount:occurrenceGroups.length,questionContractsReviewed:20,
  bindings:occurrenceGroups.map(group=>{
    const asset=prepared.find(item=>item.concept===group.semanticTarget);
    return {...group,candidateFile:asset.candidateRel,candidateSha256:asset.candidateHash,
      sourceQuestionContractSha256:questionHash(questions.items.find(question=>question.item_id===group.questionId)),
      action:'INTEGRATION_LANE_MAY_APPLY_ONLY_AFTER_INDEPENDENT_QA'};
  }),
  questionContractsModified:false,registryModified:false,overlayApplied:false,productionApproved:false
};
const manifestAssets=prepared.map(item=>({
  assetKey:'Y4M01-CANDIDATE-'+item.spec.slug,file:item.candidateRel,semanticTarget:item.concept,sha256:item.candidateHash,
  pixelWidth:item.structural.width,pixelHeight:item.structural.height,review:'MODEL_SEMANTIC_PRECHECK_PASSED',
  reviewEvidence:batchRel+'/generation-semantic-evidence.json',bindings:item.bindings,
  provenance:{generationClass:item.spec.generationMode==='NATIVE_GENERATED'?'CODEX_NATIVE_IMAGE_GEN_ORIGINAL':'VERIFIED_PREEXISTING_ORIGINAL_REUSE',
    evidenceFile:'generation-provenance.json',preservedOriginal:item.originalRel,alphaNormalizationApplied:Boolean(item.normalization)},
  sourceMediaIds:[...new Set(item.bindings.map(binding=>binding.splitFromMediaId))].sort()
}));
const batchManifest={
  schemaVersion:'DUDUQ_Y4M01_CANDIDATE_BATCH_V1',createdAt,moduleId,lane:'generation',candidateOnly:true,
  questionContractsReviewed:20,sourceQuestionSha256:sha256(questionBytes),sourceRegistrySha256:sha256(registryBytes),
  sourcePendingMediaIds:sourceMediaIds.length,coveredSourceMediaIds:coveredSourceMediaIds.length,
  assetCount:manifestAssets.length,nativeGeneratedAssetCount:input.generated.length,verifiedReuseAssetCount:input.reused.length,
  assets:manifestAssets,productionApproved:false,humanApprovalClaimed:false,integrated:false,deployed:false,
  questionsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,approvalFlagsModified:false,
  existingReferencedAssetsRemoved:false
};
const generationBatchManifest={...batchManifest,schemaVersion:'DUDUQ_Y4M01_GENERATION_BATCH_MANIFEST_V1',
  generationInput:'generation-input.json',generationProvenance:'generation-provenance.json',
  semanticEvidence:'generation-semantic-evidence.json',bindingPlan:'binding-plan.json'};
const pngValidation={
  schemaVersion:'DUDUQ_Y4M01_PNG_VALIDATION_V1',createdAt,moduleId,validator:'qa/validate-duduq-png.mjs',
  assetCount:prepared.length,allPass:true,assets:prepared.map(item=>({concept:item.concept,file:item.candidateRel,sha256:item.candidateHash,
    ...item.structural,bounds:item.bounds,originalFile:item.originalRel,originalSha256:item.originalHash,
    originalTechnical:item.originalStructural,normalization:item.normalization}))
};
const alphaAudit={
  schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',createdAt,
  candidateDir:batchRel,manifest:batchRel+'/batch-manifest.json',alphaThreshold:64,assetCount:prepared.length,
  assets:prepared.map(item=>({file:item.candidateRel,sha256:item.candidateHash,...item.alpha,bounds:item.bounds}))
};
const reusedAudit={
  schemaVersion:'DUDUQ_Y4M01_PREEXISTING_ORIGINAL_AUDIT_V1',createdAt,moduleId,searchedBeforeGeneration:true,
  verifiedReusableAssetCount:input.reused.length,
  assets:prepared.filter(item=>item.spec.generationMode==='VERIFIED_REUSE').map(item=>({concept:item.concept,
    source:item.source,preservedSource:item.originalRel,preservedSourceSha256:item.originalHash,
    candidateFile:item.candidateRel,candidateSha256:item.candidateHash,technical:item.structural,
    alphaComponentCount:item.alpha.componentCount,microOpaqueIslandCount:item.alpha.microOpaqueIslandCount,reusable:true})),
  decision:'NO_EXACT_VERIFIED_PREEXISTING_PNGS_FOUND_STAGE_11_NATIVE_GENERATED_ORIGINALS_WITHOUT_DUPLICATE_GENERATION'
};
const receipts={
  schemaVersion:'DUDUQ_Y4M01_NATIVE_GENERATION_RECEIPTS_V1',createdAt,moduleId,provider:input.provider,tool:input.tool,
  nativeGeneratedAssets:prepared.filter(item=>item.spec.generationMode==='NATIVE_GENERATED').map(item=>({concept:item.concept,
    generatorCallId:item.spec.generatorCallId,generatorOutputOriginalPath:slash(path.resolve(item.spec.generatorOutputOriginalPath)),
    sha256:item.originalHash,preservedOriginal:item.originalRel,candidate:item.candidateRel,candidateSha256:item.candidateHash,
    prompt:item.prompt,sessionEvidence:item.session})),
  verifiedReusedAssets:prepared.filter(item=>item.spec.generationMode==='VERIFIED_REUSE').map(item=>({concept:item.concept,
    source:item.source,preservedSource:item.originalRel,candidate:item.candidateRel,candidateSha256:item.candidateHash,
    prompt:item.prompt})),
  failedAttempts:input.failedAttempts,generatorLimitReached:false,blockedGenerator:false
};
const priorCheckpointPath=path.join(batchDir,'checkpoint.json');
const priorCheckpoint=await exists(priorCheckpointPath)?JSON.parse(await readFile(priorCheckpointPath,'utf8')):null;
const checkpoint={
  schemaVersion:'DUDUQ_TWO_LANE_GENERATION_CHECKPOINT_V1',createdAt,updatedAt:createdAt,
  status:'Y4M01_GENERATION_CANDIDATES_COMPLETE',projectStatus:'INCOMPLETE',lane:'generation',moduleId,
  sourceAudit:{questions:20,pendingMediaIds:sourceMediaIds.length,visualUsages:usages.length,semanticConcepts:prepared.length,
    allSemanticTargets:allSemanticTargets.length,nonVisualOnlySemanticTargets:nonVisualOnly,
    globalPendingMediaIds:ledger.distinctPendingMediaIds,questionSourceSha256:sha256(questionBytes),registrySha256:sha256(registryBytes)},
  candidateAssets:prepared.length,newlyGeneratedAssets:input.generated.length,reusedVerifiedNativeOriginalAssets:input.reused.length,
  generatorAttempts:{attempted:input.generated.length+input.failedAttempts.length,accepted:input.generated.length,
    semanticRejected:input.failedAttempts.length,quotaOrLimitBlock:false,blockedGenerator:false},
  coverage:{sourcePendingMediaIds:sourceMediaIds.length,coveredSourceMediaIds:coveredSourceMediaIds.length,
    occurrenceScopedBindingPlans:occurrenceGroups.length,missingConcepts:[]},writeBoundary:batchRel,
  questionsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,approvalFlagsModified:false,
  productionModified:false,mediaOverlaysApplied:false,existingReferencedAssetsRemoved:false,humanApprovalClaimed:false,
  productionApproved:false,integrated:false,deployed:false,candidateBundleCommit:priorCheckpoint?.candidateBundleCommit??null,
  candidateReviewPushBranch:priorCheckpoint?.candidateReviewPushBranch??null,
  candidateCheckpointCommit:priorCheckpoint?.candidateCheckpointCommit??null,
  remotePushStatus:priorCheckpoint?.remotePushStatus??'NOT_ATTEMPTED',
  remotePushBlocker:priorCheckpoint?.remotePushBlocker??null,
  reviewBranch:'automation/duduq-y4m01-generation-20261106',nextAction:'SCHEDULER_SELECT_OTHER_LANE',
  completionClaim:'MODULE_CANDIDATE_SCOPE_ONLY_PROJECT_REMAINS_INCOMPLETE'
};
const boundary={
  schemaVersion:'DUDUQ_TWO_LANE_GENERATION_WRITE_BOUNDARY_V1',createdAt,moduleId,lane:'generation',
  allowedWrites:[batchRel+'/**'],forbiddenWrites:['content/**','dist-pages/content/**','core/**','runtime/**','production/**'],
  candidateOnly:true,registryMutation:false,questionMutation:false,overlayApplication:false,approvalMutation:false,
  productionMergeOrDeploy:false,existingAssetRemoval:false,secondCodexProcessStarted:false,schedulerSerializationPreserved:true,
  independentIntegrationRequired:true
};

await Promise.all([
  writeJson('question-inventory.json',questionInventory),writeJson('source-registry-pin.json',sourceRegistryPin),
  writeJson('preexisting-original-audit.json',reusedAudit),writeJson('generation-provenance.json',generationProvenance),
  writeJson('generation-receipts.json',receipts),writeJson('generation-semantic-evidence.json',semanticEvidence),
  writeJson('semantic-evidence.json',semanticEvidence),writeJson('binding-plan.json',bindingPlan),
  writeJson('batch-manifest.json',batchManifest),writeJson('generation-batch-manifest.json',generationBatchManifest),
  writeJson('png-validation.json',pngValidation),writeJson('alpha-component-audit.json',alphaAudit),
  writeJson('checkpoint.json',checkpoint),writeJson('two-lane-verification.json',boundary)
]);
console.log(JSON.stringify({status:'Y4M01_GENERATION_CANDIDATES_COMPLETE',moduleId,questions:20,
  allSemanticTargets:allSemanticTargets.length,visualConcepts:prepared.length,nativeGenerated:input.generated.length,
  verifiedReuse:input.reused.length,rejectedSemanticAttempts:input.failedAttempts.length,
  sourcePendingMediaIds:sourceMediaIds.length,coveredSourceMediaIds:coveredSourceMediaIds.length,
  occurrenceScopedBindings:occurrenceGroups.length,globalPendingMediaIds:ledger.distinctPendingMediaIds,
  productionApproved:false,integrated:false,deployed:false,writeBoundary:batchRel}));
