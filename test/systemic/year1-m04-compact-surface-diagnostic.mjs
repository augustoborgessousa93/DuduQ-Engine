import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const NAME=String(process.env.VIEWPORT_NAME||"").trim();
const VIEWS={"tablet-768x1024":{width:768,height:1024},"mobile-390x844":{width:390,height:844,mobile:true}};
const view=VIEWS[NAME];
if(!view)throw new Error(`Unsupported compact viewport: ${NAME}`);
const OUT=path.resolve(`test-results/systemic/year1-m04-compact-surface/${NAME}`);
await fs.rm(OUT,{recursive:true,force:true});await fs.mkdir(OUT,{recursive:true});

function assert(ok,msg){if(!ok)throw new Error(msg)}
async function measure(page,module){
  return await page.evaluate(module=>{
    const s=window.DuduQ?.getSession?.()||null,f=document.querySelector("iframe"),d=f?.contentDocument||null;
    const rect=x=>x?.getBoundingClientRect?.().toJSON?.()||null;
    const style=x=>{if(!x)return null;const c=getComputedStyle(x);return{display:c.display,position:c.position,width:c.width,height:c.height,minHeight:c.minHeight,maxHeight:c.maxHeight,overflow:c.overflow,overflowY:c.overflowY,flex:c.flex,flexGrow:c.flexGrow,alignSelf:c.alignSelf}};
    const ancestors=[];let n=f;for(let i=0;n&&i<8;i++,n=n.parentElement)ancestors.push({tag:n.tagName,id:n.id||null,class:n.className||null,rect:rect(n),style:style(n)});
    const ts=d?.querySelector(".duduq-ts-root"),dd=d?.querySelector(".duduq-dd2-root"),root=ts||dd;
    const targets=[...(d?.querySelectorAll(".duduq-ts-target,.duduq-dd2-item")||[])].map((x,i)=>({i,tag:x.tagName,class:x.className,disabled:Boolean(x.disabled),aria:x.getAttribute("aria-label"),rect:rect(x)}));
    return{module,session:s,transition:window.DuduQTransition?.getState?.()??null,window:{innerWidth,innerHeight,scrollX,scrollY},document:{clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight},iframe:{rect:rect(f),style:style(f),srcdoc:Boolean(f?.srcdoc),readyState:d?.readyState||null},ancestors,frameDocument:d?{documentElement:{clientWidth:d.documentElement.clientWidth,clientHeight:d.documentElement.clientHeight,scrollWidth:d.documentElement.scrollWidth,scrollHeight:d.documentElement.scrollHeight},body:{rect:rect(d.body),clientWidth:d.body?.clientWidth||0,clientHeight:d.body?.clientHeight||0,scrollWidth:d.body?.scrollWidth||0,scrollHeight:d.body?.scrollHeight||0,style:style(d.body)}}:null,mechanic:ts?"target-shooter":dd?"drag-drop":"unknown",root:root?{rect:rect(root),clientWidth:root.clientWidth,clientHeight:root.clientHeight,scrollWidth:root.scrollWidth,scrollHeight:root.scrollHeight,style:style(root)}:null,targets};
  },module);
}

const browser=await chromium.launch({headless:true});
const results=[];
try{
 for(const module of [1,4]){
  const page=await browser.newPage({viewport:{width:view.width,height:view.height},hasTouch:Boolean(view.mobile),isMobile:Boolean(view.mobile)});if(view.mobile)await page.emulateMedia({reducedMotion:"reduce"});
  const errors=[],critical404=[];page.on("pageerror",e=>errors.push(String(e?.message||e)));page.on("response",r=>{if(r.status()===404&&(/\/engine\//.test(r.url())||new RegExp(`/content/english/year-1/module-0${module}/`).test(r.url())))critical404.push(r.url())});
  try{
   const r=await page.goto(`${BASE}/content/english/year-1/module-0${module}/?qa=compact-ts-surface-${NAME}`,{waitUntil:"domcontentloaded",timeout:35000});assert(r?.ok(),`M0${module}: HTTP ${r?.status()}`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
   const intro=page.locator(".duduq-intro-start-button");await intro.waitFor({state:"visible",timeout:30000});await intro.click({timeout:8000});
   await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.(),f=document.querySelector("iframe"),d=f?.contentDocument,t=[...(d?.querySelectorAll(".duduq-ts-target")||[])];return Boolean(s&&!s.transitioning&&!s.completed&&window.DuduQTransition?.getState?.()==="idle"&&d?.querySelector(".duduq-ts-root")&&t.length>=3&&t.every(x=>!x.disabled))},null,{timeout:25000});
   const m=await measure(page,module);m.pageErrors=errors;m.critical404=critical404;results.push(m);console.log(`COMPACT_TS_SURFACE ${NAME} M0${module} ${JSON.stringify(m)}`);await fs.writeFile(path.join(OUT,`m0${module}.json`),JSON.stringify(m,null,2));await page.screenshot({path:path.join(OUT,`m0${module}.png`),fullPage:true});
  }finally{await page.close()}
 }
 const m1=results.find(x=>x.module===1),m4=results.find(x=>x.module===4);const visible=x=>Boolean(x&&x.top<150&&x.bottom>0);const summary={viewport:NAME,m01Frame:m1?.iframe?.rect||null,m04Frame:m4?.iframe?.rect||null,m01Mechanic:m1?.mechanic,m04Mechanic:m4?.mechanic,m01Targets:m1?.targets?.map(x=>x.rect)||[],m04Targets:m4?.targets?.map(x=>x.rect)||[],m01VisibleTargets:(m1?.targets||[]).filter(x=>visible(x.rect)).length,m04VisibleTargets:(m4?.targets||[]).filter(x=>visible(x.rect)).length,m01FrameDocument:m1?.frameDocument||null,m04FrameDocument:m4?.frameDocument||null,pageErrors:results.flatMap(x=>x.pageErrors||[]),critical404:results.flatMap(x=>x.critical404||[])};console.log(`COMPACT_TS_SURFACE_SUMMARY ${JSON.stringify(summary)}`);await fs.writeFile(path.join(OUT,"summary.json"),JSON.stringify(summary,null,2));
}finally{await browser.close()}
