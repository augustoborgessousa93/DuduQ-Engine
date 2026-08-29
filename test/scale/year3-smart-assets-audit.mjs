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
  assert(runtime.resolverVersion==="1.0.0",`Smart resolver inesperado: ${runtime.resolverVersion}.`);

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

  console.log(JSON.stringify({
    status:"AUDIT",
    runtime,
    totals:{items:resolved.length,uniqueQueries:uniqueQueries.length,official:official.length,semantic:semantic.length,gaps:gaps.length,dragDropGaps:dragDropGaps.length,brokenResolvedAssets:broken.length},
    counts,
    dragDropGaps:dragDropGaps.map(({module,id,query,media,format})=>({module,id,query,media,format})),
    allGaps:gaps.map(({module,id,mechanic,query})=>({module,id,mechanic,query})),
    semantic:semantic.map(({module,id,mechanic,query,visualKey})=>({module,id,mechanic,query,visualKey})),
    broken:broken.map(({module,id,query,src})=>({module,id,query,src}))
  },null,2));

  assert(broken.length===0,`Resolver retornou ${broken.length} asset(s) que não carregam.`);
  console.log(`PASS — auditoria executada em ${resolved.length} itens / ${uniqueQueries.length} consultas únicas; gaps são reportados para correção compartilhada.`);
}finally{
  await browser.close();
}
