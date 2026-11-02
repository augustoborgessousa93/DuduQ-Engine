#!/usr/bin/env node
/** Real Chromium QA of new exact-source vocabulary candidates. NEVER production approval. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const hash=x=>createHash('sha256').update(x).digest('hex');
const report=JSON.parse(await readFile('qa/results/phase2-source-reuse-batch.json','utf8'));
assert.equal(report.status,'PHASE2_SOURCE_REUSED_EPHEMERAL_QA');
assert.equal(report.verifiedContracts,600);
assert.equal(report.changedMediaIds,report.bindings.length);
assert(!report.releaseApproved&&!report.humanPedagogicalApproval);
const reg=JSON.parse(await readFile('dist-pages/content/english/media/media-registry.json','utf8'));
const entries=new Map(reg.entries.map(x=>[x.mediaId,x]));
const manifest=await readFile('dist-pages/.duduq-pages-manifest','utf8');
const integrity=new Set(manifest.trimEnd().split(/\r?\n/));
for(const img of report.images){
 assert(integrity.has(img.assetPath+' '+img.sha256),'ASSET_NOT_MANIFEST_BOUND:'+img.concept);
 const source=await readFile('dist-pages/'+img.assetPath);
 assert.equal(hash(source),img.sha256,'ASSET_BYTES_CHANGED:'+img.concept);
 const response=await fetch(base+'/'+img.assetPath);
 assert.equal(response.status,200,'SOURCE_NOT_HTTP_200:'+img.concept);
 assert((response.headers.get('content-type')||'').includes('image/png'),'WRONG_SOURCE_MIME:'+img.concept);
 assert.equal(hash(Buffer.from(await response.arrayBuffer())),img.sha256,'SOURCE_BROWSER_HTTP_HASH:'+img.concept);
}
for(const b of report.bindings){
 const x=entries.get(b.mediaId);
 assert(x?.urlOrPath===b.sourcePath&&x?.sha256===b.sha256&&
 x.temporary===true&&x.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
 'VOCAB_BINDING_MISSING_OR_FALSELY_APPROVED:'+b.mediaId);
}
const browser=await chromium.launch({headless:true}),cases=[];
try{
 const byConcept=new Map();
 for(const b of report.bindings){
  if(!byConcept.has(b.concept))byConcept.set(b.concept,new Set());
  b.questionIds.forEach(id=>byConcept.get(b.concept).add(id));
 }
 const sampled=[...new Set([...byConcept].flatMap(([,ids])=>[...ids].slice(0,2)))].sort();
 assert(sampled.length>=report.images.length/2,'VOCAB_REPRESENTATIVE_SAMPLE_TOO_SMALL');
 for(const viewport of [{width:390,height:844},{width:768,height:1024}]){
  const context=await browser.newContext({viewport});
  for(const id of sampled){
   const year=Number(id[1]),m=Number(id.slice(3,5)),relative='dist-pages/content/english/year-'+year+'/module-'+String(m).padStart(2,'0')+'/questions.json';
   const data=JSON.parse(await readFile(relative,'utf8'));
   const q=data.items.find(z=>z.item_id===id);
   assert(q?.mechanicId,'QUESTION_MECHANIC_MISSING:'+id);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
     errors.push('HTTP_'+r.status()+':'+r.url())});
   const res=await page.goto(base+'/play/'+slug+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=vocab-source-review',
     {waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(res?.status(),200,'ROUTE_HTTP_NOT_200:'+id);
   await page.waitForTimeout(500);
   const result=await page.evaluate(paths=>{
    const present=new Set(paths);
    const matching=[...document.images].filter(x=>{try{return present.has(new URL(x.currentSrc||x.src).pathname.replace(/^\/+/,''));}catch{return false;}});
    return {body:document.body?.innerText?.length||0,images:matching.map(x=>({loaded:x.complete&&x.naturalWidth>0}))};
   },report.images.map(z=>z.assetPath));
   if(result.images.some(x=>!x.loaded)){
    await page.waitForFunction(paths=>{
     const present=new Set(paths),matching=[...document.images].filter(x=>{
      try{return present.has(new URL(x.currentSrc||x.src).pathname.replace(/^\/+/,''));}catch{return false;}
     });
     return matching.length>0&&matching.every(x=>x.complete&&x.naturalWidth>0);
    },report.images.map(z=>z.assetPath),{timeout:15000,polling:100});
   }
   assert(result.body>20||result.images.length,'QUESTION_EMPTY_RENDER:'+id);
   assert.equal(errors.length,0,'BROWSER_ERRORS:'+id+':'+errors.join('|'));
   cases.push({questionId:id,viewport:viewport.width,status:200,sourceImagesSeen:result.images.length});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
assert(cases.length>0);
const outcome={schemaVersion:'DUDUQ_PHASE2_SOURCE_BROWSER_QA_V1',
 status:'PASS_HASH_HTTP_AND_REPRESENTATIVE_ROUTE_BOOTS_QA_ONLY',
 images:report.images.length,changedMediaIds:report.changedMediaIds,
 affectedQuestions:report.affectedQuestions,browserRoutes:cases.length,cases,
 pedagogicalQaApproved:false,releaseApproved:false,productionDeployed:false};
await mkdir('qa/results',{recursive:true});
await writeFile('qa/results/phase2-source-browser.json',JSON.stringify(outcome,null,2)+'\n');
console.log(JSON.stringify({status:outcome.status,images:outcome.images,mediaIds:outcome.changedMediaIds,routeBoots:cases.length}));
