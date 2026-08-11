/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   My First English Words
   Versão 1.0.0

   IMPORTANTE
   - Este arquivo contém SOMENTE conteúdo e metadados pedagógicos.
   - Não altera Core, Shell, World Fusion ou mecânicas.
   - Os códigos de habilidade ENG1-M01-* são códigos internos DuduQ.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.0";

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

  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,

    subject: "Língua Inglesa",
    year: 1,
    module: 1,

    title: "My First English Words",

    description:
      "Primeira missão de vocabulário em língua inglesa, com reconhecimento auditivo e visual de cumprimentos, cores e palavras familiares.",

    estimatedMinutes: 10,

    learningGoals: [
      "Reconhecer cumprimentos e expressões simples em língua inglesa.",
      "Identificar cores básicas em língua inglesa.",
      "Classificar palavras familiares em categorias semânticas.",
      "Associar som, palavra e significado em atividades curtas e lúdicas."
    ],

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
      /* =====================================================
         ETAPA 1 — GREETINGS — BUBBLE POP
         ===================================================== */
      {
        id: "eng1-m01-step-01-greetings",
        title: "Greetings",
        mechanic: "bubble-pop",

        skill: {
          code: "ENG1-M01-S01",
          description:
            "Reconhecer cumprimentos e expressões sociais simples em língua inglesa."
        },

        questions: [
          {
            id: "eng1-m01-greetings-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S01",
              description:
                "Reconhecer cumprimentos e expressões sociais simples em língua inglesa."
            },

            difficulty: "easy",
            statement: "Hello",
            instruction: "Escolha Hello.",

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
                text: "Hello",
                metadata: { tone: "blue" }
              },
              {
                id: "bye",
                text: "Bye",
                metadata: { tone: "pink" }
              },
              {
                id: "please",
                text: "Please",
                metadata: { tone: "green" }
              },
              {
                id: "thank-you",
                text: "Thank you",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "hello"
            },

            feedback: {
              correct: "Muito bem! Hello significa Olá.",
              incorrect: "Escute novamente e tente outra opção.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 25,
              tags: [
                "greetings",
                "hello",
                "oralidade"
              ]
            }
          },

          {
            id: "eng1-m01-greetings-02",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S01",
              description:
                "Reconhecer cumprimentos e expressões sociais simples em língua inglesa."
            },

            difficulty: "easy",
            statement: "Bye",
            instruction: "Escolha Bye.",

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
                text: "Good morning",
                metadata: { tone: "yellow" }
              },
              {
                id: "bye",
                text: "Bye",
                metadata: { tone: "blue" }
              },
              {
                id: "hello",
                text: "Hello",
                metadata: { tone: "green" }
              },
              {
                id: "please",
                text: "Please",
                metadata: { tone: "pink" }
              }
            ],

            answer: {
              type: "single",
              value: "bye"
            },

            feedback: {
              correct: "Muito bem! Bye é usado para se despedir.",
              incorrect: "Ouça a palavra mais uma vez e tente novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 25,
              tags: [
                "greetings",
                "bye",
                "oralidade"
              ]
            }
          },

          {
            id: "eng1-m01-greetings-03",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S01",
              description:
                "Reconhecer cumprimentos e expressões sociais simples em língua inglesa."
            },

            difficulty: "easy",
            statement: "Thank you",
            instruction: "Escolha Thank you.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Thank you",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "thank-you",
                text: "Thank you",
                metadata: { tone: "blue" }
              },
              {
                id: "hello",
                text: "Hello",
                metadata: { tone: "green" }
              },
              {
                id: "bye",
                text: "Bye",
                metadata: { tone: "pink" }
              },
              {
                id: "please",
                text: "Please",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "thank-you"
            },

            feedback: {
              correct: "Excelente! Thank you significa Obrigado ou Obrigada.",
              incorrect: "Escute novamente e observe as opções.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Greetings",
              estimatedSeconds: 25,
              tags: [
                "greetings",
                "thank-you",
                "oralidade"
              ]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 2 — ANIMALS AND FRUITS — DRAG & DROP
         ===================================================== */
      {
        id: "eng1-m01-step-02-animals-fruits",
        title: "Animals and Fruits",
        mechanic: "drag-drop",

        skill: {
          code: "ENG1-M01-S02",
          description:
            "Classificar vocabulário familiar em categorias semânticas simples."
        },

        questions: [
          {
            id: "eng1-m01-categories-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S02",
              description:
                "Classificar vocabulário familiar em categorias semânticas simples."
            },

            difficulty: "easy",
            statement: "Animals and Fruits",
            instruction:
              "Arraste cada palavra para a categoria correta.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Animals and fruits",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "dog",
                text: "DOG",
                audio: {
                  enabled: true,
                  text: "Dog",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "cat",
                text: "CAT",
                audio: {
                  enabled: true,
                  text: "Cat",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "bird",
                text: "BIRD",
                audio: {
                  enabled: true,
                  text: "Bird",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "apple",
                text: "APPLE",
                audio: {
                  enabled: true,
                  text: "Apple",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "banana",
                text: "BANANA",
                audio: {
                  enabled: true,
                  text: "Banana",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "orange",
                text: "ORANGE",
                audio: {
                  enabled: true,
                  text: "Orange",
                  language: "en-US",
                  role: "option"
                }
              }
            ],

            answer: {
              type: "pairs",
              value: [
                { source: "dog", target: "animals" },
                { source: "cat", target: "animals" },
                { source: "bird", target: "animals" },
                { source: "apple", target: "fruits" },
                { source: "banana", target: "fruits" },
                { source: "orange", target: "fruits" }
              ]
            },

            feedback: {
              correct:
                "Excelente! Você separou os animais e as frutas corretamente.",
              incorrect:
                "Observe as categorias e tente organizar as palavras novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Animals and Fruits",
              layout: "categories",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 60,

              targets: [
                {
                  id: "animals",
                  label: "ANIMALS"
                },
                {
                  id: "fruits",
                  label: "FRUITS"
                }
              ],

              tags: [
                "animals",
                "fruits",
                "classification"
              ]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 3 — COLORS — BUBBLE POP
         ===================================================== */
      {
        id: "eng1-m01-step-03-colors",
        title: "Colors",
        mechanic: "bubble-pop",

        skill: {
          code: "ENG1-M01-S03",
          description:
            "Reconhecer e nomear cores básicas em língua inglesa."
        },

        questions: [
          {
            id: "eng1-m01-colors-blue",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S03",
              description:
                "Reconhecer e nomear cores básicas em língua inglesa."
            },

            difficulty: "easy",
            statement: "Blue",
            instruction: "Escolha Blue.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Blue",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "blue",
                text: "Blue",
                metadata: { tone: "blue" }
              },
              {
                id: "red",
                text: "Red",
                metadata: { tone: "pink" }
              },
              {
                id: "green",
                text: "Green",
                metadata: { tone: "green" }
              },
              {
                id: "yellow",
                text: "Yellow",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "blue"
            },

            feedback: {
              correct: "Muito bem! Blue está correto.",
              incorrect: "Observe novamente e tente outra cor.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Colors",
              estimatedSeconds: 20,
              tags: [
                "colors",
                "blue"
              ]
            }
          },

          {
            id: "eng1-m01-colors-red",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S03",
              description:
                "Reconhecer e nomear cores básicas em língua inglesa."
            },

            difficulty: "easy",
            statement: "Red",
            instruction: "Escolha Red.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Red",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "blue",
                text: "Blue",
                metadata: { tone: "blue" }
              },
              {
                id: "red",
                text: "Red",
                metadata: { tone: "pink" }
              },
              {
                id: "green",
                text: "Green",
                metadata: { tone: "green" }
              },
              {
                id: "yellow",
                text: "Yellow",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "red"
            },

            feedback: {
              correct: "Muito bem! Red está correto.",
              incorrect: "Escute novamente e tente outra cor.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Colors",
              estimatedSeconds: 20,
              tags: [
                "colors",
                "red"
              ]
            }
          },

          {
            id: "eng1-m01-colors-green",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S03",
              description:
                "Reconhecer e nomear cores básicas em língua inglesa."
            },

            difficulty: "easy",
            statement: "Green",
            instruction: "Escolha Green.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Green",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "blue",
                text: "Blue",
                metadata: { tone: "blue" }
              },
              {
                id: "red",
                text: "Red",
                metadata: { tone: "pink" }
              },
              {
                id: "green",
                text: "Green",
                metadata: { tone: "green" }
              },
              {
                id: "yellow",
                text: "Yellow",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "green"
            },

            feedback: {
              correct: "Muito bem! Green está correto.",
              incorrect: "Observe as opções e tente novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Colors",
              estimatedSeconds: 20,
              tags: [
                "colors",
                "green"
              ]
            }
          },

          {
            id: "eng1-m01-colors-yellow",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S03",
              description:
                "Reconhecer e nomear cores básicas em língua inglesa."
            },

            difficulty: "easy",
            statement: "Yellow",
            instruction: "Escolha Yellow.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Yellow",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "blue",
                text: "Blue",
                metadata: { tone: "blue" }
              },
              {
                id: "red",
                text: "Red",
                metadata: { tone: "pink" }
              },
              {
                id: "green",
                text: "Green",
                metadata: { tone: "green" }
              },
              {
                id: "yellow",
                text: "Yellow",
                metadata: { tone: "yellow" }
              }
            ],

            answer: {
              type: "single",
              value: "yellow"
            },

            feedback: {
              correct: "Muito bem! Yellow está correto.",
              incorrect: "Escute novamente e encontre Yellow.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "bubble-pop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "Colors",
              estimatedSeconds: 20,
              tags: [
                "colors",
                "yellow"
              ]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 4 — SCHOOL AND TOYS — DRAG & DROP
         ===================================================== */
      {
        id: "eng1-m01-step-04-school-toys",
        title: "School and Toys",
        mechanic: "drag-drop",

        skill: {
          code: "ENG1-M01-S04",
          description:
            "Classificar palavras de objetos escolares e brinquedos em língua inglesa."
        },

        questions: [
          {
            id: "eng1-m01-categories-02",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: {
              code: "ENG1-M01-S04",
              description:
                "Classificar palavras de objetos escolares e brinquedos em língua inglesa."
            },

            difficulty: "easy",
            statement: "School and Toys",
            instruction:
              "Arraste cada palavra para a categoria correta.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "School and toys",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              {
                id: "book",
                text: "BOOK",
                audio: {
                  enabled: true,
                  text: "Book",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "pencil",
                text: "PENCIL",
                audio: {
                  enabled: true,
                  text: "Pencil",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "eraser",
                text: "ERASER",
                audio: {
                  enabled: true,
                  text: "Eraser",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "ball",
                text: "BALL",
                audio: {
                  enabled: true,
                  text: "Ball",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "doll",
                text: "DOLL",
                audio: {
                  enabled: true,
                  text: "Doll",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "kite",
                text: "KITE",
                audio: {
                  enabled: true,
                  text: "Kite",
                  language: "en-US",
                  role: "option"
                }
              }
            ],

            answer: {
              type: "pairs",
              value: [
                { source: "book", target: "school" },
                { source: "pencil", target: "school" },
                { source: "eraser", target: "school" },
                { source: "ball", target: "toys" },
                { source: "doll", target: "toys" },
                { source: "kite", target: "toys" }
              ]
            },

            feedback: {
              correct:
                "Excelente! Você organizou os objetos escolares e os brinquedos corretamente.",
              incorrect:
                "Observe as categorias e tente organizar as palavras novamente.",
              language: "pt-BR"
            },

            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },

            metadata: {
              title: "School and Toys",
              layout: "categories",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 60,

              targets: [
                {
                  id: "school",
                  label: "SCHOOL"
                },
                {
                  id: "toys",
                  label: "TOYS"
                }
              ],

              tags: [
                "school-objects",
                "toys",
                "classification"
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

  window.dispatchEvent(
    new CustomEvent(
      "duduq:content-ready",
      {
        detail: {
          subject: "english",
          year: 1,
          module: 1,
          id: moduleDefinition.id,
          version: VERSION
        }
      }
    )
  );

  console.info(
    "[DuduQ Content] English Year 1 Module 01 carregado:",
    VERSION
  );
})();


