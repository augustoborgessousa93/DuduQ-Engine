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
const root='qa/results/last60-gameplay-canary';
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
const cases=[
 ['target-shooter','Y3M05-Q001'],
 ['matching','Y1M06-Q009'],
 ['smart-sentence','Y1M06-Q008'],
 ['memory-quest','Y2M05-Q004'],
 ['drag-drop-multimedia','Y1M06-Q011'],
 ['drag-drop','Y1M06-Q019'],
 ['bubble-pop','Y1M06-Q003']
];
const report={schema:'DUDUQ_LAST60_REAL_SEVEN_MECHANIC_GAMEPLAY_CANARY_V1',
 qaOnly:true,productionDeployed:false,originalMediaBindings:60,originalQuestionContracts:600,
 expectedCanaries:7,completedCanaries:0,passed:0,failed:0,cases:[],
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
 const animationSensitive=label==='matching-confirm-all-pairs'||label.startsWith('pop-');
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
 const start={x:a.x+a.width/2,y:a.y+a.height/2},dest={x:b.x+b.width/2,y:b.y+b.height/2};
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
 },kind,{timeout:18000});
 const c=page.locator('.feedback-action').first();
 const text=(await c.textContent().catch(()=>''))?.trim()||'';
 if(/confirmar/i.test(text)&&await c.isVisible()){
  await realClick(c,result,'confirm-'+kind);
 }
 await page.locator(selector).waitFor({state:'visible',timeout:22000});
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
 await realClick(page.locator('.target-shooter-target[data-target-id="'+wrong+'"]'),r,'wrong-target');
 await feedback(page,'incorrect',r);
 await snap(page,r,'incorrect');
 await realClick(page.locator('.feedback-action'),r,'retry');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:20000});
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
 await realClick(page.locator('.smart-sentence-option[data-option-id$="-'+wrong.answerKey+'"]'),r,'wrong-word');
 await page.locator('.smart-sentence-confirm-action').waitFor({state:'visible',timeout:9000});
 await realClick(page.locator('.smart-sentence-confirm-action'),r,'confirm-wrong');
 await feedback(page,'incorrect',r);await snap(page,r,'incorrect');
 await realClick(page.locator('.feedback-action'),r,'retry');
 await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:20000});
 await realClick(page.locator('.smart-sentence-option[data-option-id$="-'+answer+'"]'),r,'correct-word');
 await page.locator('.smart-sentence-confirm-action').waitFor({state:'visible',timeout:9000});
 await page.waitForTimeout(900);
 const confirmState=await page.locator('.smart-sentence-confirm-action').evaluate(e=>({
   disabled:e.disabled,ariaDisabled:e.getAttribute('aria-disabled'),
   hidden:e.hidden,visualState:document.querySelector('[data-answer-slot]')?.dataset?.visualState,
   optionTexts:[...document.querySelectorAll('.smart-sentence-option')].filter(n=>n.classList.contains('is-selected')).map(n=>n.textContent?.trim()),
   engine:window.DuduQSmartSentenceShell?.engine?.snapshot?.()||null
 }));
 r.confirmAfterRetry=confirmState;
 assert(!confirmState.disabled,'SMART_CONFIRM_NATIVE_DISABLED_AFTER_RETRY:'+JSON.stringify(confirmState));
 await realClick(page.locator('.smart-sentence-confirm-action'),r,'confirm-correct');
 await feedback(page,'correct',r);await snap(page,r,'correct');
}
async function testMatching(page,q,r){
 const pairs=q.answerKey;assert(pairs&&typeof pairs==='object'&&!Array.isArray(pairs),'MATCHING_PAIRS_MISSING');
 r.canonical={pairs};
 const first=Object.entries(pairs)[0];
 const second=Object.entries(pairs)[1];
 if(second){
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
 if(pairs.length>1){
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
async function testBubble(page,q,r){
 const answer=q.answerKey;assert(typeof answer==='string','BUBBLE_TARGET_MISSING');
 r.canonical={answer};
 const seen=new Set();
 for(let i=0;i<32;i++){
  const good=page.locator('.feedback-ribbon[data-feedback="correct"]');
  if(await good.isVisible().catch(()=>false))break;
  const bad=page.locator('.feedback-ribbon[data-feedback="incorrect"]');
  if(await bad.isVisible().catch(()=>false)){
   const label=(await page.locator('.feedback-action').textContent()).trim();
   assert(/tentar|retry/i.test(label),'BUBBLE_RETRY_TEXT_MISSING');
   r.feedbackStates.push({kind:'incorrect',text:label});
   await snap(page,r,'incorrect-'+i);
   await realClick(page.locator('.feedback-action'),r,'bubble-retry-'+i);
   await page.waitForFunction(()=>document.querySelector('.feedback-ribbon')?.hidden===true,null,{timeout:14000});
   await page.waitForTimeout(400);
   continue;
  }
  await page.waitForFunction(seen=>{
    return [...document.querySelectorAll('.bubble-pop-playable:not([disabled])')]
      .some(el=>!seen.includes(el.dataset.bubbleId)&&el.getBoundingClientRect().width>10);
  },[...seen],{timeout:13500});
  const candidates=await page.locator('.bubble-pop-playable:not([disabled])').evaluateAll(els=>els.map(el=>({
   id:el.dataset.bubbleId,text:el.querySelector('.bubble-pop-content')?.textContent?.trim()||'',
   alt:el.querySelector('.bubble-pop-content img')?.alt||''
  })));
  const candidate=candidates.find(c=>!seen.has(c.id));
  assert(candidate,'NEW_BUBBLE_NOT_FOUND');
  seen.add(candidate.id);
  r.bubbles??=[];r.bubbles.push(candidate);
  await realClick(page.locator('.bubble-pop-playable[data-bubble-id="'+candidate.id+'"]'),r,'pop-'+candidate.id);
  await page.waitForTimeout(1100);
 }
 const good=page.locator('.feedback-ribbon[data-feedback="correct"]');
 await good.waitFor({state:'visible',timeout:16000});
 r.correctFeedbackSeen=true;
 r.feedbackStates.push({kind:'correct',text:(await good.textContent()).trim().slice(0,140)});
 await snap(page,r,'correct');
}
const games={ 'target-shooter':testTarget,'matching':testMatching,'smart-sentence':testSmart,
 'memory-quest':testMemory,'drag-drop-multimedia':testMultimedia,'drag-drop':testGrouping,'bubble-pop':testBubble};
let cursor=0;
async function worker(){
 while(cursor<cases.length){
  const [mechanic,id]=cases[cursor++],q=qmap.get(id);
  assert(q,'QUESTION_NOT_FOUND:'+id);
  const p=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const r={id,mechanic,sourceMechanic:q.mechanicId,answerContract:JSON.stringify(q.answerKey).slice(0,300),route:'/play/'+mechanic+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=20261110',
    actions:[],feedbackStates:[],pageErrors:[],networkErrors:[],screenshots:[],unlocked:false,pass:false};
  p.on('pageerror',e=>r.pageErrors.push(String(e?.message||e).slice(0,300)));
  p.on('response',resp=>{if(resp.status()>=400&&resp.url().startsWith(base)&&!/favicon.ico/.test(resp.url()))r.networkErrors.push({url:resp.url(),status:resp.status()});});
  try{
   const resp=await p.goto(base+r.route,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(resp.status(),200);
   await unlockAudio(p,r);
   await snap(p,r,'ready');
   await games[mechanic](p,q,r);
   r.pass=r.unlocked&&r.feedbackStates.some(x=>x.kind==='correct')&&!r.pageErrors.length&&!r.networkErrors.length;
   if(!r.pass)r.error='CORRECT_FEEDBACK_OR_NO_ERRORS_NOT_PROVEN';
  }catch(e){
   r.error=String(e?.message||e).slice(0,700);
   await snap(p,r,'failure');
  }finally{
   await p.close();
   report.cases.push(r);
   report.completedCanaries=report.cases.length;report.passed=report.cases.filter(x=>x.pass).length;
   report.failed=report.completedCanaries-report.passed;save();
   console.log('REAL_GAMEPLAY_CANARY='+JSON.stringify({id,mechanic,pass:r.pass,unlocked:r.unlocked,events:r.actions.length,feedback:r.feedbackStates.map(x=>x.kind),error:r.error||null}));
  }
 }
}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
assert.equal(report.cases.length,7);
console.log('REAL_GAMEPLAY_CANARY_SUMMARY='+JSON.stringify({tested:7,passed:report.passed,failed:report.failed,full65Certification:false}));
assert.equal(report.failed,0,'SEVEN_REAL_GAMEPLAY_CANARIES_NOT_ALL_PASSED');
