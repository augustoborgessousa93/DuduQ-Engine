/* DUDUQ English Y4 M05 — Phase 2 Smart Sentence pilot contracts
   Builds only the five pedagogically approved Smart Sentence items.
   This file is NOT wired into module-05/index.html while ASSET_GAP remains.
*/
(function(root,factory){
  "use strict";
  const api=factory(root?.DuduQPedagogicalOrchestrator);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY4M05Phase2Smart=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(Orchestrator){
  "use strict";
  const PROFILE="Y4_FUNCTIONAL_READING";
  const SMART_VERSION="4.0.20";

  const ANALYSIS=Object.freeze({
    "EN4-M5-06":Object.freeze({
      interactionIntent:"complete_sentence",readingDemand:"R2",requiredModalities:["image","text"],
      recommendedMechanic:"smart-sentence",secondChoice:"drag-drop",smartMode:"complete-sentence",
      linguisticTarget:"blue",imageConcept:"blue jacket",imageRole:"visual stimulus",
      audioRequirement:"SUPPORTIVE_REPEATABLE",audioText:"What color is the jacket? It's..."
    }),
    "EN4-M5-07":Object.freeze({
      interactionIntent:"functional_label_completion",readingDemand:"R3",requiredModalities:["image","text"],
      recommendedMechanic:"smart-sentence",secondChoice:"drag-drop",smartMode:"complete-sentence",
      linguisticTarget:"medium",imageConcept:"clothes-size:dress:medium",imageRole:"functional label stimulus",
      audioRequirement:"OPTIONAL_ACCESSIBILITY_READING_REMAINS_EVIDENCE",audioText:"What size is the dress? It's..."
    }),
    "EN4-M5-12":Object.freeze({
      interactionIntent:"image_sentence_location_interpretation",readingDemand:"R3",requiredModalities:["image","text"],
      recommendedMechanic:"smart-sentence",smartMode:"image-sentence",
      linguisticTarget:"She’s in the kitchen.",imageConcept:"person-room:maya:kitchen",imageRole:"semantic scene stimulus",
      audioRequirement:"OPTIONAL_ACCESSIBILITY",audioText:"Where is Maya?"
    }),
    "EN4-M5-13":Object.freeze({
      interactionIntent:"image_sentence_location_interpretation",readingDemand:"R3",requiredModalities:["image","text"],
      recommendedMechanic:"smart-sentence",smartMode:"image-sentence",
      linguisticTarget:"He’s in the living room.",imageConcept:"person-room:leo:living-room",imageRole:"semantic scene stimulus",
      audioRequirement:"OPTIONAL_ACCESSIBILITY",audioText:"Where is Leo?"
    }),
    "EN4-M5-14":Object.freeze({
      interactionIntent:"scene_sentence_location_interpretation",readingDemand:"R3",requiredModalities:["image","text"],
      recommendedMechanic:"smart-sentence",smartMode:"image-sentence",
      linguisticTarget:"They’re in the dining room.",imageConcept:"room-scene:dining-room",imageRole:"semantic scene stimulus",
      audioRequirement:"OPTIONAL_ACCESSIBILITY_PENDING_LOCALE_QA",audioText:""
    })
  });

  const SMART_IDS=Object.freeze(Object.keys(ANALYSIS));
  const DIFFICULTY_MAP=Object.freeze({"fácil":"easy","facil":"easy","média":"medium","media":"medium","difícil":"hard","dificil":"hard"});
  function text(v,f=""){const s=String(v??"").trim();return s||f}
  function normalizeDifficulty(value){return DIFFICULTY_MAP[text(value).toLowerCase()]||text(value,"easy").toLowerCase()}
  function tokenFromAlternative(alternative){return{id:alternative.id,value:text(alternative.text),label:text(alternative.text),spokenText:text(alternative.audioText,alternative.text)}}
  function invariantFromSource(source,analysis){return{
    id:source.id,
    skill:source.skill,
    answer:{id:source.answer?.id,text:source.answer?.text},
    difficulty:source.difficulty,
    linguisticTarget:analysis.linguisticTarget
  }}

  function buildSmartQuestion(source,analysis,assetRecord){
    if(!source||source.id!==source?.id)throw new Error("Source item inválido.");
    if(!SMART_IDS.includes(source.id))throw new Error(`Item fora do piloto Smart Sentence: ${source.id}`);
    if(!Array.isArray(source.alternatives)||source.alternatives.length!==4)throw new Error(`${source.id}: quatro alternativas editoriais esperadas.`);
    if(!source.alternatives.some(a=>a.id===source.answer?.id&&a.text===source.answer?.text))throw new Error(`${source.id}: resposta editorial não corresponde às alternativas.`);

    const tokens=source.alternatives.map(tokenFromAlternative);
    const canonicalOk=assetRecord?.canonicalStatus==="CANONICAL_ASSET_OK"&&text(assetRecord.resolvedUrl);
    const image=canonicalOk?{
      src:assetRecord.resolvedUrl,
      assetKey:text(assetRecord.resolvedKey),
      alt:text(assetRecord.altText,analysis.imageConcept)
    }:null;
    const isComplete=analysis.smartMode==="complete-sentence";
    const sentence=isComplete
      ? (source.id==="EN4-M5-06"?"What color is the jacket? It’s ___.":"What size is the dress? It’s ___.")
      : "";

    const smartSentence={
      mode:analysis.smartMode,
      instruction:source.prompt,
      instructionSpoken:analysis.audioText||undefined,
      sentence,
      options:tokens,
      answer:source.answer.text,
      image,
      imageAlt:text(assetRecord?.altText,analysis.imageConcept),
      interaction:{tap:true,drag:false,reorder:false,remove:true,shuffle:true},
      hints:[{afterErrors:1,text:"Observe novamente a imagem e compare as opções."}],
      feedback:{correct:"Muito bem!",incorrect:"Observe a pista e tente outra vez."},
      difficulty:{level:normalizeDifficulty(source.difficulty)==="hard"?3:normalizeDifficulty(source.difficulty)==="medium"?2:1,hintAfterErrors:1}
    };
    if(!smartSentence.instructionSpoken)delete smartSentence.instructionSpoken;

    return{
      id:source.id,
      sourceId:source.id,
      subject:"english",year:4,module:5,
      skill:{code:null,description:source.skill},
      difficulty:normalizeDifficulty(source.difficulty),
      statement:source.prompt,
      instruction:source.prompt,
      alternatives:source.alternatives.map(a=>({id:a.id,text:a.text})),
      answer:{type:"single",value:source.answer.id},
      feedback:{correct:"Muito bem!",incorrect:"Observe a pista e tente outra vez.",language:"pt-BR"},
      delivery:{mechanic:"smart-sentence",preferred:["smart-sentence"],blocked:[]},
      metadata:{
        interactionIntent:analysis.interactionIntent,
        readingDemand:analysis.readingDemand,
        requiredModalities:[...analysis.requiredModalities],
        smartSentence,
        technicalContract:{mechanic:"smart-sentence",adapterVersion:SMART_VERSION,mode:analysis.smartMode,contract:"metadata.smartSentence"},
        imageRequirement:{required:true,concept:analysis.imageConcept,role:analysis.imageRole,canonicalStatus:canonicalOk?"CANONICAL_ASSET_OK":"ASSET_GAP",resolvedKey:canonicalOk?assetRecord.resolvedKey:null},
        audioRequirement:analysis.audioRequirement,
        sourceInvariant:invariantFromSource(source,analysis),
        runtimeReady:Boolean(canonicalOk)
      }
    };
  }

  function build(sourceItems,{assets={}}={}){
    if(!Array.isArray(sourceItems))throw new Error("sourceItems deve ser array.");
    const sourceById=new Map(sourceItems.map(item=>[item.id,item]));
    return SMART_IDS.map(id=>{
      const source=sourceById.get(id);if(!source)throw new Error(`Source ID ausente: ${id}`);
      const analysis=ANALYSIS[id];
      if(Orchestrator){
        const reading=Orchestrator.readingDemandGate(analysis,PROFILE);
        const eligibility=Orchestrator.mechanicEligibilityAudit(analysis,"smart-sentence",PROFILE);
        if(reading.status!=="PASS"||eligibility.status!=="PASS")throw new Error(`${id}: Smart Sentence bloqueado pelos gates.`);
      }
      return buildSmartQuestion(source,analysis,assets[id]);
    });
  }

  return Object.freeze({version:"1.0.0-phase2",profile:PROFILE,smartVersion:SMART_VERSION,ids:SMART_IDS,analysis:ANALYSIS,build,buildSmartQuestion});
});
