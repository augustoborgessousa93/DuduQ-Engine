#!/usr/bin/env node
/**
 * Prepare a conservative, reproducible candidate bundle from Assets-DuduQ.
 * This only copies source PNG bytes into a QA bundle; it never edits questions,
 * Gold Masters, the source repository, or production files.
 *
 * Usage:
 *   node qa/prepare-assets-duduq-reuse.mjs <assets-repo-checkout> [--out=<dir>]
 */
import {createHash,createHash as createGitHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';

const ROOT=process.cwd();
const EXPECTED_SOURCE_COMMIT='50fb80a89a5779d73f81c96aab35f6e86193d769';
const SOURCE_REPOSITORY='augustoborgessousa93/Assets-DuduQ';
const SOURCE_DIR=path.resolve(process.argv[2]||'');
const outArg=process.argv.find(x=>x.startsWith('--out='))?.slice(6);
const OUTPUT=path.resolve(outArg||'qa/media-candidates/assets-duduq-reuse-20261030');
const DEFAULT_OUTPUT=path.resolve('qa/media-candidates/assets-duduq-reuse-20261030');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const gitBlobHash=bytes=>createGitHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const safe=(base,target)=>target===base||target.startsWith(base+path.sep);
if(!process.argv[2])throw Error('ASSETS_REPO_CHECKOUT_REQUIRED');
if(!safe(ROOT,OUTPUT))throw Error('OUTPUT_MUST_STAY_INSIDE_DUDUQ_REPOSITORY');
const sourceRoot=SOURCE_DIR;
const sourceDir=path.join(sourceRoot,'Imagens Ilustrativa');
const sourceCommit=process.env.ASSETS_DUDUQ_SOURCE_COMMIT||EXPECTED_SOURCE_COMMIT;
if(sourceCommit!==EXPECTED_SOURCE_COMMIT)throw Error('UNEXPECTED_ASSETS_SOURCE_COMMIT:'+sourceCommit);
if(!await fs.stat(sourceDir).then(s=>s.isDirectory(),()=>false))throw Error('ASSETS_SOURCE_FOLDER_MISSING');

// Explicit visual/semantic allowlist. Similar names, colors, counts, scenes,
// character identities and pencil cases are intentionally not inferred here.
const assetMap=[
  {assetKey:'ASSETS_DUDUQ_SCHOOL_BACKPACK',semanticTarget:'backpack',sourcePath:'Imagens Ilustrativa/school-object-backpack-mochila.png',expectedSha256:'c0af0d874a7cf859bc3439aadab0611db052dfecb46513ac879c0accaaa63b0e',visualNote:'Single blue/yellow school backpack with straps, handle, zipper and front pocket; no extra school objects.'},
  {assetKey:'ASSETS_DUDUQ_SCHOOL_ERASER',semanticTarget:'eraser',sourcePath:'Imagens Ilustrativa/school-object-eraser-borracha.png',expectedSha256:'8f07f04e322055af0041ba3f9a5bf79f7ab259a5379c803e73d1e0474bee569b',visualNote:'One recognizable school eraser with blue cap; no writing or additional countable objects.'},
  {assetKey:'ASSETS_DUDUQ_SCHOOL_PENCIL',semanticTarget:'pencil',sourcePath:'Imagens Ilustrativa/school-object-pencil-lapis.png',expectedSha256:'0b8dbb225d43ad22721c2c4d216902b927efcad62cb9f5a8c481b7ed7e4002f4',visualNote:'One recognizable yellow school pencil; no pencil case or other school objects.'},
  {assetKey:'ASSETS_DUDUQ_SCHOOL_RULER',semanticTarget:'ruler',sourcePath:'Imagens Ilustrativa/school-object-ruler-regua.png',expectedSha256:'87360140ee894b1a83a425d160c4e24ed4455e4213e7e629c9d08f3fef8e8804',visualNote:'One recognizable ruler with measurement marks; no other school objects.'},
  {assetKey:'ASSETS_DUDUQ_SCHOOL_PEN',semanticTarget:'pen',sourcePath:'Imagens Ilustrativa/school-object-blue-pen-caneta-azul.png',expectedSha256:'28c66be728c462d404062d009efe4ba987965b03c74c70c692123027edd449eb',visualNote:'One recognizable blue pen; no other school objects.'},
  {assetKey:'ASSETS_DUDUQ_SCHOOL_CRAYON',semanticTarget:'crayon',sourcePath:'Imagens Ilustrativa/school-object-orange-crayon-giz-laranja.png',expectedSha256:'da5aefebf18a8cab62aea27114262caa39e84335529a48c66cc9a2626f4b5198',visualNote:'One recognizable orange crayon; no other school objects.'},
  {assetKey:'ASSETS_DUDUQ_FRUIT_APPLE',semanticTarget:'apple',sourcePath:'Imagens Ilustrativa/Apple - maçã.png',expectedSha256:'6a39df4d82c7d1c2d662c61550a519003c0d51c9f6fe0a12af23d1208d0d1610',visualNote:'One red apple with its attached leaf; no other fruit.'},
  {assetKey:'ASSETS_DUDUQ_FRUIT_BANANA',semanticTarget:'banana',sourcePath:'Imagens Ilustrativa/Banana.png',expectedSha256:'f148e77d9ee50ed262d9d977f0ba1cd6b804fec630b9498523e7b90aba8621ce',visualNote:'One yellow banana; no other fruit.'},
  {assetKey:'ASSETS_DUDUQ_FRUIT_PEAR',semanticTarget:'pear',sourcePath:'Imagens Ilustrativa/Pear - pera.png',expectedSha256:'d0d2bc43ff0b2f776cb62a71280a0ce47f7dac7f281457dd5071e2b6af0377ac',visualNote:'One green pear with its attached leaf; no other fruit.'}
];

const queueDoc=JSON.parse(await fs.readFile(path.join(ROOT,'docs/qa/media-audit-20261029/replacement-queue.json'),'utf8'));
const queue=new Map(queueDoc.queue.map(x=>[x.mediaId,x]));
const modulesByYear=new Map();
const auditHashes={};
for(let year=1;year<=5;year++){
  const rel='docs/qa/media-audit-20261029/year-'+year+'.json';
  const bytes=await fs.readFile(path.join(ROOT,rel));
  auditHashes[rel]=sha256(bytes);
  modulesByYear.set(year,JSON.parse(bytes.toString('utf8')).modules);
}

const destinationImages=path.join(OUTPUT,'images');
await fs.mkdir(destinationImages,{recursive:true});
const evidenceRel=path.relative(ROOT,path.join(OUTPUT,'semantic-evidence.json')).split(path.sep).join('/');
if(!evidenceRel||evidenceRel.startsWith('../'))throw Error('UNSAFE_EVIDENCE_OUTPUT_PATH');
const sourceBytesByKey=new Map();
async function writeImmutableJson(file,value){
  const bytes=Buffer.from(JSON.stringify(value,null,2)+'\n');
  const prior=await fs.readFile(file).catch(()=>null);
  if(prior){if(!prior.equals(bytes))throw Error('GENERATED_REPORT_CONFLICT:'+path.relative(ROOT,file));return;}
  await fs.writeFile(file,bytes,{flag:'wx'});
}
const assets=[],skipped=[];
for(const candidate of assetMap){
  const sourceFile=path.resolve(sourceRoot,candidate.sourcePath);
  if(!safe(sourceRoot,sourceFile))throw Error('UNSAFE_SOURCE_PATH:'+candidate.sourcePath);
  const bytes=await fs.readFile(sourceFile);
  const actualHash=sha256(bytes);
  if(actualHash!==candidate.expectedSha256)throw Error('SOURCE_FILE_HASH_MISMATCH:'+candidate.assetKey+':'+actualHash);
  const png=inspectPng(bytes);
  if(!png.valid||!png.transparent||bytes.readUInt32BE(16)<1024||bytes.readUInt32BE(20)<1024||bytes[24]!==8||bytes[25]!==6)
    throw Error('SOURCE_PNG_TECHNICAL_QA_FAILED:'+candidate.assetKey+':'+JSON.stringify(png));
  // The workflow separately verifies the checked-out commit. This is the
  // canonical Git blob identity of the exact bytes, computed without invoking
  // a child process (which is restricted in the local Windows runner).
  const sourceGitBlob=gitBlobHash(bytes);
  const stagedFile='images/'+candidate.assetKey+'.png';
  const stagedPath=path.join(OUTPUT,stagedFile);
  const existing=await fs.readFile(stagedPath).catch(()=>null);
  if(existing&&sha256(existing)!==actualHash)throw Error('CANDIDATE_FILE_CONFLICT:'+candidate.assetKey);
  sourceBytesByKey.set(candidate.assetKey,bytes);
  assets.push({...candidate,file:stagedFile,sha256:actualHash,pixelWidth:bytes.readUInt32BE(16),pixelHeight:bytes.readUInt32BE(20),sourceGitBlob,technicalQc:png,review:'MODEL_SEMANTIC_PRECHECK_PASSED',reviewEvidence:evidenceRel});
}

const bindingsByAsset=new Map(assets.map(a=>[a.assetKey,new Map()]));
const assetBySemantic=new Map(assets.map(a=>[a.semanticTarget,a]));
const moduleIds=new Set(),affectedQuestions=new Set();
for(const [year,modules] of modulesByYear)for(const mod of modules)for(const q of mod.questions||[]){
  for(const option of q.options||[]){
    const asset=assetBySemantic.get(option.semanticTarget);
    if(!asset||!option.mediaId)continue;
    if(q.semanticReview==='NEEDS_HUMAN_REVIEW'||option.semanticReview==='NEEDS_HUMAN_REVIEW'){
      skipped.push({questionId:q.questionId,mediaId:option.mediaId,semanticTarget:option.semanticTarget,reason:'CONTRACT_REQUIRES_HUMAN_REVIEW'});continue;
    }
    if(option.mustInclude&&option.mustInclude!==asset.semanticTarget){
      skipped.push({questionId:q.questionId,mediaId:option.mediaId,semanticTarget:option.semanticTarget,reason:'MUST_INCLUDE_NOT_EXACT'});continue;
    }
    const entry=queue.get(option.mediaId);
    if(!entry||entry.kind!=='image'||entry.classification!=='PROVISIONAL'||entry.temporary!==true||entry.semanticConflict||entry.semantic!==asset.semanticTarget){
      skipped.push({questionId:q.questionId,mediaId:option.mediaId,semanticTarget:option.semanticTarget,reason:'QUEUE_NOT_EXACT_PROVISIONAL'});continue;
    }
    const map=bindingsByAsset.get(asset.assetKey);
    if(!map.has(option.mediaId))map.set(option.mediaId,{questionId:q.questionId,mediaId:option.mediaId,verifiedQuestionIds:[],optionIds:[]});
    const binding=map.get(option.mediaId);
    if(!binding.verifiedQuestionIds.includes(q.questionId))binding.verifiedQuestionIds.push(q.questionId);
    binding.optionIds.push(option.optionId);
    moduleIds.add(q.questionId.slice(0,5));affectedQuestions.add(q.questionId);
  }
}
for(const asset of assets){
  asset.bindings=[...bindingsByAsset.get(asset.assetKey).values()].map(b=>({...b,verifiedQuestionIds:b.verifiedQuestionIds.sort(),optionIds:b.optionIds.sort()}));
  if(!asset.bindings.length)skipped.push({assetKey:asset.assetKey,semanticTarget:asset.semanticTarget,reason:'NO_EXACT_PROVISIONAL_BINDINGS'});
}
const usedAssets=assets.filter(a=>a.bindings.length);
if(!usedAssets.length)throw Error('NO_EXACT_BINDINGS_FOUND');
for(const asset of usedAssets){
  const target=path.join(OUTPUT,asset.file);
  const prior=await fs.readFile(target).catch(()=>null);
  const bytes=sourceBytesByKey.get(asset.assetKey);
  if(prior&&!prior.equals(bytes))throw Error('CANDIDATE_FILE_CONFLICT:'+asset.assetKey);
  if(!prior)await fs.copyFile(path.join(sourceDir,path.basename(asset.sourcePath)),target);
}

const evidence={schemaVersion:'DUDUQ_ASSETS_SOURCE_VISUAL_SEMANTIC_EVIDENCE_V1',createdAt:'2026-10-30',provider:'Codex visual inspection of source PNGs',sourceRepository:SOURCE_REPOSITORY,sourceCommit,sourceAuditHashes:auditHashes,
  reviewStatus:'CODEX_VISUAL_PRECHECK_PASSED_HUMAN_PEDAGOGICAL_REVIEW_PENDING',
  renderedReview:{status:'HUMAN_PEDAGOGICAL_REVIEW_PENDING',note:'The visual matching precheck is not a human pedagogical approval. The importer keeps every changed registry entry temporary and QA-pending.'},
  candidateAssets:usedAssets.map(a=>({assetKey:a.assetKey,concept:a.semanticTarget,file:a.file,width:a.pixelWidth,height:a.pixelHeight,format:'PNG_RGBA',sha256:a.sha256,semanticPrecheck:'PASSED',technicalQc:a.technicalQc,visualReview:a.visualNote,sourcePath:a.sourcePath,sourceGitBlob:a.sourceGitBlob}))};
await writeImmutableJson(path.join(OUTPUT,'semantic-evidence.json'),evidence);
const manifest={schemaVersion:'DUDUQ_ASSETS_DUDUQ_SOURCE_REUSE_V1',createdAt:'2026-10-30',provider:'Assets-DuduQ repository',sourceRepository:SOURCE_REPOSITORY,sourceCommit,
  status:'QA_ONLY_REUSE_CANDIDATE',productionApproved:false,humanPedagogicalApproval:false,auditReference:'docs/qa/media-audit-20261029',assets:usedAssets};
await writeImmutableJson(path.join(OUTPUT,'batch-manifest.json'),manifest);
const report={schemaVersion:'DUDUQ_ASSETS_SOURCE_REUSE_PREPARATION_V1',status:'PREPARED_NOT_IMPORTED',sourceRepository:SOURCE_REPOSITORY,sourceCommit,sourceFileCount:assetMap.length,
  preparedDistinctAssets:usedAssets.length,preparedBindings:usedAssets.reduce((n,a)=>n+a.bindings.length,0),affectedQuestions:[...affectedQuestions].sort(),affectedModules:[...moduleIds].sort(),
  sourceHashes:assets.map(a=>({assetKey:a.assetKey,sourcePath:a.sourcePath,sha256:a.sha256,sourceGitBlob:a.sourceGitBlob,width:a.pixelWidth,height:a.pixelHeight,transparent:a.technicalQc.transparent,integrated:!!a.bindings.length})),skipped};
const reportPath=path.join(OUTPUT,'preparation-report.json');
await writeImmutableJson(reportPath,report);
console.log(JSON.stringify(report,null,2));
