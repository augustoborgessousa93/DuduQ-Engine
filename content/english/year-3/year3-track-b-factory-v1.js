/* DUDUQ English Y3 — Track B runtime factory.
   Reuses the shared pedagogical orchestrator and the frozen 90-item matrix.
   Source module rows remain unchanged; this layer materializes runtime contracts.
   M01 remains frozen; M02 is the current authorized module.
*/
(function(root,factory){
  "use strict";
  const api=factory(
    root?.DuduQPedagogicalOrchestrator,
    root?.DuduQY3GuidedReadingProfile,
    root?.DuduQY3OrchestrationMatrix
  );
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQYear3Factory=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(Orchestrator,Profile,Matrix){
  "use strict";

  const PROFILE="Y3_GUIDED_READING";
  const SUPPORTED_MODULES=Object.freeze([1,2]);
  const VERSION_BY_MODULE=Object.freeze({1:"3.0.0-track-b-m01-sentinel",2:"3.0.0-track-b-m02"});
  const MECHANIC_VERSIONS=Object.freeze({
    "smart-sentence":"4.0.20",
    "word-slash":"1.0.17",
    "bubble-pop":"1.0.31",
    "target-shooter":"1.0.22",
    "drag-drop":"2.0.26"
  });
  const DIFFICULTY=Object.freeze({"fácil":"easy","facil":"easy","média":"medium","media":"medium","difícil":"hard","dificil":"hard"});

  function text(v,f=""){const s=String(v??"").trim();return s||f}
  function difficulty(v){return DIFFICULTY[text(v).toLowerCase()]||text(v,"easy").toLowerCase()}
  function audio(textValue,language="en-US"){const spoken=text(textValue);return spoken?{enabled:true,text:spoken,spokenText:spoken,language,speechLocale:language,repeatable:true,fallback:"speech-synthesis"}:null}
  function moduleNumber(source){const m=text(source?.id).match(/^EN3-M(\d)-/);return m?Number(m[1]):0}
  function versionFor(module){return VERSION_BY_MODULE[module]||`3.0.0-track-b-m${String(module).padStart(2,"0")}`}
  function sourceInvariant(source){return Object.freeze({
    id:source.id,
    skill:source.skill,
    ability:source.ability,
    answer:Object.freeze({id:source.answer?.id,text:source.answer?.text}),
    difficulty:source.difficulty,
    linguisticTarget:source.answer?.text
  })}
  function analysisFor(source){
    const row=Matrix?.plan?.[source.id];
    if(!row)throw new Error(`[DuduQ Y3 Track B] matriz ausente: ${source.id}`);
    return {
      interactionIntent:row.intent,
      readingDemand:row.reading,
      requiredModalities:[...row.modalities],
      recommendedMechanic:row.primary,
      secondChoice:row.secondary,
      dragSemanticRole:row.dragRole,
      ...(row.primary==="drag-drop"?{dragValueJustification:"Sequenciar cartões reproduz diretamente a ordem auditiva-alvo."}:{})
    };
  }
  function canonical(query,required=false){
    const q=text(query);
    if(!q){if(required)throw new Error("[DuduQ Y3 Track B] asset canônico obrigatório sem consulta.");return null}
    const details=globalThis.DuduQAssets?.resolveImageDetails?.(q)||null;
    if(details?.url)return{query:q,key:text(details.key,q),url:details.url,status:"CANONICAL_ASSET_OK"};
    if(required)throw new Error(`[DuduQ Y3 Track B] ASSET_GAP: ${q}`);
    return null;
  }
  function requiredCanonical(row){return row?.image==="CANONICAL_ASSET_OK"}
  function technicalReady(row,module){
    if(row?.technical==="PASS")return true;
    return module===2&&row?.technical==="TARGET_OPTION_AUDIO_GAP";
  }
  function englishInstruction(source){
    if(source.id==="EN3-M2-08")return"Choose the question about age.";
    if(text(source.listenText))return text(source.listenText);
    if(source.id==="EN3-M1-03")return"Choose the morning greeting.";
    if(source.id==="EN3-M1-14")return"Choose the goodbye phrase.";
    if(source.id==="EN3-M1-10")return"Choose the sentence that matches the scene.";
    return"Choose the best answer.";
  }
  function quotedBlank(prompt){
    const p=text(prompt);const m=p.match(/[“\"]([^”\"]*_{2,}[^”\"]*)[”\"]/);return m?m[1]:"";
  }
  function baseQuestion(source,analysis,mechanic){
    const module=moduleNumber(source),version=versionFor(module);
    const q={
      id:source.id,sourceId:source.id,subject:"english",year:3,module,
      skill:{code:null,description:source.skill},difficulty:difficulty(source.difficulty),
      statement:source.prompt,instruction:source.prompt,contentLanguage:"en",instructionLanguage:"pt-BR",
      alternatives:(source.alternatives||[]).map(a=>({id:a.id,text:text(a.text),audioText:text(a.audioText,a.text),metadata:{speechText:text(a.audioText,a.text),speechLanguage:"en-US"}})),
      answer:{type:"single",value:source.answer?.id},
      feedback:{correct:"Muito bem!",incorrect:"Ouça novamente, observe a pista e tente outra vez.",language:"pt-BR"},
      delivery:{mechanic,preferred:[mechanic],blocked:[]},
      metadata:{
        screenTitle:source.topic||"ENGLISH",activityTitle:source.topic||"ENGLISH",
        sourceStatus:source.status,sourceSkill:source.skill,sourceAbility:source.ability,
        sourceStatement:source.prompt,sourceAlternatives:(source.alternatives||[]).map(a=>a.text),
        sourceAnswer:source.answer?.id,sourceFormat:source.format,sourceMechanic:source.sourceMechanic,sourceReading:source.reading,
        interactionIntent:analysis.interactionIntent,readingDemand:analysis.readingDemand,requiredModalities:[...analysis.requiredModalities],
        yearProfile:PROFILE,sourceInvariant:sourceInvariant(source),trackB:{version,primaryMechanic:mechanic},
        technicalContract:{mechanic,adapterVersion:MECHANIC_VERSIONS[mechanic]}
      }
    };
    if(text(source.listenText)&&source.id!=="EN3-M2-08")q.media={audio:audio(source.listenText)};
    return q;
  }

  function buildSmart(source,analysis){
    const q=baseQuestion(source,analysis,"smart-sentence");
    const row=Matrix.plan[source.id];
    const visual=requiredCanonical(row)?canonical(source.visualQuery,true):null;
    const blank=quotedBlank(source.prompt);
    const dialogue=analysis.interactionIntent==="dialogue_completion";
    const dialogueLead=source.id==="EN3-M2-08"?"":text(source.listenText);
    const sentence=blank||(dialogue&&dialogueLead?`${dialogueLead} — ___`:"___");
    q.metadata.smartSentence={
      mode:"complete-sentence",
      instruction:source.prompt,
      instructionSpoken:englishInstruction(source),
      language:"en-US",
      sentence,
      options:(source.alternatives||[]).map(a=>({id:a.id,value:text(a.text),label:text(a.text),spokenText:text(a.audioText,a.text)})),
      answer:text(source.answer?.text),
      interaction:{tap:true,drag:false,reorder:false,remove:true,shuffle:true},
      hints:[{afterErrors:1,text:"Observe novamente a pista e compare as opções."}],
      feedback:{correct:"Muito bem!",incorrect:"Observe a pista e tente outra vez."},
      difficulty:{level:difficulty(source.difficulty)==="hard"?3:difficulty(source.difficulty)==="medium"?2:1,hintAfterErrors:1}
    };
    if(visual){
      q.metadata.smartSentence.image={src:visual.url,assetKey:visual.key,alt:text(source.visualAlt,source.visualQuery)};
      q.metadata.smartSentence.imageAlt=text(source.visualAlt,source.visualQuery);
      q.metadata.imageRequirement={required:true,concept:source.visualQuery,canonicalStatus:"CANONICAL_ASSET_OK",resolvedKey:visual.key};
    }else q.metadata.imageRequirement={required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  function buildWordSlash(source,analysis){
    const q=baseQuestion(source,analysis,"word-slash");
    const answerText=text(source.answer?.text);
    q.metadata.wordSlash={
      mode:"correct-word",audioText:text(source.listenText,answerText),goal:1,
      target:{label:"LISTEN",value:answerText,spokenText:text(source.listenText,answerText),hideValue:true,acceptCategories:["correct"]},
      objects:(source.alternatives||[]).map(a=>({id:a.id,type:"word",label:text(a.text),value:text(a.text),category:a.id===source.answer?.id?"correct":"distractor",weight:1})),
      difficulty:{speedMinMs:3400,speedMaxMs:4300,maxObjects:4,spawnEveryMs:820,timeLimitSeconds:38,correctProbability:.5}
    };
    q.metadata.imageRequirement={required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  function buildBubble(source,analysis){
    const q=baseQuestion(source,analysis,"bubble-pop");
    if(text(source.listenText))q.media={audio:audio(source.listenText)};
    q.metadata.behavior={maxAttempts:3,audioRepeatable:true};
    q.metadata.imageRequirement={required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  function buildTarget(source,analysis){
    const q=baseQuestion(source,analysis,"target-shooter");
    const row=Matrix.plan[source.id];
    const optionAudio=row.audio==="OPTION_AUDIO_REQUIRED_REPEATABLE";
    const needsImages=requiredCanonical(row)&&analysis.requiredModalities.includes("image");
    const items=(source.alternatives||[]).map(a=>{
      const image=needsImages?canonical(a.imageQuery||a.text,true):null;
      const spoken=text(a.audioText,a.text);
      const item={id:a.id,label:text(a.text),alt:text(a.imageAlt,a.text),spokenText:spoken,speechLocale:"en-US",audioDescription:`Ouvir ${spoken}`};
      if(image){item.imageUrl=image.url;item.imageSrc=image.url;item.imageAssetKey=image.key;item.assetKey=image.key;}
      return item;
    });
    q.metadata.targetShooter={
      audioText:optionAudio?"":text(source.listenText,source.answer?.text),
      promptVisual:optionAudio?text(source.visualQuery):"",
      mode:optionAudio?"visual-to-audio":needsImages?"audio-to-image":"audio-to-choice",shape:"balloon",correctIds:[source.answer?.id],items,
      difficulty:{speed:difficulty(source.difficulty)==="hard"?.42:difficulty(source.difficulty)==="medium"?.34:.28,objectCount:items.length,spawnIntervalMs:900,requiredCorrect:1,targetSize:172,timeLimitMs:0,timerMode:"none"}
    };
    if(optionAudio){
      q.metadata.technicalContract.optionAudio=true;
      q.metadata.technicalContract.resolvedGate=row.technical;
    }
    q.metadata.imageRequirement=needsImages?{required:true,canonicalStatus:"CANONICAL_ASSET_OK"}:{required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  function buildDrag(source,analysis){
    const q=baseQuestion(source,analysis,"drag-drop");
    if(source.id!=="EN3-M1-12")throw new Error(`[DuduQ Y3 Track B] drag sentinel inesperado: ${source.id}`);
    const letters=["H","E","L","L","O"],targetId=`${source.id}-sequence`;
    const items=letters.map((letter,index)=>({
      id:`${source.id}-letter-${index+1}`,label:letter,text:letter,spokenText:letter,speechLocale:"en-US",audioDescription:`Ouvir letra ${letter}`,
      targetId,required:true,sequenceIndex:index
    }));
    q.alternatives=items.map(item=>({
      id:item.id,text:item.label,label:item.label,audioText:item.spokenText,spokenText:item.spokenText,speechLocale:item.speechLocale,
      audio:audio(item.spokenText),metadata:{speechText:item.spokenText,speechLanguage:"en-US"}
    }));
    q.answer={type:"sequence",value:items.map(item=>item.id)};
    q.metadata.sequenceTargetId=targetId;
    q.metadata.sequenceTitle="H – E – L – L – O";
    q.payload={
      mode:"sequence",strategy:"sequence",
      options:{shuffleItems:true,shuffleTargets:false,maxAttempts:3},retry:{maxAttempts:3,wrongBehaviour:"return-incorrect"},
      items,
      targets:[{id:targetId,label:"H – E – L – L – O",accessibleLabel:"Monte a sequência ouvida",capacity:letters.length,kind:"list",audio:{text:text(source.listenText,"H. E. L. L. O."),spokenText:text(source.listenText,"H. E. L. L. O."),language:"en-US",speechLocale:"en-US",repeatable:true}}]
    };
    q.metadata.dragSemanticRole="sequence";
    q.metadata.dragValueJustification="Sequenciar cartões reproduz diretamente a ordem auditiva-alvo.";
    q.metadata.imageRequirement={required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  const BUILDERS=Object.freeze({
    "smart-sentence":buildSmart,"word-slash":buildWordSlash,"bubble-pop":buildBubble,"target-shooter":buildTarget,"drag-drop":buildDrag
  });

  function ensureFoundation(){
    if(!Orchestrator||!Profile||!Matrix)throw new Error("[DuduQ Y3 Track B] foundation incompleta.");
    if(Profile.yearProfile!==PROFILE)throw new Error("[DuduQ Y3 Track B] perfil Y3 inesperado.");
    Object.entries(BUILDERS).forEach(([id,builder])=>Orchestrator.registerBuilder(id,builder));
  }

  function publish(spec){
    ensureFoundation();
    const module=Number(spec?.module);
    if(!SUPPORTED_MODULES.includes(module))throw new Error(`[DuduQ Y3 Track B] módulo ainda não autorizado nesta factory: M${String(module).padStart(2,"0")}.`);
    if(!Array.isArray(spec.items)||spec.items.length!==15)throw new Error(`[DuduQ Y3 Track B] M${String(module).padStart(2,"0")} exige 15 itens-fonte.`);
    const questions=spec.items.map(source=>{
      if(!new RegExp(`^EN3-M${module}-\\d{2}$`).test(source.id))throw new Error(`[DuduQ Y3 Track B] ID fora do módulo M${String(module).padStart(2,"0")}: ${source.id}`);
      const analysis=analysisFor(source),row=Matrix.plan[source.id];
      if(!technicalReady(row,module))throw new Error(`[DuduQ Y3 Track B] bloqueio técnico: ${source.id} / ${row.technical}`);
      if(row.image==="ASSET_GAP")throw new Error(`[DuduQ Y3 Track B] ASSET_GAP planejado: ${source.id}`);
      const built=Orchestrator.orchestrate(source,analysis,{yearProfile:PROFILE,mechanicProfiles:Profile.mechanicProfiles});
      if(built.status!=="BUILT"||!built.payload)throw new Error(`[DuduQ Y3 Track B] orquestração bloqueada: ${source.id} / ${built.selection?.reason||"UNKNOWN"}`);
      if(built.selection.mechanic!==row.primary)throw new Error(`[DuduQ Y3 Track B] seleção divergente: ${source.id}`);
      return built.payload;
    });
    const records=questions.map(q=>({id:q.id,sourceId:q.sourceId,mechanic:q.delivery.mechanic,analysis:{dragSemanticRole:q.metadata.dragSemanticRole,dragValueJustification:q.metadata.dragValueJustification}}));
    const dragAudit=Orchestrator.decorativeDragDetector(records);
    if(dragAudit.status!=="PASS")throw new Error("[DuduQ Y3 Track B] decorative drag detectado.");
    const moduleTag=String(module).padStart(2,"0"),mk=`module${moduleTag}`,version=versionFor(module);
    const moduleObject={
      id:`duduq-english-y3-module-${moduleTag}-track-b`,version,subject:"english",year:3,module,
      title:spec.title,description:spec.objective,estimatedMinutes:12,
      pedagogyPolicy:{profile:PROFILE,readingDefault:"GUIDED",autonomousEnglishReadingRequired:false,audioRepeatable:true,multimodalityPriority:true,noMechanicQuota:true},
      factory:{tag:module===1?"y3-track-b-m01-sentinel":`y3-track-b-m${moduleTag}`,engine:"Canary R150",core:"1.0.12",mechanics:MECHANIC_VERSIONS},
      activities:questions.map((q,index)=>({id:`Y3-M${moduleTag}-A${String(index+1).padStart(2,"0")}`,title:q.metadata.activityTitle,topic:q.metadata.screenTitle,mechanic:q.delivery.mechanic,skill:{description:q.skill.description},questions:[q]}))
    };
    globalThis.DUDUQ_CONTENT=globalThis.DUDUQ_CONTENT||{};
    globalThis.DUDUQ_CONTENT.english=globalThis.DUDUQ_CONTENT.english||{};
    globalThis.DUDUQ_CONTENT.english.year3=globalThis.DUDUQ_CONTENT.english.year3||{};
    globalThis.DUDUQ_CONTENT.english.year3[mk]=Object.freeze(moduleObject);
    return moduleObject;
  }

  return Object.freeze({version:VERSION_BY_MODULE[1],profile:PROFILE,publish,builders:BUILDERS});
});
