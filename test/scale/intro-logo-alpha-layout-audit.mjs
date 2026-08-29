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
  try{
    await page.goto(URL,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(window.DUDUQ_ENGINE_READY===true&&window.DuduQIntro?.isActive?.()));
    const logo=page.locator(".duduq-intro-collection-logo");
    await logo.waitFor({state:"visible"});
    await page.waitForFunction(()=>{
      const img=document.querySelector(".duduq-intro-collection-logo");
      return Boolean(img?.complete&&img.naturalWidth>0&&img.naturalHeight>0);
    });

    const state=await page.evaluate(async()=>{
      const logo=document.querySelector(".duduq-intro-collection-logo");
      const collection=document.querySelector(".duduq-intro-collection");
      const stage=document.querySelector(".duduq-intro-stage");
      const start=document.querySelector(".duduq-intro-start-button");
      const rect=(node)=>{
        if(!node)return null;
        const r=node.getBoundingClientRect();
        return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
      };
      const logoRect=rect(logo);
      const collectionRect=rect(collection);
      const stageRect=rect(stage);
      const startRect=rect(start);
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
        src:logo?.currentSrc||logo?.src||"",
        natural:{width:logo?.naturalWidth||0,height:logo?.naturalHeight||0},
        logoRect,collectionRect,stageRect,startRect,
        alpha,alphaError,
        collectionUnusedBelowLogo:collectionRect&&logoRect?collectionRect.bottom-logoRect.bottom:null,
        stageTopGap:stageRect&&collectionRect?collectionRect.top-stageRect.top:null,
        gapLogoToStart:logoRect&&startRect?startRect.top-logoRect.bottom:null
      };
    });

    assert(state.natural.width>0&&state.natural.height>0,`${name}: logo oficial não carregou.`);
    assert(state.logoRect?.width>100&&state.logoRect?.height>100,`${name}: elemento da logo está pequeno/invisível.`);
    reports.push({name,viewport,state});
    await page.screenshot({path:path.join(OUT_DIR,`${name}.png`),fullPage:false});
    console.log(JSON.stringify({name,...state},null,2));
  }finally{
    await page.close();
  }
}

try{
  await inspect("desktop-1366x768",{width:1366,height:768});
  await inspect("fullscreen-1920x1080",{width:1920,height:1080});
  await inspect("mobile-390x844",{width:390,height:844});
  await fs.writeFile(path.join(OUT_DIR,"report.json"),JSON.stringify({status:"PASS",reports},null,2));
  console.log("PASS — Intro logo/layout audit captured DOM geometry and PNG alpha bounds.");
}finally{
  await browser.close();
}
