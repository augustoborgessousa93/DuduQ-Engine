import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const root=process.cwd();
const assert=(c,m)=>{if(!c)throw new Error(m)};
const wanted=["single-choice","association","classification","capacity","media","sequence"];

function sourceFeatures(text){
  const f=new Set();
  if(/single-choice/i.test(text))f.add("single-choice");
  if(/strategy\s*[:=]\s*["']association|"strategy"\s*:\s*"association"/i.test(text))f.add("association");
  if(/strategy\s*[:=]\s*["']classification|"strategy"\s*:\s*"classification"/i.test(text))f.add("classification");
  if(/capacity\s*:\s*[2-9]|"capacity"\s*:\s*[2-9]/i.test(text))f.add("capacity");
  if(/imageAssetKey|imageAsset|imageUrl/i.test(text))f.add("media");
  if(/strategy\s*[:=]\s*["']sequence|"strategy"\s*:\s*"sequence"/i.test(text))f.add("sequence");
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

const selected=[];const key=r=>`${r.year}-${r.module}`;
for(let year=1;year<=5;year++){
  const r=records.find(x=>x.year===year);assert(r,`Year ${year} sem consumidor DD`);selected.push(r);
}
for(const feature of wanted){
  if(selected.some(r=>r.features.has(feature)))continue;
  const r=records.find(x=>x.features.has(feature));assert(r,`sem consumidor publicado para ${feature}`);if(!selected.some(s=>key(s)===key(r)))selected.push(r);
}
assert(selected.length<=10,`sanity deixou de ser proporcional: ${selected.length} módulos`);

function payloadFeatures(p){
  const f=new Set();
  const strategy=String(p?.strategy||"").toLowerCase();const mode=String(p?.mode||"").toLowerCase();
  if(mode==="single-choice")f.add("single-choice");
  if(strategy==="association")f.add("association");
  if(strategy==="classification")f.add("classification");
  if(strategy==="sequence")f.add("sequence");
  if((p?.targets||[]).some(t=>Number(t?.capacity||1)>1))f.add("capacity");
  if([...(p?.items||[]),...(p?.targets||[])].some(v=>v?.imageAssetKey||v?.imageAsset||v?.imageUrl||v?.image?.src))f.add("media");
  return f;
}

const browser=await chromium.launch({headless:true});
const actualCoverage=new Set();let retryProved=false,successProved=false,movedProved=false,confirmOnlyProved=false,completionProved=false;
const report=[];
try{
  for(const rec of selected){
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${rec.year}/`))critical404.push(u)}});
    try{
      const url=`${BASE}/content/english/year-${rec.year}/${rec.name}/?qa=r148-dd225-sanity`;
      const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:35000});
      assert(response?.ok(),`Y${rec.year} M${rec.module}: HTTP ${response?.status()}`);
      await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const state=await page.evaluate(({year,module})=>{
        function walk(v,seen=new Set()){
          if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);
          if(Array.isArray(v.activities)&&(Number(v.year||0)===year||Number(v.module||0)===module))return v;
          for(const child of Object.values(v)){const found=walk(child,seen);if(found)return found;}
          return null;
        }
        const mod=walk(window.DUDUQ_CONTENT||{});
        const dd=[];
        for(const activity of mod?.activities||[])for(const q of activity?.questions||[]){
          if(String(activity?.mechanic||q?.delivery?.mechanic||q?.renderer||"").toLowerCase()==="drag-drop"&&q?.payload)dd.push({id:q.id||"",payload:q.payload});
        }
        const manifest=window.DUDUQ_ENGINE_MANIFEST||{};
        return {manifest:{revision:manifest.revision,core:manifest.core?.release,dd:manifest.mechanics?.["drag-drop"]?.release},registered:window.DuduQ?.listMechanics?.()||[],questions:dd,rootText:String(document.querySelector("#root")?.textContent||"").trim()};
      },{year:rec.year,module:rec.module});
      assert(state.manifest.revision===148,`Y${rec.year} M${rec.module}: revision ${state.manifest.revision}`);
      assert(state.manifest.core==="1.0.12",`Y${rec.year} M${rec.module}: core ${state.manifest.core}`);
      assert(state.manifest.dd==="2.0.25",`Y${rec.year} M${rec.module}: manifest DD ${state.manifest.dd}`);
      const reg=state.registered.find(x=>x.id==="drag-drop");assert(reg?.version==="2.0.25",`Y${rec.year} M${rec.module}: registered DD ${reg?.version}`);
      assert(state.questions.length>0,`Y${rec.year} M${rec.module}: sem pergunta DD real`);
      assert(!/^Erro:/i.test(state.rootText),`Y${rec.year} M${rec.module}: ${state.rootText}`);

      let chosen=state.questions[0];
      const missing=wanted.filter(f=>!actualCoverage.has(f));
      const preferred=state.questions.find(q=>[...payloadFeatures(q.payload)].some(f=>missing.includes(f)));
      if(preferred)chosen=preferred;
      const feats=payloadFeatures(chosen.payload);for(const f of feats)actualCoverage.add(f);

      await page.evaluate(({payload,year,module})=>{
        window.__R148_SANITY_RESULTS__=[];window.__R148_SANITY_COMPLETIONS__=[];
        if(!window.__R148_SANITY_LISTENER__){addEventListener("message",e=>{if(e.data?.type==="DUDUQ_DRAG_DROP_RESULT")window.__R148_SANITY_RESULTS__.push(e.data.payload)});window.__R148_SANITY_LISTENER__=true;}
        const old=document.getElementById("r148-dd225-sanity");old?.remove();
        const host=document.createElement("div");host.id="r148-dd225-sanity";host.style.cssText="position:fixed;inset:0;z-index:999999;background:#fff";document.body.appendChild(host);
        const mech=window.DuduQ?.getMechanic?.("drag-drop");if(!mech||mech.version!=="2.0.25")throw new Error("DD225 não registrado");
        window.__R148_SANITY_DESTROY__=mech.mount({container:host,payload,context:{subject:"english",year,module,stepId:"r148-sanity",stepTitle:"R148 sanity",stepIndex:0,totalSteps:1},onComplete:r=>window.__R148_SANITY_COMPLETIONS__.push(r)});
      },{payload:chosen.payload,year:rec.year,module:rec.module});

      let frame=null;const deadline=Date.now()+12000;while(Date.now()<deadline&&!frame){frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==="about:srcdoc"&&f.locator(".duduq-dd2-root").count().catch(()=>0));if(!frame)await page.waitForTimeout(100)}
      frame=page.frames().find(f=>f!==page.mainFrame()&&f.url()==="about:srcdoc");assert(frame,`Y${rec.year} M${rec.module}: iframe DD ausente`);
      await frame.locator(".duduq-dd2-root").waitFor({state:"visible",timeout:12000});
      const smart=await frame.locator(".duduq-dd2-root").getAttribute("data-dd225-smart-snap");assert(smart==="true",`Y${rec.year} M${rec.module}: smart snap inativo`);
      if(feats.has("media")){
        await frame.waitForFunction(()=>Array.from(document.querySelectorAll(".duduq-dd2-item-media,.duduq-dd2-target-media")).some(img=>img.naturalWidth>0&&img.naturalHeight>0),null,{timeout:12000});
      }

      const p=chosen.payload;const items=Array.isArray(p.items)?p.items:[];const targets=Array.isArray(p.targets)?p.targets:[];
      const targetById=id=>frame.locator(`[data-dd2-target-id="${id}"] .duduq-dd2-zone`).first();
      const itemById=id=>frame.locator(`[data-dd2-item-id="${id}"]`).first();
      const place=async(id,tid)=>{await itemById(id).click({force:true});await targetById(tid).click({force:true});movedProved=true;};
      const confirm=frame.locator(".duduq-dd2-confirm");

      if(!retryProved&&String(p.mode||"").toLowerCase()==="single-choice"){
        const target=targets[0];const correct=items.find(i=>i.required!==false&&i.targetId===target?.id);const wrong=items.find(i=>i.id!==correct?.id);
        if(target&&correct&&wrong){
          await place(wrong.id,target.id);const before=await page.evaluate(()=>window.__R148_SANITY_RESULTS__.length);assert(before===0,"avaliação ocorreu antes de Confirmar");confirmOnlyProved=true;
          await confirm.click({force:true});await page.waitForFunction(()=>window.__R148_SANITY_RESULTS__.length>=1,null,{timeout:7000});
          const first=await page.evaluate(()=>window.__R148_SANITY_RESULTS__[0]);assert(first?.isCorrect===false,"retry não ocorreu");retryProved=true;
          await page.waitForTimeout(1000);await place(correct.id,target.id);await page.waitForTimeout(100);await confirm.click({force:true});
          await page.waitForFunction(()=>window.__R148_SANITY_RESULTS__.some(r=>r?.isCorrect===true),null,{timeout:7000});successProved=true;
        }
      }else if(!successProved&&String(p.strategy||"").toLowerCase()!=="sequence"){
        const required=items.filter(i=>i.required!==false&&i.targetId);
        if(required.length){for(const it of required)await place(it.id,it.targetId);const before=await page.evaluate(()=>window.__R148_SANITY_RESULTS__.length);assert(before===0,"avaliação ocorreu antes de Confirmar");confirmOnlyProved=true;await confirm.click({force:true});await page.waitForFunction(()=>window.__R148_SANITY_RESULTS__.some(r=>r?.isCorrect===true),null,{timeout:7000});successProved=true;}
      }else if(feats.has("sequence")){
        const target=targets[0];if(target&&items.length){await place(items[0].id,target.id);confirmOnlyProved=confirmOnlyProved||(await page.evaluate(()=>window.__R148_SANITY_RESULTS__.length)===0);}
      }

      const completions=await page.evaluate(()=>window.__R148_SANITY_COMPLETIONS__.length);if(completions>0)completionProved=true;
      await page.evaluate(()=>{try{window.__R148_SANITY_DESTROY__?.()}catch(_){}document.getElementById("r148-dd225-sanity")?.remove()});

      const start=page.locator(".duduq-intro-start-button");if(await start.count()){await start.first().click({force:true});await page.waitForFunction(()=>Array.from(document.querySelectorAll("iframe")).some(f=>f.srcdoc&&f.getBoundingClientRect().width>40),null,{timeout:20000});}
      assert(pageErrors.length===0,`Y${rec.year} M${rec.module}: pageError ${pageErrors.join(" | ")}`);assert(critical404.length===0,`Y${rec.year} M${rec.module}: critical404 ${critical404.join(" | ")}`);
      report.push({year:rec.year,module:rec.module,question:chosen.id,features:[...feats],dd:"2.0.25"});
    }finally{await page.close();}
  }
}finally{await browser.close();}

for(const f of wanted)assert(actualCoverage.has(f),`feature coverage ausente: ${f}`);
assert(movedProved,"movimentação não provada");assert(confirmOnlyProved,"Confirmar obrigatório não provado");assert(retryProved,"retry não provado");assert(successProved,"success não provado");
console.log(JSON.stringify({status:"PASS",years:[1,2,3,4,5],coverage:[...actualCoverage].sort(),movedProved,confirmOnlyProved,retryProved,successProved,completionObserved:completionProved,modules:report},null,2));
