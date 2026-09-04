import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const assert=(c,m)=>{if(!c)throw new Error(m)};
const TARGET_IDS=new Set(["EN1-M5-06","EN2-M3-02","EN2-M6-02"]);
const report={audited:66,clusters:{},brokenCandidates:[],functional:[],P0:[],P1:[],TEST_GAP:[]};

async function ttsStub(page){
  await page.addInitScript(()=>{
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false},pause(){},resume(){},speak(u){this.speaking=true;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true})}catch{globalThis.speechSynthesis=synth}
  });
}
function cluster(q){
  const c=q?.metadata?.targetShooter||{},items=c.items||[];
  const audio=Boolean(c.audioText||q?.audio?.text||q?.audio?.src||q?.media?.audio?.text);
  const image=items.some(x=>x?.image||x?.imageUrl||x?.imageAsset||x?.imageAssetKey)||q?.image?.src||q?.media?.image?.src;
  const numeric=items.some(x=>/^\d+$/.test(String(x?.label||"")));
  return [String(c.mode||"default").toLowerCase(),audio?"audio":"no-audio",image?"image":"text",numeric?"numeric":"non-numeric"].join("|");
}
async function allTs(page,year,module){
  return page.evaluate(({year,module})=>{
    const seen=new Set();function walk(v){if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);if(Array.isArray(v.activities)&&Number(v.year)===year&&Number(v.module)===module)return v;for(const x of Object.values(v)){const f=walk(x);if(f)return f}return null}
    const m=walk(window.DUDUQ_CONTENT||{});if(!m)return[];const out=[];for(const a of m.activities||[])for(const q of a.questions||[])if(String(a?.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase().replace(/_/g,"-")==="target-shooter")out.push(q);return out;
  },{year,module});
}
async function mount(page,q){
  await page.evaluate(q=>{
    document.getElementById("ts-follow-host")?.remove();const host=document.createElement("div");host.id="ts-follow-host";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";document.body.appendChild(host);window.__TS_FOLLOW_DONE__=[];const m=window.DuduQ?.getMechanic?.("target-shooter");if(!m||m.version!=="1.0.21"||!m.validate(q))throw new Error(`TS mount inválido ${q?.id}`);window.__TS_FOLLOW_DESTROY__=m.mount({container:host,payload:q,context:{subject:"english",year:q.year,module:q.module,stepId:q.id,stepIndex:0,totalSteps:1},onComplete:r=>window.__TS_FOLLOW_DONE__.push(r)});
  },q);
  await page.locator("#ts-follow-host iframe").waitFor({state:"attached",timeout:10000});const h=await page.locator("#ts-follow-host iframe").elementHandle(),frame=await h.contentFrame();await frame.locator("body").waitFor({state:"visible",timeout:10000});await frame.waitForTimeout(250);return frame;
}
async function waitImages(frame){
  await frame.evaluate(async()=>{
    const imgs=[...document.images].filter(x=>x.offsetWidth||x.offsetHeight||x.getClientRects().length);
    await Promise.all(imgs.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{const done=()=>resolve();img.addEventListener("load",done,{once:true});img.addEventListener("error",done,{once:true});setTimeout(done,2500)})));
  });
}
function safeAttr(value){return String(value).replace(/\\/g,"\\\\").replace(/"/g,'\\"')}
async function findTarget(frame,item){
  const id=safeAttr(item.id),label=String(item.label||"").trim();
  const selectors=[`[data-target-id="${id}"]`,`[data-item-id="${id}"]`,`[data-option-id="${id}"]`,`[data-answer-id="${id}"]`,`[data-id="${id}"]`,`[data-value="${id}"]`];
  for(const selector of selectors){const loc=frame.locator(selector).first();if(await loc.count().catch(()=>0)&&await loc.isVisible().catch(()=>false))return loc}
  if(label){const exact=frame.getByText(label,{exact:true}).first();if(await exact.count().catch(()=>0)&&await exact.isVisible().catch(()=>false)){const button=exact.locator("xpath=ancestor-or-self::button[1]");if(await button.count().catch(()=>0))return button;return exact}}
  return null;
}
async function behavior(page,q,key){
  const cfg=q.metadata.targetShooter,items=cfg.items||[],correct=new Set((cfg.correctIds||[]).map(String));const wrong=items.find(x=>!correct.has(String(x.id))),good=items.find(x=>correct.has(String(x.id)));if(!wrong||!good)return{cluster:key,id:q.id,status:"N/A_NO_SAFE_WRONG"};
  const frame=await mount(page,q);let bad=await findTarget(frame,wrong);if(!bad)return{cluster:key,id:q.id,status:"TEST_GAP_WRONG_TARGET_LOCATOR"};await bad.click({force:true});await page.waitForTimeout(500);if(await page.evaluate(()=>window.__TS_FOLLOW_DONE__.length)>0)return{cluster:key,id:q.id,status:"P0_WRONG_COMPLETED"};let ok=await findTarget(frame,good);if(!ok)return{cluster:key,id:q.id,status:"TEST_GAP_CORRECT_TARGET_LOCATOR"};await ok.click({force:true});await page.waitForFunction(()=>window.__TS_FOLLOW_DONE__.length>0,null,{timeout:7000});return{cluster:key,id:q.id,status:"PASS",wrongRetry:true,success:true};
}

const browser=await chromium.launch({headless:true});
try{
  const all=[];
  for(let year=1;year<=5;year++)for(let module=1;module<=6;module++){
    const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);
    try{const mm=String(module).padStart(2,"0");const r=await page.goto(`${BASE}/content/english/year-${year}/module-${mm}/?qa=ts-followup`,{waitUntil:"domcontentloaded",timeout:35000});assert(r?.ok(),`Y${year}M${mm} HTTP`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});for(const q of await allTs(page,year,module))all.push({...q,year,module})}finally{await page.close()}
  }
  assert(all.length===66,`TS ${all.length}/66`);
  const reps=new Map();for(const q of all){const key=cluster(q);report.clusters[key]=(report.clusters[key]||0)+1;if(!reps.has(key))reps.set(key,q)}

  for(const q of all.filter(x=>TARGET_IDS.has(x.id))){
    const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);
    try{const mm=String(q.module).padStart(2,"0");await page.goto(`${BASE}/content/english/year-${q.year}/module-${mm}/?qa=ts-broken-proof`,{waitUntil:"domcontentloaded",timeout:35000});await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});const frame=await mount(page,q);await waitImages(frame);const imgs=await frame.evaluate(()=>[...document.images].filter(x=>x.offsetWidth||x.offsetHeight||x.getClientRects().length).map(x=>({src:x.currentSrc||x.src||"",alt:x.alt||"",complete:x.complete,naturalWidth:x.naturalWidth,naturalHeight:x.naturalHeight})));const broken=imgs.filter(x=>!x.naturalWidth||!x.naturalHeight);report.brokenCandidates.push({year:q.year,module:q.module,id:q.id,images:imgs,classification:broken.length?"CONFIRMED_BROKEN":"FALSE_POSITIVE_LOAD_TIMING"});if(broken.length)report.P0.push({year:q.year,module:q.module,id:q.id,detail:"imagem realmente quebrada após espera de load/error",broken})}catch(e){report.TEST_GAP.push({year:q.year,module:q.module,id:q.id,detail:`broken-proof ${String(e?.message||e)}`})}finally{await page.close()}
  }

  for(const [key,q] of reps){const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);try{const mm=String(q.module).padStart(2,"0");await page.goto(`${BASE}/content/english/year-${q.year}/module-${mm}/?qa=ts-functional-proof`,{waitUntil:"domcontentloaded",timeout:35000});await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});const result=await behavior(page,q,key);report.functional.push(result);if(result.status.startsWith("P0"))report.P0.push({year:q.year,module:q.module,id:q.id,detail:result.status});else if(result.status.startsWith("TEST_GAP"))report.TEST_GAP.push({year:q.year,module:q.module,id:q.id,detail:result.status})}catch(e){report.TEST_GAP.push({year:q.year,module:q.module,id:q.id,detail:`functional ${String(e?.message||e)}`})}finally{await page.close()}}
}finally{await browser.close()}
console.log(JSON.stringify({status:report.P0.length?"FOLLOWUP_FINDINGS":report.TEST_GAP.length?"FOLLOWUP_TEST_GAP":"FOLLOWUP_PASS",...report},null,2));
