#!/usr/bin/env node
/** Check real new-source media on the isolated compiled Pages candidate. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const dist=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const hash=b=>createHash('sha256').update(b).digest('hex');
const batch=process.env.DUDUQ_PHASE2_BATCH==='multilingual'?'multilingual':'new-source';
const reportPrefix=batch==='multilingual'?'phase2-multilingual-source':'phase2-new-source';
const patch=JSON.parse(await readFile('qa/results/'+reportPrefix+'-qa-patch.json','utf8'));
assert.equal(patch.status,'ISOLATED_MEDIA_UPDATED_VISUAL_AND_PEDAGOGICAL_QA_PENDING');
assert.equal(patch.verifiedContracts,600);
assert(!patch.releaseApproved&&!patch.pedagogicalQAApproved&&!patch.productionDeployed);
const registry=JSON.parse(await readFile(path.join(dist,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
const lines=(await readFile(path.join(dist,'.duduq-pages-manifest'),'utf8')).trim().split(/\r?\n/);
const integrity=new Map(lines.map(l=>{const i=l.lastIndexOf(' ');return [l.slice(0,i),l.slice(i+1)];}));
for(const b of patch.bindings){
 const e=byId.get(b.mediaId);
 assert(e?.urlOrPath===b.sourcePath&&e?.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
  'NEW_SOURCE_BINDING_NOT_ACTIVE:'+b.mediaId);
}
for(const image of patch.images){
 const bytes=await readFile(path.join(dist,image.assetPath));
 assert.equal(hash(bytes),image.sha256,'NEW_SOURCE_LOCAL_PNG_CHANGED:'+image.assetPath);
 assert.equal(integrity.get(image.assetPath),image.sha256,'NEW_SOURCE_MANIFEST_MISMATCH:'+image.assetPath);
 const response=await fetch(base+'/'+image.assetPath);
 assert.equal(response.status,200,'NEW_SOURCE_HTTP_NOT_200:'+image.assetPath);
 assert((response.headers.get('content-type')||'').includes('image/png'),'NEW_SOURCE_NOT_PNG:'+image.assetPath);
 assert.equal(hash(Buffer.from(await response.arrayBuffer())),image.sha256,'NEW_SOURCE_HTTP_HASH_MISMATCH');
}
const out='qa/results/'+reportPrefix+'-browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true}),checks=[];
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  const ids=batch==='multilingual'?
   [...new Set(patch.bindings.map(b=>b.questionIds[0]))].sort():patch.changedQuestionIds;
  for(const questionId of ids){
   const data=JSON.parse(await readFile(path.join(dist,
    'content/english/year-'+questionId[1]+'/module-'+questionId.slice(3,5)+'/questions.json'),'utf8'));
   const q=data.items.find(x=>x.item_id===questionId);
   assert(q?.mechanicId,'MISSING_MECHANIC:'+questionId);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const required=[...new Set(patch.bindings.filter(b=>b.questionIds.includes(questionId)).map(b=>b.sourcePath))];
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
    errors.push('HTTP_'+r.status()+':'+r.url())});
   const response=await page.goto(base+'/play/'+slug+'/?duduqModule='+questionId.slice(0,5)+
    '&duduqItem='+questionId+'&qaSeed=phase2-new-source',{waitUntil:'domcontentloaded',timeout:45000});
   const probe=()=>page.evaluate(paths=>{
    const loaded=[...document.images].filter(img=>{
     try{
      const url=new URL(img.currentSrc||img.src);
      const box=img.getBoundingClientRect(),css=getComputedStyle(img);
      return paths.includes(decodeURI(url.pathname).replace(/^\/+/,''))&&img.complete&&
       img.naturalWidth>0&&box.width>12&&box.height>12&&
       box.left>=-1&&box.right<=innerWidth+1&&box.top>=-1&&box.bottom<=innerHeight+1&&
       css.visibility!=='hidden'&&css.display!=='none'&&Number(css.opacity)>0;
     }catch{return false}
    });
    return {visiblePaths:[...new Set(loaded.map(img=>decodeURI(new URL(img.currentSrc||img.src).pathname).replace(/^\/+/,'')))],
     textLength:document.body?.innerText?.length||0};
   },required);
   let state=await probe();
   if(required.some(p=>!state.visiblePaths.includes(p))){
    try{await page.waitForFunction(paths=>paths.every(p=>
     [...document.images].some(img=>{
      try{
       const url=decodeURI(new URL(img.currentSrc||img.src).pathname).replace(/^\/+/,'');
       const box=img.getBoundingClientRect(),css=getComputedStyle(img);
       return url===p&&img.complete&&img.naturalWidth>0&&box.width>12&&box.height>12&&
        box.left>=-1&&box.right<=innerWidth+1&&box.top>=-1&&box.bottom<=innerHeight+1&&
        css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0;
      }catch{return false}
     })
    ),required,{timeout:10000,polling:250})}catch{}
    state=await probe();
   }
   const filename=out+'/'+questionId+'-'+viewport.width+'.png';
   await page.screenshot({path:filename,fullPage:false});
   checks.push({questionId,mechanic:q.mechanicId,viewport:viewport.width,status:response?.status(),
    required,errors,...state,screenshot:filename});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
const failed=checks.filter(c=>c.status!==200||c.errors.length>0||c.textLength<20||
 c.required.some(p=>!c.visiblePaths.includes(p)));
const report={status:failed.length?'FAIL_NEW_SOURCE_REAL_BROWSER':'PASS_NEW_SOURCE_REAL_BROWSER_QA_ONLY',
 sourceCommit:patch.sourceCommit,mediaIds:patch.changedMediaIds,images:patch.images.length,
 questions:patch.changedQuestionCount,checks:checks.length,failed:failed.map(c=>({
 questionId:c.questionId,viewport:c.viewport,errors:c.errors,
 missing:c.required.filter(p=>!c.visiblePaths.includes(p))})),
 cases:checks,productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false};
await writeFile('qa/results/'+reportPrefix+'-browser.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,mediaIds:report.mediaIds,images:report.images,
 checks:report.checks,failures:failed.length}));
assert.equal(failed.length,0,'NEW_SOURCE_VISIBILITY_NOT_FULLY_VERIFIED');
