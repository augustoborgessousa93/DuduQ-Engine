import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BASE=(process.env.DUDUQ_QA_BASE||"http://127.0.0.1:4173").replace(/\/$/,"");
const OUT=path.resolve(process.env.DUDUQ_QA_OUT||"artifacts/year2-v23");
fs.mkdirSync(OUT,{recursive:true});
const check=(cond,msg)=>{if(!cond)throw new Error(msg)};

async function waitHostReady(page,device){
  await page.waitForFunction(()=>{
    const s=window.DuduQ?.getSession?.();
    return Boolean(s)&&s.transitioning===false;
  },undefined,{timeout:10000}).catch(async()=>{
    const s=await page.evaluate(()=>window.DuduQ?.getSession?.()||null);
    throw new Error(`M1-12 ${device}: Host não saiu da transição; sessão=${JSON.stringify(s)}`);
  });
}

async function advanceOne(page,device){
  await waitHostReady(page,device);
  const before=await page.evaluate(()=>({session:window.DuduQ.getSession(),event:window.__DUDUQ_QA_STEP__}));
  const previousIndex=Number(before.session?.stepIndex);
  const accepted=await page.evaluate(()=>window.DuduQ.next({qaAdvance:true}));
  check(accepted!==false,`M1-12 ${device}: Host recusou avanço pronto em ${before.event?.id||"n/a"}`);
  await page.waitForFunction(prev=>{
    const s=window.DuduQ?.getSession?.();
    return Boolean(s)&&(s.stepIndex>prev||s.completed===true);
  },previousIndex,{timeout:10000});
  await waitHostReady(page,device);
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
    const response=await page.goto(`${BASE}/content/english/year-2/module-01/homolog-v23-runtime.html`,{waitUntil:"domcontentloaded",timeout:30000});
    check(response?.ok(),`M1-12 ${device}: HTTP ${response?.status()}`);
    await page.waitForFunction(()=>Boolean(window.DUDUQ_CONTENT?.english?.year2?.module01v23multimodal),undefined,{timeout:15000});
    const expected=await page.evaluate(()=>{
      const mod=window.DUDUQ_CONTENT.english.year2.module01v23multimodal;
      const activity=(mod.activities||[]).find(a=>(a.questions||[]).some(q=>q.id==="EN2-M1-12"));
      return activity?{id:activity.id,mechanic:activity.mechanic,questionIds:activity.questions.map(q=>q.id)}:null;
    });
    check(expected,`M1-12 ${device}: atividade fonte não encontrada`);
    check(expected.id==="en2-m1-12-drag-drop-alphabet",`M1-12 ${device}: id v2.3 inesperado ${expected.id}`);
    check(expected.mechanic==="drag-drop",`M1-12 ${device}: mecânica fonte inesperada ${expected.mechanic}`);
    check(expected.questionIds.length===1&&expected.questionIds[0]==="EN2-M1-12",`M1-12 ${device}: atividade não está isolada`);

    const start=page.getByRole("button",{name:/INICIAR MISSÃO/i});
    await start.waitFor({state:"visible",timeout:15000});
    await start.click();
    await page.waitForFunction(()=>Boolean(window.DuduQ?.next)&&Boolean(window.DuduQ?.getSession?.())&&Boolean(window.__DUDUQ_QA_STEP__?.id),undefined,{timeout:15000});

    for(let guard=0;guard<20;guard++){
      const state=await page.evaluate(()=>({event:window.__DUDUQ_QA_STEP__,session:window.DuduQ.getSession()}));
      if(state.event?.id===expected.id)break;
      check(state.session?.completed!==true,`M1-12 ${device}: módulo terminou antes da etapa dedicada`);
      await advanceOne(page,device);
    }

    const target=await page.evaluate(()=>({event:window.__DUDUQ_QA_STEP__,session:window.DuduQ.getSession()}));
    check(target.event?.id===expected.id,`M1-12 ${device}: etapa dedicada não alcançada; etapa=${target.event?.id||"n/a"}`);
    check(target.event?.mechanic==="drag-drop",`M1-12 ${device}: evento com mecânica inesperada ${target.event?.mechanic||"n/a"}`);

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
    const movable=await frame.locator(".duduq-dd2-item,.duduq-dd-item").allInnerTexts();
    const joined=movable.join(" ").toUpperCase();
    for(const letter of ["L","E","O","A"])check(joined.includes(letter),`M1-12 ${device}: letra ${letter} ausente após reveal`);
    const targetCount=await frame.locator(".duduq-dd2-target,.duduq-dd-target").count();
    check(targetCount>=3,`M1-12 ${device}: destinos < 3`);
    const outerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2);
    const innerOverflow=await frame.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+2).catch(()=>false);
    check(!outerOverflow&&!innerOverflow,`M1-12 ${device}: overflow horizontal`);
    check(errors.length===0,`M1-12 ${device}: console/page errors: ${errors.slice(0,3).join(" | ")}`);
    await page.screenshot({path:path.join(OUT,`M01-M12-after-${device}.png`),fullPage:false});
    console.log(`PASS V23 M01-M12 ${device}`);
    return {device,status:"PASS",activityId:expected.id};
  }finally{await page.close()}
}

const browser=await chromium.launch({headless:true});
const results=[];const failures=[];
try{
  for(const device of ["desktop","mobile"]){
    try{results.push(await run(browser,device))}
    catch(e){failures.push(`${device}: ${e.message}`);console.error(failures.at(-1))}
  }
}finally{await browser.close()}
fs.writeFileSync(path.join(OUT,"report-m112.json"),JSON.stringify({results,failures},null,2));
if(failures.length){console.error("DUDUQ YEAR2 v2.3 M1-12 QA: FAIL");process.exit(1)}
console.log("DUDUQ YEAR2 v2.3 M1-12 QA: PASS (2/2)");
