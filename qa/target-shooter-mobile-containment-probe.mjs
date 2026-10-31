#!/usr/bin/env node
// Read-only QA experiment: centered mobile targets without Gold Master edits.
// An experimental pass NEVER changes a release gate or media approval.
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const output=path.resolve('qa/results/target-shooter-mobile-containment');
await mkdir(output,{recursive:true});
// Mobile variant: move the four existing target hitboxes closer together,
// preserving their dimensions. Never scale the entire world or Gold Master.
// Measured 390px baseline: x=-8.5,106,224.5,338.5, target width=92.
// Expected with left offsets 317/505/693/869: x~12,106,200,288.
const candidateCSS=`@media (max-width:520px) {
  .target-shooter-screen .target-shooter-target--dog { left:317px !important; }
  .target-shooter-screen .target-shooter-target--cat { left:505px !important; }
  .target-shooter-screen .target-shooter-target--rabbit { left:693px !important; }
  .target-shooter-screen .target-shooter-target--fish { left:869px !important; }
}`;
const report={schemaVersion:'DUDUQ_TARGET_SHOOTER_MOBILE_CONTAINMENT_PROBE_V1',
  mode:'EPHEMERAL_CSS_QA_ONLY',width:390,height:844,candidateCSS,
  immutableGoldMastersChanged:false,productionDeployed:false,questions:[],status:'RUNNING'};
const browser=await chromium.launch({headless:true});
const ids=['Y1M04-Q010','Y1M04-Q015','Y1M04-Q020'];
const assess=page=>page.locator('.target-shooter-target').evaluateAll(targets=>targets.map(el=>{
  const r=el.getBoundingClientRect(),style=getComputedStyle(el);
  const intersection=Math.max(0,Math.min(innerWidth,r.right)-Math.max(0,r.left))*
    Math.max(0,Math.min(innerHeight,r.bottom)-Math.max(0,r.top));
  const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
  return {x:r.x,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,
    visibleRatio:intersection/Math.max(1,r.width*r.height),computedLeft:style.left,
    className:el.className,
    centerHit:hit===el||el.contains(hit),display:style.display,visibility:style.visibility,
    semanticAlts:[...el.querySelectorAll('img')].map(x=>x.alt)};
}));
try{
  for(const qid of ids){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(String(e.message||e)));
    const route='/play/target-shooter/?duduqModule=Y1M04&duduqItem='+qid+'&qaSeed=20261031';
    const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
    await page.waitForFunction(()=>document.querySelectorAll('.target-shooter-target').length===4 &&
      [...document.querySelectorAll('.target-shooter-target__animal')].every(i=>i.complete && i.naturalWidth>0),null,{timeout:20000});
    const before=await assess(page);
    await page.screenshot({path:path.join(output,qid+'-before.png'),fullPage:false});
    const cssMediaBefore=await page.evaluate(()=>matchMedia('(max-width:520px)').matches);
    await page.addStyleTag({content:candidateCSS});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const after=await assess(page);
    const cssMediaAfter=await page.evaluate(()=>matchMedia('(max-width:520px)').matches);
    await page.screenshot({path:path.join(output,qid+'-after.png'),fullPage:false});
    const fit=after.length===4 && after.every(t=>t.visibleRatio>=0.98 &&
      t.width>=44 && t.height>=44 && t.centerHit);
    report.questions.push({questionId:qid,route,httpStatus:response?.status()||null,
      before,after,fit,cssMediaBefore,cssMediaAfter,
      cssActuallyChanged:after.some((t,i)=>Math.abs(t.x-before[i].x)>1),
      errors,screenshotBefore:qid+'-before.png',screenshotAfter:qid+'-after.png'});
    await context.close();
  }
  report.status=report.questions.length===3&&report.questions.every(q=>q.fit&&!q.errors.length&&q.httpStatus===200)
    ?'PASS_EXPERIMENT_NOT_RELEASE':'FAIL_EXPERIMENT';
} catch(error){
  report.status='FAIL_EXPERIMENT';
  report.error=String(error?.stack||error);
}finally{
  await browser.close();
  await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,questions:report.questions.map(q=>({
    id:q.questionId,beforeMinRatio:Math.min(...q.before.map(t=>t.visibleRatio)),cssActuallyChanged:q.cssActuallyChanged,
    afterMinRatio:Math.min(...q.after.map(t=>t.visibleRatio)),afterAllTargetsClickable:q.fit
  })),error:report.error||null}));
}
if(report.status!=='PASS_EXPERIMENT_NOT_RELEASE')process.exitCode=1;
