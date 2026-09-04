/* Y4 M05 Phase 2 — Target Shooter visual-recognition builder.
   Fail closed: no runtime payload unless question-image capability and every
   canonical visual required by the item are proven.
*/
(function(root,factory){
  "use strict";
  const api=factory(root?.DuduQPedagogicalOrchestrator,root?.DuduQY4M05Phase2Plan);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY4M05Phase2Target=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(Orchestrator,Plan){
  "use strict";
  const TARGET_VERSION="1.0.21";
  const RUNTIME_VERSION="2.0.2";
  const TARGET_IDS=Object.freeze(["EN4-M5-01","EN4-M5-02","EN4-M5-03","EN4-M5-04","EN4-M5-05","EN4-M5-08","EN4-M5-09","EN4-M5-10","EN4-M5-11","EN4-M5-15"]);
  const ALLOWED_INTENTS=new Set(["visual_lexical_identification","visual_attribute_chunk_identification","visual_recognition"]);
  function text(v,f=""){const s=String(v??"").trim();return s||f}
  function canonical(record){return record?.canonicalStatus==="CANONICAL_ASSET_OK"&&Boolean(text(record.resolvedUrl))}
  function sourceInvariant(source,analysis){return{id:source.id,skill:source.skill,answer:{id:source.answer?.id,text:source.answer?.text},difficulty:source.difficulty,linguisticTarget:analysis.linguisticTarget}}

  function normalizeAssets(source,assetRecord){
    const missing=[];
    const stimulus=assetRecord?.stimulus;
    if(!canonical(stimulus))missing.push("stimulus");
    const targets={};
    (source.alternatives||[]).forEach(option=>{
      const record=assetRecord?.targets?.[option.id];
      if(!canonical(record))missing.push(`target:${option.id}`);
      else targets[option.id]=record;
    });
    return{stimulus,targets,missing};
  }

  function buildTargetShooter(source,analysis,{assetRecord,questionImageCapability=false}={}){
    if(!TARGET_IDS.includes(source?.id))throw new Error(`Item fora do piloto Target Shooter: ${source?.id||"sem-id"}`);
    if(!ALLOWED_INTENTS.has(analysis?.interactionIntent))return{sourceId:source.id,status:"MECHANIC_REVIEW_REQUIRED",reason:"INTENT_NOT_VISUAL_RECOGNITION",payload:null};
    if(!Array.isArray(source.alternatives)||source.alternatives.length!==4)throw new Error(`${source.id}: quatro alternativas editoriais esperadas.`);
    if(!source.alternatives.some(a=>a.id===source.answer?.id&&a.text===source.answer?.text))throw new Error(`${source.id}: resposta editorial não corresponde às alternativas.`);
    const eligibility=Orchestrator?.mechanicEligibilityAudit?.(analysis,"target-shooter","Y4_FUNCTIONAL_READING");
    if(eligibility&&eligibility.status!=="PASS")return{sourceId:source.id,status:"MECHANIC_REVIEW_REQUIRED",reason:"MECHANIC_ELIGIBILITY_FAIL",eligibility,payload:null};

    const assets=normalizeAssets(source,assetRecord);
    if(!questionImageCapability)return{sourceId:source.id,status:"BLOCKED",reason:"TARGET_QUESTION_IMAGE_CAPABILITY_NOT_PROVEN",missingAssets:assets.missing,payload:null};
    if(assets.missing.length)return{sourceId:source.id,status:"BLOCKED",reason:"ASSET_GAP",missingAssets:assets.missing,payload:null};

    const items=source.alternatives.map(option=>{
      const record=assets.targets[option.id];
      return{
        id:option.id,label:option.text,display:"both",
        image:record.resolvedUrl,imageAssetKey:record.resolvedKey,imageAlt:text(record.altText,option.text)
      };
    });
    const payload={
      id:source.id,sourceId:source.id,subject:"english",year:4,module:5,
      skill:{code:null,description:source.skill},difficulty:text(source.difficulty).toLowerCase(),
      statement:source.prompt,instruction:source.prompt,
      alternatives:source.alternatives.map(a=>({id:a.id,text:a.text})),
      answer:{type:"single",value:source.answer.id},
      feedback:{correct:"Muito bem!",incorrect:"Observe novamente e tente outra vez.",language:"pt-BR"},
      delivery:{mechanic:"target-shooter",preferred:["target-shooter"],blocked:[]},
      metadata:{
        interactionIntent:analysis.interactionIntent,readingDemand:analysis.readingDemand,requiredModalities:[...analysis.requiredModalities],
        targetShooter:{
          mode:"visual-recognition",shape:"shield",
          instructionImage:assets.stimulus.resolvedUrl,
          instructionImageAssetKey:assets.stimulus.resolvedKey,
          instructionImageAlt:text(assets.stimulus.altText,analysis.linguisticTarget),
          items,correctIds:[source.answer.id],
          difficulty:{speed:.48,objectCount:4,spawnIntervalMs:170,requiredCorrect:1,targetSize:150,timeLimitMs:0,timerMode:"none"}
        },
        technicalContract:{mechanic:"target-shooter",adapterVersion:TARGET_VERSION,runtimeVersion:RUNTIME_VERSION,questionImageCapability:"REQUIRED"},
        sourceInvariant:sourceInvariant(source,analysis),runtimeReady:true
      }
    };
    return{sourceId:source.id,status:"BUILT",reason:"ALL_GATES_PROVEN",payload};
  }

  function build(sourceItems,{plan=Plan?.plan||{},assets={},questionImageCapability=false}={}){
    const byId=new Map((sourceItems||[]).map(item=>[item.id,item]));
    return TARGET_IDS.map(id=>{
      const source=byId.get(id);if(!source)throw new Error(`Source ID ausente: ${id}`);
      const analysis=plan[id];if(!analysis)throw new Error(`Análise ausente: ${id}`);
      return buildTargetShooter(source,analysis,{assetRecord:assets[id],questionImageCapability});
    });
  }

  return Object.freeze({version:"1.0.0-phase2",targetVersion:TARGET_VERSION,runtimeVersion:RUNTIME_VERSION,ids:TARGET_IDS,build,buildTargetShooter});
});
