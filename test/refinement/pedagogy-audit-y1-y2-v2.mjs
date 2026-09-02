import { chromium } from "playwright";

const BASE=process.env.BASE_URL||"http://127.0.0.1:4173";
const findings=[];const modules=[];const testGaps=[];
const add=(severity,gate,year,module,id,detail)=>findings.push({severity,gate,year,module,id,detail});
const gap=(gate,year,module,id,detail)=>testGaps.push({gate,year,module,id,detail});
const text=v=>String(v??"").trim();
const norm=v=>text(v).toLowerCase().replace(/[“”‘’]/g,'"').replace(/\s+/g," ");
const bool=v=>v===true;

function walkStrings(value,out=[],seen=new Set()){
  if(value==null)return out;
  if(typeof value==="string"){out.push(value);return out}
  if(typeof value!=="object"||seen.has(value))return out;seen.add(value);
  for(const v of Object.values(value))walkStrings(v,out,seen);return out;
}
function hasImage(q){
  const strings=walkStrings({image:q?.image,media:q?.media?.image,payload:q?.payload,targets:q?.metadata?.targets,targetShooter:q?.metadata?.targetShooter});
  return strings.some(s=>/^(?:https?:|data:image|blob:)|\.(?:png|jpe?g|webp|gif)(?:\?|$)/i.test(s))||Boolean(q?.payload?.items?.some?.(x=>x?.imageAsset||x?.imageAssetKey||x?.imageUrl)||q?.payload?.targets?.some?.(x=>x?.imageAsset||x?.imageAssetKey||x?.imageUrl));
}
function hasAudio(q){
  if(q?.audio?.enabled&&(q.audio.src||q.audio.text||q.audio.spokenText))return true;
  if(q?.metadata?.stimulusAudio?.enabled&&(q.metadata.stimulusAudio.src||q.metadata.stimulusAudio.text))return true;
  if(text(q?.metadata?.targetShooter?.audioText))return true;
  const values=[...(q?.alternatives||[]),...(q?.payload?.items||[]),...(q?.payload?.targets||[])];
  return values.some(v=>(v?.audio?.enabled&&(v.audio.src||v.audio.text))||text(v?.spokenText)||text(v?.audioDescription));
}
function hasInstructionAudio(q){
  const x=q?.metadata?.instructionAudio||q?.metadata?.instructionAudioFallback||q?.pedagogy?.instructionAudio;
  return Boolean(x&&(x.enabled!==false)&&(x.text||x.src||x.mode||x.fallback));
}
function mechanicOf(a,q){return text(a?.mechanic||q?.delivery?.mechanic||q?.renderer).toLowerCase().replace(/_/g,"-")}
function answerIntegrity(q){
  const type=text(q?.answer?.type).toLowerCase(),value=q?.answer?.value,alts=(q?.alternatives||[]).map(a=>text(a?.id)).filter(Boolean);
  if(type==="single")return alts.includes(text(value));
  if(type==="sequence")return Array.isArray(value)&&value.length>0&&value.every(v=>alts.includes(text(v)));
  if(type==="pairs")return Array.isArray(value)&&value.length>0&&value.every(v=>text(v?.source||v?.itemId)&&text(v?.target||v?.targetId));
  return Boolean(type&&value!=null);
}
function sourceIntegrity(q){
  const m=q?.metadata||{};
  const answer=m.sourceAnswerV23 ?? m.sourceAnswer;
  const alternatives=m.sourceAlternativesV23 ?? m.sourceAlternatives;
  if(answer==null||!Array.isArray(alternatives)||alternatives.length===0)return {status:"N/A"};
  const aId=typeof answer==="object"?text(answer.id??answer.value):"";
  const aText=typeof answer==="object"?text(answer.text??answer.label??answer.answer):text(answer);
  const source=alternatives.map((alt,index)=>({
    id:typeof alt==="object"?text(alt.id??alt.value):"",
    text:typeof alt==="object"?text(alt.text??alt.label??alt.value):text(alt),
    index
  }));
  const match=source.some(alt=>(aId&&alt.id&&aId===alt.id)||(aText&&alt.text&&norm(aText)===norm(alt.text))||(aText&&alt.id&&aText===alt.id));
  if(match)return {status:"PASS"};
  return {status:"FAIL",answer:{id:aId,text:aText},alternatives:source};
}
function readingRisk(q,year){
  const m=q?.metadata||{},p=m?.pedagogy||{};
  if(bool(m.readingEssential)||bool(m.englishReadingRequired)||bool(m.autonomousEnglishReadingRequired)||bool(p.readingEssential)||bool(p.requiresIndependentReading))return "explicit-reading-required";
  const mech=text(q?.delivery?.mechanic||q?.renderer).toLowerCase();
  const altText=(q?.alternatives||[]).map(a=>text(a?.text)).filter(Boolean);
  const visual=hasImage(q),audio=hasAudio(q);
  if(altText.length>=2&&!visual&&!audio&&["smart-sentence","matching","drag-drop","target-shooter","bubble-pop","word-slash"].includes(mech))return "text-only-answer-path";
  if(year===1&&mech==="smart-sentence")return "scored-smart-sentence-year1";
  return null;
}
function motorRisk(q){
  const ts=q?.metadata?.targetShooter?.difficulty||{};
  if(Number(ts.timeLimitMs||0)>0||String(ts.timerMode||"none").toLowerCase()!=="none")return `timer=${ts.timeLimitMs||ts.timerMode}`;
  if(Number(ts.targetSize||999)<44)return `targetSize=${ts.targetSize}`;
  return null;
}

const browser=await chromium.launch({headless:true});
try{
  for(let year=1;year<=2;year++)for(let module=1;module<=6;module++){
    const page=await browser.newPage({viewport:{width:1366,height:768}});const pageErrors=[];const critical404=[];
    page.on("pageerror",e=>pageErrors.push(String(e?.message||e)));
    page.on("response",r=>{if(r.status()===404){const u=r.url();if(u.includes("/engine/")||u.includes(`/content/english/year-${year}/`))critical404.push(u)}});
    try{
      const mm=String(module).padStart(2,"0");const res=await page.goto(`${BASE}/content/english/year-${year}/module-${mm}/?qa=pedagogy-audit-v2`,{waitUntil:"domcontentloaded",timeout:35000});
      if(!res?.ok()){add("P0","RUNTIME",year,module,"MODULE",`HTTP ${res?.status()}`);continue}
      await page.waitForFunction(()=>window.DUDUQ_ENGINE_READY===true,null,{timeout:35000});
      const mod=await page.evaluate(({year,module})=>{function walk(v,seen=new Set()){if(!v||typeof v!=="object"||seen.has(v))return null;seen.add(v);if(Array.isArray(v.activities)&&Number(v.year)===year&&Number(v.module)===module)return v;for(const child of Object.values(v)){const f=walk(child,seen);if(f)return f}return null}return walk(window.DUDUQ_CONTENT||{})},{year,module});
      if(!mod){add("P0","SOURCE",year,module,"MODULE","conteúdo materializado não localizado");continue}
      const questions=[];for(const a of mod.activities||[])for(const q of a.questions||[])questions.push({a,q});
      modules.push({year,module,title:mod.title||"",version:mod.version||"",items:questions.length});
      const profile=text(mod?.pedagogyPolicy?.profile||mod?.normativeProfile?.profile||mod?.pedagogicalProfile?.profile);
      if(profile&&profile!==(year===1?"Y1_EARLY_LITERACY":"Y2_FOUNDATIONAL_LITERACY"))add("P0","PED-01",year,module,"MODULE",`yearProfile=${profile}`);
      for(const {a,q} of questions){
        const id=text(q?.id)||"UNKNOWN";const am=text(a?.mechanic).toLowerCase().replace(/_/g,"-");const qm=mechanicOf(a,q);
        if(am&&qm&&am!==qm)add("P0","PED-04",year,module,id,`activity=${am}; question=${qm}`);
        const rr=readingRisk(q,year);if(rr)add("P0","PED-02",year,module,id,rr);
        if(!answerIntegrity(q))add("P0","PED-11",year,module,id,"runtime answer contract inválido");
        const si=sourceIntegrity(q);if(si.status==="FAIL")add("P0","PED-11",year,module,id,`resposta oficial não pertence às alternativas oficiais: ${JSON.stringify(si)}`);else if(si.status==="N/A")gap("PED-11",year,module,id,"metadados de resposta/alternativas oficiais insuficientes para cross-check textual");
        const sourceMedia=text(q?.metadata?.sourceMedia).toLowerCase();
        if(/áudio|audio/.test(sourceMedia)&&/(obrigat|required)/.test(sourceMedia)&&!hasAudio(q))add("P0","PED-05",year,module,id,"áudio obrigatório sem representação executável");
        if(/imagem|image/.test(sourceMedia)&&/(obrigat|required)/.test(sourceMedia)&&!hasImage(q))add("P0","PED-06",year,module,id,"imagem obrigatória sem representação executável");
        if(!hasInstructionAudio(q))add("P1","PED-05",year,module,id,"instrução pt-BR sem instructionAudio/fallback explícito");
        const feedback=text(q?.feedback?.incorrect);if(!feedback)add("P1","PED-07",year,module,id,"feedback de erro ausente");else if(!/tent|again|novamente|ouça|observe|pista/i.test(feedback))add("P1","PED-07",year,module,id,"feedback sem pista/nova tentativa explícita");
        const mr=motorRisk(q);if(mr)add("P0","PED-08",year,module,id,mr);
      }
      for(const e of pageErrors)add("P0","RUNTIME",year,module,"MODULE",`pageError: ${e}`);for(const u of critical404)add("P0","RUNTIME",year,module,"MODULE",`critical404: ${u}`);
    }finally{await page.close()}
  }
}finally{await browser.close()}

const byYear={};for(const year of [1,2])byYear[year]={P0:findings.filter(f=>f.year===year&&f.severity==="P0").length,P1:findings.filter(f=>f.year===year&&f.severity==="P1").length,TEST_GAP:testGaps.filter(f=>f.year===year).length};
console.log(JSON.stringify({status:"AUDIT_COMPLETE",modules:modules.length,items:modules.reduce((n,m)=>n+m.items,0),byYear,findings,testGaps,modules},null,2));
if(modules.length!==12)throw new Error(`audit incompleto: ${modules.length}/12 módulos`);
