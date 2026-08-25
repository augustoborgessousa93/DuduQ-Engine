/* DUDUQ English Year 2 — v2.3 multimodal adapter
   Wraps the already-homologated Factory v1.2 runtime compatibility layer.
   This layer changes editorial presentation/UX, not IDs or scoring targets.
*/
(function(){
"use strict";
const baseFactory=window.DuduQYear2V22Factory;
if(!baseFactory||typeof baseFactory.buildModule!=="function"){
  throw new Error("[DuduQ Year2 v2.3] Factory base indisponível.");
}
const SOURCE_VERSION="2.3";
const ADAPTER_VERSION="2.3.0-multimodal-a";
const ALLOWED_TOPICS=new Set(["GREETINGS","ALPHABET","NUMBERS","FAMILY","TOYS","COLORS","ANIMALS","SHAPES","BODY","FOOD","VEGETABLES","FRUITS","SIZE"]);
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v))}
function spokenCommand(text){
  const s=String(text||"");
  if(/MONTE/i.test(s)) return "Ouça e monte.";
  if(/TOQUE/i.test(s)) return "Ouça e toque.";
  if(/VEJA/i.test(s)&&/OUÇA/i.test(s)) return "Veja, ouça e escolha.";
  return "Ouça e escolha.";
}
function indexLetter(index){return String.fromCharCode(65+index)}
function mechanicByQuestion(module){
  const out=new Map();
  for(const activity of module.activities||[]) for(const q of activity.questions||[]) out.set(q.id,activity.mechanic||q.delivery?.mechanic);
  return out;
}
function postProcessQuestion(q,item,plan){
  q.metadata=q.metadata||{};
  q.metadata.sourceVersion=SOURCE_VERSION;
  q.metadata.sourceDocument="DUDUQ_Ingles_1ao5_Revisao_Alfabetizacao_Multimodal_v2.3";
  q.metadata.sourcePromptV23=item.prompt;
  q.metadata.sourceAlternativesV23=clone(item.alternatives);
  q.metadata.sourceAlternativeTypesV23=clone(item.alternativeTypes||[]);
  q.metadata.sourceAnswerV23=item.answer;
  q.metadata.sourceStatus=item.status;
  q.metadata.topic=plan.topic||item.topic||"";
  q.metadata.englishReadingRequired=false;
  q.metadata.readingDependency="NÃO";
  q.metadata.writtenEnglishRole="EXPOSIÇÃO_PÓS_RESPOSTA";
  q.metadata.multimodalResolution=true;
  q.metadata.audioRepeatableWithoutPenalty=true;
  q.metadata.retryPolicy={secondAttempt:true,lifePenalty:false,timePenalty:false,replayAudio:true};
  q.metadata.correctAnswerReinforcement={
    spokenText:item.answer,
    writtenText:item.answer,
    language:"en-US",
    revealWrittenAfterResponse:true
  };
  q.statement=plan.studentCommand||"🔊 OUÇA E ESCOLHA";
  q.instruction=q.statement;
  q.metadata.instructionAudio={enabled:true,text:spokenCommand(q.statement),language:"pt-BR",repeatable:true};
  q.feedback=q.feedback||{};
  q.feedback.correct="✅ Muito bem!";
  q.feedback.incorrect="🔊 Ouça novamente e tente outra vez.";
  q.feedback.language="pt-BR";

  const sourceAlts=item.alternatives||[];
  const optionAudioTexts=plan.optionAudioTexts||sourceAlts;
  if(plan.hideOptionTextBeforeAnswer===true){
    (q.alternatives||[]).forEach((alt,index)=>{
      const sourceText=sourceAlts[index]??alt.text??"";
      alt.metadata={...(alt.metadata||{}),sourceWrittenLabel:sourceText,writtenLabelVisibleBeforeAnswer:false};
      alt.text=`🔊 ${indexLetter(index)}`;
      alt.audio={enabled:true,text:String(optionAudioTexts[index]??sourceText),language:"en-US",role:"option"};
    });
    q.metadata.optionPresentation="AUDIO_PRIMARY_WRITTEN_HIDDEN";
  }
  if(plan.mode==="audio-image"){
    (q.alternatives||[]).forEach((alt,index)=>{
      alt.metadata={...(alt.metadata||{}),sourceWrittenLabel:sourceAlts[index]??"",writtenLabelVisibleBeforeAnswer:false};
      alt.text=`🖼️ ${indexLetter(index)}`;
    });
    if(q.metadata?.targetShooter?.items){
      q.metadata.targetShooter.items=q.metadata.targetShooter.items.map((it,index)=>({...it,label:"",display:"image"}));
    }
    q.metadata.optionPresentation="IMAGE_PRIMARY_NO_ENGLISH_TEXT";
  }
  if(plan.mode==="letter-choice"){
    q.metadata.optionPresentation="ISOLATED_LETTER_SYMBOLS";
    q.metadata.englishWordReadingRequired=false;
  }
  if(plan.mode==="spelling-build"){
    q.metadata.optionPresentation="MOVABLE_LETTERS_AFTER_FIRST_LISTEN";
    q.metadata.englishWordReadingRequired=false;
  }
  return q;
}
function regroup(module,config,mechanicMap){
  const sourceById=new Map((config.items||[]).map(i=>[i.id,i]));
  const plan=config.plan||{};
  const flat=[];
  for(const activity of module.activities||[]) for(const q of activity.questions||[]) flat.push(q);
  const activities=[];
  let current=null;
  for(const q of flat){
    const item=sourceById.get(q.id);
    const p=plan[q.id]||{};
    if(!item) throw new Error(`Fonte v2.3 ausente para ${q.id}`);
    postProcessQuestion(q,item,p);
    const mechanic=mechanicMap.get(q.id)||q.delivery?.mechanic||p.mechanic;
    const topic=String(q.metadata.topic||"").toUpperCase();
    if(topic&&!ALLOWED_TOPICS.has(topic)) q.metadata.topicAudit="CUSTOM_TOPIC";
    const own=p.forceOwnActivity===true||q.metadata?.forceOwnActivity===true;
    if(own||!current||current.mechanic!==mechanic||current.topic!==topic||current.questions.length>=4){
      current={
        id:`${q.id.toLowerCase()}-${String(mechanic).replace(/[^a-z0-9-]/gi,"-")}-${topic.toLowerCase().replace(/[^a-z0-9]+/g,"-")}`,
        title:topic||config.title,
        topic:topic||config.title,
        mechanic,
        skill:q.skill,
        questions:[]
      };
      activities.push(current);
    }
    current.questions.push(q);
    if(own) current=null;
  }
  return activities;
}
function buildModule(config){
  const cfg={...config,items:(config.items||[]).map(i=>({...i})),plan:{}};
  for(const [id,p] of Object.entries(config.plan||{})) cfg.plan[id]={...p};
  const base=baseFactory.buildModule(cfg);
  const mechanicMap=mechanicByQuestion(base);
  const activities=regroup(base,cfg,mechanicMap);
  const dist={};
  for(const a of activities) for(const q of a.questions) dist[a.mechanic]=(dist[a.mechanic]||0)+1;
  const allQuestions=activities.flatMap(a=>a.questions);
  return Object.freeze({
    ...base,
    id:`english-year-2-module-${String(config.module).padStart(2,"0")}-v23-multimodal`,
    version:ADAPTER_VERSION,
    description:`${config.title} — revisão multimodal v2.3 para 2º ano.`,
    source:{document:"DUDUQ • Língua Inglesa • Revisão Pedagógica Integral v2.3",pages:[...(config.pages||[])]},
    normativeProfile:{
      document:"DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.2",
      profile:"Y2_FOUNDATIONAL_LITERACY",
      reading:"R0 dominante / R1 apenas como exposição apoiada",
      centralRule:"A criança deve conseguir acertar sem leitura autônoma em inglês."
    },
    audioPolicy:{
      primary:"recorded-media",
      fallback:"speech-synthesis",
      instructionLanguage:"pt-BR",
      contentLanguage:"en-US",
      repeatable:true,
      noReplayPenalty:true,
      commercialRecordedAudioGate:true
    },
    visualPolicy:{
      mode:"EXISTING_ASSET_PLUS_PROVISIONAL",
      repositoryAssetsPreferred:true,
      provisionalEmojiVectorAllowed:true,
      replacementMustPreserveQuestionLogic:true
    },
    pedagogicalProfile:{...(config.pedagogicalProfile||{}),sourceVersion:SOURCE_VERSION},
    mechanicDistribution:dist,
    blockedItems:[],
    activities,
    audit:{
      sourceVersion:SOURCE_VERSION,
      sourceItems:(config.items||[]).length,
      executableItems:allQuestions.length,
      blockedItems:0,
      englishReadingRequiredItems:allQuestions.filter(q=>q.metadata?.englishReadingRequired!==false).length,
      writtenEnglishPreAnswerPrimaryItems:allQuestions.filter(q=>q.metadata?.optionPresentation==="WRITTEN_PRIMARY").length,
      commercialReady:false,
      pendingCommercialAudio:true
    }
  });
}
window.DuduQYear2V23Factory=Object.freeze({
  version:ADAPTER_VERSION,
  sourceVersion:SOURCE_VERSION,
  buildModule
});
})();
