import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}
function mm(value){return String(value).padStart(2,"0");}

const browser=await chromium.launch({headless:true});
try{
  const results=[];
  for(const viewport of [{name:"desktop",width:1366,height:768},{name:"mobile",width:390,height:844}]){
    for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
      const errors=[];
      const localNetwork=[];
      page.on("pageerror",e=>errors.push(`pageerror: ${String(e.message||e)}`));
      page.on("console",msg=>{if(msg.type()==="error")errors.push(`console: ${msg.text()}`);});
      page.on("requestfailed",req=>{if(req.url().startsWith(BASE))localNetwork.push(`requestfailed ${req.url()} :: ${req.failure()?.errorText||"unknown"}`);});
      page.on("response",res=>{if(res.url().startsWith(BASE)&&res.status()>=400)localNetwork.push(`http ${res.status()} ${res.url()}`);});

      const url=`${BASE}/content/english/year-3/module-${mm(moduleNumber)}/`;
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
      await page.waitForFunction(()=>{
        const root=(document.querySelector("#root")?.textContent||"").trim();
        return window.DUDUQ_ENGINE_READY===true || /^Erro ao carregar o DuduQ:/i.test(root);
      },null,{timeout:15000});

      let state=await page.evaluate((moduleNumber)=>({
        ready:window.DUDUQ_ENGINE_READY===true,
        channel:window.DUDUQ_ENGINE_MANIFEST?.channel,
        revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
        sharedVisual:window.DuduQSmartVisual?.version||null,
        sharedBubble:window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY__?.version||null,
        moduleItems:window.DUDUQ_CONTENT?.english?.year3?.[`module${String(moduleNumber).padStart(2,"0")}`]?.activities?.length||0,
        rootText:(document.querySelector("#root")?.textContent||"").trim().slice(0,1200),
        bodyText:(document.body?.innerText||"").trim().slice(0,1200)
      }),moduleNumber);

      assert(state.ready,`${viewport.name} M${mm(moduleNumber)}: engine não ficou ready. root=${state.rootText} network=${localNetwork.join(" | ")} errors=${errors.join(" | ")}`);
      assert(state.channel==="scale-v1",`${viewport.name} M${mm(moduleNumber)}: canal incorreto ${state.channel}.`);
      assert(state.revision===2,`${viewport.name} M${mm(moduleNumber)}: revisão scale-v1 inesperada ${state.revision}.`);
      assert(state.sharedVisual==="1.0.0",`${viewport.name} M${mm(moduleNumber)}: smart visual compartilhado não carregou.`);
      assert(state.sharedBubble==="1.0.0",`${viewport.name} M${mm(moduleNumber)}: Bubble safety compartilhado não carregou.`);
      assert(state.moduleItems===15,`${viewport.name} M${mm(moduleNumber)}: módulo não publicou 15 atividades.`);

      await page.waitForFunction(()=>{
        const root=(document.querySelector("#root")?.textContent||"").trim();
        return Boolean(document.querySelector("#root iframe")) || /^Erro:/i.test(root) || /^Erro ao carregar/i.test(root);
      },null,{timeout:15000});

      state=await page.evaluate((moduleNumber)=>({
        ready:window.DUDUQ_ENGINE_READY===true,
        channel:window.DUDUQ_ENGINE_MANIFEST?.channel,
        revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
        moduleItems:window.DUDUQ_CONTENT?.english?.year3?.[`module${String(moduleNumber).padStart(2,"0")}`]?.activities?.length||0,
        frameSrc:document.querySelector("#root iframe")?.getAttribute("src")||document.querySelector("#root iframe")?.getAttribute("srcdoc")?.slice(0,40)||"",
        rootText:(document.querySelector("#root")?.textContent||"").trim().slice(0,1200),
        bodyText:(document.body?.innerText||"").trim().slice(0,1200)
      }),moduleNumber);

      assert(!/^Erro:/i.test(state.rootText)&&!/^Erro ao carregar/i.test(state.rootText),`${viewport.name} M${mm(moduleNumber)}: Player/Loader exibiu erro: ${state.rootText}. console=${errors.join(" | ")}`);
      assert(state.frameSrc,`${viewport.name} M${mm(moduleNumber)}: nenhuma mecânica abriu no iframe. root=${state.rootText} console=${errors.join(" | ")}`);
      assert(localNetwork.length===0,`${viewport.name} M${mm(moduleNumber)}: falhas locais de rede: ${localNetwork.join(" | ")}`);
      const critical=errors.filter(e=>!/favicon|google fonts|ERR_BLOCKED_BY_CLIENT/i.test(e));
      assert(critical.length===0,`${viewport.name} M${mm(moduleNumber)}: erros críticos: ${critical.join(" | ")}`);

      results.push({viewport:viewport.name,module:moduleNumber,items:state.moduleItems,frame:true});
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
  }
  assert(results.length===12,`Smoke deveria validar 12 combinações; recebeu ${results.length}.`);
  console.log("PASS — Year3 M01-M06 abrem no scale-v1 em desktop/mobile com 15 atividades por módulo.");
}finally{await browser.close();}
