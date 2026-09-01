import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/test/drag-drop/smart-confirm-2.0.25/index.html`;
const assert=(c,m)=>{if(!c)throw new Error(m)};

const singleChoice=()=>({id:"sc",title:"SINGLE CHOICE",instruction:"Ouça e escolha.",behavior:{shuffleItems:false,shuffleTargets:false},payload:{mode:"single-choice",strategy:"association",items:[{id:"A",label:"1",spokenText:"Goodbye",speechLocale:"en-US",required:false},{id:"B",label:"2",spokenText:"Good morning",speechLocale:"en-US",required:true,targetId:"scene"},{id:"C",label:"3",spokenText:"Good afternoon",speechLocale:"en-US",required:false}],targets:[{id:"scene",label:"CENA",capacity:1,kind:"box"}]}});

const classification=()=>({id:"class",title:"CLASSIFICATION",instruction:"Classifique.",behavior:{shuffleItems:false,shuffleTargets:false},payload:{mode:"classification",strategy:"classification",items:[{id:"A",label:"APPLE",targetId:"left",required:true},{id:"B",label:"DOG",targetId:"right",required:true},{id:"C",label:"CAT",targetId:"right",required:true}],targets:[{id:"left",label:"FRUIT",capacity:2,kind:"category"},{id:"right",label:"ANIMALS",capacity:2,kind:"category"}]}});

const association=()=>({id:"assoc",title:"ASSOCIATION",instruction:"Associe.",behavior:{shuffleItems:false,shuffleTargets:false,smartSnap:true,magneticRadiusPx:104,snapRadiusPx:44},payload:{mode:"association",strategy:"association",items:[{id:"one",label:"ONE",targetId:"t1",required:true},{id:"two",label:"TWO",targetId:"t2",required:true}],targets:[{id:"t1",label:"1",capacity:1,kind:"box"},{id:"t2",label:"2",capacity:1,kind:"box"}]}});

function item(id){return `.duduq-dd2-item[data-dd2-item-id="${id}"]`}
function zone(id){return `.duduq-dd2-target[data-dd2-target-id="${id}"] .duduq-dd2-zone`}

async function installTtsStub(page){
  await page.addInitScript(()=>{
    const state={calls:0,last:""};
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false;},pause(){},resume(){},speak(u){state.calls++;state.last=String(u?.text||"");this.speaking=true;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true});}catch{try{globalThis.speechSynthesis=synth}catch{}}
    globalThis.__DD225_TTS__=state;
  });
}

async function open(browser,v){
  const context=await browser.newContext({viewport:{width:v.width,height:v.height},hasTouch:!!v.touch,isMobile:!!v.touch});
  const page=await context.newPage(); await installTtsStub(page); if(v.reduced)await page.emulateMedia({reducedMotion:"reduce"});
  const errors=[]; const critical404=[]; page.on("pageerror",e=>errors.push(String(e?.message||e))); page.on("response",r=>{if(r.status()===404&&(r.url().includes("/engine/")||r.url().includes("/test/drag-drop/")))critical404.push(r.url())});
  const res=await page.goto(`${URL}?v=${v.name}`,{waitUntil:"domcontentloaded",timeout:30000}); assert(res?.ok(),`${v.name}: harness HTTP ${res?.status()}`);
  await page.waitForFunction(()=>window.dd225Mechanic?.()?.version==="2.0.25",null,{timeout:15000});
  return {context,page,errors,critical404};
}

async function mount(page,payload){
  await page.evaluate(p=>window.dd225Mount(p),payload);
  await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector(".duduq-dd2-root")),null,{timeout:15000});
  await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;const x=[...(d?.querySelectorAll(".duduq-dd2-item")||[])];return x.length>0&&x.some(n=>!n.disabled)},null,{timeout:15000});
  await page.waitForTimeout(60);
  await page.evaluate(()=>{window.__DD225_RESULTS__=[];window.__DD225_COMPLETIONS__=[];});
}

async function state(page){return page.evaluate(()=>{const f=document.querySelector("#mount iframe"),d=f?.contentDocument,r=d?.querySelector(".duduq-dd2-root");const locations={};d?.querySelectorAll('.duduq-dd2-item[data-dd2-item-id]')?.forEach(n=>{const id=n.getAttribute('data-dd2-item-id');locations[id]=n.closest('[data-dd2-target-id]')?.getAttribute('data-dd2-target-id')||'bank';});return{results:window.__DD225_RESULTS__.slice(),completions:window.__DD225_COMPLETIONS__.length,errors:window.__DD225_ERRORS__.slice(),feedback:d?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state")||"",confirm:d?.querySelectorAll(".duduq-dd2-confirm").length||0,smart:r?.getAttribute("data-dd225-smart-snap"),instant:r?.getAttribute("data-dd225-instant-validation"),locations,overflowX:d?Math.max(0,d.body.scrollWidth-d.documentElement.clientWidth):999,bodyHeight:d?.body.scrollHeight||0,viewportH:d?.documentElement.clientHeight||0};});}

async function clickPlace(frame,itemId,targetId,touch=false){const i=frame.locator(item(itemId)).first(),z=frame.locator(zone(targetId)).first();if(touch)await i.tap({force:true});else await i.click({force:true});await frame.locator(`${item(itemId)}[data-selected="true"]`).waitFor({state:"visible",timeout:2500});if(touch)await z.tap({force:true});else await z.click({force:true});await frame.locator(`${zone(targetId)} ${item(itemId)}`).waitFor({state:"visible",timeout:2500});}
async function keyboardPlace(frame,itemId,targetId){const i=frame.locator(item(itemId)).first(),z=frame.locator(zone(targetId)).first();await i.focus();await i.press("Enter");await frame.locator(`${item(itemId)}[data-selected="true"]`).waitFor({state:"visible",timeout:2500});await z.focus();await z.press("Enter");await frame.locator(`${zone(targetId)} ${item(itemId)}`).waitFor({state:"visible",timeout:2500});}
async function confirm(frame){await frame.locator(".duduq-dd2-confirm").click({force:true});}

async function runViewport(browser,v){
  const {context,page,errors,critical404}=await open(browser,v); try{
    assert(await page.evaluate(p=>window.dd225Validate(p),singleChoice()),`${v.name}: single-choice válido rejeitado`);
    await mount(page,singleChoice()); const frame=page.frameLocator("#mount iframe"); let s=await state(page);
    assert(s.smart==="true"&&s.instant==="false",`${v.name}: contrato observável smart/confirm ausente`); assert(s.confirm===0,`${v.name}: Confirmar apareceu antes da colocação`); assert(s.overflowX<=6,`${v.name}: overflow inicial ${s.overflowX}px`);
    await clickPlace(frame,"A","scene",!!v.touch); s=await state(page); assert(s.results.length===0,`${v.name}: drop avaliou resposta`); assert(s.confirm===1,`${v.name}: Confirmar não habilitou após colocação`);
    await confirm(frame); await page.waitForFunction(()=>window.__DD225_RESULTS__.length===1,null,{timeout:5000}); s=await state(page); assert(s.results[0].isCorrect===false,`${v.name}: distrator não gerou retry após confirmar`);
    await page.waitForFunction(()=>Boolean(document.querySelector("#mount iframe")?.contentDocument?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="A"]')),null,{timeout:3500});
    if(v.touch)await clickPlace(frame,"B","scene",true);else await keyboardPlace(frame,"B","scene"); s=await state(page); assert(s.results.length===1,`${v.name}: colocação correta avaliou antes do confirmar`); assert(s.confirm===1,`${v.name}: Confirmar ausente na segunda tentativa`); await confirm(frame);
    await page.waitForFunction(()=>window.__DD225_RESULTS__.length===2&&window.__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000}); await page.waitForFunction(()=>window.__DD225_COMPLETIONS__.length===1,null,{timeout:5000});

    await mount(page,classification());
    await clickPlace(frame,"A","left",!!v.touch); await clickPlace(frame,"B","left",!!v.touch); await clickPlace(frame,"C","right",!!v.touch); s=await state(page);
    assert(s.results.length===0,`${v.name}: classificação avaliou antes do confirmar: ${JSON.stringify(s.results)}`);
    assert(s.confirm===1,`${v.name}: classificação não habilitou Confirmar: ${JSON.stringify(s)}`);
    await confirm(frame); await page.waitForFunction(()=>window.__DD225_RESULTS__.length===1,null,{timeout:5000});
    await page.waitForFunction(()=>{const d=document.querySelector("#mount iframe")?.contentDocument;return Boolean(d?.querySelector('.duduq-dd2-bank .duduq-dd2-item[data-dd2-item-id="B"]')&&d?.querySelector('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id="A"]:disabled')&&d?.querySelector('.duduq-dd2-zone .duduq-dd2-item[data-dd2-item-id="C"]:disabled'));},null,{timeout:3500});
    if(v.touch)await clickPlace(frame,"B","right",true);else await clickPlace(frame,"B","right",false); await confirm(frame); await page.waitForFunction(()=>window.__DD225_RESULTS__.length===2&&window.__DD225_RESULTS__[1]?.isCorrect===true,null,{timeout:5000});
    s=await state(page); assert(s.overflowX<=6,`${v.name}: overflow final ${s.overflowX}px`); assert(errors.length===0&&s.errors.length===0,`${v.name}: JS errors ${[...errors,...s.errors].join(" | ")}`); assert(critical404.length===0,`${v.name}: critical404 ${critical404.join(",")}`);
    console.log(`PASS ${v.name} confirm/retry/tap-keyboard responsive`);
  }finally{await context.close();}
}

async function runPointerSmartSnap(browser){
  const {context,page,errors,critical404}=await open(browser,{name:"desktop-pointer",width:1366,height:768}); try{
    await mount(page,association()); const frame=page.frameLocator("#mount iframe"); const i=frame.locator(item("one")).first(); const t=frame.locator('.duduq-dd2-target[data-dd2-target-id="t1"]').first(); const ib=await i.boundingBox(),tb=await t.boundingBox(); assert(ib&&tb,"pointer: bounding boxes ausentes");
    await page.mouse.move(ib.x+ib.width/2,ib.y+ib.height/2); await page.mouse.down(); await page.mouse.move(tb.x-24,tb.y+tb.height/2,{steps:8}); await page.mouse.up();
    await frame.locator(`${zone("t1")} ${item("one")}`).waitFor({state:"visible",timeout:2500}); let s=await state(page); assert(s.results.length===0,"smart snap avaliou no drop");
    const two=frame.locator(item("two")).first(),b=await two.boundingBox(); assert(b,"pointer: segundo item ausente"); await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(20,20,{steps:6});await page.mouse.up(); await frame.locator(`.duduq-dd2-bank ${item("two")}`).waitFor({state:"visible",timeout:2000}); s=await state(page); assert(s.results.length===0,"drop fora contabilizou resposta");
    await keyboardPlace(frame,"two","t2"); await confirm(frame); await page.waitForFunction(()=>window.__DD225_RESULTS__.at(-1)?.isCorrect===true,null,{timeout:5000}); assert(errors.length===0&&critical404.length===0,"pointer: erros/404"); console.log("PASS desktop smart-snap + outside-drop + keyboard");
  }finally{await context.close();}
}

const browser=await chromium.launch({headless:true});
try{
  for(const v of [{name:"desktop-1366x768",width:1366,height:768},{name:"tablet-768x1024",width:768,height:1024,touch:true,reduced:true},{name:"mobile-390x844",width:390,height:844,touch:true,reduced:true},{name:"compact-360x640",width:360,height:640,touch:true,reduced:true},{name:"zoom200-equivalent-683x384",width:683,height:384}]) await runViewport(browser,v);
  await runPointerSmartSnap(browser);
}finally{await browser.close();}
console.log("PASS — Drag & Drop 2.0.25 functional suite");
