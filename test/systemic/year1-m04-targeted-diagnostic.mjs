import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4173";
const OUT = path.resolve("test-results/systemic/year1-m04-targeted");
const START = Date.now();
const EXPECTED = [
  {id:"EN1-M4-01", answer:"B", mechanic:"target-shooter", correctTerm:"sit down", wrongTerm:"come in"},
  {id:"EN1-M4-02", answer:"C", mechanic:"target-shooter", correctTerm:"stand up", wrongTerm:"sit down"},
  {id:"EN1-M4-03", answer:"A", mechanic:"target-shooter", correctTerm:"come in", wrongTerm:"sit down"},
  {id:"EN1-M4-04", answer:"B", mechanic:"target-shooter", correctTerm:"quiet", wrongTerm:"sit down"},
  {id:"EN1-M4-05", answer:"C", mechanic:"drag-drop"},
  {id:"EN1-M4-06", answer:"A", mechanic:"drag-drop"},
  {id:"EN1-M4-07", answer:"B", mechanic:"drag-drop"}
];

function elapsed(){ return `${((Date.now()-START)/1000).toFixed(3)}s`; }
function log(q, action, phase, extra="") { console.log(`[M04-DIAG ${elapsed()}] [${q}] ${action} ${phase}${extra ? ` | ${extra}` : ""}`); }
function assert(ok,msg){ if(!ok) throw new Error(msg); }

async function captureState(page, questionId, action, error=null){
  let state = {};
  try {
    state = await page.evaluate(() => {
      const session = window.DuduQ?.getSession?.() || null;
      const transition = window.DuduQTransition?.getState?.() ?? null;
      const frame = document.querySelector("iframe");
      const d = frame?.contentDocument || null;
      const feedback = d?.querySelector(".duduq-engine-feedback") || null;
      const tsTargets = [...(d?.querySelectorAll(".duduq-ts-target") || [])].map((x,i) => ({
        i,
        disabled: Boolean(x.disabled),
        aria: x.getAttribute("aria-label"),
        title: x.getAttribute("title"),
        dataState: x.getAttribute("data-state"),
        imageAlt: x.querySelector("img")?.alt || null
      }));
      const ddItems = [...(d?.querySelectorAll(".duduq-dd2-item") || [])].map((x,i) => ({
        i,
        id: x.getAttribute("data-dd2-item-id"),
        disabled: Boolean(x.disabled),
        aria: x.getAttribute("aria-label"),
        dataState: x.getAttribute("data-state"),
        audioPlaying: x.getAttribute("data-audio-playing")
      }));
      const audioControls = [...(d?.querySelectorAll("button,[role='button']") || [])]
        .filter(x => /áudio|audio|ouvir|som|instruction/i.test(String(x.getAttribute("aria-label") || x.textContent || "")))
        .map((x,i) => ({i,disabled:Boolean(x.disabled),aria:x.getAttribute("aria-label"),playing:x.getAttribute("data-audio-playing")}));
      return {
        session,
        stepIndex: session?.stepIndex ?? null,
        transitioning: session?.transitioning ?? null,
        completed: session?.completed ?? null,
        progress: session?.progress ?? null,
        transition,
        iframeMounted: Boolean(frame),
        iframeSrc: frame?.getAttribute("src") || null,
        iframeSrcdoc: Boolean(frame?.srcdoc),
        iframeReadyState: d?.readyState || null,
        mechanic: d?.querySelector(".duduq-ts-root") ? "target-shooter" : d?.querySelector(".duduq-dd2-root") ? "drag-drop" : "unknown",
        feedbackState: feedback?.getAttribute("data-state") || null,
        feedbackText: feedback?.textContent?.trim() || null,
        tsTargetCount: tsTargets.length,
        tsTargets,
        ddItems,
        ddZoneCount: d?.querySelectorAll(".duduq-dd2-zone,.duduq-dd2-target").length || 0,
        audioControls,
        activeAudioNodes: d?.querySelectorAll("[data-audio-playing='true']").length || 0,
        bodyTextTail: d?.body?.innerText?.slice(-600) || null
      };
    });
  } catch (captureError) {
    state = { captureError: String(captureError?.stack || captureError) };
  }
  const payload = { questionId, action, elapsed: elapsed(), error: error ? String(error?.stack || error) : null, ...state };
  console.log(`[M04-DIAG-STATE] ${JSON.stringify(payload)}`);
  await fs.writeFile(path.join(OUT, `failure-${questionId}-${action.replace(/[^a-z0-9_-]+/gi,"-")}.json`), JSON.stringify(payload,null,2)).catch(()=>{});
  await page.screenshot({path:path.join(OUT,`failure-${questionId}-${action.replace(/[^a-z0-9_-]+/gi,"-")}.png`),fullPage:true,timeout:8000}).catch(()=>{});
  return payload;
}

async function finite(page, q, action, fn){
  log(q, action, "start");
  try {
    const value = await fn();
    log(q, action, "end");
    return value;
  } catch (error) {
    await captureState(page,q,action,error);
    throw new Error(`${q} | ${action} | ${String(error?.message || error)}`);
  }
}

async function waitStep(page,step,timeout=12000){
  await page.waitForFunction(expected => {
    const s=window.DuduQ?.getSession?.(), f=document.querySelector("iframe");
    return Boolean(s && s.stepIndex===expected && s.transitioning===false && s.completed===false && f && (f.srcdoc||f.getAttribute("src")) && f.contentDocument?.body && window.DuduQTransition?.getState?.()==="idle");
  }, step, {timeout});
}
async function waitNext(page,previous,timeout=12000){
  await page.waitForFunction(prev => {
    const s=window.DuduQ?.getSession?.(), f=document.querySelector("iframe");
    return Boolean(s && !s.transitioning && !s.completed && s.stepIndex===prev+1 && f && (f.srcdoc||f.getAttribute("src")) && f.contentDocument?.body && window.DuduQTransition?.getState?.()==="idle");
  }, previous, {timeout});
}
async function waitFeedback(page,state,timeout=7000){
  await page.waitForFunction(expected => document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state")===expected,state,{timeout});
}
async function waitTS(page,timeout=10000){
  await page.waitForFunction(() => {
    const d=document.querySelector("iframe")?.contentDocument;
    const t=[...(d?.querySelectorAll(".duduq-ts-target")||[])];
    const controls=[...(d?.querySelectorAll("button,[role='button']")||[])].filter(b=>/áudio|audio|ouvir|som|instruction/i.test(String(b.getAttribute("aria-label")||b.textContent||"")));
    const busy=controls.some(b=>Boolean(b.disabled)||/reprodução|playing/i.test(String(b.getAttribute("aria-label")||"")));
    return Boolean(d?.querySelector(".duduq-ts-root") && t.length===3 && t.every(x=>!x.disabled) && !busy && !d.querySelector("[data-audio-playing='true']"));
  }, null, {timeout});
}
async function waitDD(page,timeout=10000){
  await page.waitForFunction(() => {
    const d=document.querySelector("iframe")?.contentDocument;
    const items=[...(d?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item")||[])];
    return Boolean(d?.querySelector(".duduq-dd2-root") && d?.querySelector(".duduq-dd2-target[data-dd2-target-id]") && items.length===3 && items.every(x=>!x.disabled) && !d.querySelector(".duduq-dd2-item[data-audio-playing='true']"));
  }, null, {timeout});
}
async function tsIndex(page,term){
  return page.evaluate(term => {
    const d=document.querySelector("iframe")?.contentDocument;
    const targets=[...(d?.querySelectorAll(".duduq-ts-target")||[])];
    return targets.findIndex(t=>{
      const img=t.querySelector("img");
      const hay=[t.getAttribute("aria-label"),t.getAttribute("title"),img?.alt,img?.getAttribute("aria-label")].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(String(term).toLowerCase());
    });
  },term);
}
async function armAudioLatch(page,itemId){
  await page.evaluate(id => {
    const d=document.querySelector("iframe")?.contentDocument;
    const card=d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`);
    if(!card) throw new Error(`Card ${id} ausente para latch de áudio.`);
    const latch={seen:card.getAttribute("data-audio-playing")==="true",observer:null};
    const observer=new MutationObserver(()=>{if(card.getAttribute("data-audio-playing")==="true") latch.seen=true;});
    observer.observe(card,{attributes:true,attributeFilter:["data-audio-playing"]});
    latch.observer=observer;
    window.__DUDUQ_M04_DIAG_AUDIO_LATCH__=latch;
  },itemId);
}
async function finishAudioLatch(page){
  await page.waitForFunction(()=>window.__DUDUQ_M04_DIAG_AUDIO_LATCH__?.seen===true,null,{timeout:3000});
  await page.waitForFunction(()=>!document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"),null,{timeout:7000});
  await page.evaluate(()=>{window.__DUDUQ_M04_DIAG_AUDIO_LATCH__?.observer?.disconnect?.();delete window.__DUDUQ_M04_DIAG_AUDIO_LATCH__;});
}

async function answerTS(page, step, spec){
  const q=spec.id, frame=page.frameLocator("iframe");
  await finite(page,q,"waitTS",()=>waitTS(page));
  const wrongIndex=await finite(page,q,"tsIndex wrong",()=>tsIndex(page,spec.wrongTerm));
  const correctIndex=await finite(page,q,"tsIndex correct",()=>tsIndex(page,spec.correctTerm));
  assert(wrongIndex>=0,`${q}: wrong target not found (${spec.wrongTerm})`);
  assert(correctIndex>=0,`${q}: correct target not found (${spec.correctTerm})`);
  await finite(page,q,"wrong click",()=>frame.locator(".duduq-ts-target").nth(wrongIndex).click({force:true,timeout:8000}));
  await finite(page,q,"wait retry",()=>waitFeedback(page,"retry"));
  const retry=await page.evaluate(()=>window.DuduQ?.getSession?.());
  assert(retry?.stepIndex===step&&!retry.completed,`${q}: wrong click advanced session`);
  await finite(page,q,"second waitTS",()=>waitTS(page));
  const freshIndex=await finite(page,q,"tsIndex correct after retry",()=>tsIndex(page,spec.correctTerm));
  assert(freshIndex>=0,`${q}: correct target missing after retry`);
  await finite(page,q,"correct click",()=>frame.locator(".duduq-ts-target").nth(freshIndex).click({force:true,timeout:8000}));
  await finite(page,q,"wait success",()=>waitFeedback(page,"success"));
}

async function answerDD(page, step, spec){
  const q=spec.id, frame=page.frameLocator("iframe"), wrong=["A","B","C"].find(x=>x!==spec.answer);
  await finite(page,q,"waitDD",()=>waitDD(page));
  await finite(page,q,"arm wrong audio latch",()=>armAudioLatch(page,wrong));
  await finite(page,q,"wrong card click",()=>frame.locator(`.duduq-dd2-item[data-dd2-item-id="${wrong}"]`).first().click({force:true,timeout:8000}));
  await finite(page,q,"wait wrong audio cycle",()=>finishAudioLatch(page));
  await finite(page,q,"wrong target click",()=>frame.locator(".duduq-dd2-zone").first().click({force:true,timeout:8000}));
  await finite(page,q,"wait retry",()=>waitFeedback(page,"retry"));
  const retry=await page.evaluate(()=>window.DuduQ?.getSession?.());
  assert(retry?.stepIndex===step&&!retry.completed,`${q}: wrong DD advanced session`);
  await finite(page,q,"second waitDD",()=>waitDD(page));
  await finite(page,q,"wait target released",()=>page.waitForFunction(()=>[...(document.querySelector("iframe")?.contentDocument?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item")||[])].length===0,null,{timeout:5000}));
  await finite(page,q,"arm correct audio latch",()=>armAudioLatch(page,spec.answer));
  await finite(page,q,"correct card click",()=>frame.locator(`.duduq-dd2-item[data-dd2-item-id="${spec.answer}"]`).first().click({force:true,timeout:8000}));
  await finite(page,q,"wait correct audio cycle",()=>finishAudioLatch(page));
  await finite(page,q,"correct target click",()=>frame.locator(".duduq-dd2-zone").first().click({force:true,timeout:8000}));
  await finite(page,q,"wait success",()=>waitFeedback(page,"success"));
}

await fs.rm(OUT,{recursive:true,force:true});
await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1366,height:768}});
page.setDefaultTimeout(9000);
page.setDefaultNavigationTimeout(35000);
const pageErrors=[],critical404=[];
page.on("pageerror",e=>{pageErrors.push(String(e?.message||e));console.log(`[M04-DIAG PAGEERROR] ${String(e?.message||e)}`);});
page.on("response",r=>{if(r.status()===404&&(/\/engine\//.test(r.url())||/\/content\/english\/year-1\/module-04\//.test(r.url())||/asset-catalog\/runtime-index\.js/.test(r.url())))critical404.push(r.url());});

try {
  await finite(page,"BOOT","goto",async()=>{const r=await page.goto(`${BASE}/content/english/year-1/module-04/?qa=targeted-q01-q07`,{waitUntil:"domcontentloaded",timeout:35000});assert(r?.ok(),`HTTP ${r?.status()}`);});
  await finite(page,"BOOT","engine ready",()=>page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000}));
  const intro=page.locator(".duduq-intro-start-button");
  await finite(page,"BOOT","intro visible",()=>intro.waitFor({state:"visible",timeout:20000}));
  await finite(page,"BOOT","intro click",()=>intro.click({timeout:8000}));
  await finite(page,"EN1-M4-01","waitStep",()=>waitStep(page,0,20000));

  for(let step=0; step<EXPECTED.length; step++){
    const spec=EXPECTED[step], q=spec.id;
    await finite(page,q,"waitStep",()=>waitStep(page,step));
    if(q==="EN1-M4-03"){
      await finite(page,q,"waitTS pre-screenshot",()=>waitTS(page));
      await finite(page,q,"screenshot",()=>page.screenshot({path:path.join(OUT,"desktop-1366x768-q03-come-in.png"),timeout:8000}));
    }
    if(q==="EN1-M4-07"){
      await finite(page,q,"waitDD arrival",()=>waitDD(page));
      const state=await captureState(page,q,"arrival-q07",null);
      await page.screenshot({path:path.join(OUT,"desktop-1366x768-q07-arrival.png"),timeout:8000});
      assert(state.stepIndex===6&&state.mechanic==="drag-drop",`${q}: arrival state invalid`);
      assert(pageErrors.length===0,`pageerrors: ${pageErrors.join(" | ")}`);
      assert(critical404.length===0,`critical404: ${critical404.join(" | ")}`);
      console.log(`[M04-DIAG PASS] reached Q07 in ${elapsed()}`);
      break;
    }
    if(spec.mechanic==="target-shooter") await answerTS(page,step,spec); else await answerDD(page,step,spec);
    await finite(page,q,"waitNext",()=>waitNext(page,step));
  }
  await fs.writeFile(path.join(OUT,"summary.json"),JSON.stringify({status:"PASS",elapsed:elapsed(),pageErrors,critical404},null,2));
} catch(error) {
  await captureState(page,"GLOBAL","uncaught",error);
  await fs.writeFile(path.join(OUT,"summary.json"),JSON.stringify({status:"FAIL",elapsed:elapsed(),error:String(error?.stack||error),pageErrors,critical404},null,2));
  throw error;
} finally {
  await page.close().catch(()=>{});
  await browser.close().catch(()=>{});
}
