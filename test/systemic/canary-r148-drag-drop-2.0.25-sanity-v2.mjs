import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const assert=(c,m)=>{if(!c)throw new Error(m)};
const CASES=[
  {year:1,module:1},
  {year:2,module:1},
  {year:3,module:1},
  {year:4,module:1},
  {year:5,module:1}
];

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
  const type=String(q?.answer?.type||"").toLowerCase();
  let pairs=[];
  if(Array.isArray(p.items)&&p.items.some(i=>i?.targetId)) pairs=p.items.filter(i=>i?.required!==false&&i?.targetId).map(i=>({source:String(i.id),target:String(i.targetId)}));
  else if(type==="pairs"&&Array.isArray(q?.answer?.value)) pairs=q.answer.value.map(v=>({source:String(v?.source||v?.itemId||""),target:String(v?.target||v?.targetId||"")})).filter(v=>v.source&&v.target);
  const good=new Set(pairs.map(v=>v.source));
  let wrong=null;
  if(pairs.length){
    const d=items.find(i=>!good.has(i.id));
    if(d) wrong={source:d.id,target:pairs[0].target};
    else if(targets.length>1){const other=targets.find(t=>t.id!==pairs[0].target);if(other)wrong={source:pairs[0].source,target:other.id}}
  }
  const hasMedia=Boolean(q?.image?.src||q?.media?.image?.src||[...(p.items||[]),...(p.targets||[]),...(q?.alternatives||[])].some(v=>v?.image?.src||v?.imageUrl||v?.imageAsset||v?.imageAssetKey||v?.imageSrc));
  const hasAudio=Boolean(q?.audio?.enabled||q?.audio?.text||q?.audio?.src||q?.metadata?.instructionAudio?.enabled||[...(p.items||[]),...(q?.alternatives||[])].some(v=>v?.spokenText||v?.audioDescription||v?.audio?.enabled));
  return {pairs,wrong,hasMedia,hasAudio};
}

async function getRealDd(page,year,module){
  return page.evaluate(({year,module})=>{
    function walk(v,seen=new Set()){
      if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);
      if(Array.isArray(v.activities)&&Number(v.year)===year&&Number(v.module)===module)return v;
      for(const child of Object.values(v)){const found=walk(child,seen);if(found)return found}
      return null;
    }
    const mod=walk(window.DUDUQ_CONTENT||{});if(!mod)return null;
    const questions=[];
    for(const a of mod.activities||[])for(const q of a.questions||[]){
      const mechanic=String(a.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase().replace(/_/g,"-");
      if(mechanic==="drag-drop")questions.push(q);
    }
    return {title:mod.title||"",version:mod.version||"",questions};
  },{year,module});
}

async function mount(page,q,year,module){
  await page.evaluate(({q,year,module})=>{
    window.__R148_RESULTS__=[];window.__R148_DONE__=[];
    if(!window.__R148_LISTENER__){addEventListener("message",e=>{if(e.data?.type==="DUDUQ_DRAG_DROP_RESULT")window.__R148_RESULTS__.push(e.data.payload)});window.__R148_LISTENER__=true}
    document.getElementById("r148-sanity-host")?.remove();
    const host=document.createElement("div");host.id="r148-sanity-host";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";document.body.appendChild(host);
    const mech=window.DuduQ?.getMechanic?.("drag-drop");if(!mech||mech.version!=="2.0.25")throw new Error("DD 2.0.25 não registrado");
    let input=q;
    if(!mech.validate(input)&&q?.payload)input={id:q.id,title:q.metadata?.activityTitle||q.metadata?.screenTitle||"DRAG DROP",instruction:q.instruction||q.statement||"",payload:q.payload};
    if(!mech.validate(input))throw new Error(`Questão real ${q?.id||""} rejeitada pelo DD 2.0.25`);
    window.__R148_DESTROY__=mech.mount({container:host,payload:input,context:{subject:"english",year,module,stepId:q.id||"sanity",stepTitle:"R148 sanity",stepIndex:0,totalSteps:1},onComplete:r=>window.__R148_DONE__.push(r)});
  },{q,year,module});
  const deadline=Date.now()+12000;let frame=null;
  while(Date.now()<deadline&&!frame){frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==="about:srcdoc");if(!frame)await page.waitForTimeout(80)}
  assert(frame,`Y${year} M${module}: iframe DD ausente`);
  await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-smart-snap")==="true",`Y${year} M${module}: smart snap inativo`);
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-instant-validation")==="false",`Y${year} M${module}: instant validation ativo`);
  return frame;
}

async function behavioral(page,q,year,module){
  const c=contract(q);assert(c.pairs.length>0,`Y${year} M${module} ${q.id}: sem pares para sanity`);assert(c.wrong,`Y${year} M${module} ${q.id}: sem tentativa errada segura`);
  const frame=await mount(page,q,year,module);
  const item=id=>frame.locator(`[data-dd2-item-id="${id}"]`).first();
  const zone=id=>frame.locator(`[data-dd2-target-id="${id}"] .duduq-dd2-zone`).first();
  const place=async(s,t)=>{await item(s).click({force:true});await zone(t).click({force:true})};
  await place(c.wrong.source,c.wrong.target);
  assert(await page.evaluate(()=>window.__R148_RESULTS__.length)===0,`Y${year} M${module}: drop avaliou`);
  const confirm=frame.locator(".duduq-dd2-confirm");await confirm.waitFor({state:"visible",timeout:4000});await confirm.click({force:true});
  await page.waitForFunction(()=>window.__R148_RESULTS__.length===1,null,{timeout:7000});
  assert((await page.evaluate(()=>window.__R148_RESULTS__[0]))?.isCorrect===false,`Y${year} M${module}: retry ausente`);
  await page.waitForTimeout(900);
  for(const p of c.pairs)await place(p.source,p.target);
  assert((await page.evaluate(()=>window.__R148_RESULTS__.length))===1,`Y${year} M${module}: avaliou antes de Confirmar`);
  await confirm.click({force:true});
  await page.waitForFunction(()=>window.__R148_RESULTS__.some(r=>r?.isCorrect===true),null,{timeout:7000});
  await page.waitForFunction(()=>window.__R148_DONE__.length>0,null,{timeout:7000});
  if(c.hasMedia&&await frame.locator("img").count())assert(await frame.locator("img").evaluateAll(xs=>xs.some(x=>x.naturalWidth>0&&x.naturalHeight>0)),`Y${year} M${module}: imagem não renderizou`);
  await page.evaluate(()=>{try{window.__R148_DESTROY__?.()}catch{};document.getElementById("r148-sanity-host")?.remove()});
  return {question:q.id,media:c.hasMedia,audio:c.hasAudio};
}

async function playerFlow(page,year,module){
  const start=page.locator(".duduq-intro-start-button");if(await start.count())await start.first().click({force:true});
  await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning)},null,{timeout:30000});
  const before=await page.evaluate(()=>window.DuduQ.getSession());assert(Number(before?.totalSteps||0)>0,`Y${year} M${module}: Player sem steps`);
  const initial=Number(before.stepIndex||0);const accepted=await page.evaluate(()=>window.DuduQ.next({qa:"r148-sanity-flow"}));assert(accepted!==false,`Y${year} M${module}: progressão rejeitada`);
  if(Number(before.totalSteps)>1)await page.waitForFunction(i=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&s.stepIndex!==i)},initial,{timeout:12000});
  const after=await page.evaluate(()=>window.DuduQ.getSession());assert(Number(after?.progress?.current||0)>=Number(before?.progress?.current||0),`Y${year} M${module}: progresso regrediu`);
  return {totalSteps:before.totalSteps,from:initial,to:after.stepIndex,progress:after.progress||null};
}

async function classificationFixture(page){
  const fixture={id:"class",title:"CLASSIFICATION",instruction:"Classifique.",behavior:{shuffleItems:false,shuffleTargets:false},payload:{mode:"classification",strategy:"classification",items:[{id:"A",label:"APPLE",targetId:"left",required:true},{id:"B",label:"DOG",targetId:"right",required:true},{id:"C",label:"CAT",targetId:"right",required:true}],targets:[{id:"left",label:"FRUIT",capacity:2,kind:"category"},{id:"right",label:"ANIMALS",capacity:2,kind:"category"}]}};
  assert(await page.evaluate(f=>window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(f)===true,fixture),"classification fixture homologado rejeitado na R148");
  return {classification:"N/A consumer + fixture PASS",capacityGt1:"fixture PASS"};
}

const browser=await chromium.launch({headless:true});const report=[];
try{
  for(const c of CASES){
    const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${c.year}/`))critical404.push(u)}});
    try{
      const mm=String(c.module).padStart(2,"0");const res=await page.goto(`${BASE}/content/english/year-${c.year}/module-${mm}/?qa=r148-sanity-v2`,{waitUntil:"domcontentloaded",timeout:35000});assert(res?.ok(),`Y${c.year} M${mm}: HTTP ${res?.status()}`);
      await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const boot=await page.evaluate(()=>({revision:window.DUDUQ_ENGINE_MANIFEST?.revision,core:window.DUDUQ_ENGINE_MANIFEST?.core?.release,dd:window.DUDUQ_ENGINE_MANIFEST?.mechanics?.["drag-drop"]?.release,registered:window.DuduQ?.getMechanic?.("drag-drop")?.version||""}));
      assert(boot.revision===148&&boot.core==="1.0.12"&&boot.dd==="2.0.25"&&boot.registered==="2.0.25",`Y${c.year}: boot inválido ${JSON.stringify(boot)}`);
      const mod=await getRealDd(page,c.year,c.module);assert(mod?.questions?.length,`Y${c.year}: sem consumidor DD real`);
      const q=mod.questions.find(x=>contract(x).pairs.length&&contract(x).wrong);assert(q,`Y${c.year}: sem DD real adequado ao sanity`);
      const behavior=await behavioral(page,q,c.year,c.module);const flow=await playerFlow(page,c.year,c.module);
      assert(pageErrors.length===0,`Y${c.year}: pageError ${pageErrors.join(" | ")}`);assert(critical404.length===0,`Y${c.year}: critical404 ${critical404.join(" | ")}`);
      report.push({year:c.year,module:c.module,title:mod.title,version:mod.version,behavior,flow});
    }finally{await page.close()}
  }
  const page=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(page);
  try{await page.goto(`${BASE}/content/english/year-1/module-01/?qa=r148-fixture`,{waitUntil:"domcontentloaded",timeout:35000});await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});report.push({supportedContract:await classificationFixture(page)})}finally{await page.close()}

  const seq=await browser.newPage({viewport:{width:1366,height:768}});await ttsStub(seq);
  try{await seq.goto(`${BASE}/content/english/year-1/module-06/?qa=r148-sequence-real`,{waitUntil:"domcontentloaded",timeout:35000});await seq.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});const m=await getRealDd(seq,1,6);const q=m?.questions?.find(x=>String(x?.answer?.type||"").toLowerCase()==="sequence"||String(x?.payload?.strategy||"").toLowerCase()==="sequence"||x?.metadata?.layout==="sequence");assert(q,"sequence consumer real ausente");assert(await seq.evaluate(q=>window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(q)===true,q),"sequence consumer real rejeitado pela R148");report.push({sequenceConsumer:{year:1,module:6,question:q.id,status:"PASS"}})}finally{await seq.close()}
}finally{await browser.close()}

console.log(JSON.stringify({status:"PASS",revision:148,core:"1.0.12",dragDrop:"2.0.25",years:[1,2,3,4,5],classificationConsumer:"N/A",report},null,2));
