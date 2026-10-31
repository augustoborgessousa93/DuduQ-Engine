#!/usr/bin/env node
/**
 * Verify all four source-hash-bound animal PNGs in exact compiled Pages V26
 * and 18 genuine curriculum route boots (nine questions at two viewports).
 * Does not attest full semantic/pedagogical/playthrough approval.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const root=process.cwd(),base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const hash=b=>createHash('sha256').update(b).digest('hex');
const plan=JSON.parse(await readFile('qa/results/farm-animal-source-batch.json','utf8'));
assert.equal(plan.status,'FOUR_FARM_ANIMAL_PNGS_APPLIED_EPHEMERAL_QA');
assert.equal(plan.sourceUniquePngs,4);assert.equal(plan.changedMediaIds,13);
assert.equal(plan.changedQuestionMediaUsages,28);assert.equal(plan.affectedQuestions,9);
assert.equal(plan.verifiedQuestionContracts,600);
assert(!plan.releaseApproved&&!plan.pedagogicalQAApproved);
const registry=JSON.parse(await readFile('dist-pages/content/english/media/media-registry.json','utf8'));
const index=new Map(registry.entries.map(x=>[x.mediaId,x]));
const compiledManifest=await readFile('dist-pages/.duduq-pages-manifest','utf8');
const lines=new Set(compiledManifest.trimEnd().split(/\r?\n/));
const provenImages=[];
for(const animal of plan.images){
 const candidateIds=plan.bindings.filter(b=>b.concept===animal.concept);
 assert.equal(candidateIds.length,animal.mediaIds);
 assert(lines.has(animal.assetPath+' '+animal.sha256),'PNG_NOT_IN_MANIFEST:'+animal.concept);
 assert.equal(hash(await readFile(path.join(root,'dist-pages',animal.assetPath))),animal.sha256);
 for(const b of candidateIds){
  const entry=index.get(b.mediaId);
  assert(entry&&entry.urlOrPath===animal.assetPath&&entry.sha256===animal.sha256 &&
   entry.temporary===true&&entry.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
   'BINDING_MISSING_OR_FALSLY_APPROVED:'+b.mediaId);
 }
 const res=await fetch(base+'/'+animal.assetPath);
 assert.equal(res.status,200,'PNG_HTTP_ERROR:'+animal.concept);
 assert((res.headers.get('content-type')||'').includes('image/png'),'NOT_SERVED_AS_PNG:'+animal.concept);
 assert.equal(hash(Buffer.from(await res.arrayBuffer())),animal.sha256,
  'SERVED_BYTES_NOT_SOURCE_BYTES:'+animal.concept);
 provenImages.push({concept:animal.concept,sourceGitBlob:animal.gitBlob,
  path:animal.assetPath,sha256:animal.sha256,mediaIds:animal.mediaIds});
}
const questionIds=[...new Set(plan.bindings.flatMap(b=>b.questionIds))].sort();
assert.equal(questionIds.length,9);
const qMap=new Map(JSON.parse(await readFile('dist-pages/content/english/year-2/module-05/questions.json','utf8')).items.map(q=>[q.item_id,q]));
const cases=[],browser=await chromium.launch({headless:true});
try{
 for(const view of [{name:'mobile',width:390,height:844},{name:'tablet',width:768,height:1024}]){
  const ctx=await browser.newContext({viewport:{width:view.width,height:view.height}});
  for(const id of questionIds){
   const q=qMap.get(id);assert(q?.mechanicId,'NO_QUESTION_MECHANIC:'+id);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const page=await ctx.newPage(),errors=[],bad=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{
    if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))bad.push({http:r.status(),url:r.url()});
   });
   const url=base+'/play/'+slug+'/?duduqModule=Y2M05&duduqItem='+id+'&qaSeed=farm-source-batch';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
   assert.equal(response?.status(),200,'CURRICULAR_ROUTE_NOT_200:'+id);
   await page.waitForTimeout(360);
   const result=await page.evaluate(paths=>{
    const assetPaths=new Set(paths),matched=[...document.images].filter(img=>{
      try{return assetPaths.has(new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,''));}catch{return false;}
    });
    return {bodyText:document.body?.innerText?.length||0,matchedImages:matched.map(img=>({
      loaded:img.complete&&img.naturalWidth>0,alt:img.alt||''
    }))};
   },provenImages.map(x=>x.path));
   assert(result.bodyText>20||result.matchedImages.length,'EMPTY_CURRICULAR_RENDER:'+id);
   assert(result.matchedImages.every(x=>x.loaded),'LOADED_ANIMAL_PNG_BROKEN:'+id);
   assert.equal(errors.length,0,'BROWSER_JS_ERROR:'+id+':'+errors.join('|'));
   assert.equal(bad.length,0,'BROWSER_ASSET_ERROR:'+id+':'+JSON.stringify(bad));
   cases.push({questionId:id,viewport:view.name,mechanic:q.mechanicId,status:200,
    loadedSourceImagesInDom:result.matchedImages.length,jsErrors:0});
   await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close()}
assert.equal(cases.length,18);
const report={schemaVersion:'DUDUQ_FARM_ANIMAL_BROWSER_EVIDENCE_V1',
 status:'PASS_FOUR_SOURCE_PNGS_AND_18_CURRICULAR_BOOTS',
 sources:provenImages,sourceUniquePngs:4,changedMediaIds:13,affectedQuestions:9,
 browserRouteBoots:18,cases,allContractsIntact:true,
 pedagogicalQAApproved:false,releaseApproved:false,productionDeployed:false};
await mkdir(path.join(root,'qa/results'),{recursive:true});
await writeFile(path.join(root,'qa/results/farm-animal-batch-browser.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,mediaIds:13,pngs:4,questionRoutes:18,releaseApproved:false}));
