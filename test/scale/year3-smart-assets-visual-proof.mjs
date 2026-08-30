import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const OUT=process.env.OUT_DIR||"test-results/year3-smart-assets-visual-proof";
function assert(condition,message){if(!condition)throw new Error(message);}
fs.mkdirSync(OUT,{recursive:true});

const expectedObjectCompositions=new Set([
  "ball","three turtles","3 yellow ducks","7 white cats","2 brown rabbits","big blue pencil",
  "green car","red and blue bus","big truck","nose","eyes","hair","two big hands","two green eyes","brown hair"
]);
const expectedContext=new Set([
  "profile:maya","profile:maya:10","profile:ana:12","profile:sister:8","profile:grandfather:50",
  "duo:leo:mia","duo:maya:leo",
  "calendar:may:12","calendar:may:9","calendar:june:12","calendar:march:12",
  "math:2 + 3 = 5:+","math:5 − 2 = 3:−","math:3 × 2 = 6:×","math:8 ÷ 2 = 4:÷","math:4 + 1 = 5:="
]);

const browser=await chromium.launch({headless:true});
try{
  const report=[];
  for(const viewport of [{name:"desktop",width:1366,height:768},{name:"mobile",width:390,height:844}]){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    await page.goto(`${BASE}/test/scale/year3-smart-assets-visual-board.html`,{waitUntil:"networkidle",timeout:30000});
    await page.waitForFunction(()=>window.__YEAR3_SMART_VISUAL_BOARD__?.results?.length===39,null,{timeout:15000});
    await page.waitForFunction(()=>[...document.images].every(img=>img.complete),null,{timeout:15000});

    const state=await page.evaluate(()=>{
      const board=window.__YEAR3_SMART_VISUAL_BOARD__||{};
      const cards=[...document.querySelectorAll(".qa-card")].map(card=>{
        const img=card.querySelector("img");const rect=card.getBoundingClientRect();const media=card.querySelector(".qa-media")?.getBoundingClientRect();
        return {query:card.dataset.query,status:card.dataset.status,kind:card.dataset.kind,broken:card.classList.contains("broken"),imgNaturalWidth:img?.naturalWidth||0,imgNaturalHeight:img?.naturalHeight||0,cardLeft:rect.left,cardRight:rect.right,cardWidth:rect.width,mediaWidth:media?.width||0,mediaHeight:media?.height||0};
      });
      return {boardVersion:board.version||null,resolverVersion:board.resolverVersion||null,factoryVersion:board.factoryVersion||null,bodyScrollWidth:document.body.scrollWidth,viewportWidth:window.innerWidth,cards};
    });

    assert(state.boardVersion==="2.3.1",`${viewport.name}: painel não é v2.3.1.`);
    assert(state.resolverVersion==="1.1.0",`${viewport.name}: resolver ${state.resolverVersion}.`);
    assert(state.factoryVersion==="1.1.0",`${viewport.name}: factory ${state.factoryVersion}.`);
    assert(state.cards.length===39,`${viewport.name}: esperado 39 cards; recebeu ${state.cards.length}.`);
    assert(state.bodyScrollWidth<=state.viewportWidth+1,`${viewport.name}: overflow horizontal body ${state.bodyScrollWidth}>${state.viewportWidth}.`);

    for(const card of state.cards){
      assert(card.status!=="asset-gap",`${viewport.name} ${card.query}: asset-gap.`);
      assert(!card.broken,`${viewport.name} ${card.query}: imagem quebrada.`);
      assert(card.imgNaturalWidth>0&&card.imgNaturalHeight>0,`${viewport.name} ${card.query}: imagem sem dimensões naturais.`);
      assert(card.cardLeft>=-1&&card.cardRight<=state.viewportWidth+1,`${viewport.name} ${card.query}: card fora do viewport.`);
      assert(card.cardWidth>=150,`${viewport.name} ${card.query}: card estreito demais (${card.cardWidth}).`);
      assert(card.mediaWidth>=140&&card.mediaHeight>=85,`${viewport.name} ${card.query}: mídia pequena demais.`);
      if(expectedObjectCompositions.has(card.query)) assert(card.kind==="object-composition",`${viewport.name} ${card.query}: esperado object-composition; recebeu ${card.kind}.`);
      if(expectedContext.has(card.query)) assert(card.status==="semantic-context",`${viewport.name} ${card.query}: esperado semantic-context; recebeu ${card.status}.`);
    }

    const screenshot=path.join(OUT,`year3-v23-multimodal-${viewport.name}.png`);
    await page.screenshot({path:screenshot,fullPage:true});
    report.push({viewport:viewport.name,width:viewport.width,height:viewport.height,cards:state.cards.length,screenshot});
    await page.close();
  }
  fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify({status:"PASS",source:"v2.3",resolverVersion:"1.1.0",factoryVersion:"1.1.0",report},null,2));
  console.log(JSON.stringify({status:"PASS",report},null,2));
  console.log("PASS — Year3 v2.3 visual proof: 39 high-risk multimodal visuals render sem gaps, quebra ou overflow em desktop/mobile.");
}finally{await browser.close();}
