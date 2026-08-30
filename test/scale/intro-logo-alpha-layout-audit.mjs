import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const OUT_DIR=path.resolve("test-results/intro-logo-alpha-layout-audit");
const URL=`${BASE}/content/english/year-2/module-01/?qa=intro-layout-gate`;

function assert(condition,message){if(!condition)throw new Error(message);}
function rect(node){
  if(!node)return null;
  const r=node.getBoundingClientRect();
  return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};
}

await fs.mkdir(OUT_DIR,{recursive:true});
const browser=await chromium.launch({headless:true});
const reports=[];

async function inspect(name,viewport){
  const page=await browser.newPage({viewport});
  page.setDefaultTimeout(30_000);
  await page.emulateMedia({reducedMotion:"reduce"});
  try{
    await page.goto(URL,{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>Boolean(
      window.DUDUQ_ENGINE_READY===true &&
      window.DuduQIntro?.isActive?.() &&
      window.__DUDUQ_SHARED_INTRO_LAYOUT__?.version==="1.0.0"
    ));
    await page.waitForFunction(()=>{
      const root=document.querySelector(".duduq-intro");
      const logo=document.querySelector(".duduq-intro-collection-logo");
      const button=document.querySelector(".duduq-intro-start-button");
      return Boolean(
        root?.classList.contains("is-mission") &&
        root?.classList.contains("is-ready") &&
        logo?.complete && logo.naturalWidth>0 && logo.naturalHeight>0 &&
        button && getComputedStyle(button).visibility!=="hidden"
      );
    });
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));

    const state=await page.evaluate(()=>{
      const root=document.querySelector(".duduq-intro");
      const logo=document.querySelector(".duduq-intro-collection-logo");
      const collection=document.querySelector(".duduq-intro-collection");
      const stage=document.querySelector(".duduq-intro-stage");
      const actions=document.querySelector(".duduq-intro-actions");
      const shared=window.__DUDUQ_SHARED_INTRO_LAYOUT__||null;
      const styleId=shared?.styleId||"duduq-shared-intro-layout-style-v1";
      const sharedStyle=document.getElementById(styleId);
      const r=(node)=>{
        if(!node)return null;
        const value=node.getBoundingClientRect();
        return {left:value.left,top:value.top,right:value.right,bottom:value.bottom,width:value.width,height:value.height};
      };
      const logoStyle=logo?getComputedStyle(logo):null;
      const collectionStyle=collection?getComputedStyle(collection):null;
      return {
        viewport:{width:innerWidth,height:innerHeight},
        phase:root?.getAttribute("data-duduq-intro-phase")||"",
        ready:Boolean(root?.classList.contains("is-ready")),
        reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
        largeMediaMatches:matchMedia("(min-width: 1600px) and (min-height: 900px)").matches,
        mobileMediaMatches:matchMedia("(max-width: 560px)").matches,
        sharedIntro:shared,
        sharedStyle:{
          id:styleId,
          present:Boolean(sharedStyle),
          tagName:sharedStyle?.tagName||null,
          textLength:sharedStyle?.textContent?.length||0,
          sheetRules:sharedStyle?.sheet?.cssRules?.length||0
        },
        natural:{width:logo?.naturalWidth||0,height:logo?.naturalHeight||0},
        logoRect:r(logo),
        collectionRect:r(collection),
        stageRect:r(stage),
        actionsRect:r(actions),
        logoComputed:{
          height:logoStyle?.height||null,
          width:logoStyle?.width||null,
          minHeight:logoStyle?.minHeight||null,
          maxHeight:logoStyle?.maxHeight||null,
          maxWidth:logoStyle?.maxWidth||null,
          transform:logoStyle?.transform||null
        },
        collectionComputed:{
          minHeight:collectionStyle?.minHeight||null,
          maxHeight:collectionStyle?.maxHeight||null,
          height:collectionStyle?.height||null,
          marginBottom:collectionStyle?.marginBottom||null
        },
        occupiedFromCollectionToActions:collection&&actions?r(actions).bottom-r(collection).top:null,
        stageTopGap:stage&&collection?r(collection).top-r(stage).top:null,
        documentWidth:document.documentElement.scrollWidth,
        documentHeight:document.documentElement.scrollHeight
      };
    });

    console.log(JSON.stringify({name,...state},null,2));
    await page.screenshot({path:path.join(OUT_DIR,`${name}.png`),fullPage:false});

    assert(state.phase==="mission"&&state.ready,`${name}: Intro não estabilizou em mission/ready.`);
    assert(state.reducedMotion,`${name}: reduced-motion necessário para geometria determinística.`);
    assert(state.sharedIntro?.version==="1.0.0",`${name}: camada compartilhada da Intro não carregou.`);
    assert(state.sharedIntro?.styleId==="duduq-shared-intro-layout-style-v1",`${name}: styleId compartilhado inesperado.`);
    assert(state.sharedStyle.present&&state.sharedStyle.tagName==="STYLE",`${name}: stylesheet compartilhado não foi criado.`);
    assert(state.sharedStyle.textLength>500&&state.sharedStyle.sheetRules>=3,`${name}: stylesheet compartilhado está vazio/inválido.`);
    assert(state.logoComputed.transform==="none",`${name}: logo ainda está em animação (${state.logoComputed.transform}).`);
    assert(state.natural.width>0&&state.natural.height>0,`${name}: logo oficial não carregou.`);
    assert(state.documentWidth<=viewport.width+6,`${name}: overflow horizontal ${state.documentWidth} > ${viewport.width}.`);

    if(viewport.width>=1600&&viewport.height>=900){
      assert(state.largeMediaMatches,`${name}: media query fullscreen não casou.`);
      assert(state.logoRect.height>=500&&state.logoRect.height<=620,`${name}: logo fullscreen fora da faixa (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.collectionRect.height>=500,`${name}: coleção fullscreen continua pequena (${state.collectionRect.height.toFixed(1)}px).`);
      assert(state.occupiedFromCollectionToActions>=800,`${name}: bloco fullscreen subutiliza altura (${state.occupiedFromCollectionToActions.toFixed(1)}px).`);
      assert(state.actionsRect.bottom<=viewport.height-60,`${name}: CTA fullscreen muito próximo da borda inferior.`);
      assert(state.stageTopGap>=25,`${name}: bloco fullscreen muito próximo da borda superior.`);
    }else if(viewport.width<=560){
      assert(state.mobileMediaMatches,`${name}: media query mobile não casou.`);
      assert(state.logoRect.height>=235&&state.logoRect.height<=300,`${name}: logo mobile fora da faixa (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.collectionRect.height>=275,`${name}: coleção mobile continua comprimida (${state.collectionRect.height.toFixed(1)}px).`);
      assert(state.actionsRect.left>=-2&&state.actionsRect.right<=viewport.width+2,`${name}: CTA mobile saiu da viewport.`);
    }else{
      assert(state.logoRect.height>=390&&state.logoRect.height<=410,`${name}: baseline notebook mudou (${state.logoRect.height.toFixed(1)}px).`);
      assert(state.occupiedFromCollectionToActions>=640&&state.occupiedFromCollectionToActions<=665,`${name}: baseline notebook mudou (${state.occupiedFromCollectionToActions.toFixed(1)}px).`);
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
  console.log("PASS — Intro shared stylesheet is active; notebook baseline preserved; fullscreen/mobile geometry improved.");
}finally{
  await browser.close();
}
