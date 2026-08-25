import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE=(process.env.DUDUQ_QA_BASE||"http://127.0.0.1:4173").replace(/\/$/,"");
const OUT=path.resolve(process.env.DUDUQ_QA_OUT||"artifacts/year2-v23");
fs.mkdirSync(OUT,{recursive:true});
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};

async function waitTransitionClear(page,device){
  await page.waitForFunction(()=>{
    const t=document.querySelector(".duduq-transition");
    if(!t)return true;
    const st=getComputedStyle(t);
    const opacity=Number.parseFloat(st.opacity||"0");
    return st.visibility==="hidden"||opacity<0.05;
  },undefined,{timeout:10000}).catch(()=>{
    throw new Error(`M1-12 ${device}: ponte de transição não liberou a atividade`);
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}

async function run(browser,device){
  const viewport=device==="mobile"?{width:390,height:844}:{width:1366,height:768};
  const page=await browser.newPage({viewport});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  page.on("console",msg=>{if(msg.type()==="error")errors.push(msg.text())});
  try{
    await page.addInitScript(()=>{
      window.__DUDUQ_QA_STEP__={id:null,index:null,mechanic:null};
      window.addEventListener("duduq:step-start",event=>{
        const d=event.detail||{};
        window.__DUDUQ_QA_STEP__={id:d.stepId||null,index:d.stepIndex??null,mechanic:d.mechanicId||null};
      });
    });

    const response=await page.goto(`${BASE}/content/english/year-2/module-01/homolog-v23-m112-runtime.html`,{waitUntil:"domcontentloaded",timeout:30000});
    check(response?.ok(),`M1-12 ${device}: HTTP ${response?.status()}`);

    const qaEntry=await page.evaluate(()=>window.DUDUQ_QA_ENTRY||null);
    check(qaEntry?.qaOnly===true&&qaEntry?.questionId==="EN2-M1-12",`M1-12 ${device}: entrypoint QA incorreto`);

    const start=page.getByRole("button",{name:/INICIAR MISSÃO/i});
    await start.waitFor({state:"visible",timeout:15000});
    await start.click();

    await page.waitForFunction(()=>Boolean(window.__DUDUQ_QA_STEP__?.id),undefined,{timeout:15000});
    const target=await page.evaluate(()=>({event:window.__DUDUQ_QA_STEP__,session:window.DuduQ?.getSession?.()||null}));
    check(target.event?.id==="en2-m1-12-drag-drop-alphabet",`M1-12 ${device}: activity id inesperado ${target.event?.id||"n/a"}`);
    check(target.event?.mechanic==="drag-drop",`M1-12 ${device}: mecânica inesperada ${target.event?.mechanic||"n/a"}`);
    check(target.session?.totalSteps===1,`M1-12 ${device}: QA direto deveria ter 1 etapa, recebeu ${target.session?.totalSteps??"n/a"}`);

    const overlay=page.locator("#duduq-m1-12-first-listen-overlay");
    await overlay.waitFor({state:"visible",timeout:10000});
    const stateBefore=await page.evaluate(()=>document.documentElement.getAttribute("data-duduq-m1-12-first-listen"));
    check(stateBefore==="waiting",`M1-12 ${device}: estado antes da escuta=${stateBefore}`);
    const beforeText=await overlay.innerText();
    check(/OUÇA PRIMEIRO/i.test(beforeText),`M1-12 ${device}: overlay sem comando OUÇA PRIMEIRO`);
    check(!/L\s*[-–.]\s*E\s*[-–.]\s*O/i.test(beforeText),`M1-12 ${device}: sequência L-E-O vazou antes da escuta`);

    const iframe=page.locator("iframe").first();
    await iframe.waitFor({state:"attached",timeout:10000});
    const hidden=await iframe.evaluate(el=>{
      const st=getComputedStyle(el);
      return {hidden:st.visibility==="hidden"||st.opacity==="0"||el.getAttribute("aria-hidden")==="true",marker:el.getAttribute("data-duduq-m1-12-gated-frame"),aria:el.getAttribute("aria-hidden")};
    });
    check(hidden.hidden&&hidden.marker==="true"&&hidden.aria==="true",`M1-12 ${device}: iframe não ficou totalmente bloqueado antes do áudio`);
    await page.screenshot({path:path.join(OUT,`M01-M12-before-${device}.png`),fullPage:false});

    await page.evaluate(()=>{
      const synth=window.speechSynthesis;
      if(!synth)throw new Error("speechSynthesis indisponível no QA");
      const fake=utterance=>setTimeout(()=>{if(typeof utterance.onend==="function")utterance.onend({type:"end"})},100);
      try{Object.defineProperty(synth,"speak",{value:fake,configurable:true})}catch(_){synth.speak=fake}
    });

    await page.getByRole("button",{name:/OUVIR SOLETRAÇÃO/i}).click();
    await page.waitForFunction(()=>document.documentElement.getAttribute("data-duduq-m1-12-first-listen")==="revealed",undefined,{timeout:8000});
    await iframe.waitFor({state:"visible",timeout:5000});

    const afterFrame=await iframe.evaluate(el=>({marker:el.getAttribute("data-duduq-m1-12-gated-frame"),aria:el.getAttribute("aria-hidden"),visibility:getComputedStyle(el).visibility,opacity:getComputedStyle(el).opacity}));
    check(afterFrame.marker===null&&afterFrame.aria===null&&afterFrame.visibility!=="hidden"&&afterFrame.opacity!=="0",`M1-12 ${device}: iframe permaneceu bloqueado depois do áudio`);

    const handle=await iframe.elementHandle();
    const frame=await handle?.contentFrame();
    check(frame,`M1-12 ${device}: frame ausente após reveal`);
    await frame.waitForFunction(()=>document.querySelectorAll(".duduq-dd2-item,.duduq-dd-item").length>=4,undefined,{timeout:10000});
    await waitTransitionClear(page,device);

    const movable=await frame.locator(".duduq-dd2-item,.duduq-dd-item").allInnerTexts();
    const joined=movable.join(" ").toUpperCase();
    for(const letter of ["L","E","O","A"])check(joined.includes(letter),`M1-12 ${device}: letra ${letter} ausente após reveal`);

    const geometry=await frame.evaluate(()=>{
      const rects=nodes=>[...nodes].map(el=>{
        const r=el.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      });
      const targets=rects(document.querySelectorAll(".duduq-dd2-target,.duduq-dd-target"));
      const items=rects(document.querySelectorAll(".duduq-dd2-item,.duduq-dd-item"));
      return {innerWidth:window.innerWidth,innerHeight:window.innerHeight,targets,items};
    });

    check(geometry.targets.length===3,`M1-12 ${device}: esperados 3 destinos, recebeu ${geometry.targets.length}`);
    check(geometry.items.length>=4,`M1-12 ${device}: esperadas 4 letras móveis, recebeu ${geometry.items.length}`);
    const maxTargetBottom=Math.max(...geometry.targets.map(r=>r.bottom));
    const maxItemBottom=Math.max(...geometry.items.slice(0,4).map(r=>r.bottom));
    check(maxTargetBottom<=geometry.innerHeight+2,`M1-12 ${device}: destino saiu do primeiro viewport interno`);
    check(maxItemBottom<=geometry.innerHeight+2,`M1-12 ${device}: letra móvel saiu do primeiro viewport interno`);

    if(device==="mobile"){
      const targetTopSpread=Math.max(...geometry.targets.map(r=>r.top))-Math.min(...geometry.targets.map(r=>r.top));
      check(targetTopSpread<=40,`M1-12 mobile: destinos quebraram de linha (spread=${targetTopSpread.toFixed(1)}px)`);
      const itemTopSpread=Math.max(...geometry.items.slice(0,4).map(r=>r.top))-Math.min(...geometry.items.slice(0,4).map(r=>r.top));
      check(itemTopSpread<=40,`M1-12 mobile: letras não ficaram juntas (spread=${itemTopSpread.toFixed(1)}px)`);
    }

    const outerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    const innerOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2).catch(()=>false);
    check(!outerOverflow&&!innerOverflow,`M1-12 ${device}: overflow horizontal`);
    check(errors.length===0,`M1-12 ${device}: console/page errors: ${errors.slice(0,3).join(" | ")}`);

    await page.screenshot({path:path.join(OUT,`M01-M12-after-${device}.png`),fullPage:false});
    console.log(`PASS V23 M01-M12 ${device}`);
    return {device,status:"PASS",activityId:target.event.id,geometry};
  }finally{
    await page.close();
  }
}

const browser=await chromium.launch({headless:true});
const results=[];const failures=[];
try{
  for(const device of ["desktop","mobile"]){
    try{results.push(await run(browser,device))}
    catch(e){failures.push(`${device}: ${e.message}`);console.error(failures.at(-1))}
  }
}finally{
  await browser.close();
}

fs.writeFileSync(path.join(OUT,"report-m112.json"),JSON.stringify({results,failures},null,2));
if(failures.length){console.error("DUDUQ YEAR2 v2.3 M1-12 QA: FAIL");process.exit(1)}
console.log("DUDUQ YEAR2 v2.3 M1-12 QA: PASS (2/2 + geometry)");
