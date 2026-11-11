#!/usr/bin/env node
/**
 * DUDUQ English: integrate ONLY the 60 verified provisional-media IDs into an
 * isolated compiled QA candidate. No source, Gold Master, audio, answer or release writes.
 *
 * Run after the pinned official build:
 * DUDUQ_QA_ONLY=1 DUDUQ_VISUAL_REVIEW=1 node qa/phase2-last60-candidate.mjs --preview
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
assert(process.argv.includes('--preview')&&!process.argv.includes('--release'),'PREVIEW_ONLY_RELEASE_FORBIDDEN');

const plan=JSON.parse(readFileSync('qa/plans/last60-official-assets-20261110.json','utf8'));
const tree=JSON.parse(readFileSync('qa/fixtures/source-tree-617-20261110.json','utf8'));
const root=path.resolve('dist-pages');
const registryRel='content/english/media/media-registry.json';
const manifestRel='.duduq-pages-manifest';
const registryFile=path.join(root,registryRel);
const manifestFile=path.join(root,manifestRel);
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const isSafe=s=>typeof s==='string'&&!s.startsWith('/')&&!s.includes('\\')&&s.split('/').every(x=>x&&x!=='.'&&x!=='..');
assert.equal(plan.schema,'DUDUQ_LAST60_MEDIA_REVIEW_PLAN_V1');
assert.equal(plan.mode,'ISOLATED_QA_ONLY');
assert.equal(tree.sha,plan.sourceCommit);
assert.equal(tree.truncated,false);
const files=tree.tree.filter(x=>x.type==='blob'&&x.path.startsWith('Imagens Ilustrativa/')&&/\.png$/i.test(x.path));
assert.equal(files.length,617,'SOURCE_PNG_INVENTORY_NOT_617');
const fileTree=new Map(tree.tree.map(x=>[x.path,x]));
assert.equal(plan.assignments.length,60);
assert.equal(new Set(plan.assignments.map(x=>x.mediaId)).size,60);
assert.equal(new Set(plan.assignments.map(x=>x.semantic)).size,25);
const bytesBefore=readFileSync(registryFile);
assert.equal(hash(bytesBefore),plan.baseRegistrySha256,'PRODUCTION_BASE_REGISTRY_SHA_DRIFT');
const registry=JSON.parse(bytesBefore);
assert.equal(registry.entries.length,1166,'MEDIA_ENTRY_COUNT_CHANGED');
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,1166,'DUPLICATE_MEDIA_ID');
const originalTemporary=registry.entries.filter(x=>/\.svg$/i.test(x.urlOrPath||''));
assert.equal(originalTemporary.length,60,'LAST_60_EXPECTATION_CHANGED');
const originalIds=new Set(originalTemporary.map(x=>x.mediaId));
const targets=new Set(plan.assignments.map(x=>x.mediaId));
assert.deepEqual([...targets].sort(),[...originalIds].sort(),'PLAN_NOT_EXACTLY_CURRENT_60');
for(const x of plan.assignments){
 assert(isSafe('Imagens Ilustrativa/'+x.filename),'BAD_SOURCE_PATH:'+x.filename);
 const f=fileTree.get('Imagens Ilustrativa/'+x.filename);
 assert(f?.type==='blob','PNG_NOT_IN_PINNED_SOURCE:'+x.filename);
 assert.equal(f.sha,x.blobSha,'SOURCE_BLOB_CHANGED:'+x.filename);
 assert.equal(f.size,x.bytes,'SOURCE_SIZE_CHANGED:'+x.filename);
 const e=byId.get(x.mediaId);
 assert(e,'MISSING_MEDIA_ID:'+x.mediaId);
 assert.equal(e.kind,'image','NOT_AN_IMAGE:'+x.mediaId);
 assert.equal(e.semantic,x.semantic,'SEMANTIC_CONFLICT:'+x.mediaId);
 assert(/\.svg$/i.test(e.urlOrPath||''),'NOT_PROVISIONAL_SVG:'+x.mediaId);
 assert(!e.provenance,'PUBLISHED_IMAGE_MUST_NOT_BE_OVERWRITTEN:'+x.mediaId);
}
const manifestLines=readFileSync(manifestFile,'utf8').trimEnd().split(/\r?\n/);
const manifest=new Map();
manifestLines.forEach((line,index)=>{
 const i=line.lastIndexOf(' '),rel=line.slice(0,i),digest=line.slice(i+1);
 assert(i>0&&isSafe(rel)&&/^[a-f0-9]{64}$/.test(digest)&&!manifest.has(rel),'BAD_BASE_MANIFEST:'+rel);
 manifest.set(rel,{index,digest});
});
assert.equal(manifest.get(registryRel)?.digest,plan.baseRegistrySha256);
assert(manifestLines.length>2700,'INCOMPLETE_DISTRIBUTION');
const oldByBlob=new Map();
for(const e of registry.entries){
 const blob=e.provenance?.sourceGitBlob;
 if(blob&&e.urlOrPath?.endsWith('.png')&&e.sha256){
  const prior=oldByBlob.get(blob);
  if(prior)assert.equal(prior.sha256,e.sha256,'SAME_BLOB_DIFFERENT_SHA');
  else oldByBlob.set(blob,{url:e.urlOrPath,sha256:e.sha256});
 }
}
const unique=new Map();
for(const a of plan.assignments){
 const group=unique.get(a.blobSha)||{blobSha:a.blobSha,filename:a.filename,semantic:a.semantic,mediaIds:[]};
 assert.equal(group.filename,a.filename,'SAME_BLOB_WITH_UNEXPECTED_ALIAS');
 group.mediaIds.push(a.mediaId);unique.set(a.blobSha,group);
}
const results=new Map(),queue=[...unique.values()],actualImages=[];
async function download(part){
 const old=oldByBlob.get(part.blobSha);
 let bytes,rel,reused=false;
 if(old){
  assert.equal(manifest.get(old.url)?.digest,old.sha256,'REUSED_SOURCE_NOT_MANIFESTED');
  bytes=readFileSync(path.join(root,old.url));
  assert.equal(hash(bytes),old.sha256,'REUSED_SOURCE_BYTES_DRIFT');
  rel=old.url;reused=true;
 }else{
  const url='https://raw.githubusercontent.com/'+plan.sourceRepo+'/'+plan.sourceCommit+
   '/Imagens%20Ilustrativa/'+encodeURIComponent(part.filename);
  let response;
  for(let t=1;t<=4;t++){
   try{
    response=await fetch(url,{signal:AbortSignal.timeout(120000)});
    if(response.ok)break;
   }catch(e){if(t===4)throw e;}
   assert(t<4,'PNG_FETCH_FAILED:'+part.filename+':HTTP_'+response?.status);
   await new Promise(r=>setTimeout(r,700*t));
  }
  bytes=Buffer.from(await response.arrayBuffer());
 }
 assert.equal(gitHash(bytes),part.blobSha,'GIT_BLOB_SHA_MISMATCH:'+part.filename);
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG:'+part.filename);
 assert(bytes.length>=40,'TRUNCATED_PNG');
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=512&&height>=512,'PNG_RESOLUTION_TOO_LOW:'+part.filename);
 assert.equal(bytes[25],6,'NO_TRUE_ALPHA_CHANNEL:'+part.filename);
 const sha256=hash(bytes);
 if(!reused){
  rel='content/english/assets/images/assets-duduq/fast-'+part.blobSha.slice(0,12)+'-'+sha256.slice(0,12)+'.png';
  assert(isSafe(rel));
  assert(!manifest.has(rel)&&!existsSync(path.join(root,rel)),'SOURCE_PATH_ALREADY_EXISTS:'+rel);
  mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});
  writeFileSync(path.join(root,rel),bytes,{flag:'wx'});
  manifestLines.push(rel+' '+sha256);
  manifest.set(rel,{index:manifestLines.length-1,digest:sha256});
 }
 const detail={filename:part.filename,sourceGitBlob:part.blobSha,sha256,width,height,url:rel,reused,mediaIds:part.mediaIds,semantic:part.semantic};
 actualImages.push(detail);results.set(part.blobSha,detail);
}
async function worker(){while(queue.length){const part=queue.shift();await download(part);}}
await Promise.all(Array.from({length:4},()=>worker()));
assert.equal(results.size,unique.size,'SOME_PNG_NOT_FETCHED');
const activeQuestionIds=new Map(),originalQuestionHashes=new Map(),questionData=[];
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mod='Y'+y+'M'+String(m).padStart(2,'0');
 const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const bytes=readFileSync(path.join(root,rel)),digest=hash(bytes);
 assert.equal(manifest.get(rel)?.digest,digest,'QUESTION_CONTRACT_BYTES_CHANGED:'+rel);
 originalQuestionHashes.set(rel,digest);
 const data=JSON.parse(bytes);
 assert.equal(data.moduleId,mod,'MODULE_ID_CHANGED:'+mod);
 assert.equal(data.items?.length,20,'QUESTION_COUNT_CHANGED:'+mod);
 for(const item of data.items){
  assert(typeof item.item_id==='string','QUESTION_ID_MISSING');
  questionData.push(item);
 }
}
assert.equal(questionData.length,600,'NOT_600_QUESTIONS');
for(const a of plan.assignments){
 const entry=byId.get(a.mediaId),part=results.get(a.blobSha);
 const prev=entry.urlOrPath;
 entry.urlOrPath=part.url;
 entry.sha256=part.sha256;
 entry.assets=[{path:part.url,sha256:part.sha256}];
 entry.temporary=true;
 entry.integrationStatus='LAST60_EXACT_SOURCE_QA_PREVIEW';
 entry.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
 entry.provenance={provider:'Assets-DuduQ',sourcePath:'Imagens Ilustrativa/'+a.filename,sourceCommit:plan.sourceCommit,sourceGitBlob:a.blobSha,sha256:part.sha256};
 entry.replacementAudit={qaOnly:true,previousPath:prev,mediaId:a.mediaId,concept:a.semantic,reviewStatus:a.reviewStatus,pedagogicalRisk:a.pedagogicalRisk};
}
function collect(obj,out){
 if(!obj||typeof obj!=='object')return;
 if(Array.isArray(obj)){for(const e of obj)collect(e,out);return;}
 for(const k of ['assetId','mediaId','image_ref','imageRef'])if(typeof obj[k]==='string'&&byId.has(obj[k]))out.add(obj[k]);
 for(const val of Object.values(obj))if(val&&typeof val==='object')collect(val,out);
}
const imageById=new Map(plan.assignments.map(a=>[a.mediaId,results.get(a.blobSha)]));
for(const item of questionData){
 const ids=new Set();collect(item,ids);
 for(const id of ids)if(targets.has(id)){
  if(!activeQuestionIds.has(id))activeQuestionIds.set(id,[]);
  activeQuestionIds.get(id).push(item.item_id);
 }
 // Only if explicit option roles can be identified, reject a reused binary
 // across opposing correct/distractor roles. Never infer missing answer labels.
 const choices=[];
 function findChoices(v){
  if(!v||typeof v!=='object')return;
  if(Array.isArray(v)){for(const o of v)findChoices(o);return;}
  const id=v.mediaId||v.assetId||v.media?.assetId||v.media?.mediaId;
  let correct=typeof v.correct==='boolean'?v.correct:typeof v.isCorrect==='boolean'?v.isCorrect:null;
  const role=v.media?.role||v.role||'';
  if(correct===null&&/^CORRECT/i.test(role))correct=true;
  if(correct===null&&/^(DISTRACTOR|INCORRECT)/i.test(role))correct=false;
  if(typeof id==='string'&&correct!==null&&byId.has(id)){
   choices.push({id,correct,sha:byId.get(id)?.sha256});
  }
  for(const o of Object.values(v))if(o&&typeof o==='object')findChoices(o);
 }
 findChoices(item);
 for(let a=0;a<choices.length;a++)for(let b=a+1;b<choices.length;b++){
  const x=choices[a],z=choices[b];
  if(x.id!==z.id&&x.sha&&x.sha===z.sha&&x.correct!==z.correct&&
   (targets.has(x.id)||targets.has(z.id)))
   throw Error('CORRECT_DISTRACTOR_SAME_PNG:'+item.item_id+':'+x.id+':'+z.id);
 }
}
assert.equal(registry.entries.length,1166);
assert.equal(registry.entries.filter(e=>/\.svg$/i.test(e.urlOrPath||'')).length,0,'NEW_REGISTRY_STILL_HAS_SVG');
const registryNext=Buffer.from(JSON.stringify(registry,null,2)+'\n','utf8');
const nextSha=hash(registryNext);
manifestLines[manifest.get(registryRel).index]=registryRel+' '+nextSha;
writeFileSync(registryFile,registryNext);
writeFileSync(manifestFile,manifestLines.join('\n')+'\n');
assert.equal(hash(readFileSync(registryFile)),nextSha);
for(const [rel,digest]of originalQuestionHashes)assert.equal(hash(readFileSync(path.join(root,rel))),digest,'QUESTION_BYTES_CHANGED:'+rel);
for(const img of actualImages)assert.equal(hash(readFileSync(path.join(root,img.url))),img.sha256,'OUTPUT_PNG_HASH_MISMATCH:'+img.filename);
const review=plan.assignments.map(a=>({mediaId:a.mediaId,semantic:a.semantic,filename:a.filename,sourceGitBlob:a.blobSha,
 url:imageById.get(a.mediaId).url,sha256:imageById.get(a.mediaId).sha256,
 referencedQuestions:activeQuestionIds.get(a.mediaId)||[],risk:a.pedagogicalRisk,visualReview:false,pedagogicalApproval:false}));
const report={schema:'DUDUQ_LAST60_STAGING_QA_V1',date:'2026-11-10',
 baseDeploymentId:plan.productionDeploymentId,sourceCommit:plan.sourceCommit,
 previousRegistrySha256:plan.baseRegistrySha256,previewRegistrySha256:nextSha,
 mediaIdsUpdated:review.length,uniqueSourcePngs:unique.size,
 pngsAdded:actualImages.filter(x=>!x.reused).length,pngsReused:actualImages.filter(x=>x.reused).length,
 affectedQuestions:[...new Set([...activeQuestionIds.values()].flat())].sort(),
 unusedTargetIds:[...targets].filter(id=>!activeQuestionIds.has(id)).sort(),
 contracts:600,modules:30,sourcePngs:617,provisionalSvgLinksInCandidate:0,
 qaOnly:true,visualQaApproved:false,pedagogicalQaApproved:false,
 releaseApproved:false,productionDeployed:false,
 changes:{authoredQuestionFiles:0,gabaritos:0,audio:0,goldMasters:0,runtime:0},
 images:actualImages,bindings:review};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/last60-candidate-20261110.json',JSON.stringify(report,null,2)+'\n');
const gallery=path.join(root,'media-review');mkdirSync(gallery,{recursive:true});
writeFileSync(path.join(gallery,'last60-candidate-20261110.json'),JSON.stringify(report,null,2)+'\n');
const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=review.map(r=>'<article><img loading="lazy" src="/'+esc(r.url)+'" alt="'+esc(r.semantic)+'"><strong>'+esc(r.semantic)+'</strong><small>'+esc(r.mediaId)+'</small><small>'+esc(r.filename)+'</small><em>REVISÃO PEDAGÓGICA PENDENTE</em></article>').join('');
const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ Last 60 — QA</title>'+
'<style>body{font:16px system-ui;background:#f5f7ff;color:#1d3158;margin:0;padding:24px}main{max-width:1380px;margin:auto}h1{font-size:1.8rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:16px}article{display:grid;gap:8px;background:white;padding:14px;border-radius:16px;box-shadow:0 4px 18px #1d315819}img{width:100%;height:180px;object-fit:contain}small{font-size:.74rem;overflow-wrap:anywhere}em{font-size:.7rem;color:#a35f00}</style><main><h1>DUDUQ English | Prévia isolada das 60 imagens</h1><p>60 vínculos, '+unique.size+' PNGs distintos, 600 questões preservadas. Prévia NÃO homologada; NÃO publicar sem avaliação.</p><div class="grid">'+cards+'</div></main></html>';
writeFileSync(path.join(gallery,'last60-candidate-20261110.html'),html);
console.log('LAST60_PREVIEW_CANDIDATE_CREATED='+JSON.stringify({mediaIds:60,pngs:unique.size,affectedQuestions:report.affectedQuestions.length,
 unused:report.unusedTargetIds,added:report.pngsAdded,reused:report.pngsReused,
 contracts:600,modules:30,registrySha256:nextSha,previewOnly:true,productionDeployed:false}));
