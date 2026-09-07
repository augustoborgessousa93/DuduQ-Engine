/* DUDUQ English Year 3 — UX pedagogical mechanic diversity overlay.
   Applies only the equivalence-based mechanic changes approved by the
   Year 3 UX correction. The frozen v2.3 source content remains untouched.
*/
(function(root,factory){
  "use strict";
  const base=root?.DuduQY3OrchestrationMatrix||
    (typeof module!=="undefined"&&module.exports?require("./y3-orchestration-matrix-v1.js"):null);
  const api=factory(base);
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  if(root)root.DuduQY3OrchestrationMatrix=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this,function(Base){
  "use strict";
  if(!Base||!Base.plan)throw new Error("[DuduQ Y3 UX] matriz-base indisponível.");

  const ALL=Object.freeze(["matching","target-shooter","bubble-pop","smart-sentence","word-slash","drag-drop"]);
  const CHANGES=Object.freeze({
    "EN3-M1-07":Object.freeze({
      primary:"bubble-pop",secondary:"target-shooter",
      reason:"Escuta de número com escolha de numeral: Bubble Pop preserva o estímulo oral e a resposta curta, acrescentando variedade sem mudar o construto.",
      changeReason:"PEDAGOGICAL_EQUIVALENCE — escuta→numeral já possui Bubble Pop como alternativa válida."
    }),
    "EN3-M2-11":Object.freeze({
      primary:"bubble-pop",secondary:"target-shooter",
      reason:"Escuta de número com escolha de numeral: Bubble Pop preserva integralmente o estímulo oral e a resposta numérica.",
      changeReason:"PEDAGOGICAL_EQUIVALENCE — quebra repetição de Target Shooter em tarefa auditiva curta."
    }),
    "EN3-M2-15":Object.freeze({
      primary:"bubble-pop",secondary:"target-shooter",
      reason:"Escuta de número com escolha de numeral: Bubble Pop mantém áudio como evidência principal e numeral como resposta.",
      changeReason:"PEDAGOGICAL_EQUIVALENCE — alternativa auditiva curta sem leitura autônoma."
    }),
    "EN3-M3-12":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A criança reconhece qual expressão descreve a imagem; Target Shooter visual→áudio é mais fiel que transformar reconhecimento em preenchimento.",
      changeReason:"SMART_NOT_FALLBACK — reconhecimento visual de quantidade/cor/animal."
    }),
    "EN3-M3-13":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A ação é reconhecer a descrição correta de uma cena visual; Target Shooter oferece estímulo visual e áudio repetível nas opções.",
      changeReason:"SMART_NOT_FALLBACK — reconhecimento visual de quantidade/cor/animal."
    }),
    "EN3-M3-15":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A tarefa pede reconhecer a expressão correspondente à imagem; seleção visual→áudio preserva melhor o construto.",
      changeReason:"SMART_NOT_FALLBACK — descrição visual reconhecida, não construída."
    }),
    "EN3-M4-15":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A operação é um estímulo visual e a criança reconhece sua leitura oral; Target Shooter apresenta a operação e mantém áudio repetível nas opções.",
      changeReason:"SMART_NOT_FALLBACK — reconhecimento de frase matemática, não construção."
    }),
    "EN3-M5-07":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"Reconhecimento de descrição visual de quantidade, cor e forma; Target Shooter visual→áudio preserva a evidência sem exigir construção textual.",
      changeReason:"M05_REQUIRED_AUDIT — reconhecimento audiovisual equivalente e mais natural."
    }),
    "EN3-M5-10":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A criança identifica qual expressão corresponde ao estímulo visual; Target Shooter visual→áudio é pedagogicamente equivalente e reduz repetição.",
      changeReason:"M05_REQUIRED_AUDIT — reconhecimento, não montagem de frase."
    }),
    "EN3-M5-12":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A tarefa é reconhecer a descrição correta de quatro quadrados verdes; escolha audiovisual preserva o construto multimodal.",
      changeReason:"M05_REQUIRED_AUDIT — alternativa equivalente usada como desempate por diversidade."
    }),
    "EN3-M5-14":Object.freeze({
      primary:"target-shooter",secondary:"smart-sentence",audio:"OPTION_AUDIO_REQUIRED_REPEATABLE",
      reason:"A criança reconhece uma descrição de quantidade, cor e forma; Target Shooter visual→áudio mantém o alvo linguístico e a resposta intactos.",
      changeReason:"M05_REQUIRED_AUDIT — reconhecimento visual, não produção guiada."
    })
  });

  const plan=Object.freeze(Object.fromEntries(Object.entries(Base.plan).map(([id,row])=>{
    const change=CHANGES[id];
    return [id,change?Object.freeze({...row,...change}):row];
  })));

  function distribution(){
    return Object.freeze(Object.values(plan).reduce((out,row)=>{
      out[row.primary]=(out[row.primary]||0)+1;
      return out;
    },{}));
  }

  function materialize(sourceItems){
    const baseRows=Base.materialize(sourceItems);
    return Object.freeze(baseRows.map(row=>{
      const p=plan[row.ID];
      const eligible=[p.primary,p.secondary].filter(Boolean);
      const blocked=ALL.filter(mechanic=>!eligible.includes(mechanic));
      return Object.freeze({
        ...row,
        interactionIntent:p.intent,
        readingDemand:p.reading,
        requiredModalities:[...p.modalities],
        imageRequirement:p.image,
        audioRequirement:p.audio,
        eligibleMechanics:eligible,
        blockedMechanics:blocked,
        primaryMechanic:p.primary,
        secondaryMechanic:p.secondary,
        pedagogicalReason:p.reason,
        assetRequirement:p.image,
        technicalGate:p.technical,
        dragSemanticRole:p.dragRole
      });
    }));
  }

  return Object.freeze({
    ...Base,
    version:"1.1.0-ux-correction",
    baseVersion:Base.version,
    plan,
    materialize,
    distribution,
    uxChanges:CHANGES
  });
});
