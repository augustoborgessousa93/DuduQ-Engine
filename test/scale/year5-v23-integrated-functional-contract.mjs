import fs from "node:fs";
import vm from "node:vm";

function assert(condition,message){if(!condition)throw new Error(message);}
function read(file){return fs.readFileSync(file,"utf8");}

const ROOT="content/english/year-5";
const FACTORY=`${ROOT}/year5-content-factory-v1.js`;
const factorySource=read(FACTORY);

assert(factorySource.includes('const VERSION = "1.0.0"'),"Year5 factory precisa permanecer em 1.0.0 nesta fase de escala.");
assert(factorySource.includes("Y5_INTEGRATED_FUNCTIONAL"),"Factory Year5 não declara o perfil integrado funcional.");
assert(factorySource.includes('readingMode: "FUNCIONAL"'),"Factory Year5 precisa declarar leitura FUNCIONAL.");
assert(factorySource.includes("fourSkillsIntegration: true"),"Factory Year5 precisa preservar integração das quatro habilidades.");
assert(factorySource.includes("yearSpecificMechanicPatch: false"),"Factory Year5 não pode introduzir patch estrutural por série.");

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DuduQSmartVisual={resolve:(query)=>({requested:query,src:`https://example.test/${encodeURIComponent(String(query))}.png`,status:"test-visual",visualKey:`test:${query}`})};
sandbox.window.DuduQAssets={resolveImage:()=>null};
vm.createContext(sandbox);
vm.runInContext(factorySource,sandbox,{filename:FACTORY});
assert(sandbox.window.DuduQYear5Factory?.version==="1.0.0","Factory Year5 não publicou versão 1.0.0.");

const expectedAnswers={1: "AABABAACBAAAABA", 2: "BCDABAAAAADAAAD", 3: "ACDAAADABCDAAAA", 4: "BCDABCDABCDABCD", 5: "BCDABCCABCDAABA", 6: "BCDABCAABCDABCA"};

let total=0;
let audibleAlternatives=0;
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const mm=String(moduleNumber).padStart(2,"0");
  const modulePath=`${ROOT}/module-${mm}/module-${mm}-v1.js`;
  const indexPath=`${ROOT}/module-${mm}/index.html`;
  const source=read(modulePath);
  const index=read(indexPath);

  assert(source.includes("v2.3"),`M${mm}: conteúdo não declara fonte v2.3.`);
  assert(index.includes('channel:"scale-v1"'),`M${mm}: index não usa scale-v1.`);
  assert(index.includes("year5-content-factory-v1.js?v=1.0.0"),`M${mm}: index não carrega a factory Year5.`);
  assert(index.includes("scale-smart-visual-aliases-v1.js?v=1.0.0"),`M${mm}: aliases compartilhados não carregados.`);
  assert(index.includes("scale-content-compat-v1.js?v=1.0.0"),`M${mm}: compatibilidade compartilhada não carregada.`);
  assert(!source.includes("mechanicPatch")&&!source.includes("runtimePatch"),`M${mm}: conteúdo introduziu patch estrutural específico.`);

  vm.runInContext(source,sandbox,{filename:modulePath});
  const mod=sandbox.window.DUDUQ_CONTENT?.english?.year5?.[`module${mm}`];
  assert(mod?.activities?.length===15,`M${mm}: esperado 15 atividades.`);
  assert(mod.factory?.sourceRevision==="Revisão Pedagógica Integral v2.3",`M${mm}: sourceRevision divergente.`);
  assert(mod.factory?.yearSpecificMechanicPatch===false,`M${mm}: patch estrutural por série não permitido.`);
  assert(mod.pedagogyPolicy?.readingMode==="FUNCIONAL",`M${mm}: leitura precisa permanecer FUNCIONAL.`);
  assert(mod.pedagogyPolicy?.fourSkillsIntegration===true,`M${mm}: integração das quatro habilidades não declarada.`);

  let answerSequence="";
  for(let index=0;index<15;index+=1){
    const activity=mod.activities[index];
    const q=activity.questions?.[0];
    const expectedId=`EN5-M${moduleNumber}-${String(index+1).padStart(2,"0")}`;
    assert(q?.id===expectedId,`M${mm}: ID/ordem divergente em ${index+1}; recebido ${q?.id}.`);
    assert(activity.mechanic==="drag-drop",`${q.id}: nesta fase de escala o transporte seguro deve permanecer Drag & Drop.`);
    assert(q.delivery?.mechanic==="drag-drop",`${q.id}: routing divergente.`);
    assert(q.metadata?.sourceVersion?.includes("v2.3"),`${q.id}: metadata não aponta para v2.3.`);
    assert(q.metadata?.sourceReading==="FUNCIONAL",`${q.id}: leitura editorial deve permanecer FUNCIONAL.`);
    assert(q.metadata?.readingMode==="FUNCIONAL",`${q.id}: readingMode precisa ser FUNCIONAL.`);
    assert(q.metadata?.functionalReading===true,`${q.id}: functionalReading precisa ser true.`);
    assert(q.metadata?.fourSkillsIntegration===true,`${q.id}: integração de habilidades ausente.`);
    assert(Array.isArray(q.alternatives)&&q.alternatives.length===4,`${q.id}: precisa ter quatro alternativas.`);
    for(const option of q.alternatives){
      assert(option.audio?.enabled===true&&option.audio?.text,`${q.id}/${option.id}: alternativa precisa manter apoio sonoro disponível.`);
      audibleAlternatives+=1;
    }
    const answerId=q.metadata?.sourceAnswer?.id;
    assert(/^[ABCD]$/.test(answerId||""),`${q.id}: sourceAnswer.id inválido.`);
    assert(q.answer?.type==="pairs"&&q.answer?.value?.[0]?.[0]===answerId,`${q.id}: gabarito Drag & Drop divergiu.`);
    answerSequence+=answerId;
    total+=1;
  }
  assert(answerSequence===expectedAnswers[moduleNumber],`M${mm}: gabaritos divergiram da v2.3. Esperado ${expectedAnswers[moduleNumber]}, recebido ${answerSequence}.`);
}

assert(total===90,`Year5 v2.3 deveria ter 90 itens; recebeu ${total}.`);
assert(audibleAlternatives===360,`Year5 deveria manter apoio sonoro nas 360 alternativas; recebeu ${audibleAlternatives}.`);

console.log(JSON.stringify({status:"PASS",source:"v2.3",year:5,items:total,answers:"90/90",audibleAlternatives,readingMode:"FUNCIONAL",fourSkillsIntegration:true,mechanicTransport:"drag-drop"},null,2));
