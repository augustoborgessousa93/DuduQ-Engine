import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}
function mm(value){return String(value).padStart(2,"0");}
function expectedTransient(url,errorText){
  return /duduq-world-fusion\.css/i.test(url)&&/ERR_ABORTED/i.test(errorText||"");
}

const browser=await chromium.launch({headless:true});
try{
  const results=[];
  for(const year of [1,2]){
    for(const viewport of [{name:"desktop",width:1366,height:768},{name:"mobile",width:390,height:844}]){
      for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
        const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
        await page.emulateMedia({reducedMotion:"reduce"});
        const errors=[];
        const localNetwork=[];
        const transient=[];
        page.on("pageerror",e=>errors.push(`pageerror: ${String(e.message||e)}`));
        page.on("console",msg=>{if(msg.type()==="error")errors.push(`console: ${msg.text()}`);});
        page.on("requestfailed",req=>{
          if(!req.url().startsWith(BASE))return;
          const errorText=req.failure()?.errorText||"unknown";
          const line=`requestfailed ${req.url()} :: ${errorText}`;
          if(expectedTransient(req.url(),errorText))transient.push(line); else localNetwork.push(line);
        });
        page.on("response",res=>{if(res.url().startsWith(BASE)&&res.status()>=400)localNetwork.push(`http ${res.status()} ${res.url()}`);});

        const url=`${BASE}/content/english/year-${year}/module-${mm(moduleNumber)}/`;
        await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
        await page.waitForFunction(()=>{
          const root=(document.querySelector("#root")?.textContent||"").trim();
          return Boolean(
            document.querySelector(".duduq-intro-start-button")||
            document.querySelector("#root iframe")||
            /^Erro:/i.test(root)||
            /^Erro ao carregar/i.test(root)
          );
        },null,{timeout:20000});

        let rootText=(await page.locator("#root").innerText().catch(()=>""))||"";
        assert(!/^Erro:/i.test(rootText)&&!/^Erro ao carregar/i.test(rootText),`Y${year} ${viewport.name} M${mm(moduleNumber)}: erro antes da missão: ${rootText}`);

        const startButton=page.locator(".duduq-intro-start-button");
        if(await startButton.count()){
          await startButton.waitFor({state:"visible",timeout:15000});
          await page.waitForFunction(()=>{
            const button=document.querySelector(".duduq-intro-start-button");
            return Boolean(button&&!button.disabled&&button.getAttribute("aria-disabled")!=="true");
          },null,{timeout:15000});
          await startButton.click();
        }

        await page.waitForFunction(()=>{
          const root=(document.querySelector("#root")?.textContent||"").trim();
          return Boolean(document.querySelector("#root iframe"))||/^Erro:/i.test(root)||/^Erro ao carregar/i.test(root);
        },null,{timeout:20000});

        rootText=(await page.locator("#root").innerText().catch(()=>""))||"";
        assert(!/^Erro:/i.test(rootText)&&!/^Erro ao carregar/i.test(rootText),`Y${year} ${viewport.name} M${mm(moduleNumber)}: erro ao iniciar: ${rootText}`);

        await page.waitForFunction(()=>{
          const frame=document.querySelector("#root iframe");
          const doc=frame?.contentDocument;
          const url=String(doc?.URL||"");
          const htmlLength=doc?.documentElement?.outerHTML?.length||0;
          return Boolean(frame&&doc&&url&&url!=="about:blank"&&doc.readyState==="complete"&&htmlLength>500);
        },null,{timeout:25000});

        const frame=await page.evaluate(()=>{
          const element=document.querySelector("#root iframe");
          const doc=element?.contentDocument;
          return {
            url:doc?.URL||"",
            readyState:doc?.readyState||"",
            htmlLength:doc?.documentElement?.outerHTML?.length||0,
            worldFusion:Boolean(doc?.getElementById("duduq-world-fusion-style")?.sheet||doc?.documentElement?.classList?.contains("duduq-world-fusion")),
            activeYear:doc?.documentElement?.getAttribute("data-duduq-ano")||doc?.documentElement?.getAttribute("data-duduq-ano-ativo")||"",
            mechanic:doc?.documentElement?.getAttribute("data-duduq-mechanic")||"",
            bodyText:(doc?.body?.innerText||"").trim().slice(0,500)
          };
        });

        assert(frame.htmlLength>500,`Y${year} ${viewport.name} M${mm(moduleNumber)}: runtime final vazio.`);
        assert(localNetwork.length===0,`Y${year} ${viewport.name} M${mm(moduleNumber)}: falhas locais: ${localNetwork.join(" | ")}`);
        const critical=errors.filter(e=>!/favicon|google fonts|ERR_BLOCKED_BY_CLIENT|Failed to load resource.*raw\.githubusercontent\.com|play\(\) failed|NotAllowedError/i.test(e));
        assert(critical.length===0,`Y${year} ${viewport.name} M${mm(moduleNumber)}: erros críticos: ${critical.join(" | ")}`);

        results.push({year,module:moduleNumber,viewport:viewport.name,frame:true,worldFusion:frame.worldFusion,activeYear:frame.activeYear,mechanic:frame.mechanic,transientAborts:transient.length});
        console.log(JSON.stringify(results.at(-1)));
        await page.close();
      }
    }
  }
  assert(results.length===24,`Baseline deveria validar 24 combinações Year1/Year2; recebeu ${results.length}.`);
  console.log("PASS — Year1 e Year2 mantêm public entries funcionais em desktop/mobile antes da migração cross-year.");
}finally{await browser.close();}
