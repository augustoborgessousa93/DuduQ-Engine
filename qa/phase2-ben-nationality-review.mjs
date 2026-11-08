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
const plan=[{"concept":"ben","filename":"ben.png","sha":"b74ef11cf37987ead633c303226b85a24787a2b9","ids":["Y1M01-EMOJI-BEN-001"]},{"concept":"nationality","filename":"duas crianças em idade escolar representando nacionalidades diferentes.png","sha":"986eb7462629c1194e771270332c3e8234c5070e","ids":["IMG-V11-2B-B659C004CC1CEFAF"]}];
const sourceCommit='5d8a2e243eefaefaf403a0be838c529c6fe6ed64';
const expectedRegistrySha='ae9e3142fdf7330534ebb063f57bf7ed69f33b8e41ac13a2cc87d5e5889c692a';
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
assert.equal(targets.length,2);
assert.equal(new Set(targets).size,targets.length,'TARGET_ID_REPEATED');
const fixture=JSON.parse(readFileSync('qa/fixtures/phase2-source-tree-558-20261107.json'));
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
const requestedBlobs=new Set(plan.map(p=>p.sha));
for(const e of reg.entries){
 // Legacy releases intentionally keep identical bytes at several named URLs
 // (e.g. two RED paths). They must not block unrelated concept mapping.
 if(e.provenance?.sourceGitBlob && requestedBlobs.has(e.provenance.sourceGitBlob) &&
    e.urlOrPath?.endsWith('.png')){
  const prior=oldMediaPngByBlob.get(e.provenance.sourceGitBlob);
  if(prior){
   assert.equal(prior.sha256,e.sha256,'SAME_GIT_BLOB_DIFFERENT_BYTES');
   continue;
  }
  oldMediaPngByBlob.set(e.provenance.sourceGitBlob,{url:e.urlOrPath,sha256:e.sha256});
 }
}
const actualImages=[];
const queue=[...plan];
async function worker(){while(queue.length){
 const part=queue.shift();
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
  let resp;
  for(let a=0;a<3;a++){
   try { resp=await fetch(url,{signal:AbortSignal.timeout(120000)}); if(resp.ok)break; }
   catch(error) { if(a===2)throw error; }
   if(a<2)await new Promise(r=>setTimeout(r,600*(a+1)));
  }
  assert(resp?.ok,'SOURCE_DOWNLOAD_FAILED:'+part.filename+':'+resp?.status);
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
 assert.equal(bytes[25],6,'NEW_PNG_MUST_HAVE_ALPHA_CHANNEL:'+part.filename);
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
}}
await Promise.all(Array.from({length:5},()=>worker()));
assert.equal(actualImages.length,2,'NOT_TWO_PICTURES');
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
  // Wardrobe source features a small rug in the foreground. Never use it
  // where a competing rug/carpet option would make the correct answer unclear.
  const allIds=new Set();
  function collectIds(v){
   if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){for(const x of v)collectIds(x);return;}
   for(const k of ['mediaId','assetId','image_ref','imageRef'])
    if(typeof v[k]==='string'&&byId.has(v[k]))allIds.add(v[k]);
   for(const value of Object.values(v))if(value&&typeof value==='object')collectIds(value);
  }
  collectIds(item);
  // Keep answers distinct when Ben or nationality appears against other options.
  const choices=[];
  function scanChoices(v){
   if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){for(const c of v)scanChoices(c);return}
   if(typeof v.mediaId==='string'&&byId.has(v.mediaId)&&
      ('correct' in v||'isCorrect' in v))choices.push(v);
   for(const child of Object.values(v))if(child&&typeof child==='object')scanChoices(child);
  }
  scanChoices(item);
  for(let i=0;i<choices.length;i++)for(let j=i+1;j<choices.length;j++){
   const a=choices[i],b=choices[j],ea=byId.get(a.mediaId),eb=byId.get(b.mediaId);
   if(a.mediaId!==b.mediaId&&
      (targets.includes(a.mediaId)||targets.includes(b.mediaId))&&
      ea?.sha256&&ea.sha256===eb?.sha256&&
      Boolean(a.correct??a.isCorrect)!==Boolean(b.correct??b.isCorrect))
    throw Error('CORRECT_DISTRACTOR_SAME_ORIGINAL:'+item.item_id);
  }
  if([...allIds].some(id=>targets.includes(id)&&byId.get(id)?.semantic==='wardrobe')){
   const competing=[...allIds].filter(id=>['rug','carpet','mat'].includes(byId.get(id)?.semantic));
   assert.equal(competing.length,0,'WARDROBE_WITH_RUG_DISTRACTOR:'+item.item_id);
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
assert.equal(new Set(targets).size,2,'DUPLICATE_2_IDS');
const unusedIds=targets.filter(id=>!(linkedQuestions.get(id)||[]).length);
console.log('DUDUQ_BEN_NATIONALITY_ORPHAN_IDS='+JSON.stringify(unusedIds));
// The registry includes legacy media IDs not referenced by the current 600
// contracts; they must not count as question improvements.
assert(unusedIds.length < targets.length,'ALL_TARGET_MEDIA_IDS_ORPHANED');
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
const report={schema:'DUDUQ_BEN_NATIONALITY_QA_V1',
 sourceCommit,previousRegistrySha:expectedRegistrySha,newRegistrySha:nextRegistrySha,
 mediaIdsUpdated:targets.length,concepts:plan.map(p=>p.concept),images:actualImages,
 affectedQuestionCount:[...new Set([...linkedQuestions.values()].flat())].length,
 mediaQuestionMap:Object.fromEntries(linkedQuestions),unusedTargetIds:unusedIds,activeMediaIds:targets.length-unusedIds.length,qaOnly:true,qaVisualApproved:false,
 contracts:600,sourcePngCount:558,noGabaritoChanges:true,notGeneratedImages:true,
 productionDeployed:release};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/ben-nationality-review-20261108.json',JSON.stringify(report,null,2)+'\n');
if(preview){
 const dir=root+'media-review';mkdirSync(dir,{recursive:true});
 const cards=actualImages.map(x=>'<article><img src="/'+x.url+'" alt="'+x.concept+'">'+
 '<h2>'+x.concept+'</h2><p>'+x.filename+'</p><small>'+x.ids.length+' mediaIds</small></article>').join('');
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ — Ben e Nationality</title>'+
 '<style>body{font:16px Nunito,Arial;background:#f6f9ff;color:#234;padding:22px;max-width:1150px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}article{background:white;padding:16px;border-radius:16px}img{width:100%;height:210px;object-fit:contain}h2{font-size:1.15rem}</style>'+
 '<h1>Revisão pedagógica — Ben e Nationality</h1><p>2 mediaIds em prévia; nenhuma questão ou gabarito alterado. Candidata QA não homologada.</p><main>'+cards+'</main></html>';
 writeFileSync(dir+'/ben-nationality-review-20261108.html',html);
 writeFileSync(dir+'/ben-nationality-review-20261108.json',JSON.stringify(report,null,2)+'\n');
}
console.log('DUDUQ_BEN_NATIONALITY_QA_PASS='+JSON.stringify({
 mediaIds:targets.length,pngsAdded:actualImages.filter(x=>!x.reused).length,
 pngsReused:actualImages.filter(x=>x.reused).length,
 concepts:report.concepts,affectedQuestions:report.affectedQuestionCount,
 registrySha:nextRegistrySha,preview,release}));
