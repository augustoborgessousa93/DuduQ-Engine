import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const root=process.cwd();
const assert=(c,m)=>{if(!c)throw new Error(m)};
const wanted=["single-choice","association","classification","capacity","media","sequence"];

function sourceFeatures(text){
  const f=new Set();
  if(/single-choice|dragDropChoice/i.test(text))f.add("single-choice");
  if(/strategy\s*[:=]\s*["']association|"strategy"\s*:\s*"association"|answer\s*:\s*\{\s*type\s*:\s*["']pairs/i.test(text))f.add("association");
  if(/strategy\s*[:=]\s*["']classification|"strategy"\s*:\s*"classification"|mode\s*:\s*["']classification/i.test(text))f.add("classification");
  if(/capacity\s*:\s*[2-9]|"capacity"\s*:\s*[2-9]/i.test(text))f.add("capacity");
  if(/imageAssetKey|imageAsset|imageUrl|imageSrc|image\s*:\s*\{/i.test(text))f.add("media");
  if(/strategy\s*[:=]\s*["']sequence|"strategy"\s*:\s*"sequence"|type\s*:\s*["']sequence|kind\s*===?\s*["']sequence|layout\s*:\s*["']sequence/i.test(text))f.add("sequence");
  return f;
}

const records=[];
for(let year=1;year<=5;year++){
  const yearDir=path.join(root,"content","english",`year-${year}`);
  for(const name of fs.readdirSync(yearDir,{withFileTypes:true}).filter(e=>e.isDirectory()&&/^module-\d+$/i.test(e.name)).map(e=>e.name).sort()){
    const dir=path.join(yearDir,name);
    const files=fs.readdirSync(dir).filter(n=>/\.(?:js|html)$/i.test(n));
    const text=files.map(n=>fs.readFileSync(path.join(dir,n),"utf8")).join("\n");
    if(!/drag-drop/i.test(text))continue;
    records.push({year,module:Number(name.slice(-2)),name,features:sourceFeatures(text)});
  }
}
assert(records.length>0,"nenhum consumidor DD publicado descoberto");

const availability=Object.fromEntries(wanted.map(feature=>[feature,records.filter(r=>r.features.has(feature)).length]));
const notApplicable=wanted.filter(feature=>availability[feature]===0);
const selected=[];const key=r=>`${r.year}-${r.module}`;
for(let year=1;year<=5;year++){
  const candidates=records.filter(x=>x.year===year);
  const r=candidates.sort((a,b)=>b.features.size-a.features.size)[0];
  assert(r,`Year ${year} sem consumidor DD`);selected.push(r);
}
for(const feature of wanted){
  if(availability[feature]===0)continue;
  if(selected.some(r=>r.features.has(feature)))continue;
  const r=records.find(x=>x.features.has(feature));
  if(r&&!selected.some(s=>key(s)===key(r)))selected.push(r);
}
assert(selected.length<=10,`sanity deixou de ser proporcional: ${selected.length} módulos`);

function questionFeatures(q){
  const f=new Set();const p=q?.payload||{};
  const strategy=String(p.strategy||"").toLowerCase();const mode=String(p.mode||"").toLowerCase();const answerType=String(q?.answer?.type||"").toLowerCase();
  if(mode==="single-choice"||q?.metadata?.dragDropChoice)f.add("single-choice");
  if(strategy==="association"||answerType==="pairs")f.add("association");
  if(strategy==="classification"||mode==="classification")f.add("classification");
  if(strategy==="sequence"||answerType==="sequence"||q?.metadata?.layout==="sequence")f.add("sequence");
  const targets=[...(p.targets||[]),...(q?.metadata?.targets||[])];
  const values=[...(p.items||[]),...targets,...(q?.alternatives||[])];
  if(targets.some(t=>Number(t?.capacity||1)>1))f.add("capacity");
  if(q?.image?.src||q?.media?.image?.src||values.some(v=>v?.imageAssetKey||v?.imageAsset||v?.imageUrl||v?.imageSrc||v?.image?.src))f.add("media");
  return f;
}

function interactionContract(q){
  const p=q?.payload||{};const items=(p.items||q?.alternatives||[]).map(v=>({id:String(v?.id||""),required:v?.required,targetId:v?.targetId||null})).filter(v=>v.id);
  const targets=(p.targets||q?.metadata?.targets||[]).map(v=>({id:String(v?.id||""),capacity:Number(v?.capacity||1)})).filter(v=>v.id);
  const answerType=String(q?.answer?.type||"").toLowerCase();
  let pairs=[];
  if(Array.isArray(p.items)&&p.items.some(i=>i?.targetId))pairs=p.items.filter(i=>i?.required!==false&&i?.targetId).map(i=>({source:String(i.id),target:String(i.targetId)}));
  else if(answerType==="pairs"&&Array.isArray(q?.answer?.value))pairs=q.answer.value.map(v=>({source:String(v?.source||v?.itemId||""),target:String(v?.target||v?.targetId||"")})).filter(v=>v.source&&v.target);
  const sequence=answerType==="sequence"&&Array.isArray(q?.answer?.value)?q.answer.value.map(String):[];
  const correctSources=new Set(pairs.map(v=>v.source));
  let wrong=null;
  if(pairs.length){
    const distractor=items.find(i=>!correctSources.has(i.id));
    if(distractor)wrong={source:distractor.id,target:pairs[0].target};
    else if(targets.length>1){const first=pairs[0],other=targets.find(t=>t.id!==first.target);if(other)wrong={source:first.source,target:other.id};}
  }
  return {pairs,sequence,targets,items,wrong};
}

async function installTtsStub(page){
  await page.addInitScript(()=>{
    const synth={speaking:false,pending:false,paused:false,getVoices:()=>[],cancel(){this.speaking=false;},pause(){},resume(){},speak(u){this.speaking=true;try{u?.onstart?.({type:"start"})}catch{};queueMicrotask(()=>{this.speaking=false;try{u?.onend?.({type:"end"})}catch{}})}};
    try{Object.defineProperty(globalThis,"speechSynthesis",{value:synth,configurable:true});}catch{try{globalThis.speechSynthesis=synth}catch{}}
  });
}

async function mountRealQuestion(page,q,rec){
  const contract=interactionContract(q);const feats=questionFeatures(q);
  assert(contract.pairs.length>0,`Y${rec.year} M${rec.module} ${q.id}: sem contrato de pares utilizável no sanity`);
  assert(contract.wrong,`Y${rec.year} M${rec.module} ${q.id}: sem tentativa incorreta segura`);
  await page.evaluate(({question,year,module})=>{
    window.__R148_SANITY_RESULTS__=[];window.__R148_SANITY_COMPLETIONS__=[];
    if(!window.__R148_SANITY_LISTENER__){addEventListener("message",e=>{if(e.data?.type==="DUDUQ_DRAG_DROP_RESULT")window.__R148_SANITY_RESULTS__.push(e.data.payload)});window.__R148_SANITY_LISTENER__=true;}
    const old=document.getElementById("r148-dd225-sanity");old?.remove();
    const host=document.createElement("div");host.id="r148-dd225-sanity";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";document.body.appendChild(host);
    const mech=window.DuduQ?.getMechanic?.("drag-drop");if(!mech||mech.version!=="2.0.25")throw new Error("DD225 não registrado");
    let input=question;
    if(!mech.validate(input)&&question?.payload){input={id:question.id,title:question.metadata?.activityTitle||question.metadata?.screenTitle||"DRAG DROP",instruction:question.instruction||question.statement||"",payload:question.payload};}
    if(!mech.validate(input))throw new Error(`Questão real ${question?.id||""} não validada pelo DD225`);
    window.__R148_SANITY_DESTROY__=mech.mount({container:host,payload:input,context:{subject:"english",year,module,stepId:question.id||"r148-sanity",stepTitle:"R148 sanity",stepIndex:0,totalSteps:1},onComplete:r=>window.__R148_SANITY_COMPLETIONS__.push(r)});
  },{question:q,year:rec.year,module:rec.module});

  const deadline=Date.now()+12000;let frame=null;
  while(Date.now()<deadline&&!frame){frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==="about:srcdoc");if(!frame)await page.waitForTimeout(80)}
  assert(frame,`Y${rec.year} M${rec.module}: iframe DD ausente`);
  await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-smart-snap")==="true",`Y${rec.year} M${rec.module}: smart snap inativo`);
  assert(await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-instant-validation")==="false",`Y${rec.year} M${rec.module}: instant validation ativo`);
  if(feats.has("media")&&await frame.locator("img").count())await frame.waitForFunction(()=>Array.from(document.images).some(img=>img.naturalWidth>0&&img.naturalHeight>0),null,{timeout:12000});

  const item=id=>frame.locator(`[data-dd2-item-id="${id}"]`).first();
  const zone=id=>frame.locator(`[data-dd2-target-id="${id}"] .duduq-dd2-zone`).first();
  const place=async(source,target)=>{await item(source).click({force:true});await zone(target).click({force:true});};
  await place(contract.wrong.source,contract.wrong.target);
  assert(await page.evaluate(()=>window.__R148_SANITY_RESULTS__.length)===0,`Y${rec.year} M${rec.module}: avaliou no drop`);
  const confirm=frame.locator(".duduq-dd2-confirm");await confirm.waitFor({state:"visible",timeout:4000});await confirm.click({force:true});
  await page.waitForFunction(()=>window.__R148_SANITY_RESULTS__.length>=1,null,{timeout:7000});
  assert((await page.evaluate(()=>window.__R148_SANITY_RESULTS__[0]))?.isCorrect===false,`Y${rec.year} M${rec.module}: retry ausente`);
  await page.waitForTimeout(900);
  for(const pair of contract.pairs)await place(pair.source,pair.target);
  assert(await page.evaluate(()=>window.__R148_SANITY_RESULTS__.length===1,`Y${rec.year} M${rec.module}: avaliou antes do segundo Confirmar`);
  await confirm.click({force:true});await page.waitForFunction(()=>window.__R148_SANITY_RESULTS__.some(r=>r?.isCorrect===true),null,{timeout:7000});
  await page.waitForFunction(()=>window.__R148_SANITY_COMPLETIONS__.length>=1,null,{timeout:7000});
  await page.evaluate(()=>{try{window.__R148_SANITY_DESTROY__?.()}catch(_){}document.getElementById("r148-dd225-sanity")?.remove()});
  return feats;
}

async function provePlayerFlow(page,rec){
  await page.evaluate(()=>{
    window.__R148_FLOW__={stepComplete:0,stepStart:0,transition:0,moduleComplete:0};
    addEventListener("duduq:step-complete",()=>window.__R148_FLOW__.stepComplete++);
    addEventListener("duduq:step-start",()=>window.__R148_FLOW__.stepStart++);
    ["duduq:transition-cover-start","duduq:transition-covered","duduq:transition-swap","duduq:transition-reveal-start","duduq:transition-complete"].forEach(n=>addEventListener(n,()=>window.__R148_FLOW__.transition++));
    addEventListener("duduq:module-complete",()=>window.__R148_FLOW__.moduleComplete++);
  });
  const start=page.locator(".duduq-intro-start-button");if(await start.count()){await start.first().click({force:true});}
  await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning)},null,{timeout:30000});
  const initial=await page.evaluate(()=>window.DuduQ.getSession());
  const total=Number(initial?.totalSteps||0);assert(total>0,`Y${rec.year} M${rec.module}: Player sem steps`);
  let guard=0;
  while(guard++<total+2){
    const before=await page.evaluate(()=>window.DuduQ.getSession());if(before?.completed)break;
    const accepted=await page.evaluate(()=>window.DuduQ.next({qa:"r148-dd225-sanity"}));assert(accepted!==false,`Y${rec.year} M${rec.module}: next rejeitado no step ${before?.stepIndex}`);
    await page.waitForFunction(prev=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&(s.completed||s.stepIndex!==prev));},before?.stepIndex,{timeout:12000});
  }
  const final=await page.evaluate(()=>({session:window.DuduQ.getSession(),flow:window.__R148_FLOW__}));
  assert(final.session?.completed===true,`Y${rec.year} M${rec.module}: completion não ocorreu`);
  if(total>1)assert(final.flow.transition>0,`Y${rec.year} M${rec.module}: transition não observada`);
  assert(Number(final.session?.progress?.percent||100)>=100,`Y${rec.year} M${rec.module}: progresso incompleto`);
  return {totalSteps:total,flow:final.flow,progress:final.session?.progress||null};
}

async function proveClassificationFixture(page){
  const fixture={id:"class",title:"CLASSIFICATION",instruction:"Classifique.",behavior:{shuffleItems:false,shuffleTargets:false},payload:{mode:"classification",strategy:"classification",items:[{id:"A",label:"APPLE",targetId:"left",required:true},{id:"B",label:"DOG",targetId:"right",required:true},{id:"C",label:"CAT",targetId:"right",required:true}],targets:[{id:"left",label:"FRUIT",capacity:2,kind:"category"},{id:"right",label:"ANIMALS",capacity:2,kind:"category"}]}};
  const ok=await page.evaluate(f=>window.DuduQ?.getMechanic?.("drag-drop")?.validate?.(f)===true,fixture);assert(ok,"classification homolog fixture rejeitado pela R148");
  return "PASS";
}

const browser=await chromium.launch({headless:true});
const actualCoverage=new Set();const report=[];
try{
  for(const rec of selected){
    const page=await browser.newPage({viewport:{width:1366,height:768}});await installTtsStub(page);
    const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${rec.year}/`))critical404.push(u)}});
    try{
      const response=await page.goto(`${BASE}/content/english/year-${rec.year}/${rec.name}/?qa=r148-dd225-sanity`,{waitUntil:"domcontentloaded",timeout:35000});
      assert(response?.ok(),`Y${rec.year} M${rec.module}: HTTP ${response?.status()}`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const state=await page.evaluate(({year,module})=>{
        function walk(v,seen=new Set()){if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);if(Array.isArray(v.activities)&&Number(v.year||0)===year&&Number(v.module||0)===module)return v;for(const child of Object.values(v)){const found=walk(child,seen);if(found)return found;}return null;}
        const mod=walk(window.DUDUQ_CONTENT||{});const dd=[];
        for(const activity of mod?.activities||[])for(const q of activity?.questions||[]){if(String(activity?.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase()==="drag-drop")dd.push(q);}
        const manifest=window.DUDUQ_ENGINE_MANIFEST||{};return {manifest:{revision:manifest.revision,core:manifest.core?.release,dd:manifest.mechanics?.["drag-drop"]?.release},registered:window.DuduQ?.listMechanics?.()||[],questions:dd,rootText:String(document.querySelector("#root")?.textContent||"").trim()};
      },{year:rec.year,module:rec.module});
      assert(state.manifest.revision===148,`Y${rec.year} M${rec.module}: revision ${state.manifest.revision}`);assert(state.manifest.core==="1.0.12",`Y${rec.year} M${rec.module}: core ${state.manifest.core}`);assert(state.manifest.dd==="2.0.25",`Y${rec.year} M${rec.module}: manifest DD ${state.manifest.dd}`);
      const reg=state.registered.find(x=>x.id==="drag-drop");assert(reg?.version==="2.0.25",`Y${rec.year} M${rec.module}: registered DD ${reg?.version}`);assert(state.questions.length>0,`Y${rec.year} M${rec.module}: sem pergunta DD real`);assert(!/^Erro:/i.test(state.rootText),`Y${rec.year} M${rec.module}: ${state.rootText}`);
      const candidates=state.questions.filter(q=>questionFeatures(q).has("sequence")===false&&interactionContract(q).pairs.length>0&&interactionContract(q).wrong);
      const chosen=candidates.sort((a,b)=>questionFeatures(b).size-questionFeatures(a).size)[0];assert(chosen,`Y${rec.year} M${rec.module}: nenhum DD real adequado ao sanity comportamental`);
      const feats=await mountRealQuestion(page,chosen,rec);for(const f of feats)actualCoverage.add(f);
      const flow=await provePlayerFlow(page,rec);
      assert(pageErrors.length===0,`Y${rec.year} M${rec.module}: pageError ${pageErrors.join(" | ")}`);assert(critical404.length===0,`Y${rec.year} M${rec.module}: critical404 ${critical404.join(" | ")}`);
      report.push({year:rec.year,module:rec.module,question:chosen.id,features:[...feats],dd:"2.0.25",flow});
    }finally{await page.close();}
  }

  if(notApplicable.includes("classification")){
    const page=await browser.newPage({viewport:{width:1366,height:768}});await installTtsStub(page);
    try{await page.goto(`${BASE}/content/english/year-1/module-01/?qa=r148-classification-fixture`,{waitUntil:"domcontentloaded",timeout:35000});await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});assert(await page.evaluate(()=>window.DUDUQ_ENGINE_MANIFEST?.revision===148&&window.DuduQ?.getMechanic?.("drag-drop")?.version==="2.0.25"),"R148 não carregada para classification fixture");await proveClassificationFixture(page);actualCoverage.add("classification");}finally{await page.close();}
  }
}finally{await browser.close();}

for(const feature of wanted){
  if(actualCoverage.has(feature))continue;
  if(notApplicable.includes(feature))continue;
  throw new Error(`feature coverage real ausente: ${feature}`);
}
console.log(JSON.stringify({status:"PASS",years:[1,2,3,4,5],consumerAvailability:availability,consumerNotApplicable:notApplicable,coverage:[...actualCoverage].sort(),classificationFixture:notApplicable.includes("classification")?"PASS":"NOT_NEEDED",modules:report},null,2));
