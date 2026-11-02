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
   // A click is not proof of audio playback or pronunciation quality.
   const selector=Object.entries(selectors).find(([name])=>mechanic===name||mechanic.startsWith(name+'-'))?.[1];
   if(!selector){
    entry.limitations.push('NO_MECHANIC_SPECIFIC_POINTER_ADAPTER');
    continue;
   }
   if(mechanic.startsWith('drag-drop')){
    const multi=mechanic==='drag-drop-multimedia';
    const source=page.locator(multi?'.dnd-multimedia-drag-word-bank [data-item-id]':'.dnd-image-card-row .dnd-option-image-card[data-item-id]').first();
    const destination=page.locator(multi?'[data-drop-target-id]':'.dnd-options-cards-group__category').first();
    try{
     await source.waitFor({state:'visible',timeout:10000});
     await destination.waitFor({state:'visible',timeout:10000});
     const from=await source.boundingBox(),to=await destination.boundingBox();
     assert(from&&to&&from.width>15&&to.width>15,'DRAG_SOURCE_OR_TARGET_NOT_VISIBLE');
     const start={x:from.x+from.width/2,y:from.y+from.height/2};
     const end={x:to.x+to.width/2,y:to.y+to.height/2};
     const before=await destination.locator('[data-item-id]').count();
     await page.mouse.move(start.x,start.y,{steps:3});
     await page.mouse.down();
     await page.mouse.move(end.x,end.y,{steps:16});
     await page.mouse.up();
     entry.inputAttempted=true;
     await page.waitForTimeout(650);
     const after=await destination.locator('[data-item-id]').count();
     entry.drag={source:start,destination:end,before,after};
     entry.inputObserved=after>before;
     if(!entry.inputObserved)entry.limitations.push('POINTER_DRAG_DID_NOT_PROVE_PLACEMENT');
    }catch(e){entry.limitations.push('DRAG_PROBE_ERROR:'+String(e.message||e).slice(0,220))}
    continue;
   }
   if(mechanic==='target-shooter'){
    try{
     await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:30000});
     entry.audioGateReady=true;
    }catch{
     entry.limitations.push('AUDIO_GATE_NOT_READY_AFTER_30_SECONDS');
     continue;
    }
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
 targetOcclusions:cases.filter(x=>x.limitations.includes('TARGET_OCCLUDED_AT_CENTER')).length,
 pageErrors:cases.reduce((n,x)=>n+x.pageErrors.length,0),
 requestFailures:cases.reduce((n,x)=>n+x.requestFailures.length,0),
 incomplete:cases.filter(x=>!x.inputObserved).map(x=>({id:x.questionId,mechanic:x.mechanic,limitations:x.limitations,error:x.error||null}))};
const report={schemaVersion:'DUDUQ_PHASE2_DIRECTED_INTERACTION_RECON_V1',status:'DIAGNOSTIC_ONLY_NOT_GAMEPLAY_CERTIFICATION',...totals,cases,productionDeployed:false,pedagogicalQaApproved:false};
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,questions:totals.questions,mechanics:totals.mechanics,realPointerAttempts:totals.realPointerAttempts,observableStateChanges:totals.observableStateChanges,occlusions:totals.targetOcclusions,pageErrors:totals.pageErrors,incomplete:totals.incomplete}));
assert.equal(totals.questions,ids.length);
assert.equal(totals.pageErrors,0,'JS_ERRORS_IN_AFFECTED_QUESTIONS');
assert.equal(totals.targetOcclusions,0,'POINTER_OCCLUSION_IN_AFFECTED_QUESTIONS');
