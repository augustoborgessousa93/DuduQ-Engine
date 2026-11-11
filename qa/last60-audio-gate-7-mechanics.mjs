#!/usr/bin/env node
/**
 * DUDUQ English: real audio-instruction unlocking for each affected mechanic.
 * No bypass, no altered state or fake browser DOM events.
 * Real Chrome mouse taps. This is only the prerequisite to a full correct/
 * wrong/continue gameplay certification.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
assert.equal(process.env.DUDUQ_QA_ONLY,'1');
assert.equal(process.env.DUDUQ_VISUAL_REVIEW,'1');
const base=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/+$/,'');
const reportBase=JSON.parse(readFileSync('qa/results/last60-candidate-20261110.json','utf8'));
assert.equal(reportBase.affectedQuestions.length,65);assert.equal(reportBase.provisionalSvgLinksInCandidate,0);
const questions=[
 ['matching','Y1M06-Q009'],['bubble-pop','Y1M06-Q003'],
 ['target-shooter','Y3M05-Q001'],['drag-drop-multimedia','Y1M06-Q011'],
 ['memory-quest','Y2M05-Q004'],['smart-sentence','Y1M06-Q008'],
 ['drag-drop','Y1M06-Q019']
];
const dir='qa/results/last60-gameplay-gates';
mkdirSync(dir+'/screenshots',{recursive:true});
const results=[];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let cursor=0;
async function worker(){
 while(cursor<questions.length){
  const [mechanic,id]=questions[cursor++];
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const route='/play/'+mechanic+'/?duduqModule='+id.slice(0,5)+'&duduqItem='+id+'&qaSeed=20261110';
  const result={mechanic,id,route,qaOnly:true,source:'REAL_CHROMIUM_POINTER_INTERACTION',startedLocked:null,
   events:[],pageErrors:[],badHttp:[],audioTransitions:[],ready:false,playableCount:0,loadedImages:0};
  page.on('pageerror',e=>result.pageErrors.push(String(e.message).slice(0,300)));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base)&&!/favicon\.ico/.test(r.url()))result.badHttp.push({url:r.url(),status:r.status()});});
  try{
   const resp=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(resp?.status(),200,'BOOT_HTTP_NOT_200');
   const game=page.locator('#game');
   await game.waitFor({state:'attached',timeout:18000});
   result.startedLocked=await game.getAttribute('data-duduq-interaction-state');
   const audio=page.locator('.audio-button').first();
   await audio.waitFor({state:'visible',timeout:15000});
   async function clickAudio(label){
    const rect=await audio.boundingBox();
    assert(rect&&rect.width>=32&&rect.height>=32,'AUDIO_BUTTON_NOT_ACCESSIBLE');
    const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.up();
    result.events.push({type:'realPointerClick',label,x:Math.round(x),y:Math.round(y)});
    result.audioTransitions.push({label,state:await audio.getAttribute('data-audio-state'),gameState:await game.getAttribute('data-duduq-interaction-state')});
   }
   await clickAudio('start-instruction');
   await page.waitForTimeout(800);
   if((await game.getAttribute('data-duduq-interaction-state'))!=='READY')await clickAudio('replay-instruction');
   await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:48000});
   result.ready=true;
   result.unlockedState=await game.getAttribute('data-duduq-interaction-state');
   result.lastAudioState=await audio.getAttribute('data-audio-state');
   result.playableCount=await page.locator('.matching-card:not(.duduq-interaction-locked),.target-shooter-target:not(.duduq-interaction-locked),.bubble-pop-playable:not(.duduq-interaction-locked),[data-memory-card-component]:not(.duduq-interaction-locked),.smart-sentence-option:not(.duduq-interaction-locked),.dnd-option-image-card:not(.duduq-interaction-locked),.dnd-multimedia-audio-item:not(.duduq-interaction-locked)').count();
   result.loadedImages=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.complete&&i.naturalWidth>0&&i.getBoundingClientRect().width>4).length);
   result.playableSummaries=await page.evaluate(()=>{
    const qs=['.matching-card','.target-shooter-target','.bubble-pop-playable','[data-memory-card-component]','.smart-sentence-option','.dnd-option-image-card','.dnd-multimedia-audio-item','[data-target-id]','.dnd-confirm-action'];
    return Object.fromEntries(qs.map(q=>[q,[...document.querySelectorAll(q)].slice(0,12).map(e=>({text:(e.textContent||'').trim().slice(0,50),data:{...e.dataset},locked:e.classList.contains('duduq-interaction-locked'),disabled:Boolean(e.disabled),hidden:Boolean(e.hidden),visible:e.getBoundingClientRect().width>5&&e.getBoundingClientRect().height>5}))]));
   });
   result.pass=result.ready&&result.playableCount>0&&!result.pageErrors.length&&!result.badHttp.length;
   await page.screenshot({path:dir+'/screenshots/'+mechanic+'-'+id+'-ready.png',fullPage:false});
  }catch(error){
   result.error=String(error?.message||error).slice(0,600);
   result.lastGameState=await page.locator('#game').getAttribute('data-duduq-interaction-state').catch(()=>null);
   result.lastAudioState=await page.locator('.audio-button').first().getAttribute('data-audio-state').catch(()=>null);
   result.pass=false;
   await page.screenshot({path:dir+'/screenshots/'+mechanic+'-'+id+'-failed.png',fullPage:false}).catch(()=>{});
  }finally{
   results.push(result);await page.close();
   writeFileSync(dir+'/report.json',JSON.stringify({schema:'DUDUQ_LAST60_REAL_AUDIO_GATE_QA_V1',qaOnly:true,productionDeployed:false,perMechanic:results,passed:results.filter(r=>r.pass).length,expected:7,fullGameplayCertified:false},null,2)+'\n');
   console.log('AUDIO_GATE_RESULT='+JSON.stringify({id,mechanic,startedLocked:result.startedLocked,ready:result.ready,playable:result.playableCount,pass:result.pass,error:result.error||null,pageErrors:result.pageErrors.slice(0,2),badHttp:result.badHttp.slice(0,2)}));
  }
 }
}
try{await Promise.all([worker(),worker()]);}finally{await browser.close();}
assert.equal(results.length,7);
const successes=results.filter(r=>r.pass).length;
console.log('SEVEN_AUDIO_GATES_SUMMARY='+JSON.stringify({total:7,successes,failures:7-successes,qaOnly:true,fullGameplayCertified:false}));
assert.equal(successes,7,'SEVEN_GAME_MECHANICS_AUDIO_UNLOCK_INCOMPLETE');
