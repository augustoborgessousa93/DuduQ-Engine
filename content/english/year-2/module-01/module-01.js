/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 2 — MODULE 01
   Greetings & The Alphabet
   Versão 1.3.1 — LETRAS VISUAIS + POLIMENTO PREMIUM

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
   - Retira Memory Quest deste módulo e utiliza cada mecânica com função cognitiva clara.
   - Prioriza áudio + imagem nas associações para reduzir dependência de leitura.
   - Usa a escrita somente depois de significado, som e contexto já estarem estabelecidos.
   - Elimina tarefas genéricas sem função comunicativa em inglês.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.3.1";

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

    selfintro:
      BASE + "Imagens%20Ilustrativa/My%20name.png",

    rain:
      BASE + "Imagens%20Ilustrativa/Rain.png",

    nervous:
      BASE + "Imagens%20Ilustrativa/nervous.png",

    fishGirl:
      BASE + "Imagens%20Ilustrativa/Fish_Girl.png",

    wheelchairBoy:
      BASE + "Imagens%20Ilustrativa/wheelchair_boy.png",

    letterA:
      BASE + "Imagens%20Ilustrativa/Letra%20A.png",

    letterB:
      BASE + "Imagens%20Ilustrativa/Letra%20B.png",

    letterC:
      BASE + "Imagens%20Ilustrativa/Letra%20C.png",

    letterD:
      BASE + "Imagens%20Ilustrativa/Letra%20D.png",

    letterE:
      BASE + "Imagens%20Ilustrativa/Letra%20E.png",

    letterM:
      BASE + "Imagens%20Ilustrativa/Letra%20M.png",

    letterS:
      BASE + "Imagens%20Ilustrativa/Letra%20S.png"
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
      "Ouça cada expressão e ligue à cena correspondente.",
      "ING_2ANO_M01_EN2-M1-04_MATCHING_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Goodbye",
          file:
            "ING_2ANO_M01_EN2-M1-04_MATCHING_ESTIMULO01_GOODBYE_ENUS.mp3"
        },
        {
          text: "Hello",
          file:
            "ING_2ANO_M01_EN2-M1-04_MATCHING_ESTIMULO02_HELLO_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-05": audioEntry(
      "matching",
      "Ouça cada expressão e ligue à cena correspondente.",
      "ING_2ANO_M01_EN2-M1-05_MATCHING_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "See you",
          file:
            "ING_2ANO_M01_EN2-M1-05_MATCHING_ESTIMULO01_SEE-YOU_ENUS.mp3"
        },
        {
          text: "Good morning",
          file:
            "ING_2ANO_M01_EN2-M1-05_MATCHING_ESTIMULO02_GOOD-MORNING_ENUS.mp3"
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
          text: "C",
          file:
            "ING_2ANO_M01_EN2-M1-10_DRAG-DROP_ESTIMULO03_C_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-11": audioEntry(
      "smart-sentence",
      "Observe a imagem e complete a pergunta.",
      "ING_2ANO_M01_EN2-M1-11_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Spell",
          file:
            "ING_2ANO_M01_EN2-M1-11_SMART-SENTENCE_ESTIMULO01_SPELL_ENUS.mp3"
        },
        {
          text: "Say",
          file:
            "ING_2ANO_M01_EN2-M1-11_SMART-SENTENCE_ESTIMULO02_SAY_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-12": audioEntry(
      "drag-drop",
      "Organize as palavras para formar GOOD MORNING.",
      "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Good",
          file:
            "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ESTIMULO01_GOOD_ENUS.mp3"
        },
        {
          text: "Morning",
          file:
            "ING_2ANO_M01_EN2-M1-12_DRAG-DROP_ESTIMULO02_MORNING_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-13": audioEntry(
      "matching",
      "Ouça cada expressão e ligue à cena correspondente.",
      "ING_2ANO_M01_EN2-M1-13_MATCHING_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Good afternoon",
          file:
            "ING_2ANO_M01_EN2-M1-13_MATCHING_ESTIMULO01_GOOD-AFTERNOON_ENUS.mp3"
        },
        {
          text: "Goodbye",
          file:
            "ING_2ANO_M01_EN2-M1-13_MATCHING_ESTIMULO02_GOODBYE_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-14": audioEntry(
      "smart-sentence",
      "Observe a imagem e complete a pergunta sobre o nome.",
      "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "Spell",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO01_SPELL_ENUS.mp3"
        },
        {
          text: "Say",
          file:
            "ING_2ANO_M01_EN2-M1-14_SMART-SENTENCE_ESTIMULO02_SAY_ENUS.mp3"
        }
      ]
    ),

    "EN2-M1-15": audioEntry(
      "drag-drop",
      "Organize as palavras para formar SEE YOU.",
      "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ENUNCIADO_PTBR.mp3",
      [
        {
          text: "See",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO01_SEE_ENUS.mp3"
        },
        {
          text: "You",
          file:
            "ING_2ANO_M01_EN2-M1-15_DRAG-DROP_ESTIMULO02_YOU_ENUS.mp3"
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

  function letterVisualOption(id, text, imageAssetKey) {
    return {
      id,
      text,
      image: {
        alt: "Letra " + text
      },
      metadata: {
        imageAssetKey
      }
    };
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
    greetingsContext:
      skill(
        "Compreender cumprimentos e despedidas em situações cotidianas com apoio de áudio e imagem."
      ),

    greetingFarewellAssociation:
      skill(
        "Associar expressões orais de cumprimento e despedida às cenas correspondentes."
      ),

    alphabetListening:
      skill(
        "Ouvir e identificar nomes de letras pronunciados em inglês."
      ),

    spellingQuestion:
      skill(
        "Compreender e completar a estrutura HOW DO YOU SPELL...? com apoio visual."
      ),

    phraseBuilding:
      skill(
        "Organizar palavras conhecidas para formar expressões curtas em inglês."
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
      "Missão de Língua Inglesa do 2º ano com progressão oral, visual e escrita: cumprimentos e despedidas em contexto, discriminação auditiva de letras em inglês, uso de HOW DO YOU SPELL...? e construção de expressões curtas já estudadas.",

    estimatedMinutes:
      10,

    audioPolicy: {
      primary: "recorded-media",
      fallback: "speech-synthesis",
      base: AUDIO_BASE,
      totalFiles: 39,
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },

    audioCatalog:
      AUDIO_CATALOG,

    learningGoals: [
      "Reconhecer HELLO, GOOD MORNING, GOOD AFTERNOON, GOOD NIGHT, GOODBYE e SEE YOU com apoio de áudio e cenas.",
      "Distinguir cumprimentos e despedidas sem depender da leitura de palavras longas.",
      "Ouvir e identificar nomes de letras em inglês, consolidando A, B, C e ampliando para M.",
      "Compreender HOW DO YOU SPELL...? em situações significativas, com imagem e apenas duas opções de resposta.",
      "Completar HOW DO YOU SPELL HELLO? e HOW DO YOU SPELL YOUR NAME? com apoio visual.",
      "Organizar palavras conhecidas para formar GOOD MORNING e SEE YOU, relacionando forma escrita, som e uso comunicativo."
    ],

    pedagogicalNotes: {
      officialSource:
        "Módulo baseado nos 15 itens oficiais EN2-M1-01 a EN2-M1-15 do documento DuduQ Conteúdo Oficial — Língua Inglesa v1.0.",

      literacy:
        "No 2º ano, áudio e imagem continuam centrais. A leitura aparece de forma gradual, em letras e expressões curtas já contextualizadas, sem transformar decodificação textual em pré-requisito para compreender a tarefa.",

      adaptation:
        "A progressão vai do significado para a forma: primeiro a criança reconhece situações comunicativas por áudio e imagem; depois discrimina nomes de letras em inglês; em seguida usa HOW DO YOU SPELL...? com apoio visual; por fim reorganiza palavras de expressões já conhecidas. Não há atividades de nomes próprios ou ordenação alfabética genérica sem função linguística.",

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
          SKILLS.greetingsContext,

        questions: [
          baseQuestion({
                      id: "EN2-M1-01",
                      skill: SKILLS.greetingsContext,
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
                      skill: SKILLS.greetingsContext,
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
                      skill: SKILLS.greetingsContext,
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
         ETAPA 2 — GREETINGS & GOODBYES
         EN2-M1-04 / EN2-M1-05 / EN2-M1-13
         Apoio visual prioritário: áudio -> cena.
         ===================================================== */
      {
        id:
          "en2-m1-step-02-greetings-goodbyes",

        title:
          "Greetings & Goodbyes",

        mechanic:
          "matching",

        skill:
          SKILLS.greetingFarewellAssociation,

        questions: [
          baseQuestion({
            id: "EN2-M1-04",
            skill: SKILLS.greetingFarewellAssociation,
            difficulty: "easy",
            statement: "Hello or Goodbye?",
            instruction:
              "Ouça e ligue cada expressão à cena correspondente.",
            alternatives: [
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("hello", "HELLO")
            ],
            answer: {
              type: "single",
              value: "goodbye"
            },
            correct:
              "Muito bem! Você reconheceu HELLO e GOODBYE pelas situações.",
            incorrect:
              "Ouça novamente e observe: uma cena mostra encontro e a outra mostra despedida.",
            mechanic: "matching",
            allowImage: true,
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "GOODBYE",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Cenas",
                assets: {
                  greeting: VISUALS.greeting,
                  goodbye: VISUALS.goodbye
                },
                leftItems: [
                  {
                    id: "audio-goodbye",
                    spokenText: "Goodbye",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Goodbye"
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
                    id: "picture-goodbye",
                    imageAssetKey: "goodbye",
                    alt: "Cena de despedida"
                  },
                  {
                    id: "picture-hello",
                    imageAssetKey: "greeting",
                    alt: "Cena de cumprimento"
                  }
                ],
                pairs: [
                  {
                    leftId: "audio-goodbye",
                    rightId: "picture-goodbye"
                  },
                  {
                    leftId: "audio-hello",
                    rightId: "picture-hello"
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
            skill: SKILLS.greetingFarewellAssociation,
            difficulty: "easy",
            statement: "See you or Good morning?",
            instruction:
              "Ouça e ligue cada expressão à cena correspondente.",
            alternatives: [
              sourceOption("see-you", "SEE YOU"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: {
              type: "single",
              value: "see-you"
            },
            correct:
              "Isso! SEE YOU combina com despedida e GOOD MORNING com a cena da manhã.",
            incorrect:
              "Ouça novamente e use as imagens como pista para encontrar cada expressão.",
            mechanic: "matching",
            allowImage: true,
            metadata: {
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "SEE YOU",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Cenas",
                assets: {
                  goodbye: VISUALS.goodbye,
                  morning: VISUALS.morning
                },
                leftItems: [
                  {
                    id: "audio-see-you",
                    spokenText: "See you",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir See you"
                  },
                  {
                    id: "audio-good-morning",
                    spokenText: "Good morning",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Good morning"
                  }
                ],
                rightItems: [
                  {
                    id: "picture-goodbye",
                    imageAssetKey: "goodbye",
                    alt: "Cena de despedida"
                  },
                  {
                    id: "picture-morning",
                    imageAssetKey: "morning",
                    alt: "Cena de manhã"
                  }
                ],
                pairs: [
                  {
                    leftId: "audio-see-you",
                    rightId: "picture-goodbye"
                  },
                  {
                    leftId: "audio-good-morning",
                    rightId: "picture-morning"
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
            skill: SKILLS.greetingFarewellAssociation,
            difficulty: "medium",
            statement: "Good afternoon or Goodbye?",
            instruction:
              "Ouça e ligue cada expressão à cena correspondente.",
            alternatives: [
              sourceOption("good-afternoon", "GOOD AFTERNOON"),
              sourceOption("goodbye", "GOODBYE")
            ],
            answer: {
              type: "single",
              value: "good-afternoon"
            },
            correct:
              "Excelente! Você usou o som e a cena para distinguir GOOD AFTERNOON de GOODBYE.",
            incorrect:
              "Ouça outra vez e observe qual imagem representa a tarde e qual representa uma despedida.",
            mechanic: "matching",
            allowImage: true,
            metadata: {
              title: "GREETINGS & GOODBYES",
              sourceDifficulty: "Média",
              sourceCorrectAnswer: "GOOD AFTERNOON",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Cenas",
                assets: {
                  afternoon: VISUALS.afternoon,
                  goodbye: VISUALS.goodbye
                },
                leftItems: [
                  {
                    id: "audio-good-afternoon",
                    spokenText: "Good afternoon",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Good afternoon"
                  },
                  {
                    id: "audio-goodbye",
                    spokenText: "Goodbye",
                    speechLocale: "en-US",
                    audioDescription: "Ouvir Goodbye"
                  }
                ],
                rightItems: [
                  {
                    id: "picture-afternoon",
                    imageAssetKey: "afternoon",
                    alt: "Cena de tarde"
                  },
                  {
                    id: "picture-goodbye",
                    imageAssetKey: "goodbye",
                    alt: "Cena de despedida"
                  }
                ],
                pairs: [
                  {
                    leftId: "audio-good-afternoon",
                    rightId: "picture-afternoon"
                  },
                  {
                    leftId: "audio-goodbye",
                    rightId: "picture-goodbye"
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
                        letterVisualOption("b", "B", "letterB"),
                        letterVisualOption("c", "C", "letterC"),
                        letterVisualOption("a", "A", "letterA")
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
                        letterVisualOption("a", "A", "letterA"),
                        letterVisualOption("c", "C", "letterC"),
                        letterVisualOption("b", "B", "letterB")
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
                        letterVisualOption("c", "C", "letterC"),
                        letterVisualOption("a", "A", "letterA"),
                        letterVisualOption("b", "B", "letterB")
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
          "Listen & Find the Letter",

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
                          shape: "balloon",
                          correctIds: ["letter-m"],
                          difficulty: {
                            speed: 0.36,
                            objectCount: 3,
                            spawnIntervalMs: 190,
                            requiredCorrect: 1,
                            targetSize: 164
                          },
                          items: [
                            {
                              id: "letter-a",
                              label: "A",
                              image: VISUALS.letterA,
                              display: "image"
                            },
                            {
                              id: "letter-m",
                              label: "M",
                              image: VISUALS.letterM,
                              display: "image"
                            },
                            {
                              id: "letter-b",
                              label: "B",
                              image: VISUALS.letterB,
                              display: "image"
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
         Consolidação auditiva das letras já trabalhadas.
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
            statement: "A, B, C",
            instruction:
              "Ouça cada card e arraste-o para a letra correspondente.",
            alternatives: [
              audioOnlyOption("sound-a", "A"),
              audioOnlyOption("sound-b", "B"),
              audioOnlyOption("sound-c", "C")
            ],
            answer: {
              type: "pairs",
              value: [
                {
                  source: "sound-a",
                  target: "letter-a"
                },
                {
                  source: "sound-b",
                  target: "letter-b"
                },
                {
                  source: "sound-c",
                  target: "letter-c"
                }
              ]
            },
            correct:
              "Excelente! Você relacionou os sons de A, B e C às letras corretas.",
            incorrect:
              "Toque nos cards para ouvir novamente e compare com A, B e C.",
            mechanic: "drag-drop",
            metadata: {
              title: "LISTEN & MATCH",
              sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "A-B-C",
              targets: [
                {
                  id: "letter-a",
                  label: "A",
                  imageSrc: VISUALS.letterA,
                  alt: "Letra A",
                  capacity: 1
                },
                {
                  id: "letter-b",
                  label: "B",
                  imageSrc: VISUALS.letterB,
                  alt: "Letra B",
                  capacity: 1
                },
                {
                  id: "letter-c",
                  label: "C",
                  imageSrc: VISUALS.letterC,
                  alt: "Letra C",
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
         ETAPA 6 — HOW DO YOU SPELL?
         EN2-M1-11 / EN2-M1-14
         Mesmo andaime do 1º ano: imagem + uma lacuna + 2 opções.
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
            statement: "How do you spell hello?",
            instruction:
              "Observe a imagem e complete a pergunta.",
            alternatives: [
              sourceOption("spell", "SPELL"),
              sourceOption("say", "SAY")
            ],
            answer: {
              type: "single",
              value: "spell"
            },
            correct:
              "Muito bem! HOW DO YOU SPELL HELLO? pergunta como HELLO é soletrado.",
            incorrect:
              "Observe a cena, ouça novamente e escolha entre SPELL e SAY.",
            mechanic: "smart-sentence",
            allowImage: true,
            metadata: {
              title: "HOW DO YOU SPELL HELLO?",
              sourceDifficulty: "Média",
              sourceCorrectAnswer: "SPELL",
              smartSentence: {
                prefix: "HOW DO YOU",
                suffix: "HELLO?",
                answer: "SPELL",
                options: [
                  "SPELL",
                  "SAY"
                ],
                imageKey: "hello-context",
                imageSrc: VISUALS.greeting,
                imageAlt: "Cena de pessoas se cumprimentando",
                instruction:
                  "Observe a imagem e complete a pergunta.",
                instructionSpoken:
                  "Observe a imagem e complete a pergunta."
              }
            }
          }),

          baseQuestion({
            id: "EN2-M1-14",
            skill: SKILLS.spellingQuestion,
            difficulty: "medium",
            statement:
              "How do you spell your name?",
            instruction:
              "Observe a imagem e complete a pergunta sobre o nome.",
            alternatives: [
              sourceOption("spell", "SPELL"),
              sourceOption("say", "SAY")
            ],
            answer: {
              type: "single",
              value: "spell"
            },
            correct:
              "Excelente! HOW DO YOU SPELL YOUR NAME? pede a soletração do nome.",
            incorrect:
              "Use a imagem como pista e escolha entre SPELL e SAY.",
            mechanic: "smart-sentence",
            allowImage: true,
            metadata: {
              title: "HOW DO YOU SPELL YOUR NAME?",
              sourceDifficulty: "Média",
              sourceCorrectAnswer:
                "SPELL",
              smartSentence: {
                prefix: "HOW DO YOU",
                suffix: "YOUR NAME?",
                answer: "SPELL",
                options: [
                  "SPELL",
                  "SAY"
                ],
                imageKey: "name-context",
                imageSrc: VISUALS.selfintro,
                imageAlt: "Criança se apresentando pelo nome",
                instruction:
                  "Observe a imagem e complete a pergunta sobre o nome.",
                instructionSpoken:
                  "Observe a imagem e complete a pergunta sobre o nome."
              }
            }
          })
        ]
      },

      /* =====================================================
         ETAPA 7 — BUILD THE PHRASE
         EN2-M1-12 / EN2-M1-15
         Síntese: organizar palavras de expressões inglesas já conhecidas.
         ===================================================== */
      {
        id:
          "en2-m1-step-07-build-the-phrase",

        title:
          "Build the Phrase",

        mechanic:
          "drag-drop",

        skill:
          SKILLS.phraseBuilding,

        questions: [
          baseQuestion({
            id: "EN2-M1-12",
            skill: SKILLS.phraseBuilding,
            difficulty: "medium",
            statement: "GOOD MORNING",
            instruction:
              "Organize as palavras para formar GOOD MORNING.",
            alternatives: [
              audioOption("word-good", "GOOD", "Good"),
              audioOption("word-morning", "MORNING", "Morning")
            ],
            answer: {
              type: "sequence",
              value: [
                "word-good",
                "word-morning"
              ]
            },
            correct:
              "Muito bem! GOOD + MORNING forma GOOD MORNING.",
            incorrect:
              "Toque nas palavras para ouvir e organize novamente a expressão GOOD MORNING.",
            mechanic: "drag-drop",
            metadata: {
              sourceDifficulty: "Média",
              sourceCorrectAnswer: "GOOD MORNING",
              sequenceLabels: [
                "1",
                "2"
              ],
              layout: "sequence",
              shuffleItems: true
            }
          }),

          baseQuestion({
            id: "EN2-M1-15",
            skill: SKILLS.phraseBuilding,
            difficulty: "medium",
            statement:
              "SEE YOU",
            instruction:
              "Organize as palavras para formar SEE YOU.",
            alternatives: [
              audioOption("word-see", "SEE", "See"),
              audioOption("word-you", "YOU", "You")
            ],
            answer: {
              type: "sequence",
              value: [
                "word-see",
                "word-you"
              ]
            },
            correct:
              "Parabéns! SEE + YOU forma SEE YOU, uma expressão usada na despedida.",
            incorrect:
              "Toque nas palavras para ouvir e organize novamente: SEE YOU.",
            mechanic: "drag-drop",
            metadata: {
              sourceDifficulty: "Média",
              sourceCorrectAnswer:
                "SEE YOU",
              sequenceLabels: [
                "1",
                "2"
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
