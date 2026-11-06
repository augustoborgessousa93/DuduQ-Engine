#!/usr/bin/env node
/**
 * Reproducible Y4M03 generation-lane candidate builder.
 *
 * Writes only inside this module-specific candidate batch. It never mutates
 * questions, answers, the media registry, runtime, Gold Masters, approval
 * flags, overlays, existing referenced assets, or production state.
 */
import {createHash} from 'node:crypto';
import {access,copyFile,mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';
import {analyzeAlphaComponents} from '../../png-alpha-component-audit.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const moduleId='Y4M03';
const createdAt='2026-11-06T20:01:29.963Z';
const batchRel='qa/media-candidates/y4m03-official-20261106';
const questionRel='dist-pages/content/english/year-4/module-03/questions.json';
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
function assertInsideBatch(file){
  const resolved=path.resolve(file);
  if(resolved!==batchDir&&!resolved.startsWith(batchDir+path.sep))throw Error('Y4M03_WRITE_OUTSIDE_BATCH:'+resolved);
}
async function writeJson(name,value){
  const destination=path.join(batchDir,name);
  assertInsideBatch(destination);
  await writeFile(destination,jsonBytes(value));
}
async function copyIdempotent(source,destination){
  assertInsideBatch(destination);
  const bytes=await readFile(source),hash=sha256(bytes);
  if(await exists(destination)){
    const existingHash=sha256(await readFile(destination));
    if(existingHash!==hash)throw Error('Y4M03_IDEMPOTENT_COPY_CONFLICT:'+slash(path.relative(root,destination)));
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
    await import(pathToFileURL(script).href+'?y4m03='+normalizerRun++);
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
  if(!significant.length)throw Error('Y4M03_NO_SIGNIFICANT_ALPHA_COMPONENTS');
  const minX=Math.min(...significant.map(x=>x.bbox.x)),minY=Math.min(...significant.map(x=>x.bbox.y));
  const maxX=Math.max(...significant.map(x=>x.bbox.x+x.bbox.width)),maxY=Math.max(...significant.map(x=>x.bbox.y+x.bbox.height));
  const union={x:minX,y:minY,width:maxX-minX,height:maxY-minY};
  return {union,canvasCoverage:Number((union.width*union.height/(structural.width*structural.height)).toFixed(8)),
    widthFill:Number((union.width/structural.width).toFixed(8)),heightFill:Number((union.height/structural.height).toFixed(8)),
    margins:{left:minX,top:minY,right:structural.width-maxX,bottom:structural.height-maxY},
    touchesCanvasEdge:minX===0||minY===0||maxX===structural.width||maxY===structural.height};
}
async function sessionEvidence(spec){
  const transcriptPath=path.resolve(spec.sourceSessionTranscript);
  const bytes=await readFile(transcriptPath),text=bytes.toString('utf8');
  if(!spec.generatorCallId||!text.includes(spec.generatorCallId))throw Error('Y4M03_SESSION_CALL_EVIDENCE_MISSING:'+spec.concept);
  let generationRecord=null;
  for(const line of text.split(/\r?\n/)){
    if(!line.includes(spec.generatorCallId)||!line.includes('image_gen.generation'))continue;
    try{
      const item=JSON.parse(line).payload?.item;
      if(item?.kind==='image_gen.generation'&&item.id===spec.generatorCallId){
        generationRecord={id:item.id,status:item.status,revisedPrompt:item.revisedPrompt};
        break;
      }
    }catch{}
  }
  if(!generationRecord||generationRecord.status!=='completed')throw Error('Y4M03_SESSION_GENERATION_RECORD_MISSING:'+spec.concept);
  if(spec.prompt!==generationRecord.revisedPrompt)throw Error('Y4M03_SESSION_PROMPT_EVIDENCE_MISMATCH:'+spec.concept);
  return {transcript:slash(transcriptPath),generatorCallId:spec.generatorCallId,
    stableGenerationRecordSha256:sha256(jsonBytes(generationRecord)),generationStatus:generationRecord.status,
    promptEvidence:'VERBATIM_REVISED_PROMPT_PRESENT_IN_CODEX_SESSION'};
}
async function auditPreexistingOriginals(concepts){
  const matches=[];
  const candidateRoot=path.join(root,'qa/media-candidates');
  const dirs=await readdir(candidateRoot,{withFileTypes:true});
  for(const dir of dirs.filter(entry=>entry.isDirectory()&&path.join(candidateRoot,entry.name)!==batchDir)){
    const manifestPath=path.join(candidateRoot,dir.name,'batch-manifest.json');
    if(!await exists(manifestPath))continue;
    let manifest;
    try{manifest=JSON.parse(await readFile(manifestPath,'utf8'))}catch{continue;}
    for(const asset of manifest.assets||[]){
      if(!concepts.has(normalize(asset.semanticTarget)))continue;
      if(/REJECTED|PENDING_REGEN/i.test(String(asset.review||'')))continue;
      const file=path.join(candidateRoot,dir.name,String(asset.file||''));
      if(!await exists(file))continue;
      const bytes=await readFile(file);
      if(sha256(bytes)!==String(asset.sha256||'').toLowerCase())continue;
      matches.push({concept:normalize(asset.semanticTarget),batch:slash(path.relative(root,path.join(candidateRoot,dir.name))),
        file:asset.file,sha256:asset.sha256,review:asset.review??null});
    }
  }
  return matches;
}

const inputBytes=await readFile(path.join(root,inputRel));
const input=JSON.parse(inputBytes);
if(input.moduleId!==moduleId||input.lane!=='generation'||input.writeBoundary!==batchRel)
  throw Error('Y4M03_GENERATION_INPUT_SCOPE_INVALID');
if(input.provider!=='OpenAI Codex native image generation'||input.tool!=='image_gen.imagegen'||input.apiPurchaseOrExternalCredentialUsed!==false)
  throw Error('Y4M03_NATIVE_PROVIDER_PROVENANCE_INVALID');
if(input.generated?.length!==17||input.reused?.length!==0||input.failedAttempts?.length!==4||input.blockedGenerator!==false)
  throw Error('Y4M03_REQUIRES_17_GENERATED_0_REUSED_4_REJECTED');
const specByConcept=new Map();
for(const record of input.generated){
  const concept=normalize(record.concept);
  if(!concept||specByConcept.has(concept))throw Error('Y4M03_DUPLICATE_OR_EMPTY_CONCEPT:'+concept);
  specByConcept.set(concept,{...record,concept});
}

const [questionBytes,registryBytes,ledgerBytes,inventoryBytes]=await Promise.all([
  readFile(path.join(root,questionRel)),readFile(path.join(root,registryRel)),
  readFile(path.join(root,ledgerRel)),readFile(path.join(root,inventoryRel))
]);
const questions=JSON.parse(questionBytes),registry=JSON.parse(registryBytes),ledger=JSON.parse(ledgerBytes),inventory=JSON.parse(inventoryBytes);
if(questions.moduleId!==moduleId||questions.itemCount!==20||questions.items?.length!==20)
  throw Error('Y4M03_REQUIRES_EXACT_20_QUESTION_CONTRACT');
const expectedQuestionIds=Array.from({length:20},(_,index)=>moduleId+'-Q'+String(index+1).padStart(3,'0'));
if(JSON.stringify(questions.items.map(item=>item.item_id))!==JSON.stringify(expectedQuestionIds))throw Error('Y4M03_QUESTION_SEQUENCE_DRIFT');
const ledgerModule=ledger.modulesDetail?.find(entry=>entry.moduleId===moduleId);
if(ledger.modules!==30||ledger.activities!==600||inventory.modules!==30||inventory.activities!==600||!ledgerModule)
  throw Error('Y4M03_CANONICAL_30x600_INVENTORY_UNAVAILABLE');
if(ledger.distinctPendingMediaIds!==1055||ledgerModule.referencedMediaIds!==43||ledgerModule.provisionalOrBlockedReferencedIds!==43||
  ledgerModule.unverifiedReferencedIds!==0||ledgerModule.brokenReferencedIds!==0)
  throw Error('Y4M03_CLOSURE_CHECKPOINT_DRIFT:'+ledger.distinctPendingMediaIds+':'+ledgerModule.referencedMediaIds);

const usages=questions.items.flatMap(collectVisualUsages);
const sourceMediaIds=[...new Set(usages.map(record=>record.mediaId))].sort();
const visualConcepts=[...new Set(usages.map(record=>record.semanticTarget))].sort();
const expectedConcepts=[...specByConcept.keys()].sort();
if(usages.length!==84||sourceMediaIds.length!==43||visualConcepts.length!==17||JSON.stringify(visualConcepts)!==JSON.stringify(expectedConcepts))
  throw Error('Y4M03_VISUAL_INVENTORY_DRIFT:'+usages.length+':'+sourceMediaIds.length+':'+visualConcepts.join(','));
const allSemanticTargets=[...new Set(questions.items.flatMap(collectAllSemanticTargets))].sort();
const nonVisualOnly=allSemanticTargets.filter(concept=>!specByConcept.has(concept));
if(allSemanticTargets.length!==24||JSON.stringify(nonVisualOnly)!==JSON.stringify(input.nonVisualOnlySemanticTargets))
  throw Error('Y4M03_NON_VISUAL_SEMANTIC_SCOPE_DRIFT:'+nonVisualOnly.join(','));
const ledgerIds=(ledgerModule.blockers||[]).map(entry=>entry.mediaId).sort();
if(JSON.stringify(sourceMediaIds)!==JSON.stringify(ledgerIds))throw Error('Y4M03_LEDGER_SOURCE_ID_MISMATCH');
const registryById=new Map(registry.entries.map(entry=>[entry.mediaId,entry]));
const missingRegistry=sourceMediaIds.filter(mediaId=>!registryById.has(mediaId));
if(missingRegistry.length)throw Error('Y4M03_REGISTRY_ENTRIES_MISSING:'+missingRegistry.join(','));

const preexistingMatches=await auditPreexistingOriginals(new Set(visualConcepts));
if(preexistingMatches.length)throw Error('Y4M03_VERIFIED_PREEXISTING_ORIGINAL_WAS_MISSED:'+preexistingMatches.map(x=>x.concept).join(','));

const occurrenceGroups=[];
for(const sourceMediaId of sourceMediaIds){
  const sourceUsages=usages.filter(record=>record.mediaId===sourceMediaId);
  for(const questionId of [...new Set(sourceUsages.map(record=>record.questionId))]){
    const records=sourceUsages.filter(record=>record.questionId===questionId);
    const semanticTargets=[...new Set(records.map(record=>record.semanticTarget))];
    if(semanticTargets.length!==1)throw Error('Y4M03_CONTEXT_SEMANTIC_COLLISION:'+sourceMediaId+':'+questionId);
    occurrenceGroups.push({sourceMediaId,questionId,semanticTarget:semanticTargets[0],
      plannedMediaId:contextMediaId(sourceMediaId,questionId,semanticTargets[0]),
      contractPaths:[...new Set(records.map(record=>record.contractPath))].sort(),
      roles:[...new Set(records.map(record=>record.role).filter(Boolean))].sort(),
      optionOrCardIds:[...new Set(records.map(record=>record.optionOrCardId).filter(Boolean))].sort()});
  }
}
occurrenceGroups.sort((a,b)=>a.questionId.localeCompare(b.questionId)||a.sourceMediaId.localeCompare(b.sourceMediaId));
if(occurrenceGroups.length!==72||new Set(occurrenceGroups.map(group=>group.plannedMediaId)).size!==occurrenceGroups.length)
  throw Error('Y4M03_OCCURRENCE_BINDING_PLAN_DRIFT:'+occurrenceGroups.length);

const prepared=[];
for(const concept of visualConcepts){
  const spec=specByConcept.get(concept);
  const originalPath=path.resolve(spec.generatorOutputOriginalPath);
  const originalBytes=await readFile(originalPath),originalHash=sha256(originalBytes);
  if(originalHash!==spec.expectedOriginalSha256)throw Error('Y4M03_NATIVE_ORIGINAL_HASH_MISMATCH:'+concept);
  const originalStructural=validateDuduqRgbaPng(originalBytes);
  if(originalStructural.width<1024||originalStructural.height<1024)throw Error('Y4M03_NATIVE_ORIGINAL_BELOW_MINIMUM:'+concept);
  const session=await sessionEvidence(spec);
  const originalRel='provenance/originals/DUDUQ-Y4M03-'+spec.slug+'-ORIGINAL.png';
  await copyIdempotent(originalPath,path.join(batchDir,originalRel));
  const candidateRel='images/DUDUQ-Y4M03-'+spec.slug+'.png';
  const candidatePath=path.join(batchDir,candidateRel);
  const normalization=await runAlphaNormalizer(originalPath,candidatePath,spec.normalizationExpectedComponents??1);
  const candidateBytes=await readFile(candidatePath),candidateHash=sha256(candidateBytes);
  const structural=validateDuduqRgbaPng(candidateBytes);
  const alpha=analyzeAlphaComponents(candidateBytes,{alphaThreshold:64});
  const bounds=boundsFromAlpha(alpha,structural);
  if(alpha.microOpaqueIslandCount!==0)throw Error('Y4M03_ALPHA_MICRO_ISLANDS_REMAIN:'+concept);
  if(bounds.touchesCanvasEdge)throw Error('Y4M03_SUBJECT_TOUCHES_CANVAS_EDGE:'+concept);
  if(bounds.widthFill<0.45||bounds.heightFill<0.45)throw Error('Y4M03_SUBJECT_TOO_SMALL:'+concept);
  const groups=occurrenceGroups.filter(group=>group.semanticTarget===concept);
  const sourceIds=[...new Set(groups.map(group=>group.sourceMediaId))].sort();
  if(!groups.length||!sourceIds.length)throw Error('Y4M03_CONCEPT_WITHOUT_BINDINGS:'+concept);
  prepared.push({concept,slug:spec.slug,candidateRel,candidateHash,originalRel,originalHash,
    originalStructural,structural,alpha,bounds,normalization,session,prompt:spec.prompt,
    visualObservation:spec.visualObservation,pedagogicalFit:spec.pedagogicalFit,
    semanticFamily:spec.semanticFamily,monthOrdinal:spec.monthOrdinal??null,
    generatorOutputOriginalPath:slash(originalPath),editReferenceGeneratorOutput:spec.editReferenceGeneratorOutput?slash(spec.editReferenceGeneratorOutput):null,
    editReferenceSha256:spec.editReferenceSha256??null,groups,sourceIds});
}
if(prepared.length!==17||new Set(prepared.map(asset=>asset.candidateHash)).size!==17)
  throw Error('Y4M03_CANDIDATE_HASH_UNIQUENESS_FAILED');

const rejected=[];
for(const spec of input.failedAttempts){
  const originalPath=path.resolve(spec.generatorOutputOriginalPath),bytes=await readFile(originalPath),hash=sha256(bytes);
  if(hash!==spec.expectedOriginalSha256)throw Error('Y4M03_REJECTED_ORIGINAL_HASH_MISMATCH:'+spec.slug);
  const structural=validateDuduqRgbaPng(bytes),session=await sessionEvidence(spec);
  const rel='provenance/rejected-originals/DUDUQ-Y4M03-'+spec.slug+'-REJECTED.png';
  await copyIdempotent(originalPath,path.join(batchDir,rel));
  rejected.push({concept:normalize(spec.concept),slug:spec.slug,file:rel,sha256:hash,pixelWidth:structural.width,
    pixelHeight:structural.height,rejectionReason:spec.rejectionReason,generatorCallId:spec.generatorCallId,
    prompt:spec.prompt,sessionEvidence:session,acceptedAsCandidate:false});
}

const coveredSourceMediaIds=[...new Set(prepared.flatMap(asset=>asset.sourceIds))].sort();
if(JSON.stringify(coveredSourceMediaIds)!==JSON.stringify(sourceMediaIds))throw Error('Y4M03_SOURCE_MEDIA_COVERAGE_INCOMPLETE');
const registryEntries=sourceMediaIds.map(mediaId=>registryById.get(mediaId));
const questionInventory={
  schemaVersion:'DUDUQ_Y4M03_QUESTION_INVENTORY_V1',createdAt,moduleId,sourceQuestionFile:questionRel,
  sourceQuestionSha256:sha256(questionBytes),questionCount:20,visualUsageCount:usages.length,
  sourceMediaIdCount:sourceMediaIds.length,sourceMediaIds,visualConceptCount:visualConcepts.length,visualConcepts,
  allSemanticTargetCount:allSemanticTargets.length,allSemanticTargets,nonVisualOnlySemanticTargets:nonVisualOnly,
  occurrenceScopedBindingPlanCount:occurrenceGroups.length,
  questions:questions.items.map(question=>({questionId:question.item_id,sourceSha256:questionHash(question),
    mechanicId:question.mechanicId,mechanicMode:question.mechanicMode,titleEn:question.instruction?.titleEn??null,
    instructionEn:question.primaryInstructionEn??question.instruction?.instructionEn??null,
    stimulusTarget:question.stimulus?.target??null,answerKey:question.answerKey,
    allSemanticTargets:collectAllSemanticTargets(question),visualUsages:usages.filter(record=>record.questionId===question.item_id)})),
  sourceContractsModified:false
};
const sourceRegistryPin={
  schemaVersion:'DUDUQ_Y4M03_SOURCE_REGISTRY_PIN_V1',createdAt,moduleId,registryFile:registryRel,
  registrySha256:sha256(registryBytes),sourceProjectionSha256:sourceProjectionHash(registryEntries),
  sourceMediaIdCount:sourceMediaIds.length,entries:registryEntries.map(entry=>({mediaId:entry.mediaId,
    semantic:normalize(entry.semantic??entry.altText),status:entry.status,temporary:entry.temporary??null,
    urlOrPath:entry.urlOrPath??null,assetPaths:(entry.assets||[]).map(asset=>asset.path)})),
  registryModified:false
};
const preexistingOriginalAudit={
  schemaVersion:'DUDUQ_Y4M03_PREEXISTING_ORIGINAL_AUDIT_V1',createdAt,moduleId,
  conceptsSearched:visualConcepts,candidateManifestDirectoriesSearched:true,
  verifiedExactOriginalMatches:preexistingMatches,verifiedReuseCount:0,generationRequiredCount:17,
  registrySourceSummary:{sourceMediaIds:43,provisionalSvgSources:43,eligibleOriginalPngSources:0},
  decision:'NO_VERIFIED_PREEXISTING_ORIGINAL_PNG_FOR_THE_17_VISUAL_CONCEPTS_GENERATE_ALL_WITH_CODEX_NATIVE_IMAGE_TOOL'
};
const generationProvenance={
  schemaVersion:'DUDUQ_Y4M03_NATIVE_GENERATION_PROVENANCE_V1',createdAt,moduleId,lane:'generation',
  provider:input.provider,tool:input.tool,apiPurchaseOrExternalCredentialUsed:false,
  generationInput:inputRel,generationInputSha256:sha256(inputBytes),acceptedAssetCount:prepared.length,
  rejectedAttemptCount:rejected.length,blockedGenerator:false,
  assets:prepared.map(asset=>({concept:asset.concept,slug:asset.slug,semanticFamily:asset.semanticFamily,
    monthOrdinal:asset.monthOrdinal,provider:input.provider,tool:input.tool,generatorCallId:asset.session.generatorCallId,
    generatorOutputOriginalPath:asset.generatorOutputOriginalPath,originalFile:asset.originalRel,
    originalSha256:asset.originalHash,candidateFile:asset.candidateRel,candidateSha256:asset.candidateHash,
    prompt:asset.prompt,promptEvidence:asset.session.promptEvidence,sessionEvidence:asset.session,
    editReferenceGeneratorOutput:asset.editReferenceGeneratorOutput,editReferenceSha256:asset.editReferenceSha256,
    alphaNormalizationApplied:true,normalization:asset.normalization,visualObservation:asset.visualObservation,
    pedagogicalFit:asset.pedagogicalFit,productionApproved:false,integrated:false})),
  rejectedAttempts:rejected
};
const receipts={
  schemaVersion:'DUDUQ_Y4M03_NATIVE_GENERATION_RECEIPTS_V1',createdAt,moduleId,provider:input.provider,tool:input.tool,
  accepted:prepared.map(asset=>({concept:asset.concept,generatorCallId:asset.session.generatorCallId,
    generationStatus:asset.session.generationStatus,stableGenerationRecordSha256:asset.session.stableGenerationRecordSha256,
    originalSha256:asset.originalHash,candidateSha256:asset.candidateHash,prompt:asset.prompt})),
  rejected:rejected.map(asset=>({concept:asset.concept,generatorCallId:asset.generatorCallId,
    generationStatus:asset.sessionEvidence.generationStatus,stableGenerationRecordSha256:asset.sessionEvidence.stableGenerationRecordSha256,
    originalSha256:asset.sha256,rejectionReason:asset.rejectionReason,prompt:asset.prompt})),
  quotaOrLimitBlock:false,blockedGenerator:false
};
const semanticEvidence={
  schemaVersion:'DUDUQ_Y4M03_GENERATION_SEMANTIC_EVIDENCE_V1',createdAt,moduleId,lane:'generation',
  reviewAuthority:'MODEL_SEMANTIC_PRECHECK_ONLY_NO_HUMAN_APPROVAL',assetCount:prepared.length,
  assets:prepared.map(asset=>({assetKey:'Y4M03-CANDIDATE-'+asset.slug,semanticTarget:asset.concept,
    visualObservation:asset.visualObservation,pedagogicalFit:asset.pedagogicalFit,
    sourceQuestionIds:[...new Set(asset.groups.map(group=>group.questionId))].sort(),sourceMediaIds:asset.sourceIds,
    questionLevelUsageCount:asset.groups.length,wrongDistractorReview:'NO_UNRELATED_OR_SEMANTICALLY_CONFLICTING_CONTENT_OBSERVED',
    calendarPolicy:asset.semanticFamily==='MONTH_POSITION_ON_TWELVE_PART_YEAR_WHEEL'?
      'TWELVE_POSITION_ORDINAL_DIAL_NO_WORDS_NUMERALS_DATES_OR_CLIMATE_ASSUMPTION':
      'CONVENTIONAL_ENGLISH_VOCABULARY_CUE_NOT_A_UNIVERSAL_CLIMATE_CLAIM',
    review:'MODEL_SEMANTIC_PRECHECK_PASSED',humanApprovalClaimed:false,productionApproved:false})),
  rejectedAttempts:rejected.map(asset=>({concept:asset.concept,file:asset.file,sha256:asset.sha256,
    rejectionReason:asset.rejectionReason,acceptedAsCandidate:false})),
  humanApprovalClaimed:false,productionApproved:false
};
const bindingPlan={
  schemaVersion:'DUDUQ_Y4M03_GENERATION_BINDING_PLAN_V1',createdAt,moduleId,lane:'generation',
  sourceQuestionSha256:sha256(questionBytes),sourceRegistrySha256:sha256(registryBytes),
  occurrenceCount:occurrenceGroups.length,sourceMediaIdCount:sourceMediaIds.length,
  bindings:occurrenceGroups.map(group=>({candidateAssetKey:'Y4M03-CANDIDATE-'+specByConcept.get(group.semanticTarget).slug,
    candidateFile:'images/DUDUQ-Y4M03-'+specByConcept.get(group.semanticTarget).slug+'.png',
    semanticTarget:group.semanticTarget,questionId:group.questionId,sourceMediaId:group.sourceMediaId,
    plannedMediaId:group.plannedMediaId,contractPaths:group.contractPaths,roles:group.roles,
    optionOrCardIds:group.optionOrCardIds,action:'INTEGRATION_LANE_MAY_APPLY_ONLY_AFTER_INDEPENDENT_QA'})),
  applyPerformed:false,questionMutation:false,registryMutation:false,overlayApplied:false
};
const manifestAssets=prepared.map(asset=>({
  assetKey:'Y4M03-CANDIDATE-'+asset.slug,file:asset.candidateRel,semanticTarget:asset.concept,
  sha256:asset.candidateHash,pixelWidth:asset.structural.width,pixelHeight:asset.structural.height,
  review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:batchRel+'/generation-semantic-evidence.json',
  bindings:asset.groups.map(group=>({mediaId:group.plannedMediaId,questionId:group.questionId,
    splitFromMediaId:group.sourceMediaId,contractPaths:group.contractPaths,roles:group.roles,
    optionOrCardIds:group.optionOrCardIds})),
  provenance:{generationClass:'CODEX_NATIVE_IMAGE_GEN_ORIGINAL',evidenceFile:'generation-provenance.json',
    preservedOriginal:asset.originalRel,alphaNormalizationApplied:true},sourceMediaIds:asset.sourceIds
}));
const batchManifest={
  schemaVersion:'DUDUQ_Y4M03_GENERATION_CANDIDATE_BATCH_V1',createdAt,moduleId,lane:'generation',
  candidateOnly:true,questionContractsReviewed:20,visualUsageCount:usages.length,sourceMediaIdCount:sourceMediaIds.length,
  semanticConceptCount:prepared.length,allSemanticTargetCount:allSemanticTargets.length,
  occurrenceScopedBindingPlanCount:occurrenceGroups.length,sourceQuestionSha256:sha256(questionBytes),
  sourceRegistrySha256:sha256(registryBytes),assets:manifestAssets,productionApproved:false,humanApprovalClaimed:false,
  integrated:false,deployed:false,questionsModified:false,registryModified:false,runtimeModified:false,
  goldMastersModified:false,approvalFlagsModified:false,existingReferencedAssetsRemoved:false
};
const generationBatchManifest={
  schemaVersion:'DUDUQ_Y4M03_NATIVE_GENERATION_BATCH_V1',createdAt,moduleId,lane:'generation',
  provider:input.provider,tool:input.tool,generatedAssets:prepared.length,reusedAssets:0,rejectedAttempts:rejected.length,
  generatorLimitReached:false,blockedGenerator:false,assets:prepared.map(asset=>({concept:asset.concept,
    originalFile:asset.originalRel,originalSha256:asset.originalHash,candidateFile:asset.candidateRel,
    candidateSha256:asset.candidateHash,prompt:asset.prompt,generatorCallId:asset.session.generatorCallId})),
  rejectedAttempts:rejected,productionApproved:false,integrated:false,deployed:false
};
const pngValidation={
  schemaVersion:'DUDUQ_Y4M03_PNG_VALIDATION_V1',createdAt,moduleId,validator:'qa/validate-duduq-png.mjs',
  assetCount:prepared.length,assets:prepared.map(asset=>({file:asset.candidateRel,sha256:asset.candidateHash,
    pixelWidth:asset.structural.width,pixelHeight:asset.structural.height,rgba8:true,transparentPixels:asset.structural.transparentPixels,
    opaquePixels:asset.structural.opaquePixels,bounds:asset.bounds,status:'PASS'})),status:'PASS'
};
const alphaAudit={
  schemaVersion:'DUDUQ_PNG_ALPHA_COMPONENT_AUDIT_V1',mode:'READ_ONLY_NO_IMAGE_MUTATION',createdAt,moduleId,
  alphaThreshold:64,assetCount:prepared.length,assets:prepared.map(asset=>({file:asset.candidateRel,sha256:asset.candidateHash,
    ...asset.alpha,bounds:asset.bounds,normalization:asset.normalization})),
  assetsWithMicroOpaqueIslands:prepared.filter(asset=>asset.alpha.microOpaqueIslandCount>0).length,status:'PASS'
};
const priorCheckpointPath=path.join(batchDir,'checkpoint.json');
const priorCheckpoint=await exists(priorCheckpointPath)?JSON.parse(await readFile(priorCheckpointPath,'utf8')):null;
const checkpoint={
  schemaVersion:'DUDUQ_TWO_LANE_GENERATION_CHECKPOINT_V1',createdAt,status:'Y4M03_GENERATION_CANDIDATES_COMPLETE',
  projectStatus:'INCOMPLETE',lane:'generation',moduleId,sourceAudit:{questions:20,pendingMediaIds:43,
    visualUsages:usages.length,semanticConcepts:prepared.length,allSemanticTargets:allSemanticTargets.length,
    nonVisualOnlySemanticTargets:nonVisualOnly,globalPendingMediaIds:ledger.distinctPendingMediaIds,
    questionSourceSha256:sha256(questionBytes),registrySha256:sha256(registryBytes)},candidateAssets:prepared.length,
  newlyGeneratedAssets:prepared.length,reusedVerifiedNativeOriginalAssets:0,generatorAttempts:{
    attempted:prepared.length+rejected.length,accepted:prepared.length,semanticOrAlphaRejected:rejected.length,
    quotaOrLimitBlock:false,blockedGenerator:false},coverage:{sourcePendingMediaIds:sourceMediaIds.length,
    coveredSourceMediaIds:coveredSourceMediaIds.length,occurrenceScopedBindingPlans:occurrenceGroups.length,missingConcepts:[]},
  writeBoundary:batchRel,questionsModified:false,registryModified:false,runtimeModified:false,goldMastersModified:false,
  approvalFlagsModified:false,productionModified:false,mediaOverlaysApplied:false,existingReferencedAssetsRemoved:false,
  humanApprovalClaimed:false,productionApproved:false,integrated:false,deployed:false,
  candidateBundleCommit:priorCheckpoint?.candidateBundleCommit??null,
  candidateReviewPushBranch:priorCheckpoint?.candidateReviewPushBranch??null,
  candidateCheckpointCommit:priorCheckpoint?.candidateCheckpointCommit??null,
  remotePushStatus:priorCheckpoint?.remotePushStatus??'NOT_ATTEMPTED',remotePushBlocker:priorCheckpoint?.remotePushBlocker??null,
  reviewBranch:'automation/duduq-y4m03-generation-20261106',nextAction:'COMMIT_PUSH_SAFE_CANDIDATE_BATCH_THEN_SCHEDULER_SELECT_OTHER_LANE',
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
  writeJson('preexisting-original-audit.json',preexistingOriginalAudit),writeJson('generation-provenance.json',generationProvenance),
  writeJson('generation-receipts.json',receipts),writeJson('generation-semantic-evidence.json',semanticEvidence),
  writeJson('semantic-evidence.json',semanticEvidence),writeJson('binding-plan.json',bindingPlan),
  writeJson('batch-manifest.json',batchManifest),writeJson('generation-batch-manifest.json',generationBatchManifest),
  writeJson('png-validation.json',pngValidation),writeJson('alpha-component-audit.json',alphaAudit),
  writeJson('checkpoint.json',checkpoint),writeJson('two-lane-verification.json',boundary)
]);
console.log(JSON.stringify({status:'Y4M03_GENERATION_CANDIDATES_COMPLETE',moduleId,questions:20,
  allSemanticTargets:allSemanticTargets.length,visualConcepts:prepared.length,nativeGenerated:prepared.length,
  verifiedReuse:0,rejectedAttempts:rejected.length,sourcePendingMediaIds:sourceMediaIds.length,
  coveredSourceMediaIds:coveredSourceMediaIds.length,occurrenceScopedBindings:occurrenceGroups.length,
  globalPendingMediaIds:ledger.distinctPendingMediaIds,blockedGenerator:false,productionApproved:false,
  integrated:false,deployed:false,writeBoundary:batchRel}));
