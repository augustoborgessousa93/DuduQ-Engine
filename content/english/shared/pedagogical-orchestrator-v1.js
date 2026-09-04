/* DUDUQ English — shared pedagogical orchestration v1
   Phase 2 pilot foundation. Shared by future Y3/Y4/Y5 profiles.
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
    Y3_GUIDED_READING:Object.freeze({id:"Y3_GUIDED_READING",year:3,maxReading:"R2",independentReading:true}),
    Y4_FUNCTIONAL_READING:Object.freeze({id:"Y4_FUNCTIONAL_READING",year:4,maxReading:"R3",independentReading:true}),
    Y5_INTEGRATED_SKILLS:Object.freeze({id:"Y5_INTEGRATED_SKILLS",year:5,maxReading:"R4",independentReading:true})
  });

  const MECHANIC_PROFILES=Object.freeze({
    "smart-sentence":Object.freeze({
      maxReading:"R4",
      intents:["complete_sentence","build_sentence","word_order","image_sentence","dialogue_completion","functional_label_completion","image_sentence_location_interpretation","scene_sentence_location_interpretation"],
      modalities:["text","image","audio"],
      supportsRetry:true
    }),
    "target-shooter":Object.freeze({
      maxReading:"R3",
      intents:["visual_recognition","visual_lexical_identification","visual_attribute_chunk_identification"],
      modalities:["image","text","audio"],
      supportsRetry:true
    }),
    "matching":Object.freeze({
      maxReading:"R4",
      intents:["one_to_one_association"],
      modalities:["image","text","audio"],
      supportsRetry:true
    }),
    "drag-drop":Object.freeze({
      maxReading:"R4",
      intents:["classification","spatial_placement","sequence","distribution","construction","meaningful_association","single_choice"],
      modalities:["image","text","audio","manipulation"],
      supportsRetry:true
    }),
    "bubble-pop":Object.freeze({
      maxReading:"R3",
      intents:["visual_recognition","visual_lexical_identification","short_unambiguous_recognition"],
      modalities:["image","text","audio"],
      supportsRetry:true
    }),
    "word-slash":Object.freeze({
      maxReading:"R3",
      intents:["lexical_discrimination"],
      modalities:["image","text","audio","manipulation"],
      supportsRetry:true
    })
  });

  const DRAG_ROLES=new Set(["classification","spatial-placement","sequence","distribution","construction","meaningful-association"]);
  const builders=new Map();

  function text(value,fallback=""){const out=String(value??"").trim();return out||fallback}
  function clone(value){return value==null?value:JSON.parse(JSON.stringify(value))}
  function pass(code,details={}){return{code,status:"PASS",...details}}
  function warn(code,details={}){return{code,status:"WARNING",...details}}
  function fail(code,details={}){return{code,status:"FAIL",...details}}
  function normalizeReading(value){const r=text(value).toUpperCase();if(!(r in READING_ORDER))throw new Error(`readingDemand inválido: ${value}`);return r}
  function getProfile(value){const key=typeof value==="string"?value:value?.id;const profile=YEAR_PROFILES[key];if(!profile)throw new Error(`Perfil de ano não homologado: ${key||value}`);return profile}
  function mechanicProfile(id,overrides){return{...(MECHANIC_PROFILES[id]||{}),...(overrides?.[id]||{})}}

  function readingDemandGate(analysis,yearProfile){
    const profile=getProfile(yearProfile);
    const demand=normalizeReading(analysis.readingDemand);
    return READING_ORDER[demand]<=READING_ORDER[profile.maxReading]
      ? pass("READING_DEMAND_GATE",{readingDemand:demand,maxReading:profile.maxReading})
      : fail("READING_DEMAND_GATE",{readingDemand:demand,maxReading:profile.maxReading,reason:"READING_ABOVE_YEAR_PROFILE"});
  }

  function mechanicEligibilityAudit(analysis,mechanicId,yearProfile,profiles){
    const reading=readingDemandGate(analysis,yearProfile);
    if(reading.status==="FAIL")return fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons:[reading.reason]});
    const profile=mechanicProfile(mechanicId,profiles);
    if(!profile.intents)return fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons:["UNKNOWN_MECHANIC_PROFILE"]});
    const reasons=[];
    if(!profile.intents.includes(analysis.interactionIntent))reasons.push("INTENT_NOT_SUPPORTED");
    const demand=normalizeReading(analysis.readingDemand);
    if(profile.maxReading&&READING_ORDER[demand]>READING_ORDER[profile.maxReading])reasons.push("MECHANIC_READING_LIMIT");
    const required=Array.isArray(analysis.requiredModalities)?analysis.requiredModalities:[];
    const supported=new Set(profile.modalities||[]);
    required.forEach(modality=>{if(!supported.has(modality))reasons.push(`MODALITY_UNSUPPORTED:${modality}`)});
    if(profile.supportsRetry!==true)reasons.push("RETRY_NOT_SUPPORTED");
    if(mechanicId==="drag-drop"){
      const role=text(analysis.dragSemanticRole);
      if(role==="single-choice"&&!text(analysis.dragValueJustification))reasons.push("DECORATIVE_DRAG_DETECTED");
      else if(role&&role!=="single-choice"&&!DRAG_ROLES.has(role))reasons.push("INVALID_DRAG_SEMANTIC_ROLE");
      else if(!role)reasons.push("DRAG_SEMANTIC_ROLE_REQUIRED");
    }
    return reasons.length
      ? fail("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId,reasons})
      : pass("MECHANIC_ELIGIBILITY_AUDIT",{mechanic:mechanicId});
  }

  function eligibleMechanics(analysis,yearProfile,profiles){
    return Object.keys({...MECHANIC_PROFILES,...(profiles||{})}).filter(id=>
      mechanicEligibilityAudit(analysis,id,yearProfile,profiles).status==="PASS"
    );
  }

  function selectMechanic(analysis,yearProfile,profiles){
    const eligible=eligibleMechanics(analysis,yearProfile,profiles);
    const recommended=text(analysis.recommendedMechanic);
    if(recommended&&eligible.includes(recommended))return{mechanic:recommended,eligible,status:"PASS",reason:"PEDAGOGICAL_RECOMMENDATION"};
    const second=text(analysis.secondChoice);
    if(second&&eligible.includes(second))return{mechanic:second,eligible,status:"PASS",reason:"EXPLICIT_SECOND_CHOICE"};
    return{mechanic:null,eligible,status:"FAIL",reason:recommended?"RECOMMENDED_MECHANIC_NOT_ELIGIBLE":"NO_EXPLICIT_ELIGIBLE_SELECTION"};
  }

  function decorativeDragDetector(records){
    const findings=(records||[]).filter(record=>record.mechanic==="drag-drop").map(record=>{
      const a=record.analysis||record;
      const role=text(a.dragSemanticRole);
      const invalid=!role||(role==="single-choice"&&!text(a.dragValueJustification))||(role!=="single-choice"&&!DRAG_ROLES.has(role));
      return invalid?{id:record.sourceId||record.id,role:role||null}:null;
    }).filter(Boolean);
    return findings.length?fail("DECORATIVE_DRAG_DETECTOR",{findings}):pass("DECORATIVE_DRAG_DETECTOR",{findings:[]});
  }

  function mechanicStreakAudit(records,{warningAt=5}={}){
    let max=0,current=0,last=null,start=0,best=null;
    (records||[]).forEach((record,index)=>{const mechanic=record.mechanic||record.selectedMechanic;if(mechanic===last)current+=1;else{last=mechanic;current=1;start=index}if(current>max){max=current;best={mechanic,length:current,startIndex:start,endIndex:index}}});
    return max>=warningAt?warn("MECHANIC_STREAK_AUDIT",{maxStreak:best,action:"REVIEW_ONLY_NO_AUTO_SWAP"}):pass("MECHANIC_STREAK_AUDIT",{maxStreak:best});
  }

  function mechanicDiversityAudit(records){
    const counts={};(records||[]).forEach(record=>{const m=record.mechanic||record.selectedMechanic;if(m)counts[m]=(counts[m]||0)+1});
    const total=Object.values(counts).reduce((a,b)=>a+b,0);
    const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||[null,0];
    const equivalentAlternatives=(records||[]).filter(r=>Array.isArray(r.pedagogicallyEquivalentMechanics)&&r.pedagogicallyEquivalentMechanics.length>1).length;
    const concentration=total?top[1]/total:0;
    return concentration>.8&&equivalentAlternatives>0
      ? warn("MECHANIC_DIVERSITY_AUDIT",{counts,concentration,equivalentAlternatives,reason:"HIGH_CONCENTRATION_WITH_EQUIVALENT_ALTERNATIVES"})
      : pass("MECHANIC_DIVERSITY_AUDIT",{counts,concentration,equivalentAlternatives,note:"NO_QUOTA_ENFORCED"});
  }

  function assetGapGate(assetRecord){
    const required=assetRecord?.required!==false;
    const ok=assetRecord?.canonicalStatus==="CANONICAL_ASSET_OK";
    if(!required)return pass("ASSET_GAP_GATE",{required:false});
    return ok?pass("ASSET_GAP_GATE",{resolvedKey:assetRecord.resolvedKey||null}):fail("ASSET_GAP_GATE",{reason:"ASSET_GAP"});
  }

  function invariantValue(record,key){
    const inv=record?.invariants||record?.metadata?.sourceInvariant||{};
    if(key in inv)return inv[key];
    if(key==="id")return record?.sourceId||record?.id;
    if(key==="skill")return record?.skill?.description||record?.skill;
    if(key==="difficulty")return record?.difficulty;
    if(key==="answer")return record?.sourceAnswer||record?.answer;
    if(key==="linguisticTarget")return record?.linguisticTarget;
    return undefined;
  }
  function stable(value){return JSON.stringify(value??null)}
  function sourceInvariantAudit(sourceRecords,afterRecords){
    const after=new Map((afterRecords||[]).map(r=>[text(r.sourceId||r.id),r]));
    const fields=["id","skill","answer","difficulty","linguisticTarget"];
    const mismatches=[];
    (sourceRecords||[]).forEach(source=>{
      const id=text(source.sourceId||source.id);const actual=after.get(id);
      if(!actual){mismatches.push({id,field:"id",reason:"MISSING_AFTER"});return}
      fields.forEach(field=>{if(stable(invariantValue(source,field))!==stable(invariantValue(actual,field)))mismatches.push({id,field,expected:invariantValue(source,field),actual:invariantValue(actual,field)})});
    });
    const extra=(afterRecords||[]).map(r=>text(r.sourceId||r.id)).filter(id=>!(sourceRecords||[]).some(s=>text(s.sourceId||s.id)===id));
    extra.forEach(id=>mismatches.push({id,field:"id",reason:"EXTRA_AFTER"}));
    return mismatches.length?fail("SOURCE_INVARIANT_AUDIT",{mismatches}):pass("SOURCE_INVARIANT_AUDIT",{count:(sourceRecords||[]).length,fields});
  }

  function registerBuilder(mechanicId,builder){if(typeof builder!=="function")throw new Error("builder deve ser função");builders.set(mechanicId,builder);return api}
  function buildWith(mechanicId,source,analysis,context={}){const builder=builders.get(mechanicId);if(!builder)throw new Error(`Builder não registrado: ${mechanicId}`);return builder(clone(source),clone(analysis),context)}
  function orchestrate(source,analysis,context={}){
    const yearProfile=context.yearProfile||analysis.yearProfile;
    const selection=selectMechanic(analysis,yearProfile,context.mechanicProfiles);
    const gates=[readingDemandGate(analysis,yearProfile)];
    if(selection.mechanic)gates.push(mechanicEligibilityAudit(analysis,selection.mechanic,yearProfile,context.mechanicProfiles));
    if(gates.some(g=>g.status==="FAIL")||selection.status==="FAIL")return{sourceId:source.id,analysis:clone(analysis),selection,gates,payload:null,status:"BLOCKED"};
    return{sourceId:source.id,analysis:clone(analysis),selection,gates,payload:buildWith(selection.mechanic,source,analysis,context),status:"BUILT"};
  }

  const api={
    version:"1.0.0-phase2",
    YEAR_PROFILES,MECHANIC_PROFILES,DRAG_SEMANTIC_ROLES:Object.freeze([...DRAG_ROLES]),
    normalizeReading,readingDemandGate,mechanicEligibilityAudit,eligibleMechanics,selectMechanic,
    decorativeDragDetector,mechanicStreakAudit,mechanicDiversityAudit,assetGapGate,sourceInvariantAudit,
    registerBuilder,buildWith,orchestrate
  };
  return api;
});
