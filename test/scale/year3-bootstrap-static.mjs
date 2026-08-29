import fs from "node:fs";
import vm from "node:vm";

function assert(condition, message){ if(!condition) throw new Error(message); }
function read(path){ return fs.readFileSync(path,"utf8"); }

const canary=JSON.parse(read("engine/channels/canary-v1.json"));
const scale=JSON.parse(read("engine/channels/scale-v1.json"));
const loader=read("engine/duduq-loader-v1.js");
const bubbleShared=read("engine/shared/bubble-pop-runtime-safety-v1.js");
const visualShared=read("engine/shared/smart-visual-resolver-v1.js");
const factorySource=read("content/english/year-3/year3-content-factory-v1.js");
const moduleSource=read("content/english/year-3/module-01/module-01-v1.js");
const index=read("content/english/year-3/module-01/index.html");

assert(canary.revision===143,"Canary precisa permanecer R143.");
assert(!canary.core?.postMechanicScripts,"Canary não deve receber camadas experimentais de scale.");
assert(scale.channel==="scale-v1","Canal de escala ausente.");
assert(scale.policy?.productionPromotionAllowed===false,"scale-v1 não pode permitir promoção para produção.");
assert(Array.isArray(scale.core?.postMechanicScripts) && scale.core.postMechanicScripts.length===2,"scale-v1 deve carregar as duas camadas compartilhadas.");
assert(loader.includes("postMechanicScripts"),"Loader não suporta camadas compartilhadas pós-mecânica.");
assert(bubbleShared.includes('scope: "all-years"'),"Bubble safety precisa ser cross-year.");
assert(bubbleShared.includes("releaseModified: false"),"Bubble safety não pode alterar release.");
assert(visualShared.includes("OFFICIAL_EXACT_ALIAS > CONTROLLED_SEMANTIC > EXPLICIT_GAP"),"Contrato smart visual compartilhado ausente.");
for(const [id,entry] of Object.entries(canary.mechanics||{})){
  assert(scale.mechanics?.[id]?.release===entry.release,`scale-v1 divergiu da release Canary em ${id}.`);
}
assert(index.includes('channel: "scale-v1"'),"Year3 M01 precisa usar scale-v1.");
assert(index.includes("year3-content-factory-v1.js"),"Year3 M01 precisa usar factory fina compartilhada do conteúdo.");
assert(!moduleSource.match(/year3-.*(?:hotfix|fix)\.js/i),"Year3 não deve criar hotfix estrutural local.");

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DuduQSmartVisual={resolve:(q)=>({requested:q,src:null,status:"asset-gap",visualKey:`gap:${q}`})};
vm.createContext(sandbox);
vm.runInContext(factorySource,sandbox,{filename:"year3-content-factory-v1.js"});
vm.runInContext(moduleSource,sandbox,{filename:"module-01-v1.js"});
const mod=sandbox.window.DUDUQ_CONTENT?.english?.year3?.module01;
assert(mod,"Year3 M01 não foi publicado.");
assert(mod.activities.length===15,`Year3 M01 deveria ter 15 atividades; recebeu ${mod.activities.length}.`);
const ids=mod.activities.flatMap(a=>a.questions||[]).map(q=>q.id);
assert(new Set(ids).size===15,"Year3 M01 contém IDs duplicados.");
assert(ids[0]==="EN3-M1-01" && ids[14]==="EN3-M1-15","Year3 M01 não preservou faixa editorial EN3-M1-01..15.");
const mechanics=mod.activities.reduce((acc,a)=>(acc[a.mechanic]=(acc[a.mechanic]||0)+1,acc),{});
assert(mechanics["bubble-pop"]===11,"M01 precisa manter 11 escolhas contextuais em Bubble Pop neste bootstrap.");
assert(mechanics["drag-drop"]===2,"M01 precisa manter 2 atividades visual/contextual em Drag Drop.");
assert(mechanics["target-shooter"]===2,"M01 precisa manter 2 atividades de escuta rápida em Target Shooter.");
assert(mod.factory?.thinContent===true && mod.factory?.yearSpecificMechanicPatch===false,"Year3 precisa permanecer conteúdo fino sem patch de mecânica por ano.");

console.log(JSON.stringify({status:"PASS",canaryRevision:canary.revision,scaleRevision:scale.revision,year3M01:{items:ids.length,first:ids[0],last:ids.at(-1),mechanics},contract:scale.policy.smartVisualContract},null,2));
