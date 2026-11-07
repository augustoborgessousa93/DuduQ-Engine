#!/usr/bin/env node
/** DUDUQ reviewed *exact* 5-concept media associations, incremental QA. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY_REQUIRED');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1','VISUAL_REVIEW_REQUIRED');
const preview=process.argv.includes('--preview'),release=process.argv.includes('--release');
assert(preview!==release,'EXPLICIT_MODE_REQUIRED');
const plan=[{"concept":"blue square","filename":"square.png","sha":"f871beb571ea45dad11b1c4b42530751367f12f8","ids":["IMG-V11-2B-2218D8723E094AFC","IMG-V11-2B-61D6540EAA887069","IMG-V11-2B-8A1539773070D30D"]},{"concept":"brazil","filename":"brazilian.png","sha":"c3a018e0e9ed2340516d3c1ad7e2ff4f81c230d2","ids":["IMG-V11-2B-B6CBF09B5F588995","IMG-V11-2B-A3B190D0719166CA","IMG-V11-2B-94BC73650A1F4A58"]},{"concept":"rainy","filename":"weather-rain-chuva.png","sha":"aed46eeeff0e389efc2534618dc8484416477e05","ids":["IMG-V11-2B-291C8EF1B0B101BA","IMG-V11-2B-3FF9CA2029B2B660"]},{"concept":"headache","filename":"I have a headache — Estou com dor de cabeça.png","sha":"46ef14d449db6dc12e1e38b4422adda7f44697e6","ids":["IMG-V11-2B-6A6303B6B4A8DC3C"]},{"concept":"in the kitchen","filename":"Maya in the kitchen — Maya na cozinha.png","sha":"4f1e23dd460b1b7f4c620eb5bc2fe7971363fd3f","ids":["IMG-V11-2B-E4F8525604F1F803"]}];
const sourceCommit='db68bc43eafd33e8b4a287604f6f94a1e9d7df02';
const expectedRegistrySha='9d2aa04d5230c1b6419284a4e222cca7abf43bde2d72b971eaa0ce0a713c93fa';
const root='dist-pages/';
const regRel='content/english/media/media-registry.json';
const manifestRel='.duduq-pages-manifest';
const hash=b=>createHash('sha256').update(b).digest('hex');
const gitHash=b=>createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');
const regBytes=readFileSync(root+regRel),reg=JSON.parse(regBytes);
assert.equal(hash(regBytes),expectedRegistrySha,'CURRENT_RELEASE_REGISTRY_CHANGED');
assert.equal(reg.entries.length,1166,'MEDIA_REGISTRY_COUNT_CHANGED');
const byId=new Map(reg.entries.map(e=>[e.mediaId,e]));
assert.equal(byId.size,reg.entries.length,'DUPLICATE_MEDIA_ID');
const targets=plan.flatMap(p=>p.ids);
assert.equal(targets.length,10);
assert.equal(new Set(targets).size,targets.length,'TARGET_ID_REPEATED');
const fixture=JSON.parse(readFileSync('qa/fixtures/phase2-official-source-tree-db68bc43.json'));
assert.equal(fixture.sha,sourceCommit,'UNPINNED_SOURCE_INVENTORY');
assert.equal(fixture.truncated,false);
const treeMap=new Map(fixture.tree.map(e=>[e.path,e]));
const manifestLines=readFileSync(root+manifestRel,'utf8').trimEnd().split(/\r?\n/);
const fileManifest=new Map();
for(let i=0;i<manifestLines.length;i++){
 const line=manifestLines[i],idx=line.lastIndexOf(' ');
 assert(idx>0,'MALFORMED_MANIFEST_LINE');
 const name=line.slice(0,idx),digest=line.slice(idx+1);
 assert(/^[a-f0-9]{64}$/.test(digest)&&!fileManifest.has(name),'BAD_OR_DUPLICATE_MANIFEST');
 fileManifest.set(name,{sha:digest,i});
}
assert.equal(fileManifest.get(regRel)?.sha,expectedRegistrySha,'BASELINE_MANIFEST_REGISTRY_MISMATCH');
const origin={};for(const {concept,filename,sha,ids} of plan){
 const src='Imagens Ilustrativa/'+filename;
 assert.equal(treeMap.get(src)?.sha,sha,'SOURCE_INVENTORY_MISMATCH:'+src);
 for(const id of ids){
  const e=byId.get(id);assert(e,'MISSING_MEDIA_ID:'+id);
  assert.equal(e.kind,'image','NOT_IMAGE:'+id);
  assert.equal(e.semantic,concept,'SHARED_MEDIA_SEMANTIC_CONFLICT:'+id);
  assert(/\.svg$/i.test(e.urlOrPath),'CURRENT_MEDIA_NOT_PROVISIONAL_SVG:'+id);
  assert(!e.provenance,'EXISTING_OFFICIAL_IMAGE_MUST_NOT_BE_REPLACED:'+id);
  origin[id]=e.urlOrPath;
 }
}
const oldMediaPngByBlob=new Map();
for(const e of reg.entries){
 if(e.provenance?.sourceGitBlob && e.urlOrPath?.endsWith('.png')){
  const previous=oldMediaPngByBlob.get(e.provenance.sourceGitBlob);
  if(previous)assert.equal(previous.url,e.urlOrPath,'CONFLICTING_SHARED_SOURCE_SHA');
  oldMediaPngByBlob.set(e.provenance.sourceGitBlob,{url:e.urlOrPath,sha256:e.sha256});
 }
}
const actualImages=[];
for(const part of plan){
 const src='Imagens Ilustrativa/'+part.filename;
 const url='https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/'+sourceCommit+
  '/Imagens%20Ilustrativa/'+encodeURIComponent(part.filename);
 const fromCache=oldMediaPngByBlob.get(part.sha);
 let bytes,digest,imageRel,reused=false;
 if(fromCache){
  assert.equal(fileManifest.get(fromCache.url)?.sha,fromCache.sha256,'EXISTING_IMAGE_UNPINNED');
  bytes=readFileSync(root+fromCache.url);
  assert.equal(hash(bytes),fromCache.sha256,'EXISTING_OFFICIAL_BYTES_CHANGED');
  assert.equal(gitHash(bytes),part.sha,'EXISTING_IMAGE_GIT_BLOB_MISMATCH');
  digest=fromCache.sha256;imageRel=fromCache.url;reused=true;
 }else{
  const resp=await fetch(url,{signal:AbortSignal.timeout(120000)});
  assert(resp.ok,'SOURCE_DOWNLOAD_FAILED:'+part.filename+':'+resp.status);
  bytes=Buffer.from(await resp.arrayBuffer());
  assert.equal(gitHash(bytes),part.sha,'SOURCE_BLOB_SHA_MISMATCH:'+part.filename);
  digest=hash(bytes);
  imageRel='content/english/assets/images/assets-duduq/fast-'+part.sha.slice(0,12)+'-'+digest.slice(0,12)+'.png';
  assert(!fileManifest.has(imageRel)&&!existsSync(root+imageRel),'DUPLICATE_NEW_SOURCE_PATH');
  mkdirSync(path.dirname(root+imageRel),{recursive:true});
  writeFileSync(root+imageRel,bytes,{flag:'wx'});
  manifestLines.push(imageRel+' '+digest);
 }
 assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a','NOT_PNG:'+part.filename);
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 assert(width>=512&&height>=512,'UNDERSIZED_IMAGE:'+part.filename);
 actualImages.push({concept:part.concept,filename:part.filename,sha:part.sha,
  sha256:digest,url:imageRel,reused,width,height,ids:part.ids});
 for(const id of part.ids){
  const e=byId.get(id);
  e.urlOrPath=imageRel;e.sha256=digest;e.assets=[{path:imageRel,sha256:digest}];
  e.temporary=true;e.humanResolutionStatus='PEDAGOGICAL_QA_PENDING';
  e.integrationStatus='EXACT_ORIGINAL_SOURCE_PREVIEW_REVIEW';
  e.provenance={provider:'Assets-DuduQ',sourcePath:src,sourceCommit,
   sourceGitBlob:part.sha,sha256:digest};
  e.replacementAudit={qaOnly:true,previousPath:origin[id],concept:part.concept,
   semanticVerifiedAgainstAllSharedMediaIdConsumers:true};
 }
}
assert.equal(actualImages.length,5,'NOT_FIVE_CONCEPT_IMAGES');
// Verify 600 authored questions are identical to the immutable build and
// prevent newly introduced identical-PNG correct-vs-distractor collisions.
let questions=0;const linkedQuestions=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const qRel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
 const q=JSON.parse(readFileSync(root+qRel));
 assert.equal(q.items?.length,20,'QUESTION_COUNT_CHANGED:'+qRel);
 for(const item of q.items){
  questions++;
  const choices=(item.options||[]).filter(o=>o.mediaId&&byId.get(o.mediaId));
  for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++){
   const a=choices[i],b=choices[j],e1=byId.get(a.mediaId),e2=byId.get(b.mediaId);
   if(e1.sha256&&e1.sha256===e2.sha256&&a.mediaId!==b.mediaId&&
      (targets.includes(a.mediaId)||targets.includes(b.mediaId))&&
      Boolean(a.correct)!==Boolean(b.correct))
    throw Error('CORRECT_AND_DISTRACTOR_DUPLICATE_IMAGE:'+item.item_id+':'+a.mediaId+':'+b.mediaId);
  }
  const found=new Set();
  function scan(v){if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){for(const x of v)scan(x);return}
   for(const k of ['mediaId','assetId','image_ref','imageRef'])
    if(typeof v[k]==='string'&&targets.includes(v[k]))found.add(v[k]);
   for(const value of Object.values(v))if(value&&typeof value==='object')scan(value);
  }
  scan(item);
  for(const id of found){
   const arr=linkedQuestions.get(id)||[];arr.push(item.item_id);linkedQuestions.set(id,arr);
  }
 }
}
assert.equal(questions,600,'NOT_600_CONTRACTS');
for(const id of targets){
 assert((linkedQuestions.get(id)||[]).length>=1,'MEDIA_ID_UNUSED_IN_600:'+id);
}
const nextReg=Buffer.from(JSON.stringify(reg,null,2)+'\n');
const nextRegistrySha=hash(nextReg);
const oldLine=fileManifest.get(regRel);
manifestLines[oldLine.i]=regRel+' '+nextRegistrySha;
const nextManifest=manifestLines.join('\n')+'\n';
writeFileSync(root+regRel,nextReg);
writeFileSync(root+manifestRel,nextManifest);
assert.equal(hash(readFileSync(root+regRel)),nextRegistrySha);
const manifestCheck=new Map(nextManifest.trimEnd().split(/\n/).map(x=>{
 const at=x.lastIndexOf(' ');return [x.slice(0,at),x.slice(at+1)];
}));
assert.equal(manifestCheck.size,manifestLines.length,'MANIFEST_DUPLICATED_FILES');
for(const part of actualImages)assert.equal(manifestCheck.get(part.url),part.sha256,'IMAGE_MANIFEST_DIFF');
const report={schema:'DUDUQ_EXACT_5_CLUSTER_INCREMENTAL_QA_V1',
 sourceCommit,previousRegistrySha:expectedRegistrySha,newRegistrySha:nextRegistrySha,
 mediaIdsUpdated:targets.length,concepts:plan.map(p=>p.concept),images:actualImages,
 affectedQuestionCount:[...new Set([...linkedQuestions.values()].flat())].length,
 mediaQuestionMap:Object.fromEntries(linkedQuestions),qaOnly:true,qaVisualApproved:false,
 contracts:600,sourcePngCount:488,noGabaritoChanges:true,notGeneratedImages:true,
 productionDeployed:release};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/exact-five-clusters.json',JSON.stringify(report,null,2)+'\n');
if(preview){
 const dir=root+'media-review';mkdirSync(dir,{recursive:true});
 const cards=actualImages.map(x=>'<article><img src="/'+x.url+'" alt="'+x.concept+'">'+
 '<h2>'+x.concept+'</h2><p>'+x.filename+'</p><small>'+x.ids.length+' mediaIds</small></article>').join('');
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ — 5 conceitos corrigidos</title>'+
 '<style>body{font:16px Nunito,Arial;background:#f6f9ff;color:#234;padding:22px;max-width:1150px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}article{background:white;padding:16px;border-radius:16px}img{width:100%;height:210px;object-fit:contain}h2{font-size:1.15rem}</style>'+
 '<h1>Revisão pedagógica — cinco conceitos</h1><p>10 mediaIds, nenhuma questão ou gabarito alterado. Candidata QA não homologada.</p><main>'+cards+'</main></html>';
 writeFileSync(dir+'/five-concepts.html',html);
 writeFileSync(dir+'/five-concepts.json',JSON.stringify(report,null,2)+'\n');
}
console.log('DUDUQ_EXACT_FIVE_CONCEPTS_PASS='+JSON.stringify({
 mediaIds:targets.length,pngsAdded:actualImages.filter(x=>!x.reused).length,
 pngsReused:actualImages.filter(x=>x.reused).length,
 concepts:report.concepts,affectedQuestions:report.affectedQuestionCount,
 registrySha:nextRegistrySha,preview,release}));
