/* =========================================================
   DUDUQ TEST CONTENT — DRAG & DROP 2.0.19 HOMOLOGATION
   Cenário sentinela: EN1-M2-11 — six, seven, eight
   Não altera conteúdo oficial.
   ========================================================= */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.test = window.DUDUQ_CONTENT.test || {};

  function numeralFallback(value) {
    const safe = String(value).replace(/[^0-9]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 400"><rect width="560" height="400" rx="42" fill="#F7FBFF"/><circle cx="280" cy="200" r="150" fill="#FFFFFF" stroke="#183B66" stroke-width="8"/><text x="280" y="265" text-anchor="middle" font-size="190" font-weight="900" font-family="system-ui,sans-serif" fill="#17375e">${safe}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function numberImage(word, numeral) {
    try {
      const resolved = window.DuduQAssets?.resolveImage?.(word);
      if (typeof resolved === "string" && resolved.trim()) return resolved.trim();
    } catch (_) {}
    return numeralFallback(numeral);
  }

  const moduleDefinition = {
    id: "duduq-test-drag-drop-2.0.19-en1-m2-11",
    version: "test-2.0.19-sequence-1",
    subject: "Língua Inglesa",
    year: 1,
    module: 2,
    title: "NUMBERS",
    description: "Homologação isolada da sequência 6 → 7 → 8 no Drag & Drop 2.0.19.",
    estimatedMinutes: 1,

    intro: {
      companyKicker: "HOMOLOGAÇÃO",
      collectionName: "Drag & Drop 2.0.19",
      loadingLabel: "CARREGANDO TESTE",
      readyLabel: "TESTE PRONTO",
      startLabel: "ABRIR SEQUÊNCIA",
      hint: "Ambiente isolado — não altera o Canary",
      minDurationMs: 0,
      brandingDurationMs: 0,
      switchingDurationMs: 0,
      missionMinDurationMs: 0,
      sparkCount: 0
    },

    activities: [
      {
        id: "homolog-en1-m2-11",
        title: "NUMBERS",
        mechanic: "drag-drop",
        skill: {
          code: null,
          description: "Compreender uma sequência oral curta de números já estudados."
        },
        questions: [
          {
            id: "EN1-M2-11-HOMOLOG-219",
            subject: "Língua Inglesa",
            year: 1,
            module: 2,
            skill: {
              code: null,
              description: "Compreender uma sequência oral curta de números já estudados."
            },
            difficulty: "medium",
            statement: "Ouça e observe.",
            instruction: "Ouça e coloque as imagens na ordem.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "six, seven, eight",
              src: null,
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "o1",
                text: "",
                image: {
                  enabled: true,
                  src: numberImage("six", 6),
                  alt: "six"
                },
                audio: { enabled: false, src: null, text: "", language: "en-US", role: "option" }
              },
              {
                id: "o2",
                text: "",
                image: {
                  enabled: true,
                  src: numberImage("seven", 7),
                  alt: "seven"
                },
                audio: { enabled: false, src: null, text: "", language: "en-US", role: "option" }
              },
              {
                id: "o3",
                text: "",
                image: {
                  enabled: true,
                  src: numberImage("eight", 8),
                  alt: "eight"
                },
                audio: { enabled: false, src: null, text: "", language: "en-US", role: "option" }
              }
            ],

            answer: {
              type: "sequence",
              value: ["o1", "o2", "o3"]
            },

            feedback: {
              correct: "Muito bem! SIX, SEVEN, EIGHT!",
              incorrect: "Ouça novamente, observe as imagens e tente outra vez.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "drag-drop",
              preferred: ["drag-drop"],
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              screenTitle: "NUMBERS",
              sourceQuestionId: "EN1-M2-11",
              sourceCorrectAnswer: "o1 → o2 → o3",
              sequenceLabels: ["1", "2", "3"],
              sequenceTitle: "Coloque na ordem",
              layout: "sequence",
              shuffleItems: true,
              homologation: {
                mechanicRelease: "2.0.19",
                channel: "homolog-drag-drop-2.0.19",
                productionCanaryUntouched: true
              }
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.test.dragDropSequence219 = Object.freeze(moduleDefinition);
})();
