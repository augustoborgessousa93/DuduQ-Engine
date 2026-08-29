import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of [{name:"desktop",width:1366,height:768},{name:"mobile",width:390,height:844}]){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    const errors=[];
    page.on("pageerror",e=>errors.push(String(e.message||e)));
    page.on("console",msg=>{if(msg.type()==="error") errors.push(msg.text());});
    await page.goto(`${BASE}/content/english/year-3/module-01/`,{waitUntil:"domcontentloaded",timeout:30000});
    await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,{timeout:30000});
    await page.waitForFunction(()=>document.querySelector("#root iframe"),{timeout:30000});
    const state=await page.evaluate(()=>({
      ready:window.DUDUQ_ENGINE_READY===true,
      channel:window.DUDUQ_ENGINE_MANIFEST?.channel,
      revision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      sharedVisual:window.DuduQSmartVisual?.version||null,
      sharedBubble:window.__DUDUQ_SHARED_BUBBLE_RUNTIME_SAFETY__?.version||null,
      moduleItems:window.DUDUQ_CONTENT?.english?.year3?.module01?.activities?.length||0,
      frameSrc:document.querySelector("#root iframe")?.getAttribute("src")||"",
      bodyText:(document.body?.innerText||"").trim().slice(0,500)
    }));
    assert(state.ready,`${viewport.name}: engine não ficou ready.`);
    assert(state.channel==="scale-v1",`${viewport.name}: canal incorreto ${state.channel}.`);
    assert(state.revision===2,`${viewport.name}: revisão scale-v1 inesperada ${state.revision}.`);
    assert(state.sharedVisual==="1.0.0",`${viewport.name}: smart visual compartilhado não carregou.`);
    assert(state.sharedBubble==="1.0.0",`${viewport.name}: Bubble safety compartilhado não carregou.`);
    assert(state.moduleItems===15,`${viewport.name}: M01 não publicou 15 atividades.`);
    assert(state.frameSrc,`${viewport.name}: nenhuma mecânica abriu no iframe.`);
    assert(!/erro ao carregar|tela branca/i.test(state.bodyText),`${viewport.name}: host exibiu erro.`);
    const critical=errors.filter(e=>!/favicon|google fonts|ERR_BLOCKED_BY_CLIENT/i.test(e));
    assert(critical.length===0,`${viewport.name}: erros críticos: ${critical.join(" | ")}`);
    console.log(JSON.stringify({viewport:viewport.name,...state}));
    await page.close();
  }
  console.log("PASS — Year3 M01 abre em desktop/mobile no scale-v1 com shared layers e 15 itens.");
}finally{await browser.close();}
