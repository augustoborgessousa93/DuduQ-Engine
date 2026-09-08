import fs from 'node:fs';
import {chromium} from 'playwright';

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4173').replace(/\/$/,'');
const viewports=[
  {name:'desktop-1366x768',width:1366,height:768},
  {name:'desktop-browser-1366x640',width:1366,height:640},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'mobile-390x844',width:390,height:844}
];
const expected={
  1:{'smart-sentence':9,'word-slash':1,'bubble-pop':3,'target-shooter':1,'drag-drop':1},
  2:{'target-shooter':8,'smart-sentence':4,'bubble-pop':3},
  3:{'target-shooter':10,'smart-sentence':5},
  4:{'target-shooter':10,'smart-sentence':5},
  5:{'target-shooter':9,'smart-sentence':6},
  6:{'target-shooter':9,'smart-sentence':6}
};
const representatives={
  1:{id:'EN3-M1-07',mechanic:'bubble-pop'},
  2:{id:'EN3-M2-11',mechanic:'bubble-pop'},
  3:{id:'EN3-M3-12',mechanic:'target-shooter'},
  4:{id:'EN3-M4-15',mechanic:'target-shooter'},
  5:{id:'EN3-M5-07',mechanic:'target-shooter'},
  6:{id:'EN3-M6-09',mechanic:'target-shooter'}
};
const targetModeCases=[
  {module:1,id:'EN3-M1-09',mode:'audio-to-image',label:'canonical-audio-to-image'},
  {module:2,id:'EN3-M2-01',mode:'visual-to-audio',label:'numeral-visual-to-audio'},
  {module:3,id:'EN3-M3-01',mode:'visual-to-audio',label:'image-visual-to-audio'}
];
function assert(ok,message){if(!ok)throw new Error(message)}
function sameDistribution(actual,wanted){return JSON.stringify(Object.entries(actual).sort())===JSON.stringify(Object.entries(wanted).sort())}

async function waitModule(page,moduleNumber){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.goto(`${BASE}/content/english/year-3/module-${tag}/index.html?ux-correction=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
}

async function snapshot(page,moduleNumber){
  return page.evaluate(moduleNumber=>{
    const tag=String(moduleNumber).padStart(2,'0');
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const qs=module.activities.map(a=>a.questions[0]);
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    return {
      distribution,
      count:qs.length,
      instructions:qs.map(q=>({id:q.id,visible:q.instruction,student:q.metadata?.studentInstruction,source:q.metadata?.sourceStatement,mechanic:q.delivery?.mechanic})),
      blockers:module.technicalBlockers,
      implementation:module.implementationStatus,
      revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      target:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release
    };
  },moduleNumber);
}

async function mount(page,moduleNumber,id,mechanic){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.evaluate(({tag,moduleNumber,id,mechanic})=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`activity missing ${id}`);
    if(activity.mechanic!==mechanic)throw new Error(`${id}: expected ${mechanic}, got ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'y3-ux'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-ux-${id}`,title:`Y3 UX ${id}`,year:3,subject:'english',module:moduleNumber,container:'#root',
      steps:[{id:`probe-${id}`,mechanic,payload:{id:`payload-${id}`,title:activity.title,subject:'english',year:3,module:moduleNumber,questions:activity.questions}}]
    });
  },{tag,moduleNumber,id,mechanic});
  await page.waitForFunction(()=>{
    const root=(document.getElementById('root')?.innerText||'').trim();
    if(/Não foi possível|não é compatível|Erro ao preparar|falha ao preparar/i.test(root))return true;
    const frame=document.querySelector('#root iframe');
    return Boolean(frame?.contentDocument?.body&&(frame.contentDocument.body.innerText||'').trim().length);
  },null,{timeout:30_000});
  await page.waitForTimeout(350);
  return page.evaluate(()=>{
    const root=(document.getElementById('root')?.innerText||'').trim();
    const frame=document.querySelector('#root iframe'),doc=frame?.contentDocument;
    const text=(doc?.body?.innerText||'').trim();
    return {
      root,text,
      error:/Não foi possível|não é compatível|Erro ao preparar|falha ao preparar/i.test(root+' '+text),
      outerOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth),
      innerOverflow:doc?Math.max(0,doc.documentElement.scrollWidth-doc.documentElement.clientWidth,doc.body.scrollWidth-doc.body.clientWidth):999
    };
  });
}

async function computed(locator){return locator.evaluate(el=>{const s=getComputedStyle(el);return {
  minHeight:s.minHeight,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,borderRadius:s.borderRadius,borderTopWidth:s.borderTopWidth,borderTopColor:s.borderTopColor,
  backgroundImage:s.backgroundImage,color:s.color,boxShadow:s.boxShadow,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,
  outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,outlineOffset:s.outlineOffset,filter:s.filter,transform:s.transform
}})}
async function pseudo(locator,pseudoElement){return locator.evaluate((el,pseudoElement)=>{const s=getComputedStyle(el,pseudoElement);return {height:s.height,borderRadius:s.borderRadius,backgroundImage:s.backgroundImage,opacity:s.opacity}},pseudoElement)}
function assertParity(a,b,label){
  for(const key of ['minHeight','paddingLeft','paddingRight','borderRadius','borderTopWidth','borderTopColor','backgroundImage','color','boxShadow','fontFamily','fontSize','fontWeight']){
    assert(a[key]===b[key],`${label}: ${key} differs Smart=${a[key]} Matching=${b[key]}`);
  }
}

async function buttonParity(browser,viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  const smartPage=await context.newPage();
  await waitModule(smartPage,5);
  await mount(smartPage,5,'EN3-M5-06','smart-sentence');
  const smartFrame=smartPage.frameLocator('#root iframe');
  const smart=smartFrame.locator('.duduq-smart-ts-confirm');
  await smart.waitFor({state:'visible',timeout:15_000});
  const parityMarker=await smartFrame.locator('#duduq-y3-smart-primary-parity').getAttribute('data-reference');
  assert(parityMarker==='matching-1.0.23',`${viewport.name}: Smart parity style not injected`);

  const matchingPage=await context.newPage();
  await matchingPage.goto(`${BASE}/engine/releases/mechanics/matching/1.0.23/DUDUQ_MATCHING.html?ux-reference=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  const matching=matchingPage.locator('.duduq-matching-primary').first();
  await matching.waitFor({state:'visible',timeout:20_000});

  const smartDisabled=await computed(smart),matchingDisabled=await computed(matching);
  assert(smartDisabled.minHeight===matchingDisabled.minHeight,`${viewport.name}: disabled height parity`);
  assert(smartDisabled.borderTopColor===matchingDisabled.borderTopColor,`${viewport.name}: disabled border parity Smart=${smartDisabled.borderTopColor} Matching=${matchingDisabled.borderTopColor}`);
  assert(smartDisabled.backgroundImage===matchingDisabled.backgroundImage,`${viewport.name}: disabled background parity Smart=${smartDisabled.backgroundImage} Matching=${matchingDisabled.backgroundImage}`);
  assert(smartDisabled.color===matchingDisabled.color,`${viewport.name}: disabled text parity`);
  assert(smartDisabled.boxShadow===matchingDisabled.boxShadow,`${viewport.name}: disabled depth parity Smart=${smartDisabled.boxShadow} Matching=${matchingDisabled.boxShadow}`);

  await smart.evaluate(el=>{el.disabled=false});
  await matching.evaluate(el=>{el.disabled=false});
  const smartNormal=await computed(smart),matchingNormal=await computed(matching);
  assertParity(smartNormal,matchingNormal,`${viewport.name}/normal`);
  const smartBefore=await pseudo(smart,'::before'),matchingBefore=await pseudo(matching,'::before');
  for(const key of ['height','borderRadius','backgroundImage','opacity'])assert(smartBefore[key]===matchingBefore[key],`${viewport.name}/normal ::before ${key} differs Smart=${smartBefore[key]} Matching=${matchingBefore[key]}`);
  const smartAfter=await pseudo(smart,'::after'),matchingAfter=await pseudo(matching,'::after');
  for(const key of ['backgroundImage','opacity'])assert(smartAfter[key]===matchingAfter[key],`${viewport.name}/normal ::after ${key} differs Smart=${smartAfter[key]} Matching=${matchingAfter[key]}`);

  await smart.hover();await matching.hover();
  const smartHover=await computed(smart),matchingHover=await computed(matching);
  assert(smartHover.filter===matchingHover.filter,`${viewport.name}/hover filter`);

  await smart.focus();await matching.focus();
  const smartFocus=await computed(smart),matchingFocus=await computed(matching);
  assert(smartFocus.outlineWidth===matchingFocus.outlineWidth&&smartFocus.outlineColor===matchingFocus.outlineColor&&smartFocus.outlineOffset===matchingFocus.outlineOffset,`${viewport.name}/focus-visible Smart=${smartFocus.outlineWidth}/${smartFocus.outlineColor}/${smartFocus.outlineOffset} Matching=${matchingFocus.outlineWidth}/${matchingFocus.outlineColor}/${matchingFocus.outlineOffset}`);

  let box=await smart.boundingBox();assert(box,`${viewport.name}: Smart button box`);
  await smartPage.mouse.move(box.x+box.width/2,box.y+box.height/2);await smartPage.mouse.down();
  const smartPressed=await computed(smart);await smartPage.mouse.up();
  box=await matching.boundingBox();assert(box,`${viewport.name}: Matching button box`);
  await matchingPage.mouse.move(box.x+box.width/2,box.y+box.height/2);await matchingPage.mouse.down();
  const matchingPressed=await computed(matching);await matchingPage.mouse.up();
  assert(smartPressed.transform===matchingPressed.transform,`${viewport.name}/pressed transform Smart=${smartPressed.transform} Matching=${matchingPressed.transform}`);
  assert(smartPressed.boxShadow===matchingPressed.boxShadow,`${viewport.name}/pressed depth Smart=${smartPressed.boxShadow} Matching=${matchingPressed.boxShadow}`);

  await smart.evaluate(el=>{el.disabled=false;el.blur()});
  await matching.evaluate(el=>{el.disabled=false;el.blur()});
  const smartPng=await smart.screenshot();
  const matchingPng=await matching.screenshot();
  const compare=await context.newPage();
  await compare.setViewportSize({width:Math.max(390,viewport.width),height:Math.min(420,viewport.height)});
  await compare.setContent(`<!doctype html><style>body{margin:0;padding:24px;font-family:system-ui;background:#f7fbff}.row{display:flex;gap:28px;align-items:flex-start;justify-content:center;flex-wrap:wrap}.card{background:white;border:1px solid #d8e0e8;border-radius:18px;padding:18px;text-align:center;box-shadow:0 4px 14px #0001}.label{font-weight:800;margin-bottom:14px}img{display:block;max-width:100%}</style><div class="row"><div class="card"><div class="label">Smart Sentence</div><img src="data:image/png;base64,${smartPng.toString('base64')}"></div><div class="card"><div class="label">Matching 1.0.23</div><img src="data:image/png;base64,${matchingPng.toString('base64')}"></div></div>`);
  fs.mkdirSync('test-results/year3',{recursive:true});
  await compare.screenshot({path:`test-results/year3/button-parity-${viewport.name}.png`,fullPage:true});
  await context.close();
  console.log(`PRIMARY_BUTTON_PARITY ${viewport.name} normal=PASS hover=PASS pressed=PASS disabled=PASS focus=PASS pseudo=PASS mobile=PASS`);
}

async function targetShooterModeParity(browser,viewport){
  const samples=[];
  fs.mkdirSync('test-results/year3',{recursive:true});
  for(const probe of targetModeCases){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    await waitModule(page,probe.module);
    const mounted=await mount(page,probe.module,probe.id,'target-shooter');
    assert(!mounted.error,`${viewport.name}/${probe.id}: Target Shooter mount error`);
    const frame=page.frameLocator('#root iframe');
    const arena=frame.locator('.duduq-ts-arena');
    const target=frame.locator('.duduq-ts-target-shell').first();
    const audio=frame.locator('.duduq-ts-audio-button');
    await arena.waitFor({state:'visible',timeout:15_000});
    await target.waitFor({state:'visible',timeout:15_000});
    await audio.waitFor({state:'visible',timeout:15_000});
    const mode=await frame.locator('#targetShooterConfig').evaluate(el=>JSON.parse(el.textContent||'{}').stages?.[0]?.mode||'');
    assert(mode===probe.mode,`${viewport.name}/${probe.id}: expected mode ${probe.mode}, got ${mode}`);
    await audio.evaluate(el=>{el.disabled=false});
    const arenaStyle=await computed(arena),targetStyle=await computed(target),audioStyle=await computed(audio);
    let confirmStyle=null;
    if(mode==='visual-to-audio'){
      const marker=await frame.locator('#duduq-y3-target-mode-parity').getAttribute('data-reference');
      assert(marker==='target-shooter-1.0.23',`${viewport.name}/${probe.id}: Target Shooter parity style not injected`);
      const panel=frame.locator('.duduq-ts-option-audio-panel');
      const confirm=frame.locator('.duduq-ts-option-audio-confirm');
      await panel.waitFor({state:'visible',timeout:15_000});
      await confirm.waitFor({state:'visible',timeout:15_000});
      const confirmDisabled=await computed(confirm);
      assert(confirmDisabled.borderTopColor==='rgb(199, 208, 219)',`${viewport.name}/${probe.id}: Target Shooter disabled confirm border`);
      assert(confirmDisabled.backgroundImage==='none',`${viewport.name}/${probe.id}: Target Shooter disabled confirm background`);
      assert(confirmDisabled.boxShadow.includes('rgb(183, 193, 204)'),`${viewport.name}/${probe.id}: Target Shooter disabled confirm depth`);
      const choice=frame.locator('.duduq-ts-target').first();
      await choice.click();
      await page.waitForTimeout(80);
      assert(await confirm.isEnabled(),`${viewport.name}/${probe.id}: Target Shooter confirm did not activate after option preview`);
      confirmStyle=await computed(confirm);
      for(const key of ['borderTopColor','backgroundImage','color','boxShadow']){
        assert(confirmStyle[key]===audioStyle[key],`${viewport.name}/${probe.id}: Target Shooter mode control ${key} differs confirm=${confirmStyle[key]} audio=${audioStyle[key]}`);
      }
      await confirm.focus();
      const confirmFocus=await computed(confirm);await audio.focus();const audioFocus=await computed(audio);
      assert(confirmFocus.outlineWidth===audioFocus.outlineWidth&&confirmFocus.outlineColor===audioFocus.outlineColor&&confirmFocus.outlineOffset===audioFocus.outlineOffset,`${viewport.name}/${probe.id}: Target Shooter focus language differs`);
    }else{
      assert(await frame.locator('.duduq-ts-option-audio-panel').count()===0,`${viewport.name}/${probe.id}: unexpected option-audio panel in ${mode}`);
    }
    samples.push({probe,arena:arenaStyle,target:targetStyle,audio:audioStyle,confirm:confirmStyle});
    await page.locator('#root iframe').screenshot({path:`test-results/year3/target-shooter-${probe.label}-${viewport.name}.png`});
    await context.close();
  }
  const baseline=samples[0];
  for(const sample of samples.slice(1)){
    for(const key of ['backgroundImage','borderRadius'])assert(sample.arena[key]===baseline.arena[key],`${viewport.name}/${sample.probe.id}: Target Shooter arena ${key} differs by mode`);
    for(const key of ['backgroundImage','borderRadius','boxShadow'])assert(sample.target[key]===baseline.target[key],`${viewport.name}/${sample.probe.id}: Target Shooter target shell ${key} differs by mode`);
    for(const key of ['borderTopColor','backgroundImage','boxShadow'])assert(sample.audio[key]===baseline.audio[key],`${viewport.name}/${sample.probe.id}: Target Shooter audio control ${key} differs by mode`);
  }
  console.log(`TARGET_SHOOTER_MODE_PARITY ${viewport.name} audio-to-image=PASS visual-to-audio-text=PASS visual-to-audio-image=PASS`);
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    for(let moduleNumber=1;moduleNumber<=6;moduleNumber++){
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
      const page=await context.newPage();
      const errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error)));
      await waitModule(page,moduleNumber);
      const snap=await snapshot(page,moduleNumber);
      assert(snap.count===15,`M${moduleNumber}/${viewport.name}: activities`);
      assert(sameDistribution(snap.distribution,expected[moduleNumber]),`M${moduleNumber}/${viewport.name}: distribution ${JSON.stringify(snap.distribution)}`);
      assert(snap.implementation==='PASS'&&snap.blockers===0,`M${moduleNumber}/${viewport.name}: implementation`);
      assert(snap.revision===151&&snap.core==='1.0.12'&&snap.target==='1.0.23',`M${moduleNumber}/${viewport.name}: runtime`);
      for(const item of snap.instructions){
        assert(item.visible===item.student,`${item.id}/${viewport.name}: student instruction metadata`);
        assert(item.visible.length<=40,`${item.id}/${viewport.name}: long visible instruction`);
        assert(item.source&&item.source!==item.visible,`${item.id}/${viewport.name}: source prompt not preserved separately`);
      }
      const rep=representatives[moduleNumber];
      const mounted=await mount(page,moduleNumber,rep.id,rep.mechanic);
      assert(!mounted.error,`M${moduleNumber}/${viewport.name}/${rep.id}: browser error ${mounted.root}`);
      assert(mounted.outerOverflow<=2&&mounted.innerOverflow<=2,`M${moduleNumber}/${viewport.name}/${rep.id}: overflow ${mounted.outerOverflow}/${mounted.innerOverflow}`);
      assert(errors.length===0,`M${moduleNumber}/${viewport.name}: page errors ${errors.join(' | ')}`);
      await context.close();
      console.log(`M${String(moduleNumber).padStart(2,'0')}_BROWSER ${viewport.name} = PASS`);
    }
    await targetShooterModeParity(browser,viewport);
    await buttonParity(browser,viewport);
  }
}finally{await browser.close()}

console.log('TARGET_SHOOTER_MODE_PARITY = PASS');
console.log('PRIMARY_BUTTON_PARITY = PASS');
console.log('MATCHING_VISUAL_PARITY = PASS');
console.log('YEAR3_UX_BROWSER = PASS');
