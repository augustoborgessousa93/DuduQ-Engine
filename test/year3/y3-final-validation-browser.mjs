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
const targetCases=[
  {module:1,id:'EN3-M1-09',mode:'audio-to-image'},
  {module:2,id:'EN3-M2-01',mode:'visual-to-audio'},
  {module:3,id:'EN3-M3-01',mode:'visual-to-audio'}
];

function assert(ok,message){if(!ok)throw new Error(message)}
function sameDistribution(actual,wanted){return JSON.stringify(Object.entries(actual).sort())===JSON.stringify(Object.entries(wanted).sort())}

async function waitModule(page,moduleNumber,{keepIntro=false}={}){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.goto(`${BASE}/content/english/year-3/module-${tag}/index.html?final-validation=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
  if(!keepIntro){
    await page.evaluate(()=>{try{window.DuduQIntro?.hide?.({immediate:true,reason:'y3-final-validation'})}catch(_){} try{window.DuduQTransition?.hideImmediate?.()}catch(_){}});
  }
}

async function snapshot(page,moduleNumber){
  return page.evaluate(moduleNumber=>{
    const tag=String(moduleNumber).padStart(2,'0');
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const qs=module.activities.map(a=>a.questions[0]);
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    return {
      distribution,count:qs.length,blockers:module.technicalBlockers,implementation:module.implementationStatus,
      revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      target:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['target-shooter']?.release,
      smart:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.['smart-sentence']?.release,
      instructions:qs.map(q=>({id:q.id,visible:q.instruction,student:q.metadata?.studentInstruction,source:q.metadata?.sourceStatement}))
    };
  },moduleNumber);
}

async function mount(page,moduleNumber,id,mechanic,{trackTargetCompletion=false}={}){
  const tag=String(moduleNumber).padStart(2,'0');
  await page.evaluate(({tag,moduleNumber,id,mechanic,trackTargetCompletion})=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`activity missing ${id}`);
    if(activity.mechanic!==mechanic)throw new Error(`${id}: expected ${mechanic}, got ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'y3-final-validation'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    if(trackTargetCompletion){
      window.__Y3_TS_COMPLETIONS__=0;
      if(!window.__Y3_TS_COMPLETION_LISTENER__){
        window.__Y3_TS_COMPLETION_LISTENER__=true;
        window.addEventListener('message',event=>{if(event?.data?.type==='DUDUQ_TARGET_SHOOTER_COMPLETE')window.__Y3_TS_COMPLETIONS__+=1});
      }
    }
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-final-${id}`,title:`Y3 Final ${id}`,year:3,subject:'english',module:moduleNumber,container:'#root',
      steps:[{id:`probe-${id}`,mechanic,payload:{id:`payload-${id}`,title:activity.title,subject:'english',year:3,module:moduleNumber,questions:activity.questions}}]
    });
  },{tag,moduleNumber,id,mechanic,trackTargetCompletion});
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
      root,text,error:/Não foi possível|não é compatível|Erro ao preparar|falha ao preparar/i.test(root+' '+text),
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
function assertParity(a,b,label){for(const key of ['minHeight','paddingLeft','paddingRight','borderRadius','borderTopWidth','borderTopColor','backgroundImage','color','boxShadow','fontFamily','fontSize','fontWeight'])assert(a[key]===b[key],`${label}: ${key} differs Smart=${a[key]} Matching=${b[key]}`)}

async function smartMatchingParity(browser,viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  const smartPage=await context.newPage();
  await waitModule(smartPage,5);
  await mount(smartPage,5,'EN3-M5-06','smart-sentence');
  const smart=smartPage.frameLocator('#root iframe').locator('.duduq-smart-ts-confirm');
  await smart.waitFor({state:'visible',timeout:15_000});
  const marker=await smartPage.frameLocator('#root iframe').locator('#duduq-y3-smart-primary-parity').getAttribute('data-reference');
  assert(marker==='matching-1.0.23',`${viewport.name}: Smart parity style missing`);

  const matchingPage=await context.newPage();
  await matchingPage.goto(`${BASE}/engine/releases/mechanics/matching/1.0.23/DUDUQ_MATCHING.html?final-reference=1`,{waitUntil:'domcontentloaded',timeout:45_000});
  const matching=matchingPage.locator('.duduq-matching-primary').first();
  await matching.waitFor({state:'visible',timeout:20_000});

  const sd=await computed(smart),md=await computed(matching);
  for(const key of ['minHeight','borderTopColor','backgroundImage','color','boxShadow'])assert(sd[key]===md[key],`${viewport.name}/disabled ${key} Smart=${sd[key]} Matching=${md[key]}`);

  await smart.evaluate(el=>{el.disabled=false});await matching.evaluate(el=>{el.disabled=false});
  assertParity(await computed(smart),await computed(matching),`${viewport.name}/normal`);
  const sb=await pseudo(smart,'::before'),mb=await pseudo(matching,'::before');
  for(const key of ['height','borderRadius','backgroundImage','opacity'])assert(sb[key]===mb[key],`${viewport.name}/before ${key}`);
  const sa=await pseudo(smart,'::after'),ma=await pseudo(matching,'::after');
  for(const key of ['backgroundImage','opacity'])assert(sa[key]===ma[key],`${viewport.name}/after ${key}`);

  await smart.hover();await matching.hover();assert((await computed(smart)).filter===(await computed(matching)).filter,`${viewport.name}/hover`);
  await smart.focus();await matching.focus();
  const sf=await computed(smart),mf=await computed(matching);
  assert(sf.outlineWidth===mf.outlineWidth&&sf.outlineColor===mf.outlineColor&&sf.outlineOffset===mf.outlineOffset,`${viewport.name}/focus`);

  // Both components define the same 45ms pressed transition. Sample only after
  // that transition settles; the first battery sampled different interpolation
  // frames because Smart lives in an iframe while Matching is in the main page.
  let box=await smart.boundingBox();assert(box,`${viewport.name}: smart box`);await smartPage.mouse.move(box.x+box.width/2,box.y+box.height/2);await smartPage.mouse.down();await smartPage.waitForTimeout(80);const sp=await computed(smart);await smartPage.mouse.up();
  box=await matching.boundingBox();assert(box,`${viewport.name}: matching box`);await matchingPage.mouse.move(box.x+box.width/2,box.y+box.height/2);await matchingPage.mouse.down();await matchingPage.waitForTimeout(80);const mp=await computed(matching);await matchingPage.mouse.up();
  assert(sp.transform===mp.transform&&sp.boxShadow===mp.boxShadow,`${viewport.name}/pressed Smart=${sp.transform}/${sp.boxShadow} Matching=${mp.transform}/${mp.boxShadow}`);

  fs.mkdirSync('test-results/year3',{recursive:true});
  await smartPage.screenshot({path:`test-results/year3/smart-matching-${viewport.name}.png`});
  await context.close();
  console.log(`SMART_SENTENCE_MATCHING_BUTTON_PARITY ${viewport.name} = PASS`);
}

async function introLogo(browser,viewport){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  const page=await context.newPage();
  await waitModule(page,1,{keepIntro:true});
  const logo=page.locator('.duduq-intro-collection-logo');
  await logo.waitFor({state:'visible',timeout:12_000});
  const proof=await logo.evaluate(el=>{
    const r=el.getBoundingClientRect(),fallback=document.querySelector('.duduq-intro-collection-name');
    const naturalRatio=el.naturalWidth/el.naturalHeight,renderedRatio=r.width/r.height;
    return {
      tag:el.tagName,complete:el.complete,naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,
      width:r.width,height:r.height,left:r.left,top:r.top,right:r.right,bottom:r.bottom,
      viewportWidth:innerWidth,viewportHeight:innerHeight,naturalRatio,renderedRatio,
      fallbackVisible:Boolean(fallback&&!fallback.hidden&&getComputedStyle(fallback).display!=='none'&&getComputedStyle(fallback).visibility!=='hidden'),
      src:el.currentSrc||el.src
    };
  });
  assert(proof.tag==='IMG',`${viewport.name}: intro logo is not IMG`);
  assert(proof.complete&&proof.naturalWidth>0&&proof.naturalHeight>0,`${viewport.name}: official logo did not load`);
  assert(proof.width>0&&proof.height>0,`${viewport.name}: official logo not visible`);
  assert(proof.left>=-1&&proof.top>=-1&&proof.right<=proof.viewportWidth+1&&proof.bottom<=proof.viewportHeight+1,`${viewport.name}: official logo clipped ${JSON.stringify(proof)}`);
  assert(Math.abs(proof.naturalRatio-proof.renderedRatio)/proof.naturalRatio<0.03,`${viewport.name}: official logo aspect distorted natural=${proof.naturalRatio} rendered=${proof.renderedRatio}`);
  assert(!proof.fallbackVisible,`${viewport.name}: intro text fallback visible`);
  assert(proof.src.includes('Logo%20EduQ%20Play.png'),`${viewport.name}: wrong intro asset ${proof.src}`);
  fs.mkdirSync('test-results/year3',{recursive:true});
  await page.screenshot({path:`test-results/year3/intro-logo-${viewport.name}.png`});
  await context.close();
  console.log(`INTRO_LOGO ${viewport.name} = PASS`);
}

async function targetBaseline(browser,viewport){
  for(const probe of targetCases){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    await waitModule(page,probe.module);
    const mounted=await mount(page,probe.module,probe.id,'target-shooter',{trackTargetCompletion:true});
    assert(!mounted.error,`${viewport.name}/${probe.id}: Target Shooter mount error`);
    const iframe=page.locator('#root iframe');
    const handle=await iframe.elementHandle();const frame=await handle.contentFrame();assert(frame,`${probe.id}: target iframe missing`);
    await frame.waitForSelector('#targetShooterConfig',{state:'attached',timeout:15_000});
    const mode=await frame.locator('#targetShooterConfig').evaluate(el=>JSON.parse(el.textContent||'{}').stages?.[0]?.mode||'');
    assert(mode===probe.mode,`${viewport.name}/${probe.id}: expected ${probe.mode}, got ${mode}`);
    const correctId=await frame.locator('#targetShooterConfig').evaluate(el=>String(JSON.parse(el.textContent||'{}').stages?.[0]?.rule?.values?.[0]||''));
    assert(correctId,`${probe.id}: missing correct id`);
    await frame.waitForFunction(expectedId=>{
      const cfg=JSON.parse(document.getElementById('targetShooterConfig')?.textContent||'{}'),stage=cfg.stages?.[0];
      return [...document.querySelectorAll('.duduq-ts-target')].some(button=>{
        const label=String(button.getAttribute('aria-label')||'').replace(/^Lançar estrela no alvo\s*/i,'').trim();
        const item=(stage?.items||[]).find(candidate=>String(candidate.label||candidate.id||'').trim()===label);
        return String(item?.id||item?.label||'').trim()===expectedId;
      });
    },correctId,{timeout:15_000});
    await frame.evaluate(expectedId=>{
      const cfg=JSON.parse(document.getElementById('targetShooterConfig')?.textContent||'{}'),stage=cfg.stages?.[0];
      const target=[...document.querySelectorAll('.duduq-ts-target')].find(button=>{
        const label=String(button.getAttribute('aria-label')||'').replace(/^Lançar estrela no alvo\s*/i,'').trim();
        const item=(stage?.items||[]).find(candidate=>String(candidate.label||candidate.id||'').trim()===label);
        return String(item?.id||item?.label||'').trim()===expectedId;
      });
      if(!target)throw new Error(`correct target missing ${expectedId}`);target.click();
    },correctId);
    if(mode==='visual-to-audio'){
      const confirm=frame.locator('.duduq-ts-option-audio-confirm');await confirm.waitFor({state:'visible',timeout:15_000});
      await frame.waitForFunction(()=>{const b=document.querySelector('.duduq-ts-option-audio-confirm');return Boolean(b&&!b.disabled)},null,{timeout:5_000});
      await confirm.click();
    }
    await page.waitForFunction(()=>window.__Y3_TS_COMPLETIONS__===1,null,{timeout:15_000});
    await page.waitForTimeout(700);
    assert(await page.evaluate(()=>window.__Y3_TS_COMPLETIONS__)===1,`${viewport.name}/${probe.id}: Target completion not single`);
    await context.close();
    console.log(`TARGET_SHOOTER_1_0_23 ${viewport.name} ${probe.id} ${mode} = PASS`);
  }
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    await introLogo(browser,viewport);
    for(let moduleNumber=1;moduleNumber<=6;moduleNumber++){
      const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
      const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(String(error?.stack||error)));
      await waitModule(page,moduleNumber);const snap=await snapshot(page,moduleNumber);
      assert(snap.count===15,`M${moduleNumber}/${viewport.name}: activities`);
      assert(sameDistribution(snap.distribution,expected[moduleNumber]),`M${moduleNumber}/${viewport.name}: distribution ${JSON.stringify(snap.distribution)}`);
      assert(snap.implementation==='PASS'&&snap.blockers===0,`M${moduleNumber}/${viewport.name}: implementation`);
      assert(snap.revision===151&&snap.core==='1.0.12'&&snap.target==='1.0.23'&&snap.smart==='4.0.20',`M${moduleNumber}/${viewport.name}: runtime`);
      for(const item of snap.instructions){
        assert(item.visible===item.student,`${item.id}/${viewport.name}: student metadata`);
        assert(item.visible.length<=40&&item.visible.trim().split(/\s+/).length<=5,`${item.id}/${viewport.name}: long instruction`);
        assert(item.source&&item.source!==item.visible,`${item.id}/${viewport.name}: source prompt not preserved`);
      }
      const rep=representatives[moduleNumber];const mounted=await mount(page,moduleNumber,rep.id,rep.mechanic);
      assert(!mounted.error,`M${moduleNumber}/${viewport.name}/${rep.id}: browser error ${mounted.root}`);
      assert(mounted.outerOverflow<=2&&mounted.innerOverflow<=2,`M${moduleNumber}/${viewport.name}/${rep.id}: interaction overflow ${mounted.outerOverflow}/${mounted.innerOverflow}`);
      assert(errors.length===0,`M${moduleNumber}/${viewport.name}: page errors ${errors.join(' | ')}`);
      await context.close();console.log(`M${String(moduleNumber).padStart(2,'0')}_BROWSER ${viewport.name} = PASS`);
    }
    await targetBaseline(browser,viewport);
    await smartMatchingParity(browser,viewport);
  }
}finally{await browser.close()}

console.log('INTRO_LOGO = PASS');
console.log('TARGET_SHOOTER_1_0_23_BASELINE = PASS');
console.log('SMART_SENTENCE_MATCHING_BUTTON_PARITY = PASS');
console.log('BROWSER_4_VIEWPORTS = PASS');
console.log('YEAR3_FINAL_BROWSER = PASS');
