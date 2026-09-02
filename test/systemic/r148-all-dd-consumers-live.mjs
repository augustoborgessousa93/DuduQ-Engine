import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE || "https://duduq-engine.pages.dev";
const ROOT = process.cwd();
const YEARS = [1,2,3,4,5];
const MODULES = [1,2,3,4,5,6];
const VIEWPORTS = [
  { name:"desktop", width:1366, height:768 },
  { name:"mobile", width:390, height:844 }
];
const assert = (value, message) => { if (!value) throw new Error(message); };
const moduleKey = (y,m) => `year-${y}/module-${String(m).padStart(2,"0")}`;

function walk(dir) {
  const out=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(?:js|html|json)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

function staticInventory() {
  const base=path.join(ROOT,"content","english");
  const files=walk(base);
  const consumers=new Map();
  const legacy=[];
  for (const file of files) {
    const text=fs.readFileSync(file,"utf8");
    const rel=path.relative(ROOT,file).replaceAll(path.sep,"/");
    const mm=rel.match(/^content\/english\/(year-\d+)\/(module-\d+)\//);
    if (mm && /drag-drop|drag_drop/i.test(text)) {
      const key=`${mm[1]}/${mm[2]}`;
      if(!consumers.has(key)) consumers.set(key,[]);
      consumers.get(key).push(rel);
    }
    const relevantPin =
      /\/engine\/releases\/mechanics\/drag-drop\/2\.0\.24\//i.test(text) ||
      /drag-drop[^\n]{0,120}(?:release|version)[^\n]{0,40}2\.0\.24/i.test(text) ||
      /(?:release|version)[^\n]{0,40}2\.0\.24[^\n]{0,120}drag-drop/i.test(text);
    if (relevantPin && rel.startsWith("content/english/")) legacy.push(rel);
  }
  assert(consumers.size===30,`consumer modules ${consumers.size}, expected 30`);
  assert(legacy.length===0,`legacy 2.0.24 pins: ${legacy.join(", ")}`);
  console.log(`DRAG_DROP_CONSUMER_MODULES=${consumers.size}`);
  console.log(`LEGACY_2_0_24_PINS=${legacy.length}`);
  return {consumers:[...consumers.keys()].sort(),legacy};
}

async function installTtsStub(page) {
  await page.addInitScript(() => {
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false;this.pending=false},pause(){this.paused=true},resume(){this.paused=false},speak(u){this.speaking=true;this.pending=false;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try { Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true}); } catch { globalThis.speechSynthesis=synth; }
  });
}

async function boot(page,y,m) {
  const url=`${BASE}/content/english/year-${y}/module-${String(m).padStart(2,"0")}/?r148=${Date.now()}`;
  const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
  assert(response?.ok(),`${moduleKey(y,m)} HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
  const state=await page.evaluate(()=>({
    revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
    core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,
    manifestVersion:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,
    registeredVersion:window.DuduQ?.getMechanic?.("drag-drop")?.version
  }));
  assert(state.revision===148,`${moduleKey(y,m)} revision ${state.revision}`);
  assert(state.core==="1.0.12",`${moduleKey(y,m)} core ${state.core}`);
  assert(state.manifestVersion==="2.0.25",`${moduleKey(y,m)} manifest DD ${state.manifestVersion}`);
  assert(state.registeredVersion==="2.0.25",`${moduleKey(y,m)} registered DD ${state.registeredVersion}`);
  return state;
}

async function ddQuestions(page,y,m) {
  return page.evaluate(({y,m})=>{
    const seen=new Set();
    function find(value){
      if(!value||typeof value!=="object"||seen.has(value)) return null;
      seen.add(value);
      if(Array.isArray(value.activities)&&Number(value.year)===y&&Number(value.module)===m) return value;
      for(const child of Object.values(value)){const found=find(child);if(found)return found;}
      return null;
    }
    const mod=find(window.DUDUQ_CONTENT||{});
    const out=[];
    for(const activity of mod?.activities||[]) for(const q of activity.questions||[]) {
      const mech=String(activity.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase().replace(/_/g,"-");
      if(mech==="drag-drop") out.push(q);
    }
    return out;
  },{y,m});
}

function contract(question) {
  const p=question?.payload||{};
  let pairs=[];
  if(Array.isArray(p.items)) pairs=p.items.filter(x=>x?.required!==false&&x?.targetId).map(x=>({source:String(x.id),target:String(x.targetId),sequenceIndex:Number.isFinite(Number(x.sequenceIndex))?Number(x.sequenceIndex):9999}));
  if(!pairs.length&&question?.answer?.type==="pairs") pairs=(question.answer.value||[]).map((x,i)=>({source:String(x?.source||x?.itemId||""),target:String(x?.target||x?.targetId||""),sequenceIndex:i})).filter(x=>x.source&&x.target);
  pairs.sort((a,b)=>a.sequenceIndex-b.sequenceIndex);
  const requiredSources=new Set(pairs.map(x=>x.source));
  const items=p.items||question?.alternatives||[];
  const targets=p.targets||question?.metadata?.targets||[];
  const distractor=items.find(x=>!requiredSources.has(String(x?.id||"")));
  let wrong=null;
  if(distractor&&pairs[0]) wrong={source:String(distractor.id),target:pairs[0].target};
  if(!wrong&&pairs[0]&&targets.length>1){const t=targets.find(x=>String(x?.id||"")!==pairs[0].target);if(t)wrong={source:pairs[0].source,target:String(t.id)}}
  return {pairs,wrong};
}

async function destroy(page){
  await page.evaluate(()=>{try{window.__R148_ALL_DESTROY__?.()}catch{};document.querySelector("#r148-all-host")?.remove();});
}

async function mount(page,question,y,m){
  await page.evaluate(({question,y,m})=>{
    window.__R148_ALL_RESULTS__=[];
    window.__R148_ALL_COMPLETE__=[];
    if(!window.__R148_ALL_LISTENER__){
      addEventListener("message",e=>{if(e.data?.type==="DUDUQ_DRAG_DROP_RESULT")window.__R148_ALL_RESULTS__.push(e.data.payload)});
      window.__R148_ALL_LISTENER__=true;
    }
    document.querySelector("#r148-all-host")?.remove();
    const host=document.body.appendChild(document.createElement("div"));host.id="r148-all-host";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";
    const mech=window.DuduQ?.getMechanic?.("drag-drop");
    let input=question;
    if(!mech?.validate?.(input)&&question?.payload) input={id:question.id,title:"DD",instruction:question.instruction||question.statement||"",payload:question.payload};
    if(!mech?.validate?.(input)) throw Error(`validate ${question?.id}`);
    window.__R148_ALL_DESTROY__=mech.mount({container:host,payload:input,context:{subject:"english",year:y,module:m,stepId:question.id,stepIndex:0,totalSteps:1},onComplete:r=>window.__R148_ALL_COMPLETE__.push(r)});
  },{question,y,m});
  const iframe=page.locator("#r148-all-host iframe");
  await iframe.waitFor({state:"attached",timeout:12000});
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
  return frame;
}

async function freeZoneClick(zone){
  const pos=await zone.evaluate(el=>{
    const r=el.getBoundingClientRect();
    const xs=[8,r.width-8,r.width/2,16,r.width-16].filter(x=>x>2&&x<r.width-2);
    const ys=[r.height-8,8,r.height/2,r.height-16,16].filter(y=>y>2&&y<r.height-2);
    for(const y of ys)for(const x of xs){const hit=document.elementFromPoint(r.left+x,r.top+y);if(!hit?.closest?.(".duduq-dd2-item"))return{x,y};}
    return{x:Math.max(4,Math.min(r.width-4,8)),y:Math.max(4,Math.min(r.height-4,r.height-8))};
  });
  await zone.click({force:true,position:pos});
}

async function place(frame,source,target){
  const item=frame.locator(`[data-dd2-item-id="${source}"]`).first();
  await item.waitFor({state:"visible",timeout:7000});
  await item.click({force:true});
  const zone=frame.locator(`[data-dd2-target-id="${target}"] .duduq-dd2-zone`).first();
  await zone.waitFor({state:"visible",timeout:7000});
  await freeZoneClick(zone);
}

async function oneConsumer(page,question,y,m,viewport){
  const c=contract(question);
  assert(c.pairs.length,`${moduleKey(y,m)} ${question.id}: no normalized pair contract`);
  const frame=await mount(page,question,y,m);
  await place(frame,c.pairs[0].source,c.pairs[0].target);
  const afterDrop=await page.evaluate(()=>window.__R148_ALL_RESULTS__.length);
  assert(afterDrop===0,`${moduleKey(y,m)} ${question.id}: drop evaluated`);
  for(const pair of c.pairs.slice(1)) await place(frame,pair.source,pair.target);
  const confirm=frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({state:"visible",timeout:7000});
  const before=await page.evaluate(()=>window.__R148_ALL_RESULTS__.length);
  await confirm.click({force:true});
  await page.waitForFunction(n=>window.__R148_ALL_RESULTS__.length>n,before,{timeout:8000});
  const result=await page.evaluate(()=>window.__R148_ALL_RESULTS__.at(-1));
  assert(result?.isCorrect===true,`${moduleKey(y,m)} ${question.id}: success false`);
  await page.waitForFunction(()=>window.__R148_ALL_COMPLETE__.length>0,null,{timeout:8000});
  await destroy(page);
  return {year:y,module:m,questionId:question.id,viewport,canaryRevision:148,dragDropVersion:"2.0.25",confirm:"PASS",success:"PASS"};
}

async function retryRepresentative(page){
  await boot(page,1,1);
  const qs=await ddQuestions(page,1,1);
  const q=qs.find(x=>x.id==="EN1-M1-02")||qs.find(x=>contract(x).wrong);
  assert(q,"retry representative not found");
  const c=contract(q);assert(c.wrong,"retry wrong placement unavailable");
  let frame=await mount(page,q,1,1);
  await place(frame,c.wrong.source,c.wrong.target);
  assert(await page.evaluate(()=>window.__R148_ALL_RESULTS__.length)===0,"retry rep: drop evaluated");
  const confirm=frame.locator(".duduq-dd2-confirm");
  await confirm.waitFor({state:"visible",timeout:7000});
  await confirm.click({force:true});
  await page.waitForFunction(()=>window.__R148_ALL_RESULTS__.length===1,null,{timeout:8000});
  const wrong=await page.evaluate(()=>window.__R148_ALL_RESULTS__[0]);
  assert(wrong?.isCorrect===false,"retry rep: wrong not evaluated false");
  await page.waitForTimeout(950);
  const wrongBack=frame.locator(`[data-dd2-item-id="${c.wrong.source}"]`);
  assert(await wrongBack.count()>0,"retry rep: wrong item unavailable");
  await destroy(page);
  return {year:1,module:1,questionId:q.id,retry:"PASS"};
}

async function progressRepresentative(page,y){
  await boot(page,y,1);
  const start=page.locator(".duduq-intro-start-button");
  await start.waitFor({state:"visible",timeout:30000});
  await start.click({force:true});
  await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&window.DuduQTransition?.getState?.()==="idle")},null,{timeout:35000});
  const before=await page.evaluate(()=>window.DuduQ.getSession());
  const accepted=await page.evaluate(()=>window.DuduQ.next({qa:"r148-all-consumers"}));
  assert(accepted!==false,`Y${y} progress rejected`);
  await page.waitForFunction(i=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&(s.completed||s.stepIndex!==i)&&window.DuduQTransition?.getState?.()==="idle")},before.stepIndex,{timeout:12000});
  return {year:y,progress:"PASS"};
}

const inventory=staticInventory();
const browser=await chromium.launch({headless:true});
const tested=[];
const yearStatus={1:"PASS",2:"PASS",3:"PASS",4:"PASS",5:"PASS"};
let retry=null;
const progress=[];
try{
  for(const viewport of VIEWPORTS){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    await installTtsStub(page);
    try{
      for(const y of YEARS) for(const m of MODULES){
        const errors=[];const critical404=[];
        const onError=e=>errors.push(String(e?.message||e));
        const onResponse=r=>{if(r.status()===404&&(r.url().includes("/engine/")||r.url().includes(`/content/english/year-${y}/`)))critical404.push(r.url())};
        page.on("pageerror",onError);page.on("response",onResponse);
        try{
          await boot(page,y,m);
          const qs=await ddQuestions(page,y,m);
          assert(qs.length,`${moduleKey(y,m)}: no real DD question`);
          const q=qs.find(x=>contract(x).pairs.length);
          assert(q,`${moduleKey(y,m)}: no compatible DD question`);
          tested.push(await oneConsumer(page,q,y,m,viewport.name));
          assert(!errors.length,`${moduleKey(y,m)} ${viewport.name}: pageError ${errors.join(" | ")}`);
          assert(!critical404.length,`${moduleKey(y,m)} ${viewport.name}: critical404 ${critical404.join(" | ")}`);
          console.log(`PASS ${viewport.name} ${moduleKey(y,m)} ${q.id}`);
        }finally{
          page.off("pageerror",onError);page.off("response",onResponse);await destroy(page);
        }
      }
    }finally{await page.close();}
  }

  const behaviorPage=await browser.newPage({viewport:{width:1366,height:768}});await installTtsStub(behaviorPage);
  try{retry=await retryRepresentative(behaviorPage);for(const y of YEARS)progress.push(await progressRepresentative(behaviorPage,y));}finally{await behaviorPage.close();}
}finally{await browser.close();}

const uniqueModules=new Set(tested.map(x=>`${x.year}/${x.module}`));
assert(uniqueModules.size===30,`modules tested ${uniqueModules.size}/30`);
assert(tested.length===60,`viewport executions ${tested.length}/60`);
console.log(JSON.stringify({status:"R148_ALL_DD_CONSUMERS_PASS",consumerModules:inventory.consumers.length,modulesTested:`${uniqueModules.size}/30`,viewportExecutions:tested.length,legacyPins:inventory.legacy.length,payloadFixes:0,years:yearStatus,retry,progress,tested},null,2));
