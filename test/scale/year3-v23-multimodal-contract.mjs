import fs from "node:fs";
import vm from "node:vm";

function assert(condition,message){if(!condition)throw new Error(message);}
function read(file){return fs.readFileSync(file,"utf8");}

const ROOT="content/english/year-3";
const FACTORY=`${ROOT}/year3-content-factory-v1.js`;
const factorySource=read(FACTORY);

assert(factorySource.includes('const VERSION = "1.1.0"'),"Year3 factory precisa permanecer em 1.1.0 durante a homologação v2.3.");
assert(factorySource.includes("Revisao_Alfabetizacao_Multimodal_v2.3")||factorySource.includes("Revisao_Alfabetizacao_Multimodal_v2.3".replace("Revisao","Revisão")),"Factory não declara a fonte multimodal v2.3.");
assert(!factorySource.includes("Integral_v2.2"),"Factory Year3 voltou a referenciar v2.2.");
assert(factorySource.includes("autonomousReadingRequired: false"),"Factory Year3 precisa bloquear dependência de leitura autônoma.");

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DuduQSmartVisual={
  resolve:(query)=>({requested:query,src:`https://example.test/${encodeURIComponent(String(query))}.png`,status:"test-visual",visualKey:`test:${query}`})
};
sandbox.window.DuduQAssets={resolveImage:()=>null};
vm.createContext(sandbox);
vm.runInContext(factorySource,sandbox,{filename:FACTORY});
assert(sandbox.window.DuduQYear3Factory?.version==="1.1.0","Factory v2.3 não publicou versão 1.1.0.");

const expectedAnswers={
  1:"ABAABABABDAAAAA",
  2:"BBDABBDABACCBCC",
  3:"BCDABCDAACBAABA",
  4:"BCDABCDABCDAACD",
  5:"BCDABAAAAAAAACB",
  6:"BCDABAAABCDAAAC"
};
const expectedTargetShooters=new Set([
  "EN3-M1-05","EN3-M1-12","EN3-M2-11","EN3-M2-12","EN3-M2-15"
]);

let total=0;
let dragDrop=0;
let targetShooter=0;
let audibleAlternatives=0;
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const mm=String(moduleNumber).padStart(2,"0");
  const modulePath=`${ROOT}/module-${mm}/module-${mm}-v1.js`;
  const indexPath=`${ROOT}/module-${mm}/index.html`;
  const source=read(modulePath);
  const index=read(indexPath);

  assert(source.includes("v2.3"),`M${mm}: arquivo de conteúdo não declara v2.3.`);
  assert(!source.includes("v2.2"),`M${mm}: conteúdo ativo ainda referencia v2.2.`);
  assert(index.includes("1.1.0-v23-multimodal"),`M${mm}: index não força cache do conteúdo v2.3.`);
  assert(index.includes("year3-content-factory-v1.js?v=1.1.0"),`M${mm}: index não força cache da factory v1.1.0.`);

  vm.runInContext(source,sandbox,{filename:modulePath});
  const mod=sandbox.window.DUDUQ_CONTENT?.english?.year3?.[`module${mm}`];
  assert(mod?.activities?.length===15,`M${mm}: esperado 15 atividades.`);
  assert(mod.factory?.sourceRevision==="Revisão Pedagógica Integral v2.3",`M${mm}: sourceRevision não é v2.3.`);
  assert(mod.pedagogyPolicy?.autonomousReadingRequired===false,`M${mm}: leitura autônoma voltou a ser requisito.`);

  let answerSequence="";
  for(let index=0;index<15;index+=1){
    const activity=mod.activities[index];
    const q=activity.questions?.[0];
    const expectedId=`EN3-M${moduleNumber}-${String(index+1).padStart(2,"0")}`;
    assert(q?.id===expectedId,`M${mm}: ID/ordem divergente em ${index+1}; recebido ${q?.id}.`);
    assert(q.metadata?.sourceVersion?.includes("v2.3"),`${q.id}: metadata não aponta para v2.3.`);
    assert(q.metadata?.sourceReading==="NÃO OBRIGATÓRIA",`${q.id}: leitura precisa permanecer NÃO OBRIGATÓRIA.`);
    assert(q.metadata?.readingAutonomyRequired===false,`${q.id}: leitura autônoma não pode ser requisito.`);
    assert(Array.isArray(q.alternatives)&&q.alternatives.length===4,`${q.id}: precisa ter quatro alternativas.`);
    for(const option of q.alternatives){
      assert(option.audio?.enabled===true&&option.audio?.text,`${q.id}/${option.id}: alternativa verbal precisa ter áudio tocável.`);
      audibleAlternatives+=1;
    }

    const answerId=q.metadata?.sourceAnswer?.id;
    assert(/^[ABCD]$/.test(answerId||""),`${q.id}: sourceAnswer.id inválido.`);
    answerSequence+=answerId;

    if(expectedTargetShooters.has(q.id)){
      assert(activity.mechanic==="target-shooter",`${q.id}: item auditivo deve permanecer Target Shooter.`);
      assert(q.answer?.type==="single"&&q.answer?.value===answerId,`${q.id}: gabarito Target Shooter divergiu.`);
      targetShooter+=1;
    }else{
      assert(activity.mechanic==="drag-drop",`${q.id}: item multimodal deve usar Drag & Drop no contrato v2.3 atual.`);
      assert(q.answer?.type==="pairs"&&q.answer?.value?.[0]?.[0]===answerId,`${q.id}: gabarito Drag & Drop divergiu.`);
      dragDrop+=1;
    }
    total+=1;
  }
  assert(answerSequence===expectedAnswers[moduleNumber],`M${mm}: gabaritos divergiram da v2.3. Esperado ${expectedAnswers[moduleNumber]}, recebido ${answerSequence}.`);
}

assert(total===90,`Year3 v2.3 deveria ter 90 itens; recebeu ${total}.`);
assert(dragDrop===85,`Year3 v2.3 deveria ter 85 itens multimodais em Drag & Drop; recebeu ${dragDrop}.`);
assert(targetShooter===5,`Year3 v2.3 deveria ter 5 itens auditivos em Target Shooter; recebeu ${targetShooter}.`);
assert(audibleAlternatives===360,`Year3 v2.3 deveria expor áudio nas 360 alternativas; recebeu ${audibleAlternatives}.`);

const m01=sandbox.window.DUDUQ_CONTENT.english.year3.module01;
const q06=m01.activities[5].questions[0];
const q08=m01.activities[7].questions[0];
const q09=m01.activities[8].questions[0];
assert(q06.metadata?.visualResolution?.requested==="profile:maya",`EN3-M1-06 precisa manter minificha visual de Maya.`);
assert(q08.alternatives.every(x=>x.image?.enabled),`EN3-M1-08 precisa manter quatro calendários visuais.`);
assert(q09.alternatives.every(x=>x.image?.enabled),`EN3-M1-09 precisa manter quatro imagens de animais.`);

console.log(JSON.stringify({status:"PASS",source:"v2.3",items:total,answers:"90/90",audibleAlternatives,mechanics:{"drag-drop":dragDrop,"target-shooter":targetShooter},readingAutonomyRequired:false},null,2));
