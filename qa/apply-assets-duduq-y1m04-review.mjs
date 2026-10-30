#!/usr/bin/env node
/**
 * DUDUQ: candidate-only reuse of visually reviewed Assets-DuduQ school items.
 * Patches only a disposable V26 dist-pages QA artifact. Never modifies source,
 * source assets, current production, Gold Masters, questions or answer keys.
 *
 * Run on GitHub Actions AFTER checkout of pinned Assets-DuduQ source:
 *   node qa/apply-assets-duduq-y1m04-review.mjs source-assets
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,stat} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {inspectPng} from '../scripts/duduq-image-pipeline.mjs';
import {collectQuestionMediaUsages,assertBindingSafeAcrossQuestions} from './media-binding-usage-guard.mjs';
import {isExactPedagogicalConcept} from '../scripts/duduq-exact-semantic-match.mjs';

const ROOT=process.cwd();
const SOURCE=path.resolve(process.argv[2]||'source-assets');
const DIST=path.resolve(ROOT,'dist-pages');
const SOURCE_COMMIT='658d94f08031820cfea5258a6f4e7c24f278df92';
const REPORT='qa/results/assets-duduq-y1m04-review.json';
const ASSETS=[
 {concept:'backpack',filename:'school-object-backpack-mochila.png',gitBlob:'f2f4ac58d70b8f25877e2fa3249a3bbc981e6da4'},
 {concept:'eraser',filename:'school-object-eraser-borracha.png',gitBlob:'334a1fecdf362c6a19d50edb0ccc50db68606cb9'},
 {concept:'pencil',filename:'school-object-pencil-lapis.png',gitBlob:'37a383e05c3c1bff123818b171c3bb9dc4a33c11'},
 {concept:'ruler',filename:'school-object-ruler-regua.png',gitBlob:'2276abbd4f90caf142df84062c86d770ba394399'},
 {concept:'pen',filename:'school-object-blue-pen-caneta-azul.png',gitBlob:'a16e625f8f4d6e45e77542065946f81c69ac9e52'},
 {concept:'crayon',filename:'school-object-orange-crayon-giz-laranja.png',gitBlob:'766e48fd1a750a0ceb723a4333e1515456a8d1f7'}
];
const sha=b=>createHash('sha256').update(b).digest('hex');
const blobSha=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const inside=(base,p)=>p.startsWith(base+path.sep);
const readJson=async file=>JSON.parse(await readFile(file,'utf8'));
if(!inside(ROOT,DIST)||!inside(ROOT,SOURCE)||SOURCE===DIST)throw Error('QA_WORKTREE_BOUNDARY');
const currentSourceCommit=(await readFile(path.join(SOURCE,'.git-source-commit'),'utf8')).trim();
assert.equal(currentSourceCommit,SOURCE_COMMIT,'UNPINNED_SOURCE_COMMIT');
const manifestPath=path.join(DIST,'.duduq-pages-manifest');
const originalManifest=await readFile(manifestPath,'utf8');
const integrity=new Map();
for(const line of originalManifest.trimEnd().split(/\r?\n/)){
 const match=/^(.*) ([0-9a-f]{64})$/.exec(line);
 if(!match||integrity.has(match[1]))throw Error('INVALID_OR_DUPLICATED_MANIFEST_ENTRY:'+line);
 integrity.set(match[1],match[2]);
}
const verifiedRead=async rel=>{
 if(!integrity.has(rel))throw Error('MISSING_IMMUTABLE_PATH:'+rel);
 const bytes=await readFile(path.join(DIST,rel));
 if(sha(bytes)!==integrity.get(rel))throw Error('IMMUTABLE_SOURCE_HASH_MISMATCH:'+rel);
 return bytes;
};
const registryRel='content/english/media/media-registry.json';
const registry=JSON.parse((await verifiedRead(registryRel)).toString('utf8'));
if(!Array.isArray(registry.entries))throw Error('INVALID_REGISTRY');
const index=new Map(registry.entries.map((e,i)=>[e.mediaId,i]));
const usages=new Map(),questions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0'),rel='content/english/year-'+y+'/module-'+mm+'/questions.json';
 const doc=JSON.parse((await verifiedRead(rel)).toString('utf8'));
 if(doc.moduleId!=='Y'+y+'M'+mm||doc.items?.length!==20)throw Error('INVALID_30x600_QUESTION_CONTRACT:'+rel);
 for(const q of doc.items){if(questions.has(q.item_id))throw Error('DUPLICATE_QUESTION_ID');questions.set(q.item_id,q);collectQuestionMediaUsages(q,usages);}
}
assert.equal(questions.size,600);
const reviewed=await readJson('qa/media-candidates/y1m04-official-20261030/batch-manifest.json');
if(reviewed.moduleId!=='Y1M04')throw Error('WRONG_MODULE_MANIFEST');
const result={schemaVersion:'DUDUQ_ASSETS_REUSE_PREVIEW_V1',sourceRepo:'augustoborgessousa93/Assets-DuduQ',
 sourceCommit:SOURCE_COMMIT,moduleId:'Y1M04',immutableQuestionContracts:600,
 visualReview:'PREVIOUSLY_VIEWED_CANDIDATES_NOT_HUMAN_APPROVED',candidateOnly:true,
 officialMedia:false,pedagogicalQaApproved:false,productionPublished:false,accepted:[],skipped:[]};
const actions=[],outFiles=new Map(),byId=new Map();
for(const asset of ASSETS){
 const assetRel='Imagens Ilustrativa/'+asset.filename;
 const sourceFile=path.resolve(SOURCE,assetRel);
 if(!inside(SOURCE,sourceFile))throw Error('SOURCE_ESCAPE');
 const bytes=await readFile(sourceFile);
 assert.equal(blobSha(bytes),asset.gitBlob,'GIT_BLOB_SHA_MISMATCH:'+asset.filename);
 const info=inspectPng(bytes);
 if(!info.valid||!info.transparent||bytes.readUInt32BE(16)<1024||bytes.readUInt32BE(20)<1024||
 bytes[24]!==8||bytes[25]!==6)throw Error('REUSED_PNG_INVALID:'+asset.filename+':'+info.reason);
 const original=reviewed.assets.find(x=>x.semanticTarget===asset.concept&&x.bindings?.length);
 if(!original)throw Error('UNSUPPORTED_REVIEWED_CONCEPT:'+asset.concept);
 const digest=sha(bytes);
 const dest='content/english/assets/images/assets-duduq-review/y1m04-'+asset.concept+'-'+digest.slice(0,12)+'.png';
 outFiles.set(dest,bytes);
 let accepted=0;
 for(const b of original.bindings){
  const id=b.mediaId,qid=b.questionId;
  if(!qid.startsWith('Y1M04-')||!questions.has(qid)){result.skipped.push({id,reason:'NOT_Y1M04_VERIFIED_QUESTION'});continue;}
  const records=usages.get(id)||[];
  if(!records.some(x=>x.questionId===qid)||records.some(x=>!isExactPedagogicalConcept(x.semanticTarget,asset.concept))){
   result.skipped.push({id,reason:'NONEXACT_SEMANTIC_OR_SHARED_ID'});continue;
  }
  try{assertBindingSafeAcrossQuestions({usages,mediaId:id,questionId:qid,semanticTarget:asset.concept});}
  catch(e){result.skipped.push({id,reason:'SEMANTIC_GUARD:'+String(e.message).slice(0,140)});continue;}
  if(byId.has(id)){if(byId.get(id)!==digest)throw Error('CONFLICTING_ID_ASSIGNMENT:'+id);continue;}
  const prior=index.has(id)?registry.entries[index.get(id)]:null;
  if(!prior||prior.kind!=='image'||prior.temporary!==true){
   result.skipped.push({id,reason:'NOT_AN_EXISTING_PROVISIONAL_IMAGE'});continue;
  }
  byId.set(id,digest);
  actions.push({asset,id,qid,digest,dest,prior,bytes});
  accepted++;
 }
 if(accepted===0)outFiles.delete(dest);
}
if(!actions.length)throw Error('NO_SAFE_REUSED_BINDINGS');
const touched=new Set();
for(const action of actions){
 const {id,qid,asset,dest,digest,prior}=action;
 if(touched.has(id))throw Error('DUPLICATE_DESTINATION_ID:'+id);
 touched.add(id);
 const next={...prior,status:'APPROVED',temporary:true,kind:'image',
  integrationStatus:'CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING',
  humanResolutionStatus:'PEDAGOGICAL_QA_PENDING',altText:asset.concept,
  urlOrPath:dest,sha256:digest,assets:[{path:dest,sha256:digest}],
  provenance:{provider:'Assets-DuduQ (existing original image)',sourceRepository:result.sourceRepo,
   sourceCommit:SOURCE_COMMIT,sourcePath:'Imagens Ilustrativa/'+asset.filename,
   sourceGitBlob:asset.gitBlob,sha256:digest},
  replacementAudit:{questionId:qid,previousPath:prior.urlOrPath??null,previewOnly:true}};
 registry.entries[index.get(id)]=next;
 result.accepted.push({questionId:qid,mediaId:id,concept:asset.concept,origin:asset.filename,
  sourceGitBlob:asset.gitBlob,sha256:digest,destination:dest});
}
for(const [rel,bytes] of outFiles){
 const dest=path.join(DIST,rel);
 await mkdir(path.dirname(dest),{recursive:true});
 try{const old=await readFile(dest);if(sha(old)!==sha(bytes))throw Error('PREEXISTING_IMAGE_HASH_CONFLICT:'+rel);}
 catch(e){if(e.code==='ENOENT')await writeFile(dest,bytes);else throw e;}
 integrity.set(rel,sha(bytes));
}
const registryBytes=Buffer.from(JSON.stringify(registry,null,2)+'\n');
await writeFile(path.join(DIST,registryRel),registryBytes);
integrity.set(registryRel,sha(registryBytes));
const nextManifest=[...integrity].map(([p,h])=>p+' '+h).join('\n')+'\n';
await writeFile(manifestPath,nextManifest);
for(const [rel,checksum] of integrity)if(sha(await readFile(path.join(DIST,rel)))!==checksum)
 throw Error('COMPILED_ARTIFACT_HASH_MISMATCH:'+rel);
result.uniquePngs=outFiles.size;
result.bindingsUpdated=actions.length;
result.manifestSha256=sha(Buffer.from(nextManifest));
result.filesVerified=integrity.size;
await mkdir(path.dirname(REPORT),{recursive:true});
await writeFile(REPORT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:'CANDIDATE_PREVIEW_PATCHED',pngs:result.uniquePngs,
 bindings:result.bindingsUpdated,skipped:result.skipped.length,manifest:result.manifestSha256,
 report:REPORT,notProduction:true}));
