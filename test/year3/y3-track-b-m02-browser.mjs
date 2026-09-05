import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/content/english/year-3/module-02/index.html`;
const viewports=[
  {name:"desktop-1366x768",width:1366,height:768},
  {name:"desktop-browser-1366x640",width:1366,height:640},
  {name:"tablet-768x1024",width:768,height:1024},
  {name:"mobile-390x844",width:390,height:844}
];
const representatives=[
  {id:"EN3-M2-08",mechanic:"smart-sentence"},
  {id:"EN3-M2-12",mechanic:"bubble-pop"},
  {id:"EN3-M2-11",mechanic:"target-shooter"}
];
const expectedDistribution={"target-shooter":10,"smart-sentence":4,"bubble-pop":1};

function assert(ok,message){if(!ok)throw new Error(message)}
function stable(value){return JSON.stringify(value,Object.keys(value).sort())}

async function waitEngine(page){
  await page.waitForFunction(()=>Boolean(
    window.DUDUQ_ENGINE_READY&&window.DuduQ&&window.DUDUQ_CONTENT?.english?.year3?.module02
  ),null,{timeout:45_000});
}

async function moduleSnapshot(page){
  return page.evaluate(()=>{
    const module=window.DUDUQ_CONTENT.english.year3.module02;
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    const mechanics=window.DuduQ.listMechanics().reduce((out,m)=>{out[m.id]=m.version;return out},{});
    return {
      version:module.version,activities:module.activities.length,distribution,mechanics,
      rootText:(document.getElementById("root")?.innerText||"").trim(),
      manifestRevision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      core:window.DUDUQ_ENGINE_MANIFEST?.core?.release
    };
  });
}

async function mountRepresentative(page,representative){
  await page.evaluate(({id,mechanic})=>{
    const module=window.DUDUQ_CONTENT.english.year3.module02;
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`representative activity missing: ${id}`);
    if(activity.mechanic!==mechanic)throw new Error(`${id}: expected ${mechanic}, got ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:"browser-m02"})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-m02-browser-${id}`,title:`Y3 M02 ${id}`,year:3,subject:"english",module:2,container:"#root",
      steps:[{id:`probe-${id}`,mechanic,payload:{id:`probe-${id}-payload`,title:activity.title,subject:"english",year:3,module:2,questions:activity.questions}}]
    });
  },representative);

  await page.waitForFunction(()=>{
    const rootText=(document.getElementById("root")?.innerText||"").trim();
    if(/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText))return true;
    const frame=document.querySelector("#root iframe");
    if(!frame?.contentDocument?.body)return false;
    const visibleText=(frame.contentDocument.body.innerText||"").trim();
    return frame.contentDocument.readyState==="complete"&&visibleText.length>0;
  },null,{timeout:30_000});
  await page.waitForTimeout(300);

  return page.evaluate(({id,mechanic})=>{
    const frame=document.querySelector("#root iframe"),doc=frame?.contentDocument;
    const visibleText=(doc?.body?.innerText||"").trim();
    const root=document.getElementById("root"),rootText=(root?.innerText||"").trim();
    const hostError=/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText);
    const innerOverflow=doc?Math.max(0,doc.documentElement.scrollWidth-doc.documentElement.clientWidth,doc.body.scrollWidth-doc.body.clientWidth):0;
    const outerOverflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth);
    return {id,mechanic,bodyLength:visibleText.length,frameTitle:frame?.title||"",innerOverflow,outerOverflow,rootText,hostError,errorText:/Erro ao preparar|Erro:|falha ao preparar/i.test(visibleText)};
  },representative);
}

async function exerciseOptionAudio(page,viewportName){
  await mountRepresentative(page,{id:"EN3-M2-01",mechanic:"target-shooter"});
  await page.waitForFunction(()=>{
    const doc=document.querySelector("#root iframe")?.contentDocument;
    return Boolean(doc?.querySelector('.duduq-ts-option-audio-panel')&&doc.querySelectorAll('.duduq-ts-target').length===4);
  },null,{timeout:12_000});

  const initial=await page.evaluate(()=>{
    const frame=document.querySelector("#root iframe"),win=frame.contentWindow,doc=frame.contentDocument;
    const probe={cancel:0,speak:0,texts:[]};
    try{Object.defineProperty(win,'speechSynthesis',{configurable:true,value:{cancel(){probe.cancel+=1},speak(utterance){probe.speak+=1;probe.texts.push(String(utterance?.text||''))}}})}catch(_){
      try{win.speechSynthesis.cancel=()=>{probe.cancel+=1};win.speechSynthesis.speak=(utterance)=>{probe.speak+=1;probe.texts.push(String(utterance?.text||''))}}catch(__){}
    }
    try{Object.defineProperty(win,'SpeechSynthesisUtterance',{configurable:true,value:function(text){this.text=String(text);this.lang='';this.rate=1;this.pitch=1}})}catch(_){}
    win.__M02_AUDIO_PROBE__=probe;
    return {
      prompt:doc.querySelector('.duduq-ts-option-audio-prompt')?.textContent?.trim()||'',
      confirmDisabled:doc.querySelector('.duduq-ts-option-audio-confirm')?.disabled,
      feedback:doc.querySelector('.duduq-engine-feedback')?.getAttribute('data-state')||'idle'
    };
  });
  assert(initial.prompt==='21',`${viewportName}/EN3-M2-01: numeral visual ${initial.prompt}`);
  assert(initial.confirmDisabled===true,`${viewportName}/EN3-M2-01: confirm starts enabled`);

  const repeat=await page.evaluate(()=>{
    const frame=document.querySelector("#root iframe"),doc=frame.contentDocument,win=frame.contentWindow;
    const target=[...doc.querySelectorAll('.duduq-ts-target')].find(button=>/alvo twenty$/i.test(button.getAttribute('aria-label')||''));
    if(!target)throw new Error('wrong option target twenty not found');
    target.click();target.click();
    return {
      selected:target.getAttribute('data-duduq-option-audio-selected'),
      targetState:target.getAttribute('data-state'),
      confirmDisabled:doc.querySelector('.duduq-ts-option-audio-confirm')?.disabled,
      feedback:doc.querySelector('.duduq-engine-feedback')?.getAttribute('data-state')||'idle',
      probe:win.__M02_AUDIO_PROBE__
    };
  });
  assert(repeat.selected==='true',`${viewportName}/EN3-M2-01: preview selection missing`);
  assert(repeat.targetState==='idle',`${viewportName}/EN3-M2-01: preview answered before confirm (${repeat.targetState})`);
  assert(repeat.confirmDisabled===false,`${viewportName}/EN3-M2-01: confirm not enabled after preview`);
  assert(repeat.probe.cancel>=2&&repeat.probe.speak>=2,`${viewportName}/EN3-M2-01: repeat audio ${JSON.stringify(repeat.probe)}`);
  assert(repeat.probe.texts.slice(-2).every(text=>text==='twenty'),`${viewportName}/EN3-M2-01: preview text ${JSON.stringify(repeat.probe.texts)}`);

  await page.evaluate(()=>{
    const doc=document.querySelector("#root iframe").contentDocument;
    doc.querySelector('.duduq-ts-option-audio-confirm').click();
  });
  await page.waitForFunction(()=>{
    const doc=document.querySelector("#root iframe")?.contentDocument;
    const feedback=doc?.querySelector('.duduq-engine-feedback')?.getAttribute('data-state');
    return feedback==='retry';
  },null,{timeout:6_000});
  const retry=await page.evaluate(()=>{
    const doc=document.querySelector("#root iframe").contentDocument;
    return {feedback:doc.querySelector('.duduq-engine-feedback')?.getAttribute('data-state'),selected:doc.querySelector('[data-duduq-option-audio-selected="true"]')?.getAttribute('aria-label')||'',confirmDisabled:doc.querySelector('.duduq-ts-option-audio-confirm')?.disabled};
  });
  assert(retry.feedback==='retry',`${viewportName}/EN3-M2-01: retry feedback missing`);
  assert(!retry.selected,`${viewportName}/EN3-M2-01: selection not cleared after confirm`);
  assert(retry.confirmDisabled===true,`${viewportName}/EN3-M2-01: confirm not reset after wrong answer`);

  await page.waitForTimeout(1100);
  await page.evaluate(()=>{
    const doc=document.querySelector("#root iframe").contentDocument;
    const correct=[...doc.querySelectorAll('.duduq-ts-target')].find(button=>/alvo twenty-one$/i.test(button.getAttribute('aria-label')||''));
    if(!correct)throw new Error('correct option target twenty-one not found');
    correct.click();
    const confirm=doc.querySelector('.duduq-ts-option-audio-confirm');
    if(confirm.disabled)throw new Error('confirm remained disabled after correct preview');
    confirm.click();
  });
  await page.waitForFunction(()=>Boolean(document.querySelector('#root .duduq-completion')),null,{timeout:9_000});
  const complete=await page.evaluate(()=>({
    completion:Boolean(document.querySelector('#root .duduq-completion')),
    text:(document.querySelector('#root .duduq-completion')?.innerText||'').trim(),
    progress:(document.querySelector('#root .duduq-completion-progress-text')?.textContent||'').trim()
  }));
  assert(complete.completion,`${viewportName}/EN3-M2-01: completion bridge missing`);
  assert(complete.text.length>0,`${viewportName}/EN3-M2-01: completion empty`);
  console.log(`INTERACTION ${viewportName}/EN3-M2-01 option-audio repeat=PASS retry=PASS feedback=PASS completion=PASS progress=${complete.progress||'rendered'}`);
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}}),page=await context.newPage();
    const pageErrors=[],consoleErrors=[];
    page.on("pageerror",error=>pageErrors.push(String(error?.stack||error?.message||error)));
    page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});
    const response=await page.goto(`${URL}?trackB=${viewport.name}&v=1`,{waitUntil:"domcontentloaded",timeout:45_000});
    assert(response?.ok(),`${viewport.name}: HTTP ${response?.status()}`);
    await waitEngine(page);
    const snapshot=await moduleSnapshot(page);
    assert(snapshot.version==='3.0.0-track-b-m02',`${viewport.name}: version ${snapshot.version}`);
    assert(snapshot.activities===15,`${viewport.name}: activities ${snapshot.activities}/15`);
    assert(stable(snapshot.distribution)===stable(expectedDistribution),`${viewport.name}: distribution ${JSON.stringify(snapshot.distribution)}`);
    assert(snapshot.manifestRevision===150,`${viewport.name}: Canary R${snapshot.manifestRevision}`);
    assert(snapshot.core==='1.0.12',`${viewport.name}: Core ${snapshot.core}`);
    for(const [mechanic,version] of Object.entries({'smart-sentence':'4.0.20','bubble-pop':'1.2.13','target-shooter':'1.0.22'}))assert(snapshot.mechanics[mechanic]===version,`${viewport.name}: ${mechanic} registered ${snapshot.mechanics[mechanic]||'MISSING'}, expected ${version}`);
    assert(!/^Erro:/i.test(snapshot.rootText),`${viewport.name}: root error ${snapshot.rootText}`);

    for(const representative of representatives){
      pageErrors.length=0;consoleErrors.length=0;
      const result=await mountRepresentative(page,representative);
      console.log(`MOUNT ${viewport.name}/${representative.id}/${representative.mechanic} frame=${result.frameTitle||'NONE'} body=${result.bodyLength} hostError=${result.hostError}`);
      if(consoleErrors.length)console.log(`CONSOLE_ERROR ${viewport.name}/${representative.id}: ${consoleErrors.join(' || ')}`);
      if(pageErrors.length)console.log(`PAGEERROR ${viewport.name}/${representative.id}: ${pageErrors.join(' || ')}`);
      assert(!result.hostError,`${viewport.name}/${representative.id}: host error ${result.rootText}; console=${consoleErrors.join(' || ')}; pageerror=${pageErrors.join(' || ')}`);
      assert(!result.errorText,`${viewport.name}/${representative.id}: mechanic error text; console=${consoleErrors.join(' || ')}`);
      assert(result.bodyLength>0,`${viewport.name}/${representative.id}: empty iframe`);
      assert(result.outerOverflow<=2,`${viewport.name}/${representative.id}: outer overflow ${result.outerOverflow}px`);
      assert(result.innerOverflow<=2,`${viewport.name}/${representative.id}: inner overflow ${result.innerOverflow}px`);
      assert(pageErrors.length===0,`${viewport.name}/${representative.id}: pageerror ${pageErrors.join(' | ')}`);
    }

    pageErrors.length=0;consoleErrors.length=0;
    await exerciseOptionAudio(page,viewport.name);
    assert(pageErrors.length===0,`${viewport.name}/EN3-M2-01: pageerror ${pageErrors.join(' | ')}`);
    assert(consoleErrors.length===0,`${viewport.name}/EN3-M2-01: console error ${consoleErrors.join(' | ')}`);
    console.log(`PASS ${viewport.name} — M02 15/15 content; mechanics 3/3 mounted; option-audio interaction/retry/completion PASS; overflow=0`);
    await context.close();
  }
  console.log('Y3_M02_BROWSER = PASS — 4/4 viewports');
}finally{
  await browser.close();
}
