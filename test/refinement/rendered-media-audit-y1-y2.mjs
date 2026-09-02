import { chromium } from "playwright";
const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const assert=(c,m)=>{if(!c)throw new Error(m)};
const findings=[];const modules=[];
const add=(type,year,module,step,detail)=>findings.push({type,year,module,step,detail});

async function currentRenderFrame(page){
  await page.waitForFunction(()=>{
    const s=window.DuduQ?.getSession?.();
    if(s?.completed)return true;
    if(s?.transitioning||window.DuduQTransition?.getState?.()!=="idle")return false;
    return Boolean(document.querySelector('iframe[srcdoc]'));
  },null,{timeout:2500}).catch(()=>{});
  const s=await page.evaluate(()=>window.DuduQ?.getSession?.());
  if(s?.completed)return {frame:null,reason:"COMPLETED"};
  const handle=await page.locator('iframe[srcdoc]').last().elementHandle().catch(()=>null);
  if(!handle)return {frame:null,reason:"N/A_NO_IFRAME"};
  const frame=await handle.contentFrame().catch(()=>null);
  return frame?{frame,reason:null}:{frame:null,reason:"N/A_NO_CONTENT_FRAME"};
}

const browser=await chromium.launch({headless:true});
try{
  for(let year=1;year<=2;year++)for(let module=1;module<=6;module++){
    const page=await browser.newPage({viewport:{width:1366,height:768}});const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${year}/`))critical404.push(u)}});
    try{
      const mm=String(module).padStart(2,"0"),r=await page.goto(`${BASE}/content/english/year-${year}/module-${mm}/?qa=rendered-media-audit-v2`,{waitUntil:"domcontentloaded",timeout:35000});assert(r?.ok(),`Y${year} M${mm}: HTTP ${r?.status()}`);await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const start=page.locator(".duduq-intro-start-button");await start.waitFor({state:"visible",timeout:30000});await start.click({force:true});
      await page.waitForFunction(()=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&window.DuduQTransition?.getState?.()==="idle")},null,{timeout:35000});
      const initial=await page.evaluate(()=>window.DuduQ.getSession()),total=Number(initial?.totalSteps||0);assert(total>0,`Y${year} M${mm}: sem steps`);const seen=[];const deadline=Date.now()+70000;let guard=0;
      while(Date.now()<deadline&&guard++<total+2){
        const s=await page.evaluate(()=>window.DuduQ.getSession());if(s?.completed)break;
        const resolved=await currentRenderFrame(page);
        if(resolved.frame){
          const frame=resolved.frame;await frame.waitForLoadState("domcontentloaded").catch(()=>{});await page.waitForTimeout(100);
          const media=await frame.evaluate(()=>{
            const imgs=[...document.images].map(img=>({src:img.currentSrc||img.src||"",alt:img.alt||"",visible:Boolean(img.offsetWidth||img.offsetHeight||img.getClientRects().length),naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
            const styled=[...document.querySelectorAll("*")].map(el=>getComputedStyle(el).backgroundImage).filter(v=>v&&v!=="none"&&/data:image/i.test(v));
            return {imgs,styledDataImages:styled.length};
          });
          for(const im of media.imgs.filter(x=>x.visible)){
            if(/^data:image/i.test(im.src))add("renderedDataImage",year,module,s.stepIndex,{src:im.src.slice(0,80),alt:im.alt,naturalWidth:im.naturalWidth,naturalHeight:im.naturalHeight});
            if(/^data:image\/svg\+xml/i.test(im.src))add("renderedProceduralSvg",year,module,s.stepIndex,{alt:im.alt});
            if(/^https?:\/\/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ\/main\//i.test(im.src))add("renderedUnpinnedAsset",year,module,s.stepIndex,{src:im.src,alt:im.alt});
            if(im.naturalWidth===0||im.naturalHeight===0)add("renderedBrokenImage",year,module,s.stepIndex,{src:im.src.slice(0,120),alt:im.alt});
            if(!String(im.alt||"").trim())add("renderedMissingAlt",year,module,s.stepIndex,{src:im.src.slice(0,120)});
          }
          if(media.styledDataImages)add("runtimeCssDataImage",year,module,s.stepIndex,{count:media.styledDataImages});
          seen.push({step:s.stepIndex,render:"FRAME",images:media.imgs.filter(x=>x.visible).length,styledDataImages:media.styledDataImages});
        }else{
          // Contrato sem iframe observável neste instante é N/A para auditoria visual, não falha de produto.
          seen.push({step:s.stepIndex,render:resolved.reason||"N/A"});
          add("renderN/A",year,module,s.stepIndex,resolved.reason||"N/A");
        }
        const accepted=await page.evaluate(()=>window.DuduQ.next({qa:"rendered-media-audit-v2"}));assert(accepted!==false,`Y${year} M${mm}: next rejeitado ${s.stepIndex}`);
        await page.waitForFunction(prev=>{const s=window.DuduQ?.getSession?.();return Boolean(s&&!s.transitioning&&(s.completed||s.stepIndex!==prev)&&window.DuduQTransition?.getState?.()==="idle")},s.stepIndex,{timeout:12000});
      }
      const end=await page.evaluate(()=>window.DuduQ.getSession());assert(end?.completed,`Y${year} M${mm}: audit não percorreu completion`);modules.push({year,module,totalSteps:total,seen});
      for(const e of pageErrors)add("pageError",year,module,"MODULE",e);for(const u of critical404)add("critical404",year,module,"MODULE",u);
    }finally{await page.close()}
  }
}finally{await browser.close()}
const counts={};for(const f of findings)counts[f.type]=(counts[f.type]||0)+1;console.log(JSON.stringify({status:"AUDIT_COMPLETE",modules:modules.length,counts,findings,modules},null,2));assert(modules.length===12,`módulos ${modules.length}/12`);