import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';
const origin = process.env.DUDUQ_QA_ORIGIN || 'http://127.0.0.1:4177';
const expectedRoot=process.env.DUDUQ_EXPECTED_ROOT||'';
const buildManifestSha256=process.env.DUDUQ_CANDIDATE_BUILD_HASH||null;
const out=process.env.DUDUQ_REPORT_PATH||'docs/qa/DUDUQ_Y1M01_SEQUENTIAL_BOOT_CHECKPOINT_V6_7.json';
let questions=[];
let maxQuestions=0;
const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const rows = [];
const persist = async status => writeFile(out, JSON.stringify({ schema:'DUDUQ_Y1M01_SEQUENTIAL_BOOT_CHECKPOINT_V6_7', testedAt:new Date().toISOString(), status, routeMethod:'official module route â†’ real Intro Start â†’ visible correct interactions â†’ native Continue; no direct question navigation or state injection', completed:rows.length, errors, rows }, null, 2)+'\n');
const waitFeedback = async outcome => {
  await page.waitForFunction(expected => document.querySelector('.feedback-ribbon:not([hidden])')?.dataset.feedback === expected, outcome, { timeout:20000 });
  const ribbon=page.locator('.feedback-ribbon:not([hidden])');
  const text=await ribbon.evaluate(n=>({title:n.querySelector('h2')?.textContent.trim(),subtitle:n.querySelector('p')?.textContent.trim(),action:n.querySelector('.feedback-action')?.textContent.trim()}));
  assert.ok(text.title&&text.subtitle&&text.action);
  const button=ribbon.locator('.feedback-action');
  await page.waitForFunction(() => {const b=document.querySelector('.feedback-ribbon:not([hidden]) .feedback-action');return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true';},null,{timeout:45000});
  await button.click();
  return text;
};
const clickBubble = async correct => {
  for(let attempt=0;attempt<220;attempt++){
    const before=await page.evaluate(()=>window.DuduQBubblePopShell.engine.snapshot());
    const point=await page.evaluate(want=>{
      const entities=window.DuduQBubblePopShell?.engine?.snapshot?.().entities||[];
      for(const e of entities){
        if(e.correct!==want||e.state!=='AVAILABLE')continue;
        const el=document.querySelector(`[data-bubble-id="${CSS.escape(e.id)}"]`);
        if(!el||el.disabled)continue;
        const r=el.getBoundingClientRect();
        for(const [fx,fy] of [[.5,.5],[.35,.5],[.65,.5],[.5,.35],[.5,.65]]){
          const x=r.left+r.width*fx,y=r.top+r.height*fy;
          if(x<1||x>=innerWidth||y<1||y>=innerHeight)continue;
          if(document.elementFromPoint(x,y)?.closest('[data-bubble-id]')===el)return {id:e.id,x,y};
        }
      }
      return null;
    },correct);
    if(point){
      await page.mouse.click(point.x,point.y);
      try{
        await page.waitForFunction(({id,want,prior})=>{
          const s=window.DuduQBubblePopShell.engine.snapshot();
          const e=s.entities.find(v=>v.id===id);
          return want ? e?.state==='POPPED'||s.foundTargetIds.length>prior : s.incorrectHits>prior;
        },{id:point.id,want:correct,prior:correct?before.foundTargetIds.length:before.incorrectHits},{timeout:1800});
        return point.id;
      }catch{}
    }
    await page.waitForTimeout(50);
  }
  throw new Error(`TEST_HARNESS_LIMITATION: moving ${correct?'correct':'wrong'} bubble not acquired by bounded coordinate refresh`);
};
try{
  if(expectedRoot){const status=await(await fetch(`${origin}/__duduq/status`)).json();if((await realpath(status.root)).toLowerCase()!==(await realpath(path.resolve(expectedRoot))).toLowerCase())throw new Error(`Y1M01_WRONG_CANDIDATE_ROOT:${status.root}`)}
  const questionResponse=await fetch(`${origin}/content/english/year-1/module-01/questions.json`);assert.equal(questionResponse.status,200);const questionBytes=Buffer.from(await questionResponse.arrayBuffer());const questionHash=createHash('sha256').update(questionBytes).digest('hex');questions=JSON.parse(questionBytes.toString('utf8')).items;maxQuestions=Math.min(questions.length,Number(process.env.DUDUQ_STOP_AFTER||questions.length));
  await page.goto(`${origin}/play/english/year-1/module-01/`,{waitUntil:'domcontentloaded',timeout:15000});
  await page.waitForURL('**/play/intro-module/**',{timeout:15000});
  await page.locator('[data-intro-start]').click();
  for(let i=0;i<maxQuestions;i++){
    const expected=questions[i].item_id;
    await page.waitForFunction(id=>new URL(location.href).searchParams.get('duduqItem')===id,expected,{timeout:20000});
    const question=questions[i];
    assert.equal(question.item_id,expected);
    const boot=await page.evaluate(()=>({state:document.querySelector('#game')?.dataset.duduqInteractionState,visible:!!document.querySelector('#game')?.getClientRects().length,scrollX:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),scrollY:Math.max(0,document.documentElement.scrollHeight-document.documentElement.clientHeight)}));
    await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',{},{timeout:45000}).catch(async()=>{
      await page.locator('.duduq-canonical-question-hud .audio-button').click({timeout:3000}).catch(()=>{});
      await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:30000});
    });
    const action={mechanic:question.mechanicId,incorrectPath:'NOT_RUN',correct:'PASS'};
    if(question.mechanicId==='target-shooter'){
      const id=question.answerKey;
      const target=page.locator(`.target-shooter-target[data-target-id="${id}"]:visible`);
      await target.click({timeout:10000});
    }else if(question.mechanicId==='bubble-pop'){
      let wrongFeedback=null;
      if(expected==='Y1M01-Q002'){
        await clickBubble(false);
        wrongFeedback=await waitFeedback('incorrect');
        assert.match(wrongFeedback.action,/TENTAR DE NOVO/i);
        await page.waitForFunction(()=>['READY','AUDIO_RECOVERABLE'].includes(document.querySelector('#game')?.dataset.duduqInteractionState),null,{timeout:30000});
        if(await page.locator('#game').getAttribute('data-duduq-interaction-state')==='AUDIO_RECOVERABLE'){
          await page.locator('.duduq-canonical-question-hud .audio-button').click();
          await page.waitForFunction(()=>document.querySelector('#game')?.dataset.duduqInteractionState==='READY',null,{timeout:30000});
        }
      }
      const count=await page.evaluate(()=>window.DuduQBubblePopShell.activity.targetsToFind.length);
      for(let j=0;j<count;j++)await clickBubble(true);
      action.incorrectPath=wrongFeedback?{result:'PASS',feedback:wrongFeedback,retry:'PASS',restoredReady:'PASS'}:'NOT_RUN';
    }else if(question.mechanicId==='drag-drop-multimedia'){
      const game=await page.evaluate(()=>({items:window.DuduQDragDropShell?.activity?.items?.map(({id,answerKey,type})=>({id,answerKey,type})),targets:window.DuduQDragDropShell?.activity?.targets?.map(({id,answerKey})=>({id,answerKey}))}));
      assert.equal(game.items?.length,question.dragDropContract.draggableCount);
      for(const item of game.items){
        const target=game.targets.find(t=>t.answerKey===item.answerKey);
        assert.ok(target,`target mapping for ${item.id}`);
        const a=page.locator(`[data-item-id="${item.id}"]`).first(),b=page.locator(`[data-drop-target-id="${target.id}"]`).first();
        const ar=await a.boundingBox(),br=await b.boundingBox(); assert.ok(ar&&br,`drag bounds ${item.id}`);
        const sx=item.type==='audio'?ar.x+Math.min(24,ar.width*.12):ar.x+ar.width/2;
        await page.mouse.move(sx,ar.y+ar.height/2); await page.mouse.down();
        await page.mouse.move(br.x+br.width/2,br.y+br.height/2,{steps:12}); await page.mouse.up();
        await page.waitForFunction(id=>Boolean(window.DuduQDragDropMultimediaGame.getState().items.find(x=>x.id===id)?.currentTargetId),item.id,{timeout:10000});
      }
      await page.waitForFunction(()=>{const b=document.querySelector('.dnd-confirm-action');return b&&!b.disabled;},null,{timeout:10000});
      await page.locator('.dnd-confirm-action:visible').click({timeout:10000});
    }else throw new Error(`unsupported mechanic ${question.mechanicId}`);
    const feedback=await waitFeedback('correct');
    const advanced=questions[i+1]?.item_id;
    if(advanced)await page.waitForFunction(id=>new URL(location.href).searchParams.get('duduqItem')===id,advanced,{timeout:20000});
    else await page.waitForURL('**/play/final-module/?moduleId=Y1M01',{timeout:20000});
    rows.push({questionId:expected,mechanic:question.mechanicId,boot:'PASS',identity:'PASS',ready:'PASS',scroll:[boot.scrollX,boot.scrollY],incorrectRetry:action.incorrectPath,correctInteraction:'PASS',feedback,continue:'PASS',advancedTo:advanced||'MODULE_FINAL',error:null});
    await persist('RUNNING');
    console.log(`CHECKPOINT ${rows.length}/20 ${expected} ${question.mechanicId}`);
  }
  if(maxQuestions===questions.length)await page.waitForFunction(()=>document.querySelector('#module-final-root')?.dataset.finalScreenReady==='true',null,{timeout:15000});
  assert.deepEqual(errors,[]);
  await persist(maxQuestions===questions.length?'PASS':'BOUNDED_PASS');
}catch(e){
  rows.push({questionId:new URL(page.url()).searchParams.get('duduqItem'),result:'BLOCKED_OR_FAIL',error:String(e?.stack||e),diagnostic:await page.evaluate(()=>({url:location.href,item:new URL(location.href).searchParams.get('duduqItem'),state:document.querySelector('#game')?.dataset.duduqInteractionState,feedback:document.querySelector('.feedback-ribbon:not([hidden])')?.innerText,engine:window.DuduQBubblePopShell?.engine?.snapshot?.()})).catch(()=>null)});
  await persist('ISSUE_OR_BLOCKED');
  process.exitCode=1;
}finally{await browser.close();}
console.log(JSON.stringify({status:rows.length>=20&&!errors.length?'PASS':rows.length===maxQuestions&&!errors.length?'BOUNDED_PASS':'PARTIAL',completed:rows.length,output:out,errors},null,2));

