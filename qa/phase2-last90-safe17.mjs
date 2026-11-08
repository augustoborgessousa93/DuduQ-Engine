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
const plan=[{"concept":"eight","filename":"number-08-eight-oito.png","sha":"604dc435bc2c26abaa71a715406fd8dcca79fcc5","ids":["IMG-Q008-EIGHT","IMG-Q018-EIGHT"]},{"concept":"white","filename":"color-white-branco.png","sha":"d8b2da519e574a0c7c08e3d85a4e2db4348972c1","ids":["IMG-Y1M03-Q011-WHITE","IMG-Y1M03-Q016-WHITE"]},{"concept":"eraser","filename":"school-object-eraser-borracha.png","sha":"334a1fecdf362c6a19d50edb0ccc50db68606cb9","ids":["IMG-Q008-ERASER"]},{"concept":"head","filename":"Head — Cabeça.png","sha":"68f4a3d9e3b1ad820faa6a22dd25e699e25d8ca6","ids":["IMG-Y1M05-Q001-HEAD"]},{"concept":"hands","filename":"body-part-touch-hands-tocar-maos.png","sha":"3117dc34c710216b486b9cf587b6153eb48159c8","ids":["IMG-Y1M05-Q001-HANDS"]},{"concept":"arms","filename":"body-part-touch-arms-tocar-bracos.png","sha":"f88fc5c0a63a9692bf404cbddacd22a304896e8c","ids":["IMG-Y1M05-Q001-ARMS"]},{"concept":"feet","filename":"body-part-touch-feet-tocar-pes.png","sha":"00021c9bc4762e43608108754c582f91bc36a75d","ids":["IMG-Y1M05-Q003-FEET"]},{"concept":"backpack","filename":"school-object-backpack-mochila.png","sha":"f2f4ac58d70b8f25877e2fa3249a3bbc981e6da4","ids":["Y1M01-EMOJI-BACKPACK-001"]},{"concept":"orange","filename":"color orange-cor laranja.png","sha":"364c9ccfda05f4440da566495b47c5c6a2993532","ids":["IMG-Y1M03-Q016-ORANGE"]},{"concept":"crayon","filename":"school-object-red-crayon-giz-vermelho.png","sha":"d022f741b3a4ec39348372f1a2ed0f79f0a520a2","ids":["IMG-Q018-CRAYON"]},{"concept":"fish","filename":"pet-fish-peixe.png","sha":"29b60c4e87bcd6cc0a5a4f2e7b7f4fada03a01fc","ids":["IMG-Y1M06-Q004-FISH"]},{"concept":"bird","filename":"pet-bird-passaro.png","sha":"1128475a8de84c4dbeb613fb798164f03d432342","ids":["IMG-Y1M06-Q004-BIRD"]},{"concept":"cold","filename":"I have a cold — Estou resfriado(a).png","sha":"c639f1d8ef89850d5b0bd522adb893f70a3759c6","ids":["IMG-V11-2B-8EC9B833A89D3BE7","IMG-V11-2B-ACB5DDF40D1C7796"]},{"concept":"table","filename":"there_is_a_table.png","sha":"43813f554055ea3be0a749b17ec03c1ca277f8b7","ids":["IMG-V11-2B-6CED50D9787DC9AD","IMG-V11-2B-A724B390350BFC51","IMG-V11-2B-E7E1213D0CCA4038"]},{"concept":"prefer","filename":"i_prefer_grapes.png","sha":"d25bdc1e199a4ec939b0f034957344cfaaf78abd","ids":["IMG-V11-2B-F48C3CE0D4681BE7"]},{"concept":"do not like","filename":"i_do_not_like_carrots.png","sha":"327b43a685c5bf0378889cafb3a514ebd7c95e68","ids":["IMG-V11-2B-EA53A84B5A8D9356"]},{"concept":"like","filename":"I like apples.png","sha":"2b26bad293f231330f254c87812c03fc0157b8ba","ids":["IMG-V11-2B-0C92CA6CCAB76E56","IMG-V11-2B-9013A5518AF15B59","IMG-V11-2B-AE003BC56C00E15C"]}];
const sourceCommit='5d8a2e243eefaefaf403a0be838c529c6fe6ed64';
const expectedRegistrySha='116136a437e561f4d99f3509c68dfe0a86bfbb6e7472cd723bb1323dd2f41882';
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
assert.equal(targets.length,24);
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
assert.equal(actualImages.length,17,'NOT_17_CONCEPT_IMAGES');
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
assert.equal(new Set(targets).size,24,'DUPLICATE_24_IDS');
const unusedIds=targets.filter(id=>!(linkedQuestions.get(id)||[]).length);
console.log('DUDUQ_SAFE17_ORPHAN_REGISTRY_IDS='+JSON.stringify(unusedIds));
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
const report={schema:'DUDUQ_SAFE_17_RESCUED_CONCEPTS_V1',
 sourceCommit,previousRegistrySha:expectedRegistrySha,newRegistrySha:nextRegistrySha,
 mediaIdsUpdated:targets.length,concepts:plan.map(p=>p.concept),images:actualImages,
 affectedQuestionCount:[...new Set([...linkedQuestions.values()].flat())].length,
 mediaQuestionMap:Object.fromEntries(linkedQuestions),unusedTargetIds:unusedIds,activeMediaIds:targets.length-unusedIds.length,qaOnly:true,qaVisualApproved:false,
 contracts:600,sourcePngCount:558,noGabaritoChanges:true,notGeneratedImages:true,
 productionDeployed:release};
mkdirSync('qa/results',{recursive:true});
writeFileSync('qa/results/safe17-final90-20261107.json',JSON.stringify(report,null,2)+'\n');
if(preview){
 const dir=root+'media-review';mkdirSync(dir,{recursive:true});
 const cards=actualImages.map(x=>'<article><img src="/'+x.url+'" alt="'+x.concept+'">'+
 '<h2>'+x.concept+'</h2><p>'+x.filename+'</p><small>'+x.ids.length+' mediaIds</small></article>').join('');
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUDUQ — 17 conceitos recuperados</title>'+
 '<style>body{font:16px Nunito,Arial;background:#f6f9ff;color:#234;padding:22px;max-width:1150px;margin:auto}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px}article{background:white;padding:16px;border-radius:16px}img{width:100%;height:210px;object-fit:contain}h2{font-size:1.15rem}</style>'+
 '<h1>Revisão pedagógica — 17 conceitos</h1><p>24 mediaIds, nenhuma questão ou gabarito alterado. Candidata QA não homologada.</p><main>'+cards+'</main></html>';
 writeFileSync(dir+'/safe17-final90-20261107.html',html);
 writeFileSync(dir+'/safe17-final90-20261107.json',JSON.stringify(report,null,2)+'\n');
}
console.log('DUDUQ_SAFE17_MEDIA_PASS='+JSON.stringify({
 mediaIds:targets.length,pngsAdded:actualImages.filter(x=>!x.reused).length,
 pngsReused:actualImages.filter(x=>x.reused).length,
 concepts:report.concepts,affectedQuestions:report.affectedQuestionCount,
 registrySha:nextRegistrySha,preview,release}));
