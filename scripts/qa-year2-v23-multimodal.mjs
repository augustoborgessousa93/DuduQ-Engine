import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import process from "node:process";

const ROOT=process.cwd();
const YEAR2=path.join(ROOT,"content/english/year-2");
const context=vm.createContext({window:{},console,URL,Object,Array,Map,Set,String,Number,Boolean,Math,JSON,RegExp,Error,Date});
context.window.window=context.window;

function run(rel){
  const source=fs.readFileSync(path.join(ROOT,rel),"utf8");
  vm.runInContext(source,context,{filename:rel});
}
function check(cond,msg){if(!cond) throw new Error(msg)}
function canonical(id,prompt,alternatives,answer){
  return [id,prompt,alternatives,answer];
}
function sha(v){
  return crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
}

run("content/english/year-2/year2-v22-homolog-core.js");
run("content/english/year-2/year2-v22-homolog-editorial-assets.js");
run("content/english/year-2/year2-v23-multimodal-adapter.js");
for(let m=1;m<=6;m++) run(`content/english/year-2/module-${String(m).padStart(2,"0")}/module-${String(m).padStart(2,"0")}-v23-multimodal.js`);

const signatures=JSON.parse(fs.readFileSync(path.join(YEAR2,"YEAR2_V23_SOURCE_SIGNATURES.json"),"utf8"));
const all=[];
for(let m=1;m<=6;m++){
  const key=`module${String(m).padStart(2,"0")}v23multimodal`;
  const mod=context.window.DUDUQ_CONTENT?.english?.year2?.[key];
  check(mod,`M${m}: módulo v2.3 não exportado`);
  check(mod.version==="2.3.0-multimodal-a",`M${m}: versão inesperada ${mod.version}`);
  check(mod.source?.document?.includes("v2.3"),`M${m}: fonte v2.3 ausente`);
  check(mod.audit?.sourceItems===15,`M${m}: sourceItems != 15`);
  check(mod.audit?.executableItems===15,`M${m}: executableItems != 15`);
  check(mod.audit?.blockedItems===0,`M${m}: item bloqueado`);
  check(mod.audit?.englishReadingRequiredItems===0,`M${m}: leitura inglesa autônoma ainda requerida`);
  const qs=mod.activities.flatMap(a=>a.questions);
  check(qs.length===15,`M${m}: ${qs.length} questões`);
  const activityTopics=mod.activities.map(a=>a.topic);
  check(activityTopics.every(t=>t && !String(t).includes("&")),`M${m}: tópico genérico/misto detectado: ${activityTopics.join(", ")}`);
  for(const q of qs){
    all.push(q);
    check(q.metadata?.sourceVersion==="2.3",`${q.id}: sourceVersion != 2.3`);
    check(q.metadata?.englishReadingRequired===false,`${q.id}: englishReadingRequired não é false`);
    check(q.metadata?.readingDependency==="NÃO",`${q.id}: Leitura não marcada NÃO`);
    check(q.metadata?.audioRepeatableWithoutPenalty===true,`${q.id}: áudio não repetível`);
    check(q.metadata?.retryPolicy?.secondAttempt===true,`${q.id}: 2ª tentativa ausente`);
    check(q.metadata?.retryPolicy?.lifePenalty===false,`${q.id}: vida usada como penalidade`);
    check(typeof q.instruction==="string" && q.instruction.length<=40,`${q.id}: comando longo`);
    check(q.metadata?.topic && q.metadata.topic===q.metadata.topic.toUpperCase(),`${q.id}: tópico inteligente ausente`);
    const presentation=q.metadata?.optionPresentation;
    if(presentation==="AUDIO_PRIMARY_WRITTEN_HIDDEN"){
      const src=q.metadata.sourceAlternativesV23;
      check(q.alternatives.length===src.length,`${q.id}: alternativas divergentes`);
      q.alternatives.forEach((alt,index)=>{
        check(/^🔊 [A-D]$/.test(alt.text),`${q.id}: texto inglês visível em alternativa ${index+1}: ${alt.text}`);
        check(alt.audio?.enabled===true,`${q.id}: alternativa ${index+1} sem áudio`);
        check(typeof alt.audio?.text==="string" && alt.audio.text.length>0,`${q.id}: alternativa ${index+1} sem fala`);
        check(alt.metadata?.writtenLabelVisibleBeforeAnswer===false,`${q.id}: grafia pré-resposta não bloqueada`);
      });
    }
    if(presentation==="IMAGE_PRIMARY_NO_ENGLISH_TEXT"){
      const items=q.metadata?.targetShooter?.items||[];
      check(items.length===4,`${q.id}: audio→imagem sem 4 alvos`);
      check(items.every(it=>it.display==="image" && !it.label),`${q.id}: alvo audio→imagem expõe texto`);
    }
  }
}

check(all.length===90,`Total ${all.length}, esperado 90`);
check(new Set(all.map(q=>q.id)).size===90,"IDs duplicados");
const counts=all.reduce((acc,q)=>(acc[q.metadata.sourceStatus]=(acc[q.metadata.sourceStatus]||0)+1,acc),{});
check(counts.Ajustar===74 && counts.Reescrever===16,`Status v2.3 divergente ${JSON.stringify(counts)}`);

for(const q of all){
  const c=canonical(q.id,q.metadata.sourcePromptV23,q.metadata.sourceAlternativesV23,q.metadata.sourceAnswerV23);
  check(sha(c)===signatures.items[q.id],`${q.id}: assinatura editorial v2.3 divergente`);
}
const ordered=[...all].sort((a,b)=>a.id.localeCompare(b.id));
const overall=sha(ordered.map(q=>canonical(q.id,q.metadata.sourcePromptV23,q.metadata.sourceAlternativesV23,q.metadata.sourceAnswerV23)));
check(overall===signatures.overallSha256,`Assinatura global divergente ${overall}`);

const byId=Object.fromEntries(all.map(q=>[q.id,q]));
check(byId["EN2-M1-08"]?.delivery?.mechanic==="word-slash","EN2-M1-08 não está em Word Slash");
check(byId["EN2-M1-08"]?.metadata?.PED15?.status==="GATED_PASS_CANDIDATE","EN2-M1-08 sem PED-15");
check(all.filter(q=>q.delivery?.mechanic==="word-slash").map(q=>q.id).join(",")==="EN2-M1-08","Word Slash fora do único item autorizado");

const m112=byId["EN2-M1-12"];
check(m112?.metadata?.firstListenGate?.required===true,"EN2-M1-12 sem first-listen gate");
check(m112.metadata.firstListenGate.visibleLettersBeforeFirstListen===false,"EN2-M1-12 revela letras antes da primeira escuta");
check(m112.metadata.editorialAnswer==="LEO","EN2-M1-12 resposta editorial não preservada");

for(const id of ["EN2-M6-11","EN2-M6-12"]){
  const q=byId[id];
  check(q.delivery?.mechanic==="target-shooter",`${id}: não está em Target Shooter`);
  check(q.metadata?.optionPresentation==="IMAGE_PRIMARY_NO_ENGLISH_TEXT",`${id}: texto exposto antes da resposta`);
  check((q.metadata?.targetShooter?.items||[]).every(it=>it.display==="image"&&!it.label),`${id}: alvo não visual`);
}
for(const id of ["EN2-M3-03","EN2-M3-04","EN2-M6-01","EN2-M6-02","EN2-M6-03","EN2-M6-04","EN2-M6-05","EN2-M6-06","EN2-M6-11","EN2-M6-12"]){
  check(byId[id]?.metadata?.assetAudit==="EXACT_EXISTING_REPOSITORY_ASSET",`${id}: asset exato existente não conectado`);
}

const visibleEnglishLeaks=all.filter(q=>{
  if(q.metadata?.optionPresentation!=="AUDIO_PRIMARY_WRITTEN_HIDDEN") return false;
  const src=(q.metadata.sourceAlternativesV23||[]).map(s=>String(s).toLowerCase());
  return (q.alternatives||[]).some(a=>src.includes(String(a.text).toLowerCase()));
});
check(visibleEnglishLeaks.length===0,`Grafia inglesa usada como alternativa primária: ${visibleEnglishLeaks.map(q=>q.id).join(", ")}`);

console.log("DUDUQ YEAR2 v2.3 MULTIMODAL STRUCTURAL QA: PASS");
console.log(JSON.stringify({
  ids:all.length,
  status:counts,
  readingRequired:0,
  blocked:0,
  wordSlash:["EN2-M1-08"],
  m112FirstListen:true,
  m6AudioImage:["EN2-M6-11","EN2-M6-12"],
  exactExistingAssetItems:10,
  overallSha256:overall
},null,2));
