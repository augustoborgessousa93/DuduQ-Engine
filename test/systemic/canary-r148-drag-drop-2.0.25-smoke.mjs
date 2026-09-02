import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const assert=(c,m)=>{if(!c)throw new Error(m)};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
const pageErrors=[];const critical404=[];
page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes("/content/english/"))critical404.push(u)}});
try{
  const response=await page.goto(`${BASE}/test/systemic/year1-loader-compat.html?module=2&qa=canary-r148-dd225`,{waitUntil:"domcontentloaded",timeout:35000});
  assert(response?.ok(),`shell HTTP ${response?.status()}`);
  await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
  const boot=await page.evaluate(()=>{
    const manifest=window.DUDUQ_ENGINE_MANIFEST||{};
    const scripts=Array.from(document.scripts).map(s=>s.src).filter(Boolean);
    return {revision:manifest.revision,core:manifest.core?.release||"",dragDrop:manifest.mechanics?.["drag-drop"]||null,channel:manifest.channel||"",scripts,registered:window.DuduQ?.listMechanics?.()||[],required:[...(window.DUDUQ_GAME_CONFIG?.requiredMechanics||[])],rootText:String(document.querySelector("#root")?.textContent||"").trim()};
  });
  assert(boot.revision===148,`revision ${boot.revision}`);
  assert(boot.core==="1.0.12",`Core ${boot.core}`);
  assert(boot.channel==="canary-v1",`channel ${boot.channel}`);
  assert(boot.dragDrop?.release==="2.0.25",`DD ${boot.dragDrop?.release}`);
  assert(boot.dragDrop?.adapter?.includes("/drag-drop/2.0.25/drag-drop.js"),"adapter 2.0.25 ausente");
  assert(boot.scripts.some(s=>s.includes("/engine/duduq-loader-v1.js")),"Loader ausente");
  assert(boot.scripts.some(s=>s.includes("/engine/releases/core/1.0.12/duduq-host.js")),"Host Core 1.0.12 ausente");
  assert(boot.scripts.some(s=>s.includes("/engine/releases/core/1.0.12/duduq-router.js")),"Router Core 1.0.12 ausente");
  assert(boot.scripts.some(s=>s.includes("/engine/releases/mechanics/drag-drop/2.0.25/drag-drop.js")),"Loader não carregou DD 2.0.25");
  const dd=boot.registered.find(x=>x.id==="drag-drop");
  assert(dd?.version==="2.0.25",`DD registrado ${dd?.version}`);
  assert(!/^Erro:/i.test(boot.rootText),`shell error ${boot.rootText}`);
  assert(pageErrors.length===0,`pageError ${pageErrors.join(" | ")}`);
  assert(critical404.length===0,`critical404 ${critical404.join(" | ")}`);
  console.log(JSON.stringify({status:"PASS",revision:boot.revision,core:boot.core,dragDrop:dd.version,loader:"PASS",registration:"PASS",shell:"PASS",critical404:0,pageError:0},null,2));
}finally{await page.close();await browser.close();}
