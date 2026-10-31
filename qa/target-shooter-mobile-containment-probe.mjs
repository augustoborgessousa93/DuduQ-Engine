#!/usr/bin/env node
// Read-only QA experiment: centered mobile targets without Gold Master edits.
// An experimental pass NEVER changes a release gate or media approval.
import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';

const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const output=path.resolve('qa/results/target-shooter-mobile-containment');
await mkdir(output,{recursive:true});
// Keep the live-browser hypothesis and QA-only compiled candidate byte-identical.
const candidateCSS=await readFile('qa/overlays/target-shooter-mobile-hitbox-reflow-v2.css','utf8');
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
    className:el.className,locked:el.classList.contains('duduq-interaction-locked'),
    pointerEvents:style.pointerEvents,hitTag:hit?.tagName||null,
    hitClassName:typeof hit?.className==='string'?hit.className:'',
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
    // Target Shooter intentionally locks choices until the instruction audio
    // completes. The previous probe never used the visible audio control, so
    // it reported LOCKED even when desktop real-pointer gameplay passed.
    // Follow the same real-user audio entry flow; never remove the lock class,
    // dispatch synthetic events, or call engine internals to manufacture READY.
    const audioActions=[];
    const waitReady=timeout=>page.waitForFunction(()=>{
      const game=document.querySelector('#game');
      return game?.dataset.duduqInteractionState==='READY';
    },null,{timeout}).then(()=>true,()=>false);
    let userFlowReady=await waitReady(1000);
    if(!userFlowReady){
      const audio=page.locator('.audio-button').first();
      for(let attempt=1;attempt<=2&&!userFlowReady;attempt++){
        try{
          await audio.waitFor({state:'visible',timeout:10000});
          await audio.click({timeout:10000}); // Playwright native pointer input
          audioActions.push({attempt,input:'PLAYWRIGHT_NATIVE_POINTER',visibleControl:true});
          userFlowReady=await waitReady(12000);
        }catch(error){
          audioActions.push({attempt,input:'PLAYWRIGHT_NATIVE_POINTER',error:String(error?.message||error)});
          break;
        }
      }
    }
    const unlocked=await page.waitForFunction(()=>{
      const nodes=[...document.querySelectorAll('.target-shooter-target')];
      return nodes.length===4&&nodes.every(n=>!n.classList.contains('duduq-interaction-locked'));
    },null,{timeout:6000}).then(()=>true,()=>false);
    const after=await assess(page);
    const cssMediaAfter=await page.evaluate(()=>matchMedia('(max-width:520px)').matches);
    const engineState=await page.locator('#game').getAttribute('data-duduq-interaction-state');
    await page.screenshot({path:path.join(output,qid+'-after.png'),fullPage:false});
    const visualFit=after.length===4 && after.every(t=>t.visibleRatio>=0.98 &&
      t.width>=44 && t.height>=44);
    const interactiveFit=userFlowReady&&unlocked&&after.every(t=>t.centerHit&&t.pointerEvents!=='none');
    const fit=visualFit&&interactiveFit;
    report.questions.push({questionId:qid,route,httpStatus:response?.status()||null,
      before,after,fit,visualFit,interactiveFit,unlocked,userFlowReady,audioActions,engineState,
      cssMediaBefore,cssMediaAfter,cssActuallyChanged:after.some((t,i)=>Math.abs(t.x-before[i].x)>1),
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
    afterMinRatio:Math.min(...q.after.map(t=>t.visibleRatio)),afterAllTargetsClickable:q.interactiveFit,visualFit:q.visualFit,unlocked:q.unlocked,userFlowReady:q.userFlowReady,audioActions:q.audioActions,engineState:q.engineState
  })),error:report.error||null}));
}
if(report.status!=='PASS_EXPERIMENT_NOT_RELEASE')process.exitCode=1;
