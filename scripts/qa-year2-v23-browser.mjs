import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE=(process.env.DUDUQ_QA_BASE||"http://127.0.0.1:4173").replace(/\/$/,"");
const OUT=path.resolve(process.env.DUDUQ_QA_OUT||"artifacts/year2-v23");
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(cond,msg)=>{if(!cond) throw new Error(msg)};

async function waitRuntime(page){
  const start=page.getByRole("button",{name:/INICIAR MISSÃO/i});
  await start.waitFor({state:"visible",timeout:15000});
  await start.click();
  await page.waitForFunction(()=>{
    const root=document.getElementById("root");
    const text=root?.textContent||"";
    return Boolean(document.querySelector("iframe"))||/Erro:/i.test(text)||/Erro ao carregar/i.test(text);
  },undefined,{timeout:20000});
  const rootText=await page.locator("#root").innerText().catch(()=>"");
  check(!/Erro:|Erro ao carregar/i.test(rootText),`Host error: ${rootText.slice(0,240)}`);
  const iframe=page.locator("iframe").first();
  await iframe.waitFor({state:"visible",timeout:12000});
  const handle=await iframe.elementHandle();
  const frame=await handle?.contentFrame();
  check(frame,"iframe sem contentFrame");
  await frame.waitForFunction(()=>{
    const txt=(document.body?.innerText||"").trim();
    const interactive=document.querySelectorAll('button,[role="button"],[draggable="true"],[tabindex],input,select,.duduq-dd2-item,.duduq-dd-item').length;
    return /Falha ao preparar|Modo editorial|\bErro\b/i.test(txt)||(!/^Preparando\b/i.test(txt)&&interactive>0);
  },undefined,{timeout:15000});
  const txt=await frame.locator("body").innerText().catch(()=>"");
  check(!/Falha ao preparar|Modo editorial|\bErro\b/i.test(txt),`Runtime error: ${txt.slice(0,240)}`);
  return {iframe,frame,txt};
}

const leakWords={
  1:["Hello","Hi","Good morning","Good afternoon"],
  2:["ten","eleven","twelve","twenty"],
  3:["doll","ball","train","plane"],
  4:["horse","duck","cow","pig"],
  5:["hands","head","legs","arms"],
  6:["pear","apple","banana","orange"]
};

async function runModule(browser,m,device){
  const mm=String(m).padStart(2,"0");
  const viewport=device==="mobile"?{width:390,height:844}:{width:1366,height:768};
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",msg=>{if(msg.type()==="error") errors.push(msg.text())});
  try{
    const url=`${BASE}/content/english/year-2/module-${mm}/homolog-v23-runtime.html`;
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    check(response?.ok(),`M${mm} ${device}: HTTP ${response?.status()}`);
    const entry=await page.evaluate(()=>window.DUDUQ_HOMOLOG_ENTRY||null);
    check(entry?.sourceVersion==="2.3"&&entry?.module===m,`M${mm} ${device}: entrypoint v2.3 ausente`);
    const {frame,txt}=await waitRuntime(page);
    const lower=txt.toLowerCase();
    for(const word of leakWords[m]){
      check(!lower.includes(word.toLowerCase()),`M${mm} ${device}: grafia inglesa pré-resposta visível: ${word}`);
    }
    const outerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    const innerOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2).catch(()=>false);
    check(!outerOverflow,`M${mm} ${device}: overflow horizontal externo`);
    check(!innerOverflow,`M${mm} ${device}: overflow horizontal interno`);
    check(errors.length===0,`M${mm} ${device}: console/page errors: ${errors.slice(0,3).join(" | ")}`);
    await page.screenshot({path:path.join(OUT,`M${mm}-${device}.png`),fullPage:false});
    console.log(`PASS V23 M${mm} ${device}`);
    return {module:m,device,status:"PASS"};
  }finally{await page.close()}
}

async function runM112(browser,device){
  const viewport=device==="mobile"?{width:390,height:844}:{width:1366,height:768};
  const page=await browser.newPage({viewport});
  try{
    await page.addInitScript(()=>{
      window.__DUDUQ_QA_STEP__={id:null,index:null,mechanic:null};
      window.addEventListener("duduq:step-start",event=>{
        const d=event.detail||{};
        window.__DUDUQ_QA_STEP__={
          id:d.stepId||d.step?.id||d.activity?.id||d.id||null,
          index:d.stepIndex??d.index??null,
          mechanic:d.mechanicId||d.mechanic||d.activity?.mechanic||null
        };
      });
    });
    const url=`${BASE}/content/english/year-2/module-01/homolog-v23-runtime.html`;
    const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
    check(response?.ok(),`M1-12 ${device}: HTTP ${response?.status()}`);
    await page.getByRole("button",{name:/INICIAR MISSÃO/i}).click();
    await page.waitForFunction(()=>Boolean(window.DuduQ?.next),undefined,{timeout:15000});
    let found=false;
    for(let n=0;n<20;n++){
      const state=await page.evaluate(()=>window.__DUDUQ_QA_STEP__);
      if(state?.id==="en2-m1-12-drag-drop"){found=true;break}
      await page.evaluate(()=>window.DuduQ.next({qaAdvance:true}));
      await sleep(320);
    }
    check(found,`M1-12 ${device}: etapa dedicada não alcançada`);
    const overlay=page.locator("#duduq-m1-12-first-listen-overlay");
    await overlay.waitFor({state:"visible",timeout:10000});
    const beforeText=await overlay.innerText();
    check(!/L\s*[-–.]\s*E\s*[-–.]\s*O/i.test(beforeText),`M1-12 ${device}: sequência L-E-O vazou antes da escuta`);
    const iframe=page.locator("iframe").first();
    await iframe.waitFor({state:"attached",timeout:10000});
    const hidden=await iframe.evaluate(el=>{
      const st=getComputedStyle(el);
      return st.visibility==="hidden"||st.opacity==="0"||el.getAttribute("aria-hidden")==="true";
    });
    check(hidden,`M1-12 ${device}: letras não ficaram ocultas antes da primeira escuta`);
    await page.screenshot({path:path.join(OUT,`M01-M12-before-${device}.png`),fullPage:false});

    await page.evaluate(()=>{
      const synth=window.speechSynthesis;
      if(!synth) throw new Error("speechSynthesis indisponível no QA");
      const fake=(utterance)=>setTimeout(()=>{if(typeof utterance.onend==="function") utterance.onend({type:"end"});},100);
      try{Object.defineProperty(synth,"speak",{value:fake,configurable:true});}
      catch(_){synth.speak=fake;}
    });
    await page.getByRole("button",{name:/OUVIR SOLETRAÇÃO/i}).click();
    await page.waitForFunction(()=>document.documentElement.getAttribute("data-duduq-m1-12-first-listen")==="revealed",undefined,{timeout:8000});
    await iframe.waitFor({state:"visible",timeout:5000});
    const handle=await iframe.elementHandle();
    const frame=await handle?.contentFrame();
    check(frame,`M1-12 ${device}: frame ausente após reveal`);
    await frame.waitForFunction(()=>document.querySelectorAll(".duduq-dd2-item,.duduq-dd-item").length>=4,undefined,{timeout:10000});
    const movable=await frame.locator(".duduq-dd2-item,.duduq-dd-item").allInnerTexts();
    const joined=movable.join(" ").toUpperCase();
    for(const letter of ["L","E","O","A"]) check(joined.includes(letter),`M1-12 ${device}: letra ${letter} ausente após reveal`);
    const targetCount=await frame.locator(".duduq-dd2-target,.duduq-dd-target").count();
    check(targetCount>=3,`M1-12 ${device}: destinos < 3`);
    await page.screenshot({path:path.join(OUT,`M01-M12-after-${device}.png`),fullPage:false});
    console.log(`PASS V23 M01-M12 ${device}`);
    return {module:"M01-M12",device,status:"PASS"};
  }finally{await page.close()}
}

const browser=await chromium.launch({headless:true});
const results=[];
const failures=[];
try{
  for(const device of ["desktop","mobile"]){
    for(let m=1;m<=6;m++){
      try{results.push(await runModule(browser,m,device))}
      catch(e){failures.push(`M${String(m).padStart(2,"0")} ${device}: ${e.message}`);console.error(failures.at(-1))}
    }
  }
  for(const device of ["desktop","mobile"]){
    try{results.push(await runM112(browser,device))}
    catch(e){failures.push(`M01-M12 ${device}: ${e.message}`);console.error(failures.at(-1))}
  }
}finally{await browser.close()}
fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify({results,failures},null,2));
if(failures.length){
  console.error("DUDUQ YEAR2 v2.3 BROWSER QA: FAIL");
  process.exit(1);
}
console.log("DUDUQ YEAR2 v2.3 BROWSER QA: PASS (14/14)");
