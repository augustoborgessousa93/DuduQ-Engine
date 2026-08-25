import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE=(process.env.DUDUQ_QA_BASE||"http://127.0.0.1:4173").replace(/\/$/,"");
const OUT=path.resolve(process.env.DUDUQ_QA_OUT||"artifacts/year2-v23");
fs.mkdirSync(OUT,{recursive:true});
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};
const leakWords={1:["Hello","Hi","Good morning","Good afternoon"],2:["ten","eleven","twelve","twenty"],3:["doll","ball","train","plane"],4:["horse","duck","cow","pig"],5:["hands","head","legs","arms"],6:["pear","apple","banana","orange"]};

async function runCase(browser,m,device){
  const mm=String(m).padStart(2,"0");
  const viewport=device==="mobile"?{width:390,height:844}:{width:1366,height:768};
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
  try{
    const response=await page.goto(`${BASE}/content/english/year-2/module-${mm}/homolog-v23-runtime.html`,{waitUntil:"domcontentloaded",timeout:30000});
    check(response?.ok(),`M${mm} ${device}: HTTP ${response?.status()}`);
    const entry=await page.evaluate(()=>window.DUDUQ_HOMOLOG_ENTRY||null);
    check(entry?.sourceVersion==="2.3"&&entry?.module===m,`M${mm} ${device}: entrypoint v2.3 ausente`);
    const start=page.getByRole("button",{name:/INICIAR MISSÃO/i});
    await start.waitFor({state:"visible",timeout:15000});
    await start.click();
    await page.waitForFunction(()=>Boolean(document.querySelector("iframe"))||/Erro:|Erro ao carregar/i.test(document.getElementById("root")?.textContent||""),undefined,{timeout:20000});
    const rootText=await page.locator("#root").innerText().catch(()=>"");
    check(!/Erro:|Erro ao carregar/i.test(rootText),`M${mm} ${device}: ${rootText.slice(0,240)}`);
    const iframe=page.locator("iframe").first();
    await iframe.waitFor({state:"visible",timeout:12000});
    const handle=await iframe.elementHandle();
    const frame=await handle?.contentFrame();
    check(frame,`M${mm} ${device}: iframe sem contentFrame`);
    await frame.waitForFunction(()=>{
      const txt=(document.body?.innerText||"").trim();
      const interactive=document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item,.duduq-dd-item').length;
      return /Falha ao preparar|Modo editorial|\bErro\b/i.test(txt)||(!/^Preparando\b/i.test(txt)&&interactive>0);
    },undefined,{timeout:15000});
    const txt=await frame.locator("body").innerText().catch(()=>"");
    check(!/Falha ao preparar|Modo editorial|\bErro\b/i.test(txt),`M${mm} ${device}: runtime ${txt.slice(0,240)}`);
    const lower=txt.toLowerCase();
    for(const word of leakWords[m])check(!lower.includes(word.toLowerCase()),`M${mm} ${device}: grafia inglesa pré-resposta visível: ${word}`);
    const outerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    const innerOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2).catch(()=>false);
    check(!outerOverflow&&!innerOverflow,`M${mm} ${device}: overflow horizontal`);
    check(errors.length===0,`M${mm} ${device}: console/page errors: ${errors.slice(0,3).join(" | ")}`);
    await page.screenshot({path:path.join(OUT,`M${mm}-${device}.png`),fullPage:false});
    console.log(`PASS V23 M${mm} ${device}`);
    return {module:mm,device,status:"PASS"};
  }finally{await page.close()}
}

const browser=await chromium.launch({headless:true});
const results=[];const failures=[];
try{
  for(const device of ["desktop","mobile"])for(let m=1;m<=6;m++){
    try{results.push(await runCase(browser,m,device))}
    catch(e){failures.push(`M${String(m).padStart(2,"0")} ${device}: ${e.message}`);console.error(failures.at(-1))}
  }
}finally{await browser.close()}
fs.writeFileSync(path.join(OUT,"report-normal.json"),JSON.stringify({results,failures},null,2));
if(failures.length){console.error("DUDUQ YEAR2 v2.3 NORMAL BROWSER QA: FAIL");process.exit(1)}
console.log("DUDUQ YEAR2 v2.3 NORMAL BROWSER QA: PASS (12/12)");
