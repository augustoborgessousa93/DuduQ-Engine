#!/usr/bin/env node
/**
 * Directed, QA-only interaction reconnaissance for the actual changed Phase 2 questions.
 * This does not certify answers or audio pronunciation. It never changes the build.
 */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.resolve('qa/dist-pages-food-candidate');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const food=JSON.parse(await readFile('qa/results/phase2-food-qa-patch.json','utf8'));
const banana=JSON.parse(await readFile('qa/results/phase2-banana-qa-patch.json','utf8'));
assert.equal(food.verifiedQuestionContracts,600);
assert.equal(food.productionDeployed,false);
assert.equal(banana.productionDeployed,false);
const ids=[...new Set([...food.changedQuestionIds,...banana.changedQuestionIds])].sort();
assert(ids.length>=13,'AFFECTED_QUESTION_SET_REGRESSED');
const selectors={
 'target-shooter':'.target-shooter-target',
 'matching':'.matching-card, .matching-tile, .matching-option, [data-matching-id]',
 'memory-quest':'.memory-card, .memory-quest-card, [data-memory-card]',
 'smart-sentence':'.smart-sentence-token, .sentence-token, .word-chip, .word-option',
 'drag-drop':'.drag-item, .drag-drop-item, [draggable="true"], [data-draggable]',
 'drag-drop-multimedia':'.drag-item, .drag-drop-item, [draggable="true"], [data-draggable]'
};
const out='qa/results/phase2-directed-interactions';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const cases=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true});
 for(const id of ids){
  const year=Number(id[1]),mm=id.slice(3,5),module=id.slice(0,5);
  const data=JSON.parse(await readFile(path.join(root,'content/english/year-'+year+'/module-'+mm+'/questions.json'),'utf8'));
  const q=data.items.find(item=>item.item_id===id);
  assert(q?.mechanicId,'QUESTION_NOT_FOUND:'+id);
  const mechanic=q.mechanicId;
  const slug=mechanic.startsWith('smart-sentence')?'smart-sentence':mechanic;
  const entry={questionId:id,mechanic,route:'/play/'+slug+'/?duduqModule='+module+'&duduqItem='+id+'&qaSeed=phase2-interaction',inputAttempted:false,inputObserved:false,limitations:[],pageErrors:[],requestFailures:[]};
  cases.push(entry);
  const page=await context.newPage();
  page.on('pageerror',e=>entry.pageErrors.push(String(e.message||e)));
  page.on('requestfailed',r=>{const e=r.failure()?.errorText||'';if(!e.includes('ERR_ABORTED'))entry.requestFailures.push({url:r.url(),error:e})});
  try{
   const response=await page.goto(base+entry.route,{waitUntil:'domcontentloaded',timeout:45000});
   entry.httpStatus=response?.status()||0;
   assert.equal(entry.httpStatus,200,'HTTP_NOT_200');
   await page.waitForTimeout(450);
   const audio=page.locator('.audio-button').first();
   if(await audio.count()&&await audio.isVisible()){
    try{await audio.click({timeout:5000});entry.audioControlClicked=true}
    catch(e){entry.limitations.push('AUDIO_CONTROL_NOT_CLICKABLE:'+String(e.message||e).slice(0,160))}
   }else entry.limitations.push('NO_VISIBLE_AUDIO_CONTROL');
   // The required instruction narration locks ALL mechanic input until READY.
   // Clicking during audio playback produces a false pointer-occlusion diagnosis.
   try{
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:35000});
    entry.audioGateReady=true;
   }catch{
    entry.limitations.push('REQUIRED_AUDIO_GATE_NOT_READY');
    continue;
   }
   // A click is not proof of audio playback or pronunciation quality.
   const selector=Object.entries(selectors).find(([name])=>mechanic===name||mechanic.startsWith(name+'-'))?.[1];
   if(!selector){
    entry.limitations.push('NO_MECHANIC_SPECIFIC_POINTER_ADAPTER');
    continue;
   }
   if(mechanic.startsWith('drag-drop')){
    const multi=mechanic==='drag-drop-multimedia';
    const sources=page.locator(multi?'.dnd-multimedia-drag-word-bank [data-item-id]':'.dnd-image-card-row .dnd-option-image-card[data-item-id]');
    const destinations=page.locator(multi?'[data-drop-target-id]':'.dnd-options-cards-group__category');
    entry.dragAttempts=[];
    try{
     await sources.first().waitFor({state:'visible',timeout:10000});
     await destinations.first().waitFor({state:'visible',timeout:10000});
     // A category's first drop zone is not necessarily correct for the first
     // source. Probe other visible zones before diagnosing a broken mechanic.
     // No answer key is inferred; this only establishes a real DOM placement.
     const source=sources.first();
     const sourceId=await source.getAttribute('data-item-id');
     assert(sourceId,'DRAG_SOURCE_MISSING_ITEM_ID');
     const count=Math.min(await destinations.count(),8);
     for(let i=0;i<count;i++){
      const destination=destinations.nth(i);
      if(!await destination.isVisible().catch(()=>false))continue;
      const ready=await page.locator('#game').getAttribute('data-duduq-interaction-state');
      if(ready!=='READY'){
       entry.limitations.push('DRAG_RETRY_BLOCKED_BY_INTERACTION_GATE:'+String(ready));
       break;
      }
      if(!await source.isVisible().catch(()=>false)){
       entry.limitations.push('DRAG_SOURCE_NO_LONGER_VISIBLE');
       break;
      }
      const from=await source.boundingBox(),to=await destination.boundingBox();
      if(!from||!to||from.width<=15||to.width<=15)continue;
      const start={x:from.x+from.width*0.2,y:from.y+from.height/2};
      const finish={x:to.x+to.width/2,y:to.y+to.height/2};
      const hit=await page.evaluate(p=>{
       const el=document.elementFromPoint(p.x,p.y);
       return {tag:el?.tagName||null,className:String(el?.className||'').slice(0,120)};
      },finish);
      const idsBefore=await destination.locator('[data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-item-id')));
      await page.mouse.move(start.x,start.y,{steps:3});
      await page.mouse.down();
      await page.mouse.move(finish.x,finish.y,{steps:20});
      await page.mouse.up();
      entry.inputAttempted=true;
      await page.waitForTimeout(650);
      const idsAfter=await destination.locator('[data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-item-id')));
      const placed=!idsBefore.includes(sourceId)&&idsAfter.includes(sourceId);
      entry.dragAttempts.push({sourceId,destinationIndex:i,destinationId:await destination.getAttribute('data-drop-target-id'),source:start,destination:finish,hit,idsBefore,idsAfter,placed});
      if(placed){
       entry.inputObserved=true;
       entry.drag=entry.dragAttempts[entry.dragAttempts.length-1];
       break;
      }
      // A wrong category can legitimately lock input until feedback/retry.
      // Recover through the visible game control; never bypass its state gate.
      let readyAgain=false;
      try{
       await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:2200});
       readyAgain=true;
      }catch{
       const retry=page.getByRole('button',{name:/tentar de novo|try again|tente novamente/i}).first();
       try{
        await retry.waitFor({state:'visible',timeout:5500});
        await retry.click({timeout:5000});
        entry.retryClicks=(entry.retryClicks||0)+1;
        await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:9000});
        readyAgain=true;
       }catch(e){
        entry.limitations.push('WRONG_DROP_RETRY_NOT_READY:'+String(e.message||e).slice(0,150));
       }
      }
      if(!readyAgain){
       // Capture actual DOM evidence instead of equating a missing retry label
       // with a mechanic failure. This is diagnostic only, never a PASS.
       entry.failedDropDiagnostic=await page.evaluate(()=>{
        const game=document.querySelector('#game');
        const visible=el=>{
         const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
         return r.width>0&&r.height>0&&cs.display!=='none'&&cs.visibility!=='hidden';
        };
        const describe=el=>({
         tag:el.tagName,
         text:(el.innerText||el.textContent||'').trim().slice(0,160),
         className:String(el.className||'').slice(0,180),
         role:el.getAttribute('role'),
         ariaLabel:el.getAttribute('aria-label'),
         disabled:el.disabled===true,
         bounds:(()=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}})()
        });
        return {
         gameState:game?.dataset.duduqInteractionState||null,
         gameAttributes:game?Object.fromEntries([...game.attributes].map(a=>[a.name,a.value])):{},
         controls:[...document.querySelectorAll('button,[role="button"],input[type="button"],input[type="submit"]')].filter(visible).slice(0,50).map(describe),
         feedback:[...document.querySelectorAll('[class*="feedback"],[role="dialog"],[aria-live]')].filter(visible).slice(0,35).map(describe),
         draggableCount:[...document.querySelectorAll('[data-item-id]')].filter(visible).length,
         dropTargets:[...document.querySelectorAll('.dnd-options-cards-group__category,[data-drop-target-id]')].filter(visible).slice(0,12).map(describe)
        };
       }).catch(e=>({captureError:String(e)}));
       if(id==='Y3M06-Q017'){
        await writeFile(out+'/'+id+'-failed-drop-dom.json',JSON.stringify(entry.failedDropDiagnostic,null,2)+'\n');
        try{await page.screenshot({path:out+'/'+id+'-failed-drop.png',fullPage:true})}catch{}
       }
       break;
      }
     }
     if(!entry.inputObserved)entry.limitations.push('POINTER_DRAG_DID_NOT_PROVE_PLACEMENT');
    }catch(e){entry.limitations.push('DRAG_PROBE_ERROR:'+String(e.message||e).slice(0,220))}
    continue;
   }
   const targets=page.locator(selector);
   const deadline=Date.now()+9000;
   let target=null;
   while(Date.now()<deadline&&!target){
    for(let i=0;i<Math.min(await targets.count(),20);i++){
     const candidate=targets.nth(i);
     if(await candidate.isVisible().catch(()=>false)){target=candidate;break}
    }
    if(!target)await page.waitForTimeout(300);
   }
   if(!target){entry.limitations.push('NO_VISIBLE_MECHANIC_TARGET');continue}
   const box=await target.boundingBox();
   if(!box||box.width<16||box.height<16){entry.limitations.push('TARGET_TOO_SMALL');continue}
   const x=box.x+box.width/2,y=box.y+box.height/2;
   const hit=await target.evaluate((el,p)=>{const n=document.elementFromPoint(p.x,p.y);return {valid:!!n&&(n===el||el.contains(n)),hitTag:n?.tagName||null,hitClass:String(n?.className||'').slice(0,150),targetPointer:getComputedStyle(el).pointerEvents,hitPointer:n?getComputedStyle(n).pointerEvents:null}},{x,y});
   entry.pointerHitTest=hit;
   if(!hit.valid){entry.limitations.push('TARGET_OCCLUDED_AT_CENTER');continue}
   const before=await target.evaluate(el=>({className:String(el.className),state:el.getAttribute('data-gameplay-state'),selected:el.getAttribute('aria-selected'),game:document.querySelector('#game')?.getAttribute('data-duduq-interaction-state'),feedback:document.querySelector('.feedback-ribbon')?.getAttribute('data-feedback')}));
   await page.mouse.move(x,y,{steps:3});
   await page.mouse.down();
   await page.mouse.up();
   entry.inputAttempted=true;
   await page.waitForTimeout(550);
   const after=await target.evaluate(el=>({className:String(el.className),state:el.getAttribute('data-gameplay-state'),selected:el.getAttribute('aria-selected'),game:document.querySelector('#game')?.getAttribute('data-duduq-interaction-state'),feedback:document.querySelector('.feedback-ribbon')?.getAttribute('data-feedback')})).catch(()=>null);
   entry.inputObserved=!!after&&JSON.stringify(before)!==JSON.stringify(after);
   entry.before=before;entry.after=after;
   if(!entry.inputObserved)entry.limitations.push('CLICK_DID_NOT_PROVE_GAMEPLAY_TRANSITION');
  }catch(e){
   entry.error=String(e?.stack||e).slice(0,1500);
  }finally{
   if(entry.error||entry.limitations.length){
    try{await page.screenshot({path:out+'/'+id+'.png',fullPage:false})}catch{}
   }
   await page.close();
  }
 }
 await context.close();
}finally{await browser.close()}
const totals={questions:cases.length,mechanics:[...new Set(cases.map(x=>x.mechanic))].sort(),
 realPointerAttempts:cases.filter(x=>x.inputAttempted).length,
 observableStateChanges:cases.filter(x=>x.inputObserved).length,
 dragTargetAttempts:cases.reduce((n,x)=>n+(x.dragAttempts?.length||0),0),
 exactDragPlacements:cases.filter(x=>x.drag?.placed===true).length,
 targetOcclusions:cases.filter(x=>x.limitations.includes('TARGET_OCCLUDED_AT_CENTER')).length,
 pageErrors:cases.reduce((n,x)=>n+x.pageErrors.length,0),
 requestFailures:cases.reduce((n,x)=>n+x.requestFailures.length,0),
 incomplete:cases.filter(x=>!x.inputObserved).map(x=>({id:x.questionId,mechanic:x.mechanic,limitations:x.limitations,error:x.error||null}))};
const report={schemaVersion:'DUDUQ_PHASE2_DIRECTED_INTERACTION_RECON_V1',status:'DIAGNOSTIC_ONLY_NOT_GAMEPLAY_CERTIFICATION',...totals,cases,productionDeployed:false,pedagogicalQaApproved:false};
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,questions:totals.questions,mechanics:totals.mechanics,realPointerAttempts:totals.realPointerAttempts,observableStateChanges:totals.observableStateChanges,dragTargetAttempts:totals.dragTargetAttempts,exactDragPlacements:totals.exactDragPlacements,occlusions:totals.targetOcclusions,pageErrors:totals.pageErrors,incomplete:totals.incomplete}));
assert.equal(totals.questions,ids.length);
assert.equal(totals.pageErrors,0,'JS_ERRORS_IN_AFFECTED_QUESTIONS');
assert.equal(totals.targetOcclusions,0,'POINTER_OCCLUSION_IN_AFFECTED_QUESTIONS');
