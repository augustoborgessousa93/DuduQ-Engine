import fs from "node:fs";
import vm from "node:vm";
import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}
function mm(value){return String(value).padStart(2,"0");}

const specs=[];
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const sandbox={
    window:{
      DuduQYear3Factory:{
        publish(spec){specs.push(spec);return spec;}
      }
    },
    console
  };
  sandbox.window.window=sandbox.window;
  vm.createContext(sandbox);
  const source=fs.readFileSync(`content/english/year-3/module-${mm(moduleNumber)}/module-${mm(moduleNumber)}-v1.js`,"utf8");
  vm.runInContext(source,sandbox,{filename:`module-${mm(moduleNumber)}-v1.js`});
}

assert(specs.length===6,`Auditoria esperava 6 módulos; recebeu ${specs.length}.`);
const sourceItems=specs.flatMap(spec=>spec.items.map(item=>({
  module:spec.module,
  id:item.id,
  mechanic:item.mechanic||"bubble-pop",
  query:String(item.visualQuery||item.answer?.text||"").trim(),
  media:String(item.media||""),
  format:String(item.format||""),
  prompt:String(item.prompt||"")
})));
assert(sourceItems.length===90,`Auditoria esperava 90 itens; recebeu ${sourceItems.length}.`);
assert(sourceItems.every(item=>item.query),"Todos os 90 itens precisam ter uma consulta visual auditável.");

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(`${BASE}/content/english/year-3/module-01/`,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:15000});

  const runtime=await page.evaluate(()=>({
    resolverVersion:window.DuduQSmartVisual?.version||null,
    contract:window.DuduQSmartVisual?.contract||null,
    assetsVersion:window.DuduQAssets?.version||null
  }));
  assert(runtime.resolverVersion==="1.1.0",`Smart resolver inesperado: ${runtime.resolverVersion}.`);

  const resolved=await page.evaluate(async(items)=>{
    const unique=new Map();
    for(const item of items){
      if(!unique.has(item.query)){
        const result=window.DuduQSmartVisual?.resolve?.(item.query)||null;
        unique.set(item.query,result);
      }
    }

    async function imageLoads(src){
      if(!src)return false;
      if(src.startsWith("data:image/"))return true;
      return await new Promise(resolve=>{
        const image=new Image();
        let settled=false;
        const finish=value=>{if(settled)return;settled=true;resolve(Boolean(value));};
        image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0);
        image.onerror=()=>finish(false);
        image.src=src;
        window.setTimeout(()=>finish(image.complete&&image.naturalWidth>0&&image.naturalHeight>0),8000);
      });
    }

    const loadCache=new Map();
    const output=[];
    for(const item of items){
      const result=unique.get(item.query)||null;
      const src=result?.src||null;
      let loadOk=false;
      if(src){
        if(!loadCache.has(src))loadCache.set(src,await imageLoads(src));
        loadOk=loadCache.get(src);
      }
      output.push({
        ...item,
        status:result?.status||"asset-gap",
        kind:result?.kind||"gap",
        visualKey:result?.visualKey||`gap:${item.query}`,
        src,
        loadOk
      });
    }
    return output;
  },sourceItems);

  const counts=resolved.reduce((acc,item)=>{
    acc[item.status]=(acc[item.status]||0)+1;
    return acc;
  },{});
  const uniqueQueries=[...new Set(resolved.map(item=>item.query))];
  const gaps=resolved.filter(item=>!item.src||item.status==="asset-gap");
  const dragDropGaps=gaps.filter(item=>item.mechanic==="drag-drop");
  const broken=resolved.filter(item=>item.src&&!item.loadOk);
  const semantic=resolved.filter(item=>item.status==="semantic-composition");
  const official=resolved.filter(item=>item.status==="official");
  const degraded=resolved.filter(item=>
    /\b(?:ducks?|cats?|rabbits?|turtles?|balls?|pencils?|cars?|bus(?:es)?|trucks?|planes?|trains?|eyes?|hands?|hair|nose)\b/i.test(item.query)
    && (item.kind==="number"||item.kind==="color")
  );

  const mustCompose=[
    "ball",
    "three turtles",
    "3 yellow ducks",
    "7 white cats",
    "2 brown rabbits",
    "big blue pencil",
    "green car",
    "red and blue bus",
    "big truck",
    "nose",
    "eyes",
    "hair",
    "two big hands",
    "two green eyes",
    "brown hair"
  ];
  const compositionFailures=mustCompose.map(query=>{
    const item=resolved.find(entry=>entry.query===query);
    return {query,id:item?.id||null,status:item?.status||null,kind:item?.kind||null,src:Boolean(item?.src)};
  }).filter(item=>!item.src||item.status!=="semantic-composition"||item.kind!=="object-composition");

  console.log(JSON.stringify({
    status:"GATE",
    runtime,
    totals:{items:resolved.length,uniqueQueries:uniqueQueries.length,official:official.length,semantic:semantic.length,gaps:gaps.length,dragDropGaps:dragDropGaps.length,brokenResolvedAssets:broken.length,degraded:degraded.length,compositionFailures:compositionFailures.length},
    counts,
    dragDropGaps:dragDropGaps.map(({module,id,query,media,format})=>({module,id,query,media,format})),
    allGaps:gaps.map(({module,id,mechanic,query})=>({module,id,mechanic,query})),
    degraded:degraded.map(({module,id,query,kind,visualKey})=>({module,id,query,kind,visualKey})),
    compositionFailures,
    broken:broken.map(({module,id,query,src})=>({module,id,query,src}))
  },null,2));

  assert(broken.length===0,`Resolver retornou ${broken.length} asset(s) que não carregam.`);
  assert(degraded.length===0,`Resolver degradou ${degraded.length} conceito(s) composto(s) para número/cor.`);
  assert(compositionFailures.length===0,`Falharam ${compositionFailures.length} composições semânticas obrigatórias.`);
  assert(dragDropGaps.length===0,`Persistem ${dragDropGaps.length} gap(s) em Drag & Drop.`);
  assert(gaps.length===0,`Persistem ${gaps.length} gap(s) visuais no Year 3.`);
  console.log(`PASS — Year3 smart assets: ${resolved.length}/90 itens, ${uniqueQueries.length} consultas únicas, zero gaps, zero assets quebrados e zero degradações semânticas.`);
}finally{
  await browser.close();
}
