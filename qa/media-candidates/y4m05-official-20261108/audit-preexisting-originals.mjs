#!/usr/bin/env node
/**
 * Verify exact, semantically safe Codex-native sources before Y4M05 generation.
 * Writes only the module-local preexisting-original-audit.json report.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const outputPath=path.join(batchDir,'preexisting-original-audit.json');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const slash=value=>String(value).replaceAll('\\','/');
const relative=file=>slash(path.relative(root,file));
const normalize=value=>String(value??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');

const sources=[
  {concept:'apple',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-APPLE'},
  {concept:'banana',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-BANANA'},
  {concept:'black',sourceBatch:'y1m04-official-20261030',sourceAssetKey:'Y1M04-OFFICIAL-BLACK',legacyCandidateIsPreservedSource:true},
  {concept:'blue',sourceBatch:'y1m04-official-20261030',sourceAssetKey:'Y1M04-OFFICIAL-BLUE',legacyCandidateIsPreservedSource:true},
  {concept:'carrot',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-CARROT'},
  {concept:'grape',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-GRAPE'},
  {concept:'gray',sourceBatch:'y2m04-official-20261102',sourceAssetKey:'Y2M04-CANDIDATE-GRAY'},
  {concept:'i do not like carrots',sourceBatch:'y3m04-official-20261105',sourceAssetKey:'Y3M04-CANDIDATE-I-DO-NOT-LIKE-CARROTS'},
  {concept:'i like apples',sourceBatch:'y3m04-official-20261105',sourceAssetKey:'Y3M04-CANDIDATE-I-LIKE-APPLES'},
  {concept:'i like papaya',sourceBatch:'y3m04-official-20261105',sourceAssetKey:'Y3M04-CANDIDATE-I-LIKE-PAPAYA'},
  {concept:'i prefer grapes',sourceBatch:'y3m04-official-20261105',sourceAssetKey:'Y3M04-CANDIDATE-I-PREFER-GRAPES'},
  {concept:'large',sourceSemanticTarget:'big',sourceBatch:'y1m06-official-20261030',sourceAssetKey:'Y1M06-CANDIDATE-BIG',semanticEquivalence:'BIG_AND_LARGE_ARE_EXACT_SIZE_SYNONYMS; THE SOURCE CUBE ENCODES SCALE ONLY'},
  {concept:'melon',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-MELON'},
  {concept:'orange',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-ORANGE-FRUIT',semanticDisambiguation:'FRUIT_NOT_COLOR; Y4M05-Q003 PAIRS ORANGE WITH PEAR, GRAPE, PAPAYA, MELON AND CARROT'},
  {concept:'papaya',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-PAPAYA'},
  {concept:'pear',sourceBatch:'y2m06-official-20261102',sourceAssetKey:'Y2M06-CANDIDATE-PEAR'},
  {concept:'red',sourceBatch:'y1m04-official-20261030',sourceAssetKey:'Y1M04-OFFICIAL-RED',legacyCandidateIsPreservedSource:true},
  {concept:'small',sourceBatch:'y1m06-official-20261030',sourceAssetKey:'Y1M06-CANDIDATE-SMALL'},
  {concept:'yellow',sourceBatch:'y1m04-official-20261030',sourceAssetKey:'Y1M04-OFFICIAL-YELLOW',legacyCandidateIsPreservedSource:true}
];
const generatedSemanticTargets=['dress','jacket','medium','pants','pants/trousers','shirt','shoes','t-shirt','trousers'];

async function readJson(file){return JSON.parse(await readFile(file,'utf8'))}
function promptFrom({asset,generation,sourceSemanticTarget}){
  return asset.provenance?.prompt??
    generation.promptCatalog?.[sourceSemanticTarget]?.prompt??
    generation.records?.find(record=>record.assetKey===asset.assetKey)?.prompt??
    generation.assets?.find(record=>record.assetKey===asset.assetKey||record.concept===sourceSemanticTarget)?.prompt??
    null;
}
async function readGenerationProvenance(sourceDir){
  const candidates=[
    path.join(sourceDir,'generation-provenance.json'),
    path.join(sourceDir,'provenance/generation-provenance.json')
  ];
  for(const candidate of candidates){
    try{return {file:candidate,json:await readJson(candidate)}}catch(error){if(error?.code!=='ENOENT')throw error}
  }
  return null;
}

const [inventory,plan]=await Promise.all([
  readJson(path.join(batchDir,'question-inventory.json')),
  readJson(path.join(batchDir,'generation-plan.json'))
]);
if(inventory.moduleId!=='Y4M05'||inventory.questionCount!==20||inventory.visualUsageCount!==94||
  inventory.sourceMediaIdCount!==54||inventory.visualConceptCount!==28||
  inventory.occurrenceScopedBindingPlanCount!==86||inventory.globalPendingMediaIds!==1055){
  throw Error('Y4M05_INVENTORY_NOT_PINNED_FOR_REUSE_AUDIT');
}
if(plan.sourceQuestionSha256!==inventory.sourceQuestionSha256||
  plan.sourceRegistrySha256!==inventory.sourceRegistrySha256||
  JSON.stringify(plan.semanticConcepts)!==JSON.stringify(inventory.visualConcepts)){
  throw Error('Y4M05_GENERATION_PLAN_SOURCE_DRIFT');
}

const reusable=[];
for(const source of sources){
  const sourceDir=path.join(root,'qa/media-candidates',source.sourceBatch);
  const manifestPath=path.join(sourceDir,'batch-manifest.json');
  const manifestBytes=await readFile(manifestPath);
  const manifest=JSON.parse(manifestBytes);
  const matches=(manifest.assets??[]).filter(asset=>asset.assetKey===source.sourceAssetKey);
  if(matches.length!==1)throw Error('Y4M05_REUSE_SOURCE_CARDINALITY:'+source.sourceAssetKey+':'+matches.length);
  const asset=matches[0];
  const sourceSemanticTarget=normalize(source.sourceSemanticTarget??source.concept);
  if(normalize(asset.semanticTarget)!==sourceSemanticTarget){
    throw Error('Y4M05_REUSE_SOURCE_SEMANTIC_DRIFT:'+source.sourceAssetKey);
  }
  if(!/PASSED/.test(String(asset.review??''))){
    throw Error('Y4M05_REUSE_SOURCE_REVIEW_NOT_PASSED:'+source.sourceAssetKey);
  }
  const candidatePath=path.join(sourceDir,asset.file);
  const candidateBytes=await readFile(candidatePath);
  const candidateSha256=sha256(candidateBytes);
  if(candidateSha256!==String(asset.sha256??'').toLowerCase()){
    throw Error('Y4M05_REUSE_CANDIDATE_HASH_MISMATCH:'+source.sourceAssetKey);
  }
  const candidatePng=validateDuduqRgbaPng(candidateBytes);
  if(candidatePng.width<1024||candidatePng.height<1024){
    throw Error('Y4M05_REUSE_CANDIDATE_BELOW_1024:'+source.sourceAssetKey);
  }

  const generationRecord=await readGenerationProvenance(sourceDir);
  const provider=String(asset.provenance?.provider??generationRecord?.json?.provider??'');
  if(!/(?:Codex|OpenAI).*?image(?:_|\s|-)?gen(?:erator|eration)?/i.test(provider)){
    throw Error('Y4M05_REUSE_PROVIDER_NOT_NATIVE_CODEX:'+source.sourceAssetKey+':'+provider);
  }
  const prompt=promptFrom({asset,generation:generationRecord?.json??{},sourceSemanticTarget});
  if(typeof prompt!=='string'||prompt.trim().length<40){
    throw Error('Y4M05_REUSE_PROMPT_MISSING:'+source.sourceAssetKey);
  }

  const originalRel=asset.provenance?.preservedOriginal??asset.provenance?.originalFile??null;
  let originalPath=originalRel?path.join(sourceDir,originalRel):candidatePath;
  let originalStatus=originalRel?'PRESERVED_NATIVE_GENERATOR_ORIGINAL':'LEGACY_NATIVE_CANDIDATE_IS_ONLY_PRESERVED_SOURCE_AFTER_RECORDED_ALPHA_NORMALIZATION';
  if(source.legacyCandidateIsPreservedSource){
    originalPath=candidatePath;
    originalStatus='LEGACY_NATIVE_CANDIDATE_IS_ONLY_PRESERVED_SOURCE_AFTER_RECORDED_ALPHA_NORMALIZATION';
  }
  const originalBytes=await readFile(originalPath);
  const originalSha256=sha256(originalBytes);
  const declaredOriginalSha=String(asset.provenance?.originalSha256??'').toLowerCase();
  if(declaredOriginalSha&&declaredOriginalSha!==originalSha256){
    throw Error('Y4M05_REUSE_ORIGINAL_HASH_MISMATCH:'+source.sourceAssetKey);
  }
  const originalPng=validateDuduqRgbaPng(originalBytes);
  if(originalPng.width<1024||originalPng.height<1024){
    throw Error('Y4M05_REUSE_ORIGINAL_BELOW_1024:'+source.sourceAssetKey);
  }

  const usages=inventory.questions.flatMap(question=>question.visualUsages).filter(usage=>usage.semanticTarget===source.concept);
  if(!usages.length)throw Error('Y4M05_REUSE_TARGET_UNUSED:'+source.concept);
  reusable.push({
    concept:source.concept,
    sourceSemanticTarget,
    usageCount:usages.length,
    questionIds:[...new Set(usages.map(usage=>usage.questionId))].sort(),
    decision:'REUSE_VERIFIED_PREEXISTING_CODEX_NATIVE_SOURCE',
    sourceBatch:source.sourceBatch,
    sourceManifest:relative(manifestPath),
    sourceManifestSha256:sha256(manifestBytes),
    sourceAssetKey:asset.assetKey,
    sourceCandidateFile:relative(candidatePath),
    sourceCandidateSha256:candidateSha256,
    sourceOriginalFile:relative(originalPath),
    sourceOriginalSha256:originalSha256,
    sourceOriginalStatus:originalStatus,
    sourceGenerationClass:asset.provenance?.generationClass??null,
    provider,
    prompt,
    promptRecordStatus:asset.provenance?.promptRecord??(generationRecord?'SOURCE_GENERATION_PROVENANCE_FILE_VERIFIED':'SOURCE_MANIFEST_PROMPT_VERIFIED'),
    sourceGenerationProvenance:generationRecord?relative(generationRecord.file):null,
    candidatePng,
    originalPng,
    semanticEquivalence:source.semanticEquivalence??'EXACT_NORMALIZED_SEMANTIC_TARGET',
    semanticDisambiguation:source.semanticDisambiguation??null,
    alphaNormalization:asset.provenance?.alphaNormalization??(asset.provenance?.alphaNormalizationApplied===true?{recorded:true}:null)
  });
}

const covered=[...new Set(reusable.map(item=>item.concept))].sort();
const expectedReusable=sources.map(item=>item.concept).sort();
if(JSON.stringify(covered)!==JSON.stringify(expectedReusable))throw Error('Y4M05_REUSE_COVERAGE_DRIFT');
const missing=generatedSemanticTargets.map(concept=>{
  const usages=inventory.questions.flatMap(question=>question.visualUsages).filter(usage=>usage.semanticTarget===concept);
  return {concept,usageCount:usages.length,questionIds:[...new Set(usages.map(usage=>usage.questionId))].sort(),decision:'NEED_NATIVE_GENERATION_OR_COVERED_SYNONYM_ASSET'};
});
const generationAssetConcepts=plan.generationQueue.map(item=>item.concept);
if(JSON.stringify(generationAssetConcepts)!==JSON.stringify(['dress','jacket','medium','shirt','shoes','t-shirt','trousers'])){
  throw Error('Y4M05_GENERATION_ASSET_QUEUE_DRIFT');
}

let auditedAt=new Date().toISOString();
try{
  const previous=await readJson(outputPath);
  const stable=previous.sourceQuestionSha256===inventory.sourceQuestionSha256&&
    JSON.stringify(previous.reusable?.map(item=>[item.concept,item.sourceOriginalSha256,item.sourceCandidateSha256]))===
      JSON.stringify(reusable.map(item=>[item.concept,item.sourceOriginalSha256,item.sourceCandidateSha256]));
  if(stable)auditedAt=previous.auditedAt;
}catch(error){if(error?.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error}

const report={
  schemaVersion:'DUDUQ_Y4M05_PREEXISTING_ORIGINAL_AUDIT_V1',
  auditedAt,
  moduleId:'Y4M05',
  sourceQuestionSha256:inventory.sourceQuestionSha256,
  conceptCount:inventory.visualConceptCount,
  reusableSemanticTargetCount:reusable.length,
  generatedSemanticTargetCount:generatedSemanticTargets.length,
  requiredGeneratedAssetCount:generationAssetConcepts.length,
  reusable,
  missing,
  generatedAssetConcepts:generationAssetConcepts,
  semanticConsolidation:{
    trousers:{covers:['pants','pants/trousers','trousers'],reason:'exact source-contract synonyms for one full-length garment'},
    large:{reusesSourceSemanticTarget:'big',reason:'exact English size synonym represented by a scale-only neutral cube'}
  },
  rejected:[],
  safety:{candidateEvidenceOnly:true,productionApproved:false,integrated:false,sourceFilesModified:false}
};
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  status:'Y4M05_PREEXISTING_ORIGINAL_AUDIT_COMPLETE',
  reusable:reusable.map(item=>item.concept),
  generatedAssetConcepts:generationAssetConcepts,
  reusableSemanticTargets:reusable.length,
  generatedSemanticTargets:generatedSemanticTargets.length,
  productionApproved:false
}));
