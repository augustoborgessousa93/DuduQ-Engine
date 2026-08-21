/* =========================================================
   DUDUQ TEST CONTENT — DRAG & DROP HOMOLOGATION
   Cenário sentinela: EN1-M1-09
   Não altera conteúdo oficial.
   ========================================================= */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.test = window.DUDUQ_CONTENT.test || {};

  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  const AUDIO_BASE = BASE + "Audios/";

  const moduleDefinition = {
    id: "duduq-test-drag-drop-en1-m1-09",
    version: "test-1.0.0",
    subject: "Língua Inglesa",
    year: 1,
    module: 1,
    title: "Homologação — Drag & Drop",
    description: "Teste isolado da mecânica Drag & Drop usando o cenário oficial EN1-M1-09.",
    estimatedMinutes: 1,

    /* Intro praticamente instantânea. O index.html aciona o start automaticamente.
       Use ?intro=1 na URL para inspecionar a Intro manualmente. */
    intro: {
      companyKicker: "HOMOLOGAÇÃO",
      collectionName: "Drag & Drop",
      loadingLabel: "CARREGANDO TESTE",
      readyLabel: "TESTE PRONTO",
      startLabel: "ABRIR DRAG & DROP",
      hint: "Ambiente isolado de validação",
      minDurationMs: 0,
      brandingDurationMs: 0,
      switchingDurationMs: 0,
      missionMinDurationMs: 0,
      sparkCount: 0
    },

    activities: [
      {
        id: "test-drag-drop-en1-m1-09",
        title: "I'm Augusto.",
        mechanic: "drag-drop",
        skill: {
          code: null,
          description: "Identificar apresentação pessoal simples."
        },
        questions: [
          {
            id: "EN1-M1-09",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: {
              code: null,
              description: "Identificar apresentação pessoal simples."
            },
            difficulty: "medium",
            statement: "I'm Augusto.",
            instruction: "Toque para ouvir e arraste cada áudio para a cena correspondente.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Toque para ouvir e arraste cada áudio para a cena correspondente.",
              src: AUDIO_BASE + "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ENUNCIADO_PTBR.mp3",
              language: "pt-BR",
              role: "instruction"
            },

            /* Mantemos os textos 1/2/3 exatamente como no conteúdo oficial.
               Isso é intencional: a homologação deve detectar se a mecânica
               vaza índices técnicos para a interface. */
            alternatives: [
              {
                id: "audio-1",
                text: "1",
                audio: {
                  enabled: true,
                  text: "I'm Ana.",
                  src: AUDIO_BASE + "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO01_IM-ANA_ENUS.mp3",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "audio-2",
                text: "2",
                audio: {
                  enabled: true,
                  text: "Goodbye",
                  src: AUDIO_BASE + "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO02_GOODBYE_ENUS.mp3",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "audio-3",
                text: "3",
                audio: {
                  enabled: true,
                  text: "Good afternoon",
                  src: AUDIO_BASE + "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO03_GOOD-AFTERNOON_ENUS.mp3",
                  language: "en-US",
                  role: "option"
                }
              }
            ],

            answer: {
              type: "pairs",
              value: [
                { source: "audio-1", target: "scene-selfintro" },
                { source: "audio-2", target: "scene-goodbye" },
                { source: "audio-3", target: "scene-afternoon" }
              ]
            },

            feedback: {
              correct: "Muito bem! As três associações estão corretas.",
              incorrect: "Revise as posições e tente novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              targets: [
                {
                  id: "scene-selfintro",
                  image: {
                    src: BASE + "My%20name.png",
                    alt: "Criança dizendo o próprio nome"
                  }
                },
                {
                  id: "scene-goodbye",
                  image: {
                    src: BASE + "Bye.png",
                    alt: "Cena de despedida"
                  }
                },
                {
                  id: "scene-afternoon",
                  image: {
                    src: BASE + "Good%20Afternoon.png",
                    alt: "Cena do período da tarde"
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.test.dragDrop = Object.freeze(moduleDefinition);
})();
