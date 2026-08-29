import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

function assert(condition, message){ if(!condition) throw new Error(message); }
function read(file){ return fs.readFileSync(file,"utf8"); }

const canary=JSON.parse(read("engine/channels/canary-v1.json"));
const scale=JSON.parse(read("engine/channels/scale-v1.json"));
const loader=read("engine/duduq-loader-v1.js");
const bubbleShared=read("engine/shared/bubble-pop-runtime-safety-v1.js");
const visualShared=read("engine/shared/smart-visual-resolver-v1.js");
const completionShared=read("engine/shared/host-owned-completion-guard-v1.js");
const factorySource=read("content/english/year-3/year3-content-factory-v1.js");

assert(canary.revision===143,"Canary precisa permanecer R143.");
assert(!canary.core?.postMechanicScripts,"Canary não deve receber camadas experimentais de scale.");
assert(scale.channel==="scale-v1","Canal de escala ausente.");
assert(scale.revision===3,"scale-v1 precisa estar na revisão 3 da baseline cross-year.");
assert(scale.policy?.productionPromotionAllowed===false,"scale-v1 não pode permitir promoção para produção.");
assert(Array.isArray(scale.core?.postMechanicScripts) && scale.core.postMechanicScripts.length===3,"scale-v1 deve carregar somente as três camadas compartilhadas comprovadas.");
assert(loader.includes("postMechanicScripts"),"Loader não suporta camadas compartilhadas pós-mecânica.");
assert(bubbleShared.includes('scope: "all-years"'),"Bubble safety precisa ser cross-year.");
assert(bubbleShared.includes("releaseModified: false"),"Bubble safety não pode alterar release.");
assert(completionShared.includes('scope: "all-years"'),"Completion guard precisa ser cross-year.");
assert(completionShared.includes("hostOwnsProgression: true"),"Completion guard deve declarar Host como dono da progressão.");
assert(completionShared.includes("releaseModified: false"),"Completion guard não pode alterar release.");
const smartContract="OFFICIAL_EXACT_ALIAS > OFFICIAL_LIBRARY > CONTROLLED_SEMANTIC > EXPLICIT_GAP";
assert(visualShared.includes(smartContract),"Contrato smart visual compartilhado ausente.");
assert(scale.policy?.smartVisualContract===smartContract,"scale-v1 precisa declarar o mesmo contrato smart visual do resolver.");
assert(scale.core.postMechanicScripts.find(x=>x.id==="duduq-shared-smart-visual-resolver-v1")?.release==="shared-1.1.0","scale-v1 precisa declarar smart visual shared-1.1.0.");
assert(scale.core.postMechanicScripts.find(x=>x.id==="duduq-shared-host-completion-guard-v1")?.release==="shared-1.0.0","scale-v1 precisa declarar host completion guard shared-1.0.0.");
for(const [id,entry] of Object.entries(canary.mechanics||{})){
  assert(scale.mechanics?.[id]?.release===entry.release,`scale-v1 divergiu da release Canary em ${id}.`);
}

const year3Root="content/english/year-3";
const localStructuralPatches=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(full);
    else if(/(?:hotfix|runtime-fix|layout-fix|mechanic-fix)/i.test(entry.name)) localStructuralPatches.push(full);
  }
}
walk(year3Root);
assert(localStructuralPatches.length===0,`Year3 não pode conter hotfix estrutural local: ${localStructuralPatches.join(", ")}`);

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DuduQSmartVisual={resolve:(q)=>({requested:q,src:null,status:"asset-gap",visualKey:`gap:${q}`})};
vm.createContext(sandbox);
vm.runInContext(factorySource,sandbox,{filename:"year3-content-factory-v1.js"});

const allIds=[];
const mechanicTotals={};
const modules=[];
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const mm=String(moduleNumber).padStart(2,"0");
  const modulePath=`${year3Root}/module-${mm}/module-${mm}-v1.js`;
  const indexPath=`${year3Root}/module-${mm}/index.html`;
  assert(fs.existsSync(modulePath),`Year3 M${mm}: arquivo de conteúdo ausente.`);
  assert(fs.existsSync(indexPath),`Year3 M${mm}: index público ausente.`);
  const moduleSource=read(modulePath);
  const index=read(indexPath);
  assert(index.includes('channel:"scale-v1"')||index.includes('channel: "scale-v1"'),`Year3 M${mm} precisa usar scale-v1.`);
  assert(index.includes("year3-content-factory-v1.js"),`Year3 M${mm} precisa carregar a factory fina compartilhada.`);
  assert(index.includes(`module-${mm}-v1.js`),`Year3 M${mm}: index aponta para conteúdo incorreto.`);
  vm.runInContext(moduleSource,sandbox,{filename:`module-${mm}-v1.js`});
  const key=`module${mm}`;
  const mod=sandbox.window.DUDUQ_CONTENT?.english?.year3?.[key];
  assert(mod,`Year3 M${mm} não foi publicado.`);
  assert(mod.activities.length===15,`Year3 M${mm} deveria ter 15 atividades; recebeu ${mod.activities.length}.`);
  assert(mod.factory?.thinContent===true && mod.factory?.yearSpecificMechanicPatch===false,`Year3 M${mm} precisa permanecer conteúdo fino sem patch de mecânica por ano.`);
  const ids=mod.activities.flatMap(a=>a.questions||[]).map(q=>q.id);
  assert(ids.length===15,`Year3 M${mm} deveria publicar 15 questões.`);
  assert(new Set(ids).size===15,`Year3 M${mm} contém IDs duplicados.`);
  assert(ids[0]===`EN3-M${moduleNumber}-01` && ids[14]===`EN3-M${moduleNumber}-15`,`Year3 M${mm} não preservou faixa editorial EN3-M${moduleNumber}-01..15.`);
  for(const [index,id] of ids.entries()){
    const expected=`EN3-M${moduleNumber}-${String(index+1).padStart(2,"0")}`;
    assert(id===expected,`Year3 M${mm}: ordem/ID editorial divergente; esperado ${expected}, recebido ${id}.`);
    allIds.push(id);
  }
  const mechanics={};
  for(const activity of mod.activities){
    const question=activity.questions?.[0];
    assert(question?.delivery?.mechanic===activity.mechanic,`Year3 M${mm} ${question?.id||activity.id}: activity.mechanic e delivery.mechanic precisam coincidir.`);
    mechanics[activity.mechanic]=(mechanics[activity.mechanic]||0)+1;
    mechanicTotals[activity.mechanic]=(mechanicTotals[activity.mechanic]||0)+1;
  }
  modules.push({module:moduleNumber,items:ids.length,mechanics});
}

assert(allIds.length===90,`Year3 deveria totalizar 90 itens; recebeu ${allIds.length}.`);
assert(new Set(allIds).size===90,"Year3 contém IDs duplicados entre módulos.");
assert(allIds[0]==="EN3-M1-01" && allIds.at(-1)==="EN3-M6-15","Year3 não preservou faixa editorial completa EN3-M1-01..EN3-M6-15.");

console.log(JSON.stringify({
  status:"PASS",
  canaryRevision:canary.revision,
  scaleRevision:scale.revision,
  sharedLayers:scale.core.postMechanicScripts.map(x=>x.src),
  year3:{items:allIds.length,uniqueIds:new Set(allIds).size,first:allIds[0],last:allIds.at(-1),modules,mechanicTotals},
  contract:scale.policy.smartVisualContract
},null,2));
