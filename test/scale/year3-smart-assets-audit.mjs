import fs from "node:fs";
import vm from "node:vm";
import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
function assert(condition,message){if(!condition)throw new Error(message);}
function mm(value){return String(value).padStart(2,"0");}

const specs=[];
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const sandbox={window:{DuduQYear3Factory:{publish(spec){specs.push(spec);return spec;}}},console};
  sandbox.window.window=sandbox.window;
  vm.createContext(sandbox);
  const source=fs.readFileSync(`content/english/year-3/module-${mm(moduleNumber)}/module-${mm(moduleNumber)}-v1.js`,"utf8");
  vm.runInContext(source,sandbox,{filename:`module-${mm(moduleNumber)}-v1.js`});
}

assert(specs.length===6,`Auditoria esperava 6 módulos; recebeu ${specs.length}.`);
const sourceItems=specs.flatMap(spec=>spec.items.map(item=>({module:spec.module,...item})));
assert(sourceItems.length===90,`Auditoria esperava 90 itens; recebeu ${sourceItems.length}.`);

const requiredVisualItems=sourceItems.filter(item=>(item.mechanic||"drag-drop")!=="target-shooter");
assert(requiredVisualItems.length===85,`Esperados 85 itens multimodais com visual; recebeu ${requiredVisualItems.length}.`);
assert(requiredVisualItems.every(item=>String(item.visualQuery||"").trim()),"Todos os 85 itens multimodais precisam ter consulta visual de contexto.");

const requests=[];
for(const item of sourceItems){
  const query=String(item.visualQuery||"").trim();
  if(query) requests.push({module:item.module,id:item.id,mechanic:item.mechanic,role:"context",query});
  for(const option of item.alternatives||[]){
    const optionQuery=String(option.imageQuery||"").trim();
    if(optionQuery) requests.push({module:item.module,id:item.id,mechanic:item.mechanic,role:`option-${option.id}`,query:optionQuery});
  }
}

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  await page.emulateMedia({reducedMotion:"reduce"});
  await page.goto(`${BASE}/content/english/year-3/module-01/`,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:15000});

  const runtime=await page.evaluate(()=>({
    resolverVersion:window.DuduQSmartVisual?.version||null,
    factoryVersion:window.DuduQYear3Factory?.version||null,
    contract:window.DuduQSmartVisual?.contract||null,
    assetsVersion:window.DuduQAssets?.version||null
  }));
  assert(runtime.resolverVersion==="1.1.0",`Smart resolver inesperado: ${runtime.resolverVersion}.`);
  assert(runtime.factoryVersion==="1.1.0",`Year3 factory inesperada: ${runtime.factoryVersion}.`);

  const resolved=await page.evaluate(async(items)=>{
    const unique=new Map();
    for(const item of items){
      if(!unique.has(item.query)){
        const result=window.DuduQYear3Factory?.resolveVisual?.(item.query)||null;
        unique.set(item.query,result);
      }
    }
    async function imageLoads(src){
      if(!src)return false;
      if(src.startsWith("data:image/"))return true;
      return await new Promise(resolve=>{
        const image=new Image();let settled=false;
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
      if(src){if(!loadCache.has(src))loadCache.set(src,await imageLoads(src));loadOk=loadCache.get(src);}
      output.push({...item,status:result?.status||"asset-gap",kind:result?.kind||"context",visualKey:result?.visualKey||`gap:${item.query}`,src,loadOk});
    }
    return output;
  },requests);

  const uniqueQueries=[...new Set(resolved.map(item=>item.query))];
  const gaps=resolved.filter(item=>!item.src||item.status==="asset-gap");
  const broken=resolved.filter(item=>item.src&&!item.loadOk);
  const degraded=resolved.filter(item=>/\b(?:ducks?|cats?|rabbits?|turtles?|balls?|pencils?|cars?|bus(?:es)?|trucks?|planes?|trains?|eyes?|hands?|hair|nose)\b/i.test(item.query)&&(item.kind==="number"||item.kind==="color"));

  const mustCompose=["ball","three turtles","3 yellow ducks","7 white cats","2 brown rabbits","big blue pencil","green car","red and blue bus","big truck","nose","eyes","hair","two big hands","two green eyes","brown hair"];
  const compositionFailures=mustCompose.map(query=>{
    const item=resolved.find(entry=>entry.query===query);
    return {query,id:item?.id||null,status:item?.status||null,kind:item?.kind||null,src:Boolean(item?.src)};
  }).filter(item=>!item.src||item.status!=="semantic-composition"||item.kind!=="object-composition");

  const mustContext=["profile:maya","profile:maya:10","profile:ana:12","profile:sister:8","profile:grandfather:50","calendar:may:12","calendar:may:9","calendar:june:12","calendar:march:12","duo:leo:mia","duo:maya:leo","math:2 + 3 = 5:+","math:5 − 2 = 3:−","math:3 × 2 = 6:×","math:8 ÷ 2 = 4:÷","math:4 + 1 = 5:="];
  const contextFailures=mustContext.map(query=>{
    const item=resolved.find(entry=>entry.query===query);
    return {query,status:item?.status||null,src:Boolean(item?.src)};
  }).filter(item=>!item.src||item.status!=="semantic-context");

  console.log(JSON.stringify({status:"GATE",runtime,totals:{sourceItems:sourceItems.length,requiredVisualItems:requiredVisualItems.length,requests:resolved.length,uniqueQueries:uniqueQueries.length,gaps:gaps.length,brokenResolvedAssets:broken.length,degraded:degraded.length,compositionFailures:compositionFailures.length,contextFailures:contextFailures.length},compositionFailures,contextFailures,gaps:gaps.map(({module,id,role,query})=>({module,id,role,query})),broken:broken.map(({module,id,role,query,src})=>({module,id,role,query,src}))},null,2));

  assert(broken.length===0,`Resolver retornou ${broken.length} asset(s) que não carregam.`);
  assert(degraded.length===0,`Resolver degradou ${degraded.length} conceito(s) composto(s) para número/cor.`);
  assert(compositionFailures.length===0,`Falharam ${compositionFailures.length} composições semânticas obrigatórias.`);
  assert(contextFailures.length===0,`Falharam ${contextFailures.length} cartões contextuais v2.3.`);
  assert(gaps.length===0,`Persistem ${gaps.length} gap(s) visuais/contextuais no Year 3 v2.3.`);
  console.log(`PASS — Year3 v2.3 smart assets: ${sourceItems.length}/90 itens, ${resolved.length} requisições visuais/contextuais, zero gaps e zero assets quebrados.`);
}finally{await browser.close();}
