import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const OUT=path.resolve("test-results/systemic/year1-m03-post-merge-sanity");
const EXPECTED=[
 ["EN1-M3-01","B","drag-drop"],["EN1-M3-02","C","drag-drop"],["EN1-M3-03","A","drag-drop"],
 ["EN1-M3-04","B","drag-drop"],["EN1-M3-05","C","drag-drop"],["EN1-M3-06","A","drag-drop"],
 ["EN1-M3-07","B","drag-drop"],["EN1-M3-08","C","drag-drop"],["EN1-M3-09","B","target-shooter"],
 ["EN1-M3-10","B","drag-drop"],["EN1-M3-11","A","drag-drop"],["EN1-M3-12","A","drag-drop"]
];
function assert(ok,msg){if(!ok)throw new Error(msg)}
async function waitStep(page,step,timeout=25000){
 await page.waitForFunction(expected=>{const s=window.DuduQ?.getSession?.(),f=document.querySelector("iframe"),d=f?.contentDocument;return Boolean(s&&s.stepIndex===expected&&!s.transitioning&&!s.completed&&window.DuduQTransition?.getState?.()==="idle"&&f&&(f.srcdoc||f.getAttribute("src"))&&d?.documentElement&&d?.body&&(d.querySelector(".duduq-dd2-root")||d.querySelector(".duduq-ts-root")))},step,{timeout});
}
async function waitFeedback(page,state,timeout=6000){await page.waitForFunction(expected=>document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-engine-feedback")?.getAttribute("data-state")===expected,state,{timeout})}
async function waitNext(page,previous,total,timeout=25000){await page.waitForFunction(({previous,total})=>{const s=window.DuduQ?.getSession?.();if(!s||s.transitioning)return false;if(s.completed)return previous===total-1&&s.progress?.percent===100&&window.DuduQTransition?.getState?.()==="idle";const f=document.querySelector("iframe"),d=f?.contentDocument;return Boolean(s.stepIndex===previous+1&&window.DuduQTransition?.getState?.()==="idle"&&f&&(f.srcdoc||f.getAttribute("src"))&&d?.documentElement&&d?.body)}, {previous,total},{timeout})}
async function waitDD(page,timeout=12000){await page.waitForFunction(()=>{const d=document.querySelector("iframe")?.contentDocument,items=[...(d?.querySelectorAll(".duduq-dd2-bank-items .duduq-dd2-item")||[])];return Boolean(d?.querySelector(".duduq-dd2-root")&&d?.querySelector(".duduq-dd2-target[data-dd2-target-id]")&&items.length===3&&items.every(x=>!x.disabled))},null,{timeout})}
async function waitTS(page,timeout=12000){await page.waitForFunction(()=>{const d=document.querySelector("iframe")?.contentDocument,t=[...(d?.querySelectorAll(".duduq-ts-target")||[])];return Boolean(d?.querySelector(".duduq-ts-root")&&t.length===3&&t.every(x=>!x.disabled))},null,{timeout})}
async function waitAudioIdle(page){await page.waitForFunction(()=>!document.querySelector("iframe")?.contentDocument?.querySelector(".duduq-dd2-item[data-audio-playing='true']"),null,{timeout:7000})}
async function armAudioLatch(page,itemId){await page.evaluate(id=>{const d=document.querySelector("iframe")?.contentDocument,card=d?.querySelector(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${id}"]`);if(!card)throw new Error(`Card ${id} ausente`);const latch={seen:card.getAttribute("data-audio-playing")==="true",observer:null};const o=new MutationObserver(()=>{if(card.getAttribute("data-audio-playing")==="true")latch.seen=true});o.observe(card,{attributes:true,attributeFilter:["data-audio-playing"]});latch.observer=o;window.__M03_SANITY_AUDIO__=latch},itemId)}
async function finishAudioLatch(page){await page.waitForFunction(()=>window.__M03_SANITY_AUDIO__?.seen===true,null,{timeout:2500});await waitAudioIdle(page);await page.evaluate(()=>{window.__M03_SANITY_AUDIO__?.observer?.disconnect?.();delete window.__M03_SANITY_AUDIO__})}
async function placeDD(page,itemId,{latch=false}={}){await waitDD(page);const frame=page.frameLocator("iframe"),card=frame.locator(`.duduq-dd2-bank-items .duduq-dd2-item[data-dd2-item-id="${itemId}"]`).first();if(latch)await armAudioLatch(page,itemId);await card.click({force:true});if(latch)await finishAudioLatch(page);else await waitAudioIdle(page);await frame.locator(".duduq-dd2-zone").first().click({force:true})}

await fs.rm(OUT,{recursive:true,force:true});await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1366,height:768}});const pageErrors=[],critical404=[];
page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));page.on("response",r=>{if(r.status()!==404)return;const u=r.url();if(/\/engine\//.test(u)||/\/content\/english\/year-1\/module-03\//.test(u)||/asset-catalog\/runtime-index\.js/.test(u))critical404.push(u)});
try{
 const response=await page.goto(`${BASE}/content/english/year-1/module-03/?qa=post-merge-sanity`,{waitUntil:"domcontentloaded",timeout:35000});assert(response?.ok(),`Public entry HTTP ${response?.status()}`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
 const boot=await page.evaluate(()=>{const m=window.DUDUQ_ENGINE_MANIFEST||{},mod=window.DUDUQ_CONTENT?.english?.year1?.module03;return{module:Boolean(mod),count:(mod?.activities||[]).length,revision:m.revision,core:m.core?.release,dd:m.mechanics?.["drag-drop"]?.release,ts:m.mechanics?.["target-shooter"]?.release,required:[...(window.DUDUQ_GAME_CONFIG?.requiredMechanics||[])],registered:(window.DuduQ?.listMechanics?.()||[]).map(x=>`${x.id}@${x.version}`),bridge:window.__DUDUQ_ROUTER_DIRECT_PAYLOAD_COMPAT_V1__||"",helper:window.M03VisualComposition?.version||""}});
 assert(boot.module&&boot.count===12,"M03 merged content missing/incomplete");assert(boot.revision===146&&boot.core==="1.0.11"&&boot.dd==="2.0.24"&&boot.ts==="1.0.21",`Runtime drift ${JSON.stringify(boot)}`);assert(boot.required.join(",")==="drag-drop,target-shooter","requiredMechanics drift");assert(boot.registered.includes("drag-drop@2.0.24")&&boot.registered.includes("target-shooter@1.0.21"),`Mechanics not registered ${boot.registered.join(",")}`);assert(boot.bridge==="1.0.0"&&boot.helper.startsWith("1.0."),"M03 bootstrap/helper missing");
 const intro=page.locator(".duduq-intro-start-button");await intro.waitFor({state:"visible",timeout:30000});await intro.click();await waitStep(page,0,35000);const initial=await page.evaluate(()=>window.DuduQ?.getSession?.());assert(initial?.totalSteps===12,"M03 totalSteps != 12");
 let audioObserved=false,ddRetry=false,tsRetry=false,q10ThreeRulers=false;
 for(let step=0;step<EXPECTED.length;step++){
  const [id,answer,mechanic]=EXPECTED[step];await waitStep(page,step);
  if(mechanic==="target-shooter"){
   assert(id==="EN1-M3-09","Unexpected TS step");await waitTS(page);await page.waitForFunction(()=>document.querySelector("iframe")?.contentDocument?.querySelectorAll('.duduq-ts-target[data-m03-swatch="true"]').length===3,null,{timeout:5000});
   const q09=await page.evaluate(()=>{const d=document.querySelector("iframe").contentDocument,c=JSON.parse(d.getElementById("targetShooterConfig").textContent),s=c.stages[0],t=[...d.querySelectorAll('.duduq-ts-target[data-m03-swatch="true"]')];return{id:s.id,audio:s.audioText,arias:t.map(x=>x.getAttribute("aria-label")),labels:[...d.querySelectorAll(".duduq-ts-label")].map(x=>({text:x.textContent,w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height}))}});assert(q09.id===id&&String(q09.audio).toLowerCase()==="purple","Q09 audio/stage drift");assert(q09.arias.some(x=>/orange/i.test(x))&&q09.arias.some(x=>/purple/i.test(x))&&q09.arias.some(x=>/pink/i.test(x)),"Q09 semantic swatches missing");assert(q09.labels.every(x=>["A","B","C"].includes(x.text)&&x.w<=2&&x.h<=2),"Q09 visible color labels/neutral labels drift");
   const frame=page.frameLocator("iframe");await frame.locator('.duduq-ts-target[aria-label*="orange" i]').first().click({force:true});await waitFeedback(page,"retry");const retry=await page.evaluate(()=>window.DuduQ?.getSession?.());assert(retry?.stepIndex===step&&!retry.completed,"Q09 retry advanced");tsRetry=true;await waitTS(page);await frame.locator('.duduq-ts-target[aria-label*="purple" i]').first().click({force:true});await waitFeedback(page,"success");
  }else{
   await waitDD(page);
   if(id==="EN1-M3-01"){
    const wrong=["A","B","C"].find(x=>x!==answer);await placeDD(page,wrong,{latch:true});audioObserved=true;await waitFeedback(page,"retry");const retry=await page.evaluate(()=>window.DuduQ?.getSession?.());assert(retry?.stepIndex===step&&!retry.completed,"Representative DD retry advanced");await waitDD(page);const released=await page.evaluate(()=>document.querySelector("iframe")?.contentDocument?.querySelectorAll(".duduq-dd2-zone .duduq-dd2-item").length===0);assert(released,"Representative DD target not released");ddRetry=true;
   }
   if(id==="EN1-M3-10"){
    await page.waitForFunction(()=>document.querySelector("iframe")?.contentDocument?.querySelectorAll('.duduq-dd2-target[data-m03-composed="true"] img.duduq-dd2-target-media').length===3,null,{timeout:5000});const rulers=await page.evaluate(()=>{const d=document.querySelector("iframe").contentDocument,root=d.querySelector('.duduq-dd2-target[data-m03-composed="true"]'),imgs=[...(root?.querySelectorAll("img.duduq-dd2-target-media")||[])];return{count:imgs.length,srcs:imgs.map(x=>x.currentSrc||x.src),complete:imgs.every(x=>x.complete&&x.naturalWidth>0),copies:imgs.filter(x=>x.getAttribute("aria-hidden")==="true"&&x.getAttribute("role")==="presentation").length,aria:root?.getAttribute("aria-label")}});assert(rulers.count===3&&new Set(rulers.srcs).size===1&&rulers.complete&&rulers.copies===2&&/três réguas/i.test(rulers.aria||""),`Q10 rulers invalid ${JSON.stringify(rulers)}`);assert(!/^(data:|blob:)/i.test(rulers.srcs[0])&&!/\.svg(?:\?|$)/i.test(rulers.srcs[0]),"Q10 canonical src invalid");q10ThreeRulers=true;
   }
   await placeDD(page,answer);await waitFeedback(page,"success");
  }
  await waitNext(page,step,EXPECTED.length);
 }
 const final=await page.evaluate(()=>({session:window.DuduQ?.getSession?.(),transition:window.DuduQTransition?.getState?.(),text:String(document.body?.innerText||"").replace(/\s+/g," "),helper:window.M03VisualComposition?.getState?.()}));
 assert(audioObserved&&ddRetry&&tsRetry&&q10ThreeRulers,"Representative sanity coverage incomplete");assert(final.session?.completed===true&&final.session?.progress?.percent===100&&final.transition==="idle","Progress/Completion strong state invalid");assert(/Missão concluída/i.test(final.text),"Completion UI missing");assert(final.helper?.q09Applied>0&&final.helper?.q10Applied>0,"M03 helper did not act");assert(pageErrors.length===0,`pageerror blockers: ${pageErrors.join(" | ")}`);assert(critical404.length===0,`critical 404: ${critical404.join(" | ")}`);
 const report={contract:"DUDUQ_YEAR1_M03_POST_MERGE_SANITY_R146",status:"PASS",merge:"77c90e1e6aa4a3802870ad01bbdd7b9991e18523",publicEntry:"PASS",canary:146,core:"1.0.11",dragDrop:"2.0.24",targetShooter:"1.0.21",intro:"PASS",ddRepresentativeRetrySuccess:"PASS",q09TargetShooterRetrySuccess:"PASS",q10ThreeRulers:"PASS",audio:"PASS",progress:100,completion:"PASS",pageErrors,critical404};await fs.writeFile(path.join(OUT,"report.json"),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
