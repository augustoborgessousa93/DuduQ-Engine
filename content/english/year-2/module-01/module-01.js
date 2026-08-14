/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 2 — MODULE 01
   Greetings & The Alphabet
   Versão 1.2.0 — REVISÃO PEDAGÓGICA E UX

   FONTES EDITORIAIS
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - Manual do Educador — English — 2º ano — Unidade 1, p. 28

   REGRAS DESTA VERSÃO
   - Preserva os 15 IDs oficiais EN2-M1-01 a EN2-M1-15.
   - Organiza o módulo em 7 etapas com progressão pedagógica explícita.
   - Mantém CAIXA ALTA nos elementos de alfabetização.
   - Prioriza áudio gravado; Speech Synthesis permanece como fallback.
   - Reutiliza somente assets já existentes no Assets-DuduQ.
   - Usa a interface compartilhada do Engine sem criar UI específica por conteúdo.
   - Retira Memory Quest deste módulo e utiliza cada mecânica com função cognitiva clara:
     reconhecer, associar, completar, ordenar e soletrar.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.2.0";

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
    BASE + "Audios/2_ANO/M01/";

  const VISUALS = Object.freeze({
    greeting:
      BASE + "Imagens%20Ilustrativa/Hello.png",

    goodbye:
      BASE + "Imagens%20Ilustrativa/Bye.png",

    morning:
      BASE + "Imagens%20Ilustrativa/Good%20Morning.png",

    afternoon:
      BASE + "Imagens%20Ilustrativa/Good%20Afternoon.png",

    night:
      BASE + "Imagens%20Ilustrativa/Good%20Night.png",

    rain:
      BASE + "Imagens%20Ilustrativa/Rain.png",

    nervous:
      BASE + "Imagens%20Ilustrativa/nervous.png",

    fishGirl:
      BASE + "Imagens%20Ilustrativa/Fish_Girl.png",

    wheelchairBoy:
      BASE + "Imagens%20Ilustrativa/wheelchair_boy.png"
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
      "target-shooter",
      "Ouça a letra e acerte o alvo correto.",
      "ING_2ANO_M01_EN2-M1-09_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "M",
          file:
            "ING_2ANO_M01_EN2-M1-09_TARGET-SHOOTER_ESTIMULO01_M_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-10": audioEntry(
      "drag-drop",
      "Ouça cada letra e arraste o áudio para a letra correspondente.",
      "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "A",
          file:
            "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ESTIMULO01_A_ENUS.mp3"
        },
        {
          text: "B",
          file:
            "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ESTIMULO02_B_ENUS.mp3"
        },
        {
          text: "S",
          file:
            "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ESTIMULO03_S_ENUS.mp3"
        },
        {
          text: "C",
          file:
            "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ESTIMULO04_C_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-11": audioEntry(
      "smart-sentence",
      "Complete a pergunta usada para pedir uma soletração.",
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
      "matching",
      "Ligue cada expressão ao uso correto.",
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
      "drag-drop",
      "Arraste as letras para formar a sequência alfabética correta.",
      "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "A",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO01_A_ENUS.mp3"
        },
        {
          text: "B",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO02_B_ENUS.mp3"
        },
        {
          text: "C",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO03_C_ENUS.mp3"
        },
        {
          text: "D",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO04_D_ENUS.mp3"
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

  function audioOnlyOption(id, spokenText) {
    return {
      id,
      text: "",
      audio: {
        enabled: true,
        text: spokenText,
        language: "en-US",
        role: "option"
      },
      metadata: {
        audioDescription:
          "Ouvir " + spokenText
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
      "Missão de Língua Inglesa do 2º ano organizada em progressão: retomada de cumprimentos e despedidas, reconhecimento auditivo das letras, uso de HOW DO YOU SPELL...? e manipulação de letras para soletrar e ordenar.",

    estimatedMinutes:
      10,

    audioPolicy: {
      primary: "recorded-media",
      fallback: "speech-synthesis",
      base: AUDIO_BASE,
      totalFiles: 48,
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },

    audioCatalog:
      AUDIO_CATALOG,

    learningGoals: [
      "Retomar HELLO, GOOD MORNING e GOOD NIGHT em situações de uso.",
      "Distinguir cumprimentos de despedidas, reconhecendo GOODBYE e SEE YOU.",
      "Ouvir e identificar letras do alfabeto em inglês, com foco em A, B, C, M e S.",
      "Compreender HOW DO YOU SPELL...? como pergunta usada para pedir uma soletração.",
      "Aplicar HOW DO YOU SPELL YOUR NAME? em uma situação inicial de apresentação.",
      "Manipular letras para formar ANA e organizar a sequência A-B-C-D."
    ],

    pedagogicalNotes: {
      officialSource:
        "Módulo baseado nos 15 itens oficiais EN2-M1-01 a EN2-M1-15 do documento DuduQ Conteúdo Oficial — Língua Inglesa v1.0.",

      literacy:
        "No 2º ano, áudio continua central, mas a leitura de letras e palavras curtas passa a integrar a própria interação.",

      adaptation:
        "A sequência parte de linguagem social já conhecida, avança para discriminação auditiva de letras e só depois introduz a linguagem de soletração e a ordenação de letras. Cada mecânica é usada quando acrescenta uma ação cognitiva clara.",

      audioPolicy:
        "Os MP3s nomeados no catálogo são prioritários. Enquanto os arquivos do 2º ano não estiverem publicados em Audios/2_ANO/M01/, o Engine utiliza Speech Synthesis como fallback técnico."
    },

    intro: {
      companyKicker:
        "UMA CRIAÇÃO DE",
      companyWidth:
        820,
      collectionLogo:
        BASE + "Imagens%20Ilustrativa/Logo%20EduQ%20Play.png",
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
         ETAPA 1 — GREETINGS IN CONTEXT
         EN2-M1-01 / EN2-M1-02 / EN2-M1-03
         ===================================================== */
      {
        id:
          "en2-m1-step-01-greetings-in-context",

        title:
          "Greetings in Context",

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
         ETAPA 2 — HELLO OR GOODBYE
         EN2-M1-04 / EN2-M1-05 / EN2-M1-13
         ===================================================== */
      {
        id:
          "en2-m1-step-02-hello-or-goodbye",

        title:
          "Hello or Goodbye?",

        mechanic:
          "matching",

        skill:
          SKILLS.farewell,

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
                    }),

          baseQuestion({
                      id: "EN2-M1-13",
                      skill: SKILLS.farewell,
                      difficulty: "medium",
                      statement: "Greeting or Farewell?",
                      instruction:
                        "Ligue cada expressão ao uso correto.",
                      alternatives: [
                        sourceOption("hello", "HELLO"),
                        sourceOption("see-you", "SEE YOU")
                      ],
                      answer: {
                        type: "single",
                        value: "see-you"
                      },
                      correct:
                        "Muito bem! HELLO é um cumprimento e SEE YOU é uma despedida.",
                      incorrect:
                        "Ouça as expressões novamente e pense: estamos chegando ou nos despedindo?",
                      mechanic: "matching",
                      metadata: {
                        title: "HELLO OR GOODBYE?",
                        sourceDifficulty: "Média",
                        sourceCorrectAnswer: "SEE YOU",
                        matching: {
                          mode: "word-word",
                          leftTitle: "Expressões",
                          rightTitle: "Uso",
                          leftItems: [
                            {
                              id: "word-hello",
                              label: "HELLO",
                              spokenText: "Hello",
                              speechLocale: "en-US",
                              audioDescription: "Ouvir Hello"
                            },
                            {
                              id: "word-see-you",
                              label: "SEE YOU",
                              spokenText: "See you",
                              speechLocale: "en-US",
                              audioDescription: "Ouvir See you"
                            }
                          ],
                          rightItems: [
                            {
                              id: "use-greeting",
                              label: "CUMPRIMENTO"
                            },
                            {
                              id: "use-farewell",
                              label: "DESPEDIDA"
                            }
                          ],
                          pairs: [
                            {
                              leftId: "word-hello",
                              rightId: "use-greeting"
                            },
                            {
                              leftId: "word-see-you",
                              rightId: "use-farewell"
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
         EN2-M1-06 / EN2-M1-07 / EN2-M1-08
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
         ETAPA 4 — LISTEN FOR THE LETTER
         EN2-M1-09
         ===================================================== */
      {
        id:
          "en2-m1-step-04-listen-for-the-letter",

        title:
          "Listen for the Letter",

        mechanic:
          "target-shooter",

        skill:
          SKILLS.alphabetListening,

        questions: [
          baseQuestion({
                      id: "EN2-M1-09",
                      skill: SKILLS.alphabetListening,
                      difficulty: "easy",
                      statement: "Letter M",
                      instruction:
                        "Ouça a letra e acerte o alvo correto.",
                      audioText: "M",
                      audioLanguage: "en-US",
                      alternatives: [
                        sourceOption("a", "A"),
                        sourceOption("m", "M"),
                        sourceOption("b", "B"),
                      ],
                      answer: {
                        type: "single",
                        value: "m"
                      },
                      correct:
                        "Muito bem! Você reconheceu a letra M pelo som.",
                      incorrect:
                        "Ouça a letra M novamente e procure o alvo com M.",
                      mechanic: "target-shooter",
                      metadata: {
                        screenTitle: "LETTER M",
                        sourceDifficulty: "Fácil",
                        sourceCorrectAnswer: "M",
                        targetShooter: {
                          audioText: "M",
                          mode: "audio-to-word",
                          shape: "crystal",
                          correctIds: ["letter-m"],
                          difficulty: {
                            speed: 0.42,
                            objectCount: 3,
                            spawnIntervalMs: 190,
                            requiredCorrect: 1,
                            targetSize: 164
                          },
                          items: [
                            {
                              id: "letter-a",
                              label: "A",
                              display: "word"
                            },
                            {
                              id: "letter-m",
                              label: "M",
                              display: "word"
                            },
                            {
                              id: "letter-b",
                              label: "B",
                              display: "word"
                            }
                          ]
                        }
                      }
                    })
        ]
      },

      /* =====================================================
         ETAPA 5 — LISTEN & MATCH
         EN2-M1-10
         ===================================================== */
      {
        id:
          "en2-m1-step-05-listen-match",

        title:
          "Listen & Match",

        mechanic:
          "drag-drop",

        skill:
          SKILLS.alphabetListening,

        questions: [
          baseQuestion({
                      id: "EN2-M1-10",
                      skill: SKILLS.alphabetListening,
                      difficulty: "easy",
                      statement: "Listen and Match",
                      instruction:
                        "Ouça cada card e arraste-o para a letra correspondente.",
                      alternatives: [
                        audioOnlyOption("a", "A"),
                        audioOnlyOption("s", "S"),
                        audioOnlyOption("c", "C")
                      ],
                      answer: {
                        type: "pairs",
                        value: [
                          {
                            source: "a",
                            target: "letter-a"
                          },
                          {
                            source: "s",
                            target: "letter-s"
                          },
                          {
                            source: "c",
                            target: "letter-c"
                          }
                        ]
                      },
                      correct:
                        "Excelente! Você relacionou os sons de A, S e C às letras corretas.",
                      incorrect:
                        "Toque nos cards para ouvir novamente e arraste cada som para a letra correspondente.",
                      mechanic: "drag-drop",
                      metadata: {
                        title: "LISTEN & MATCH",
                        sourceDifficulty: "Fácil",
                        sourceCorrectAnswer: "S",
                        targets: [
                          {
                            id: "letter-a",
                            label: "A",
                            capacity: 1
                          },
                          {
                            id: "letter-s",
                            label: "S",
                            capacity: 1
                          },
                          {
                            id: "letter-c",
                            label: "C",
                            capacity: 1
                          }
                        ],
                        layout: "grid",
                        shuffleItems: true,
                        shuffleTargets: false
                      }
                    })
        ]
      },

      /* =====================================================
         ETAPA 6 — HOW DO YOU SPELL
         EN2-M1-11 / EN2-M1-14
         ===================================================== */
      {
        id:
          "en2-m1-step-06-how-do-you-spell",

        title:
          "How Do You Spell?",

        mechanic:
          "smart-sentence",

        skill:
          SKILLS.spellingQuestion,

        questions: [
          baseQuestion({
                      id: "EN2-M1-11",
                      skill: SKILLS.spellingQuestion,
                      difficulty: "medium",
                      statement: "How do you spell...?",
                      instruction:
                        "Complete a pergunta usada para pedir uma soletração.",
                      alternatives: [
                        sourceOption("spell", "SPELL"),
                        sourceOption("say", "SAY"),
                        sourceOption("see", "SEE"),
                        sourceOption("like", "LIKE")
                      ],
                      answer: {
                        type: "single",
                        value: "spell"
                      },
                      correct:
                        "Muito bem! HOW DO YOU SPELL...? é a pergunta usada para pedir uma soletração.",
                      incorrect:
                        "Ouça a pergunta novamente e procure a palavra SPELL.",
                      mechanic: "smart-sentence",
                      metadata: {
                        title: "HOW DO YOU SPELL...?",
                        sourceDifficulty: "Média",
                        sourceCorrectAnswer: "HOW DO YOU SPELL...?",
                        smartSentence: {
                          prefix: "HOW DO YOU",
                          suffix: "...?",
                          answer: "SPELL",
                          options: [
                            "SPELL",
                            "SAY",
                            "SEE",
                            "LIKE"
                          ],
                          instruction:
                            "Complete a pergunta usada para pedir uma soletração.",
                          instructionSpoken:
                            "Complete a pergunta usada para pedir uma soletração."
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
                        sourceOption("where-is-my", "WHERE IS MY...?")
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
                    })
        ]
      },

      /* =====================================================
         ETAPA 7 — BUILD & ORDER
         EN2-M1-12 / EN2-M1-15
         ===================================================== */
      {
        id:
          "en2-m1-step-07-build-order",

        title:
          "Build & Order",

        mechanic:
          "drag-drop",

        skill:
          SKILLS.spellingSequence,

        questions: [
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
                    }),

          baseQuestion({
                      id: "EN2-M1-15",
                      skill: SKILLS.alphabetSequence,
                      difficulty: "hard",
                      statement:
                        "A - B - C - D",
                      instruction:
                        "Arraste as letras para formar a sequência alfabética correta.",
                      alternatives: [
                        audioOption("seq-a", "A", "A"),
                        audioOption("seq-b", "B", "B"),
                        audioOption("seq-c", "C", "C"),
                        audioOption("seq-d", "D", "D")
                      ],
                      answer: {
                        type: "sequence",
                        value: [
                          "seq-a",
                          "seq-b",
                          "seq-c",
                          "seq-d"
                        ]
                      },
                      correct:
                        "Parabéns! Você organizou A-B-C-D na ordem correta.",
                      incorrect:
                        "Ouça as letras e organize novamente na ordem A, B, C, D.",
                      mechanic: "drag-drop",
                      metadata: {
                        sourceDifficulty: "Difícil",
                        sourceCorrectAnswer:
                          "A - B - C - D",
                        sourceAlternatives: [
                          "A - C - B - D",
                          "B - A - C - D",
                          "A - B - D - C",
                          "A - B - C - D"
                        ],
                        sequenceLabels: [
                          "1",
                          "2",
                          "3",
                          "4"
                        ],
                        layout: "sequence",
                        shuffleItems: true
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
