#!/usr/bin/env node
/**
 * DUDUQ English — seven-mechanic interactive canary on exact Last60 V29 QA.
 * Real Chromium pointer clicks and pointer drags only.
 * Canonical answerKey comes from immutable published question JSON.
 * A pass requires visible correct feedback after a real learner action.
 * No manual JS DOM injection, no fake click event, no engine state manipulation.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const viewportName=process.env.DUDUQ_QA_VIEWPORT||'desktop';
assert(['desktop','mobile'].includes(viewportName),'INVALID_VIEWPORT');
const screen=viewportName==='mobile'?{width:390,height:844}:{width:1280,height:800};
const root='qa/results/last60-gameplay-full65-'+viewportName;
mkdirSync(root+'/screenshots',{recursive:true});
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const media=JSON.parse(readFileSync('qa/results/last60-candidate-20261110.json','utf8'));
assert.equal(media.affectedQuestions.length,65);assert.equal(media.mediaIdsUpdated,60);
const qmap=new Map();
for(let y=1;y<=5;y++)for(let m=1;m<=6;m++){
 const mm=String(m).padStart(2,'0');
 const q=JSON.parse(readFileSync('dist-pages/content/english/year-'+y+'/module-'+mm+'/questions.json','utf8'));
 assert.equal(q.items.length,20);
 for(const item of q.items)qmap.set(item.item_id,item);
}
const normalizeMechanic=q=>q.mechanicId==='smart-sentence-complete'?'smart-sentence':q.mechanicId;
const cases=media.affectedQuestions.map(id=>{const q=qmap.get(id);assert(q,'ACTIVE_QUESTION_MISSING:'+id);return[normalizeMechanic(q),id]});
assert.equal(cases.length,65);
const expectedByMechanic={'matching':20,'bubble-pop':11,'target-shooter':10,'drag-drop-multimedia':10,'memory-quest':7,'smart-sentence':6,'drag-drop':1};
const actualByMechanic=Object.fromEntries(Object.keys(expectedByMechanic).map(name=>[name,cases.filter(x=>x[0]===name).length]));
assert.deepEqual(actualByMechanic,expectedByMechanic,'MECHANIC_COUNTS_DRIFT');
const FAST_FULL65=true; // 7 canaries already prove wrong/retry; each of the 65 must correctly finish.
const report={schema:'DUDUQ_LAST60_REAL_65_AFFECTED_QUESTION_GAMEPLAY_V1',
 qaOnly:true,productionDeployed:false,originalMediaBindings:60,originalQuestionContracts:600,
 expectedCanaries:65,viewportName,screen,expectedByMechanic,completedCanaries:0,passed:0,failed:0,cases:[],
 complete65GameplayCertification:false,pedagogicalApproval:false};
const save=()=>writeFileSync(root+'/report.json',JSON.stringify(report,null,2)+'\n');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
async function snap(page,result,label){
 const file=root+'/screenshots/'+result.mechanic+'-'+result.id+'-'+label+'.png';
 await page.screenshot({path:file,fullPage:false,timeout:20000}).catch(()=>{});
 result.screenshots.push(file);
}
async function realClick(locator,result,label){
 await locator.waitFor({state:'visible',timeout:12000});
 const b=await locator.boundingBox();
 assert(b&&b.width>8&&b.height>8,'CLICKABLE_TARGET_MISSING:'+label);
 const animationSensitive=label==='matching-confirm-all-pairs'||label.startsWith('pop-')||label==='confirm-wrong'||label==='confirm-correct';
 await locator.click({timeout:12000,force:animationSensitive});
 result.actions.push({kind:'playwrightRealClick',label,x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)});
}
async function realDrag(source,target,result,label){
 await source.waitFor({state:'visible',timeout:10000});
 await target.waitFor({state:'visible',timeout:10000});
 const a=await source.boundingBox(),b=await target.boundingBox();
 assert(a&&b&&a.width>8&&b.width>8,'DRAG_TARGET_MISSING:'+label);
 await source.dragTo(target,{sourcePosition:{x:a.width/2,y:a.height/2},targetPosition:{x:b.width/2,y:b.height/2},timeout:13000});
 result.actions.push({kind:'playwrightPointerDrag',label,from:{x:Math.round(a.x+a.width/2),y:Math.round(a.y+a.height/2)},to:{x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)}});
}
async function realPointerDrag(page,source,target,result,label){
 await source.waitFor({state:'visible',timeout:10000});
 await target.waitFor({state:'visible',timeout:10000});
 const a=await source.boundingBox(),b=await target.boundingBox();
 assert(a&&b&&a.width>8&&b.width>8,'DRAG_POINTER_TARGET_MISSING:'+label);
 // The center of an audio item is its PLAY button; drag from the left grip.
 const start={x:a.x+Math.min(24,Math.max(12,a.width*0.10)),y:a.y+a.height/2},dest={x:b.x+b.width/2,y:b.y+b.height/2};
 await page.mouse.move(start.x,start.y);
 await page.mouse.down();
 await page.mouse.move(start.x+10,start.y+10,{steps:4});
 await page.mouse.move(dest.x,dest.y,{steps:18});
 await page.mouse.up();
 result.actions.push({kind:'realMouseDownMoveUp',label,from:start,to:dest});
}
async function feedback(page,kind,result){
 const selector='.feedback-ribbon[data-feedback="'+kind+'"]';
 await page.waitForFunction((kind)=>{
  const r=document.querySelector('.feedback-ribbon');
  const button=document.querySelector('.feedback-action');
  const rect=button?.getBoundingClientRect();
  const style=button&&getComputedStyle(button);
  return (r?.dataset.feedback===kind&&!r.hidden)||
    (document.querySelector('#game')?.dataset.duduqInteractionState==='AWAITING_CONFIRM'&&
    rect?.width>4&&rect?.height>4&&style.display!=='none'&&/confirmar/i.test(button?.textContent||''));
 },kind,{timeout:result.mechanic==='smart-sentence'?90000:18000});
 const c=page.locator('.feedback-action').first();
 const text=(await c.textContent().catch(()=>''))?.trim()||'';
 if(/confirmar/i.test(text)&&await c.isVisible()){
  await realClick(c,result,'confirm-'+kind);
 }
 await page.locator(selector).waitFor({state:'visible',timeout:result.mechanic==='smart-sentence'?90000:22000});
 result.feedbackStates.push({kind,text:(await page.locator(selector).textContent()).trim().slice(0,140)});
}
async function unlockAudio(page,result){
 const game=page.locator('#game');
 await game.waitFor({state:'attached',timeout:15000});
 result.initialState=await game.getAttribute('data-duduq-interaction-state');
 const audio=page.locator('.audio-button').first();
 await realClick(audio,result,'instruction-start');
 await page.waitForTimeout(700);
 if((await game.getAttribute('data-duduq-interaction-state'))!=='READY')
  await realClick(audio,result,'instruction-replay');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:50000});
 result.unlocked=true;
}
async function testTarget(page,q,r){
 const correct=q.answerKey;
 assert(typeof correct==='string','TARGET_KEY_NOT_STRING');
 const targets=page.locator('.target-shooter-target[data-target-id]');
 const ids=await targets.evaluateAll(els=>els.map(e=>e.dataset.targetId));
 const wrong=ids.find(id=>id!==correct);
 assert(wrong&&ids.includes(correct),'TARGET_ANSWER_OPTION_NOT_RENDERED');
 r.canonical={correct,wrong,visibleTargetIds:ids};
 if(!FAST_FULL65){
 await realClick(page.locator('.target-shooter-target[data-target-id="'+wrong+'"]'),r,'wrong-target');
 await feedback(page,'incorrect',r);
 await snap(page,r,'incorrect');
 await realClick(page.locator('.feedback-action'),r,'retry');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:20000});
 }
 await realClick(page.locator('.target-shooter-target[data-target-id="'+correct+'"]'),r,'correct-target');
 await feedback(page,'correct',r);
 await snap(page,r,'correct');
}
async function testSmart(page,q,r){
 const answer=q.answerKey;
 assert(typeof answer==='string'&&Array.isArray(q.options),'SMART_COMPLETE_OPTIONS_MISSING');
 const wrong=q.options.find(o=>o.answerKey!==answer);
 assert(wrong,'SMART_DISTRACTOR_MISSING');
 r.canonical={correct:answer,wrong:wrong.answerKey};
 r.smartAudioGates=[];
 const snapshot=()=>page.evaluate(()=>{
   const engine=window.DuduQSmartSentenceShell?.engine?.snapshot?.();
   const button=document.querySelector('.smart-sentence-confirm-action');
   const ribbon=document.querySelector('.feedback-ribbon');
   return {gate:document.querySelector('#game')?.dataset.duduqInteractionState||null,
    engine:{status:engine?.status,canConfirm:engine?.canConfirm,selected:engine?.selected?.map(x=>x?.answerKey)},
    nativeConfirm:{disabled:button?.disabled,hidden:button?.hidden,onclickBound:Boolean(button?.onclick)},
    feedback:{hidden:ribbon?.hidden,type:ribbon?.dataset.feedback}};
 });
 const confirmAfterRequiredAudio=async label=>{
   // The compiled Smart Sentence runtime explicitly requires completion of
   // selected-word audio and retry reinforcement. engine.canConfirm is NOT
   // enough: confirmSelection also tests pedagogicalWordPending and
   // wordAudioReady. Never override disabled to bypass this teacher gate.
   await page.waitForFunction(()=>{
      const root=document.querySelector('#game');
      const b=root?.querySelector('.smart-sentence-confirm-action');
      const state=window.DuduQSmartSentenceShell?.engine?.snapshot?.();
      return b&&!b.hidden&&!b.disabled&&Boolean(b.onclick)&&
        root?.dataset.duduqInteractionState==='READY'&&
        state?.status==='playing'&&state?.canConfirm===true;
   },null,{timeout:75000});
   const state=await snapshot();
   r.smartAudioGates.push({label,passed:true,state});
 };
 if(!FAST_FULL65){
 await realClick(page.locator('.smart-sentence-option[data-option-id$="-'+wrong.answerKey+'"]'),r,'wrong-word');
 await confirmAfterRequiredAudio('wrong-word-audio-finished');
 await realClick(page.locator('.smart-sentence-confirm-action'),r,'confirm-wrong');
 await feedback(page,'incorrect',r);await snap(page,r,'incorrect');
 await realClick(page.locator('.feedback-action'),r,'retry');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:75000});
 }
 await realClick(page.locator('.smart-sentence-option[data-option-id$="-'+answer+'"]'),r,'correct-word');
 await confirmAfterRequiredAudio('correct-word-audio-and-reinforcement-finished');
 r.confirmAfterRetry=await snapshot();
 await realClick(page.locator('.smart-sentence-confirm-action'),r,'confirm-correct');
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testMatching(page,q,r){
 const pairs=q.answerKey;assert(pairs&&typeof pairs==='object'&&!Array.isArray(pairs),'MATCHING_PAIRS_MISSING');
 r.canonical={pairs};
 const first=Object.entries(pairs)[0];
 const second=Object.entries(pairs)[1];
 if(!FAST_FULL65&&second){
  await realClick(page.locator('.matching-card[data-id="'+first[0]+'"]'),r,'wrong-pair-left');
  await realClick(page.locator('.matching-card[data-id="'+second[1]+'"]'),r,'wrong-pair-right');
  await page.waitForTimeout(1150);
  r.incorrectPairState=await page.locator('.matching-card[data-id="'+first[0]+'"]').getAttribute('data-state');
  await snap(page,r,'wrong-pair');
 }
 for(const [left,right]of Object.entries(pairs)){
  await realClick(page.locator('.matching-card[data-id="'+left+'"]'),r,'pair-left-'+left);
  await realClick(page.locator('.matching-card[data-id="'+right+'"]'),r,'pair-right-'+right);
  await page.waitForTimeout(250);
 }
 await realClick(page.getByRole('button',{name:/confirmar/i}).last(),r,'matching-confirm-all-pairs');
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testMemory(page,q,r){
 const pairs=q.answerKey;assert(Array.isArray(pairs)&&pairs.length>0,'MEMORY_PAIRS_MISSING');
 r.canonical={pairs};
 const key=pair=>page.locator('[data-card-id="'+pair+'"]');
 if(!FAST_FULL65&&pairs.length>1){
  await realClick(key(pairs[0]+'-A'),r,'memory-wrong-first');
  await realClick(key(pairs[1]+'-A'),r,'memory-wrong-second');
  await page.waitForTimeout(1500);
  r.wrongPairChecked=true;
 }
 for(const pair of pairs){
  await realClick(key(pair+'-A'),r,'memory-'+pair+'-A');
  await realClick(key(pair+'-B'),r,'memory-'+pair+'-B');
  await page.waitForFunction(pair=>{
   return [...document.querySelectorAll('[data-card-id]')].filter(x=>x.dataset.cardId===pair+'-A'||x.dataset.cardId===pair+'-B').every(x=>x.classList.contains('is-matched'));
  },pair,{timeout:13000});
 }
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testMultimedia(page,q,r){
 const assignments=q.answerKey;assert(assignments&&typeof assignments==='object'&&!Array.isArray(assignments),'MULTIMEDIA_PLACEMENTS_MISSING');
 r.canonical={assignments};
 for(const [source,target] of Object.entries(assignments)){
  await realPointerDrag(page,page.locator('[data-item-id="'+source+'"]').first(),page.locator('[data-drop-target-id="'+target+'"]').first(),r,'audio-drag-'+source+'-'+target);
  await page.waitForTimeout(350);
  const placement=await page.locator('[data-item-id="'+source+'"]').first().evaluate(el=>({
    id:el.dataset.itemId,state:el.dataset.state,placement:el.dataset.placement,
    assignedSlot:el.closest('[data-drop-target-id]')?.dataset.dropTargetId||null
  }));
  r.placements??=[];r.placements.push(placement);
  assert.equal(placement.assignedSlot,target,'AUDIO_POINTER_DROP_NOT_REGISTERED:'+JSON.stringify(placement));
 }
 await page.locator('.dnd-confirm-action').waitFor({state:'visible',timeout:13000});
 await realClick(page.locator('.dnd-confirm-action'),r,'confirm-all-audio-scenes');
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testGrouping(page,q,r){
 const assignments=q.answerKey;assert(assignments&&typeof assignments==='object'&&!Array.isArray(assignments),'GROUPING_ANSWER_MISSING');
 r.canonical={assignments};
 for(const [id,group]of Object.entries(assignments)){
  const zone=page.locator('[data-drop-zone-content="'+group+'"]').first();
  assert(await zone.count(),'GROUPING_ZONE_NOT_FOUND:'+group);
  await realDrag(page.locator('.dnd-option-image-card[data-item-id="'+id+'"]').first(),zone,r,'group-'+id+'-'+group);
  await page.waitForTimeout(160);
 }
 await page.locator('.dnd-confirm-action').waitFor({state:'visible',timeout:13000});
 await realClick(page.locator('.dnd-confirm-action'),r,'confirm-classification');
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testBubble(page,q,r) {
 const answer=q.answerKey; assert(typeof answer==='string','BUBBLE_TARGET_MISSING');
 r.canonical={answer};r.bubbles=[];r.bubbleStates=[];
 const clicked=new Set();
 const getState=()=>page.evaluate(()=>{
   const engine=window.DuduQBubblePopShell?.engine;
   const ribbon=document.querySelector('.feedback-ribbon');
   const all=[...document.querySelectorAll('.bubble-pop-playable:not([disabled])')];
   return {
    engine:engine?.snapshot?.()||null,
    ribbon:ribbon?{hidden:ribbon.hidden,kind:ribbon.dataset.feedback,action:ribbon.querySelector('.feedback-action')?.textContent?.trim()}:null,
    candidates:all.filter(el=>{
      const b=el.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
      return b.width>25&&b.height>25&&x>18&&y>220&&x<innerWidth-18&&y<innerHeight-110 &&
        (document.elementFromPoint(x,y)===el||el.contains(document.elementFromPoint(x,y)));
    }).map(el=>{const b=el.getBoundingClientRect();return{id:el.dataset.bubbleId,text:el.querySelector('.bubble-pop-content')?.textContent?.trim()||'',
     alt:el.querySelector('.bubble-pop-content img')?.alt||'',x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};})
   };
 });
 let wrongClicked=0,correctClicked=0;
 for(let step=0;step<50;step++){
  await page.waitForFunction((prior)=>{
   const ribbon=document.querySelector('.feedback-ribbon');
   if(ribbon&&!ribbon.hidden)return true;
   const available=[...document.querySelectorAll('.bubble-pop-playable:not([disabled])')];
   return available.some(el=>{
    const b=el.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
    if(prior.includes(el.dataset.bubbleId))return false;
    return b.width>25&&b.height>25&&x>18&&y>220&&x<innerWidth-18&&y<innerHeight-110 &&
      (document.elementFromPoint(x,y)===el||el.contains(document.elementFromPoint(x,y)));
   });
  },[...clicked],{timeout:24000});
  const state=await getState();
  r.bubbleStates.push({step,engine:state.engine?{status:state.engine.status,found:state.engine.foundTargetIds,incorrectHits:state.engine.incorrectHits,entities:state.engine.entities?.length}:null,ribbon:state.ribbon,candidates:state.candidates.length});
  if(state.ribbon&&!state.ribbon.hidden){
    if(state.ribbon.kind==='correct')break;
    if(state.ribbon.kind==='incorrect'){
      const retry=page.locator('.feedback-action').first();
      await realClick(retry,r,'bubble-retry-'+step);
      r.feedbackStates.push({kind:'incorrect',text:state.ribbon.action});
      await page.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.hidden===true,null,{timeout:16000});
      continue;
    }
    throw Error('BUBBLE_UNEXPECTED_FEEDBACK:'+JSON.stringify(state.ribbon));
  }
  // At least one real incorrect answer, then prioritize engine-created target
  // bubbles to avoid an artificial 50-click stress test with moving distractors.
  const valid=state.candidates.filter(x=>!clicked.has(x.id));
  const chosen=(FAST_FULL65?null:(wrongClicked===0?valid.find(x=>x.id.includes('-incorrect-')):null))||
    valid.find(x=>x.id.includes('-target-'))||valid[0];
  if(!chosen)continue;
  clicked.add(chosen.id);
  const before=state.engine?.entities?.find(x=>x.id===chosen.id)?.state||null;
  await page.mouse.click(chosen.x,chosen.y,{delay:25});
  await page.waitForTimeout(380);
  const after=await getState();
  const changed=after.engine?.entities?.find(x=>x.id===chosen.id)?.state||null;
  r.bubbles.push({...chosen,before,after:changed});
  r.actions.push({kind:'realViewportMouseClick',label:'bubble-'+chosen.id,x:chosen.x,y:chosen.y});
  if(changed==='POPPING'||changed==='POPPED'||changed==='popping'||changed==='popped'){
    if(chosen.id.includes('-incorrect-'))wrongClicked++;
    else correctClicked++;
  }
  await page.waitForTimeout(700);
 }
 const good=page.locator('.feedback-ribbon[data-feedback="correct"]');
 await good.waitFor({state:'visible',timeout:14000});
 r.feedbackStates.push({kind:'correct',text:(await good.textContent()).trim().slice(0,140)});
 r.correctFeedbackSeen=true;
 r.bubbleOutcome={wrongClicked,correctClicked,roundSnapshot:await page.evaluate(()=>window.DuduQBubblePopShell?.engine?.snapshot?.())};
 await snap(page,r,'correct');
}
const games={ 'target-shooter':testTarget,'matching':testMatching,'smart-sentence':testSmart,
 'memory-quest':testMemory,'drag-drop-multimedia':testMultimedia,'drag-drop':testGrouping,'bubble-pop':testBubble};
let cursor=0;
async function worker(){
 while(cursor<cases.length){
  const [mechanic,id]=cases[cursor++],q=qmap.get(id);
  assert(q,'QUESTION_NOT_FOUND:'+id);
  const p=await browser.newPage({viewport:screen,reducedMotion:'reduce'});
  const r={id,mechanic,sourceMechanic:q.mechanicId,answerContract:JSON.stringify(q.answerKey).slice(0,300),route:'/play/'+mechanic+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=20261110',
    actions:[],feedbackStates:[],pageErrors:[],networkErrors:[],screenshots:[],unlocked:false,pass:false,viewport:viewportName};
  p.on('pageerror',e=>r.pageErrors.push(String(e?.message||e).slice(0,300)));
  p.on('response',resp=>{if(resp.status()>=400&&resp.url().startsWith(base)&&!/favicon.ico/.test(resp.url()))r.networkErrors.push({url:resp.url(),status:resp.status()});});
  try{
   if(id.startsWith('Y1M01-') && id!=='Y1M01-Q001'){
     // In this module the session gate rejects deep-link URLs without a canonical
     // Q001 launch. This QA-only session checkpoint selects the published item,
     // not its answer. Full lesson navigation is a separate release criterion.
     const first=base+'/play/target-shooter/?duduqModule=Y1M01&duduqItem=Y1M01-Q001&duduqStart=Y1M01';
     const boot=await p.goto(first,{waitUntil:'domcontentloaded',timeout:45000});
     assert.equal(boot.status(),200,'Y1M01_LAUNCH_FAILURE');
     await p.waitForFunction(()=>Object.keys(sessionStorage).some(k=>{try{const d=JSON.parse(sessionStorage.getItem(k)||'null');return d?.moduleId==='Y1M01'&&d?.index===0&&d?.itemId==='Y1M01-Q001'}catch{return false}}),null,{timeout:18000});
     await p.waitForLoadState('networkidle',{timeout:18000});
     await p.evaluate(id=>{const key=Object.keys(sessionStorage).find(k=>{try{return JSON.parse(sessionStorage.getItem(k)||'null')?.moduleId==='Y1M01'}catch{return false}});if(!key)throw Error('OFFICIAL_SESSION_NOT_INITIALIZED');sessionStorage.setItem(key,JSON.stringify({moduleId:'Y1M01',index:Number(id.slice(-3))-1,itemId:id}));},id);
     r.qaSessionBootstrapped=true;
   }
   const resp=await p.goto(base+r.route,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(resp.status(),200);
   await unlockAudio(p,r);
   await snap(p,r,'ready');
   await games[mechanic](p,q,r);
   r.correctFeedbackShown=r.feedbackStates.some(x=>x.kind==='correct');
   const action=p.locator('.feedback-ribbon[data-feedback="correct"] .feedback-action').first();
   r.continueButton={exists:await action.count()>0,visible:await action.isVisible().catch(()=>false),text:(await action.textContent().catch(()=>''))?.trim().slice(0,80)};
   r.pass=r.unlocked&&r.correctFeedbackShown&&r.continueButton.visible&&!r.pageErrors.length&&!r.networkErrors.length;
   if(!r.pass)r.error='CORRECT_FEEDBACK_OR_NO_ERRORS_NOT_PROVEN';
  }catch(e){
   r.error=String(e?.message||e).slice(0,700);
   await snap(p,r,'failure');
  }finally{
   await p.close();
   report.cases.push(r);
   report.completedCanaries=report.cases.length;report.passed=report.cases.filter(x=>x.pass).length;
   report.failed=report.completedCanaries-report.passed;save();
   console.log('REAL_GAMEPLAY_FULL65_CASE='+JSON.stringify({viewport:viewportName,id,mechanic,pass:r.pass,unlocked:r.unlocked,events:r.actions.length,feedback:r.feedbackStates.map(x=>x.kind),error:r.error||null}));
  }
 }
}
try{await Promise.all(Array.from({length:5},()=>worker()));}finally{await browser.close();}
assert.equal(report.cases.length,65);
report.complete65GameplayCertification=report.failed===0&&report.cases.length===65;
save();
console.log('REAL_GAMEPLAY_FULL65_SUMMARY='+JSON.stringify({view:viewportName,tested:65,passed:report.passed,failed:report.failed,fullyCorrect:report.complete65GameplayCertification}));
assert.equal(report.failed,0,'FULL65_REAL_GAMEPLAY_INCOMPLETE');
