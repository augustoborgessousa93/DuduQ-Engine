import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const URL=`${BASE}/content/english/year-3/module-01/index.html`;
const viewports=[
  {name:"desktop-1366x768",width:1366,height:768},
  {name:"desktop-browser-1366x640",width:1366,height:640},
  {name:"tablet-768x1024",width:768,height:1024},
  {name:"mobile-390x844",width:390,height:844}
];
const representatives=[
  {id:"EN3-M1-03",mechanic:"smart-sentence",expectCanonicalImage:true},
  {id:"EN3-M1-05",mechanic:"word-slash"},
  {id:"EN3-M1-06",mechanic:"bubble-pop"},
  {id:"EN3-M1-09",mechanic:"target-shooter",expectCanonicalImage:true},
  {id:"EN3-M1-12",mechanic:"drag-drop"}
];
const expectedDistribution={"smart-sentence":9,"word-slash":1,"bubble-pop":2,"target-shooter":2,"drag-drop":1};

function assert(ok,message){if(!ok)throw new Error(message)}
function stable(value){return JSON.stringify(value,Object.keys(value).sort())}

async function waitEngine(page){
  await page.waitForFunction(()=>Boolean(
    window.DUDUQ_ENGINE_READY&&
    window.DuduQ&&
    window.DUDUQ_CONTENT?.english?.year3?.module01
  ),null,{timeout:45_000});
}

async function moduleSnapshot(page){
  return page.evaluate(()=>{
    const module=window.DUDUQ_CONTENT.english.year3.module01;
    const distribution=module.activities.reduce((out,a)=>{out[a.mechanic]=(out[a.mechanic]||0)+1;return out},{});
    const mechanics=window.DuduQ.listMechanics().reduce((out,m)=>{out[m.id]=m.version;return out},{});
    const requiredImages=[];
    for(const activity of module.activities){
      const q=activity.questions[0];
      const smart=q?.metadata?.smartSentence?.image;
      if(smart?.src)requiredImages.push({id:q.id,kind:"smart",src:smart.src,key:smart.assetKey||""});
      const targets=q?.metadata?.targetShooter?.items||[];
      for(const item of targets){if(item.imageUrl||item.imageSrc)requiredImages.push({id:q.id,kind:"target",src:item.imageUrl||item.imageSrc,key:item.imageAssetKey||item.assetKey||""});}
    }
    return {
      version:module.version,
      activities:module.activities.length,
      distribution,
      mechanics,
      requiredImages,
      rootText:(document.getElementById("root")?.innerText||"").trim(),
      manifestRevision:window.DUDUQ_ENGINE_MANIFEST?.revision,
      core:window.DUDUQ_ENGINE_MANIFEST?.core?.release
    };
  });
}

async function mountRepresentative(page,representative){
  await page.evaluate(({id,mechanic})=>{
    const module=window.DUDUQ_CONTENT.english.year3.module01;
    const activity=module.activities.find(a=>a.questions?.[0]?.id===id);
    if(!activity)throw new Error(`representative activity missing: ${id}`);
    if(activity.mechanic!==mechanic)throw new Error(`${id}: expected ${mechanic}, got ${activity.mechanic}`);
    try{window.DuduQIntro?.hide?.({immediate:true,reason:"browser-sentinel"})}catch(_){}
    try{window.DuduQTransition?.hideImmediate?.()}catch(_){}
    window.DuduQ.destroy();
    window.DuduQ.start({
      id:`y3-m01-browser-${id}`,title:`Y3 M01 ${id}`,year:3,subject:"english",module:1,container:"#root",
      steps:[{id:`probe-${id}`,mechanic,payload:{id:`probe-${id}-payload`,title:activity.title,subject:"english",year:3,module:1,questions:activity.questions}}]
    });
  },representative);

  await page.waitForFunction(()=>{
    const rootText=(document.getElementById("root")?.innerText||"").trim();
    if(/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText))return true;
    const frame=document.querySelector("#root iframe");
    if(!frame?.contentDocument?.body)return false;
    const visibleText=(frame.contentDocument.body.innerText||"").trim();
    return frame.contentDocument.readyState==="complete"&&visibleText.length>0;
  },null,{timeout:30_000});
  await page.waitForTimeout(350);

  return page.evaluate(({id,mechanic,expectCanonicalImage})=>{
    const frame=document.querySelector("#root iframe");
    const doc=frame?.contentDocument;
    const visibleText=(doc?.body?.innerText||"").trim();
    const images=[...(doc?.images||[])].map(img=>({src:img.currentSrc||img.src||"",alt:img.alt||"",complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
    const canonicalImages=images.filter(img=>/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ/i.test(img.src));
    const root=document.getElementById("root");
    const rootText=(root?.innerText||"").trim();
    const hostError=/Não foi possível abrir esta etapa|não é compatível com a mecânica|Não foi possível iniciar a mecânica|Erro ao preparar|falha ao preparar/i.test(rootText);
    const innerOverflow=doc?Math.max(0,doc.documentElement.scrollWidth-doc.documentElement.clientWidth,doc.body.scrollWidth-doc.body.clientWidth):0;
    const outerOverflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth,document.body.scrollWidth-document.body.clientWidth);
    return {
      id,mechanic,bodyLength:visibleText.length,
      frameTitle:frame?.title||"",
      innerOverflow,outerOverflow,
      rootWidth:root?.getBoundingClientRect().width||0,
      viewportWidth:document.documentElement.clientWidth,
      rootText,
      hostError,
      errorText:/Erro ao preparar|Erro:|falha ao preparar/i.test(visibleText),
      canonicalImageCount:canonicalImages.length,
      canonicalImagesLoaded:canonicalImages.filter(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0).length,
      expectCanonicalImage:Boolean(expectCanonicalImage)
    };
  },representative);
}

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
    const page=await context.newPage();
    const pageErrors=[];
    const consoleErrors=[];
    page.on("pageerror",error=>pageErrors.push(String(error?.stack||error?.message||error)));
    page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});
    const response=await page.goto(`${URL}?trackB=${viewport.name}&v=1`,{waitUntil:"domcontentloaded",timeout:45_000});
    assert(response?.ok(),`${viewport.name}: HTTP ${response?.status()}`);
    await waitEngine(page);
    const snapshot=await moduleSnapshot(page);
    assert(snapshot.version==="3.0.0-track-b-m01-sentinel",`${viewport.name}: version ${snapshot.version}`);
    assert(snapshot.activities===15,`${viewport.name}: activities ${snapshot.activities}/15`);
    assert(stable(snapshot.distribution)===stable(expectedDistribution),`${viewport.name}: distribution ${JSON.stringify(snapshot.distribution)}`);
    assert(snapshot.manifestRevision===150,`${viewport.name}: Canary R${snapshot.manifestRevision}`);
    assert(snapshot.core==="1.0.12",`${viewport.name}: Core ${snapshot.core}`);
    for(const [mechanic,version] of Object.entries({"smart-sentence":"4.0.20","word-slash":"1.0.17","bubble-pop":"1.2.13","target-shooter":"1.0.22","drag-drop":"2.0.26"})){
      assert(snapshot.mechanics[mechanic]===version,`${viewport.name}: ${mechanic} registered ${snapshot.mechanics[mechanic]||"MISSING"}, expected ${version}`);
    }
    assert(snapshot.requiredImages.length===6,`${viewport.name}: canonical runtime references ${snapshot.requiredImages.length}/6`);
    assert(snapshot.requiredImages.every(entry=>entry.src&&entry.key),`${viewport.name}: canonical runtime reference missing url/key`);
    assert(!/^Erro:/i.test(snapshot.rootText),`${viewport.name}: root error ${snapshot.rootText}`);

    for(const representative of representatives){
      pageErrors.length=0;
      consoleErrors.length=0;
      const result=await mountRepresentative(page,representative);
      console.log(`MOUNT ${viewport.name}/${representative.id}/${representative.mechanic} frame=${result.frameTitle||"NONE"} body=${result.bodyLength} hostError=${result.hostError}`);
      if(consoleErrors.length)console.log(`CONSOLE_ERROR ${viewport.name}/${representative.id}: ${consoleErrors.join(" || ")}`);
      if(pageErrors.length)console.log(`PAGEERROR ${viewport.name}/${representative.id}: ${pageErrors.join(" || ")}`);
      assert(!result.hostError,`${viewport.name}/${representative.id}: host error ${result.rootText}; console=${consoleErrors.join(" || ")}; pageerror=${pageErrors.join(" || ")}`);
      assert(!result.errorText,`${viewport.name}/${representative.id}: mechanic error text ${result.rootText}; console=${consoleErrors.join(" || ")}`);
      assert(result.bodyLength>0,`${viewport.name}/${representative.id}: empty iframe; root=${result.rootText}; console=${consoleErrors.join(" || ")}`);
      assert(result.outerOverflow<=2,`${viewport.name}/${representative.id}: outer overflow ${result.outerOverflow}px`);
      assert(result.innerOverflow<=2,`${viewport.name}/${representative.id}: inner overflow ${result.innerOverflow}px`);
      if(representative.expectCanonicalImage){
        if(representative.mechanic==="target-shooter"){
          await page.waitForFunction(()=>{
            const doc=document.querySelector("#root iframe")?.contentDocument;
            return [...(doc?.images||[])].some(img=>/raw\.githubusercontent\.com\/augustoborgessousa93\/Assets-DuduQ/i.test(img.currentSrc||img.src||"")&&img.complete&&img.naturalWidth>0);
          },null,{timeout:8_000});
        }else{
          assert(result.canonicalImageCount>0,`${viewport.name}/${representative.id}: canonical image not rendered`);
          assert(result.canonicalImagesLoaded>0,`${viewport.name}/${representative.id}: canonical image did not load`);
        }
      }
      assert(pageErrors.length===0,`${viewport.name}/${representative.id}: pageerror ${pageErrors.join(" | ")}`);
    }
    console.log(`PASS ${viewport.name} — M01 frozen smoke; 15/15 content; mechanics 5/5 mounted; canonical refs 6/6; overflow=0`);
    await context.close();
  }
  console.log("Y3_M01_BROWSER_SENTINEL = PASS — 4/4 viewports — frozen smoke under R150");
}finally{
  await browser.close();
}
