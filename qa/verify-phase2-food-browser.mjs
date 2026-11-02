#!/usr/bin/env node
/** Real Chromium source-image visibility for a strictly guarded food QA candidate. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.resolve(process.env.DUDUQ_QA_DIST||'qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const sha256=b=>createHash('sha256').update(b).digest('hex');
const patch=JSON.parse(await readFile('qa/results/phase2-food-qa-patch.json','utf8'));
assert.equal(patch.status,'ISOLATED_QA_PENDING_VISUAL_AND_PEDAGOGICAL_REVIEW');
assert.equal(patch.verifiedQuestionContracts,600);
assert(patch.changedMediaIds>0&&patch.productionDeployed===false);
const registry=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const byId=new Map(registry.entries.map(e=>[e.mediaId,e]));
for(const b of patch.bindings){
 const e=byId.get(b.mediaId);
 assert(e?.urlOrPath===b.assetPath&&e?.sha256===b.sha256&&
  e.temporary===true&&e.humanResolutionStatus==='PEDAGOGICAL_QA_PENDING',
  'FOOD_BINDING_NOT_QA_PENDING:'+b.mediaId);
}
for(const asset of patch.images){
 const bytes=await readFile(path.join(root,asset.path));
 assert.equal(sha256(bytes),asset.sha256,'LOCAL_ASSET_HASH_MISMATCH');
 const response=await fetch(base+'/'+asset.path);
 assert.equal(response.status,200,'FOOD_ASSET_NOT_SERVED');
 assert((response.headers.get('content-type')||'').includes('image/png'),'FOOD_NOT_PNG');
 assert.equal(sha256(Buffer.from(await response.arrayBuffer())),asset.sha256,'HTTP_ASSET_HASH_MISMATCH');
}
const out='qa/results/phase2-food-browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[];
try{
 for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport,deviceScaleFactor:1});
  for(const questionId of patch.changedQuestionIds){
   const y=Number(questionId[1]),mm=questionId.slice(3,5);
   const questionData=JSON.parse(await readFile(path.join(root,'content/english/year-'+y+'/module-'+mm+'/questions.json'),'utf8'));
   const q=questionData.items.find(item=>item.item_id===questionId);
   assert(q?.mechanicId,'MECHANIC_MISSING:'+questionId);
   assert.notEqual(q.mechanicId,'bubble-pop','KNOWN_EMPTY_BUBBLE_POP_NOT_ELIGIBLE');
   const slug=q.mechanicId.startsWith('smart-sentence')?'smart-sentence':q.mechanicId;
   const required=[...new Set(patch.bindings.filter(b=>b.questionIds.includes(questionId)).map(b=>b.assetPath))];
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
    errors.push('HTTP_'+r.status()+':'+r.url())});
   const url=base+'/play/'+slug+'/?duduqModule='+questionId.slice(0,5)+'&duduqItem='+questionId+'&qaSeed=phase2-food';
   const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
   const sample=()=>page.evaluate(paths=>{
    const images=[...document.images];
    const visible=images.filter(img=>{
     try{
      const p=new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'');
      const box=img.getBoundingClientRect(),css=getComputedStyle(img);
      return paths.includes(p)&&img.complete&&img.naturalWidth>0&&
       box.width>12&&box.height>12&&css.display!=='none'&&
       css.visibility!=='hidden'&&Number(css.opacity)>0;
     }catch{return false}
    });
    return {visibleSourceImages:visible.length,
     bodyTextLength:document.body?.innerText?.length||0,
     sourcePathsVisible:[...new Set(visible.map(img=>new URL(img.currentSrc||img.src).pathname.replace(/^\/+/,'')))]};
   },required);
   let state=await sample();
   // Wait for EVERY required source image, not merely the first loaded image.
   // Previously, partial asynchronous image loading caused false negatives.
   if(required.some(p=>!state.sourcePathsVisible.includes(p))){
    try{await page.waitForFunction(paths=>paths.every(requiredPath=>
     [...document.images].some(img=>{
      try{
       const p=new URL(img.currentSrc||img.src).pathname.replace(/^\\/+/, '');
       const b=img.getBoundingClientRect(),css=getComputedStyle(img);
       return p===requiredPath&&img.complete&&img.naturalWidth>0&&
        b.width>12&&b.height>12&&css.display!=='none'&&
        css.visibility!=='hidden'&&Number(css.opacity)>0;
      }catch{return false}
     })
    ),required,{timeout:12000,polling:250})}catch{}
    state=await sample();
   }
   const screenshot=out+'/'+questionId+'-'+viewport.width+'.png';
   await page.screenshot({path:screenshot,fullPage:false});
   cases.push({questionId,viewport:viewport.width,mechanicId:q.mechanicId,
    httpStatus:response?.status()||0,required,errors,...state,screenshot});
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
const failures=cases.filter(c=>c.httpStatus!==200||c.errors.length||
 c.bodyTextLength<20||c.required.some(p=>!c.sourcePathsVisible.includes(p)));
const report={schemaVersion:'DUDUQ_PHASE2_FOOD_BROWSER_V1',
 status:failures.length?'FAIL_VISUAL_GATE':'PASS_VISUAL_GATE_QA_ONLY',
 checkedQuestions:patch.changedQuestionCount,checks:cases.length,
 visibleCases:cases.filter(c=>c.visibleSourceImages>0).length,
 failures:failures.map(c=>({questionId:c.questionId,viewport:c.viewport,errors:c.errors,
  visibleSourceImages:c.visibleSourceImages,
  missingRequiredPaths:c.required.filter(p=>!c.sourcePathsVisible.includes(p))})),
 cases,productionDeployed:false,releaseApproved:false,pedagogicalQAApproved:false};
await writeFile('qa/results/phase2-food-browser.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,questions:report.checkedQuestions,
 checks:report.checks,visible:report.visibleCases,failed:failures.length}));
assert.equal(failures.length,0,'FOOD_VISUAL_GATE_FAILED');
