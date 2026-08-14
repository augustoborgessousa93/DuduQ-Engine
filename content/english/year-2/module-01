/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 2 — MODULE 01
   Greetings & The Alphabet
   Versão 1.0.0 — PRIMEIRA VERSÃO FUNCIONAL

   FONTES EDITORIAIS
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - Manual do Educador — English — 2º ano — Unidade 1, p. 28

   REGRAS DESTA VERSÃO
   - Preserva os 15 IDs oficiais EN2-M1-01 a EN2-M1-15.
   - Organiza o módulo em 6 etapas globais.
   - Mantém CAIXA ALTA nos elementos de alfabetização.
   - Prioriza áudio gravado; Speech Synthesis permanece como fallback.
   - Reutiliza somente assets já existentes no Assets-DuduQ.
   - Não altera Core, runtimes ou mecânicas homologadas.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.0.0";

  window.DUDUQ_CONTENT =
    window.DUDUQ_CONTENT || {};

  window.DUDUQ_CONTENT.english =
    window.DUDUQ_CONTENT.english || {};

  window.DUDUQ_CONTENT.english.year2 =
    window.DUDUQ_CONTENT.english.year2 || {};

  if (
    window.DUDUQ_CONTENT
      .english
      .year2
      .module01
      ?.version === VERSION
  ) {
    return;
  }

  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  const AUDIO_BASE =
    BASE + "Audios/";

  const VISUALS = Object.freeze({
    greeting:
      BASE + "Hello.png",

    goodbye:
      BASE + "Bye.png",

    morning:
      BASE + "Good%20Morning.png",

    afternoon:
      BASE + "Good%20Afternoon.png",

    night:
      BASE + "Good%20Night.png",

    rain:
      BASE + "Rain.png",

    nervous:
      BASE + "nervous.png",

    fishGirl:
      BASE + "Fish_Girl.png",

    wheelchairBoy:
      BASE + "wheelchair_boy.png"
  });

  function audioFile(name) {
    return AUDIO_BASE + name;
  }

  function audioEntry(
    mechanic,
    instructionText,
    instructionFile,
    stimuli
  ) {
    return Object.freeze({
      mechanic,

      instruction: Object.freeze({
        text: instructionText,
        language: "pt-BR",
        src: audioFile(instructionFile)
      }),

      stimuli: Object.freeze(
        stimuli.map(function (item) {
          return Object.freeze({
            text: item.text,
            language: "en-US",
            src: audioFile(item.file)
          });
        })
      )
    });
  }

  const AUDIO_CATALOG = Object.freeze({
    "EN2-M1-01": audioEntry(
      "target-shooter",
      "Ouça e acerte a cena que combina com a expressão.",
      "ING_2ANO_M01_EN2-M1-01_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Hello",
          file:
            "ING_2ANO_M01_EN2-M1-01_TARGET-SHOOTER_ESTIMULO01_HELLO_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-02": audioEntry(
      "target-shooter",
      "Ouça e acerte a cena que combina com a expressão.",

      "ING_2ANO_M01_EN2-M1-02_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Good morning",
          file:
            "ING_2ANO_M01_EN2-M1-02_TARGET-SHOOTER_ESTIMULO01_GOOD-MORNING_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-03": audioEntry(
      "target-shooter",
      "Ouça e acerte a cena que combina com a expressão.",
      "ING_2ANO_M01_EN2-M1-03_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Good night",
          file:
            "ING_2ANO_M01_EN2-M1-03_TARGET-SHOOTER_ESTIMULO01_GOOD-NIGHT_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-04": audioEntry(
      "matching",
      "Ouça e ligue cada expressão à palavra correspondente.",
      "ING_2ANO_M01_EN2-M1-04_MATCHING_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Goodbye",
          file:
            "ING_2ANO_M01_EN2-M1-04_MATCHING_ESTIMULO01_GOODBYE_ENUS.mp3"
        },
        {
          text: "Hi",
          file:
            "ING_2ANO_M01_EN2-M1-04_MATCHING_ESTIMULO02_HI_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-05": audioEntry(
      "matching",
      "Ouça e ligue cada expressão à palavra correspondente.",
      "ING_2ANO_M01_EN2-M1-05_MATCHING_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "See you",
          file:
            "ING_2ANO_M01_EN2-M1-05_MATCHING_ESTIMULO01_SEE-YOU_ENUS.mp3"
        },
        {
          text: "Hello",
          file:
            "ING_2ANO_M01_EN2-M1-05_MATCHING_ESTIMULO02_HELLO_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-06": audioEntry(
      "bubble-pop",
      "Ouça a letra e estoure a resposta correta.",
      "ING_2ANO_M01_EN2-M1-06_BUBBLE-POP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "A",
          file:
            "ING_2ANO_M01_EN2-M1-06_BUBBLE-POP_ESTIMULO01_A_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-07": audioEntry(
      "bubble-pop",
      "Ouça a letra e estoure a resposta correta.",
      "ING_2ANO_M01_EN2-M1-07_BUBBLE-POP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "B",
          file:
            "ING_2ANO_M01_EN2-M1-07_BUBBLE-POP_ESTIMULO01_B_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-08": audioEntry(
      "bubble-pop",
      "Ouça a letra e estoure a resposta correta.",
      "ING_2ANO_M01_EN2-M1-08_BUBBLE-POP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "C",
          file:
            "ING_2ANO_M01_EN2-M1-08_BUBBLE-POP_ESTIMULO01_C_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-09": audioEntry(
      "memory-quest",
      "Vire as cartas, ouça os áudios e encontre os pares de letras.",
      "ING_2ANO_M01_EN2-M1-09_MEMORY-QUEST_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "M",
          file:
            "ING_2ANO_M01_EN2-M1-09_MEMORY-QUEST_ESTIMULO01_M_ENUS.mp3"
        },
        {
          text: "B",
          file:
            "ING_2ANO_M01_EN2-M1-09_MEMORY-QUEST_ESTIMULO02_B_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-10": audioEntry(
      "memory-quest",
      "Vire as cartas, ouça os áudios e encontre os pares de letras.",
      "ING_2ANO_M01_EN2-M1-10_MEMORY-QUEST_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "S",
          file:
            "ING_2ANO_M01_EN2-M1-10_MEMORY-QUEST_ESTIMULO01_S_ENUS.mp3"

        },
        {
          text: "C",
          file:
            "ING_2ANO_M01_EN2-M1-10_MEMORY-QUEST_ESTIMULO02_C_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-11": audioEntry(
      "drag-drop",
      "Arraste a pergunta de soletração para o lugar correto e organize as outras expressões.",
      "ING_2ANO_M01_EN2-M1-11_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "How old are you?",
          file:
            "ING_2ANO_M01_EN2-M1-11_DRAG-DROP_ESTIMULO01_HOW-OLD-ARE-YOU_ENUS.mp3"
        },
        {
          text: "What's this?",
          file:
            "ING_2ANO_M01_EN2-M1-11_DRAG-DROP_ESTIMULO02_WHATS-THIS_ENUS.mp3"
        },
        {
          text: "Good afternoon.",
          file:
            "ING_2ANO_M01_EN2-M1-11_DRAG-DROP_ESTIMULO03_GOOD-AFTERNOON_ENUS.mp3"
        },
        {
          text: "How do you spell...?",
          file:
            "ING_2ANO_M01_EN2-M1-11_DRAG-DROP_ESTIMULO04_HOW-DO-YOU-SPELL_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-12": audioEntry(
      "drag-drop",
      "Arraste as letras para formar o nome ANA.",
      "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "A",
          file:
            "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ESTIMULO01_A_ENUS.mp3"
        },
        {
          text: "N",
          file:
            "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ESTIMULO02_N_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-13": audioEntry(
      "smart-sentence",
      "Complete a despedida.",
      "ING_2ANO_M01_EN2-M1-13_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "You",
          file:
            "ING_2ANO_M01_EN2-M1-13_SMART-SENTENCE_ESTIMULO01_YOU_ENUS.mp3"
        },
        {
          text: "Hello",
          file:
            "ING_2ANO_M01_EN2-M1-13_SMART-SENTENCE_ESTIMULO02_HELLO_ENUS.mp3"
        },
        {
          text: "Morning",
          file:
            "ING_2ANO_M01_EN2-M1-13_SMART-SENTENCE_ESTIMULO03_MORNING_ENUS.mp3"
        },
        {
          text: "Hi",
          file:
            "ING_2ANO_M01_EN2-M1-13_SMART-SENTENCE_ESTIMULO04_HI_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-14": audioEntry(
      "smart-sentence",
      "Complete a pergunta usada para pedir a soletração do nome.",
      "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Spell",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO01_SPELL_ENUS.mp3"
        },
        {
          text: "See",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO02_SEE_ENUS.mp3"
        },
        {
          text: "Good",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO03_GOOD_ENUS.mp3"
        },
        {
          text: "Morning",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO04_MORNING_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-15": audioEntry(
      "smart-sentence",
      "Complete a sequência alfabética.",
      "ING_2ANO_M01_EN2-M1-15_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "D",
          file:
            "ING_2ANO_M01_EN2-M1-15_SMART-SENTENCE_ESTIMULO01_D_ENUS.mp3"
        },
        {
          text: "A",
          file:
            "ING_2ANO_M01_EN2-M1-15_SMART-SENTENCE_ESTIMULO02_A_ENUS.mp3"

        },
        {
          text: "M",
          file:
            "ING_2ANO_M01_EN2-M1-15_SMART-SENTENCE_ESTIMULO03_M_ENUS.mp3"
        },
        {
          text: "S",
          file:
            "ING_2ANO_M01_EN2-M1-15_SMART-SENTENCE_ESTIMULO04_S_ENUS.mp3"
        }
      ]
    )
  });

  function skill(description) {
    return Object.freeze({
      code: null,
      description
    });
  }

  function sourceOption(id, text) {
    return { id, text };
  }

  function audioOption(id, text, spokenText) {
    return {
      id,
      text,
      audio: {
        enabled: true,
        text: spokenText,
        language: "en-US",
        role: "option"
      }
    };
  }

  function baseQuestion(config) {
    return {
      id: config.id,
      subject: "Língua Inglesa",
      year: 2,
      module: 1,
      skill: config.skill,
      difficulty: config.difficulty,
      statement: config.statement,
      instruction: config.instruction,

      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",

      audio: {
        enabled: true,
        text: config.audioText || config.instruction,
        language: config.audioLanguage || "pt-BR",
        role: "instruction"
      },

      alternatives: config.alternatives,
      answer: config.answer,

      feedback: {
        correct: config.correct,
        incorrect: config.incorrect,
        language: "pt-BR"
      },

      delivery: {
        mechanic: config.mechanic,
        allowImage: config.allowImage === true,
        allowAudio: config.allowAudio !== false
      },

      metadata: config.metadata || {}
    };
  }

  const SKILLS = Object.freeze({
    greetings:
      skill(
        "Identificar e compreender cumprimentos básicos."
      ),

    alphabetListening:
      skill(
        "Ouvir e identificar letras do alfabeto em inglês."
      ),

    spellingQuestion:
      skill(
        "Perguntar como uma palavra é soletrada."
      ),

    spellingSequence:
      skill(
        "Relacionar soletração ao alfabeto."
      ),

    farewell:
      skill(
        "Distinguir cumprimentos de despedidas."
      ),

    presentationAlphabet:
      skill(
        "Integrar apresentação e alfabeto."
      ),

    alphabetSequence:
      skill(
        "Reconhecer sequência alfabética."
      )
  });

  const moduleDefinition = {
    id:
      "english-year-2-module-01",

    version:
      VERSION,

    subject:

      "Língua Inglesa",

    year:
      2,

    module:
      1,

    title:
      "Greetings & The Alphabet",

    description:
      "Missão de Língua Inglesa do 2º ano para retomada de cumprimentos e desenvolvimento do reconhecimento auditivo e visual do alfabeto, incluindo situações iniciais de soletração.",

    estimatedMinutes:
      7,

    audioPolicy: {
      primary: "recorded-media",
      fallback: "speech-synthesis",
      base: AUDIO_BASE,
      totalFiles: 47,
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },

    audioCatalog:
      AUDIO_CATALOG,

    learningGoals: [
      "Reconhecer HELLO, GOOD MORNING, GOOD NIGHT, GOODBYE e SEE YOU pela escuta.",
      "Relacionar expressões de cumprimento e despedida a representações visuais e escritas.",
      "Ouvir e identificar as letras A, B, C, M e S em inglês.",
      "Usar HOW DO YOU SPELL...? como pergunta inicial de soletração.",
      "Organizar letras para formar o nome ANA.",
      "Reconhecer a sequência alfabética A-B-C-D."
    ],

    pedagogicalNotes: {
      officialSource:
        "Módulo baseado nos 15 itens oficiais EN2-M1-01 a EN2-M1-15 do documento DuduQ Conteúdo Oficial — Língua Inglesa v1.0.",

      literacy:
        "No 2º ano, áudio continua central, mas a leitura de letras e palavras curtas passa a integrar a própria interação.",

      adaptation:
        "Itens de múltipla escolha podem ser apresentados por mecânicas de associação, memória, ordenação ou completar frase, preservando o ID e a habilidade editorial.",

      audioPolicy:
        "Os MP3s nomeados no catálogo são prioritários. Enquanto não estiverem publicados em Audios/, o Engine pode usar Speech Synthesis como fallback técnico."
    },

    intro: {
      companyKicker:
        "UMA CRIAÇÃO DE",
      companyWidth:
        820,
      collectionLogo:
        BASE + "Logo%20EduQ%20Play.png",
      collectionName:
        "EduQ Play",
      collectionAlt:
        "EduQ Play",
      collectionWidth:
        760,
      loadingLabel:
        "PREPARANDO SUA MISSÃO",
      readyLabel:
        "MISSÃO PRONTA",
      startLabel:
        "INICIAR MISSÃO",
      hint:
        "Tudo pronto para começar!",
      minDurationMs:
        2200,
      brandingDurationMs:
        3000,
      switchingDurationMs:
        760,
      missionMinDurationMs:
        1200,
      sparkCount:
        14
    },

    activities: [

      /* =====================================================
         ETAPA 1 — GREETINGS
         EN2-M1-01 / 02 / 03
         ===================================================== */
      {
        id:
          "en2-m1-step-01-greetings",

        title:
          "Greetings",

        mechanic:
          "target-shooter",

        skill:
          SKILLS.greetings,

        questions: [
          baseQuestion({
            id: "EN2-M1-01",
            skill: SKILLS.greetings,
            difficulty: "easy",
            statement: "Hello",
            instruction:
              "Ouça e acerte a cena que combina com a expressão.",
            audioText: "Hello",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("hi", "HI"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING"),
              sourceOption("good-afternoon", "GOOD AFTERNOON")
            ],
            answer: {
              type: "single",
              value: "hello"
            },
            correct:

              "Muito bem! HELLO foi identificado corretamente.",
            incorrect:
              "Ouça HELLO novamente e compare as cenas.",
            mechanic: "target-shooter",
            allowImage: true,
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "HELLO",
              targetShooter: {
                audioText: "Hello",
                mode: "audio-to-image",
                shape: "balloon",
                correctIds: ["scene-hello"],
                difficulty: {
                  speed: 0.40,
                  objectCount: 4,
                  spawnIntervalMs: 190,
                  requiredCorrect: 1,
                  targetSize: 148
                },
                items: [
                  {
                    id: "scene-hello",
                    label: "",
                    image: VISUALS.greeting,
                    display: "image"
                  },
                  {
                    id: "scene-morning",
                    label: "",
                    image: VISUALS.morning,
                    display: "image"
                  },
                  {
                    id: "scene-afternoon",
                    label: "",
                    image: VISUALS.afternoon,
                    display: "image"
                  },
                  {
                    id: "scene-night",
                    label: "",
                    image: VISUALS.night,
                    display: "image"
                  }
                ]
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-02",
            skill: SKILLS.greetings,
            difficulty: "easy",
            statement: "Good morning",
            instruction:
              "Ouça e acerte a cena que combina com a expressão.",
            audioText: "Good morning",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("hi", "HI"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING"),
              sourceOption("good-afternoon", "GOOD AFTERNOON")
            ],
            answer: {
              type: "single",
              value: "good-morning"
            },
            correct:
              "Excelente! GOOD MORNING combina com a manhã.",
            incorrect:
              "Ouça GOOD MORNING novamente e procure a cena da manhã.",
            mechanic: "target-shooter",
            allowImage: true,
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "GOOD MORNING",
              targetShooter: {
                audioText: "Good morning",
                mode: "audio-to-image",
                shape: "cloud",
                correctIds: ["scene-morning"],
                difficulty: {
                  speed: 0.40,
                  objectCount: 4,
                  spawnIntervalMs: 190,
                  requiredCorrect: 1,
                  targetSize: 148
                },
                items: [
                  {
                    id: "scene-hello",
                    label: "",
                    image: VISUALS.greeting,
                    display: "image"
                  },
                  {
                    id: "scene-morning",
                    label: "",
                    image: VISUALS.morning,
                    display: "image"
                  },
                  {
                    id: "scene-afternoon",
                    label: "",
                    image: VISUALS.afternoon,
                    display: "image"
                  },
                  {
                    id: "scene-night",
                    label: "",
                    image: VISUALS.night,
                    display: "image"
                  }
                ]
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-03",
            skill: SKILLS.greetings,
            difficulty: "easy",
            statement: "Good night",

            instruction:
              "Ouça e acerte a cena que combina com a expressão.",
            audioText: "Good night",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("hi", "HI"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING"),
              sourceOption("good-night", "GOOD NIGHT")
            ],
            answer: {
              type: "single",
              value: "good-night"
            },
            correct:
              "Muito bem! GOOD NIGHT foi relacionado à cena noturna.",
            incorrect:
              "Ouça GOOD NIGHT novamente e procure a cena da noite.",
            mechanic: "target-shooter",
            allowImage: true,
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "GOOD NIGHT",
              targetShooter: {
                audioText: "Good night",
                mode: "audio-to-image",
                shape: "cloud",
                correctIds: ["scene-night"],
                difficulty: {
                  speed: 0.38,
                  objectCount: 4,
                  spawnIntervalMs: 195,
                  requiredCorrect: 1,
                  targetSize: 148
                },
                items: [
                  {
                    id: "scene-hello",
                    label: "",
                    image: VISUALS.greeting,
                    display: "image"
                  },
                  {
                    id: "scene-morning",
                    label: "",
                    image: VISUALS.morning,
                    display: "image"
                  },
                  {
                    id: "scene-afternoon",
                    label: "",
                    image: VISUALS.afternoon,
                    display: "image"
                  },
                  {
                    id: "scene-night",
                    label: "",
                    image: VISUALS.night,
                    display: "image"
                  }
                ]
              }
            }
          })
        ]
      },

      /* =====================================================
         ETAPA 2 — GOODBYE & SEE YOU
         EN2-M1-04 / 05
         ===================================================== */
      {
        id:
          "en2-m1-step-02-goodbye-see-you",

        title:
          "Goodbye & See You",

        mechanic:
          "matching",

        skill:
          SKILLS.greetings,

        questions: [
          baseQuestion({
            id: "EN2-M1-04",
            skill: SKILLS.greetings,
            difficulty: "easy",
            statement: "Goodbye",
            instruction:
              "Ouça e ligue cada expressão à palavra correspondente.",
            alternatives: [
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("hi", "HI"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: {
              type: "single",
              value: "goodbye"
            },
            correct:
              "Muito bem! GOODBYE é uma despedida.",
            incorrect:
              "Ouça novamente e compare GOODBYE e HI.",
            mechanic: "matching",
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "GOODBYE",
              matching: {
                mode: "audio-word",
                leftTitle: "Ouça",
                rightTitle: "Palavras",
                leftItems: [
                  {
                    id: "audio-goodbye",
                    spokenText: "Goodbye",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Goodbye"
                  },
                  {
                    id: "audio-hi",
                    spokenText: "Hi",
                    speechLocale: "en-US",

                    audioDescription: "Ouvir Hi"
                  }
                ],
                rightItems: [
                  {
                    id: "word-goodbye",
                    label: "GOODBYE",
                    spokenText: "Goodbye",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Goodbye"
                  },
                  {
                    id: "word-hi",
                    label: "HI",
                    spokenText: "Hi",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Hi"
                  }
                ],
                pairs: [
                  {
                    leftId: "audio-goodbye",
                    rightId: "word-goodbye"
                  },
                  {
                    leftId: "audio-hi",
                    rightId: "word-hi"
                  }
                ],
                behavior: {
                  shuffleLeft: true,
                  shuffleRight: true,
                  connectionMode: "1x1",
                  interactionMode: "smart"
                }
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-05",
            skill: SKILLS.greetings,
            difficulty: "easy",
            statement: "See you",
            instruction:
              "Ouça e ligue cada expressão à palavra correspondente.",
            alternatives: [
              sourceOption("hi", "HI"),
              sourceOption("see-you", "SEE YOU"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: {
              type: "single",
              value: "see-you"
            },
            correct:
              "Isso! SEE YOU também pode ser usado na despedida.",
            incorrect:
              "Ouça novamente e compare SEE YOU e HELLO.",
            mechanic: "matching",
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "SEE YOU",
              matching: {
                mode: "audio-word",
                leftTitle: "Ouça",
                rightTitle: "Palavras",
                leftItems: [
                  {
                    id: "audio-see-you",
                    spokenText: "See you",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir See you"
                  },
                  {
                    id: "audio-hello",
                    spokenText: "Hello",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Hello"
                  }
                ],
                rightItems: [
                  {
                    id: "word-see-you",
                    label: "SEE YOU",
                    spokenText: "See you",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir See you"
                  },
                  {
                    id: "word-hello",
                    label: "HELLO",
                    spokenText: "Hello",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Hello"
                  }
                ],
                pairs: [
                  {
                    leftId: "audio-see-you",
                    rightId: "word-see-you"
                  },
                  {
                    leftId: "audio-hello",
                    rightId: "word-hello"
                  }
                ],
                behavior: {
                  shuffleLeft: true,
                  shuffleRight: true,
                  connectionMode: "1x1",
                  interactionMode: "smart"
                }
              }
            }
          })
        ]
      },

      /* =====================================================
         ETAPA 3 — ALPHABET POP
         EN2-M1-06 / 07 / 08
         ===================================================== */
      {

        id:
          "en2-m1-step-03-alphabet-pop",

        title:
          "Alphabet Pop",

        mechanic:
          "bubble-pop",

        skill:
          SKILLS.alphabetListening,

        questions: [
          baseQuestion({
            id: "EN2-M1-06",
            skill: SKILLS.alphabetListening,
            difficulty: "easy",
            statement: "Letter A",
            instruction:
              "Ouça a letra e estoure a resposta correta.",
            audioText: "A",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("b", "B"),
              sourceOption("c", "C"),
              sourceOption("a", "A"),
              sourceOption("d", "D")
            ],
            answer: {
              type: "single",
              value: "a"
            },
            correct:
              "Muito bem! Você encontrou a letra A.",
            incorrect:
              "Ouça a letra A novamente e tente outra vez.",
            mechanic: "bubble-pop",
            metadata: {
              title: "LETTER A",
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "A",
              behavior: {
                shuffleBubbles: true
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-07",
            skill: SKILLS.alphabetListening,
            difficulty: "easy",
            statement: "Letter B",
            instruction:
              "Ouça a letra e estoure a resposta correta.",
            audioText: "B",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("a", "A"),
              sourceOption("c", "C"),
              sourceOption("d", "D"),
              sourceOption("b", "B")
            ],
            answer: {
              type: "single",
              value: "b"
            },
            correct:
              "Excelente! Você encontrou a letra B.",
            incorrect:
              "Ouça a letra B novamente e tente outra vez.",
            mechanic: "bubble-pop",
            metadata: {
              title: "LETTER B",
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "B",
              behavior: {
                shuffleBubbles: true
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-08",
            skill: SKILLS.alphabetListening,
            difficulty: "easy",
            statement: "Letter C",
            instruction:
              "Ouça a letra e estoure a resposta correta.",
            audioText: "C",
            audioLanguage: "en-US",
            alternatives: [
              sourceOption("c", "C"),
              sourceOption("a", "A"),
              sourceOption("b", "B"),
              sourceOption("d", "D")
            ],
            answer: {
              type: "single",
              value: "c"
            },
            correct:
              "Muito bem! Você encontrou a letra C.",
            incorrect:
              "Ouça a letra C novamente e tente outra vez.",
            mechanic: "bubble-pop",
            metadata: {
              title: "LETTER C",
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "C",
              behavior: {
                shuffleBubbles: true
              }
            }
          })
        ]
      },

      /* =====================================================
         ETAPA 4 — ALPHABET MEMORY
         EN2-M1-09 / 10
         ===================================================== */
      {
        id:
          "en2-m1-step-04-alphabet-memory",

        title:
          "Alphabet Memory",

        mechanic:
          "memory-quest",

        skill:
          SKILLS.alphabetListening,

        questions: [
          baseQuestion({
            id: "EN2-M1-09",
            skill: SKILLS.alphabetListening,
            difficulty: "easy",
            statement: "Letter M",
            instruction:
              "Vire as cartas, ouça os áudios e encontre os pares de letras.",
            alternatives: [
              sourceOption("a", "A"),
              sourceOption("m", "M"),
              sourceOption("b", "B"),
              sourceOption("c", "C")
            ],
            answer: {
              type: "single",
              value: "m"
            },
            correct:
              "Muito bem! Você encontrou a letra M e revisou a letra B.",
            incorrect:
              "Ouça as letras novamente e procure os pares iguais.",
            mechanic: "memory-quest",
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "M",
              memoryQuest: {
                cards: [
                  {
                    id: "audio-m",
                    pairId: "m",
                    spokenText: "M",
                    audioDescription: "Ouvir M"
                  },
                  {
                    id: "letter-m",
                    pairId: "m",
                    label: "M"
                  },
                  {
                    id: "audio-b",
                    pairId: "b",
                    spokenText: "B",
                    audioDescription: "Ouvir B"
                  },
                  {
                    id: "letter-b",
                    pairId: "b",
                    label: "B"
                  }
                ],
                behavior: {
                  shuffleCards: true,
                  matchDelayMs: 420,
                  mismatchDelayMs: 1800
                }
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-10",
            skill: SKILLS.alphabetListening,
            difficulty: "easy",
            statement: "Letter S",
            instruction:
              "Vire as cartas, ouça os áudios e encontre os pares de letras.",
            alternatives: [
              sourceOption("a", "A"),
              sourceOption("b", "B"),
              sourceOption("s", "S"),
              sourceOption("c", "C")
            ],
            answer: {
              type: "single",
              value: "s"
            },
            correct:
              "Muito bem! Você encontrou a letra S e revisou a letra C.",
            incorrect:
              "Ouça as letras novamente e procure os pares iguais.",
            mechanic: "memory-quest",
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "S",
              memoryQuest: {
                cards: [
                  {
                    id: "audio-s",
                    pairId: "s",
                    spokenText: "S",
                    audioDescription: "Ouvir S"
                  },
                  {
                    id: "letter-s",
                    pairId: "s",
                    label: "S"
                  },
                  {
                    id: "audio-c",
                    pairId: "c",
                    spokenText: "C",
                    audioDescription: "Ouvir C"
                  },
                  {
                    id: "letter-c",
                    pairId: "c",
                    label: "C"
                  }
                ],
                behavior: {
                  shuffleCards: true,
                  matchDelayMs: 420,
                  mismatchDelayMs: 1800
                }
              }

            }
          })
        ]
      },

      /* =====================================================
         ETAPA 5 — SPELL IT!
         EN2-M1-11 / 12
         ===================================================== */
      {
        id:
          "en2-m1-step-05-spell-it",

        title:
          "Spell It!",

        mechanic:
          "drag-drop",

        skill:
          SKILLS.spellingSequence,

        questions: [
          baseQuestion({
            id: "EN2-M1-11",
            skill: SKILLS.spellingQuestion,
            difficulty: "medium",
            statement: "How do you spell...?",
            instruction:
              "Arraste a pergunta de soletração para o lugar correto e organize as outras expressões.",
            alternatives: [
              audioOption(
                "how-old",
                "HOW OLD ARE YOU?",
                "How old are you?"
              ),
              audioOption(
                "whats-this",
                "WHAT'S THIS?",
                "What's this?"
              ),
              audioOption(
                "good-afternoon",
                "GOOD AFTERNOON.",
                "Good afternoon."
              ),
              audioOption(
                "how-do-you-spell",
                "HOW DO YOU SPELL...?",
                "How do you spell...?"
              )
            ],
            answer: {
              type: "pairs",
              value: [
                {
                  source: "how-do-you-spell",
                  target: "spelling"
                },
                {
                  source: "how-old",
                  target: "other"
                },
                {
                  source: "whats-this",
                  target: "other"
                },
                {
                  source: "good-afternoon",
                  target: "other"
                }
              ]
            },
            correct:
              "Muito bem! HOW DO YOU SPELL...? é a pergunta de soletração.",
            incorrect:
              "Toque nas expressões, ouça novamente e organize cada uma no grupo correto.",
            mechanic: "drag-drop",
            metadata: {
              sourceDifficulty: "Média",
              sourceCorrectAnswer: "HOW DO YOU SPELL...?",
              targets: [
                {
                  id: "spelling",
                  label: "SOLETRAÇÃO",
                  capacity: 1
                },
                {
                  id: "other",
                  label: "OUTRAS EXPRESSÕES",
                  capacity: 3
                }
              ],
              layout: "categories",
              shuffleItems: true
            }
          }),

          baseQuestion({
            id: "EN2-M1-12",
            skill: SKILLS.spellingSequence,
            difficulty: "medium",
            statement: "ANA",
            instruction:
              "Arraste as letras para formar o nome ANA.",
            alternatives: [
              audioOption("a-first", "A", "A"),
              audioOption("n", "N", "N"),
              audioOption("a-last", "A", "A")
            ],
            answer: {
              type: "sequence",
              value: [
                "a-first",
                "n",
                "a-last"
              ]
            },
            correct:
              "Excelente! A-N-A forma o nome ANA.",
            incorrect:
              "Ouça as letras e organize novamente: A, N, A.",
            mechanic: "drag-drop",
            metadata: {
              sourceDifficulty: "Média",

              sourceCorrectAnswer: "A-N-A",
              sourceAlternatives: [
                "A-N-A",
                "A-M-A",
                "E-N-A",
                "A-N-E"
              ],
              sequenceLabels: [
                "1",
                "2",
                "3"
              ],
              layout: "sequence",
              shuffleItems: true
            }
          })
        ]
      },

      /* =====================================================
         ETAPA 6 — FINAL CHALLENGE
         EN2-M1-13 / 14 / 15
         ===================================================== */
      {
        id:
          "en2-m1-step-06-final-challenge",

        title:
          "Final Challenge",

        mechanic:
          "smart-sentence",

        skill:
          SKILLS.alphabetSequence,

        questions: [
          baseQuestion({
            id: "EN2-M1-13",
            skill: SKILLS.farewell,
            difficulty: "medium",
            statement: "Qual alternativa é uma despedida?",
            instruction:
              "Complete a despedida.",
            alternatives: [
              sourceOption("good-morning", "GOOD MORNING"),
              sourceOption("see-you", "SEE YOU"),
              sourceOption("hello", "HELLO"),
              sourceOption("hi", "HI")
            ],
            answer: {
              type: "single",
              value: "see-you"
            },
            correct:
              "Muito bem! SEE YOU é uma despedida.",
            incorrect:
              "Toque nas opções para ouvir e complete SEE YOU.",
            mechanic: "smart-sentence",
            metadata: {
              sourceDifficulty: "Média",
              sourceCorrectAnswer: "SEE YOU",
              smartSentence: {
                prefix: "SEE",
                suffix: ".",
                answer: "YOU",
                options: [
                  "YOU",
                  "HELLO",
                  "MORNING",
                  "HI"
                ],
                instruction:
                  "Complete a despedida.",
                instructionSpoken:
                  "Complete a despedida."
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-14",
            skill: SKILLS.presentationAlphabet,
            difficulty: "medium",
            statement:
              "How do you spell your name?",
            instruction:
              "Complete a pergunta usada para pedir a soletração do nome.",
            alternatives: [
              sourceOption("good-night", "GOOD NIGHT!"),
              sourceOption("how-many", "HOW MANY?"),
              sourceOption(
                "spell-name",
                "HOW DO YOU SPELL YOUR NAME?"
              ),
              sourceOption("where-is-my", "WHERE IS MY...?" )
            ],
            answer: {
              type: "single",
              value: "spell-name"
            },
            correct:
              "Excelente! HOW DO YOU SPELL YOUR NAME? pede a soletração do nome.",
            incorrect:
              "Ouça as opções e complete a pergunta com SPELL.",
            mechanic: "smart-sentence",
            metadata: {
              sourceDifficulty: "Média",
              sourceCorrectAnswer:
                "HOW DO YOU SPELL YOUR NAME?",
              smartSentence: {
                prefix: "HOW DO YOU",
                suffix: "YOUR NAME?",
                answer: "SPELL",
                options: [
                  "SPELL",
                  "SEE",
                  "GOOD",
                  "MORNING"
                ],
                instruction:
                  "Complete a pergunta usada para pedir a soletração do nome.",
                instructionSpoken:
                  "Complete a pergunta usada para pedir a soletração do nome."
              }

            }
          }),

          baseQuestion({
            id: "EN2-M1-15",
            skill: SKILLS.alphabetSequence,
            difficulty: "hard",
            statement:
              "A - B - C - D",
            instruction:
              "Complete a sequência alfabética.",
            alternatives: [
              sourceOption("acbd", "A - C - B - D"),
              sourceOption("bacd", "B - A - C - D"),
              sourceOption("abdc", "A - B - D - C"),
              sourceOption("abcd", "A - B - C - D")
            ],
            answer: {
              type: "single",
              value: "abcd"
            },
            correct:
              "Parabéns! A-B-C-D está na ordem alfabética correta.",
            incorrect:
              "Observe a sequência e complete com a próxima letra.",
            mechanic: "smart-sentence",
            metadata: {
              sourceDifficulty: "Difícil",
              sourceCorrectAnswer:
                "A - B - C - D",
              smartSentence: {
                prefix: "A - B - C -",
                suffix: "",
                answer: "D",
                options: [
                  "D",
                  "A",
                  "M",
                  "S"
                ],
                instruction:
                  "Complete a sequência alfabética.",
                instructionSpoken:
                  "Complete a sequência alfabética."
              }
            }
          })
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT
    .english
    .year2
    .module01 =
      Object.freeze(
        moduleDefinition
      );

})();
