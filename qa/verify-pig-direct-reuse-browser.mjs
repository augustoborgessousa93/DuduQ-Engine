#!/usr/bin/env node
/**
 * Exercise seven Y2M05 curricula after a single-source pig PNG substitution.
 * HTTP, compiled manifest, source hash, per-ID registry, live route loading.
 * Does not claim full gameplay or pedagogical release certification.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=process.cwd(),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const sha=b=>createHash('sha256').update(b).digest('hex');
const report=JSON.parse(await readFile('qa/results/pig-source-direct-reuse.json','utf8'));
assert.equal(report.status,'EXACT_PIG_MEDIA_PATCHED_EPHEMERAL_QA');
assert.equal(report.affectedQuestions,7);
assert.equal(report.mediaBindings,3);
assert.equal(report.verifiedQuestionContracts,600);
assert.equal(report.releaseApproved,false);
const registry=JSON.parse(await readFile('dist-pages/content/english/media/media-registry.json','utf8'));
const pigIds=report.changedMediaIds,entries=pigIds.map(id=>registry.entries.find(x=>x.mediaId===id));
assert.equal(pigIds.length,3);
assert(entries.every(e=>e&&e.sha256===report.sha256&&e.urlOrPath===report.assetPath&&
 e.integrationStatus==='CANDIDATE_PREVIEW_ONLY_PEDAGOGICAL_QA_PENDING'&&e.temporary===true));
const manifest=await readFile('dist-pages/.duduq-pages-manifest','utf8');
assert(manifest.split(/\r?\n/).some(x=>x===report.assetPath+' '+report.sha256),'PIG_ASSET_NOT_MANIFEST_BOUND');
assert.equal(sha(await readFile(path.join('dist-pages',report.assetPath))),report.sha256);
const response=await fetch(base+'/'+report.assetPath);
assert.equal(response.status,200,'PIG_PNG_HTTP_NOT_200');
assert((response.headers.get('content-type')||'').includes('image/png'),'PIG_PNG_CONTENT_TYPE');
assert.equal(sha(Buffer.from(await response.arrayBuffer())),report.sha256,'PIG_HTTP_BYTES_MISMATCH');
const questions=JSON.parse(await readFile('dist-pages/content/english/year-2/module-05/questions.json','utf8'));
const qMap=new Map(questions.items.map(q=>[q.item_id,q]));
const cases=[],browser=await chromium.launch({headless:true});
try{
 for(const view of [{name:'mobile',width:390,height:844},{name:'tablet',width:768,height:1024}]){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height}});
  for(const id of report.affectedQuestionIds){
   const q=qMap.get(id);
   assert(q?.mechanicId,'MISSING_Y2M05_QUESTION:'+id);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const url=base+'/play/'+slug+'/?duduqModule=Y2M05&duduqItem='+id+'&qaSeed=pig-direct-review';
   const page=await context.newPage(),pageErrors=[],badResponses=[];
   page.on('pageerror',error=>pageErrors.push(String(error.message||error)));
   page.on('response',res=>{if(res.url().startsWith(base)&&res.status()>=400&&!/favicon\.ico/.test(res.url()))
    badResponses.push({status:res.status(),url:res.url()});});
   const nav=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
   assert.equal(nav?.status(),200,'QUESTION_ROUTE_HTTP:'+id+':'+nav?.status());
   await page.waitForTimeout(400);
   const readDom=()=>page.evaluate(assetPath=>({
    title:document.title,
    questionVisible:document.body?.innerText?.length>30,
    mediaImages:[...document.images].filter(img=>{
     try{return new URL(img.currentSrc||img.src).pathname.endsWith('/'+assetPath);}catch{return false;}
    }).map(img=>({loaded:img.complete&&img.naturalWidth>0,alt:img.alt,rect:img.getBoundingClientRect().toJSON()}))
   }),report.assetPath);
   let dom=await readDom();
   // Large source PNGs can still be decoding after domcontentloaded.
   // Wait for the same DOM images to decode; never force, hide or suppress a broken image.
   if(dom.mediaImages.some(im=>!im.loaded)){
    await page.waitForFunction(assetPath=>{
     const visible=[...document.images].filter(img=>{
      try{return new URL(img.currentSrc||img.src).pathname.endsWith('/'+assetPath);}catch{return false;}
     });
     return visible.length>0&&visible.every(img=>img.complete&&img.naturalWidth>0);
    },report.assetPath,{timeout:15000,polling:100});
    dom=await readDom();
   }
   assert(dom.questionVisible||dom.mediaImages.length,'QUESTION_EMPTY_RENDER:'+id+':'+view.name);
   assert.equal(pageErrors.length,0,'QUESTION_JS_ERRORS:'+id+':'+pageErrors.join('|'));
   assert.equal(badResponses.length,0,'QUESTION_HTTP_ERRORS:'+id+':'+JSON.stringify(badResponses));
   assert(dom.mediaImages.every(im=>im.loaded),'VISIBLE_PIG_PNG_FAILED_TO_DECODE:'+id);
   cases.push({id,viewport:view.name,routeStatus:200,rendered:true,
    pigImagesInDom:dom.mediaImages.length,sourcePngHttpVerified:true,mechanic:q.mechanicId});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
assert.equal(cases.length,14);
const out={schemaVersion:'DUDUQ_PIG_SOURCE_DIRECT_BROWSER_QA_V1',
 status:'PASS_HTTP_REGISTRY_AND_14_REAL_QUESTION_ROUTE_BOOTS',
 sourceCommit:report.sourceCommit,assetPath:report.assetPath,sha256:report.sha256,
 affectedQuestions:7,bindings:3,routesTested:14,runOnCompiledArtifact:true,cases,
 completePedagogicalQA:false,completeInteractionQA:false,releaseApproved:false,productionDeployed:false};
await mkdir(path.join(root,'qa/results'),{recursive:true});
await writeFile(path.join(root,'qa/results/pig-source-direct-browser.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({status:out.status,questions:7,routeBoots:14,bindings:3,imageSha256:out.sha256,productionDeployed:false}));
