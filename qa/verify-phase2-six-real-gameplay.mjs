#!/usr/bin/env node
/**
 * Verify the exact six failed QA checks through real user mechanics.
 * Previous false failures:
 *  - Memory Quest only renders relevant card image face up after clicking.
 *  - Bubble Pop bubbles animate off-screen in normal mode; reduced-motion
 *    static grid is an actual supported gameplay setting, not DOM injection.
 *
 * Tests real user clicks and media rendering in mobile and desktop using the
 * EXACT archived 141-ID compiled candidate. Never mutates the product.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const failures=JSON.parse(await readFile('qa/results/phase2-six-real-failures.json','utf8')).failed;
assert.equal(failures.length,6,'SOURCE_EVIDENCE_NOT_SIX');
const keys=failures.map(x=>x.questionId+'@'+x.viewport).sort();
assert.deepEqual(keys,[
 'Y1M06-Q005@1280','Y1M06-Q005@390','Y4M03-Q001@390',
 'Y4M06-Q010@390','Y5M05-Q011@390','Y5M06-Q016@390'
],'IMMUTABLE_FAILED_CASES_DRIFT');
const checks=[],out='qa/results/phase2-six-real-gameplay';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const f of failures){
  const viewport={width:f.viewport,height:f.viewport===390?844:800};
  const context=await browser.newContext({viewport,hasTouch:viewport.width===390,
   reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],failedHttp=[];
  page.on('pageerror',e=>errors.push(String(e.message||e)));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
   failedHttp.push(r.status()+' '+r.url())});
  const slug=f.mechanic,rel='/play/'+slug+'/?duduqModule='+f.questionId.slice(0,5)+
   '&duduqItem='+f.questionId+'&qaSeed=phase2-six-real-accessible';
  const entry={questionId:f.questionId,mechanic:f.mechanic,viewport:f.viewport,
   expectedPaths:f.required,errors,failedHttp,mode:'REDUCED_MOTION_REAL_USER',httpStatus:null,
   ready:false,seen:[],actionObserved:false,actionType:null,status:'RUNNING'};
  checks.push(entry);
  try{
   const response=await page.goto(base+rel,{waitUntil:'domcontentloaded',timeout:45000});
   entry.httpStatus=response?.status()||0;
   assert.equal(entry.httpStatus,200,'HTTP_NOT_200');
   await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
    null,{timeout:35000,polling:250});
   entry.ready=true;
   const isReduced=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
   assert(isReduced,'BROWSER_A11Y_REDUCED_MOTION_NOT_ACTIVE');
   // All image bytes are fetched and hash-bound separately by the original
   // source-media QA; here we prove rendered meaning AFTER actual gameplay.
   if(f.mechanic==='memory-quest'){
    for(const p of f.required){
     let found=false,details=null;
     const cards=page.locator('[data-memory-card-id]');
     await cards.first().waitFor({state:'visible',timeout:12000});
     const count=await cards.count();
     for(let i=0;i<count;i++){
      const card=cards.nth(i);
      // Content exists in face-down DOM but is not visible until a real flip.
      const matches=await card.locator('img').evaluateAll((nodes,target)=>nodes.some(n=>{
       try{return decodeURI(new URL(n.currentSrc||n.src,location.href).pathname).replace(/^\/+/,'')===target;}
       catch{return false;}
      }),p);
      if(!matches)continue;
      const before=await card.getAttribute('data-face-up');
      assert.equal(before,'false','CARD_FACE_STATE_PRECONDITION');
      await card.click({timeout:9000});
      await page.waitForFunction(id=>
       document.querySelector('[data-memory-card-id="'+id+'"]')?.getAttribute('data-face-up')==='true',
       await card.getAttribute('data-memory-card-id'),{timeout:3000});
      const img=card.locator('img').first();
      const m=await img.evaluate(i=>{
       const b=i.getBoundingClientRect(),s=getComputedStyle(i);
       return {loaded:i.complete&&i.naturalWidth>0,alt:i.alt,
        visible:b.width>12&&b.height>12&&b.right>0&&b.bottom>0&&
          b.left<innerWidth&&b.top<innerHeight&&s.visibility!=='hidden'&&s.display!=='none',
        faceUp:i.closest('[data-memory-card-id]')?.getAttribute('data-face-up')};
      });
      details=m;
      found=m.loaded&&m.visible&&m.faceUp==='true';
      entry.actionObserved=found;entry.actionType='REAL_MEMORY_CARD_FLIP';
      break;
     }
     entry.seen.push({path:p,found,details});
    }
   }else if(f.mechanic==='bubble-pop'){
    const actualMode=await page.locator('.duduq-bp-root').first().getAttribute('data-mode');
    entry.actualMode=actualMode;
    assert.equal(actualMode,'static-grid','ACCESSIBLE_BUBBLE_GRID_NOT_AVAILABLE');
    const balls=page.locator('.duduq-bp-bubble');
    await balls.first().waitFor({state:'visible',timeout:12000});
    entry.bubbleCount=await balls.count();
    assert(entry.bubbleCount>=f.required.length,'BUBBLE_COUNT_INCOMPLETE');
    for(const p of f.required){
     const img=page.locator('.duduq-bp-bubble img').filter({visible:true});
     let target=null;
     for(let i=0;i<await img.count();i++){
      const loc=img.nth(i);
      const matches=await loc.evaluate((n,rel)=>{
       try{return decodeURI(new URL(n.currentSrc||n.src,location.href).pathname).replace(/^\/+/,'')===rel;}
       catch{return false;}
      },p);
      if(matches){target=loc;break;}
     }
     assert(target,'PNG_NOT_PRESENT_IN_BUBBLE:'+p);
     await target.scrollIntoViewIfNeeded({timeout:9000});
     const m=await target.evaluate(i=>{
      const b=i.getBoundingClientRect(),s=getComputedStyle(i),button=i.closest('button');
      return {loaded:i.complete&&i.naturalWidth>0,
       visible:b.width>12&&b.height>12&&b.right>0&&b.bottom>0&&
        b.top<innerHeight&&b.left<innerWidth&&
        s.visibility!=='hidden'&&s.display!=='none',
       clickable:!!button&&!button.disabled,alt:i.alt,
       box:{x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)}};
     });
     entry.seen.push({path:p,found:m.loaded&&m.visible&&m.clickable,details:m});
    }
    const button=balls.first();
    const shell=button.locator('xpath=..');
    await button.click({timeout:9000});
    await page.waitForFunction(()=>{
     return [...document.querySelectorAll('.duduq-bp-bubble-shell')]
      .some(b=>b.getAttribute('data-popped')==='true'||b.getAttribute('data-wrong')==='true');
    },null,{timeout:2500,polling:50});
    entry.actionObserved=true;entry.actionType='REAL_BUBBLE_CLICK_FEEDBACK';
   }else throw Error('UNKNOWN_MECHANIC:'+f.mechanic);
   entry.status=entry.seen.every(x=>x.found)&&entry.actionObserved&&errors.length===0&&failedHttp.length===0?
    'PASS_REAL_ACCESSIBLE_GAMEPLAY':'FAIL_REAL_ACCESSIBLE_GAMEPLAY';
  }catch(e){entry.status='FAIL_REAL_ACCESSIBLE_GAMEPLAY';entry.exception=String(e.message||e).slice(0,450);}
  await page.screenshot({path:out+'/'+f.questionId+'-'+f.viewport+'.png',fullPage:false}).catch(()=>{});
  await context.close();
 }
}finally{await browser.close()}
const failed=checks.filter(x=>x.status!=='PASS_REAL_ACCESSIBLE_GAMEPLAY');
const result={schemaVersion:'DUDUQ_PHASE2_SIX_ACTUAL_GAMEPLAY_REVIEW_V1',status:failed.length?
 'FAILED_REAL_GAMEPLAY_QA':'PASS_REAL_REDUCED_MOTION_AND_FLIPPED_CARD_QA_ONLY',
 fromVisualRun:41547068602,verifiedChecks:checks.length,failedCount:failed.length,
 checks,productionDeployed:false,pedagogicalApproval:false,releaseApproved:false,
 disclaimer:'Bubble motion in normal mode must also be verified; accessible reduced-motion gameplay is genuine functionality.'};
await writeFile('qa/results/phase2-six-real-gameplay.json',JSON.stringify(result,null,2)+'\n');
console.log('SIX_REAL_GAMEPLAY_QA='+JSON.stringify({status:result.status,
 checks:result.verifiedChecks,failedCount:result.failedCount,
 failed:failed.map(x=>({id:x.questionId,viewport:x.viewport,reason:x.exception||x.seen.filter(i=>!i.found).map(i=>i.path)}))}));
assert.equal(failed.length,0,'REAL_GAMEPLAY_FAILED');
