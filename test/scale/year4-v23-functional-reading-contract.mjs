import fs from "node:fs";
import vm from "node:vm";

function assert(condition,message){if(!condition)throw new Error(message);}
function read(file){return fs.readFileSync(file,"utf8");}
function mm(value){return String(value).padStart(2,"0");}

const root="content/english/year-4";
const expectedSequences={
  1:"ABDBBAABBAAAAAA",
  2:"BCDABBAAAADABBB",
  3:"BCDABCDABCDABCA",
  4:"BBCABCDABCDAAAA",
  5:"BCDABABABCDABAA",
  6:"BCDAAAAABCDABCA"
};

const sandbox={window:{},console};
sandbox.window.window=sandbox.window;
sandbox.window.DuduQSmartVisual={resolve:(query)=>({src:`data:image/svg+xml,${encodeURIComponent(String(query))}`,status:"test",visualKey:`test:${query}`})};
sandbox.window.DuduQAssets={resolveImage:()=>null};
vm.createContext(sandbox);
vm.runInContext(read(`${root}/year4-content-factory-v1.js`),sandbox,{filename:"year4-content-factory-v1.js"});

assert(sandbox.window.DuduQYear4Factory?.version==="1.0.0","Factory Year4 v1.0.0 ausente.");

const allIds=[];
const modules=[];
let optionAudioCount=0;
for(let moduleNumber=1;moduleNumber<=6;moduleNumber+=1){
  const id=mm(moduleNumber);
  const modulePath=`${root}/module-${id}/module-${id}-v1.js`;
  const indexPath=`${root}/module-${id}/index.html`;
  assert(fs.existsSync(modulePath),`Year4 M${id}: conteúdo ausente.`);
  assert(fs.existsSync(indexPath),`Year4 M${id}: entrada pública ausente.`);
  const index=read(indexPath);
  assert(index.includes('channel:"scale-v1"')||index.includes('channel: "scale-v1"'),`Year4 M${id}: deve usar scale-v1.`);
  assert(index.includes("year4-content-factory-v1.js?v=1.0.0"),`Year4 M${id}: factory incorreta.`);
  assert(index.includes("scale-smart-visual-aliases-v1.js"),`Year4 M${id}: aliases compartilhados ausentes.`);
  assert(index.includes("scale-content-compat-v1.js"),`Year4 M${id}: compat compartilhada ausente.`);
  assert(index.includes('requiredMechanics:["drag-drop"]')||index.includes('requiredMechanics: ["drag-drop"]'),`Year4 M${id}: bootstrap deve carregar apenas drag-drop nesta fase.`);

  vm.runInContext(read(modulePath),sandbox,{filename:`module-${id}-v1.js`});
  const mod=sandbox.window.DUDUQ_CONTENT?.english?.year4?.[`module${id}`];
  assert(mod,`Year4 M${id}: módulo não publicado.`);
  assert(mod.activities.length===15,`Year4 M${id}: esperado 15 atividades; recebeu ${mod.activities.length}.`);
  assert(mod.factory?.sourceRevision==="Revisão Pedagógica Integral v2.3",`Year4 M${id}: fonte não é v2.3.`);
  assert(mod.factory?.thinContent===true,`Year4 M${id}: precisa permanecer thin-content.`);
  assert(mod.factory?.yearSpecificMechanicPatch===false,`Year4 M${id}: patch de mecânica por ano não permitido.`);
  assert(mod.pedagogyPolicy?.profile==="Y4_FUNCTIONAL_READING",`Year4 M${id}: perfil pedagógico incorreto.`);
  assert(mod.pedagogyPolicy?.readingMode==="GRADUAL",`Year4 M${id}: leitura deve ser GRADUAL.`);

  let sequence="";
  for(const [index,activity] of mod.activities.entries()){
    const question=activity.questions?.[0];
    const expectedId=`EN4-M${moduleNumber}-${mm(index+1)}`;
    assert(question?.id===expectedId,`Year4 M${id}: esperado ${expectedId}; recebeu ${question?.id}.`);
    assert(activity.mechanic==="drag-drop"&&question.delivery?.mechanic==="drag-drop",`Year4 ${expectedId}: delivery bootstrap deve ser drag-drop.`);
    assert(Array.isArray(question.alternatives)&&question.alternatives.length===4,`Year4 ${expectedId}: esperado 4 alternativas.`);
    assert(question.metadata?.sourceReading==="GRADUAL",`Year4 ${expectedId}: sourceReading precisa ser GRADUAL.`);
    assert(question.metadata?.sourceVersion?.includes("v2.3"),`Year4 ${expectedId}: metadata precisa apontar para v2.3.`);
    assert(question.answer?.type==="pairs"&&question.answer.value?.length===1,`Year4 ${expectedId}: gabarito drag-drop inválido.`);
    const sourceAnswer=question.metadata?.sourceAnswer?.id;
    assert(sourceAnswer&&question.answer.value[0][0]===sourceAnswer,`Year4 ${expectedId}: gabarito divergente.`);
    sequence+=sourceAnswer;
    for(const alternative of question.alternatives){
      assert(alternative.audio?.enabled===true&&alternative.audio?.text,`Year4 ${expectedId}/${alternative.id}: apoio de áudio ausente.`);
      optionAudioCount+=1;
    }
    allIds.push(question.id);
  }
  assert(sequence===expectedSequences[moduleNumber],`Year4 M${id}: sequência de gabaritos divergente. Esperado ${expectedSequences[moduleNumber]}, recebeu ${sequence}.`);
  modules.push({module:moduleNumber,items:mod.activities.length,answerSequence:sequence});
}

assert(allIds.length===90,`Year4 deveria totalizar 90 itens; recebeu ${allIds.length}.`);
assert(new Set(allIds).size===90,"Year4 contém IDs duplicados.");
assert(allIds[0]==="EN4-M1-01"&&allIds.at(-1)==="EN4-M6-15","Year4 não preservou faixa editorial completa.`");
assert(optionAudioCount===360,`Year4 deveria publicar 360 alternativas com apoio de áudio; recebeu ${optionAudioCount}.`);

console.log(JSON.stringify({status:"PASS",year4:{items:allIds.length,uniqueIds:new Set(allIds).size,optionAudioCount,modules}},null,2));
console.log("PASS — Year4 v2.3: 90 IDs/gabaritos preservados, leitura funcional GRADUAL e 360 alternativas com apoio de áudio.");
