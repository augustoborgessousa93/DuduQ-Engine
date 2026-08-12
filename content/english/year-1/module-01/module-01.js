/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   My First English Words
   Versão 1.2.0 — MÓDULO COMPLETO

   STATUS DE PRODUÇÃO
   - Módulo 01 completo para validação final.
   - Utiliza somente Bubble Pop e Drag & Drop, já estabilizados.
   - Não altera Core, Shell, World Fusion, Intro, Transition ou Completion.

   CÓDIGOS PEDAGÓGICOS
   - ENG1-M01-* são identificadores internos DuduQ.
   - Não representam, por si só, códigos oficiais da BNCC.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.2.0";

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

  const SKILLS = Object.freeze({
    greetings: Object.freeze({
      code: "ENG1-M01-S01",
      description:
        "Reconhecer oralmente e visualmente cumprimentos simples em língua inglesa, associando som e forma escrita."
    }),

    animals: Object.freeze({
      code: "ENG1-M01-S02",
      description:
        "Associar palavras de animais em língua inglesa a representações pictográficas familiares."
    }),

    colors: Object.freeze({
      code: "ENG1-M01-S03",
      description:
        "Reconhecer oralmente e visualmente nomes de cores básicas em língua inglesa."
    }),

    school: Object.freeze({
      code: "ENG1-M01-S04",
      description:
        "Associar palavras de objetos escolares em língua inglesa a representações pictográficas familiares."
    }),

    toys: Object.freeze({
      code: "ENG1-M01-S05",
      description:
        "Reconhecer oralmente e visualmente palavras de brinquedos familiares em língua inglesa."
    }),

    review: Object.freeze({
      code: "ENG1-M01-S06",
      description:
        "Mobilizar o vocabulário aprendido para reconhecer e organizar palavras de diferentes campos semânticos."
    })
  });

  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,

    subject: "Língua Inglesa",
    year: 1,
    module: 1,

    title: "My First English Words",

    description:
      "Primeira missão de contato com vocabulário muito frequente da língua inglesa, com prioridade para escuta, reconhecimento visual, associação entre som e escrita e construção inicial de campos semânticos.",

    estimatedMinutes: 12,

    learningGoals: [
      "Ouvir e reconhecer palavras e expressões muito frequentes em língua inglesa.",
      "Associar palavras ouvidas às suas formas escritas em caixa alta.",
      "Relacionar palavras de animais e objetos escolares a representações pictográficas.",
      "Reconhecer nomes de cores e brinquedos familiares em língua inglesa.",
      "Organizar palavras conhecidas por significado em um desafio final de revisão."
    ],

    pedagogicalNotes: {
      literacyProfile:
        "Para o 1º ano, o conteúdo pedagógico é apresentado em caixa alta pelo perfil de alfabetização do DuduQ.",

      oralPriority:
        "A oralidade vem antes da tradução: o estudante escuta, compara e reconhece a palavra ou expressão em inglês.",

      semanticFields:
        "Os campos semânticos são apresentados separadamente durante a aquisição: GREETINGS, ANIMALS, COLORS, SCHOOL OBJECTS e TOYS. A mistura ocorre somente no FINAL CHALLENGE, quando o vocabulário já foi trabalhado.",

      translationDecision:
        "A tradução não é usada como alternativa de resposta. O português aparece nas instruções funcionais e em feedbacks breves quando ajuda a compreensão do uso.",

      colorCueDecision:
        "Nas questões de COLORS, a tonalidade visual das bolhas não corresponde intencionalmente ao significado da palavra, evitando que a criança responda apenas pela cor da bolha.",

      pictogramDecision:
        "Nos pareamentos de ANIMALS e SCHOOL OBJECTS, símbolos pictográficos familiares dão apoio visual sem acrescentar tradução escrita.",

      finalReviewDecision:
        "O desafio final não apresenta vocabulário novo. Ele pede que a criança organize palavras já estudadas por significado."
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
      /* =====================================================
         ETAPA 1 — GREETINGS — BUBBLE POP
         Repertório: HELLO, HI, GOOD MORNING, BYE
         ===================================================== */
      {
        id: "eng1-m01-step-01-greetings",
        title: "Greetings",
        mechanic: "bubble-pop",
        skill: SKILLS.greetings,

        questions: [
          {
            id: "eng1-m01-greetings-01-hello",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetings,
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
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } },
              { id: "bye", text: "BYE", metadata: { tone: "pink" } },
              { id: "hi", text: "HI", metadata: { tone: "green" } }
            ],
            answer: { type: "single", value: "hello" },
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
              tags: ["greetings", "hello", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-greetings-02-hi",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetings,
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
              { id: "bye", text: "BYE", metadata: { tone: "yellow" } },
              { id: "hi", text: "HI", metadata: { tone: "blue" } },
              { id: "hello", text: "HELLO", metadata: { tone: "green" } }
            ],
            answer: { type: "single", value: "hi" },
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
              tags: ["greetings", "hi", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-greetings-03-good-morning",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetings,
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
              { id: "hi", text: "HI", metadata: { tone: "green" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } },
              { id: "bye", text: "BYE", metadata: { tone: "pink" } },
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } }
            ],
            answer: { type: "single", value: "good-morning" },
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
              tags: ["greetings", "good-morning", "listening", "phrase-recognition"]
            }
          },

          {
            id: "eng1-m01-greetings-04-bye",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetings,
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
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } },
              { id: "hello", text: "HELLO", metadata: { tone: "green" } },
              { id: "bye", text: "BYE", metadata: { tone: "blue" } },
              { id: "hi", text: "HI", metadata: { tone: "pink" } }
            ],
            answer: { type: "single", value: "bye" },
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
              tags: ["greetings", "bye", "listening", "word-recognition"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 2 — ANIMALS — DRAG & DROP
         Repertório: DOG, CAT, BIRD, FISH
         Associação palavra + áudio -> símbolo pictográfico
         ===================================================== */
      {
        id: "eng1-m01-step-02-animals",
        title: "Animals",
        mechanic: "drag-drop",
        skill: SKILLS.animals,

        questions: [
          {
            id: "eng1-m01-animals-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.animals,
            difficulty: "easy",
            statement: "Animals",
            instruction:
              "Arraste cada palavra para a figura correspondente.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Arraste cada palavra para a figura correspondente.",
              language: "pt-BR",
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
                id: "fish",
                text: "FISH",
                audio: {
                  enabled: true,
                  text: "Fish",
                  language: "en-US",
                  role: "option"
                }
              }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "dog", target: "dog-picture" },
                { source: "cat", target: "cat-picture" },
                { source: "bird", target: "bird-picture" },
                { source: "fish", target: "fish-picture" }
              ]
            },
            feedback: {
              correct:
                "Excelente! Você relacionou cada animal à figura correta.",
              incorrect:
                "Ouça as palavras novamente e observe as figuras antes de tentar outra vez.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },
            metadata: {
              title: "Animals",
              layout: "grid",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 65,
              targets: [
                { id: "dog-picture", label: "🐶" },
                { id: "cat-picture", label: "🐱" },
                { id: "bird-picture", label: "🐦" },
                { id: "fish-picture", label: "🐟" }
              ],
              tags: ["animals", "association", "listening", "pictogram"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 3 — COLORS — BUBBLE POP
         Repertório: BLUE, RED, GREEN, YELLOW
         Tons das bolhas NÃO indicam a resposta.
         ===================================================== */
      {
        id: "eng1-m01-step-03-colors",
        title: "Colors",
        mechanic: "bubble-pop",
        skill: SKILLS.colors,

        questions: [
          {
            id: "eng1-m01-colors-01-blue",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.colors,
            difficulty: "easy",
            statement: "Colors",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
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
              { id: "blue", text: "BLUE", metadata: { tone: "yellow" } },
              { id: "red", text: "RED", metadata: { tone: "green" } },
              { id: "green", text: "GREEN", metadata: { tone: "pink" } }
            ],
            answer: { type: "single", value: "blue" },
            feedback: {
              correct: "Muito bem! Você reconheceu BLUE.",
              incorrect: "Escute novamente e compare as palavras.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Colors",
              estimatedSeconds: 25,
              tags: ["colors", "blue", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-colors-02-red",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.colors,
            difficulty: "easy",
            statement: "Colors",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
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
              { id: "yellow", text: "YELLOW", metadata: { tone: "purple" } },
              { id: "red", text: "RED", metadata: { tone: "aqua" } },
              { id: "blue", text: "BLUE", metadata: { tone: "orange" } }
            ],
            answer: { type: "single", value: "red" },
            feedback: {
              correct: "Muito bem! Você reconheceu RED.",
              incorrect: "Ouça mais uma vez e tente outra opção.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Colors",
              estimatedSeconds: 25,
              tags: ["colors", "red", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-colors-03-green",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.colors,
            difficulty: "easy",
            statement: "Colors",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
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
              { id: "green", text: "GREEN", metadata: { tone: "pink" } },
              { id: "yellow", text: "YELLOW", metadata: { tone: "blue" } },
              { id: "red", text: "RED", metadata: { tone: "purple" } },
              { id: "blue", text: "BLUE", metadata: { tone: "orange" } }
            ],
            answer: { type: "single", value: "green" },
            feedback: {
              correct: "Excelente! Você reconheceu GREEN.",
              incorrect: "Escute novamente. Qual palavra combina com o som?",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Colors",
              estimatedSeconds: 30,
              tags: ["colors", "green", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-colors-04-yellow",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.colors,
            difficulty: "easy",
            statement: "Colors",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
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
              { id: "blue", text: "BLUE", metadata: { tone: "orange" } },
              { id: "green", text: "GREEN", metadata: { tone: "pink" } },
              { id: "yellow", text: "YELLOW", metadata: { tone: "blue" } },
              { id: "red", text: "RED", metadata: { tone: "green" } }
            ],
            answer: { type: "single", value: "yellow" },
            feedback: {
              correct: "Muito bem! Você reconheceu YELLOW.",
              incorrect: "Escute novamente e observe todas as palavras.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Colors",
              estimatedSeconds: 30,
              tags: ["colors", "yellow", "listening", "word-recognition"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 4 — SCHOOL OBJECTS — DRAG & DROP
         Repertório: BOOK, PENCIL, RULER, BAG
         ===================================================== */
      {
        id: "eng1-m01-step-04-school-objects",
        title: "School Objects",
        mechanic: "drag-drop",
        skill: SKILLS.school,

        questions: [
          {
            id: "eng1-m01-school-objects-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.school,
            difficulty: "easy",
            statement: "School Objects",
            instruction:
              "Arraste cada palavra para a figura correspondente.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Arraste cada palavra para a figura correspondente.",
              language: "pt-BR",
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
                id: "ruler",
                text: "RULER",
                audio: {
                  enabled: true,
                  text: "Ruler",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "bag",
                text: "BAG",
                audio: {
                  enabled: true,
                  text: "Bag",
                  language: "en-US",
                  role: "option"
                }
              }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "book", target: "book-picture" },
                { source: "pencil", target: "pencil-picture" },
                { source: "ruler", target: "ruler-picture" },
                { source: "bag", target: "bag-picture" }
              ]
            },
            feedback: {
              correct:
                "Muito bem! Você relacionou cada objeto escolar à figura correta.",
              incorrect:
                "Ouça as palavras novamente e observe as figuras antes de tentar outra vez.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },
            metadata: {
              title: "School Objects",
              layout: "grid",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 65,
              targets: [
                { id: "book-picture", label: "📘" },
                { id: "pencil-picture", label: "✏️" },
                { id: "ruler-picture", label: "📏" },
                { id: "bag-picture", label: "🎒" }
              ],
              tags: ["school-objects", "association", "listening", "pictogram"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 5 — TOYS — BUBBLE POP
         Repertório: BALL, KITE, CAR, TEDDY BEAR
         ===================================================== */
      {
        id: "eng1-m01-step-05-toys",
        title: "Toys",
        mechanic: "bubble-pop",
        skill: SKILLS.toys,

        questions: [
          {
            id: "eng1-m01-toys-01-ball",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.toys,
            difficulty: "easy",
            statement: "Toys",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Ball",
              language: "en-US",
              role: "instruction"
            },
            alternatives: [
              { id: "ball", text: "BALL", metadata: { tone: "blue" } },
              { id: "car", text: "CAR", metadata: { tone: "green" } },
              { id: "kite", text: "KITE", metadata: { tone: "yellow" } }
            ],
            answer: { type: "single", value: "ball" },
            feedback: {
              correct: "Muito bem! Você reconheceu BALL.",
              incorrect: "Escute novamente e compare as palavras.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Toys",
              estimatedSeconds: 25,
              tags: ["toys", "ball", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-toys-02-kite",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.toys,
            difficulty: "easy",
            statement: "Toys",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Kite",
              language: "en-US",
              role: "instruction"
            },
            alternatives: [
              { id: "car", text: "CAR", metadata: { tone: "pink" } },
              { id: "kite", text: "KITE", metadata: { tone: "blue" } },
              { id: "teddy-bear", text: "TEDDY BEAR", metadata: { tone: "yellow" } }
            ],
            answer: { type: "single", value: "kite" },
            feedback: {
              correct: "Muito bem! Você reconheceu KITE.",
              incorrect: "Ouça mais uma vez e tente outra opção.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Toys",
              estimatedSeconds: 25,
              tags: ["toys", "kite", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-toys-03-car",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.toys,
            difficulty: "easy",
            statement: "Toys",
            instruction:
              "Ouça e escolha a palavra que você ouviu.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Car",
              language: "en-US",
              role: "instruction"
            },
            alternatives: [
              { id: "teddy-bear", text: "TEDDY BEAR", metadata: { tone: "yellow" } },
              { id: "ball", text: "BALL", metadata: { tone: "green" } },
              { id: "car", text: "CAR", metadata: { tone: "blue" } },
              { id: "kite", text: "KITE", metadata: { tone: "pink" } }
            ],
            answer: { type: "single", value: "car" },
            feedback: {
              correct: "Excelente! Você reconheceu CAR.",
              incorrect: "Escute novamente. Qual palavra corresponde ao som?",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Toys",
              estimatedSeconds: 30,
              tags: ["toys", "car", "listening", "word-recognition"]
            }
          },

          {
            id: "eng1-m01-toys-04-teddy-bear",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.toys,
            difficulty: "easy",
            statement: "Toys",
            instruction:
              "Ouça e escolha a expressão que você ouviu.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Teddy bear",
              language: "en-US",
              role: "instruction"
            },
            alternatives: [
              { id: "ball", text: "BALL", metadata: { tone: "green" } },
              { id: "teddy-bear", text: "TEDDY BEAR", metadata: { tone: "yellow" } },
              { id: "kite", text: "KITE", metadata: { tone: "pink" } },
              { id: "car", text: "CAR", metadata: { tone: "blue" } }
            ],
            answer: { type: "single", value: "teddy-bear" },
            feedback: {
              correct: "Muito bem! Você reconheceu TEDDY BEAR.",
              incorrect: "Escute a expressão novamente e observe as opções com calma.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "bubble-pop",
              allowImage: false,
              allowAudio: true
            },
            metadata: {
              title: "Toys",
              estimatedSeconds: 30,
              tags: ["toys", "teddy-bear", "listening", "phrase-recognition"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 6 — FINAL CHALLENGE — DRAG & DROP
         Sem vocabulário novo.
         A criança organiza palavras já estudadas por significado.
         ===================================================== */
      {
        id: "eng1-m01-step-06-final-challenge",
        title: "Final Challenge",
        mechanic: "drag-drop",
        skill: SKILLS.review,

        questions: [
          {
            id: "eng1-m01-final-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.review,
            difficulty: "easy",
            statement: "Final Challenge",
            instruction:
              "Arraste cada palavra para o símbolo do grupo ao qual ela pertence.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Arraste cada palavra para o símbolo do grupo ao qual ela pertence.",
              language: "pt-BR",
              role: "instruction"
            },
            alternatives: [
              {
                id: "review-hello",
                text: "HELLO",
                audio: {
                  enabled: true,
                  text: "Hello",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "review-dog",
                text: "DOG",
                audio: {
                  enabled: true,
                  text: "Dog",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "review-blue",
                text: "BLUE",
                audio: {
                  enabled: true,
                  text: "Blue",
                  language: "en-US",
                  role: "option"
                }
              }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "review-hello", target: "group-greeting" },
                { source: "review-dog", target: "group-animal" },
                { source: "review-blue", target: "group-color" }
              ]
            },
            feedback: {
              correct:
                "Muito bem! Você organizou as palavras pelos seus significados.",
              incorrect:
                "Pense no significado de cada palavra e tente novamente.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },
            metadata: {
              title: "Final Challenge",
              layout: "grid",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 50,
              targets: [
                { id: "group-greeting", label: "👋" },
                { id: "group-animal", label: "🐾" },
                { id: "group-color", label: "🎨" }
              ],
              tags: ["review", "classification", "semantic-fields"]
            }
          },

          {
            id: "eng1-m01-final-02",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.review,
            difficulty: "easy",
            statement: "Final Challenge",
            instruction:
              "Arraste cada palavra para o símbolo do grupo ao qual ela pertence.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: {
              enabled: true,
              text: "Arraste cada palavra para o símbolo do grupo ao qual ela pertence.",
              language: "pt-BR",
              role: "instruction"
            },
            alternatives: [
              {
                id: "review-book",
                text: "BOOK",
                audio: {
                  enabled: true,
                  text: "Book",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "review-ball",
                text: "BALL",
                audio: {
                  enabled: true,
                  text: "Ball",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "review-cat",
                text: "CAT",
                audio: {
                  enabled: true,
                  text: "Cat",
                  language: "en-US",
                  role: "option"
                }
              },
              {
                id: "review-red",
                text: "RED",
                audio: {
                  enabled: true,
                  text: "Red",
                  language: "en-US",
                  role: "option"
                }
              }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "review-book", target: "group-school" },
                { source: "review-ball", target: "group-toy" },
                { source: "review-cat", target: "group-animal" },
                { source: "review-red", target: "group-color" }
              ]
            },
            feedback: {
              correct:
                "Excelente! Você completou o desafio final usando palavras de toda a missão.",
              incorrect:
                "Ouça as palavras e pense em qual grupo cada uma pertence.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "drag-drop",
              allowImage: true,
              allowAudio: true
            },
            metadata: {
              title: "Final Challenge",
              layout: "grid",
              shuffleItems: true,
              shuffleTargets: false,
              estimatedSeconds: 60,
              targets: [
                { id: "group-school", label: "🎒" },
                { id: "group-toy", label: "🧸" },
                { id: "group-animal", label: "🐾" },
                { id: "group-color", label: "🎨" }
              ],
              tags: ["review", "classification", "semantic-fields"]
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

