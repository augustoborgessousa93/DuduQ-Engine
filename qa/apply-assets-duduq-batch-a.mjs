#!/usr/bin/env node
/**
 * Strict, occurrence-safe reuse of approved-to-preview existing school images
 * for Y1M02 (numbers), Y1M03 (colors), Y1M06 (pets).
 * Changes ONLY the compiled dist-pages artifact on an isolated review branch.
 * NEVER edits Gold Masters, answer keys, source questions, or the live release.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const ROOT=process.cwd(),DIST=path.join(ROOT,'dist-pages');
const SOURCE=path.resolve(process.argv[2]||'qa/assets-reuse-source/batch-a');
const APPLY=process.argv.includes('--apply');
const OUTPUT='qa/results/assets-duduq-batch-a-integration.json';
const allowed=process.env.CF_PAGES_BRANCH==='integration/assets-duduq-resume-20261030'
  || process.env.DUDUQ_ASSETS_SAFE_QA==='1';
if(APPLY&&!allowed)throw Error('REFUSE_APPLY_OUTSIDE_QA_PREVIEW_BRANCH');
if(!SOURCE.startsWith(ROOT+path.sep)||!DIST.startsWith(ROOT+path.sep))throw Error('INVALID_QA_PATHS');
const catalogue=JSON.parse(await readFile('qa/assets-duduq-batch-a.json','utf8'));
assert.equal(catalogue.schemaVersion,'DUDUQ_ASSETS_EXACT_MODULE_BATCH_V1');
assert.equal(catalogue.sourceCommit,'658d94f08031820cfea5258a6f4e7c24f278df92');
assert.equal((await readFile(path.join(SOURCE,'.git-source-commit'),'utf8')).trim(),catalogue.sourceCommit,'WRONG_SOURCE_COMMIT');
const sha=b=>createHash('sha256').update(b).digest('hex');
const gitBlob=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const manifestPath=path.join(DIST,'.duduq-pages-manifest'),sourceManifest=await readFile(manifestPath,'utf8');
const manifest=new Map();
for(const line of sourceManifest.trimEnd().split(/\r?\n/)){
 const x=/^(.*) ([a-f0-9]{64})$/.exec(line);
 if(!x||manifest.has(x[1]))throw Error('INVALID_ARTIFACT_MANIFEST_LINE:'+line.slice(0,90));
 manifest.set(x[1],x[2]);
}
const originalHash=sha(sourceManifest),verified=async p=>{
 const expected=manifest.get(p);
 if(!expected)throw Error('SOURCE_MANIFEST_ENTRY_MISSING:'+p);
 const bytes=await readFile(path.join(DIST,p));
 if(sha(bytes)!==expected)throw Error('SOURCE_ARTIFACT_HASH_MISMATCH:'+p);
 return bytes;
};
const registryPath='content/english/media/media-registry.json';
const registry=JSON.parse((await verified(registryPath)).toString('utf8'));
assert(Array.isArray(registry.entries));
const indexed=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
assert.equal(indexed.size,registry.entries.length,'DUPLICATED_MEDIA_ID');
const usages=new Map(),questions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),p='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const doc=JSON.parse((await verified(p)).toString('utf8'));
 assert.equal(doc.moduleId,'Y'+y+'M'+mm);
 assert.equal(doc.items?.length,20);
 for(const item of doc.items){
   if(questions.has(item.item_id))throw Error('DUPLICATED_QUESTION');
   questions.set(item.item_id,item);
   collectQuestionMediaUsages(item,usages);
 }
}
assert.equal(questions.size,600);
const report={schemaVersion:'DUDUQ_ASSETS_SAFE_PREVIEW_BATCH_A_V1',sourceRepo:catalogue.sourceRepository,
 sourceCommit:catalogue.sourceCommit,scopes:['Y1M02','Y1M03','Y1M06'],auditedQuestions:questions.size,
 baselineManifestSha256:originalHash,humanVisualReview:'PENDING',pedagogicalQaApproved:false,
 officialProductionChanged:false,temporaryCandidateOnly:true,assetResults:[],replaced:[],skipped:[]};
const stagedFiles=new Map(),replacement=new Map();
for(const asset of catalogue.assets){
 if(!report.scopes.includes(asset.moduleId))throw Error('UNEXPECTED_MODULE_SCOPE:'+asset.moduleId);
 if(!/^[a-z]+(?: [a-z]+)*$/.test(asset.concept))throw Error('UNSAFE_CONCEPT:'+asset.concept);
 if(!/^[a-z0-9 -]+\.png$/.test(asset.file))throw Error('UNSAFE_ASSET_FILENAME:'+asset.file);
 const file=path.join(SOURCE,'Imagens Ilustrativa',asset.file);
 const bytes=await readFile(file);
 assert.equal(gitBlob(bytes),asset.gitBlob,'SOURCE_GIT_BLOB_MISMATCH:'+asset.file);
 const dimensions=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];
 const info=inspectPng(bytes);
 if(!info.valid||!info.transparent||dimensions.some(n=>n<900)||bytes[24]!==8||bytes[25]!==6){
   report.assetResults.push({moduleId:asset.moduleId,concept:asset.concept,file:asset.file,status:'SKIPPED_QC',reason:info.reason||'NEED_RGBA_TRANSPARENCY'});
   continue;
 }
 const digest=sha(bytes);
 const relative='content/english/assets/images/assets-duduq-review/'+asset.moduleId.toLowerCase()+'-'+asset.concept.replaceAll(' ','-')+'-'+digest.slice(0,12)+'.png';
 let selected=0;
 for(const [mediaId,entries] of usages){
   if(!entries.some(x=>x.moduleId===asset.moduleId))continue;
   if(entries.some(x=>x.moduleId!==asset.moduleId||!isExactPedagogicalConcept(x.semanticTarget,asset.concept)))continue;
   const questionId=entries[0].questionId;
   if(!questions.has(questionId))throw Error('NONEXISTENT_BINDING_QUESTION');
   try{assertBindingSafeAcrossQuestions({usages,mediaId,questionId,semanticTarget:asset.concept});}
   catch(e){report.skipped.push({mediaId,concept:asset.concept,reason:String(e.message).slice(0,130)});continue;}
   const i=indexed.get(mediaId),old=registry.entries[i];
   if(!old||old.kind!=='image'||old.temporary!==true){report.skipped.push({mediaId,reason:'NOT_A_PROVISIONAL_IMAGE'});continue;}
   if(replacement.has(mediaId))throw Error('MULTIPLE_IMAGES_FOR_SAME_MEDIA_ID:'+mediaId);
   replacement.set(mediaId,{mediaId,questionId,old,i,asset,bytes,digest,relative});
   selected++;
 }
 if(selected)stagedFiles.set(relative,bytes);
 report.assetResults.push({moduleId:asset.moduleId,concept:asset.concept,file:asset.file,status:selected?'MAPPED_CANDIDATE':'NO_EXACT_SAFE_BINDING',sha256:digest,bindings:selected});
}
report.assetsUsed=stagedFiles.size;
report.bindingsUpdated=replacement.size;
report.modules=Object.fromEntries(report.scopes.map(m=>[m,[...replacement.values()].filter(r=>r.asset.moduleId===m).length]));
if(!replacement.size)throw Error('NO_EXACT_CANDIDATE_BINDINGS');
if(APPLY){
 for(const v of replacement.values()){
   const entry={...v.old,status:'APPROVED',temporary:true,kind:'image',
    integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
    humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',
    urlOrPath:v.relative,sha256:v.digest,assets:[{path:v.relative,sha256:v.digest}],
    altText:v.asset.concept,provenance:{provider:'Existing Assets-DuduQ',
      sourceRepository:report.sourceRepo,sourceCommit:report.sourceCommit,
      sourcePath:'Imagens Ilustrativa/'+v.asset.file,
      sourceGitBlob:v.asset.gitBlob,sha256:v.digest},
    replacementAudit:{questionId:v.questionId,previousPath:v.old.urlOrPath||null,scope:v.asset.moduleId,previewOnly:true}};
   registry.entries[v.i]=entry;
   report.replaced.push({moduleId:v.asset.moduleId,questionId:v.questionId,mediaId:v.mediaId,
     concept:v.asset.concept,previousPath:v.old.urlOrPath||null,path:v.relative,sha256:v.digest});
 }
 for(const [p,bytes] of stagedFiles){
   const out=path.join(DIST,p);
   await mkdir(path.dirname(out),{recursive:true});
   try{const existing=await readFile(out);if(sha(existing)!==sha(bytes))throw Error('EXISTING_IMAGE_CONFLICT:'+p);}
   catch(e){if(e.code==='ENOENT')await writeFile(out,bytes);else throw e;}
   manifest.set(p,sha(bytes));
 }
 const updatedRegistry=Buffer.from(JSON.stringify(registry,null,2)+'\n');
 await writeFile(path.join(DIST,registryPath),updatedRegistry);
 manifest.set(registryPath,sha(updatedRegistry));
 const newManifest=[...manifest].map(([p,d])=>p+' '+d).join('\n')+'\n';
 await writeFile(manifestPath,newManifest);
 for(const [p,d] of manifest){
   if(sha(await readFile(path.join(DIST,p)))!==d)throw Error('FINAL_INTEGRITY_MISMATCH:'+p);
 }
 report.finalManifestSha256=sha(Buffer.from(newManifest));
 report.manifestEntriesVerified=manifest.size;
}
report.status=APPLY?'CANDIDATE_PREVIEW_PATCHED_AND_HASH_VERIFIED':'DRY_RUN_SAFE_MATCHES';
await mkdir('qa/results',{recursive:true});
await writeFile(OUTPUT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,assets:report.assetsUsed,bindings:report.bindingsUpdated,modules:report.modules,report:OUTPUT,pedagogicalQA:'PENDING',production:'UNTOUCHED'}));
