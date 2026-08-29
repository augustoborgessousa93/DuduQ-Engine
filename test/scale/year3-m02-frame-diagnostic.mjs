import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const browser=await chromium.launch({headless:true});

function snapshot(){
  const frame=document.querySelector("#root iframe");
  const doc=frame?.contentDocument;
  const style=doc?.getElementById("duduq-world-fusion-style");
  const links=doc ? Array.from(doc.querySelectorAll('link[rel="stylesheet"]')).map(link=>({id:link.id||"",href:link.href||"",sheet:Boolean(link.sheet)})) : [];
  let htmlComputed=null;
  let bodyComputed=null;
  try{
    htmlComputed=doc?.documentElement ? {
      backgroundImage:frame.contentWindow.getComputedStyle(doc.documentElement).backgroundImage,
      backgroundColor:frame.contentWindow.getComputedStyle(doc.documentElement).backgroundColor
    }:null;
    bodyComputed=doc?.body ? {
      backgroundImage:frame.contentWindow.getComputedStyle(doc.body).backgroundImage,
      backgroundColor:frame.contentWindow.getComputedStyle(doc.body).backgroundColor
    }:null;
  }catch(_){}
  return {
    framePresent:Boolean(frame),
    frameSrc:frame?.getAttribute("src")||"",
    srcdocLength:(frame?.getAttribute("srcdoc")||"").length,
    documentUrl:doc?.URL||"",
    readyState:doc?.readyState||"",
    htmlLength:doc?.documentElement?.outerHTML?.length||0,
    styleExists:Boolean(style),
    styleHref:style?.href||style?.getAttribute("href")||"",
    styleSheet:Boolean(style?.sheet),
    links,
    htmlClass:doc?.documentElement?.className||"",
    htmlData:doc?.documentElement ? Object.fromEntries(Array.from(doc.documentElement.attributes).filter(a=>a.name.startsWith("data-duduq")).map(a=>[a.name,a.value])) : {},
    dragDropRoot:Boolean(doc?.querySelector(".duduq-dd2-root,.duduq-dd-root,.duduq-udd-root")),
    engineRoot:Boolean(doc?.querySelector(".duduq-engine-root")),
    htmlComputed,
    bodyComputed
  };
}

try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  await page.emulateMedia({reducedMotion:"reduce"});
  const pageErrors=[];
  const requestFailures=[];
  page.on("pageerror",e=>pageErrors.push(String(e.message||e)));
  page.on("requestfailed",req=>{if(req.url().startsWith(BASE))requestFailures.push({url:req.url(),error:req.failure()?.errorText||"unknown"});});

  await page.goto(`${BASE}/content/english/year-3/module-02/`,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:15000});
  await page.locator(".duduq-intro-start-button").waitFor({state:"visible",timeout:15000});
  await page.waitForFunction(()=>{
    const button=document.querySelector(".duduq-intro-start-button");
    return Boolean(button&&!button.disabled&&button.getAttribute("aria-disabled")!=="true");
  },null,{timeout:15000});
  await page.locator(".duduq-intro-start-button").click();
  await page.waitForFunction(()=>Boolean(document.querySelector("#root iframe")),null,{timeout:15000});
  await page.waitForTimeout(1200);

  const before=await page.evaluate(snapshot);
  const APIs=await page.evaluate(()=>({
    worldFusionVersion:window.DuduQWorldFusion?.version||null,
    worldFusionRefresh:typeof window.DuduQWorldFusion?.refresh,
    frameSyncVersion:window.__DUDUQ_SHARED_RUNTIME_FRAME_SYNC__?.version||null,
    frameSyncRefresh:typeof window.__DUDUQ_SHARED_RUNTIME_FRAME_SYNC__?.refresh
  }));

  await page.evaluate(()=>{
    try{window.DuduQWorldFusion?.refresh?.();}catch(_){}
    try{window.__DUDUQ_SHARED_RUNTIME_FRAME_SYNC__?.refresh?.();}catch(_){}
  });
  await page.waitForTimeout(1800);
  const after=await page.evaluate(snapshot);

  console.log(JSON.stringify({APIs,before,after,requestFailures,pageErrors},null,2));
  console.log(after.styleExists&&after.styleSheet?"RECOVERED_BY_MANUAL_REFRESH":"NOT_RECOVERED_BY_MANUAL_REFRESH");
  await page.close();
}finally{
  await browser.close();
}
