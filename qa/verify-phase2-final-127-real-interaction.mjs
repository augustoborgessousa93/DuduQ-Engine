#!/usr/bin/env node
/**
 * ONE directed real-interaction gate against archived 127-ID compiled QA bundle.
 * User gestures only. No runtime mutation, no forced clicks, no invented gabaritos.
 * Memory: real flip. Bubble: real pointer hit and feedback.
 * Deliberately does NOT certify all 600 gameplay cycles or pedagogy.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {collectQuestionMediaUsages} from './media-binding-usage-guard.mjs';

const root=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const meta=JSON.parse(await readFile('qa/results/phase2-visual-quarantine.json','utf8'));
assert.equal(meta.verifiedContracts,600);
assert.equal(meta.remainingChangedMediaIds,127);
const registry=JSON.parse(await readFile(path.join(root,'content/english/media/media-registry.json'),'utf8'));
const updated=new Set(registry.entries.filter(e=>e.replacementAudit?.qaOnly===true).map(e=>e.mediaId));
assert(updated.size>=127,'NOT_THE_127_ID_CANDIDATE');
const samples={'memory-quest':[],'bubble-pop':[]};
const seenIds=new Set(),usages=new Map();
for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
 const mm=String(module).padStart(2,'0');
 const p='content/english/year-'+year+'/module-'+mm+'/questions.json';
 const doc=JSON.parse(await readFile(path.join(root,p),'utf8'));
 assert.equal(doc.items?.length,20,'NOT_20_QUESTIONS:'+p);
 for(const q of doc.items){
  collectQuestionMediaUsages(q,usages);
  const inMechanic=samples[q.mechanicId];
  if(!inMechanic||seenIds.has(q.item_id))continue;
  const raw=JSON.stringify(q);
  if([...updated].some(id=>raw.includes(id))){
   seenIds.add(q.item_id);
   inMechanic.push(q.item_id);
  }
 }
}
const chosen=process.env.DUDUQ_QA_ONLY_BUBBLE==='1'?
 samples['bubble-pop'].slice(0,2):
 [...samples['memory-quest'].slice(0,2),...samples['bubble-pop'].slice(0,2)];
assert(chosen.length>=2,'NO_AFFECTED_MECHANIC_SAMPLES');
const cases=[],dir='qa/results/phase2-127-real-interaction';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const vp of [{width:390,height:844},{width:1280,height:800}]){
  const context=await browser.newContext({viewport:vp,hasTouch:vp.width===390,deviceScaleFactor:1});
  for(const id of chosen){
   const qYear=id[1],mm=id.slice(3,5);
   const doc=JSON.parse(await readFile(path.join(root,'content/english/year-'+qYear+
      '/module-'+mm+'/questions.json'),'utf8'));
   const q=doc.items.find(x=>x.item_id===id);
   assert(q,'QUESTION_MISSING:'+id);
   const mech=q.mechanicId;
   const row={questionId:id,mechanic:mech,viewport:vp.width,
    route:'/play/'+mech+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+
     '&qaSeed=phase2-final-real-interaction',
    ready:false,realInteractionObserved:false,status:'RUNNING',
    pageErrors:[],failedRequests:[],limitation:null};
   cases.push(row);
   const page=await context.newPage();
   page.on('pageerror',e=>row.pageErrors.push(String(e.message||e)));
   page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400&&!r.url().includes('favicon.ico'))
     row.failedRequests.push(r.status()+' '+r.url())});
   try{
    const resp=await page.goto(base+row.route,{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(resp?.status(),200,'GAME_HTTP_NOT_200');
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',
       null,{timeout:38000,polling:250});
    row.ready=true;
    // These Gold Masters can render in nested iframes. The host #game
    // reaches READY before we search the child frame's actual DOM. A
    // document-only locator is not evidence that the mechanic is missing.
    const selector=mech==='memory-quest'?'.memory-quest-card-slot':'.bubble-pop-playable';
    let gameFrame=null;
    for(let tick=0;tick<35&&!gameFrame;tick++){
     for(const frame of page.frames()){
      if(await frame.locator(selector).count().catch(()=>0)>0){
       gameFrame=frame;
       break;
      }
     }
     if(!gameFrame)await page.waitForTimeout(250);
    }
    assert(gameFrame,'REAL_MECHANIC_FRAME_NOT_FOUND:'+mech);
    row.mechanicFrame=gameFrame.url();
    row.scope='STANDALONE_MECHANIC_DEMO_NOT_CURRICULAR_QUESTION_ANSWER_CERTIFICATION';
    row.frameCount=page.frames().length;
    if(mech==='memory-quest'){
     const cards=gameFrame.locator('.memory-quest-card-slot');
     await cards.first().waitFor({state:'visible',timeout:9000});
     row.cards=await cards.count();
     assert(row.cards>=6,'MEMORY_CARDS_MISSING');
     const first=cards.first(),idAttr=await first.getAttribute('data-memory-card-component');
     await first.click({timeout:8000});
     await gameFrame.waitForFunction(cardId=>{
      const el=[...document.querySelectorAll('.memory-quest-card-slot')]
       .find(x=>x.getAttribute('data-memory-card-component')===cardId);
      return el?.dataset.flipped==='true'&&el?.getAttribute('aria-pressed')==='true';
     },idAttr,{timeout:3500,polling:80});
     row.realInteractionObserved=true;
     row.interactionType='REAL_MEMORY_CARD_FLIP';
    }else if(mech==='bubble-pop'){
     const bubbles=gameFrame.locator('.bubble-pop-playable');
     await bubbles.first().waitFor({state:'visible',timeout:9000});
     row.bubbleCount=await bubbles.count();
     assert(row.bubbleCount>=1,'NO_REAL_PLAYABLE_BUBBLE_VISIBLE');
     // Playwright performs genuine pointer input inside the correct iframe.
     // Never use force=true, DOM dispatchEvent or a mocked answer.
     for(let attempt=0;attempt<2&&!row.realInteractionObserved;attempt++){
      const count=await bubbles.count();
      for(let i=0;i<count&&!row.realInteractionObserved;i++){
       const button=bubbles.nth(i);
       if(!await button.isVisible().catch(()=>false))continue;
       if(await button.isDisabled().catch(()=>true))continue;
       try{await button.click({timeout:2200});}
       catch(e){row.lastClickError=String(e.message||e).slice(0,180);continue;}
       try{
        // The standalone Bubble demo responds to native pointerdown by
        // disabling the clicked button immediately (beginPop).
        const bubbleId=await button.getAttribute('data-bubble-id');
        await gameFrame.waitForFunction(id=>{
         const item=[...document.querySelectorAll('.bubble-pop-playable')]
          .find(x=>x.dataset.bubbleId===id);
         return item?.disabled===true&&item?.style.pointerEvents==='none';
        },bubbleId,{timeout:1400,polling:30});
        row.realInteractionObserved=true;
       }catch{}
       row.clickAttempts=(row.clickAttempts||0)+1;
      }
      if(!row.realInteractionObserved)await page.waitForTimeout(250);
     }
     row.interactionType='REAL_STANDALONE_BUBBLE_POINTER_DOWN_BEGIN_POP';
     if(!row.realInteractionObserved)row.limitation='NO_VERIFIED_DISABLED_POP_STATE_AFTER_GENUINE_BUBBLE_CLICKS';
    }else throw Error('UNSUPPORTED_MECHANIC:'+mech);
   }catch(e){row.limitation=String(e.message||e).slice(0,290);}
   row.status=row.ready&&row.realInteractionObserved&&row.pageErrors.length===0&&
    row.failedRequests.length===0?'PASS_REAL_USER_INTERACTION':'FAIL_REAL_USER_INTERACTION';
   try{await page.screenshot({path:dir+'/'+id+'-'+vp.width+'.png',fullPage:false})}catch{}
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close()}
const failed=cases.filter(x=>x.status!=='PASS_REAL_USER_INTERACTION');
const result={schemaVersion:'DUDUQ_PHASE2_127_REAL_USER_INTERACTION_REVIEW_V1',
 onlyBubbleRechecked:process.env.DUDUQ_QA_ONLY_BUBBLE==='1',
 status:failed.length?'FAIL_STANDALONE_MECHANIC_INTERACTION':'PASS_STANDALONE_MECHANIC_INTERACTION_ONLY',
 candidateChangedMediaIds:127,verifiedQuestionContracts:600,
 selectedQuestions:chosen,checks:cases.length,failed:failed.map(x=>({
  id:x.questionId,mechanic:x.mechanic,viewport:x.viewport,limitation:x.limitation,
  pageErrors:x.pageErrors,failedRequests:x.failedRequests})),
 cases,sourceArchiveRunId:41549957803,
 pedagogicalApproved:false,fullGameplayCertified:false,productionDeployed:false,releaseApproved:false,
 curricularQuestionGameplayCertified:false,
 scope:'Standalone /play/<mechanic>/ demos test actual browser mechanics only, not compiled curricular option semantics'};
await writeFile('qa/results/phase2-127-real-interaction.json',JSON.stringify(result,null,2)+'\n');
console.log('PHASE2_REAL_USER_INTERACTION='+JSON.stringify({
 status:result.status,checks:result.checks,affectedQuestionSamples:chosen,
 failed:result.failed,productionDeployed:false}));
assert.equal(failed.length,0,'REAL_USER_INTERACTION_NOT_CONFIRMED');
