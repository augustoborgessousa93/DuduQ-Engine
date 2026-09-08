import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const CHANNEL_PATH='engine/channels/year3-r151-v1.json';

function assert(ok,message){if(!ok)throw new Error(message)}

async function installCandidateChannel(page){
  const channel=JSON.parse(fs.readFileSync(CHANNEL_PATH,'utf8'));
  const candidate=structuredClone(channel);
  candidate.mechanics['target-shooter']={
    ...candidate.mechanics['target-shooter'],
    release:'1.0.24',
    adapter:'/engine/releases/mechanics/target-shooter/1.0.24/target-shooter.js'
  };
  await page.route('**/engine/channels/year3-r151-v1.json*',async route=>{
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(candidate)});
  });
}

async function waitModule(page){
  await page.goto(`${BASE}/content/english/year-3/module-02/index.html?ts124-focal=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(()=>Boolean(
    window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.module02
  ),null,{timeout:45_000});
  const release=await page.evaluate(()=>window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release||'');
  assert(release==='1.0.24',`candidate channel did not load Target Shooter 1.0.24: ${release}`);
}

async function mount(page){
  await page.evaluate(()=>{
    const module=window.DUDUQ_CONTENT.english.year3.module02;
    const activity=module.activities.find(a=>a.questions?.[0]?.id==='EN3-M2-01');
    if(!activity)throw new Error('activity missing EN3-M2-01');
    if(activity.mechanic!=='target-shooter')throw new Error(`EN3-M2-01 mechanic ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'ts124-focal'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.__TS124_COMPLETIONS__=0;
    window.addEventListener('message',event=>{
      if(event?.data?.type==='DUDUQ_TARGET_SHOOTER_COMPLETE')window.__TS124_COMPLETIONS__+=1;
    });
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:'ts124-focal-en3-m2-01',title:'TS 1.0.24 focal',year:3,subject:'english',module:2,container:'#root',
      steps:[{id:'probe-en3-m2-01',mechanic:'target-shooter',payload:{
        id:'payload-en3-m2-01',title:activity.title,subject:'english',year:3,module:2,questions:activity.questions
      }}]
    });
  });
  await page.waitForFunction(()=>Boolean(
    document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-ts-option-audio-panel')
  ),null,{timeout:30_000});
  await page.waitForTimeout(250);
}

const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await context.newPage();
  await page.addInitScript(()=>{
    window.__DUDUQ_TS124_SPEAK_CALLS__=0;
    try{
      if(window.speechSynthesis){
        window.speechSynthesis.cancel=function(){};
        window.speechSynthesis.speak=function(){window.__DUDUQ_TS124_SPEAK_CALLS__+=1;};
      }
    }catch(_){}
  });
  await installCandidateChannel(page);
  await waitModule(page);
  await mount(page);

  const iframe=page.locator('#root iframe');
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  assert(frame,'Target Shooter iframe missing');

  await frame.waitForSelector('.duduq-ts-option-audio-confirm',{state:'visible',timeout:15_000});
  const initial=await frame.evaluate(()=>{
    const config=JSON.parse(document.getElementById('targetShooterConfig')?.textContent||'{}');
    const stage=config.stages?.[0];
    const correctId=String(stage?.rule?.values?.[0]||'');
    const target=[...document.querySelectorAll('.duduq-ts-target')].find(button=>{
      const label=String(button.getAttribute('aria-label')||'').replace(/^Lançar estrela no alvo\s*/i,'').trim();
      const item=(stage?.items||[]).find(candidate=>String(candidate.label||candidate.id||'').trim()===label);
      return String(item?.id||item?.label||'').trim()===correctId;
    });
    if(!target)throw new Error(`correct target not found for ${correctId}`);
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    window.__DUDUQ_TS124_OLD_TARGET__=target;
    window.__DUDUQ_TS124_EXPECTED_ID__=correctId;
    return {correctId,confirmDisabled:Boolean(confirm?.disabled)};
  });
  assert(initial.correctId,'correct logical item id missing');
  assert(initial.confirmDisabled===true,'CONFIRM must start disabled');

  await frame.evaluate(()=>window.__DUDUQ_TS124_OLD_TARGET__.click());

  await frame.waitForFunction(expectedId=>{
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    return Boolean(
      window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__===expectedId&&
      current&&confirm&&!confirm.disabled&&
      current.getAttribute('data-duduq-option-audio-selected')==='true'
    );
  },initial.correctId,{timeout:5_000});

  const selected=await frame.evaluate(expectedId=>{
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    return {
      selectedItemId:window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__||'',
      confirmDisabled:Boolean(document.querySelector('.duduq-ts-option-audio-confirm')?.disabled),
      currentMarked:current?.getAttribute('data-duduq-option-audio-selected')==='true',
      speechCalls:Number(window.__DUDUQ_TS124_SPEAK_CALLS__||0)
    };
  },initial.correctId);
  assert(selected.selectedItemId===initial.correctId,'stable selectedItemId not stored');
  assert(selected.confirmDisabled===false,'CONFIRM did not activate after option preview');
  assert(selected.currentMarked===true,'current target not marked after selection');
  assert(selected.speechCalls>=1,'option audio preview did not call speech synthesis');

  /*
    Force the original failure mode deterministically. React keeps host-node
    event metadata as expando properties; copying those test-only properties
    to a cloned button lets the replacement remain a valid current host node.
    The release itself does not depend on these internals: its observer sees
    only child-list replacement and re-projects selectedItemId onto the clone.
  */
  const forcedReplacement=await frame.evaluate(expectedId=>{
    const old=window.__DUDUQ_TS124_OLD_TARGET__;
    if(!old||!old.isConnected)throw new Error('old selected target missing before forced replacement');
    const clone=old.cloneNode(true);
    let reactProperties=0;
    for(const key of Object.getOwnPropertyNames(old)){
      if(!key.startsWith('__react'))continue;
      try{
        clone[key]=old[key];
        reactProperties+=1;
        if(key.startsWith('__reactFiber$')){
          const fiber=old[key];
          if(fiber){
            fiber.stateNode=clone;
            if(fiber.alternate)fiber.alternate.stateNode=clone;
          }
        }
      }catch(_){}
    }
    old.replaceWith(clone);
    window.__DUDUQ_TS124_FORCED_TARGET__=clone;
    return {
      reactProperties,
      oldConnected:Boolean(old.isConnected),
      newConnected:Boolean(clone.isConnected),
      differentNode:old!==clone,
      expectedId
    };
  },initial.correctId);
  assert(forcedReplacement.differentNode===true,'forced reconciliation reused old target node');
  assert(forcedReplacement.oldConnected===false&&forcedReplacement.newConnected===true,'forced target replacement did not occur');
  assert(forcedReplacement.reactProperties>=1,'React host metadata unavailable for deterministic replacement');

  await frame.waitForFunction(expectedId=>{
    const old=window.__DUDUQ_TS124_OLD_TARGET__;
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    return Boolean(
      old&&current&&old!==current&&
      window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__===expectedId&&
      current.getAttribute('data-duduq-option-audio-selected')==='true'&&
      confirm&&!confirm.disabled
    );
  },initial.correctId,{timeout:5_000});

  const afterReconcile=await frame.evaluate(expectedId=>{
    const old=window.__DUDUQ_TS124_OLD_TARGET__;
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    return {
      selectedItemId:window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__||'',
      sameNode:old===current,
      oldConnected:Boolean(old?.isConnected),
      currentConnected:Boolean(current?.isConnected),
      currentMarked:current?.getAttribute('data-duduq-option-audio-selected')==='true',
      confirmDisabled:Boolean(confirm?.disabled)
    };
  },initial.correctId);
  assert(afterReconcile.sameNode===false,'reconciliation did not replace target node');
  assert(afterReconcile.currentConnected===true,'current target missing after reconciliation');
  assert(afterReconcile.selectedItemId===initial.correctId,'logical selection was lost across reconciliation');
  assert(afterReconcile.currentMarked===true,'new target DOM did not receive selection marker');
  assert(afterReconcile.confirmDisabled===false,'CONFIRM became disabled after reconciliation');

  await frame.locator('.duduq-ts-option-audio-confirm').click();
  await page.waitForFunction(()=>window.__TS124_COMPLETIONS__===1,null,{timeout:15_000});
  await page.waitForTimeout(700);
  const completions=await page.evaluate(()=>window.__TS124_COMPLETIONS__);
  assert(completions===1,`response/completion duplicated: ${completions}`);

  fs.mkdirSync('test-results/year3',{recursive:true});
  if(await iframe.count())await iframe.screenshot({path:'test-results/year3/target-shooter-1.0.24-reconciliation.png'}).catch(()=>{});

  console.log('TARGET_SHOOTER_1_0_24 = PASS');
  console.log('TARGET_STATE_MODEL = STABLE_ITEM_ID');
  console.log('DOM_NODE_AS_SOURCE_OF_TRUTH = NO');
  console.log('TARGET_FORCED_DOM_REPLACEMENT = PASS');
  console.log('TARGET_SELECTION_SURVIVES_RECONCILIATION = PASS');
  console.log('CONFIRM_EXPECTED_ENABLED = true');
  console.log('OPTION_AUDIO_REGRESSION = PASS');
  console.log('HOST_COMPLETION_SINGLE = PASS');
  await context.close();
}finally{
  await browser.close();
}
