#!/usr/bin/env node
/**
 * Verify exact, semantic-safe Codex-native originals before Y4M04 generation.
 * Writes only the module-local preexisting-original-audit.json report.
 */
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateDuduqRgbaPng} from '../../validate-duduq-png.mjs';

const batchDir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(batchDir,'../../..');
const candidateRoot=path.join(root,'qa/media-candidates');
const outputPath=path.join(batchDir,'preexisting-original-audit.json');
const canonicalNumberBatch='y1m02-official-20261030';
const concepts=['basketball','eight','five','four','nine','one','seven','six','soccer','ten','tennis','three','two','volleyball'];
const numberConcepts=new Set(['one','two','three','four','five','six','seven','eight','nine','ten']);
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

async function readJson(file){
  return JSON.parse(await readFile(file,'utf8'));
}

async function listManifestPaths(base){
  const found=[];
  for(const entry of await readdir(base,{withFileTypes:true})){
    if(!entry.isDirectory())continue;
    const manifest=path.join(base,entry.name,'batch-manifest.json');
    try{
      await readFile(manifest);
      found.push(manifest);
    }catch(error){
      if(error?.code!=='ENOENT')throw error;
    }
  }
  return found.sort();
}

const inventory=await readJson(path.join(batchDir,'question-inventory.json'));
if(inventory.moduleId!=='Y4M04'||inventory.questionCount!==20||inventory.globalPendingMediaIds!==1055){
  throw Error('Y4M04_INVENTORY_NOT_PINNED_FOR_PREEXISTING_AUDIT');
}
if(JSON.stringify(inventory.visualConcepts)!==JSON.stringify(concepts)){
  throw Error('Y4M04_VISUAL_CONCEPT_SET_DRIFT');
}

const manifests=[];
for(const manifestPath of await listManifestPaths(candidateRoot)){
  const manifest=await readJson(manifestPath);
  manifests.push({manifestPath,manifest});
}
const canonicalManifestRecord=manifests.find(record=>path.basename(path.dirname(record.manifestPath))===canonicalNumberBatch);
if(!canonicalManifestRecord)throw Error('Y4M04_CANONICAL_NUMBER_SOURCE_MISSING');

const reusable=[];
const missing=[];
const rejected=[];
for(const concept of concepts){
  const usageCount=inventory.questions.reduce((sum,question)=>sum+question.visualUsages.filter(usage=>usage.semanticTarget===concept).length,0);
  if(!numberConcepts.has(concept)){
    const exactMatches=manifests.flatMap(record=>(record.manifest.assets??[])
      .filter(asset=>asset.semanticTarget===concept)
      .map(asset=>({manifest:path.relative(root,record.manifestPath).replaceAll('\\','/'),asset})));
    if(exactMatches.length){
      rejected.push({concept,reason:'PREEXISTING_EXACT_CONCEPT_NOT_CANONICALLY_PROVEN_FOR_REUSE',matches:exactMatches.map(match=>({manifest:match.manifest,assetKey:match.asset.assetKey,file:match.asset.file,review:match.asset.review}))});
    }
    missing.push({concept,usageCount,decision:'NEED_NATIVE_GENERATION',preexistingExactMatches:exactMatches.length});
    continue;
  }

  const sourceBase=path.dirname(canonicalManifestRecord.manifestPath);
  const matches=(canonicalManifestRecord.manifest.assets??[]).filter(asset=>asset.semanticTarget===concept);
  if(matches.length!==1)throw Error('Y4M04_NUMBER_SOURCE_CARDINALITY:'+concept+':'+matches.length);
  const asset=matches[0];
  const originalRel=asset.provenance?.originalFile;
  const originalSha=String(asset.provenance?.originalSha256??'').toLowerCase();
  const candidateSha=String(asset.sha256??'').toLowerCase();
  const failures=[];
  if(asset.provenance?.provider!=='Codex built-in image_gen')failures.push('PROVIDER_NOT_CODEX_BUILT_IN_IMAGE_GEN');
  if(asset.provenance?.nativeSourceExactHashMatch!==true)failures.push('NATIVE_SOURCE_EXACT_HASH_NOT_PROVEN');
  if(!/PASSED/.test(String(asset.review??'')))failures.push('SOURCE_REVIEW_NOT_PASSED');
  if(!/^provenance\/originals\/[A-Z0-9_.-]+\.png$/.test(String(originalRel??'')))failures.push('UNSAFE_ORIGINAL_PATH');
  if(!/^[a-f0-9]{64}$/.test(originalSha))failures.push('INVALID_ORIGINAL_SHA256');
  if(!/^[a-f0-9]{64}$/.test(candidateSha))failures.push('INVALID_CANDIDATE_SHA256');

  let originalBytes,candidateBytes,originalPng,candidatePng;
  if(!failures.length){
    try{originalBytes=await readFile(path.join(sourceBase,originalRel));}catch{failures.push('ORIGINAL_FILE_MISSING');}
    try{candidateBytes=await readFile(path.join(sourceBase,asset.file));}catch{failures.push('CANDIDATE_FILE_MISSING');}
  }
  if(originalBytes&&sha256(originalBytes)!==originalSha)failures.push('ORIGINAL_SHA256_MISMATCH');
  if(candidateBytes&&sha256(candidateBytes)!==candidateSha)failures.push('CANDIDATE_SHA256_MISMATCH');
  if(originalBytes){
    try{originalPng=validateDuduqRgbaPng(originalBytes);}catch(error){failures.push('ORIGINAL_PNG_INVALID:'+error.message);}
  }
  if(candidateBytes){
    try{candidatePng=validateDuduqRgbaPng(candidateBytes);}catch(error){failures.push('CANDIDATE_PNG_INVALID:'+error.message);}
  }
  if(originalPng&&(originalPng.width<1024||originalPng.height<1024))failures.push('ORIGINAL_RESOLUTION_BELOW_MINIMUM');
  if(candidatePng&&(candidatePng.width<1024||candidatePng.height<1024))failures.push('CANDIDATE_RESOLUTION_BELOW_MINIMUM');
  if(failures.length){
    rejected.push({concept,sourceBatch:canonicalNumberBatch,assetKey:asset.assetKey,failures});
    missing.push({concept,usageCount,decision:'NEED_NATIVE_GENERATION_AFTER_REUSE_REJECTION',preexistingExactMatches:1});
    continue;
  }
  reusable.push({
    concept,
    usageCount,
    decision:'REUSE_VERIFIED_PREEXISTING_NATIVE_ORIGINAL',
    sourceBatch:canonicalNumberBatch,
    sourceManifest:path.relative(root,canonicalManifestRecord.manifestPath).replaceAll('\\','/'),
    sourceManifestSha256:sha256(await readFile(canonicalManifestRecord.manifestPath)),
    sourceAssetKey:asset.assetKey,
    sourceCandidateFile:path.relative(root,path.join(sourceBase,asset.file)).replaceAll('\\','/'),
    sourceCandidateSha256:candidateSha,
    sourceOriginalFile:path.relative(root,path.join(sourceBase,originalRel)).replaceAll('\\','/'),
    sourceOriginalSha256:originalSha,
    sourceGenerationClass:asset.provenance.generationClass,
    provider:asset.provenance.provider,
    prompt:asset.provenance.prompt,
    originalPromptRecordStatus:asset.provenance.originalPromptRecordStatus,
    nativeSourceExactHashMatch:true,
    originalPng,
    candidatePng,
    alphaNormalization:asset.provenance.alphaNormalization??null
  });
}

let auditedAt=new Date().toISOString();
try{
  const previous=await readJson(outputPath);
  const stable=previous.sourceQuestionSha256===inventory.sourceQuestionSha256&&
    JSON.stringify(previous.reusable?.map(item=>[item.concept,item.sourceOriginalSha256,item.sourceCandidateSha256]))===JSON.stringify(reusable.map(item=>[item.concept,item.sourceOriginalSha256,item.sourceCandidateSha256]))&&
    JSON.stringify(previous.missing?.map(item=>item.concept))===JSON.stringify(missing.map(item=>item.concept));
  if(stable)auditedAt=previous.auditedAt;
}catch(error){
  if(error?.code!=='ENOENT'&&!(error instanceof SyntaxError))throw error;
}

const report={
  schemaVersion:'DUDUQ_Y4M04_PREEXISTING_ORIGINAL_AUDIT_V1',
  auditedAt,
  moduleId:'Y4M04',
  sourceQuestionSha256:inventory.sourceQuestionSha256,
  canonicalNumberBatch,
  conceptCount:concepts.length,
  reusableCount:reusable.length,
  missingCount:missing.length,
  reusable,
  missing,
  rejected,
  safety:{candidateEvidenceOnly:true,productionApproved:false,integrated:false,sourceFilesModified:false}
};
await writeFile(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({
  status:'Y4M04_PREEXISTING_ORIGINAL_AUDIT_COMPLETE',
  reusable:reusable.map(item=>item.concept),
  missing:missing.map(item=>item.concept),
  rejected:rejected.length,
  productionApproved:false
}));
