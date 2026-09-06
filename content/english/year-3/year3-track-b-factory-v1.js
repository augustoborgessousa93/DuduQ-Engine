/* DUDUQ English Y3 — Track B runtime factory.
   Reuses the shared pedagogical orchestrator and the frozen 90-item matrix.
   Source module rows remain unchanged; this layer materializes runtime contracts.
   M01/M02 remain regression sentinels. M03–M06 may use temporary visual placeholders.
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
  const SUPPORTED_MODULES=Object.freeze([1,2,3,4,5,6]);
  const VERSION_BY_MODULE=Object.freeze({
    1:"3.0.0-track-b-m01-sentinel",
    2:"3.0.0-track-b-m02",
    3:"3.0.0-track-b-m03-placeholders",
    4:"3.0.0-track-b-m04-placeholders",
    5:"3.0.0-track-b-m05-placeholders",
    6:"3.0.0-track-b-m06-placeholders"
  });
  const MECHANIC_VERSIONS=Object.freeze({
    "smart-sentence":"4.0.20",
    "word-slash":"1.0.17",
    "bubble-pop":"1.0.31",
    "target-shooter":"1.0.23",
    "drag-drop":"2.0.26"
  });
  const DIFFICULTY=Object.freeze({"fácil":"easy","facil":"easy","média":"medium","media":"medium","difícil":"hard","dificil":"hard"});
  const NUMBER_WORDS=Object.freeze({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,twenty:20});
  const VARIANTS=new Set(["red","blue","green","yellow","white","black","brown","orange","pink","purple","gray","grey","big","small"]);
  const PLACEHOLDER_SYMBOLS=Object.freeze({
    mother:"👩",father:"👨",sister:"👧",brother:"👦",grandfather:"👴",grandmother:"👵",
    ball:"⚽",kite:"🪁",doll:"🧸",train:"🚆",
    turtle:"🐢",duck:"🦆",cat:"🐱",rabbit:"🐰",dog:"🐶",
    pencil:"✏️",ruler:"📏",eraser:"🧽",backpack:"🎒",
    circle:"⚪",rectangle:"▭",triangle:"🔺",square:"⬜",star:"⭐",
    car:"🚗",bus:"🚌",truck:"🚚",plane:"✈️",
    hand:"🙌",nose:"👃",eye:"👀",hair:"🧑",
    default:"🖼️"
  });
  const PENDING_CANONICAL_ASSETS=new Map();

  function text(v,f=""){const s=String(v??"").trim();return s||f}
  function difficulty(v){return DIFFICULTY[text(v).toLowerCase()]||text(v,"easy").toLowerCase()}
  function audio(textValue,language="en-US"){const spoken=text(textValue);return spoken?{enabled:true,text:spoken,spokenText:spoken,language,speechLocale:language,repeatable:true,fallback:"speech-synthesis"}:null}
  function moduleNumber(source){const m=text(source?.id).match(/^EN3-M(\d)-/);return m?Number(m[1]):0}
  function versionFor(module){return VERSION_BY_MODULE[module]||`3.0.0-track-b-m${String(module).padStart(2,"0")}`}
  function normalizeWords(v){return text(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
  function singular(v){const w=text(v).toLowerCase();if(w==="bus")return w;if(w.endsWith("ies"))return w.slice(0,-3)+"y";if(w.endsWith("ses"))return w.slice(0,-2);if(w.endsWith("s")&&!w.endsWith("ss"))return w.slice(0,-1);return w}
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
  function rawCanonical(query){
    const q=text(query);
    if(!q)return null;
    const details=globalThis.DuduQAssets?.resolveImageDetails?.(q)||null;
    return details?.url?{query:q,key:text(details.key,q),url:details.url,status:"CANONICAL_ASSET_OK"}:null;
  }
  function canonical(query,required=false){
    const found=rawCanonical(query);
    if(found)return found;
    if(required)throw new Error(`[DuduQ Y3 Track B] ASSET_GAP: ${text(query)}`);
    return null;
  }
  function technicalReady(row){
    return ["PASS","TARGET_OPTION_AUDIO_GAP","TARGET_INSTRUCTION_IMAGE_GAP"].includes(row?.technical);
  }
  function promptVisualText(source){
    const value=text(source?.visualQuery);
    const math=value.match(/^math:(.*):([^:]+)$/i);
    return math?text(math[1],value):value;
  }
  function englishInstruction(source){
    if(source.id==="EN3-M2-08")return"Choose the question about age.";
    if(text(source.listenText))return text(source.listenText);
    if(source.id==="EN3-M1-03")return"Choose the morning greeting.";
    if(source.id==="EN3-M1-14")return"Choose the goodbye phrase.";
    if(source.id==="EN3-M1-10")return"Choose the sentence that matches the scene.";
    return"Choose the best answer.";
  }
  function quotedBlank(prompt){const p=text(prompt);const m=p.match(/[“\"]([^”\"]*_{2,}[^”\"]*)[”\"]/);return m?m[1]:""}

  function parseVisualQuery(query){
    const raw=text(query);
    const profile=raw.match(/^profile:([^:]+):(\d+)$/i);
    if(profile){
      const concept=singular(profile[1]);
      return {raw,concept,count:1,variants:[],caption:`AGE ${profile[2]}`,profile:true,expectedCanonicalAsset:concept};
    }
    const normalized=normalizeWords(raw);
    const tokens=normalized.split(/\s+/).filter(Boolean);
    let count=1;
    if(tokens.length&&/^\d+$/.test(tokens[0]))count=Math.max(1,Number(tokens.shift()));
    else if(tokens.length&&NUMBER_WORDS[tokens[0]])count=NUMBER_WORDS[tokens.shift()];
    const contentTokens=tokens.filter(t=>t!=="a"&&t!=="an"&&t!=="the"&&t!=="and");
    const concept=singular(contentTokens[contentTokens.length-1]||normalized||"visual");
    const variants=contentTokens.slice(0,-1).filter(t=>VARIANTS.has(t));
    const variant=text(variants.join("-"));
    return {raw,concept,count,variants,caption:"",profile:false,expectedCanonicalAsset:variant?`${concept}/${variant}`:concept};
  }
  function semanticallyMatches(canonicalAsset,descriptor){
    if(!canonicalAsset)return false;
    const key=normalizeWords(canonicalAsset.key);
    const concept=normalizeWords(descriptor.concept);
    if(concept&&!key.includes(concept))return false;
    return descriptor.variants.every(v=>key.includes(normalizeWords(v)));
  }
  function repeatVisual(symbol,count){
    const n=Math.max(1,Number(count)||1);
    if(n<=8)return Array.from({length:n},()=>symbol).join(" ");
    return `${symbol} ×${n}`;
  }
  function registerPending(source,descriptor,placeholder,alt){
    const entry=Object.freeze({
      id:source.id,sourceId:source.id,module:moduleNumber(source),concept:descriptor.concept,
      variant:descriptor.variants.join("-")||null,count:descriptor.count,placeholder,
      expectedCanonicalAsset:descriptor.expectedCanonicalAsset,expectedCanonicalKey:descriptor.expectedCanonicalAsset,
      alt,status:"WAITING_CANONICAL_ASSET"
    });
    PENDING_CANONICAL_ASSETS.set(source.id,entry);
    return entry;
  }
  function visualFor(source,row){
    const module=moduleNumber(source);
    if(!row?.modalities?.includes("image")||!text(source.visualQuery))return null;
    const descriptor=parseVisualQuery(source.visualQuery);
    const alt=text(source.visualAlt,`Estímulo visual para ${source.visualQuery}`);

    // M01/M02 remain fail-closed regression sentinels.
    if(module<=2){
      const exact=canonical(source.visualQuery,row.image==="CANONICAL_ASSET_OK");
      return exact?{kind:"canonical",...exact,count:descriptor.count,caption:descriptor.caption,alt,descriptor}:null;
    }

    const exact=rawCanonical(source.visualQuery);
    if(exact&&semanticallyMatches(exact,descriptor)){
      PENDING_CANONICAL_ASSETS.delete(source.id);
      return {kind:"canonical",...exact,count:descriptor.count,caption:descriptor.caption,alt,descriptor};
    }

    // Safe reuse is permitted only when color/size variants are not part of the construct.
    if(descriptor.concept&&!descriptor.variants.length){
      const base=rawCanonical(descriptor.concept);
      if(base&&semanticallyMatches(base,descriptor)){
        PENDING_CANONICAL_ASSETS.delete(source.id);
        return {kind:"canonical",...base,count:descriptor.count,caption:descriptor.caption,alt,descriptor,reusedBase:true};
      }
    }

    const symbol=PLACEHOLDER_SYMBOLS[descriptor.concept]||PLACEHOLDER_SYMBOLS.default;
    const pending=registerPending(source,descriptor,symbol,alt);
    return {
      kind:"placeholder",type:"placeholder",value:symbol,count:descriptor.count,caption:descriptor.caption,alt,
      expectedAsset:descriptor.expectedCanonicalAsset,visualStatus:"TEMP_VISUAL_PLACEHOLDER",status:"WAITING_CANONICAL_ASSET",
      descriptor,pending
    };
  }
  function imageRequirement(visual){
    if(!visual)return{required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    if(visual.kind==="canonical")return{required:true,concept:visual.descriptor?.raw||visual.query,canonicalStatus:"CANONICAL_ASSET_OK",resolvedKey:visual.key,count:visual.count};
    return{required:true,concept:visual.descriptor?.raw,canonicalStatus:"TEMP_VISUAL_PLACEHOLDER",visualStatus:"PLACEHOLDER",expectedCanonicalAsset:visual.expectedAsset,count:visual.count};
  }
  function visualMedia(visual){
    if(!visual)return null;
    if(visual.kind==="canonical")return{type:"image",src:visual.url,assetKey:visual.key,alt:visual.alt,count:visual.count,caption:visual.caption,visualStatus:"CANONICAL_ASSET_OK"};
    return{type:"placeholder",value:visual.value,count:visual.count,alt:visual.alt,caption:visual.caption,expectedAsset:visual.expectedAsset,visualStatus:"TEMP_VISUAL_PLACEHOLDER",status:"WAITING_CANONICAL_ASSET"};
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
    const visual=visualFor(source,row);
    const blank=quotedBlank(source.prompt);
    const dialogue=analysis.interactionIntent==="dialogue_completion";
    const dialogueLead=source.id==="EN3-M2-08"?"":text(source.listenText);
    let sentence=blank||(dialogue&&dialogueLead?`${dialogueLead} — ___`:"___");
    if(visual?.caption)sentence=`${visual.caption} — ${sentence}`;
    if(visual?.kind==="placeholder")sentence=`${repeatVisual(visual.value,visual.count)} — ${sentence}`;
    q.metadata.smartSentence={
      mode:"complete-sentence",instruction:source.prompt,instructionSpoken:englishInstruction(source),language:"en-US",sentence,
      options:(source.alternatives||[]).map(a=>({id:a.id,value:text(a.text),label:text(a.text),spokenText:text(a.audioText,a.text)})),
      answer:text(source.answer?.text),interaction:{tap:true,drag:false,reorder:false,remove:true,shuffle:true},
      hints:[{afterErrors:1,text:"Observe novamente a pista e compare as opções."}],
      feedback:{correct:"Muito bem!",incorrect:"Observe a pista e tente outra vez."},
      difficulty:{level:difficulty(source.difficulty)==="hard"?3:difficulty(source.difficulty)==="medium"?2:1,hintAfterErrors:1}
    };
    if(visual?.kind==="canonical"){
      q.metadata.smartSentence.image={src:visual.url,assetKey:visual.key,alt:visual.alt};
      q.metadata.smartSentence.imageAlt=visual.alt;
    }else if(visual?.kind==="placeholder"){
      q.metadata.smartSentence.placeholderVisual=visualMedia(visual);
    }
    q.metadata.imageRequirement=imageRequirement(visual);
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
    const hasImageStimulus=optionAudio&&analysis.requiredModalities.includes("image");
    const stimulus=hasImageStimulus?visualFor(source,row):null;
    const needsOptionImages=!optionAudio&&row.image==="CANONICAL_ASSET_OK"&&analysis.requiredModalities.includes("image");
    const items=(source.alternatives||[]).map(a=>{
      const spoken=text(a.audioText,a.text);
      const item={id:a.id,label:text(a.text),alt:text(a.imageAlt,a.text),spokenText:spoken,speechLocale:"en-US",audioDescription:`Ouvir ${spoken}`};
      if(needsOptionImages){
        const image=canonical(a.imageQuery||a.text,true);
        item.imageUrl=image.url;item.imageSrc=image.url;item.imageAssetKey=image.key;item.assetKey=image.key;
      }
      return item;
    });
    q.metadata.targetShooter={
      audioText:optionAudio?"":text(source.listenText,source.answer?.text),
      promptVisual:optionAudio&&!hasImageStimulus?promptVisualText(source):"",
      promptVisualMedia:hasImageStimulus?visualMedia(stimulus):null,
      mode:optionAudio?"visual-to-audio":needsOptionImages?"audio-to-image":"audio-to-choice",shape:"balloon",correctIds:[source.answer?.id],items,
      difficulty:{speed:difficulty(source.difficulty)==="hard"?.42:difficulty(source.difficulty)==="medium"?.34:.28,objectCount:items.length,spawnIntervalMs:900,requiredCorrect:1,targetSize:172,timeLimitMs:0,timerMode:"none"}
    };
    if(optionAudio){
      q.metadata.technicalContract.optionAudio=true;
      if(hasImageStimulus)q.metadata.technicalContract.stimulusVisual=true;
      if(row.technical!=="PASS")q.metadata.technicalContract.resolvedGate=row.technical;
    }
    q.metadata.imageRequirement=hasImageStimulus?imageRequirement(stimulus):needsOptionImages?{required:true,canonicalStatus:"CANONICAL_ASSET_OK"}:{required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  function buildDrag(source,analysis){
    const q=baseQuestion(source,analysis,"drag-drop");
    if(source.id!=="EN3-M1-12")throw new Error(`[DuduQ Y3 Track B] drag sentinel inesperado: ${source.id}`);
    const letters=["H","E","L","L","O"],targetId=`${source.id}-sequence`;
    const items=letters.map((letter,index)=>({id:`${source.id}-letter-${index+1}`,label:letter,text:letter,spokenText:letter,speechLocale:"en-US",audioDescription:`Ouvir letra ${letter}`,targetId,required:true,sequenceIndex:index}));
    q.alternatives=items.map(item=>({id:item.id,text:item.label,label:item.label,audioText:item.spokenText,spokenText:item.spokenText,speechLocale:item.speechLocale,audio:audio(item.spokenText),metadata:{speechText:item.spokenText,speechLanguage:"en-US"}}));
    q.answer={type:"sequence",value:items.map(item=>item.id)};
    q.metadata.sequenceTargetId=targetId;q.metadata.sequenceTitle="H – E – L – L – O";
    q.payload={mode:"sequence",strategy:"sequence",options:{shuffleItems:true,shuffleTargets:false,maxAttempts:3},retry:{maxAttempts:3,wrongBehaviour:"return-incorrect"},items,targets:[{id:targetId,label:"H – E – L – L – O",accessibleLabel:"Monte a sequência ouvida",capacity:letters.length,kind:"list",audio:{text:text(source.listenText,"H. E. L. L. O."),spokenText:text(source.listenText,"H. E. L. L. O."),language:"en-US",speechLocale:"en-US",repeatable:true}}]};
    q.metadata.dragSemanticRole="sequence";q.metadata.dragValueJustification="Sequenciar cartões reproduz diretamente a ordem auditiva-alvo.";
    q.metadata.imageRequirement={required:false,canonicalStatus:"ASSET_NOT_REQUIRED"};
    return q;
  }

  const BUILDERS=Object.freeze({"smart-sentence":buildSmart,"word-slash":buildWordSlash,"bubble-pop":buildBubble,"target-shooter":buildTarget,"drag-drop":buildDrag});

  function ensureFoundation(){
    if(!Orchestrator||!Profile||!Matrix)throw new Error("[DuduQ Y3 Track B] foundation incompleta.");
    if(Profile.yearProfile!==PROFILE)throw new Error("[DuduQ Y3 Track B] perfil Y3 inesperado.");
    Object.entries(BUILDERS).forEach(([id,builder])=>Orchestrator.registerBuilder(id,builder));
  }
  function publish(spec){
    ensureFoundation();
    const module=Number(spec?.module);
    if(!SUPPORTED_MODULES.includes(module))throw new Error(`[DuduQ Y3 Track B] módulo não autorizado: M${String(module).padStart(2,"0")}.`);
    if(!Array.isArray(spec.items)||spec.items.length!==15)throw new Error(`[DuduQ Y3 Track B] M${String(module).padStart(2,"0")} exige 15 itens-fonte.`);
    const questions=spec.items.map(source=>{
      if(!new RegExp(`^EN3-M${module}-\\d{2}$`).test(source.id))throw new Error(`[DuduQ Y3 Track B] ID fora do módulo M${String(module).padStart(2,"0")}: ${source.id}`);
      const analysis=analysisFor(source),row=Matrix.plan[source.id];
      if(!technicalReady(row))throw new Error(`[DuduQ Y3 Track B] bloqueio técnico: ${source.id} / ${row.technical}`);
      const built=Orchestrator.orchestrate(source,analysis,{yearProfile:PROFILE,mechanicProfiles:Profile.mechanicProfiles});
      if(built.status!=="BUILT"||!built.payload)throw new Error(`[DuduQ Y3 Track B] orquestração bloqueada: ${source.id} / ${built.selection?.reason||"UNKNOWN"}`);
      if(built.selection.mechanic!==row.primary)throw new Error(`[DuduQ Y3 Track B] seleção divergente: ${source.id}`);
      return built.payload;
    });
    const records=questions.map(q=>({id:q.id,sourceId:q.sourceId,mechanic:q.delivery.mechanic,analysis:{dragSemanticRole:q.metadata.dragSemanticRole,dragValueJustification:q.metadata.dragValueJustification}}));
    const dragAudit=Orchestrator.decorativeDragDetector(records);
    if(dragAudit.status!=="PASS")throw new Error("[DuduQ Y3 Track B] decorative drag detectado.");
    const moduleTag=String(module).padStart(2,"0"),mk=`module${moduleTag}`,version=versionFor(module);
    const pending=[...PENDING_CANONICAL_ASSETS.values()].filter(item=>item.module===module);
    const visualStatus=pending.length?"PLACEHOLDER":"PASS";
    const publicationStatus=pending.length?"NO-GO — CANONICAL ASSETS PENDING":"READY";
    const moduleObject={
      id:`duduq-english-y3-module-${moduleTag}-track-b`,version,subject:"english",year:3,module,
      title:spec.title,description:spec.objective,estimatedMinutes:12,
      pedagogyPolicy:{profile:PROFILE,readingDefault:"GUIDED",autonomousEnglishReadingRequired:false,audioRepeatable:true,multimodalityPriority:true,noMechanicQuota:true},
      factory:{tag:module===1?"y3-track-b-m01-sentinel":`y3-track-b-m${moduleTag}`,engine:"Canary R151",core:"1.0.12",mechanics:MECHANIC_VERSIONS},
      implementationStatus:"PASS",contentStatus:"PASS",mechanicStatus:"PASS",technicalStatus:"PASS",technicalBlockers:0,
      visualStatus,publicationStatus,assetImplementationGate:pending.length?"PASS_WITH_PLACEHOLDERS":"PASS",canonicalAssetGate:pending.length?"PENDING":"PASS",
      pendingCanonicalAssets:Object.freeze(pending),readyForAssetReplacement:pending.length>0,
      activities:questions.map((q,index)=>({id:`Y3-M${moduleTag}-A${String(index+1).padStart(2,"0")}`,title:q.metadata.activityTitle,topic:q.metadata.screenTitle,mechanic:q.delivery.mechanic,skill:{description:q.skill.description},questions:[q]}))
    };
    globalThis.DUDUQ_CONTENT=globalThis.DUDUQ_CONTENT||{};
    globalThis.DUDUQ_CONTENT.english=globalThis.DUDUQ_CONTENT.english||{};
    globalThis.DUDUQ_CONTENT.english.year3=globalThis.DUDUQ_CONTENT.english.year3||{};
    globalThis.DUDUQ_CONTENT.english.year3[mk]=Object.freeze(moduleObject);
    return moduleObject;
  }
  function pendingCanonicalAssets(){return Object.freeze([...PENDING_CANONICAL_ASSETS.values()].map(item=>({...item})))}
  function clearPendingCanonicalAssets(){PENDING_CANONICAL_ASSETS.clear();return true}

  return Object.freeze({version:"3.0.0-track-b-year3",profile:PROFILE,publish,builders:BUILDERS,pendingCanonicalAssets,clearPendingCanonicalAssets,mechanicVersions:MECHANIC_VERSIONS});
});
