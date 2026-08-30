import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const OUT_DIR=path.resolve("test-results/intro-logo-alpha-layout-audit");
const URL=`${BASE}/content/english/year-2/module-01/?qa=intro-logo-alpha-layout-audit`;

function assert(condition,message){if(!condition)throw new Error(message);}

await fs.mkdir(OUT_DIR,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];

async function inspect(name,viewport){
  const page=await browser.newPage({viewport});
  page.setDefaultTimeout(30_000);
  await page.emulateMedia({reducedMotion:"reduce"});
  try{
    await page.goto(URL,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(window.DUDUQ_ENGINE_READY===true&&window.DuduQIntro?.isActive?.()));

    await page.waitForFunction(()=>{
      const root=document.querySelector(".duduq-intro");
      const button=document.querySelector(".duduq-intro-start-button");
      const logo=document.querySelector(".duduq-intro-collection-logo");
      return Boolean(
        root?.classList.contains("is-mission") &&
        root?.classList.contains("is-ready") &&
        window.__DUDUQ_SHARED_INTRO_LAYOUT__?.version==="1.0.0" &&
        logo?.complete && logo.naturalWidth>0 && logo.naturalHeight>0 &&
        button && getComputedStyle(button).visibility!=="hidden"
      );
    },null,{timeout:30_000});

    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

    const state=await page.evaluate(async()=>{
      const root=document.querySelector(".duduq-intro");
      const logo=document.querySelector(".duduq-intro-collection-logo");
      const collection=document.querySelector(".duduq-intro-collection");
      const stage=document.querySelector(".duduq-intro-stage");
      const meta=document.querySelector(".duduq-intro-meta");
      const loading=document.querySelector(".duduq-intro-loading");
      const actions=document.querySelector(".duduq-intro-actions");
      const start=document.querySelector(".duduq-intro-start-button");
      const sharedStyle=document.getElementById("duduq-shared-intro-layout-v1");
      const rect=(node)=>{
        if(!node)return null;
        const r=node.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const logoRect=rect(logo);
      const collectionRect=rect(collection);
      const stageRect=rect(stage);
      const metaRect=rect(meta);
      const loadingRect=rect(loading);
      const actionsRect=rect(actions);
      const startRect=rect(start);
      const logoStyle=logo?getComputedStyle(logo):null;
      const collectionStyle=collection?getComputedStyle(collection):null;

      const sharedRuleDiagnostics=[];
      function walkRules(rules,media="all"){
        for(const rule of Array.from(rules||[])){
          if(rule.type===CSSRule.MEDIA_RULE){
            const query=rule.conditionText||rule.media?.mediaText||"";
            const matches=matchMedia(query).matches;
            sharedRuleDiagnostics.push({kind:"media",query,matches});
            if(matches)walkRules(rule.cssRules,query);
            continue;
          }
          if(rule.type===CSSRule.STYLE_RULE&&/duduq-intro-(?:collection|collection-logo|meta|loading|actions|start-button)/.test(rule.selectorText||"")){
            sharedRuleDiagnostics.push({
              kind:"style",
              media,
              selector:rule.selectorText,
              matchesLogo:Boolean(logo?.matches?.(rule.selectorText)),
              matchesCollection:Boolean(collection?.matches?.(rule.selectorText)),
              height:rule.style.height||"",
              minHeight:rule.style.minHeight||"",
              maxHeight:rule.style.maxHeight||"",
              width:rule.style.width||"",
              priorityHeight:rule.style.getPropertyPriority("height"),
              priorityMinHeight:rule.style.getPropertyPriority("min-height")
            });
          }
        }
      }
      try{walkRules(sharedStyle?.sheet?.cssRules||[]);}catch(error){sharedRuleDiagnostics.push({kind:"error",message:String(error?.message||error)});}

      let alpha=null;
      let alphaError="";
      try{
        const response=await fetch(logo.currentSrc||logo.src,{cache:"no-store"});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        const blob=await response.blob();
        const bitmap=await createImageBitmap(blob);
        const canvas=document.createElement("canvas");
        canvas.width=bitmap.width;
        canvas.height=bitmap.height;
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        ctx.drawImage(bitmap,0,0);
        const pixels=ctx.getImageData(0,0,bitmap.width,bitmap.height).data;
        let minX=bitmap.width,minY=bitmap.height,maxX=-1,maxY=-1,opaque=0;
        for(let y=0;y<bitmap.height;y+=1){
          for(let x=0;x<bitmap.width;x+=1){
            const a=pixels[(y*bitmap.width+x)*4+3];
            if(a<=8)continue;
            opaque+=1;
            if(x<minX)minX=x;if(x>maxX)maxX=x;
            if(y<minY)minY=y;if(y>maxY)maxY=y;
          }
        }
        if(maxX>=minX&&maxY>=minY){
          const bbox={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1};
          const projected=logoRect?{
            left:logoRect.left+(bbox.x/bitmap.width)*logoRect.width,
            top:logoRect.top+(bbox.y/bitmap.height)*logoRect.height,
            width:(bbox.width/bitmap.width)*logoRect.width,
            height:(bbox.height/bitmap.height)*logoRect.height
          }:null;
          alpha={
            sourceWidth:bitmap.width,
            sourceHeight:bitmap.height,
            bbox,
            opaquePixels:opaque,
            bboxWidthRatio:bbox.width/bitmap.width,
            bboxHeightRatio:bbox.height/bitmap.height,
            topTransparentRatio:bbox.y/bitmap.height,
            bottomTransparentRatio:(bitmap.height-(bbox.y+bbox.height))/bitmap.height,
            leftTransparentRatio:bbox.x/bitmap.width,
            rightTransparentRatio:(bitmap.width-(bbox.x+bbox.width))/bitmap.width,
            projected
          };
        }
        bitmap.close?.();
      }catch(error){
        alphaError=String(error?.message||error);
      }

      return {
        viewport:{width:innerWidth,height:innerHeight},
        phase:root?.getAttribute("data-duduq-intro-phase")||"",
        ready:Boolean(root?.classList.contains("is-ready")),
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
        largeMediaMatches:matchMedia("(min-width: 1600px) and (min-height: 900px)").matches,
        mobileMediaMatches:matchMedia("(max-width: 560px)").matches,
        sharedIntro:window.__DUDUQ_SHARED_INTRO_LAYOUT__||null,
        sharedStyle:{present:Boolean(sharedStyle),textLength:sharedStyle?.textContent?.length||0,sheetRules:sharedStyle?.sheet?.cssRules?.length||0},
        sharedRuleDiagnostics,
        src:logo?.currentSrc||logo?.src||"",
        natural:{width:logo?.naturalWidth||0,height:logo?.naturalHeight||0},
        logoRect,collectionRect,stageRect,metaRect,loadingRect,actionsRect,startRect,
        logoComputed:{
          height:logoStyle?.height||null,
          width:logoStyle?.width||null,
          minHeight:logoStyle?.minHeight||null,
          maxHeight:logoStyle?.maxHeight||null,
          minWidth:logoStyle?.minWidth||null,
          maxWidth:logoStyle?.maxWidth||null,
          transform:logoStyle?.transform||null,
          opacity:logoStyle?.opacity||null,
          objectFit:logoStyle?.objectFit||null
        },
        collectionComputed:{
          minHeight:collectionStyle?.minHeight||null,
          maxHeight:collectionStyle?.maxHeight||null,
          height:collectionStyle?.height||null,
          overflow:collectionStyle?.overflow||null,
          marginTop:collectionStyle?.marginTop||null,
          marginBottom:collectionStyle?.marginBottom||null
        },
        alpha,alphaError,
        collectionUnusedBelowLogo:collectionRect&&logoRect?collectionRect.bottom-logoRect.bottom:null,
        stageTopGap:stageRect&&collectionRect?collectionRect.top-stageRect.top:null,
        gapLogoToMeta:logoRect&&metaRect?metaRect.top-logoRect.bottom:null,
        gapMetaToLoading:metaRect&&loadingRect?loadingRect.top-metaRect.bottom:null,
        gapLoadingToActions:loadingRect&&actionsRect?actionsRect.top-loadingRect.bottom:null,
        gapLogoToStart:logoRect&&startRect?startRect.top-logoRect.bottom:null,
        occupiedFromCollectionToActions:collectionRect&&actionsRect?actionsRect.bottom-collectionRect.top:null,
        documentWidth:document.documentElement.scrollWidth,
        documentHeight:document.documentElement.scrollHeight
      };
    });

    // Always print and capture evidence before geometry assertions. A failing
    // viewport must still reveal the exact cascade/media constraints that won.
    console.log(JSON.stringify({name,...state},null,2));
    await page.screenshot({path:path.join(OUT_DIR,`${name}.png`),fullPage:false});

    assert(state.phase==="mission"&&state.ready,`${name}: Intro não estabilizou em mission/ready.`);
    assert(state.reducedMotion,`${name}: auditoria precisa de reduced-motion para geometria determinística.`);
    assert(state.sharedIntro?.version==="1.0.0",`${name}: camada compartilhada da Intro não carregou.`);
    assert(state.sharedStyle.present&&state.sharedStyle.sheetRules>0,`${name}: stylesheet compartilhado da Intro não ficou ativo.`);
    assert(state.logoComputed.transform==="none",`${name}: logo ainda possui transform durante a medição (${state.logoComputed.transform}).`);
    assert(state.natural.width>0&&state.natural.height>0,`${name}: logo oficial não carregou.`);
    assert(state.logoRect?.width>100&&state.logoRect?.height>100,`${name}: elemento da logo está pequeno/invisível.`);
    assert(state.documentWidth<=viewport.width+6,`${name}: Intro criou overflow horizontal (${state.documentWidth} > ${viewport.width}).`);

    if(viewport.width>=1600&&viewport.height>=900){
      assert(state.largeMediaMatches,`${name}: media query fullscreen não casou apesar da viewport ${viewport.width}x${viewport.height}.`);
      assert(state.logoRect.height>=500,`${name}: logo fullscreen continua pequena (${state.logoRect.height.toFixed(1)}px; max-height=${state.logoComputed.maxHeight}; collection=${state.collectionComputed.height}/${state.collectionComputed.maxHeight}).`);
      assert(state.logoRect.height<=620,`${name}: logo fullscreen ficou excessiva (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.occupiedFromCollectionToActions>=800,`${name}: bloco fullscreen ainda subutiliza altura (${state.occupiedFromCollectionToActions.toFixed(1)}px).`);
      assert(state.actionsRect.bottom<=viewport.height-70,`${name}: CTA fullscreen ficou próximo demais da borda inferior (${state.actionsRect.bottom.toFixed(1)}px).`);
      assert(state.stageTopGap>=35,`${name}: bloco fullscreen ficou próximo demais da borda superior (${state.stageTopGap.toFixed(1)}px).`);
    }else if(viewport.width<=560){
      assert(state.mobileMediaMatches,`${name}: media query mobile não casou.`);
      assert(state.logoRect.height>=235,`${name}: logo mobile voltou a ficar pequena (${state.logoRect.height.toFixed(1)}px; max-height=${state.logoComputed.maxHeight}).`);
      assert(state.logoRect.height<=300,`${name}: logo mobile ficou excessiva (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.collectionRect.height>=275,`${name}: coleção mobile continua comprimida (${state.collectionRect.height.toFixed(1)}px).`);
      assert(state.actionsRect.right<=viewport.width+2&&state.actionsRect.left>=-2,`${name}: CTA mobile saiu da viewport.`);
    }else{
      assert(state.logoRect.height>=390&&state.logoRect.height<=410,`${name}: baseline notebook mudou (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.occupiedFromCollectionToActions>=640&&state.occupiedFromCollectionToActions<=665,`${name}: baseline notebook alterou a ocupação vertical (${state.occupiedFromCollectionToActions.toFixed(1)}px).`);
    }

    reports.push({name,viewport,state});
  }finally{
    await page.close();
  }
}

try{
  await inspect("desktop-1366x768",{width:1366,height:768});
  await inspect("fullscreen-1920x1080",{width:1920,height:1080});
  await inspect("mobile-390x844",{width:390,height:844});
  await fs.writeFile(path.join(OUT_DIR,"report.json"),JSON.stringify({status:"PASS",reports},null,2));
  console.log("PASS — Shared Intro layout preserves notebook baseline and improves fullscreen/mobile brand presence.");
}finally{
  await browser.close();
}
