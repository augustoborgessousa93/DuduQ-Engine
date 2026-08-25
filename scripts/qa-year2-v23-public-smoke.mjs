import { chromium } from "playwright";
import process from "node:process";

const BASE=(process.env.DUDUQ_PUBLIC_BASE||"https://duduq-engine.pages.dev").replace(/\/$/,"");
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitForV23(page,module,device){
  const mm=String(module).padStart(2,"0");
  let last=null;
  for(let attempt=1;attempt<=18;attempt++){
    const url=`${BASE}/content/english/year-2/module-${mm}/?qa=${Date.now()}-${attempt}`;
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000}).catch(()=>null);
    const entry=await page.evaluate(()=>window.DUDUQ_PUBLIC_ENTRY||null).catch(()=>null);
    last={status:response?.status?.()??null,entry};
    if(response?.ok?.()&&entry?.sourceVersion==="2.3"&&entry?.module===module)return {attempt,url,entry};
    if(attempt<18)await sleep(5000);
  }
  throw new Error(`M${mm} ${device}: deploy v2.3 não apareceu; último=${JSON.stringify(last)}`);
}

async function runCase(browser,module,device){
  const mm=String(module).padStart(2,"0");
  const viewport=device==="mobile"?{width:390,height:844}:{width:1366,height:768};
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
  try{
    const deployed=await waitForV23(page,module,device);
    const start=page.getByRole("button",{name:/INICIAR MISSÃO/i});
    await start.waitFor({state:"visible",timeout:20000});
    await start.click();
    await page.waitForFunction(()=>Boolean(document.querySelector("iframe"))||/Erro:|Erro ao carregar/i.test(document.getElementById("root")?.textContent||""),undefined,{timeout:25000});
    const rootText=await page.locator("#root").innerText().catch(()=>"");
    check(!/Erro:|Erro ao carregar/i.test(rootText),`M${mm} ${device}: host error ${rootText.slice(0,220)}`);
    const iframe=page.locator("iframe").first();
    await iframe.waitFor({state:"visible",timeout:15000});
    const handle=await iframe.elementHandle();
    const frame=await handle?.contentFrame();
    check(frame,`M${mm} ${device}: iframe sem contentFrame`);
    await frame.waitForFunction(()=>{
      const txt=(document.body?.innerText||"").trim();
      const interactive=document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item,.duduq-dd-item').length;
      return /Falha ao preparar|Modo editorial|\bErro\b/i.test(txt)||(!/^Preparando\b/i.test(txt)&&interactive>0);
    },undefined,{timeout:18000});
    const bodyText=await frame.locator("body").innerText().catch(()=>"");
    check(!/Falha ao preparar|Modo editorial|\bErro\b/i.test(bodyText),`M${mm} ${device}: runtime error ${bodyText.slice(0,220)}`);
    const outerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    const innerOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2).catch(()=>false);
    check(!outerOverflow&&!innerOverflow,`M${mm} ${device}: overflow horizontal`);
    check(errors.length===0,`M${mm} ${device}: console/page errors: ${errors.slice(0,3).join(" | ")}`);
    if(module===1){
      const publicMeta=await page.evaluate(()=>({entry:window.DUDUQ_PUBLIC_ENTRY,gate:[...document.scripts].some(s=>String(s.src).includes("m1-12-first-listen-gate-v23.js")),compact:[...document.scripts].some(s=>String(s.src).includes("m1-12-mobile-compact-v23.js"))}));
      check(publicMeta.gate&&publicMeta.compact,`M01 ${device}: bridges do M1-12 ausentes no entrypoint público`);
      check(publicMeta.entry?.englishReadingRequired===false,`M01 ${device}: política de leitura v2.3 ausente`);
    }
    console.log(`PASS PUBLIC V23 M${mm} ${device} attempt=${deployed.attempt}`);
    return {module:mm,device,status:"PASS",attempt:deployed.attempt};
  }finally{await page.close()}
}

const browser=await chromium.launch({headless:true});
const results=[];const failures=[];
try{
  for(const device of ["desktop","mobile"]){
    for(let module=1;module<=6;module++){
      try{results.push(await runCase(browser,module,device))}
      catch(e){failures.push(`M${String(module).padStart(2,"0")} ${device}: ${e.message}`);console.error(failures.at(-1))}
    }
  }
}finally{await browser.close()}
console.log(JSON.stringify({results,failures},null,2));
if(failures.length){console.error("DUDUQ YEAR2 v2.3 PUBLIC SMOKE: FAIL");process.exit(1)}
console.log("DUDUQ YEAR2 v2.3 PUBLIC SMOKE: PASS (12/12)");
