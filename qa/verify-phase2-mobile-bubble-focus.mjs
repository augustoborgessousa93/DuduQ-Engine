#!/usr/bin/env node
/** ONE QA case: earlier 17/18 PASS, only Y3M06-Q003 mobile lacked expected bubble within 14s.
 * Never modifies assets, contracts, Gold Masters or production. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import path from 'node:path';
assert.equal(process.env.DUDUQ_QA_ONLY,'1','QA_ONLY');
const dist=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const report=JSON.parse(await readFile('qa/results/phase2-batch-source-integration.json','utf8'));
assert.equal(report.newMediaIds,153);assert.equal(report.newPngs,69);
assert.equal(report.productionDeployed,false);
const id='Y3M06-Q003';
const matches=report.bindings.filter(b=>b.questionIds.includes(id));
assert.equal(matches.length,1,'EXPECTED_ONE_PINNED_MEDIA');
const b=matches[0];assert.equal(b.concept,'orange','SOURCE_SEMANTIC_DRIFT');
const expected='/'+b.destination;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(await readFile(path.join(dist,b.destination))),b.sha256);
const res=await fetch(base+expected,{signal:AbortSignal.timeout(20000)});
assert.equal(res.status,200);assert.equal(digest(Buffer.from(await res.arrayBuffer())),b.sha256);
const q=JSON.parse(await readFile(path.join(dist,'content/english/year-3/module-06/questions.json'),'utf8')).items.find(x=>x.item_id===id);
assert.equal(q?.mechanicId,'bubble-pop');
const result={schemaVersion:'DUDUQ_PHASE2_SINGLE_MOBILE_BUBBLE_RECHECK_V1',
 case:id,viewport:390,expectedAsset:expected,sha256:b.sha256,sourceDeliveryVerified:true,
 unchangedQuestionContracts:600,productionDeployed:false,releaseApproved:false,
 observedExpectedImage:false,visiblePlayablesMax:0,loadedBubbleImagesMax:0,
 firstSourceAppearanceMs:null,errors:[],samples:[]};
const browser=await chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce'});
 const page=await ctx.newPage();
 page.on('pageerror',e=>result.errors.push(String(e.message||e).slice(0,260)));
 page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon'))result.errors.push('HTTP_'+r.status()+':'+r.url())});
 const url=base+'/play/bubble-pop/?duduqModule=Y3M06&duduqItem='+id+'&qaSeed=mobile-orange-review';
 const nav=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
 assert.equal(nav?.status(),200);
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000,polling:250});
 // Do not simulate a click or change spawns. The test watches the real unmodified
 // mechanism long enough for the content cycle and offscreen entrance.
 const start=Date.now();
 for(let n=0;n<180&&!result.observedExpectedImage;n++){
  let frameData=[];
  for(const frame of page.frames()){
   const data=await frame.evaluate(asset=>{
    let visible=0,loaded=0,found=0,allFound=0;
    for(const button of document.querySelectorAll('.bubble-pop-playable')){
     const r=button.getBoundingClientRect(),css=getComputedStyle(button);
     const onScreen=r.width>30&&r.height>30&&r.right>20&&r.bottom>40&&r.left<innerWidth-20&&r.top<innerHeight-20&&css.display!=='none'&&css.visibility!=='hidden';
     if(onScreen)visible++;
     for(const img of button.querySelectorAll('.bubble-pop-content img')){
      if(!img.complete||img.naturalWidth===0)continue;
      const src=new URL(img.currentSrc||img.src,location.href).pathname;
      if(onScreen)loaded++;
      if(src===asset){allFound++;if(onScreen)found++;}
     }
    }
    return {visible,loaded,found,allFound};
   },expected).catch(()=>({visible:0,loaded:0,found:0,allFound:0}));
   frameData.push(data);
  }
  const v=frameData.reduce((acc,s)=>({visible:acc.visible+s.visible,loaded:acc.loaded+s.loaded,found:acc.found+s.found,allFound:acc.allFound+s.allFound}),{visible:0,loaded:0,found:0,allFound:0});
  result.visiblePlayablesMax=Math.max(result.visiblePlayablesMax,v.visible);
  result.loadedBubbleImagesMax=Math.max(result.loadedBubbleImagesMax,v.loaded);
  if(n%12===0||v.found>0||v.allFound>0)result.samples.push({atMs:Date.now()-start,...v});
  if(v.found>0){result.observedExpectedImage=true;result.firstSourceAppearanceMs=Date.now()-start;break}
  await page.waitForTimeout(250);
 }
 const outdir='qa/results/phase2-mobile-bubble-focus';await mkdir(outdir,{recursive:true});
 await page.screenshot({path:outdir+'/Y3M06-Q003-390.png',animations:'disabled'});
 await ctx.close();
}finally{await browser.close()}
result.status=result.observedExpectedImage&&result.errors.length===0?'PASS_MOBILE_SOURCE_VISIBILITY':'UNRESOLVED_MOBILE_SOURCE_NOT_OBSERVED';
await writeFile('qa/results/phase2-mobile-bubble-focus.json',JSON.stringify(result,null,2)+'\n');
console.log('DUDUQ_ONE_MOBILE_BUBBLE='+JSON.stringify({status:result.status,visiblePlayablesMax:result.visiblePlayablesMax,loadedBubbleImagesMax:result.loadedBubbleImagesMax,firstSourceAppearanceMs:result.firstSourceAppearanceMs,errors:result.errors,productionDeployed:false}));
assert.equal(result.status,'PASS_MOBILE_SOURCE_VISIBILITY','KEEP_THIS_ONE_CASE_UNAPPROVED');
