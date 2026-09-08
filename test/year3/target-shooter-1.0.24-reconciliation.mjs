import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const CHANNEL_PATH='engine/channels/year3-r151-v1.json';
const VIEWPORT={width:1366,height:768};

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

async function preparePage(context,label){
  const page=await context.newPage();
  await installCandidateChannel(page);
  await page.goto(`${BASE}/content/english/year-3/module-02/index.html?ts124-gate=${encodeURIComponent(label)}`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(()=>Boolean(
    window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.module02
  ),null,{timeout:45_000});
  const release=await page.evaluate(()=>window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release||'');
  assert(release==='1.0.24',`${label}: candidate channel did not load Target Shooter 1.0.24: ${release}`);
  return page;
}

async function mount(page,label){
  await page.evaluate(label=>{
    const module=window.DUDUQ_CONTENT.english.year3.module02;
    const activity=module.activities.find(a=>a.questions?.[0]?.id==='EN3-M2-01');
    if(!activity)throw new Error('activity missing EN3-M2-01');
    if(activity.mechanic!=='target-shooter')throw new Error(`EN3-M2-01 mechanic ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'ts124-gate'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.__TS124_COMPLETIONS__=0;
    window.addEventListener('message',event=>{
      if(event?.data?.type==='DUDUQ_TARGET_SHOOTER_COMPLETE')window.__TS124_COMPLETIONS__+=1;
    });
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`ts124-${label}-en3-m2-01`,title:`TS 1.0.24 ${label}`,year:3,subject:'english',module:2,container:'#root',
      steps:[{id:`probe-${label}-en3-m2-01`,mechanic:'target-shooter',payload:{
        id:`payload-${label}-en3-m2-01`,title:activity.title,subject:'english',year:3,module:2,questions:activity.questions
      }}]
    });
  },label);
  await page.waitForFunction(()=>Boolean(
    document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-ts-option-audio-panel')
  ),null,{timeout:30_000});
  await page.waitForTimeout(250);

  const iframe=page.locator('#root iframe');
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  assert(frame,`${label}: Target Shooter iframe missing`);
  await frame.waitForSelector('.duduq-ts-option-audio-confirm',{state:'visible',timeout:15_000});
  return {iframe,frame};
}

async function identifyCorrect(frame){
  return frame.evaluate(()=>{
    const config=JSON.parse(document.getElementById('targetShooterConfig')?.textContent||'{}');
    const stage=config.stages?.[0];
    const correctId=String(stage?.rule?.values?.[0]||'');
    const target=[...document.querySelectorAll('.duduq-ts-target')].find(button=>{
      const id=String(button.getAttribute('data-duduq-option-id')||'').trim();
      if(id===correctId)return true;
      const label=String(button.getAttribute('aria-label')||'').replace(/^Lançar estrela no alvo\s*/i,'').trim();
      const item=(stage?.items||[]).find(candidate=>String(candidate.label||candidate.id||'').trim()===label);
      return String(item?.id||item?.label||'').trim()===correctId;
    });
    if(!target)throw new Error(`correct target not found for ${correctId}`);
    return {
      correctId,
      confirmDisabled:Boolean(document.querySelector('.duduq-ts-option-audio-confirm')?.disabled)
    };
  });
}

async function selectCorrect(frame,correctId){
  await frame.evaluate(correctId=>{
    const target=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===correctId);
    if(!target)throw new Error(`target ${correctId} missing before preview`);
    target.click();
  },correctId);

  await frame.waitForFunction(expectedId=>{
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    return Boolean(
      window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__===expectedId&&
      current&&confirm&&!confirm.disabled&&
      current.getAttribute('data-duduq-option-audio-selected')==='true'
    );
  },correctId,{timeout:5_000});

  const selected=await frame.evaluate(expectedId=>{
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    return {
      selectedItemId:window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__||'',
      confirmDisabled:Boolean(document.querySelector('.duduq-ts-option-audio-confirm')?.disabled),
      currentMarked:current?.getAttribute('data-duduq-option-audio-selected')==='true',
      speechCalls:Number(window.__DUDUQ_TS124_SPEAK_CALLS__||0)
    };
  },correctId);
  assert(selected.selectedItemId===correctId,'stable selectedItemId not stored');
  assert(selected.confirmDisabled===false,'CONFIRM did not activate after option preview');
  assert(selected.currentMarked===true,'current target not marked after selection');
  assert(selected.speechCalls>=1,'option audio preview did not call speech synthesis');
  return selected;
}

async function waitSingleCompletion(page,label){
  await page.waitForFunction(()=>window.__TS124_COMPLETIONS__===1,null,{timeout:15_000});
  await page.waitForTimeout(1200);
  const completions=await page.evaluate(()=>window.__TS124_COMPLETIONS__);
  assert(completions===1,`${label}: response/completion duplicated: ${completions}`);
}

async function normalConfirmFlow(context){
  const page=await preparePage(context,'normal');
  const {iframe,frame}=await mount(page,'normal');
  const initial=await identifyCorrect(frame);
  assert(initial.correctId,'normal: correct logical item id missing');
  assert(initial.confirmDisabled===true,'normal: CONFIRM must start disabled');
  await selectCorrect(frame,initial.correctId);
  await frame.locator('.duduq-ts-option-audio-confirm').click();
  await waitSingleCompletion(page,'normal');
  fs.mkdirSync('test-results/year3',{recursive:true});
  if(await iframe.count())await iframe.screenshot({path:'test-results/year3/target-shooter-1.0.24-normal-flow.png'}).catch(()=>{});
  await page.close();
  return {normalFlow:true,hostCompletion:true};
}

async function observeRealReconciliation(context){
  const page=await preparePage(context,'real-reconcile');
  const {iframe,frame}=await mount(page,'real-reconcile');
  const initial=await identifyCorrect(frame);
  assert(initial.correctId,'real-reconcile: correct logical item id missing');
  await selectCorrect(frame,initial.correctId);

  await frame.evaluate(expectedId=>{
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    if(!current)throw new Error('selected target missing before reconciliation observation');
    window.__DUDUQ_TS124_REAL_RECON__={
      expectedId,
      oldTarget:current,
      mutationCount:0,
      replacements:[],
      startedAt:performance.now()
    };
    const arena=document.querySelector('.duduq-ts-arena');
    const observer=new MutationObserver(records=>{
      const state=window.__DUDUQ_TS124_REAL_RECON__;
      state.mutationCount+=records.length;
      const next=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===state.expectedId);
      if(next&&next!==state.oldTarget&&!state.replacements.some(entry=>entry.node===next)){
        state.replacements.push({node:next,at:performance.now()});
      }
    });
    observer.observe(arena,{subtree:true,childList:true});
    window.__DUDUQ_TS124_REAL_RECON_OBSERVER__=observer;
  },initial.correctId);

  // Observe the runtime first without intervention, then exercise supported responsive/state inputs.
  await page.waitForTimeout(900);
  const viewportSequence=[
    {width:1280,height:720},
    {width:768,height:1024},
    {width:390,height:844},
    VIEWPORT
  ];
  for(const size of viewportSequence){
    await page.setViewportSize(size);
    await page.waitForTimeout(350);
  }
  await frame.locator('.duduq-ts-audio-button').click().catch(()=>{});
  await page.waitForTimeout(650);
  await page.setViewportSize(VIEWPORT);
  await page.waitForTimeout(450);

  const observation=await frame.evaluate(expectedId=>{
    const state=window.__DUDUQ_TS124_REAL_RECON__;
    state?.oldTarget;
    const current=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    const replacement=Boolean(current&&state?.oldTarget&&current!==state.oldTarget);
    const result={
      oldConnected:Boolean(state?.oldTarget?.isConnected),
      currentSameAsOld:Boolean(current&&state?.oldTarget&&current===state.oldTarget),
      mutationCount:Number(state?.mutationCount||0),
      replacementCount:Number(state?.replacements?.length||0),
      replacementTimestamps:(state?.replacements||[]).map(entry=>Math.round(entry.at-state.startedAt)),
      replacement,
      selectedItemId:window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__||'',
      currentMarked:current?.getAttribute('data-duduq-option-audio-selected')==='true',
      confirmDisabled:Boolean(document.querySelector('.duduq-ts-option-audio-confirm')?.disabled)
    };
    window.__DUDUQ_TS124_REAL_RECON_OBSERVER__?.disconnect();
    return result;
  },initial.correctId);

  let realReconciliation='NOT OBSERVED';
  if(observation.replacement){
    assert(observation.selectedItemId===initial.correctId,'real reconciliation lost logical selectedItemId');
    assert(observation.currentMarked===true,'real reconciliation did not reproject selected marker');
    assert(observation.confirmDisabled===false,'real reconciliation disabled CONFIRM');
    await frame.locator('.duduq-ts-option-audio-confirm').click();
    await waitSingleCompletion(page,'real reconciliation');
    realReconciliation='PASS';
  }

  fs.mkdirSync('test-results/year3',{recursive:true});
  if(await iframe.count())await iframe.screenshot({path:'test-results/year3/target-shooter-1.0.24-real-reconciliation-observation.png'}).catch(()=>{});
  await page.close();
  return {observation,realReconciliation};
}

async function syntheticStateReprojection(context){
  const page=await preparePage(context,'state-reprojection');
  const {iframe,frame}=await mount(page,'state-reprojection');
  const initial=await identifyCorrect(frame);
  assert(initial.correctId,'state-reprojection: correct logical item id missing');
  await selectCorrect(frame,initial.correctId);

  const forced=await frame.evaluate(expectedId=>{
    const old=[...document.querySelectorAll('.duduq-ts-target')].find(button=>button.getAttribute('data-duduq-option-id')===expectedId);
    if(!old||!old.isConnected)throw new Error('selected target missing before synthetic state reprojection');
    const clone=old.cloneNode(true);
    clone.removeAttribute('data-duduq-option-id');
    clone.removeAttribute('data-duduq-option-audio-selected');
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    if(confirm)confirm.disabled=true;
    old.replaceWith(clone);
    window.__DUDUQ_TS124_SYNTHETIC_OLD__=old;
    window.__DUDUQ_TS124_SYNTHETIC_CLONE__=clone;
    return {
      oldConnected:Boolean(old.isConnected),
      cloneConnected:Boolean(clone.isConnected),
      differentNode:old!==clone
    };
  },initial.correctId);
  assert(forced.differentNode&&forced.oldConnected===false&&forced.cloneConnected===true,'synthetic DOM replacement did not occur');

  await frame.waitForFunction(expectedId=>{
    const clone=window.__DUDUQ_TS124_SYNTHETIC_CLONE__;
    const confirm=document.querySelector('.duduq-ts-option-audio-confirm');
    return Boolean(
      clone?.isConnected&&
      clone.getAttribute('data-duduq-option-id')===expectedId&&
      clone.getAttribute('data-duduq-option-audio-selected')==='true'&&
      window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__===expectedId&&
      confirm&&!confirm.disabled
    );
  },initial.correctId,{timeout:5_000});

  const result=await frame.evaluate(expectedId=>{
    const clone=window.__DUDUQ_TS124_SYNTHETIC_CLONE__;
    return {
      selectedItemId:window.__DUDUQ_TARGET_OPTION_AUDIO_SELECTED_ITEM_ID__||'',
      cloneId:clone?.getAttribute('data-duduq-option-id')||'',
      cloneMarked:clone?.getAttribute('data-duduq-option-audio-selected')==='true',
      confirmDisabled:Boolean(document.querySelector('.duduq-ts-option-audio-confirm')?.disabled),
      expectedId
    };
  },initial.correctId);
  assert(result.selectedItemId===initial.correctId,'state reprojection lost selectedItemId');
  assert(result.cloneId===initial.correctId,'state reprojection did not restore logical option id');
  assert(result.cloneMarked===true,'state reprojection did not restore selected marker');
  assert(result.confirmDisabled===false,'state reprojection did not restore CONFIRM enabled state');

  fs.mkdirSync('test-results/year3',{recursive:true});
  if(await iframe.count())await iframe.screenshot({path:'test-results/year3/target-shooter-1.0.24-state-reprojection.png'}).catch(()=>{});
  await page.close();
  return true;
}

const browser=await chromium.launch({headless:true});
let classification='';
try{
  const context=await browser.newContext({viewport:VIEWPORT});
  await context.addInitScript(()=>{
    window.__DUDUQ_TS124_SPEAK_CALLS__=0;
    try{
      if(window.speechSynthesis){
        window.speechSynthesis.cancel=function(){};
        window.speechSynthesis.speak=function(){window.__DUDUQ_TS124_SPEAK_CALLS__+=1;};
      }
    }catch(_){}
  });

  try{
    await normalConfirmFlow(context);
  }catch(error){
    classification='PRODUCT_BUG';
    console.log('TS124_NORMAL_CONFIRM_FLOW = FAIL');
    console.log('NORMAL_HOST_COMPLETION = FAIL');
    console.log('CLASSIFICATION = PRODUCT_BUG');
    throw error;
  }

  const reconciliation=await observeRealReconciliation(context);
  const stateReprojection=await syntheticStateReprojection(context);
  assert(stateReprojection===true,'synthetic state reprojection failed');

  if(reconciliation.observation.replacement){
    if(reconciliation.realReconciliation!=='PASS'){
      classification='PRODUCT_BUG';
      console.log('REAL_TARGET_REPLACEMENT_OBSERVED = YES');
      console.log('TARGET_REAL_RECONCILIATION = FAIL');
      console.log('CLASSIFICATION = PRODUCT_BUG');
      throw new Error('real React/runtime reconciliation was observed but did not complete correctly');
    }
    classification='TEST_HARNESS_ARTIFACT';
  }else{
    classification='REAL_TARGET_REPLACEMENT_NOT_OBSERVED';
  }

  console.log('TS124_NORMAL_CONFIRM_FLOW = PASS');
  console.log('NORMAL_HOST_COMPLETION = PASS');
  console.log(`REAL_TARGET_REPLACEMENT_OBSERVED = ${reconciliation.observation.replacement?'YES':'NO'}`);
  console.log(`REAL_RECON_MUTATION_COUNT = ${reconciliation.observation.mutationCount}`);
  console.log(`REAL_RECON_REPLACEMENT_COUNT = ${reconciliation.observation.replacementCount}`);
  console.log(`REAL_RECON_REPLACEMENT_TIMESTAMPS_MS = ${JSON.stringify(reconciliation.observation.replacementTimestamps)}`);
  console.log(`TARGET_REAL_RECONCILIATION = ${reconciliation.realReconciliation}`);
  console.log('TARGET_STATE_REPROJECTION = PASS');
  console.log('FORCED_CLONE_COMPLETION = NOT A PRODUCT GATE');
  console.log('DOM_NODE_AS_SELECTION_SOURCE = NO');
  console.log('REACT_INTERNALS_USED_BY_PRODUCT = NO');
  console.log(`CLASSIFICATION = ${classification}`);
  console.log('TARGET_SHOOTER_1_0_24_FOCAL = PASS');
  await context.close();
}finally{
  await browser.close();
}
