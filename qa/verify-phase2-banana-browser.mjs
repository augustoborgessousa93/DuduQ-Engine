#!/usr/bin/env node
/** Targeted real-browser evidence for the 3 guarded banana QA bindings.
 * QA-only: cannot mark pedagogical approval or deploy production.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/dist-pages-banana-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const patch=JSON.parse(await readFile('qa/results/phase2-banana-qa-patch.json','utf8'));
assert.equal(patch.status,'ISOLATED_QA_PATCH_REQUIRES_PEDAGOGICAL_AND_VISUAL_APPROVAL');
assert.equal(patch.verifiedQuestionContracts,600);
assert(patch.changedMediaIds>0&&patch.changedMediaIds<=3);
assert.equal(patch.productionDeployed,false);
const reg=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const entries=new Map(reg.entries.map(x=>[x.mediaId,x]));
for(const binding of patch.bindings){
 const e=entries.get(binding.mediaId);
 assert(e?.urlOrPath===patch.assetPath&&e?.sha256===patch.sourceSha256&&
  e?.temporary===true&&e?.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
  'BANANA_NOT_EXPLICITLY_QA_PENDING:'+binding.mediaId);
}
const local=await readFile(path.join(root,patch.assetPath));
assert.equal(sha256(local),patch.sourceSha256,'LOCAL_IMAGE_HASH_CHANGED');
const http=await fetch(base+'/'+patch.assetPath);
assert.equal(http.status,200,'BANANA_HTTP_NOT_200');
assert((http.headers.get('content-type')||'').includes('image/png'),'BANANA_WRONG_MIME');
assert.equal(sha256(Buffer.from(await http.arrayBuffer())),patch.sourceSha256,'BANANA_HTTP_HASH_CHANGED');
const questionIds=[...new Set(patch.bindings.flatMap(b=>b.questionIds))].sort();
const output='qa/results/phase2-banana-browser';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[];
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const ctx=await browser.newContext({viewport,deviceScaleFactor:1});
  for(const id of questionIds){
   const y=Number(id[1]),m=Number(id.slice(3,5));
   const rel='content/english/year-'+y+'/module-'+String(m).padStart(2,'0')+'/questions.json';
   const questions=JSON.parse(await readFile(path.join(root,rel),'utf8'));
   const q=questions.items.find(x=>x.item_id===id);
   assert(q?.mechanicId,'QUESTION_MECHANIC_MISSING:'+id);
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const page=await ctx.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
     errors.push('HTTP_'+r.status()+':'+r.url())});
   const url=base+'/play/'+slug+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=phase2-banana';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForTimeout(1500);
   const sample=async()=>page.evaluate(asset=>{
    const matches=[...document.images].filter(img=>{
     try{return new URL(img.currentSrc||img.src).pathname.replace(/^\/+/, '')===asset}
     catch{return false}
    });
    return {bodyTextLength:document.body?.innerText?.length||0,
     matchingImages:matches.length,
     visibleLoadedImages:matches.filter(img=>{
      const b=img.getBoundingClientRect(),css=getComputedStyle(img);
      return img.complete&&img.naturalWidth>0&&b.width>12&&b.height>12&&
       css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0;
     }).length};
   },patch.assetPath);
   let state=await sample();
   if(state.visibleLoadedImages===0){
    try{await page.waitForFunction(asset=>[...document.images].some(img=>{
      try{const b=img.getBoundingClientRect(),css=getComputedStyle(img);
       return new URL(img.currentSrc||img.src).pathname.replace(/^\/+/, '')===asset&&
        img.complete&&img.naturalWidth>0&&b.width>12&&b.height>12&&
        css.display!=='none'&&css.visibility!=='hidden'&&Number(css.opacity)>0}
      catch{return false}
    }),patch.assetPath,{timeout:9000,polling:250})}catch{}
    state=await sample();
   }
   const screenshot=path.join(output,id+'-'+viewport.width+'.png');
   await page.screenshot({path:screenshot,fullPage:false});
   cases.push({questionId:id,viewport:viewport.width,httpStatus:response?.status()||0,
    ...state,errors,screenshot});
   await page.close();
  }
  await ctx.close();
 }
}finally{await browser.close()}
const failures=cases.filter(x=>x.httpStatus!==200||x.errors.length||
 x.bodyTextLength<20||x.visibleLoadedImages<1);
const report={schemaVersion:'DUDUQ_PHASE2_BANANA_REAL_BROWSER_V1',
 status:failures.length?'FAIL_VISUAL_GATE':'PASS_VISUAL_GATE_QA_ONLY',
 checkedQuestions:questionIds.length,viewportCount:2,checks:cases.length,
 visibleSourceCases:cases.filter(x=>x.visibleLoadedImages>0).length,
 failedCases:failures.map(x=>({questionId:x.questionId,viewport:x.viewport,
  visibleLoadedImages:x.visibleLoadedImages,errors:x.errors})),
 cases,pedagogicalQAApproved:false,productionDeployed:false,releaseApproved:false};
await writeFile('qa/results/phase2-banana-browser.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,questions:report.checkedQuestions,
 checked:report.checks,visible:report.visibleSourceCases,failed:failures.length}));
assert.equal(failures.length,0,'BANANA_VISUAL_GATE_FAILED');
