/* DUDUQ TEST CONTENT — BUBBLE POP 1.0.30 SUBCARD PARITY */
(function () {
  "use strict";
  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.test = window.DUDUQ_CONTENT.test || {};

  const moduleDefinition = {
    id: "duduq-test-bubble-pop-1.0.30",
    version: "test-bubble-pop-1.0.30-1",
    subject: "Língua Inglesa",
    year: 1,
    module: 0,
    title: "BUBBLE POP",
    description: "Homologação isolada da geometria do subcard de enunciado.",
    estimatedMinutes: 1,
    intro: {
      companyKicker: "HOMOLOGAÇÃO",
      collectionName: "Bubble Pop 1.0.30",
      loadingLabel: "CARREGANDO TESTE",
      readyLabel: "TESTE PRONTO",
      startLabel: "ABRIR BUBBLE POP",
      hint: "Ambiente isolado — Canary 142 permanece intacto",
      minDurationMs: 0,
      brandingDurationMs: 0,
      switchingDurationMs: 0,
      missionMinDurationMs: 0,
      sparkCount: 0
    },
    activities: [{
      id: "homolog-bubble-pop-1030",
      title: "BUBBLE POP",
      mechanic: "bubble-pop",
      skill: { code: null, description: "Reconhecer vocabulário familiar em inglês." },
      questions: [{
        id: "BP1030-WORD-APPLE",
        subject: "Língua Inglesa",
        year: 1,
        module: 0,
        difficulty: "easy",
        statement: "WORDS",
        instruction: "Estoure a bolha com a palavra APPLE.",
        contentLanguage: "en",
        instructionLanguage: "pt-BR",
        feedbackLanguage: "pt-BR",
        audio: { enabled: true, text: "Apple.", src: null, language: "en-US", role: "instruction" },
        alternatives: [
          { id: "apple", text: "APPLE", metadata: { tone: "green", speechText: "apple" } },
          { id: "house", text: "HOUSE", metadata: { tone: "blue", speechText: "house" } },
          { id: "dog", text: "DOG", metadata: { tone: "orange", speechText: "dog" } }
        ],
        answer: { type: "single", value: "apple" },
        feedback: { correct: "Muito bem!", incorrect: "Observe e tente novamente.", language: "pt-BR" },
        delivery: { mechanic: "bubble-pop", preferred: ["bubble-pop"], allowImage: false, allowAudio: true },
        metadata: {
          screenTitle: "WORDS",
          homologation: {
            mechanicRelease: "1.0.30",
            channel: "homolog-bubble-pop-1.0.30",
            productionCanaryUntouched: true
          }
        }
      }]
    }]
  };

  window.DUDUQ_CONTENT.test.bubblePop1030 = Object.freeze(moduleDefinition);
})();
