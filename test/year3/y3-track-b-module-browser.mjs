import { chromium } from 'playwright';

const moduleNumber=Number(process.env.MODULE);
if(![1,2,3,4,5,6].includes(moduleNumber))throw new Error('MODULE must be 1..6');
const tag=String(moduleNumber).padStart(2,'0');
const BASE=process.env.BASE_URL||'http://127.0.0.1:4173';
const URL=`${BASE}/content/english/year-3/module-${tag}/index.html`;
const viewports=[
  {name:'desktop-1366x768',width:1366,height:768},
  {name:'desktop-browser-1366x640',width:1366,height:640},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'mobile-390x844',width:390,height:844}
];
const representatives={
  1:{target:'EN3-M1-09',smart:'EN3-M1-03'},
  2:{target:'EN3-M2-01',smart:'EN3-M2-08'},
  3:{target:'EN3-M3-11',smart:'EN3-M3-12'},
  4:{target:'EN3-M4-09',smart:'EN3-M4-13'},
  5:{target:'EN3-M5-01',smart:'EN3-M5-06'},
  6:{target:'EN3-M6-09',smart:'EN3-M6-06'}
}[moduleNumber];
const expectedDistribution={
  1:{'smart-sentence':9,'word-slash':1,'bubble-pop':2,'target-shooter':2,'drag-drop':1},
  2:{'target-shooter':10,'smart-sentence':4,'bubble-pop':1},
  3:{'target-shooter':7,'smart-sentence':8},
  4:{'target-shooter':9,'smart-sentence':6},
  5:{'target-shooter':5,'smart-sentence':10},
  6:{'target-shooter':9,'smart-sentence':6}
}[moduleNumber];
const expectedVersion=moduleNumber===1?'3.0.0-track-b-m01-sentinel':moduleNumber===2?'3.0.0-track-b-m02':`3.0.0-track-b-m${tag}-placeholders`;
const m1Representatives=[['EN3-M1-03','smart-sentence'],['EN3-M1-05','word-slash'],['EN3-M1-06','bubble-pop'],['EN3-M1-09','target-shooter'],['EN3-M1-12','drag-drop']];

function assert(ok,message){if(!ok)throw new Error(message)}
function stable(value){return JSON.stringify(value,Object.keys(value).sort())}

async function waitEngine(page){
  await page.waitForFunction(tag=>Boolean(window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.[`module${tag}`]),tag,{timeout:45_000});
}

async function moduleSnapshot(page){
  return page.evaluate(tag=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    const mechanics=window.DuduQ.listMechanics().reduce((out,m)=>{out[m.id]=m.version;return out},{});
    return {
      version:module.version,activities:module.activities.length,distribution,mechanics,
      implementationStatus:module.implementationStatus,technicalStatus:module.technicalStatus,technicalBlockers:module.technicalBlockers,
      visualStatus:module.visualStatus,publicationStatus:module.publicationStatus,pending:module.pendingCanonicalAssets?.length||0,
      manifestRevision:window.DUDUQ_ENGINE_MANIFEST?.revision,core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
      rootText:(document.getElementById('root')?.innerText||'').trim()
    };
  },tag);
}

async function activityData(page,id){
  return page.evaluate(({tag,id})=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`activity missing: ${id}`);
    const q=activity.questions[0];
    return {
      id,mechanic:activity.mechanic,title:activity.title,
      placeholder:q.metadata?.smartSentence?.placeholderVisual||null,
      target:q.metadata?.targetShooter?{
        correctId:q.metadata.targetShooter.correctIds?.[0],items:q.metadata.targetShooter.items,
        promptVisual:q.metadata.targetShooter.promptVisual||'',promptVisualMedia:q.metadata.targetShooter.promptVisualMedia||null
      }:null
    };
  },{tag,id});
}

async function mount(page,id,mechanic){
  await page.evaluate(({tag,id,mechanic,moduleNumber})=>{
    const module=window.DUDUQ_CONTENT.english.year3[`module${tag}`];
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`representative activity missing: ${id}`);
    if(activity.mechanic!==mechanic)throw new Error(`${id}: expected ${mechanic}, got ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:'browser-track-b'})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-m${tag}-browser-${id}`,title:`Y3 M${tag} ${id}`,year:3,subject:'english',module:moduleNumber,container:'#root',
      steps:[{id:`probe-${id}`,mechanic,payload:{id:`probe-${id}-payload`,title:activity.title,subject:'english',year:3,module:moduleNumber,questions:activity.questions}}]
    });
  },{tag,id,mechanic,moduleNumber});

  await page.waitForFunction(()=>{
    const rootText=(document.getElementById('root')?.innerText||'').trim();
    if(/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText))return true;
    const frame=document.querySelector('#root iframe');
    if(!frame?.contentDocument?.body)return false;
    const visibleText=(frame.contentDocument.body.innerText||'').trim();
    return frame.contentDocument.readyState==='complete'&&visibleText.length>0;
  },null,{timeout:30_000});
  await page.waitForTimeout(350);

  return page.evaluate(()=>{
    const frame=document.querySelector('#root iframe'),doc=frame?.contentDocument;
    const visibleText=(doc?.body?.innerText||'').trim(),rootText=(document.getElementById('root')?.innerText||'').trim();
    return {
      visibleText,bodyLength:visibleText.length,rootText,
      hostError:/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText),
      errorText:/Erro ao preparar|Erro:|falha ao preparar/i.test(visibleText),
      innerOverflow:doc?Math.max(0,doc.documentElement.scrollWidth-doc.documentElement.clientWidth,doc.body.scrollWidth-doc.body.clientWidth):0,
      outerOverflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth)
    };
  });
}

async function exerciseTarget(page,viewportName){
  const data=await activityData(page,representatives.target);
  assert(data.mechanic==='target-shooter',`${viewportName}/${data.id}: target mechanic`);
  const mounted=await mount(page,data.id,'target-shooter');
  assert(!mounted.hostError,`${viewportName}/${data.id}: host error ${mounted.rootText}`);
  assert(!mounted.errorText,`${viewportName}/${data.id}: mechanic error`);
  assert(mounted.innerOverflow<=2&&mounted.outerOverflow<=2,`${viewportName}/${data.id}: overflow ${mounted.innerOverflow}/${mounted.outerOverflow}`);

  await page.waitForFunction(()=>{
    const doc=document.querySelector('#root iframe')?.contentDocument;
    return Boolean(doc?.querySelector('.duduq-ts-option-audio-panel')&&doc.querySelectorAll('.duduq-ts-target').length===4);
  },null,{timeout:12_000});

  const prompt=await page.evaluate(()=>{
    const frame=document.querySelector('#root iframe'),win=frame.contentWindow,doc=frame.contentDocument;
    const probe={cancel:0,speak:0,texts:[]};
    try{Object.defineProperty(win,'speechSynthesis',{configurable:true,value:{cancel(){probe.cancel+=1},speak(u){probe.speak+=1;probe.texts.push(String(u?.text||''))}}})}catch(_){
      try{win.speechSynthesis.cancel=()=>{probe.cancel+=1};win.speechSynthesis.speak=u=>{probe.speak+=1;probe.texts.push(String(u?.text||''))}}catch(__){}
    }
    try{Object.defineProperty(win,'SpeechSynthesisUtterance',{configurable:true,value:function(t){this.text=String(t);this.lang='';this.rate=1;this.pitch=1}})}catch(_){}
    win.__Y3_AUDIO_PROBE__=probe;
    const p=doc.querySelector('.duduq-ts-option-audio-prompt');
    return {text:(p?.innerText||'').trim(),visualStatus:p?.getAttribute('data-visual-status')||'',expectedAsset:p?.getAttribute('data-expected-asset')||'',images:p?.querySelectorAll('img').length||0,emojis:p?.querySelectorAll('.duduq-ts-option-audio-prompt-emoji').length||0};
  });
  assert(prompt.images+prompt.emojis>0,`${viewportName}/${data.id}: structured visual stimulus was not rendered (${JSON.stringify(prompt)})`);
  if(data.target.promptVisualMedia?.type==='placeholder')assert(prompt.emojis>0&&prompt.visualStatus==='TEMP_VISUAL_PLACEHOLDER',`${viewportName}/${data.id}: placeholder prompt contract ${JSON.stringify(prompt)}`);
  if(data.target.promptVisualMedia?.type==='image')assert(prompt.images>0,`${viewportName}/${data.id}: canonical/base image prompt missing`);

  const wrong=data.target.items.find(item=>item.id!==data.target.correctId);
  const correct=data.target.items.find(item=>item.id===data.target.correctId);
  assert(wrong&&correct,`${viewportName}/${data.id}: answer items missing`);

  const repeat=await page.evaluate(({wrongLabel})=>{
    const frame=document.querySelector('#root iframe'),doc=frame.contentDocument,win=frame.contentWindow;
    const target=[...doc.querySelectorAll('.duduq-ts-target')].find(button=>(button.getAttribute('aria-label')||'').toLowerCase().endsWith(String(wrongLabel).toLowerCase()));
    if(!target)throw new Error(`wrong option target not found: ${wrongLabel}`);
    target.click();target.click();
    return {selected:target.getAttribute('data-duduq-option-audio-selected'),state:target.getAttribute('data-state'),confirmDisabled:doc.querySelector('.duduq-ts-option-audio-confirm')?.disabled,probe:win.__Y3_AUDIO_PROBE__};
  },{wrongLabel:wrong.label});
  assert(repeat.selected==='true',`${viewportName}/${data.id}: preview selection missing`);
  assert(repeat.state==='idle',`${viewportName}/${data.id}: preview answered before confirm`);
  assert(repeat.confirmDisabled===false,`${viewportName}/${data.id}: confirm not enabled`);
  assert(repeat.probe.speak>=2,`${viewportName}/${data.id}: audio preview not repeatable ${JSON.stringify(repeat.probe)}`);

  await page.evaluate(()=>document.querySelector('#root iframe').contentDocument.querySelector('.duduq-ts-option-audio-confirm').click());
  await page.waitForFunction(()=>document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-engine-feedback')?.getAttribute('data-state')==='retry',null,{timeout:7_000});
  const retry=await page.evaluate(()=>{
    const doc=document.querySelector('#root iframe').contentDocument;
    return {selected:Boolean(doc.querySelector('[data-duduq-option-audio-selected="true"]')),confirmDisabled:doc.querySelector('.duduq-ts-option-audio-confirm')?.disabled};
  });
  assert(!retry.selected&&retry.confirmDisabled===true,`${viewportName}/${data.id}: retry did not reset selection`);

  await page.waitForTimeout(1150);
  await page.evaluate(({correctLabel})=>{
    const doc=document.querySelector('#root iframe').contentDocument;
    const target=[...doc.querySelectorAll('.duduq-ts-target')].find(button=>(button.getAttribute('aria-label')||'').toLowerCase().endsWith(String(correctLabel).toLowerCase()));
    if(!target)throw new Error(`correct option target not found: ${correctLabel}`);
    target.click();
    const confirm=doc.querySelector('.duduq-ts-option-audio-confirm');
    if(confirm.disabled)throw new Error('confirm remained disabled after correct preview');
    confirm.click();
  },{correctLabel:correct.label});
  await page.waitForFunction(()=>Boolean(document.querySelector('#root .duduq-completion')),null,{timeout:10_000});
  const complete=await page.evaluate(()=>({shown:Boolean(document.querySelector('#root .duduq-completion')),text:(document.querySelector('#root .duduq-completion')?.innerText||'').trim()}));
  assert(complete.shown&&complete.text.length>0,`${viewportName}/${data.id}: completion bridge missing`);
  console.log(`INTERACTION M${tag}/${viewportName}/${data.id} stimulus=PASS repeat=PASS retry=PASS feedback=PASS completion=PASS`);
}

async function exerciseSmart(page,viewportName){
  const data=await activityData(page,representatives.smart);
  assert(data.mechanic==='smart-sentence',`${viewportName}/${data.id}: smart mechanic`);
  if(moduleNumber>=3)assert(data.placeholder?.visualStatus==='TEMP_VISUAL_PLACEHOLDER',`${viewportName}/${data.id}: expected semantic placeholder metadata`);
  const result=await mount(page,data.id,'smart-sentence');
  assert(!result.hostError,`${viewportName}/${data.id}: host error ${result.rootText}`);
  assert(!result.errorText&&result.bodyLength>0,`${viewportName}/${data.id}: smart sentence did not mount`);
  assert(result.innerOverflow<=2&&result.outerOverflow<=2,`${viewportName}/${data.id}: overflow ${result.innerOverflow}/${result.outerOverflow}`);
  if(moduleNumber>=3)assert(result.visibleText.includes(data.placeholder.value),`${viewportName}/${data.id}: placeholder emoji not visible`);
  console.log(`MOUNT M${tag}/${viewportName}/${data.id}/smart-sentence ${moduleNumber>=3?'placeholder=PASS':'sentinel=PASS'} overflow=0`);
}

async function exerciseM02OptionAudio(page,viewportName){
  const data=await activityData(page,'EN3-M2-01');
  const mounted=await mount(page,data.id,'target-shooter');
  assert(!mounted.hostError&&!mounted.errorText&&mounted.innerOverflow<=2&&mounted.outerOverflow<=2,`${viewportName}/${data.id}: mount`);
  await page.waitForFunction(()=>{const d=document.querySelector('#root iframe')?.contentDocument;return Boolean(d?.querySelector('.duduq-ts-option-audio-panel')&&d.querySelectorAll('.duduq-ts-target').length===4)},null,{timeout:12_000});
  const init=await page.evaluate(()=>{const f=document.querySelector('#root iframe'),w=f.contentWindow,d=f.contentDocument,p={speak:0,cancel:0,texts:[]};try{Object.defineProperty(w,'speechSynthesis',{configurable:true,value:{cancel(){p.cancel++},speak(u){p.speak++;p.texts.push(String(u?.text||''))}}})}catch(_){};try{Object.defineProperty(w,'SpeechSynthesisUtterance',{configurable:true,value:function(t){this.text=String(t);this.lang=''}})}catch(_){};w.__Y3_M02_AUDIO__=p;return{prompt:(d.querySelector('.duduq-ts-option-audio-prompt')?.innerText||'').trim(),disabled:d.querySelector('.duduq-ts-option-audio-confirm')?.disabled}});
  assert(init.prompt==='21'&&init.disabled===true,`${viewportName}/M02 initial ${JSON.stringify(init)}`);
  const wrong=data.target.items.find(i=>i.id!==data.target.correctId),correct=data.target.items.find(i=>i.id===data.target.correctId);
  const preview=await page.evaluate(({label})=>{const f=document.querySelector('#root iframe'),d=f.contentDocument,w=f.contentWindow,b=[...d.querySelectorAll('.duduq-ts-target')].find(x=>(x.getAttribute('aria-label')||'').toLowerCase().endsWith(String(label).toLowerCase()));if(!b)throw new Error('wrong target missing');b.click();b.click();return{sel:b.getAttribute('data-duduq-option-audio-selected'),state:b.getAttribute('data-state'),disabled:d.querySelector('.duduq-ts-option-audio-confirm')?.disabled,p:w.__Y3_M02_AUDIO__}}, {label:wrong.label});
  assert(preview.sel==='true'&&preview.state==='idle'&&!preview.disabled&&preview.p.speak>=2,`${viewportName}/M02 preview ${JSON.stringify(preview)}`);
  await page.evaluate(()=>document.querySelector('#root iframe').contentDocument.querySelector('.duduq-ts-option-audio-confirm').click());
  await page.waitForFunction(()=>document.querySelector('#root iframe')?.contentDocument?.querySelector('.duduq-engine-feedback')?.getAttribute('data-state')==='retry',null,{timeout:7_000});
  await page.waitForTimeout(1150);
  await page.evaluate(({label})=>{const d=document.querySelector('#root iframe').contentDocument,b=[...d.querySelectorAll('.duduq-ts-target')].find(x=>(x.getAttribute('aria-label')||'').toLowerCase().endsWith(String(label).toLowerCase()));if(!b)throw new Error('correct target missing');b.click();const c=d.querySelector('.duduq-ts-option-audio-confirm');if(c.disabled)throw new Error('confirm disabled');c.click()}, {label:correct.label});
  await page.waitForFunction(()=>Boolean(document.querySelector('#root .duduq-completion')),null,{timeout:10_000});
  console.log(`INTERACTION M02/${viewportName}/EN3-M2-01 option-audio repeat=PASS retry=PASS completion=PASS`);
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}}),page=await context.newPage();
    const pageErrors=[],consoleErrors=[];
    page.on('pageerror',error=>pageErrors.push(String(error?.stack||error?.message||error)));
    page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
    const response=await page.goto(`${URL}?trackB=${viewport.name}&r151=1`,{waitUntil:'domcontentloaded',timeout:45_000});
    assert(response?.ok(),`${viewport.name}: HTTP ${response?.status()}`);
    await waitEngine(page);
    const snapshot=await moduleSnapshot(page);
    assert(snapshot.version===expectedVersion,`${viewport.name}: version ${snapshot.version}`);
    assert(snapshot.activities===15,`${viewport.name}: activities ${snapshot.activities}/15`);
    assert(stable(snapshot.distribution)===stable(expectedDistribution),`${viewport.name}: distribution ${JSON.stringify(snapshot.distribution)}`);
    assert(snapshot.manifestRevision===151,`${viewport.name}: Canary R${snapshot.manifestRevision}`);
    assert(snapshot.core==='1.0.12',`${viewport.name}: Core ${snapshot.core}`);
    assert(snapshot.mechanics['target-shooter']==='1.0.23',`${viewport.name}: target-shooter ${snapshot.mechanics['target-shooter']||'MISSING'}`);
    assert(snapshot.mechanics['smart-sentence']==='4.0.20',`${viewport.name}: smart-sentence ${snapshot.mechanics['smart-sentence']||'MISSING'}`);
    assert(snapshot.implementationStatus==='PASS'&&snapshot.technicalStatus==='PASS'&&snapshot.technicalBlockers===0,`${viewport.name}: implementation status ${JSON.stringify(snapshot)}`);
    if(moduleNumber<=2)assert(snapshot.visualStatus==='PASS'&&snapshot.publicationStatus==='READY'&&snapshot.pending===0,`${viewport.name}: sentinel visual/publication ${JSON.stringify(snapshot)}`);
    else assert(snapshot.visualStatus==='PLACEHOLDER'&&/^NO-GO/.test(snapshot.publicationStatus)&&snapshot.pending>0,`${viewport.name}: visual/publication status ${JSON.stringify(snapshot)}`);
    assert(!/^Erro:/i.test(snapshot.rootText),`${viewport.name}: root error ${snapshot.rootText}`);

    pageErrors.length=0;consoleErrors.length=0;
    if(moduleNumber===1){
      for(const [id,mechanic] of m1Representatives){const result=await mount(page,id,mechanic);assert(!result.hostError&&!result.errorText&&result.bodyLength>0&&result.innerOverflow<=2&&result.outerOverflow<=2,`${viewport.name}/${id}: M01 mount/overflow`);}
    }else if(moduleNumber===2){
      for(const [id,mechanic] of [['EN3-M2-08','smart-sentence'],['EN3-M2-12','bubble-pop']]){const result=await mount(page,id,mechanic);assert(!result.hostError&&!result.errorText&&result.bodyLength>0&&result.innerOverflow<=2&&result.outerOverflow<=2,`${viewport.name}/${id}: M02 mount/overflow`);}
      await exerciseM02OptionAudio(page,viewport.name);
    }else{
      await exerciseSmart(page,viewport.name);
      await exerciseTarget(page,viewport.name);
    }
    assert(pageErrors.length===0,`${viewport.name}: pageerror ${pageErrors.join(' | ')}`);
    assert(consoleErrors.length===0,`${viewport.name}: console error ${consoleErrors.join(' | ')}`);

    console.log(`PASS M${tag} ${viewport.name} — 15/15 content; R151 regression/implementation browser PASS; overflow=0`);
    await context.close();
  }
  console.log(`Y3_M${tag}_BROWSER = PASS — 4/4 viewports`);
}finally{await browser.close()}
