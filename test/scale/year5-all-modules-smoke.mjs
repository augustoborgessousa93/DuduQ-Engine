import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}
function mm(value){return String(value).padStart(2,"0");}
function isExpectedWorldFusionAbort(url,errorText){
  return /\/engine\/releases\/core\/1\.0\.9\/duduq-world-fusion\.css(?:\?|$)/.test(url) && /ERR_ABORTED/i.test(errorText||"");
}

const browser=await chromium.launch({headless:true});
try{
  const results=[];
  for(const viewport of [{name:"desktop",width:1366,height:768},{name:"mobile",width:390,height:844}]){
    for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
      await page.emulateMedia({reducedMotion:"reduce"});
      const errors=[];
      const localNetwork=[];
      const transientAborts=[];
      page.on("pageerror",e=>errors.push(`pageerror: ${String(e.message||e)}`));
      page.on("console",msg=>{if(msg.type()==="error")errors.push(`console: ${msg.text()}`);});
      page.on("requestfailed",req=>{
        if(!req.url().startsWith(BASE))return;
        const errorText=req.failure()?.errorText||"unknown";
        const message=`requestfailed ${req.url()} :: ${errorText}`;
        if(isExpectedWorldFusionAbort(req.url(),errorText))transientAborts.push(message);
        else localNetwork.push(message);
      });
      page.on("response",res=>{if(res.url().startsWith(BASE)&&res.status()>=400)localNetwork.push(`http ${res.status()} ${res.url()}`);});

      const url=`${BASE}/content/english/year-5/module-${mm(moduleNumber)}/`;
      await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
      await page.waitForFunction(()=>{
        const root=(document.querySelector("#root")?.textContent||"").trim();
        return window.DUDUQ_ENGINE_READY===true || /^Erro ao carregar o DuduQ:/i.test(root);
      },null,{timeout:15000});

      let state=await page.evaluate((moduleNumber)=>{
        const moduleKey=`module${String(moduleNumber).padStart(2,"0")}`;
        const module=window.DUDUQ_CONTENT?.english?.year5?.[moduleKey];
        return {
          ready:window.DUDUQ_ENGINE_READY===true,
          channel:window.DUDUQ_ENGINE_MANIFEST?.channel,
          revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
          sharedVisual:window.DuduQSmartVisual?.version||null,
          moduleItems:module?.activities?.length||0,
          readingMode:module?.pedagogyPolicy?.readingMode||"",
          introActive:Boolean(window.DuduQIntro?.isActive?.()),
          rootText:(document.querySelector("#root")?.textContent||"").trim().slice(0,1200)
        };
      },moduleNumber);

      assert(state.ready,`${viewport.name} M${mm(moduleNumber)}: engine não ficou ready. root=${state.rootText} network=${localNetwork.join(" | ")} errors=${errors.join(" | ")}`);
      assert(state.channel==="scale-v1",`${viewport.name} M${mm(moduleNumber)}: canal incorreto ${state.channel}.`);
      assert(state.revision===2,`${viewport.name} M${mm(moduleNumber)}: revisão scale-v1 inesperada ${state.revision}.`);
      assert(state.sharedVisual==="1.1.0",`${viewport.name} M${mm(moduleNumber)}: smart visual compartilhado não carregou.`);
      assert(state.moduleItems===15,`${viewport.name} M${mm(moduleNumber)}: módulo não publicou 15 atividades.`);
      assert(state.readingMode==="FUNCIONAL",`${viewport.name} M${mm(moduleNumber)}: leitura FUNCIONAL não publicada.`);
      assert(state.introActive,`${viewport.name} M${mm(moduleNumber)}: Intro não ficou ativa.`);

      const startButton=page.locator(".duduq-intro-start-button");
      await startButton.waitFor({state:"visible",timeout:15000});
      await page.waitForFunction(()=>{
        const button=document.querySelector(".duduq-intro-start-button");
        return Boolean(button&&!button.disabled&&button.getAttribute("aria-disabled")!=="true");
      },null,{timeout:15000});
      await startButton.click();

      await page.waitForFunction(()=>{
        const root=(document.querySelector("#root")?.textContent||"").trim();
        return Boolean(document.querySelector("#root iframe")) || /^Erro:/i.test(root) || /^Erro ao carregar/i.test(root);
      },null,{timeout:15000});

      const rootText=await page.locator("#root").innerText().catch(()=>"");
      assert(!/^Erro:/i.test(rootText)&&!/^Erro ao carregar/i.test(rootText),`${viewport.name} M${mm(moduleNumber)}: Player/Loader exibiu erro: ${rootText}.`);

      await page.waitForFunction(()=>{
        const frame=document.querySelector("#root iframe");
        const doc=frame?.contentDocument;
        const finalUrl=String(doc?.URL||"");
        const style=doc?.getElementById("duduq-world-fusion-style");
        const htmlLength=doc?.documentElement?.outerHTML?.length||0;
        const mechanicRoot=Boolean(doc?.querySelector('[class*="duduq-"]'));
        return Boolean(frame&&doc&&finalUrl&&finalUrl!=="about:blank"&&doc.readyState==="complete"&&htmlLength>500&&mechanicRoot&&style&&style.sheet);
      },null,{timeout:20000});

      const frameState=await page.evaluate(()=>{
        const frame=document.querySelector("#root iframe");
        const doc=frame?.contentDocument;
        return {
          url:doc?.URL||"",
          worldFusionStyle:Boolean(doc?.getElementById("duduq-world-fusion-style")?.sheet),
          worldFusionVersion:doc?.documentElement?.getAttribute("data-duduq-world-fusion-version")||"",
          year:doc?.documentElement?.getAttribute("data-duduq-ano")||"",
          htmlLength:doc?.documentElement?.outerHTML?.length||0,
          mechanicRoot:Boolean(doc?.querySelector('[class*="duduq-"]'))
        };
      });

      assert(frameState.worldFusionStyle,`${viewport.name} M${mm(moduleNumber)}: World Fusion não carregou.`);
      assert(frameState.worldFusionVersion==="1.4.10",`${viewport.name} M${mm(moduleNumber)}: World Fusion não sincronizado.`);
      assert(frameState.year==="5",`${viewport.name} M${mm(moduleNumber)}: ano ativo no iframe deveria ser 5; recebido ${frameState.year}.`);
      assert(frameState.htmlLength>500&&frameState.mechanicRoot,`${viewport.name} M${mm(moduleNumber)}: runtime final incompleto.`);
      assert(localNetwork.length===0,`${viewport.name} M${mm(moduleNumber)}: falhas locais: ${localNetwork.join(" | ")}`);
      const critical=errors.filter(e=>!/favicon|google fonts|ERR_BLOCKED_BY_CLIENT|Failed to load resource.*raw\.githubusercontent\.com/i.test(e));
      assert(critical.length===0,`${viewport.name} M${mm(moduleNumber)}: erros críticos: ${critical.join(" | ")}`);

      results.push({viewport:viewport.name,module:moduleNumber,items:state.moduleItems,frame:true,worldFusion:true,readingMode:state.readingMode,transientAborts:transientAborts.length});
      console.log(JSON.stringify(results.at(-1)));
      await page.close();
    }
  }
  assert(results.length===12,`Smoke deveria validar 12 combinações; recebeu ${results.length}.`);
  console.log("PASS — Year5 M01-M06 percorrem Intro e carregam o runtime compartilhado em desktop/mobile.");
}finally{await browser.close();}
