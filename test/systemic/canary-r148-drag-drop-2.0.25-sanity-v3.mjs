import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const assert=(c,m)=>{if(!c)throw new Error(m)};
const CASES=[1,2,3,4,5].map(year=>({year,module:1}));

async function ttsStub(page){
  await page.addInitScript(()=>{
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false},pause(){},resume(){},speak(u){this.speaking=true;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true})}catch{globalThis.speechSynthesis=synth}
  });
}
function contract(q){
  const p=q?.payload||{};
  const items=(p.items||q?.alternatives||[]).map(v=>({id:String(v?.id||""),required:v?.required,targetId:v?.targetId||null})).filter(v=>v.id);
  const targets=(p.targets||q?.metadata?.targets||[]).map(v=>({id:String(v?.id||""),capacity:Number(v?.capacity||1)})).filter(v=>v.id);
  const type=String(q?.answer?.type||"").toLowerCase();let pairs=[];
  if(Array.isArray(p.items)&&p.items.some(i=>i?.targetId))pairs=p.items.filter(i=>i?.required!==false&&i?.targetId).map(i=>({source:String(i.id),target:String(i.targetId)}));
  else if(type==="pairs"&&Array.isArray(q?.answer?.value))pairs=q.answer.value.map(v=>({source:String(v?.source||v?.itemId||""),target:String(v?.target||v?.targetId||"")})).filter(v=>v.source&&v.target);
  const good=new Set(pairs.map(v=>v.source));let wrong=null;
  if(pairs.length){const d=items.find(i=>!good.has(i.id));if(d)wrong={source:d.id,target:pairs[0].target};else if(targets.length>1){const t=targets.find(x=>x.id!==pairs[0].target);if(t)wrong={source:pairs[0].source,target:t.id}}}
  const values=[...(p.items||[]),...(p.targets||[]),...(q?.alternatives||[])];
  return {pairs,wrong,hasMedia:Boolean(q?.image?.src||q?.media?.image?.src||values.some(v=>v?.image?.src||v?.imageUrl||v?.imageAsset||v?.imageAssetKey||v?.imageSrc)),hasAudio:Boolean(q?.audio?.enabled||q?.audio?.text||q?.audio?.src||q?.metadata?.instructionAudio?.enabled||values.some(v=>v?.spokenText||v?.audioDescription||v?.audio?.enabled))};
}
async function getRealDd(page,year,module){
  return page.evaluate(({year,module})=>{
    function walk(v,seen=new Set()){if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);if(Array.isArray(v.activities)&&Number(v.year)===year&&Number(v.module)===module)return v;for(const child of Object.values(v)){const f=walk(child,seen);if(f)return f}return null}
    const mod=walk(window.DUDUQ_CONTENT||{});if(!mod)return null;const questions=[];for(const a of mod.activities||[])for(const q of a.questions||[]){if(String(a.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase().replace(/_/g,"-")==="drag-drop")questions.push(q)}return {title:mod.title||"",version:mod.version||"",questions};
  },{year,module});
}
async function mount(page,q,year,module){
  await page.evaluate(({q,year,module})=>{
    window.__R148_RESULTS__=[];window.__R148_DONE__=[];
    if(!window.__R148_LISTENER__){addEventListener("message",e=>{if(e.data?.type==="DUDUQ_DRAG_DROP_RESULT")window.__R148_RESULTS__.push(e.data.payload)});window.__R148_LISTENER__=true}
    document.getElementById("r148-sanity-host")?.remove();const host=document.createElement("div");host.id="r148-sanity-host";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";document.body.appendChild(host);
    const mech=window.DuduQ?.getMechanic?.("drag-drop");if(!mech||mech.version!=="2.0.25")throw new Error("DD 2.0.25 não registrado");let input=q;
    if(!mech.validate(input)&&q?.payload)input={id:q.id,title:q.metadata?.activityTitle||q.metadata?.screenTitle||"DRAG DROP",instruction:q.instruction||q.statement||"",payload:q.payload};if(!mech.validate(input))throw new Error(`Questão real ${q?.id||""} rejeitada pelo DD 2.0.25`);
    window.__R148_DESTROY__=mech.mount({container:host,payload:input,context:{subject:"english",year,module,stepId:q.id||"sanity",stepTitle:"R148 sanity",stepIndex:0,totalSteps:1},onComplete:r=>window.__R148_DONE__.push(r)});
  },{q,year,module});
  const deadline=Date.now()+12000;let frame=null;while(Date.now()<deadline&&!frame){frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==="about:srcdoc");if(!frame)await page.waitForTimeout(80)}assert(frame,`Y${year} M${module}: iframe DD ausente`);await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-smart-snap")==="true",`Y${year}: smart snap inativo`);assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-instant-validation")==="false",`Y${year}: instant validation ativo`);return frame;
}
async function behavioral(page,q,year,module){
  const c=contract(q);assert(c.pairs.length>0,`Y${year} ${q.id}: sem pares`);assert(c.wrong,`Y${year} ${q.id}: sem erro seguro`);const frame=await mount(page,q,year,module);
  const item=id=>frame.locator(`[data-dd2-item-id="${id}"]`).first(),zone=id=>frame.locator(`[data-dd2-target-id="${id}"] .duduq-dd2-zone`).first();const place=async(s,t)=>{await item(s).click({force:true});await zone(t).click({force:true})};
  await place(c.wrong.source,c.wrong.target);assert(await page.evaluate(()=>window.__R148_RESULTS__.length)===0,`Y${year}: drop avaliou`);const confirm=frame.locator(".duduq-dd2-confirm");await confirm.waitFor({state:"visible",timeout:4000});await confirm.click({force:true});await page.waitForFunction(()=>window.__R148_RESULTS__.length===1,null,{timeout:7000});assert((await page.evaluate(()=>window.__R148_RESULTS__[0]))?.isCorrect===false,`Y${year}: retry ausente`);await page.waitForTimeout(900);
  for(const p of c.pairs)await place(p.source,p.target);assert((await page.evaluate(()=>window.__R148_RESULTS__.length))===1,`Y${year}: avaliou antes do Confirmar`);await confirm.click({force:true});await page.waitForFunction(()=>window.__R148_RESULTS__.some(r=>r?.isCorrect===true),null,{timeout:7000});await page.waitForFunction(()=>window.__R148_DONE__.length>0,null,{timeout:7000});
  if(c.hasMedia&&await frame.locator("img").count())assert(await frame.locator("img").evaluateAll(xs=>xs.some(x=>x.naturalWidth>0&&x.naturalHeight>0)),`Y${year}: imagem não renderizou`);await page.evaluate(()=>{try{window.__R148_DESTROY__?.()}catch{};document.getElementById("r148-sanity-host")?.remove()});return {question:q.id,media:c.hasMedia,audio:c.hasAudio};
}
async function playerFlow(page,year,module){
  await page.evaluate(()=>{window.__R148_FLOW__={transition:0,complete:0};["duduq:transition-cover-start","duduq:transition-covered","duduq:transition-swap","duduq:transition-reveal-start","duduq:transition-complete"].forEach(n=>addEventListener(n,()=>window.__R148_FLOW__.transition++));addEventListener("duduq:module-complete",()=>window.__R148_FLOW__.complete++)});
  const start=page.locator(".duduq-intro-start-button");await start.waitFor({state:"visible",timeout:30000});await start.click({force:true});
  await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.(),iframe=document.querySelector("iframe");return Boolean(s&&!s.transitioning&&iframe?.srcdoc&&window.DuduQTransition?.getState?.()==="idle")},null,{timeout:35000});
  const initial=await page.evaluate(()=>window.DuduQ.getSession());const total=Number(initial?.totalSteps||0);assert(total>0,`Y${year}: Player sem steps`);const deadline=Date.now()+70000;let guard=0;
  while(Date.now()<deadline&&guard++<total+2){const before=await page.evaluate(()=>window.DuduQ.getSession());if(before?.completed)break;const accepted=await page.evaluate(()=>window.DuduQ.next({qa:"r148-sanity-flow"}));assert(accepted!==false,`Y${year}: next rejeitado no step ${before?.stepIndex}`);await page.waitForFunction(prev=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&(s.completed||s.stepIndex!==prev)&&window.DuduQTransition?.getState?.()==="idle")},before.stepIndex,{timeout:12000})}
  const final=await page.evaluate(()=>({session:window.DuduQ.getSession(),flow:window.__R148_FLOW__}));assert(final.session?.completed===true,`Y${year}: completion não ocorreu`);if(total>1)assert(final.flow.transition>0,`Y${year}: transition não observada`);assert(Number(final.session?.progress?.percent||0)>=100,`Y${year}: progress ${JSON.stringify(final.session?.progress)}`);return {totalSteps:total,progress:final.session.progress,transitionEvents:final.flow.transition,moduleCompleteEvents:final.flow.complete};
}
async function classificationFixture(page){
  const f={id:"class",title:"CLASSIFICATION",instruction:"Classifique.",behavior:{shuffleItems:false,shuffleTargets:false},payload:{mode:"classification",strategy:"classification",items:[{id:"A",label:"APPLE",targetId:"left",required:true},{id:"B",label:"DOG",targetId:"right",required:true},{id:"C",label:"CAT",targetId:"right",required:true}],targets:[{id:"left",label:"FRUIT",capacity:2,kind:"category"},{id:"right",label:"ANIMALS",capacity:2,kind:"category"}]}};assert(await page.evaluate(f=>window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(f)===true,f),"classification fixture homologado rejeitado");return {classification:"consumer N/A; homolog fixture PASS",capacityGt1:"fixture PASS"};
}

const browser=await chromium.launch({headless:true});const report=[];
try{
  for(const c of CASES){const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);const errors=[];const critical404=[];page.on("pageerror",e=>errors.push(String(e?.message||e)));page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${c.year}/`))critical404.push(u)}});
    try{const mm=String(c.module).padStart(2,"0"),res=await page.goto(`${BASE}/content/english/year-${c.year}/module-${mm}/?qa=r148-sanity-v3`,{waitUntil:"domcontentloaded",timeout:35000});assert(res?.ok(),`Y${c.year}: HTTP ${res?.status()}`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});const boot=await page.evaluate(()=>({revision:window.DUDUQ_ENGINE_MANIFEST?.revision,core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,dd:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,registered:window.DuduQ?.getMechanic?.("drag-drop")?.version||""}));assert(boot.revision===148&&boot.core==="1.0.12"&&boot.dd==="2.0.25"&&boot.registered==="2.0.25",`Y${c.year}: boot ${JSON.stringify(boot)}`);const mod=await getRealDd(page,c.year,c.module);assert(mod?.questions?.length,`Y${c.year}: sem DD real`);const q=mod.questions.find(x=>contract(x).pairs.length&&contract(x).wrong);assert(q,`Y${c.year}: sem DD adequado`);const behavior=await behavioral(page,q,c.year,c.module);const flow=await playerFlow(page,c.year,c.module);assert(errors.length===0,`Y${c.year}: pageError ${errors.join(" | ")}`);assert(critical404.length===0,`Y${c.year}: critical404 ${critical404.join(" | ")}`);report.push({year:c.year,module:c.module,title:mod.title,version:mod.version,behavior,flow})}finally{await page.close()}}
  const p=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(p);try{await p.goto(`${BASE}/content/english/year-1/module-01/?qa=r148-fixture`,{waitUntil:"domcontentloaded",timeout:35000});await p.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});report.push({supportedContract:await classificationFixture(p)})}finally{await p.close()}
  const seq=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(seq);try{await seq.goto(`${BASE}/content/english/year-1/module-06/?qa=r148-sequence-real`,{waitUntil:"domcontentloaded",timeout:35000});await seq.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});const m=await getRealDd(seq,1,6),q=m?.questions?.find(x=>String(x?.answer?.type||"").toLowerCase()==="sequence"||String(x?.payload?.strategy||"").toLowerCase()==="sequence"||x?.metadata?.layout==="sequence");assert(q,"sequence consumer real ausente");assert(await seq.evaluate(q=>window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(q)===true,q),"sequence consumer real rejeitado");report.push({sequenceConsumer:{year:1,module:6,question:q.id,status:"PASS"}})}finally{await seq.close()}
}finally{await browser.close()}
console.log(JSON.stringify({status:"PASS",revision:148,core:"1.0.12",dragDrop:"2.0.25",years:[1,2,3,4,5],classificationConsumer:"N/A",report},null,2));
