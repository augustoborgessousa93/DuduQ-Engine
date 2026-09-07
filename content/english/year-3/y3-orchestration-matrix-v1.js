/* DUDUQ English Y3 — Track B definitive 90-item orchestration matrix.
   Source content is NOT duplicated or rewritten here. `materialize()` joins this
   frozen pedagogical decision table to the six v2.3 source modules and emits the
   complete matrix requested by Track B.
*/
(function(root,factory){
  "use strict";
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY3OrchestrationMatrix=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const SOURCE_MODULES=Object.freeze({
    1:Object.freeze({file:"content/english/year-3/module-01/module-01-v1.js",blob:"e5216abe0f83228e9eec82ba59a264372ce0f70b",count:15}),
    2:Object.freeze({file:"content/english/year-3/module-02/module-02-v1.js",blob:"67bbd1ac7047baa1cf4bcbbd7d93765f492f1aaf",count:15}),
    3:Object.freeze({file:"content/english/year-3/module-03/module-03-v1.js",blob:"1613c04af3711cca2b4d2d6468d47332f05dc807",count:15}),
    4:Object.freeze({file:"content/english/year-3/module-04/module-04-v1.js",blob:"eb5847cc5b6cb792100e7bf72561141df30aae76",count:15}),
    5:Object.freeze({file:"content/english/year-3/module-05/module-05-v1.js",blob:"199bb90fdabc37cf8db69788dbe1045eb2af88f9",count:15}),
    6:Object.freeze({file:"content/english/year-3/module-06/module-06-v1.js",blob:"e22ed73237510735b2ded1387ee5fd876d305578",count:15})
  });

  const ALL=Object.freeze(["matching","target-shooter","bubble-pop","smart-sentence","word-slash","drag-drop"]);
  const REASONS=Object.freeze({
    DIALOGUE:"Resposta curta em interação social; diálogo guiado preserva a compreensão oral e permite áudio repetível sem exigir leitura autônoma.",
    GUIDED:"Lacuna linguística curta e conhecida; seleção guiada preserva o alvo sem acrescentar dificuldade gramatical.",
    VISUAL_SENTENCE:"Cena ou apoio visual precisa ser interpretado antes da escolha de uma fala/descrição curta; Smart Sentence em modo guiado mantém a evidência no significado.",
    AUDIO_NUMBER:"O estímulo é oral e a resposta é um numeral; Target/Bubble permitem reconhecimento curto sem converter a tarefa em produção textual.",
    AUDIO_IMAGE:"O estímulo é oral e a resposta deve ser reconhecida visualmente; seleção audiovisual curta é a ação cognitiva real.",
    PROFILE:"A informação precisa ser recuperada de um perfil narrado; a mecânica deve manter o áudio como fonte principal e a resposta curta.",
    LETTER:"Discriminação auditiva de uma única letra conhecida; Word Slash é apropriado com velocidade desacoplada da proficiência.",
    SEQUENCE:"A habilidade é reproduzir uma sequência auditiva de letras; arrastar cada letra para sua posição possui papel semântico de sequência.",
    VISUAL_WORD:"Reconhecimento visual de vocabulário curto com áudio de apoio; Target Shooter é preferível quando o estímulo visual puder ser exibido canonicamente.",
    VISUAL_DESC:"A resposta é uma descrição curta de um estímulo visual; modo guiado evita transformar compreensão em produção livre.",
    NUMERAL_TO_AUDIO:"O item parte de um numeral visual e exige escolher entre formas orais. A mecânica ideal precisa oferecer áudio individual repetível nas alternativas; o contrato atual do Target Shooter ainda não oferece isso.",
    MATH_SYMBOL:"O item identifica oralmente o nome de um símbolo dentro de uma operação simples. A matemática permanece suporte visual; opções precisam de áudio individual.",
    MATH_SENTENCE:"A operação simples é o estímulo e a resposta é uma frase inglesa completa; seleção guiada de frase preserva compreensão sem exigir reconstrução sintática.",
    BODY_TRANSPORT:"Reconhecimento visual curto de objeto/parte do corpo; Target Shooter é elegível apenas com estímulo visual canônico encaminhado ao runtime.",
    PLURAL:"A imagem sustenta uma escolha morfológica curta; completar a expressão é mais fiel que arrastar uma alternativa para um único alvo.",
    ATTRIBUTE:"Quantidade/cor/tamanho + substantivo formam um chunk curto; seleção guiada da descrição preserva o construto multimodal.",
    QARESPONSE:"Pergunta contextual + resposta curta; diálogo guiado é mais fiel que drag single-choice.",
    FAMILY_PRONOUN:"Completar He/She em frase familiar curta é construção guiada compatível com R1/R2.",
    FAVORITE:"Completar preferência com vocabulário conhecido é construção guiada curta apoiada por contexto.",
    PROFILE_SENTENCE:"A informação visual/narrada é convertida em uma frase curta; resposta inteira permanece uma opção guiada com áudio.",
    SCHOOL_DIALOGUE:"Mini diálogo de objeto escolar; conclusão guiada com áudio evita leitura autônoma pesada."
  });

  function row(id,intent,reading,primary,secondary,modalities,image,audio,reason,technical="PASS",dragRole=null){
    return Object.freeze({id,intent,reading,primary,secondary,modalities:Object.freeze(modalities),image,audio,reason,technical,dragRole});
  }

  const rows=[
    // M01 — Greetings, Friends & Personal Information
    row("EN3-M1-01","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","DIALOGUE"),
    row("EN3-M1-02","complete_sentence","R1","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","GUIDED"),
    row("EN3-M1-03","visual_description","R1","smart-sentence","target-shooter",["image","audio","text"],"CANONICAL_ASSET_OK","REQUIRED_REPEATABLE","VISUAL_SENTENCE"),
    row("EN3-M1-04","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","DIALOGUE"),
    row("EN3-M1-05","listen_discriminate","R0","word-slash","target-shooter",["audio","text","manipulation"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","LETTER"),
    row("EN3-M1-06","profile_comprehension","R1","bubble-pop","target-shooter",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","PROFILE"),
    row("EN3-M1-07","recognize_audio_number","R0","target-shooter","bubble-pop",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","AUDIO_NUMBER"),
    row("EN3-M1-08","profile_comprehension","R2","bubble-pop","target-shooter",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","PROFILE"),
    row("EN3-M1-09","recognize_audio_image","R0","target-shooter","bubble-pop",["audio","image"],"CANONICAL_ASSET_OK","STIMULUS_REQUIRED_REPEATABLE","AUDIO_IMAGE"),
    row("EN3-M1-10","visual_description","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","VISUAL_SENTENCE"),
    row("EN3-M1-11","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","DIALOGUE"),
    row("EN3-M1-12","sequence","R0","drag-drop","target-shooter",["audio","text","manipulation"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","SEQUENCE","PASS","sequence"),
    row("EN3-M1-13","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","DIALOGUE"),
    row("EN3-M1-14","visual_description","R1","smart-sentence","target-shooter",["image","audio","text"],"CANONICAL_ASSET_OK","REQUIRED_REPEATABLE","VISUAL_SENTENCE"),
    row("EN3-M1-15","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","DIALOGUE"),

    // M02 — Numbers 1–50 & Age
    row("EN3-M2-01","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-02","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-03","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-04","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-05","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-06","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-07","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-08","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","QARESPONSE"),
    row("EN3-M2-09","complete_sentence","R1","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","GUIDED"),
    row("EN3-M2-10","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","QARESPONSE"),
    row("EN3-M2-11","recognize_audio_number","R0","target-shooter","bubble-pop",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","AUDIO_NUMBER"),
    row("EN3-M2-12","recognize_audio_number","R0","bubble-pop","target-shooter",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","AUDIO_NUMBER"),
    row("EN3-M2-13","quantity_match","R0","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","NUMERAL_TO_AUDIO","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M2-14","dialogue_completion","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","PROFILE_SENTENCE"),
    row("EN3-M2-15","recognize_audio_number","R0","target-shooter","bubble-pop",["audio","text"],"ASSET_NOT_REQUIRED","STIMULUS_REQUIRED_REPEATABLE","AUDIO_NUMBER"),

    // M03 — Family, Toys & Animals
    row("EN3-M3-01","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-02","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-03","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-04","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-05","complete_sentence","R1","smart-sentence",null,["image","audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","FAMILY_PRONOUN"),
    row("EN3-M3-06","complete_sentence","R1","smart-sentence",null,["image","audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","FAMILY_PRONOUN"),
    row("EN3-M3-07","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","PROFILE_SENTENCE"),
    row("EN3-M3-08","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-09","complete_sentence","R1","smart-sentence",null,["image","audio","text"],"CANONICAL_ASSET_OK","REQUIRED_REPEATABLE","FAVORITE"),
    row("EN3-M3-10","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-11","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M3-12","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M3-13","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M3-14","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","PROFILE_SENTENCE"),
    row("EN3-M3-15","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),

    // M04 — Math in English & School Objects
    row("EN3-M4-01","recognize_visual_word","R1","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","MATH_SYMBOL","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M4-02","recognize_visual_word","R1","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","MATH_SYMBOL","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M4-03","recognize_visual_word","R1","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","MATH_SYMBOL","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M4-04","recognize_visual_word","R1","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","MATH_SYMBOL","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M4-05","recognize_visual_word","R1","target-shooter",null,["text","audio"],"ASSET_NOT_REQUIRED","OPTION_AUDIO_REQUIRED_REPEATABLE","MATH_SYMBOL","TARGET_OPTION_AUDIO_GAP"),
    row("EN3-M4-06","guided_sentence","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","MATH_SENTENCE"),
    row("EN3-M4-07","guided_sentence","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","MATH_SENTENCE"),
    row("EN3-M4-08","guided_sentence","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","MATH_SENTENCE"),
    row("EN3-M4-09","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M4-10","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M4-11","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M4-12","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M4-13","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M4-14","dialogue_completion","R2","smart-sentence",null,["image","audio","text"],"CANONICAL_ASSET_OK","REQUIRED_REPEATABLE","SCHOOL_DIALOGUE"),
    row("EN3-M4-15","guided_sentence","R2","smart-sentence",null,["audio","text"],"ASSET_NOT_REQUIRED","REQUIRED_REPEATABLE","MATH_SENTENCE"),

    // M05 — Shapes, Colors, Numbers & Size
    row("EN3-M5-01","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M5-02","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M5-03","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M5-04","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M5-05","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","VISUAL_WORD","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M5-06","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-07","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-08","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-09","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-10","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-11","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-12","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-13","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-14","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M5-15","complete_sentence","R1","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","PLURAL"),

    // M06 — Transportation & Body Description
    row("EN3-M6-01","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-02","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-03","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-04","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-05","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"CANONICAL_ASSET_OK","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-06","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M6-07","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M6-08","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M6-09","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-10","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-11","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-12","recognize_visual_word","R1","target-shooter","bubble-pop",["image","audio","text"],"ASSET_GAP","OPTION_AUDIO_REQUIRED_REPEATABLE","BODY_TRANSPORT","TARGET_INSTRUCTION_IMAGE_GAP"),
    row("EN3-M6-13","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M6-14","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE"),
    row("EN3-M6-15","visual_description","R2","smart-sentence",null,["image","audio","text"],"ASSET_GAP","REQUIRED_REPEATABLE","ATTRIBUTE")
  ];

  const PLAN=Object.freeze(Object.fromEntries(rows.map(r=>[r.id,r])));
  const EXPECTED_IDS=Object.freeze(Array.from({length:6},(_,m)=>Array.from({length:15},(_,i)=>`EN3-M${m+1}-${String(i+1).padStart(2,"0")}`)).flat());
  const byId=(items)=>new Map(items.map(item=>[item.id,item]));
  function statusFor(r){
    const asset=r.image==="ASSET_GAP"?"GAP":"READY";
    const technical=r.technical==="PASS"?"READY":"BLOCKED";
    return Object.freeze({orchestration:"READY",asset,technical,execution:asset==="READY"&&technical==="READY"?"READY":"BLOCKED"});
  }
  function materialize(sourceItems){
    if(!Array.isArray(sourceItems)||sourceItems.length!==90)throw new Error(`Y3_SOURCE_BASELINE: esperado 90 itens, recebido ${sourceItems?.length||0}.`);
    const source=byId(sourceItems);
    const actualIds=[...source.keys()].sort();
    const expected=[...EXPECTED_IDS].sort();
    if(JSON.stringify(actualIds)!==JSON.stringify(expected))throw new Error("Y3_SOURCE_BASELINE: conjunto de IDs divergiu.");
    return Object.freeze(EXPECTED_IDS.map(id=>{
      const s=source.get(id),p=PLAN[id];
      if(!s||!p)throw new Error(`Y3_SOURCE_BASELINE: matriz incompleta em ${id}.`);
      const eligible=[p.primary,p.secondary].filter(Boolean);
      const blocked=ALL.filter(m=>!eligible.includes(m));
      return Object.freeze({
        ID:id,module:Number(id.match(/M(\d)-/)[1]),difficulty:s.difficulty,skill:s.skill,ability:s.ability,
        linguisticTarget:s.answer?.text,sourceFormat:s.format,sourceMechanic:s.sourceMechanic,currentRuntimeMechanic:s.mechanic,
        interactionIntent:p.intent,readingDemand:p.reading,requiredModalities:[...p.modalities],imageRequirement:p.image,
        audioRequirement:p.audio,eligibleMechanics:eligible,blockedMechanics:blocked,primaryMechanic:p.primary,
        secondaryMechanic:p.secondary,pedagogicalReason:REASONS[p.reason],assetRequirement:p.image,
        technicalGate:p.technical,status:statusFor(p),dragSemanticRole:p.dragRole,
        sourceInvariant:Object.freeze({id:s.id,answer:Object.freeze({id:s.answer?.id,text:s.answer?.text}),skill:s.skill,ability:s.ability,difficulty:s.difficulty,linguisticTarget:s.answer?.text})
      });
    }));
  }
  function distribution(){return Object.freeze(rows.reduce((out,r)=>{out[r.primary]=(out[r.primary]||0)+1;return out},{}))}
  return Object.freeze({version:"1.0.0-track-b",sourceModules:SOURCE_MODULES,expectedIds:EXPECTED_IDS,plan:PLAN,materialize,distribution});
});
