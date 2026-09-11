/* DUDUQ English — shared pedagogical orchestration v1
   Extended for Y1/Y2 early-literacy recovery.
   No mechanic quotas. Fail-closed guards preserve the editorial construct.
*/
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQPedagogicalOrchestrator=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const READING_ORDER=Object.freeze({R0:0,R1:1,R2:2,R3:3,R4:4});
  const YEAR_PROFILES=Object.freeze({
    Y1_EARLY_LITERACY:Object.freeze({id:"Y1_EARLY_LITERACY",year:1,maxReading:"R0",independentReading:false,preferredMechanics:Object.freeze(["target-shooter","matching","bubble-pop"]),smartSentenceScored:false}),
    Y2_FOUNDATIONAL_LITERACY:Object.freeze({id:"Y2_FOUNDATIONAL_LITERACY",year:2,maxReading:"R1",independentReading:false,preferredMechanics:Object.freeze(["matching","target-shooter","bubble-pop"]),smartSentenceScored:false}),
    Y3_GUIDED_READING:Object.freeze({id:"Y3_GUIDED_READING",year:3,maxReading:"R2",independentReading:true}),
    Y4_FUNCTIONAL_READING:Object.freeze({id:"Y4_FUNCTIONAL_READING",year:4,maxReading:"R3",independentReading:true}),
    Y5_INTEGRATED_SKILLS:Object.freeze({id:"Y5_INTEGRATED_SKILLS",year:5,maxReading:"R4",independentReading:true})
  });

  const MECHANIC_PROFILES=Object.freeze({
    "smart-sentence":Object.freeze({maxReading:"R4",intents:["complete_sentence","build_sentence","word_order","image_sentence","dialogue_completion","functional_label_completion","image_sentence_location_interpretation","scene_sentence_location_interpretation"],modalities:["text","image","audio"],supportsRetry:true}),
    "target-shooter":Object.freeze({maxReading:"R3",intents:["visual_recognition","visual_lexical_identification","visual_attribute_chunk_identification","short_unambiguous_recognition"],modalities:["image","text","audio","symbol","numeral","context"],supportsRetry:true}),
    "matching":Object.freeze({maxReading:"R4",intents:["one_to_one_association","visual_recognition","visual_lexical_identification","short_unambiguous_recognition"],modalities:["image","text","audio","symbol","numeral","context"],supportsRetry:true}),
    "drag-drop":Object.freeze({maxReading:"R4",intents:["classification","spatial_placement","sequence","distribution","construction","meaningful_association","single_choice"],modalities:["image","text","audio","manipulation","symbol","numeral","context"],supportsRetry:true}),
    "bubble-pop":Object.freeze({maxReading:"R3",intents:["visual_recognition","visual_lexical_identification","visual_attribute_chunk_identification","short_unambiguous_recognition"],modalities:["image","text","audio","symbol","numeral","context"],supportsRetry:true}),
    "word-slash":Object.freeze({maxReading:"R3",intents:["lexical_discrimination"],modalities:["image","text","audio","manipulation"],supportsRetry:true})
  });

  const DRAG_ROLES=new Set(["classification","spatial-placement","sequence","distribution","construction","meaningful-association"]);
  const NON_READER_MODALITIES=new Set(["audio","image","symbol","numeral","context"]);
  const builders=new Map();

  function text(value,fallback=""){const out=String(value??"").trim();return out||fallback}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function pass(code,details={}){return{code,status:"PASS",...details}}
  function warn(code,details={}){return{code,status:"WARNING",...details}}
  function fail(code,details={}){return{code,status:"FAIL",...details}}
  function normalizeReading(value){const r=text(value).toUpperCase();if(!(r in READING_ORDER))throw new Error(`readingDemand inválido: ${value}`);return r}
  function getProfile(value){const key=typeof value==="string"?value:value?.id;const profile=YEAR_PROFILES[key];if(!profile)throw new Error(`Perfil de ano não homologado: ${key||value}`);return profile}
  function mechanicProfile(id,overrides){return{...(MECHANIC_PROFILES[id]||{}),...(overrides?.[id]||{})}}
  function alternatives(source){return Array.isArray(source?.alternatives)?clone(source.alternatives):[]}
  function answerValue(source){return source?.answer?.value??source?.sourceAnswer??null}
  function optionFrom(alt,index){
    const id=text(alt?.id,String.fromCharCode(65+index));
    const out={id,text:text(alt?.text||alt?.label),label:text(alt?.label||alt?.text),alt:text(alt?.alt||alt?.text)};
    const asset=text(alt?.imageAsset||alt?.assetKey||alt?.imageKey); if(asset)out.imageAsset=asset;
    const url=text(alt?.image||alt?.imageUrl||alt?.src); if(url)out.imageUrl=url;
    const spoken=text(alt?.spokenText||alt?.audioText||alt?.text); if(spoken){out.spokenText=spoken;out.speechLocale=text(alt?.speechLocale,"en-US")}
    const audio=text(alt?.audioSrc||alt?.audio); if(audio)out.audioSrc=audio;
    return out;
  }
  function stimulusFrom(source){
    const candidates=[source?.metadata?.matching,source?.metadata?.viewTargetSchool,source?.metadata?.viewTarget,source?.metadata?.visualTarget,source?.presentation];
    for(const c of candidates){
      if(!c)continue;
      const imageAsset=text(c.stimulusImageAsset||c.imageAsset||c.assetKey);
      const imageUrl=text(c.stimulusImage||c.imageUrl||c.image||c.src);
      if(imageAsset||imageUrl)return{imageAsset,imageUrl,alt:text(c.stimulusAlt||c.alt||c.contextAlt)};
    }
    return null;
  }

  function readingDemandGate(analysis,yearProfile){
    const profile=getProfile(yearProfile),demand=normalizeReading(analysis.readingDemand);
    return READING_ORDER[demand]<=READING_ORDER[profile.maxReading]?pass("READING_DEMAND_GATE",{readingDemand:demand,maxReading:profile.maxReading}):fail("READING_DEMAND_GATE",{readingDemand:demand,maxReading:profile.maxReading,reason:"READING_ABOVE_YEAR_PROFILE"});
  }

  function nonReaderGate(analysis,yearProfile){
    const profile=getProfile(yearProfile);
    if(profile.year>2)return pass("NON_READER_GATE",{applicable:false});
    if(analysis.autonomousEnglishReadingRequired===true)return fail("NON_READER_GATE",{reason:"AUTONOMOUS_ENGLISH_READING_REQUIRED"});
    const demand=normalizeReading(analysis.readingDemand);
    const evidence=[...(analysis.requiredModalities||[]),...(analysis.nonReaderEvidence||[])].map(v=>text(v).toLowerCase());
    const supports=[...new Set(evidence.filter(v=>NON_READER_MODALITIES.has(v)))];
    return demand==="R0"||supports.length?pass("NON_READER_GATE",{readingDemand:demand,supports}):fail("NON_READER_GATE",{readingDemand:demand,reason:"NON_READER_SUPPORT_REQUIRED"});
  }

  function motorDemandGate(analysis,yearProfile){
    const profile=getProfile(yearProfile),motor=text(analysis.motorDemand,"LOW").toUpperCase();
    return profile.year<=2&&["HIGH_PRECISION","TIMED_PRECISION","FINE_MOTOR_COMPLEX"].includes(motor)?fail("MOTOR_DEMAND_GATE",{motorDemand:motor,reason:"MOTOR_DEMAND_TOO_HIGH_FOR_EARLY_LITERACY"}):pass("MOTOR_DEMAND_GATE",{motorDemand:motor});
  }

  function operationalAvailabilityGate(mechanicId,context={}){
    if(!context.availableMechanics)return pass("OPERATIONAL_AVAILABILITY_GATE",{mechanic:mechanicId,availability:"NOT_RESTRICTED"});
    const available=context.availableMechanics instanceof Set?[...context.availableMechanics]:Array.isArray(context.availableMechanics)?context.availableMechanics:Object.keys(context.availableMechanics).filter(k=>context.availableMechanics[k]);
    return available.includes(mechanicId)?pass("OPERATIONAL_AVAILABILITY_GATE",{mechanic:mechanicId}):fail("OPERATIONAL_AVAILABILITY_GATE",{mechanic:mechanicId,reason:"MECHANIC_NOT_OPERATIONALLY_AVAILABLE"});
  }

  function microblockCoherenceGate(analysis,context={}){
    const mechanic=text(context.candidateMechanic||analysis.recommendedMechanic),previous=Array.isArray(context.previousMechanics)?context.previousMechanics:[];
    if(!mechanic)return pass("MICROBLOCK_COHERENCE_GATE",{mechanic:null,streak:0});
    let streak=1; for(let i=previous.length-1;i>=0&&previous[i]===mechanic;i-=1)streak+=1;
    return streak>4&&Array.isArray(analysis.pedagogicallyEquivalentMechanics)&&analysis.pedagogicallyEquivalentMechanics.length>1?warn("MICROBLOCK_COHERENCE_GATE",{mechanic,streak,reason:"REVIEW_LONG_EQUIVALENT_STREAK_NO_AUTO_SWAP"}):pass("MICROBLOCK_COHERENCE_GATE",{mechanic,streak});
  }

  function mechanicEligibilityAudit(analysis,mechanicId,yearProfile,profiles,context={}){
    const yp=getProfile(yearProfile);
    const gateFailures=[readingDemandGate(analysis,yearProfile),nonReaderGate(analysis,yearProfile),motorDemandGate(analysis,yearProfile),operationalAvailabilityGate(mechanicId,context)].filter(g=>g.status==="FAIL");
    if(gateFailures.length)return fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons:gateFailures.map(g=>g.reason)});
    const profile=mechanicProfile(mechanicId,profiles); if(!profile.intents)return fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons:["UNKNOWN_MECHANIC_PROFILE"]});
    const reasons=[];
    if(yp.year<=2&&mechanicId==="smart-sentence")reasons.push("SMART_SENTENCE_BLOCKED_EARLY_LITERACY");
    if(!profile.intents.includes(analysis.interactionIntent))reasons.push("INTENT_NOT_SUPPORTED");
    const demand=normalizeReading(analysis.readingDemand); if(profile.maxReading&&READING_ORDER[demand]>READING_ORDER[profile.maxReading])reasons.push("MECHANIC_READING_LIMIT");
    const supported=new Set(profile.modalities||[]); (analysis.requiredModalities||[]).forEach(m=>{if(!supported.has(m))reasons.push(`MODALITY_UNSUPPORTED:${m}`)});
    if(profile.supportsRetry!==true)reasons.push("RETRY_NOT_SUPPORTED");
    if(mechanicId==="word-slash"&&yp.year<=2&&analysis.interactionIntent!=="lexical_discrimination")reasons.push("WORD_SLASH_NOT_LEXICAL_DISCRIMINATION");
    if(mechanicId==="drag-drop"){
      const role=text(analysis.dragSemanticRole),reason=text(analysis.dragSemanticReason||analysis.dragValueJustification);
      if(yp.year<=2&&role==="single-choice")reasons.push("DECORATIVE_DRAG_DETECTED");
      else if(role==="single-choice"&&!reason)reasons.push("DECORATIVE_DRAG_DETECTED");
      else if(role&&role!=="single-choice"&&!DRAG_ROLES.has(role))reasons.push("INVALID_DRAG_SEMANTIC_ROLE");
      else if(!role)reasons.push("DRAG_SEMANTIC_ROLE_REQUIRED");
      if(yp.year<=2&&DRAG_ROLES.has(role)&&!reason)reasons.push("DRAG_SEMANTIC_REASON_REQUIRED");
    }
    return reasons.length?fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons}):pass("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId});
  }

  function eligibleMechanics(analysis,yearProfile,profiles,context={}){return Object.keys({...MECHANIC_PROFILES,...(profiles||{})}).filter(id=>mechanicEligibilityAudit(analysis,id,yearProfile,profiles,context).status==="PASS")}
  function selectMechanic(analysis,yearProfile,profiles,context={}){
    const eligible=eligibleMechanics(analysis,yearProfile,profiles,context),recommended=text(analysis.recommendedMechanic),second=text(analysis.secondChoice);
    if(recommended&&eligible.includes(recommended))return{mechanic:recommended,eligible,status:"PASS",reason:"PEDAGOGICAL_RECOMMENDATION"};
    if(second&&eligible.includes(second))return{mechanic:second,eligible,status:"PASS",reason:"EXPLICIT_SECOND_CHOICE"};
    return{mechanic:null,eligible,status:"FAIL",reason:recommended?"RECOMMENDED_MECHANIC_NOT_ELIGIBLE":"NO_EXPLICIT_ELIGIBLE_SELECTION"};
  }

  function decorativeDragDetector(records){
    const findings=(records||[]).filter(r=>(r.mechanic||r.selectedMechanic)==="drag-drop").map(r=>{const a=r.analysis||r,role=text(a.dragSemanticRole),reason=text(a.dragSemanticReason||a.dragValueJustification);return !DRAG_ROLES.has(role)||!reason?{id:r.sourceId||r.id,role:role||null}:null}).filter(Boolean);
    return findings.length?fail("DECORATIVE_DRAG_DETECTOR",{findings}):pass("DECORATIVE_DRAG_DETECTOR",{findings:[]});
  }

  function mechanicStreakAudit(records,{warningAt=5}={}){let max=0,current=0,last=null,start=0,best=null;(records||[]).forEach((r,i)=>{const m=r.mechanic||r.selectedMechanic;if(m===last)current+=1;else{last=m;current=1;start=i}if(current>max){max=current;best={mechanic:m,length:current,startIndex:start,endIndex:i}}});return max>=warningAt?warn("MECHANIC_STREAK_AUDIT",{maxStreak:best,action:"REVIEW_ONLY_NO_AUTO_SWAP"}):pass("MECHANIC_STREAK_AUDIT",{maxStreak:best})}
  function mechanicDiversityAudit(records){const counts={};(records||[]).forEach(r=>{const m=r.mechanic||r.selectedMechanic;if(m)counts[m]=(counts[m]||0)+1});const total=Object.values(counts).reduce((a,b)=>a+b,0),top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||[null,0],equivalent=(records||[]).filter(r=>Array.isArray(r.pedagogicallyEquivalentMechanics)&&r.pedagogicallyEquivalentMechanics.length>1).length,concentration=total?top[1]/total:0;return concentration>.8&&equivalent>0?warn("MECHANIC_DIVERSITY_AUDIT",{counts,concentration,equivalentAlternatives:equivalent,reason:"HIGH_CONCENTRATION_WITH_EQUIVALENT_ALTERNATIVES"}):pass("MECHANIC_DIVERSITY_AUDIT",{counts,concentration,equivalentAlternatives:equivalent,note:"NO_QUOTA_ENFORCED"})}
  function assetGapGate(assetRecord){const required=assetRecord?.required!==false,ok=assetRecord?.canonicalStatus==="CANONICAL_ASSET_OK";if(!required)return pass("ASSET_GAP_GATE",{required:false});return ok?pass("ASSET_GAP_GATE",{resolvedKey:assetRecord.resolvedKey||null}):fail("ASSET_GAP_GATE",{reason:"ASSET_GAP"})}

  function invariantValue(record,key){const inv=record?.invariants||record?.metadata?.sourceInvariant||{};if(key in inv)return inv[key];if(key==="id")return record?.sourceId||record?.id;if(key==="skill")return record?.skill?.description||record?.skill;if(key==="difficulty")return record?.difficulty;if(key==="answer")return record?.sourceAnswer||record?.answer;if(key==="linguisticTarget")return record?.linguisticTarget}
  function stable(value){return JSON.stringify(value??null)}
  function sourceInvariantAudit(sourceRecords,afterRecords){const after=new Map((afterRecords||[]).map(r=>[text(r.sourceId||r.id),r])),fields=["id","skill","answer","difficulty","linguisticTarget"],mismatches=[];(sourceRecords||[]).forEach(source=>{const id=text(source.sourceId||source.id),actual=after.get(id);if(!actual){mismatches.push({id,field:"id",reason:"MISSING_AFTER"});return}fields.forEach(field=>{if(stable(invariantValue(source,field))!==stable(invariantValue(actual,field)))mismatches.push({id,field,expected:invariantValue(source,field),actual:invariantValue(actual,field)})})});const extra=(afterRecords||[]).map(r=>text(r.sourceId||r.id)).filter(id=>!(sourceRecords||[]).some(s=>text(s.sourceId||s.id)===id));extra.forEach(id=>mismatches.push({id,field:"id",reason:"EXTRA_AFTER"}));return mismatches.length?fail("SOURCE_INVARIANT_AUDIT",{mismatches}):pass("SOURCE_INVARIANT_AUDIT",{count:(sourceRecords||[]).length,fields})}

  function markRecovery(question,analysis,context){question.metadata={...(question.metadata||{}),pedagogicalRecovery:{...(question.metadata?.pedagogicalRecovery||{}),profile:text(context.yearProfile||analysis.yearProfile),readingDemand:text(analysis.readingDemand||question.metadata?.literacyDemand),nonReaderSupported:true}};return question}
  function buildTargetShooterPayload(source,analysis={},context={}){const q=clone(source),alts=alternatives(q),priorCfg=q?.metadata?.targetShooter||{},prior=Array.isArray(priorCfg.items)?clone(priorCfg.items):[],answer=String(answerValue(q)??"");q.delivery={...(q.delivery||{}),mechanic:"target-shooter"};q.metadata={...(q.metadata||{}),targetShooter:{...priorCfg,audioText:text(priorCfg.audioText||q?.media?.audio?.text||q?.audio?.text||q?.metadata?.audioText||q?.instruction),mode:text(priorCfg.mode,"audio-to-image"),shape:text(priorCfg.shape,"balloon"),correctIds:answer?[answer]:clone(priorCfg.correctIds||[]),items:alts.map((a,i)=>({...optionFrom(a,i),...(prior.find(p=>String(p.id)===String(a.id))||{}),id:text(a.id,String.fromCharCode(65+i))})),difficulty:{...(priorCfg.difficulty||{}),targetSize:Math.max(170,Number(priorCfg.difficulty?.targetSize)||0),timeLimitMs:0,timerMode:"none"}}};return markRecovery(q,analysis,context)}
  function buildMatchingPayload(source,analysis={},context={}){const q=clone(source),alts=alternatives(q),current=q?.metadata?.matching||{},stimulus=stimulusFrom(q)||{},answer=String(answerValue(q)??""),native=Array.isArray(current.leftItems)&&Array.isArray(current.rightItems)&&Array.isArray(current.pairs);q.delivery={...(q.delivery||{}),mechanic:"matching"};let config;if(native){config=clone(current)}else{const assets={...(current.assets||{})};const left={id:"stimulus"};if(stimulus.imageUrl){assets.stimulus=stimulus.imageUrl;left.imageAssetKey="stimulus";left.alt=text(stimulus.alt||q.metadata?.contextAlt||q.prompt,"Contexto visual")}else{left.spokenText=text(q?.audio?.text||q?.media?.audio?.text||q?.metadata?.audioText||q?.instruction||q?.prompt,"Listen");left.speechLocale="en-US";left.audioDescription="Ouvir novamente"}const right=alts.map((a,i)=>{const o=optionFrom(a,i);return{id:`answer-${o.id}`,spokenText:text(o.spokenText||o.text||o.label),speechLocale:text(o.speechLocale,"en-US"),audioDescription:`Ouvir opção ${i+1}`}});config={...current,mode:stimulus.imageUrl?"image-audio":"audio-audio",leftTitle:stimulus.imageUrl?"Observe":"Ouça",rightTitle:"Ouça e relacione",assets,leftItems:[left],rightItems:right,pairs:answer?[{leftId:"stimulus",rightId:`answer-${answer}`}]:[],behavior:{...(current.behavior||{}),lockLeftOrder:true,shuffleRight:true,connectionMode:"1x1",interactionMode:"smart",lockCorrectPairsOnRetry:true,allowUnpairedDistractors:true}}}q.metadata={...(q.metadata||{}),matching:config};return markRecovery(q,analysis,context)}
  function buildBubblePopPayload(source,analysis={},context={}){const q=clone(source),alts=alternatives(q);q.delivery={...(q.delivery||{}),mechanic:"bubble-pop"};q.presentation={...(q.presentation||{}),mode:text(q.presentation?.mode,"image-audio-choice"),prompt:text(q.presentation?.prompt||q.instruction||q.prompt)};q.payload={...(q.payload||{}),mode:"single-target",bubbles:alts.map(optionFrom),targetIds:[String(answerValue(q)??"")].filter(Boolean)};return markRecovery(q,analysis,context)}
  function buildDragDropPayload(source,analysis={},context={}){const profile=getProfile(context.yearProfile||analysis.yearProfile),role=text(analysis.dragSemanticRole),reason=text(analysis.dragSemanticReason||analysis.dragValueJustification);if(profile.year<=2&&(!DRAG_ROLES.has(role)||!reason))throw new Error(`DRAG_SEMANTIC_REASON_REQUIRED:${source?.id||"unknown"}`);if(!role)throw new Error(`DRAG_SEMANTIC_ROLE_REQUIRED:${source?.id||"unknown"}`);const q=clone(source);if(!Array.isArray(q?.payload?.items)||!Array.isArray(q?.payload?.targets)||!q.payload.targets.length)throw new Error(`DRAG_NATIVE_PAYLOAD_REQUIRED:${source?.id||"unknown"}`);q.delivery={...(q.delivery||{}),mechanic:"drag-drop"};q.metadata={...(q.metadata||{}),dragSemanticRole:role,dragSemanticReason:reason};q.payload={...q.payload,mode:text(q.payload.mode,role)};return markRecovery(q,analysis,{...context,yearProfile:profile.id})}

  function registerBuilder(mechanicId,builder){if(typeof builder!=="function")throw new Error("builder deve ser função");builders.set(mechanicId,builder);return api}
  function buildWith(mechanicId,source,analysis,context={}){const builder=builders.get(mechanicId);if(!builder)throw new Error(`Builder não registrado: ${mechanicId}`);return builder(clone(source),clone(analysis),context)}
  function orchestrate(source,analysis,context={}){const yearProfile=context.yearProfile||analysis.yearProfile,selection=selectMechanic(analysis,yearProfile,context.mechanicProfiles,context),gates=[readingDemandGate(analysis,yearProfile),nonReaderGate(analysis,yearProfile),motorDemandGate(analysis,yearProfile)];if(selection.mechanic){gates.push(operationalAvailabilityGate(selection.mechanic,context));gates.push(mechanicEligibilityAudit(analysis,selection.mechanic,yearProfile,context.mechanicProfiles,context));gates.push(microblockCoherenceGate(analysis,{...context,candidateMechanic:selection.mechanic}))}if(gates.some(g=>g.status==="FAIL")||selection.status==="FAIL")return{sourceId:source.id,analysis:clone(analysis),selection,gates,payload:null,status:"BLOCKED"};return{sourceId:source.id,analysis:clone(analysis),selection,gates,payload:buildWith(selection.mechanic,source,analysis,{...context,yearProfile}),status:"BUILT"}}

  const api={version:"1.1.0-y1-y2-recovery",YEAR_PROFILES,MECHANIC_PROFILES,DRAG_SEMANTIC_ROLES:Object.freeze([...DRAG_ROLES]),normalizeReading,readingDemandGate,nonReaderGate,motorDemandGate,operationalAvailabilityGate,microblockCoherenceGate,mechanicEligibilityAudit,eligibleMechanics,selectMechanic,decorativeDragDetector,mechanicStreakAudit,mechanicDiversityAudit,assetGapGate,sourceInvariantAudit,buildTargetShooterPayload,buildMatchingPayload,buildBubblePopPayload,buildDragDropPayload,registerBuilder,buildWith,orchestrate};
  builders.set("target-shooter",buildTargetShooterPayload);builders.set("matching",buildMatchingPayload);builders.set("bubble-pop",buildBubblePopPayload);builders.set("drag-drop",buildDragDropPayload);
  return api;
});
