/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   My First English Words
   Versão 1.1.0 — BLOCO 01: GREETINGS

   STATUS DE PRODUÇÃO
   - Este build contém somente a ETAPA 1, já em formato oficial.
   - As próximas etapas serão acrescentadas após validação pedagógica
     e funcional desta etapa.
   - Não altera Core, Shell, World Fusion ou mecânicas.

   CÓDIGOS PEDAGÓGICOS
   - ENG1-M01-* são identificadores internos DuduQ.
   - Não representam, por si só, códigos oficiais da BNCC.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.1.0";

  window.DUDUQ_CONTENT =
    window.DUDUQ_CONTENT || {};

  window.DUDUQ_CONTENT.english =
    window.DUDUQ_CONTENT.english || {};

  window.DUDUQ_CONTENT.english.year1 =
    window.DUDUQ_CONTENT.english.year1 || {};

  if (
    window.DUDUQ_CONTENT
      .english
      .year1
      .module01
      ?.version === VERSION
  ) {
    return;
  }

  const GREETINGS_SKILL = Object.freeze({
    code: "ENG1-M01-S01",
    description:
      "Reconhecer oralmente e visualmente cumprimentos simples em língua inglesa, associando som e forma escrita."
  });

  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,

    subject: "Língua Inglesa",
    year: 1,
    module: 1,

    title: "My First English Words",

    description:
      "Primeira missão de contato com palavras muito frequentes da língua inglesa, com prioridade para escuta, reconhecimento visual e associação entre som e escrita.",

    estimatedMinutes: 3,

    learningGoals: [
      "Ouvir e reconhecer cumprimentos simples em língua inglesa.",
      "Associar a palavra ouvida à sua forma escrita.",
      "Diferenciar HELLO, HI, GOOD MORNING e BYE em situações de reconhecimento."
    ],

    pedagogicalNotes: {
      stage:
        "Bloco 01 de produção do Módulo 01.",

      literacyProfile:
        "Para o 1º ano, o conteúdo pedagógico é apresentado em caixa alta pelo perfil de alfabetização do DuduQ.",

      oralPriority:
        "O áudio apresenta a palavra-alvo em inglês; o enunciado em português orienta apenas a ação da criança.",

      semanticDecision:
        "THANK YOU e PLEASE não entram nesta etapa porque são expressões de cortesia, não cumprimentos. Serão trabalhadas em momento semanticamente adequado.",

      translationDecision:
        "A tradução não aparece como alternativa. Quando útil, o feedback correto oferece uma explicação breve em português, evitando transformar a atividade em pareamento tradução-tradução.",

      distractorDecision:
        "As alternativas são palavras reais do mesmo repertório. A criança precisa discriminar o som ouvido e localizar a grafia correspondente."
    },

    intro: {
      companyKicker: "UMA CRIAÇÃO DE",
      companyWidth: 820,

      collectionLogo:
        "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Logo%20EduQ%20Play.png",

      collectionName: "EduQ Play",
      collectionAlt: "EduQ Play",
      collectionWidth: 760,

      loadingLabel: "PREPARANDO SUA MISSÃO",
      readyLabel: "MISSÃO PRONTA",
      startLabel: "INICIAR MISSÃO",
      hint: "Tudo pronto para começar!",

      minDurationMs: 2200,
      brandingDurationMs: 3000,
      switchingDurationMs: 760,
      missionMinDurationMs: 1200,
      sparkCount: 14
    },

    activities: [
      {
        id: "eng1-m01-step-01-greetings",
        title: "Greetings",
        mechanic: "bubble-pop",

        skill: GREETINGS_SKILL,

        questions: [
          /* -------------------------------------------------
             QUESTÃO 1 — HELLO
             Primeira exposição: 3 alternativas.
             ------------------------------------------------- */
          {
            id: "eng1-m01-greetings-01-hello",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: GREETINGS_SKILL,

            difficulty: "easy",

            statement: "Greetings",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Hello",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "hello",
                text: "HELLO",
                metadata: {
                  tone: "blue"
                }
              },
              {
                id: "bye",
                text: "BYE",
                metadata: {
                  tone: "pink"
                }
              },
              {
                id: "hi",
                text: "HI",
                metadata: {
                  tone: "green"
                }
              }
            ],

            answer: {
              type: "single",
              value: "hello"
            },

            feedback: {
              correct:
                "Muito bem! HELLO é uma forma de cumprimentar alguém.",
              incorrect:
                "Escute novamente e escolha a palavra que corresponde ao som.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 25,
              tags: [
                "greetings",
                "hello",
                "listening",
                "word-recognition"
              ]
            }
          },

          /* -------------------------------------------------
             QUESTÃO 2 — HI
             Mantém 3 alternativas, trocando a posição-alvo.
             ------------------------------------------------- */
          {
            id: "eng1-m01-greetings-02-hi",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: GREETINGS_SKILL,

            difficulty: "easy",

            statement: "Greetings",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Hi",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "bye",
                text: "BYE",
                metadata: {
                  tone: "yellow"
                }
              },
              {
                id: "hi",
                text: "HI",
                metadata: {
                  tone: "blue"
                }
              },
              {
                id: "hello",
                text: "HELLO",
                metadata: {
                  tone: "green"
                }
              }
            ],

            answer: {
              type: "single",
              value: "hi"
            },

            feedback: {
              correct:
                "Muito bem! HI também é usado para cumprimentar alguém.",
              incorrect:
                "Ouça com atenção mais uma vez e tente novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 25,
              tags: [
                "greetings",
                "hi",
                "listening",
                "word-recognition"
              ]
            }
          },

          /* -------------------------------------------------
             QUESTÃO 3 — GOOD MORNING
             Introduz frase curta. Agora 4 alternativas.
             ------------------------------------------------- */
          {
            id: "eng1-m01-greetings-03-good-morning",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: GREETINGS_SKILL,

            difficulty: "easy",

            statement: "Greetings",
            instruction:
              "Ouça e escolha a expressão que você ouviu.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Good morning",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "hi",
                text: "HI",
                metadata: {
                  tone: "green"
                }
              },
              {
                id: "good-morning",
                text: "GOOD MORNING",
                metadata: {
                  tone: "yellow"
                }
              },
              {
                id: "bye",
                text: "BYE",
                metadata: {
                  tone: "pink"
                }
              },
              {
                id: "hello",
                text: "HELLO",
                metadata: {
                  tone: "blue"
                }
              }
            ],

            answer: {
              type: "single",
              value: "good-morning"
            },

            feedback: {
              correct:
                "Excelente! GOOD MORNING é um cumprimento usado pela manhã.",
              incorrect:
                "Escute a expressão novamente e observe as palavras com calma.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 30,
              tags: [
                "greetings",
                "good-morning",
                "listening",
                "phrase-recognition"
              ]
            }
          },

          /* -------------------------------------------------
             QUESTÃO 4 — BYE
             Fechamento: 4 alternativas e revisão do repertório.
             ------------------------------------------------- */
          {
            id: "eng1-m01-greetings-04-bye",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: GREETINGS_SKILL,

            difficulty: "easy",

            statement: "Greetings",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Bye",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "good-morning",
                text: "GOOD MORNING",
                metadata: {
                  tone: "yellow"
                }
              },
              {
                id: "hello",
                text: "HELLO",
                metadata: {
                  tone: "green"
                }
              },
              {
                id: "bye",
                text: "BYE",
                metadata: {
                  tone: "blue"
                }
              },
              {
                id: "hi",
                text: "HI",
                metadata: {
                  tone: "pink"
                }
              }
            ],

            answer: {
              type: "single",
              value: "bye"
            },

            feedback: {
              correct:
                "Muito bem! BYE é uma palavra usada para se despedir.",
              incorrect:
                "Escute novamente. Qual palavra corresponde ao som que você ouviu?",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 30,
              tags: [
                "greetings",
                "bye",
                "listening",
                "word-recognition"
              ]
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT
    .english
    .year1
    .module01 =
      Object.freeze(
        moduleDefinition
      );
})();

