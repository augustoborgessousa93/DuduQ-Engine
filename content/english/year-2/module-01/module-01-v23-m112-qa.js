/* DUDUQ English Year 2 — M01-12 direct QA content
   QA-only entrypoint. Uses the same v2.3 Factory, question source, plan and Drag & Drop runtime,
   but isolates EN2-M1-12 so the first-listen gate can be validated without traversing prior steps.
*/
(function(){
  "use strict";
  window.DUDUQ_CONTENT=window.DUDUQ_CONTENT||{};
  window.DUDUQ_CONTENT.english=window.DUDUQ_CONTENT.english||{};
  window.DUDUQ_CONTENT.english.year2=window.DUDUQ_CONTENT.english.year2||{};

  const items=[{
    id:"EN2-M1-12",
    status:"Reescrever",
    difficulty:"Média",
    skill:"Escuta",
    ability:"Compreender nomes de letras em inglês para identificar uma palavra curta soletrada.",
    prompt:"Ouça as letras em inglês: “L – E – O”. Qual nome foi soletrado?",
    alternatives:["LEO","LOE","LEA","ELO"],
    alternativeTypes:["audio","audio","audio","audio"],
    answerIndex:0,
    answer:"LEO",
    media:"Áudio EN obrigatório: nomes das letras L, E, O, com pausas naturais; não exibir as letras durante a primeira escuta. Formato sugerido: Escuta + letras móveis. Tópico=ALPHABET | Mecânica=Escuta + escolha auditiva/contextual | Leitura=NÃO | Feedback=pista + 2ª tentativa | Obs.=grafia pós-resposta | Assets=áudio repetível + visual + alt-text",
    suggestedFormat:"Escuta + letras móveis.",
    topic:"ALPHABET"
  }];

  const plan={
    "EN2-M1-12":{
      mode:"spelling-build",
      mechanic:"drag-drop",
      reading:"R0-R1",
      stimulus:"L. E. O.",
      firstListenGate:true,
      forceOwnActivity:true,
      studentCommand:"🔊🧩 OUÇA E MONTE",
      topic:"ALPHABET"
    }
  };

  const pedagogicalProfile={
    baseEditorial:"Manual do Educador – 2º ano, Unidade 1, p. 28",
    objective:"Reconhecer nomes de letras em inglês e compreender soletração curta com apoio auditivo.",
    targetVocabulary:"alphabet A-Z",
    chunks:"How do you spell...?",
    prioritySkills:"Escuta; reconhecimento de letras por som; grafia como apoio não obrigatório.",
    productiveExtension:"Ouvir uma soletração curta e montar o nome com letras móveis.",
    implementationRule:"A leitura autônoma em inglês não pode ser requisito. Não exibir as letras durante a primeira escuta.",
    themeTopic:"Greetings & The Alphabet",
    readingMediaPrinciple:"OUVIR + RECONHECER + ASSOCIAR."
  };

  const module=window.DuduQYear2V23Factory.buildModule({
    module:1,
    title:"Greetings & The Alphabet — M1-12 QA",
    pages:[32,33,34,35,36,37],
    pedagogicalProfile,
    items,
    plan
  });

  const activity=(module.activities||[]).find(a=>(a.questions||[]).some(q=>q.id==="EN2-M1-12"));
  if(!activity||activity.id!=="en2-m1-12-drag-drop-alphabet"||activity.mechanic!=="drag-drop"){
    throw new Error("[DuduQ Year2 v2.3 M1-12 QA] atividade esperada não foi construída.");
  }

  window.DUDUQ_CONTENT.english.year2.module01v23m112qa=Object.freeze({
    ...module,
    id:"english-year-2-module-01-v23-m112-qa",
    title:"M1-12 — First Listen QA",
    activities:[activity],
    audit:{...(module.audit||{}),qaOnly:true,sourceQuestionId:"EN2-M1-12"}
  });
})();
