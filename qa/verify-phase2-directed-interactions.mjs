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
     // The compiled contract for Y2M02-Q011 was independently inspected in
     // QA artifact 13161047415: I1 belongs to T1, not the first DOM target T2.
     // This is a QA-only fixture, never a mutation of the student's answer key.
     // Fail closed if the fixture no longer matches the compiled DOM.
     const verifiedQ011=id==='Y2M02-Q011';
     if(verifiedQ011)assert.equal(sourceId,'Y2M02-Q011-I1','Q011_VERIFIED_SOURCE_DRIFT');
     const verifiedTarget=verifiedQ011?'Y2M02-Q011-T1':null;
     const verifiedIndex=verifiedTarget===null?-1:await destinations.evaluateAll(
      (nodes,target)=>nodes.findIndex(n=>n.getAttribute('data-drop-target-id')===target),
      verifiedTarget
     );
     if(verifiedQ011&&verifiedIndex<0){
      entry.limitations.push('VERIFIED_CONTRACT_TARGET_NOT_IN_DOM:'+verifiedTarget);
      continue;
     }
     if(verifiedQ011)entry.verifiedContractPair={sourceId,targetId:verifiedTarget,evidence:'artifact-13161047415'};
     // Other questions still receive exploratory probes, NOT answer certification.
     const probeIndices=verifiedQ011?[verifiedIndex]:Array.from({length:count},(_,i)=>i);
     if(id==='Y3M06-Q005'||id==='Y4M05-Q006')entry.compiledQuestionForDiagnosis=q;
     // Observe the real event chain for the unresolved multimedia case. Passive
     // capture listeners are diagnostic only: they never prevent or synthesize input.
     if(id==='Y2M02-Q011')await page.evaluate(()=>{
      window.__duduqQaDragEvents=[];
      const types=['pointerdown','pointermove','pointerup','dragstart','dragenter','dragover','drop','dragend','touchstart','touchend'];
      for(const type of types)document.addEventListener(type,event=>{
       const events=window.__duduqQaDragEvents;
       if(events.length>=100)return;
       if(type==='pointermove'&&events.filter(e=>e.type==='pointermove').length>=5)return;
       const el=event.target;
       events.push({type,tag:el?.tagName||null,
        itemId:el?.closest?.('[data-item-id]')?.getAttribute('data-item-id')||null,
        dropId:el?.closest?.('[data-drop-target-id]')?.getAttribute('data-drop-target-id')||null,
        trusted:event.isTrusted,at:Math.round(performance.now())});
      },{capture:true,passive:true});
     });
     for(const i of probeIndices){
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
      const sourceHit=await page.evaluate(p=>{
       const el=document.elementFromPoint(p.x,p.y);
       return {tag:el?.tagName||null,className:String(el?.className||'').slice(0,120),
        itemId:el?.closest?.('[data-item-id]')?.getAttribute('data-item-id')||null,
        insideAudioControl:!!el?.closest?.('.audio-button,button,[role="button"]'),
        draggable:el?.closest?.('[draggable]')?.getAttribute('draggable')||null};
      },start);
      const idsBefore=await destination.locator('[data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-item-id')));
      await page.mouse.move(start.x,start.y,{steps:3});
      await page.mouse.down();
      await page.mouse.move(finish.x,finish.y,{steps:20});
      await page.mouse.up();
      entry.inputAttempted=true;
      await page.waitForTimeout(650);
      const idsAfter=await destination.locator('[data-item-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-item-id')));
      const placed=!idsBefore.includes(sourceId)&&idsAfter.includes(sourceId);
      entry.dragAttempts.push({sourceId,destinationIndex:i,destinationId:await destination.getAttribute('data-drop-target-id'),source:start,destination:finish,sourceHit,hit,idsBefore,idsAfter,placed});
      if(placed){
       entry.inputObserved=true;
       entry.drag=entry.dragAttempts[entry.dragAttempts.length-1];
       break;
      }
      // A rejected category can leave the game READY with no feedback button.
      // In that case try the next visible category: missing "Tentar de novo"
      // is NOT evidence of a broken drag-drop mechanic. Y4M05-Q006's
      // first source was probed against CLOTHES, but FOODS is also visible.
      const gateAfterDrop=await page.locator('#game').getAttribute('data-duduq-interaction-state');
      const sourceStillVisible=await source.isVisible().catch(()=>false);
      entry.dragAttempts[entry.dragAttempts.length-1].gateAfterDrop=gateAfterDrop;
      if(gateAfterDrop==='READY'&&sourceStillVisible){
       entry.dragAttempts[entry.dragAttempts.length-1].nextCategoryProbe='READY_NO_RETRY_REQUIRED';
       continue;
      }
      // A wrong category can temporarily lock input without showing retry; await READY before probing the next category.
      // Recover through the visible game control; never bypass its state gate.
      let readyAgain=false;
      try{
       await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:12000});
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
       // A late READY transition can happen after the retry-label timeout.
       // Inspect the real state before treating the probe as blocked.
       const lateGate=await page.locator('#game').getAttribute('data-duduq-interaction-state');
       if(lateGate==='READY'&&await source.isVisible().catch(()=>false)){
        entry.dragAttempts[entry.dragAttempts.length-1].nextCategoryProbe='LATE_READY_NO_RETRY_REQUIRED';
        continue;
       }
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
       await writeFile(out+'/'+id+'-failed-drop-dom.json',JSON.stringify(entry.failedDropDiagnostic,null,2)+'\n');
       try{await page.screenshot({path:out+'/'+id+'-failed-drop.png',fullPage:true})}catch{}
       break;
      }
     }
     if(!entry.inputObserved&&id==='Y2M02-Q011'){
      // Capture the unresolved case even if the game remains READY and no retry
      // control appears. Prior QA captured the DOM only after a gate timeout.
      entry.q011DragDiagnostic=await page.evaluate(()=>{
       const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};
       const describe=el=>({id:el.getAttribute('data-item-id'),targetId:el.getAttribute('data-drop-target-id'),
        text:(el.innerText||'').slice(0,120),rect:rect(el)});
       return {gameState:document.querySelector('#game')?.dataset.duduqInteractionState||null,
        events:window.__duduqQaDragEvents||[],
        sources:[...document.querySelectorAll('.dnd-multimedia-drag-word-bank [data-item-id]')].map(describe),
        destinations:[...document.querySelectorAll('[data-drop-target-id]')].map(describe),
        visibleFeedback:[...document.querySelectorAll('[class*="feedback"]')]
         .filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0})
         .slice(0,15).map(el=>({text:(el.innerText||'').slice(0,120),rect:rect(el)}))};
      }).catch(e=>({captureError:String(e)}));
      await writeFile(out+'/'+id+'-pointer-chain.json',JSON.stringify({contractPair:entry.verifiedContractPair,
       attempts:entry.dragAttempts,diagnostic:entry.q011DragDiagnostic},null,2)+'\\n');
      try{await page.screenshot({path:out+'/'+id+'-pointer-chain.png',fullPage:true})}catch{}
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
