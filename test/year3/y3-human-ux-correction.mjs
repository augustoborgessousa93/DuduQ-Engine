import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const viewports=[
  {name:'desktop-1366x768',width:1366,height:768},
  {name:'desktop-browser-1366x640',width:1366,height:640},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'mobile-390x844',width:390,height:844}
];
const expectedDistribution={
  1:{'smart-sentence':9,'word-slash':1,'bubble-pop':3,'target-shooter':1,'drag-drop':1},
  2:{'target-shooter':8,'smart-sentence':4,'bubble-pop':3},
  3:{'target-shooter':10,'smart-sentence':5},
  4:{'target-shooter':10,'smart-sentence':5},
  5:{'target-shooter':9,'smart-sentence':6},
  6:{'target-shooter':9,'smart-sentence':6}
};
const directExpected={
  'EN3-M2-01':{audio:'twenty-one',labels:['20','21','25','30'],correct:'B'},
  'EN3-M2-02':{audio:'twenty-four',labels:['22','24','25','34'],correct:'B'},
  'EN3-M2-03':{audio:'thirty',labels:['20','21','25','30'],correct:'D'},
  'EN3-M2-04':{audio:'thirty-three',labels:['33','30','23','43'],correct:'A'},
  'EN3-M2-05':{audio:'forty',labels:['20','40','21','25'],correct:'B'},
  'EN3-M2-06':{audio:'forty-seven',labels:['45','47','37','74'],correct:'B'},
  'EN3-M2-07':{audio:'fifty',labels:['20','21','25','50'],correct:'D'}
};

function assert(ok,message){if(!ok)throw new Error(message)}
function sortedObject(value){return JSON.stringify(Object.entries(value||{}).sort())}

async function waitModule(page,moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.goto(`${BASE}/content/english/year-3/module-${tag}/index.html?human-ux-final=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
  await page.evaluate(()=>{try{window.DuduQIntro?.hide?.({immediate:true,reason:'human-ux-final'})}catch(_){} try{window.DuduQTransition?.hideImmediate?.()}catch(_){}});
}

async function moduleSnapshot(page,moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  return page.evaluate(tag=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    return {
      distribution,
      revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      targetRelease:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release,
      smartRelease:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['smart-sentence']?.release,
      questions:module.activities.map(a=>{
        const q=a.questions[0];
        return {
          id:q.id,mechanic:a.mechanic,instruction:q.instruction,answer:q.answer?.value,
          invariant:q.metadata?.sourceInvariant||null,
          sourceAlternatives:q.metadata?.sourceAlternatives||[],
          smartAudit:q.metadata?.smartVisualAudit||null,
          smartImage:Boolean(q.metadata?.smartSentence?.image?.src),
          smartPlaceholder:Boolean(q.metadata?.smartSentence?.placeholderVisual),
          targetAudit:q.metadata?.targetDirectShootAudit||null,
          target:q.metadata?.targetShooter||null,
          optionAudio:Boolean(q.metadata?.technicalContract?.optionAudio)
        };
      })
    };
  },tag);
}

async function mountTarget(page,id){
  await page.evaluate(id=>{
    const module=window.DUDUQ_CONTENT.english.year3.module02;
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`activity missing ${id}`);
    window.__Y3_HUMAN_UX_TARGET_COMPLETIONS__=0;
    if(!window.__Y3_HUMAN_UX_TARGET_LISTENER__){
      window.__Y3_HUMAN_UX_TARGET_LISTENER__=true;
      window.addEventListener('message',event=>{if(event?.data?.type==='DUDUQ_TARGET_SHOOTER_COMPLETE')window.__Y3_HUMAN_UX_TARGET_COMPLETIONS__+=1});
    }
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'human-ux-final'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-human-ux-${id}`,title:`Y3 Human UX ${id}`,year:3,subject:'english',module:2,container:'#root',
      steps:[{id:`probe-${id}`,mechanic:'target-shooter',payload:{id:`payload-${id}`,title:activity.title,subject:'english',year:3,module:2,questions:activity.questions}}]
    });
  },id);
  await page.waitForFunction(()=>Boolean(document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-ts-arena')),null,{timeout:30_000});
  const iframe=page.locator('#root iframe');
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  assert(frame,`${id}: Target Shooter iframe missing`);
  await frame.waitForSelector('.duduq-ts-target',{state:'visible',timeout:15_000});
  return {iframe,frame};
}

async function focalTarget(browser,viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  const page=await context.newPage();
  await waitModule(page,2);
  const release=await page.evaluate(()=>window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release||'');
  assert(release==='1.0.23',`${viewport.name}: Target Shooter release ${release}`);
  const {iframe,frame}=await mountTarget(page,'EN3-M2-01');
  const state=await frame.evaluate(()=>{
    const config=JSON.parse(document.getElementById('targetShooterConfig')?.textContent||'{}');
    const stage=config.stages?.[0]||{};
    const buttons=[...document.querySelectorAll('.duduq-ts-target')].map(button=>({
      id:String(button.getAttribute('data-duduq-option-id')||''),
      text:String(button.innerText||button.textContent||'').trim(),
      aria:String(button.getAttribute('aria-label')||'')
    }));
    const all=[...document.querySelectorAll('.duduq-ts-target-shell')].map(el=>String(el.innerText||el.textContent||'').trim()).join(' | ');
    const boxes=[...document.querySelectorAll('.duduq-ts-target-shell')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};});
    return {
      mode:stage.mode||'',audioText:stage.audioText||'',items:(stage.items||[]).map(item=>({id:String(item.id||''),label:String(item.label||'')})),
      panelCount:document.querySelectorAll('.duduq-ts-option-audio-panel').length,
      confirmCount:document.querySelectorAll('.duduq-ts-option-audio-confirm').length,
      buttons,all,boxes,
      overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth),
      viewport:{width:innerWidth,height:innerHeight}
    };
  });
  assert(state.mode==='audio-to-choice',`${viewport.name}: EN3-M2-01 mode ${state.mode}`);
  assert(state.audioText==='twenty-one',`${viewport.name}: EN3-M2-01 audio ${state.audioText}`);
  assert(state.panelCount===0&&state.confirmCount===0,`${viewport.name}: CONFIRM/preview panel still present`);
  assert(JSON.stringify(state.items.map(item=>item.label))===JSON.stringify(['20','21','25','30']),`${viewport.name}: balloon labels ${JSON.stringify(state.items)}`);
  for(const label of ['20','21','25','30'])assert((state.all+' '+state.buttons.map(b=>b.text+' '+b.aria).join(' ')).includes(label),`${viewport.name}: numeral ${label} not rendered inside target/balloon`);
  assert(state.overflow<=1,`${viewport.name}: Target horizontal overflow ${state.overflow}`);
  assert(state.boxes.every(b=>b.left>=-2&&b.right<=state.viewport.width+2),`${viewport.name}: balloon clipped horizontally`);

  const audio=frame.locator('.duduq-ts-audio-button');
  await audio.waitFor({state:'visible',timeout:10_000});
  await audio.click().catch(()=>{});
  await frame.evaluate(()=>{
    const target=[...document.querySelectorAll('.duduq-ts-target')].find(el=>el.getAttribute('data-duduq-option-id')==='B');
    if(!target)throw new Error('correct target B not found');
    target.click();
  });
  await page.waitForFunction(()=>window.__Y3_HUMAN_UX_TARGET_COMPLETIONS__===1,null,{timeout:15_000});
  await page.waitForTimeout(700);
  const completions=await page.evaluate(()=>window.__Y3_HUMAN_UX_TARGET_COMPLETIONS__);
  assert(completions===1,`${viewport.name}: Target completion expected 1, got ${completions}`);
  fs.mkdirSync('test-results/year3-human-ux',{recursive:true});
  await iframe.screenshot({path:`test-results/year3-human-ux/en3-m2-01-${viewport.name}.png`}).catch(()=>{});
  console.log(`EN3_M2_01_DIRECT_SHOOT ${viewport.name} = PASS`);
  await context.close();
}

const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:1366,height:768}});
  const page=await context.newPage();
  const smartRows=[];
  const targetRows=[];
  let total=0;
  for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
    await waitModule(page,moduleNumber);
    const snap=await moduleSnapshot(page,moduleNumber);
    assert(snap.revision===151,`M0${moduleNumber}: revision ${snap.revision}`);
    assert(snap.core==='1.0.12',`M0${moduleNumber}: Core ${snap.core}`);
    assert(snap.targetRelease==='1.0.23',`M0${moduleNumber}: Target ${snap.targetRelease}`);
    assert(snap.smartRelease==='4.0.20',`M0${moduleNumber}: Smart ${snap.smartRelease}`);
    assert(sortedObject(snap.distribution)===sortedObject(expectedDistribution[moduleNumber]),`M0${moduleNumber}: mechanic distribution changed ${JSON.stringify(snap.distribution)}`);
    assert(snap.questions.length===15,`M0${moduleNumber}: expected 15 questions`);
    total+=snap.questions.length;
    for(const q of snap.questions){
      assert(q.invariant?.id===q.id,`${q.id}: invariant ID mismatch`);
      assert(q.invariant?.answer?.id===q.answer,`${q.id}: answer ID changed ${q.answer}/${q.invariant?.answer?.id}`);
      if(q.mechanic==='smart-sentence'){
        assert(q.smartAudit,`${q.id}: Smart visual audit missing`);
        assert(q.smartAudit.eligible==='YES',`${q.id}: expected VISUAL_SUPPORT_ELIGIBLE`);
        assert(q.smartAudit.answerLeakage==='SAFE',`${q.id}: answer leakage risk`);
        assert(['KEEP','APPLY','ASSET_PENDING'].includes(q.smartAudit.decision),`${q.id}: invalid Smart decision ${q.smartAudit.decision}`);
        smartRows.push(q.smartAudit);
      }
      if(directExpected[q.id]){
        const exp=directExpected[q.id];
        assert(q.targetAudit?.decision==='DIRECT_SHOOT',`${q.id}: direct-shoot audit missing`);
        assert(q.target?.mode==='audio-to-choice',`${q.id}: runtime mode ${q.target?.mode}`);
        assert(q.instruction==='Ouça e escolha.',`${q.id}: instruction ${q.instruction}`);
        assert(q.target?.audioText===exp.audio,`${q.id}: stimulus audio ${q.target?.audioText}`);
        assert(JSON.stringify((q.target?.items||[]).map(item=>String(item.label)))===JSON.stringify(exp.labels),`${q.id}: labels ${JSON.stringify(q.target?.items)}`);
        assert(q.answer===exp.correct,`${q.id}: correct ID ${q.answer}/${exp.correct}`);
        assert(!q.optionAudio,`${q.id}: option-audio preview contract still active`);
        targetRows.push(q.targetAudit);
      }
    }
  }
  assert(total===90,`SOURCE total ${total}/90`);
  assert(smartRows.length===35,`SMART_SENTENCE_TOTAL ${smartRows.length}/35`);
  assert(targetRows.length===7,`M02 direct-shoot audit ${targetRows.length}/7`);
  const applied=smartRows.filter(row=>row.supportiveVisual).length;
  const pending=smartRows.filter(row=>row.decision==='ASSET_PENDING').length;
  const notAppropriate=smartRows.filter(row=>row.decision==='NOT_APPROPRIATE').length;
  assert(applied+pending===smartRows.length,`Smart eligible accounting applied=${applied} pending=${pending} total=${smartRows.length}`);
  assert(notAppropriate===0,`Unexpected NOT_APPROPRIATE Smart count ${notAppropriate}`);
  fs.mkdirSync('test-results/year3-human-ux',{recursive:true});
  fs.writeFileSync('test-results/year3-human-ux/smart-visual-audit.json',JSON.stringify(smartRows,null,2));
  fs.writeFileSync('test-results/year3-human-ux/m02-target-direct-shoot-audit.json',JSON.stringify(targetRows,null,2));
  console.log(`SMART_VISUAL_ELIGIBLE = ${smartRows.length}`);
  console.log(`SMART_VISUAL_APPLIED = ${applied}`);
  console.log(`SMART_VISUAL_NOT_APPROPRIATE = ${notAppropriate}`);
  console.log(`SMART_VISUAL_ASSET_PENDING = ${pending}`);
  console.log('ANSWER_LEAKAGE_REGRESSIONS = 0');
  console.log('M02_TARGET_DIRECT_SHOOT_AUDIT = PASS — EN3-M2-01..07');
  await context.close();

  for(const viewport of viewports)await focalTarget(browser,viewport);

  console.log('EN3_M2_01_DIRECT_SHOOT = PASS');
  console.log('TARGET_CONFIRM_VISIBLE_EN3_M2_01 = NO');
  console.log('TARGET_CONTENT_INSIDE_BALLOONS = PASS');
  console.log('TARGET_HOST_COMPLETION = PASS');
  console.log('SOURCE_INVARIANTS = 90/90 PASS');
  console.log('YEAR3_HUMAN_UX_FOCAL = PASS');
}finally{
  await browser.close();
}
