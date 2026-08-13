   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   Hello! Greetings & Introductions
   Versão 1.7.2 — OFICIAL DUDUQ · REPARO DE PUBLICAÇÃO R16.1

   FONTES EDITORIAIS
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - DUDUQ Documento Mestre — Conteúdo & Orquestração v1.0

   REGRAS DESTA VERSÃO
   - Preserva integralmente os 12 itens editoriais EN1-M1-01 a EN1-M1-12.
   - Incorpora EN1-M1-13 (GOOD NIGHT) como adição editorial DuduQ autorizada.
   - Não usa Bubble Pop no 1º ano.
   - Leitura em inglês NÃO é pré-requisito para jogar.
   - Áudio e imagem assumem papel pedagógico central.
   - MP3s oficiais são prioridade; Speech Synthesis permanece como fallback.
   - Todas as cenas usam os PNGs oficiais do Assets-DuduQ.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.7.2";

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

  const BASE =
    "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  const CONTENT =
    window.DuduQAssets
      ?.assets
      ?.content
      ?.english
      ?.year1
      ?.module01 || {};

  const VISUALS =
    Object.freeze({
      greeting:
        CONTENT.greeting ||
        BASE + "Hello.png",

      goodbye:
        CONTENT.goodbye ||
        BASE + "Bye.png",

      morning:
        CONTENT.morning ||
        BASE + "Good%20Morning.png",

      afternoon:
        CONTENT.afternoon ||
        BASE + "Good%20Afternoon.png",

      night:
        CONTENT.night ||
        BASE + "Good%20Night.png",

      boy:
        CONTENT.boy ||
        BASE + "Boy.png",

      girl:
        CONTENT.girl ||
        BASE + "Girl.png",

      selfintro:
        CONTENT.selfintro ||
        BASE + "My%20name.png",

      rain:
        BASE + "Rain.png",

      nervous:
        BASE + "nervous.png",

      fishGirl:
        BASE + "Fish_Girl.png",

      wheelchairBoy:
        BASE + "wheelchair_boy.png"
    });

  const AUDIO_BASE =
    BASE + "Audios/";

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
        stimuli.map(
          function (item) {
            return Object.freeze({
              text: item.text,
              language: "en-US",
              src: audioFile(item.file)
            });
          }
        )
      )
    });
  }

  const AUDIO_CATALOG =
    Object.freeze({
      "EN1-M1-01": audioEntry(
        "target-shooter",
        "Ouça e acerte a cena que combina com a saudação.",
        "ING_1ANO_M01_EN1-M1-01_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Hello",
            file:
              "ING_1ANO_M01_EN1-M1-01_TARGET-SHOOTER_ESTIMULO01_HELLO_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-02": audioEntry(
        "matching",
        "Ouça e ligue cada saudação à cena correta.",
        "ING_1ANO_M01_EN1-M1-02_MATCHING_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Good morning",
            file:
              "ING_1ANO_M01_EN1-M1-02_MATCHING_ESTIMULO01_GOOD-MORNING_ENUS.mp3"
          },
          {
            text: "Good afternoon",
            file:
              "ING_1ANO_M01_EN1-M1-02_MATCHING_ESTIMULO02_GOOD-AFTERNOON_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-03": audioEntry(
        "target-shooter",
        "Ouça e acerte a cena do período correspondente.",
        "ING_1ANO_M01_EN1-M1-03_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Good afternoon",
            file:
              "ING_1ANO_M01_EN1-M1-03_TARGET-SHOOTER_ESTIMULO01_GOOD-AFTERNOON_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-04": audioEntry(
        "target-shooter",
        "Ouça e acerte a cena de despedida.",
        "ING_1ANO_M01_EN1-M1-04_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Goodbye",
            file:
              "ING_1ANO_M01_EN1-M1-04_TARGET-SHOOTER_ESTIMULO01_GOODBYE_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-05": audioEntry(
        "matching",
        "Ouça e ligue cada fala à cena correspondente.",
        "ING_1ANO_M01_EN1-M1-05_MATCHING_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "I'm Ana",
            file:
              "ING_1ANO_M01_EN1-M1-05_MATCHING_ESTIMULO01_IM-ANA_ENUS.mp3"
          },
          {
            text: "Goodbye",
            file:
              "ING_1ANO_M01_EN1-M1-05_MATCHING_ESTIMULO02_GOODBYE_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-06": audioEntry(
        "matching",
        "Ouça e ligue cada palavra à imagem correta.",
        "ING_1ANO_M01_EN1-M1-06_MATCHING_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Boy",
            file:
              "ING_1ANO_M01_EN1-M1-06_MATCHING_ESTIMULO01_BOY_ENUS.mp3"
          },
          {
            text: "Girl",
            file:
              "ING_1ANO_M01_EN1-M1-06_MATCHING_ESTIMULO02_GIRL_ENUS.mp3"

          }
        ]
      ),

      "EN1-M1-07": audioEntry(
        "matching",
        "Observe as imagens e ligue cada uma à palavra correspondente. Toque nas palavras para ouvi-las.",
        "ING_1ANO_M01_EN1-M1-07_MATCHING_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Boy",
            file:
              "ING_1ANO_M01_EN1-M1-07_MATCHING_ESTIMULO01_BOY_ENUS.mp3"
          },
          {
            text: "Girl",
            file:
              "ING_1ANO_M01_EN1-M1-07_MATCHING_ESTIMULO02_GIRL_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-08": audioEntry(
        "matching",
        "Ouça e ligue cada fala à resposta que combina.",
        "ING_1ANO_M01_EN1-M1-08_MATCHING_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Hello",
            file:
              "ING_1ANO_M01_EN1-M1-08_MATCHING_ESTIMULO01_HELLO_ENUS.mp3"
          },
          {
            text: "Goodbye",
            file:
              "ING_1ANO_M01_EN1-M1-08_MATCHING_ESTIMULO02_GOODBYE_ENUS.mp3"
          },
          {
            text: "Hi",
            file:
              "ING_1ANO_M01_EN1-M1-08_MATCHING_ESTIMULO03_HI_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-09": audioEntry(
        "drag-drop",
        "Toque para ouvir e arraste cada áudio para a cena correspondente.",
        "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "I'm Ana.",
            file:
              "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO01_IM-ANA_ENUS.mp3"
          },
          {
            text: "Goodbye",
            file:
              "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO02_GOODBYE_ENUS.mp3"
          },
          {
            text: "Good afternoon",
            file:
              "ING_1ANO_M01_EN1-M1-09_DRAG-DROP_ESTIMULO03_GOOD-AFTERNOON_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-10": audioEntry(
        "smart-sentence",
        "Observe a imagem e complete a frase para o menino.",
        "ING_1ANO_M01_EN1-M1-10_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Boy",
            file:

              "ING_1ANO_M01_EN1-M1-10_SMART-SENTENCE_ESTIMULO01_BOY_ENUS.mp3"
          },
          {
            text: "Girl",
            file:
              "ING_1ANO_M01_EN1-M1-10_SMART-SENTENCE_ESTIMULO02_GIRL_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-11": audioEntry(
        "smart-sentence",
        "Observe a imagem e complete a frase para a menina.",
        "ING_1ANO_M01_EN1-M1-11_SMART-SENTENCE_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Boy",
            file:
              "ING_1ANO_M01_EN1-M1-11_SMART-SENTENCE_ESTIMULO01_BOY_ENUS.mp3"
          },
          {
            text: "Girl",
            file:
              "ING_1ANO_M01_EN1-M1-11_SMART-SENTENCE_ESTIMULO02_GIRL_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-12": audioEntry(
        "memory-quest",
        "Vire as cartas, ouça os áudios e encontre cada cena correspondente.",
        "ING_1ANO_M01_EN1-M1-12_MEMORY-QUEST_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Hello",
            file:
              "ING_1ANO_M01_EN1-M1-12_MEMORY-QUEST_ESTIMULO01_HELLO_ENUS.mp3"
          },
          {
            text: "Good morning",
            file:
              "ING_1ANO_M01_EN1-M1-12_MEMORY-QUEST_ESTIMULO02_GOOD-MORNING_ENUS.mp3"
          },
          {
            text: "Goodbye",
            file:
              "ING_1ANO_M01_EN1-M1-12_MEMORY-QUEST_ESTIMULO03_GOODBYE_ENUS.mp3"
          }
        ]
      ),

      "EN1-M1-13": audioEntry(
        "target-shooter",
        "Ouça e acerte a cena do período correspondente.",
        "ING_1ANO_M01_EN1-M1-13_TARGET-SHOOTER_ENUNCIADO_PTBR.mp3",
        [
          {
            text: "Good night",
            file:
              "ING_1ANO_M01_EN1-M1-13_TARGET-SHOOTER_ESTIMULO01_GOOD-NIGHT_ENUS.mp3"
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

  const SKILLS =
    Object.freeze({
      greetingBasic:
        skill(
          "Identificar cumprimentos básicos usados no dia a dia."
        ),

      greetingSituation:
        skill(
          "Relacionar cumprimentos a situações cotidianas."
        ),

      farewell:
        skill(
          "Identificar expressão de despedida."
        ),

      identifySelf:
        skill(
          "Identificar-se utilizando a estrutura ‘I’m...’."
        ),

      boyGirl:
        skill(
          "Compreender e empregar as palavras boy e girl."
        ),

      greetingResponse:
        skill(
          "Responder a um cumprimento simples."
        ),

      personalPresentation:
        skill(
          "Identificar apresentação pessoal simples."
        ),

      boyGirlSentence:
        skill(
          "Empregar a estrutura ‘I’m a boy/girl’."
        ),

      distinguishGreetingFarewell:
        skill(
          "Distinguir cumprimento e despedida."
        )
    });

  const moduleDefinition = {
    id:
      "english-year-1-module-01",

    version:
      VERSION,

    subject:
      "Língua Inglesa",

    year:
      1,

    module:
      1,

    title:
      "Hello! Greetings & Introductions",

    description:
      "Missão inicial de Língua Inglesa do 1º ano, organizada para crianças em processo de alfabetização, com prioridade para escuta, imagens e associações significativas.",

    estimatedMinutes:
      5,

    audioPolicy: {
      primary: "recorded-media",
      fallback: "speech-synthesis",

      base: AUDIO_BASE,
      totalFiles: 38,
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },

    audioCatalog:
      AUDIO_CATALOG,

    learningGoals: [
      "Reconhecer HI, HELLO, GOODBYE, GOOD MORNING, GOOD AFTERNOON e GOOD NIGHT em situações simples.",
      "Relacionar cumprimentos e despedidas a cenas de encontro, manhã, tarde e noite.",
      "Reconhecer BOY e GIRL com apoio visual e sonoro.",
      "Compreender I’M... como estrutura inicial de apresentação pessoal.",
      "Completar I’M A BOY/GIRL em uma estrutura curta e contextualizada.",
      "Revisar cumprimentos por associação entre áudio e imagem."
    ],

    pedagogicalNotes: {
      officialSource:
        "Módulo preserva os 12 itens da fonte editorial EN1-M1-01 a EN1-M1-12 e incorpora EN1-M1-13 (GOOD NIGHT) como adição editorial DuduQ autorizada para a versão oficial.",

      literacy:
        "No 1º ano, a leitura de palavras em inglês não é tratada como pré-requisito. Áudio e imagem oferecem o caminho principal de compreensão.",

      contentAssetPolicy:
        "As cenas desta versão usam imagens oficiais do repositório Assets-DuduQ.",

      audioPolicy:
        "Os 38 MP3s de Audios/ são a fonte sonora prioritária. O TTS permanece apenas como fallback técnico de segurança."
    },

    intro: {
      companyKicker:
        "UMA CRIAÇÃO DE",

      companyWidth:
        820,

      collectionLogo:
        BASE +
        "Logo%20EduQ%20Play.png",

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
         ETAPA 1 — LISTEN & CHOOSE
         ===================================================== */
      {
        id:
          "en1-m1-step-01-listen-choose",

        title:
          "Listen & Choose",

        mechanic:
          "target-shooter",

        skill:
          SKILLS.greetingBasic,

        questions: [
          {
            id: "EN1-M1-01",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingBasic,
            difficulty: "easy",
            statement: "Hello!",
            instruction:
              "Ouça e acerte a cena que combina com a saudação.",

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
              sourceOption(
                "goodbye",
                "GOODBYE"
              ),
              sourceOption(
                "hello",
                "HELLO"
              ),
              sourceOption(
                "good-morning",
                "GOOD MORNING"
              )
            ],

            answer: {
              type: "single",
              value: "hello"
            },

            feedback: {
              correct:
                "Muito bem! HELLO é uma saudação de encontro.",

              incorrect:
                "Ouça HELLO novamente e observe as cenas.",

              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "target-shooter",

              allowImage:
                true,

              allowAudio:
                true
            },

            metadata: {
              title:
                "Hello!",

              screenTitle:
                "Hello!",

              sourceDifficulty:
                "Fácil",

              sourceCorrectAnswer:
                "HELLO",

              targetShooter: {
                audioText:
                  "Hello",

                mode:
                  "audio-to-image",

                shape:
                  "balloon",

                correctIds: [
                  "scene-greeting"
                ],

                difficulty: {
                  speed: 0.42,
                  objectCount: 3,
                  spawnIntervalMs: 190,
                  requiredCorrect: 1,
                  targetSize: 150
                },

                items: [
                  {
                    id:
                      "scene-greeting",
                    label:
                      "",
                    image:
                      VISUALS.greeting,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-wheelchair-boy",
                    label:
                      "",
                    image:
                      VISUALS.wheelchairBoy,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-fish-girl",
                    label:
                      "",
                    image:
                      VISUALS.fishGirl,
                    display:
                      "image"

                  }
                ]
              }
            }
          },

          {
            id: "EN1-M1-03",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingSituation,
            difficulty: "easy",
            statement: "Good afternoon",
            instruction:
              "Ouça e acerte a cena do período correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Good afternoon",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "good-afternoon",
                "GOOD AFTERNOON"
              ),
              sourceOption(
                "good-morning",
                "GOOD MORNING"
              ),
              sourceOption(
                "goodbye",
                "GOODBYE"
              )
            ],

            answer: {
              type: "single",
              value: "good-afternoon"
            },

            feedback: {
              correct:
                "Excelente! GOOD AFTERNOON combina com a tarde.",

              incorrect:
                "Ouça novamente e procure a cena da tarde.",

              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "target-shooter",

              allowImage:
                true,

              allowAudio:
                true
            },

            metadata: {
              title:
                "Good afternoon",

              screenTitle:
                "Afternoon",


              sourceDifficulty:
                "Fácil",

              sourceCorrectAnswer:
                "GOOD AFTERNOON",

              targetShooter: {
                audioText:
                  "Good afternoon",

                mode:
                  "audio-to-image",

                shape:
                  "cloud",

                correctIds: [
                  "scene-afternoon"
                ],

                difficulty: {
                  speed: 0.42,
                  objectCount: 3,
                  spawnIntervalMs: 190,
                  requiredCorrect: 1,
                  targetSize: 150
                },

                items: [
                  {
                    id:
                      "scene-morning",
                    label:
                      "",
                    image:
                      VISUALS.morning,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-afternoon",
                    label:
                      "",
                    image:
                      VISUALS.afternoon,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-rain",
                    label:
                      "",
                    image:
                      VISUALS.rain,
                    display:
                      "image"
                  }
                ]
              }
            }
          },

          {
            id: "EN1-M1-04",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.farewell,
            difficulty: "easy",
            statement: "Goodbye!",
            instruction:
              "Ouça e acerte a cena de despedida.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Goodbye",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "hello",
                "HELLO"
              ),
              sourceOption(
                "goodbye",
                "GOODBYE"
              ),
              sourceOption(
                "good-morning",
                "GOOD MORNING"
              )
            ],

            answer: {
              type: "single",
              value: "goodbye"
            },

            feedback: {
              correct:
                "Isso! GOODBYE é usado para se despedir.",

              incorrect:
                "Ouça GOODBYE novamente e observe quem está indo embora.",

              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "target-shooter",

              allowImage:
                true,

              allowAudio:
                true
            },

            metadata: {
              title:
                "Goodbye!",

              screenTitle:
                "Goodbye!",

              sourceDifficulty:
                "Fácil",

              sourceCorrectAnswer:
                "GOODBYE",

              targetShooter: {
                audioText:
                  "Goodbye",

                mode:
                  "audio-to-image",

                shape:
                  "balloon",

                correctIds: [
                  "scene-goodbye"
                ],

                difficulty: {
                  speed: 0.40,
                  objectCount: 3,
                  spawnIntervalMs: 195,
                  requiredCorrect: 1,
                  targetSize: 150
                },

                items: [
                  {
                    id:
                      "scene-nervous",
                    label:
                      "",
                    image:
                      VISUALS.nervous,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-goodbye",
                    label:
                      "",
                    image:
                      VISUALS.goodbye,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-wheelchair-boy",
                    label:
                      "",
                    image:
                      VISUALS.wheelchairBoy,
                    display:
                      "image"
                  }
                ]
              }
            }
          },

          {
            id: "EN1-M1-13",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingSituation,
            difficulty: "easy",
            statement: "Good night",
            instruction:
              "Ouça e acerte a cena do período correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text: "Good night",
              language: "en-US",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "good-night",
                "GOOD NIGHT"
              ),
              sourceOption(

                "good-morning",
                "GOOD MORNING"
              ),
              sourceOption(
                "good-afternoon",
                "GOOD AFTERNOON"
              )
            ],

            answer: {
              type: "single",
              value: "good-night"
            },

            feedback: {
              correct:
                "Muito bem! GOOD NIGHT é usado para desejar boa noite, geralmente ao se despedir.",

              incorrect:
                "Ouça GOOD NIGHT novamente e procure a cena noturna.",

              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "target-shooter",

              allowImage:
                true,

              allowAudio:
                true
            },

            metadata: {
              title:
                "Good night",

              screenTitle:
                "Good night",

              sourceDifficulty:
                "Fácil",

              sourceCorrectAnswer:
                "GOOD NIGHT",

              editorialOrigin:
                "Adição editorial DuduQ autorizada após os 12 itens da fonte original.",

              targetShooter: {
                audioText:
                  "Good night",

                mode:
                  "audio-to-image",

                shape:
                  "cloud",

                correctIds: [
                  "scene-night"
                ],

                difficulty: {
                  speed: 0.40,
                  objectCount: 3,
                  spawnIntervalMs: 195,
                  requiredCorrect: 1,
                  targetSize: 150
                },

                items: [
                  {

                    id:
                      "scene-morning",
                    label:
                      "",
                    image:
                      VISUALS.morning,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-afternoon",
                    label:
                      "",
                    image:
                      VISUALS.afternoon,
                    display:
                      "image"
                  },
                  {
                    id:
                      "scene-night",
                    label:
                      "",
                    image:
                      VISUALS.night,
                    display:
                      "image"
                  }
                ]
              }
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 2 — MORNING & AFTERNOON
         ===================================================== */
      {
        id:
          "en1-m1-step-02-morning-afternoon",

        title:
          "Morning & Afternoon",

        mechanic:
          "matching",

        skill:
          SKILLS.greetingSituation,

        questions: [
          {
            id: "EN1-M1-02",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingSituation,
            difficulty: "easy",
            statement: "Good morning",
            instruction:
              "Ouça e ligue cada saudação à cena correta.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Ouça e ligue cada saudação à cena correta.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "good-afternoon",
                "GOOD AFTERNOON"
              ),
              sourceOption(
                "goodbye",
                "GOODBYE"
              ),
              sourceOption(
                "good-morning",
                "GOOD MORNING"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "good-morning"
            },

            feedback: {
              correct:
                "Muito bem! GOOD MORNING combina com a manhã.",

              incorrect:
                "Ouça cada áudio novamente e compare manhã e tarde.",

              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "matching",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              matching: {
                mode:
                  "audio-image",

                leftTitle:
                  "Ouça",

                rightTitle:
                  "Cenas",

                assets: {
                  morning:
                    VISUALS.morning,
                  afternoon:
                    VISUALS.afternoon
                },

                leftItems: [
                  {
                    id:
                      "audio-morning",
                    spokenText:
                      "Good morning",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Good morning"
                  },
                  {
                    id:
                      "audio-afternoon",
                    spokenText:
                      "Good afternoon",

                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Good afternoon"
                  }
                ],

                rightItems: [
                  {
                    id:
                      "picture-morning",
                    imageAssetKey:
                      "morning",
                    alt:
                      "Cena de manhã"
                  },
                  {
                    id:
                      "picture-afternoon",
                    imageAssetKey:
                      "afternoon",
                    alt:
                      "Cena de tarde"
                  }
                ],

                pairs: [
                  {
                    leftId:
                      "audio-morning",
                    rightId:
                      "picture-morning"
                  },
                  {
                    leftId:
                      "audio-afternoon",
                    rightId:
                      "picture-afternoon"
                  }
                ],

                behavior: {
                  shuffleLeft:
                    true,
                  shuffleRight:
                    true,
                  connectionMode:
                    "1x1",
                  interactionMode:
                    "smart"
                }
              }
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 3 — WHO AM I?
         ===================================================== */
      {
        id:
          "en1-m1-step-03-who-am-i",

        title:
          "Who Am I?",

        mechanic:
          "matching",

        skill:
          SKILLS.boyGirl,

        questions: [

          {

            id: "EN1-M1-05",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.identifySelf,
            difficulty: "easy",
            statement: "I'm...",
            instruction:
              "Ouça e ligue cada fala à cena correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Ouça e ligue cada fala à cena correspondente.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "goodbye",
                "GOODBYE"
              ),
              sourceOption(
                "good-afternoon",
                "GOOD AFTERNOON"
              ),
              sourceOption(
                "im",
                "I'M..."
              )
            ],

            answer: {
              type:
                "single",
              value:
                "im"
            },

            feedback: {
              correct:
                "Certo! I'M... pode iniciar uma apresentação com o próprio nome.",
              incorrect:
                "Ouça novamente e observe quem está se apresentando.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "matching",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              matching: {
                mode:
                  "audio-image",

                leftTitle:
                  "Ouça",

                rightTitle:
                  "Cenas",

                assets: {
                  selfintro:
                    VISUALS.selfintro,

                  goodbye:
                    VISUALS.goodbye
                },

                leftItems: [
                  {
                    id:
                      "audio-im",
                    spokenText:
                      "I'm Ana",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir uma apresentação"
                  },
                  {
                    id:
                      "audio-goodbye",
                    spokenText:
                      "Goodbye",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir uma despedida"
                  }
                ],

                rightItems: [
                  {
                    id:
                      "picture-selfintro",
                    imageAssetKey:
                      "selfintro",
                    alt:
                      "Criança dizendo o próprio nome"
                  },
                  {
                    id:
                      "picture-goodbye",
                    imageAssetKey:
                      "goodbye",
                    alt:
                      "Cena de despedida"
                  }
                ],

                pairs: [
                  {
                    leftId:
                      "audio-im",
                    rightId:
                      "picture-selfintro"
                  },
                  {
                    leftId:
                      "audio-goodbye",
                    rightId:
                      "picture-goodbye"
                  }
                ],

                behavior: {
                  shuffleLeft:
                    true,
                  shuffleRight:
                    true,
                  connectionMode:
                    "1x1",
                  interactionMode:
                    "smart"
                }
              }
            }
          },

          {

            id: "EN1-M1-06",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirl,
            difficulty: "easy",
            statement: "Boy",
            instruction:
              "Ouça e ligue cada palavra à imagem correta.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Ouça e ligue cada palavra à imagem correta.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "boy",
                "BOY"
              ),
              sourceOption(
                "girl",
                "GIRL"
              ),
              sourceOption(
                "hello",
                "HELLO"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "boy"
            },

            feedback: {
              correct:
                "Muito bem! BOY foi relacionado à figura de menino.",
              incorrect:
                "Ouça BOY e GIRL novamente e compare as imagens.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "matching",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              matching: {
                mode:
                  "audio-image",

                leftTitle:
                  "Ouça",

                rightTitle:
                  "Imagens",

                assets: {
                  boy:
                    VISUALS.boy,

                  girl:
                    VISUALS.girl
                },

                leftItems: [
                  {
                    id:
                      "audio-boy",
                    spokenText:
                      "Boy",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Boy"
                  },
                  {
                    id:
                      "audio-girl",
                    spokenText:
                      "Girl",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Girl"
                  }
                ],

                rightItems: [
                  {
                    id:
                      "picture-boy",
                    imageAssetKey:
                      "boy",
                    alt:
                      "Ilustração de menino"
                  },
                  {
                    id:
                      "picture-girl",
                    imageAssetKey:
                      "girl",
                    alt:
                      "Ilustração de menina"
                  }
                ],

                pairs: [
                  {
                    leftId:
                      "audio-boy",
                    rightId:
                      "picture-boy"
                  },
                  {
                    leftId:
                      "audio-girl",
                    rightId:
                      "picture-girl"
                  }
                ],

                behavior: {
                  shuffleLeft:
                    true,
                  shuffleRight:
                    true,
                  connectionMode:
                    "1x1",
                  interactionMode:
                    "smart"
                }
              }
            }
          },

          {

            id: "EN1-M1-07",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirl,
            difficulty: "easy",
            statement: "Girl",
            instruction:
              "Observe as imagens e ligue cada uma à palavra correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Observe as imagens e ligue cada uma à palavra correspondente. Toque nas palavras para ouvi-las.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "boy",
                "BOY"
              ),
              sourceOption(
                "girl",
                "GIRL"
              ),
              sourceOption(
                "goodbye",
                "GOODBYE"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "girl"
            },

            feedback: {
              correct:
                "Muito bem! GIRL corresponde à figura de menina.",
              incorrect:
                "Toque em BOY e GIRL para ouvir antes de ligar.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "matching",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              matching: {
                mode:
                  "image-word",

                leftTitle:
                  "Imagens",

                rightTitle:
                  "Ouça e ligue",

                assets: {
                  boy:
                    VISUALS.boy,

                  girl:
                    VISUALS.girl
                },

                leftItems: [
                  {
                    id:
                      "picture-boy",
                    imageAssetKey:
                      "boy",
                    alt:
                      "Ilustração de menino"
                  },
                  {
                    id:
                      "picture-girl",
                    imageAssetKey:
                      "girl",
                    alt:
                      "Ilustração de menina"
                  }
                ],

                rightItems: [
                  {
                    id:
                      "word-boy",
                    label:
                      "BOY",
                    spokenText:
                      "Boy",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Boy"
                  },
                  {
                    id:
                      "word-girl",
                    label:
                      "GIRL",
                    spokenText:
                      "Girl",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Girl"
                  }
                ],

                pairs: [
                  {
                    leftId:
                      "picture-boy",
                    rightId:
                      "word-boy"
                  },
                  {
                    leftId:
                      "picture-girl",
                    rightId:
                      "word-girl"
                  }
                ],

                behavior: {
                  shuffleLeft:
                    true,
                  shuffleRight:
                    true,
                  connectionMode:
                    "1x1",
                  interactionMode:
                    "smart"
                }
              }

            }
          },

          {
            id: "EN1-M1-08",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingResponse,
            difficulty: "medium",
            statement: "Hello → Hi",
            instruction:
              "Ouça e ligue cada fala à resposta que combina.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Ouça e ligue cada fala à resposta que combina.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              sourceOption(
                "goodbye",
                "GOODBYE!"
              ),
              sourceOption(
                "im-boy",
                "I'M A BOY."
              ),
              sourceOption(
                "hi",
                "HI!"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "hi"
            },

            feedback: {
              correct:
                "Isso! HI! pode responder a HELLO!.",
              incorrect:
                "Ouça novamente as falas e compare encontro e despedida.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "matching",
              allowImage:
                false,
              allowAudio:
                true
            },

            metadata: {
              matching: {
                mode:
                  "audio-word",

                leftTitle:
                  "Ouça",

                rightTitle:
                  "Respostas",


                leftItems: [
                  {
                    id:
                      "audio-hello",
                    spokenText:
                      "Hello",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Hello"
                  },
                  {
                    id:
                      "audio-goodbye",
                    spokenText:
                      "Goodbye",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Goodbye"
                  }
                ],

                rightItems: [
                  {
                    id:
                      "word-hi",
                    label:
                      "HI!",
                    spokenText:
                      "Hi",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Hi"
                  },
                  {
                    id:
                      "word-goodbye",
                    label:
                      "GOODBYE!",
                    spokenText:
                      "Goodbye",
                    speechLocale:
                      "en-US",
                    audioDescription:
                      "Ouvir Goodbye"
                  }
                ],

                pairs: [
                  {
                    leftId:
                      "audio-hello",
                    rightId:
                      "word-hi"
                  },
                  {
                    leftId:
                      "audio-goodbye",
                    rightId:
                      "word-goodbye"
                  }
                ],

                behavior: {
                  shuffleLeft:
                    false,
                  shuffleRight:
                    true,
                  connectionMode:
                    "1x1",
                  interactionMode:
                    "smart"
                }

              }
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 4 — I'M ANA.
         ===================================================== */
      {
        id:
          "en1-m1-step-04-im-ana",

        title:
          "I'm Ana.",

        mechanic:
          "drag-drop",

        skill:
          SKILLS.personalPresentation,

        questions: [
          {
            id: "EN1-M1-09",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.personalPresentation,
            difficulty: "medium",
            statement: "I'm Ana.",
            instruction:
              "Toque para ouvir e arraste cada áudio para a cena correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled: true,
              text:
                "Toque para ouvir e arraste cada áudio para a cena correspondente.",
              language: "pt-BR",
              role: "instruction"
            },

            alternatives: [
              {
                id:
                  "audio-1",
                text:
                  "1",
                audio: {
                  enabled:
                    true,
                  text:
                    "I'm Ana.",
                  language:
                    "en-US",
                  role:
                    "option"
                }
              },
              {
                id:
                  "audio-2",
                text:
                  "2",
                audio: {
                  enabled:
                    true,
                  text:
                    "Goodbye",
                  language:
                    "en-US",
                  role:

                    "option"
                }
              },
              {
                id:
                  "audio-3",
                text:
                  "3",
                audio: {
                  enabled:
                    true,
                  text:
                    "Good afternoon",
                  language:
                    "en-US",
                  role:
                    "option"
                }
              }
            ],

            answer: {
              type:
                "pairs",

              value: [
                {
                  source:
                    "audio-1",
                  target:
                    "scene-selfintro"
                },
                {
                  source:
                    "audio-2",
                  target:
                    "scene-goodbye"
                },
                {
                  source:
                    "audio-3",
                  target:
                    "scene-afternoon"
                }
              ]
            },

            feedback: {
              correct:
                "Muito bem! I'M ANA. corresponde à cena de apresentação pessoal.",
              incorrect:
                "Toque nos três cards novamente e compare as cenas.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "drag-drop",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              targets: [
                {
                  id:
                    "scene-selfintro",

                  image: {
                    src:
                      VISUALS.selfintro,
                    alt:
                      "Criança dizendo o próprio nome"

                  }
                },
                {
                  id:
                    "scene-goodbye",

                  image: {
                    src:
                      VISUALS.goodbye,
                    alt:
                      "Cena de despedida"
                  }
                },
                {
                  id:
                    "scene-afternoon",

                  image: {
                    src:
                      VISUALS.afternoon,
                    alt:
                      "Cena do período da tarde"
                  }
                }
              ]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 5 — I'M A...
         ===================================================== */
      {
        id:
          "en1-m1-step-05-im-a",

        title:
          "I'm a...",

        mechanic:
          "smart-sentence",

        skill:
          SKILLS.boyGirlSentence,

        questions: [
          {
            id: "EN1-M1-10",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirlSentence,
            difficulty: "medium",
            statement: "I'm a ___.",
            instruction:
              "Observe a imagem e complete a frase.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled:
                true,
              text:
                "Observe a imagem e complete a frase para o menino.",
              language:
                "pt-BR",
              role:
                "instruction"
            },

            alternatives: [
              sourceOption(
                "girl",

                "GIRL"
              ),
              sourceOption(
                "boy",
                "BOY"
              ),
              sourceOption(
                "goodbye",
                "GOODBYE"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "boy"
            },

            feedback: {
              correct:
                "Perfeito! I'M A BOY.",
              incorrect:
                "Observe a imagem, toque nas opções para ouvir e tente novamente.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "smart-sentence",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              smartSentence: {
                prefix:
                  "I'M A",

                suffix:
                  ".",

                answer:
                  "BOY",

                options: [
                  "BOY",
                  "GIRL"
                ],

                imageKey:
                  "boy",

                imageSrc:
                  VISUALS.boy,

                imageAlt:
                  "Ilustração de menino",

                instruction:
                  "Observe a imagem e complete a frase.",

                instructionSpoken:
                  "Observe a imagem e complete a frase para o menino."
              }
            }
          },

          {
            id: "EN1-M1-11",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,

            skill: SKILLS.boyGirlSentence,
            difficulty: "medium",
            statement: "I'm a ___.",
            instruction:
              "Observe a imagem e complete a frase.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled:
                true,
              text:
                "Observe a imagem e complete a frase para a menina.",
              language:
                "pt-BR",
              role:
                "instruction"
            },

            alternatives: [
              sourceOption(
                "boy",
                "BOY"
              ),
              sourceOption(
                "hello",
                "HELLO"
              ),
              sourceOption(
                "girl",
                "GIRL"
              )
            ],

            answer: {
              type:
                "single",
              value:
                "girl"
            },

            feedback: {
              correct:
                "Perfeito! I'M A GIRL.",
              incorrect:
                "Observe a imagem, toque nas opções para ouvir e tente novamente.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "smart-sentence",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              smartSentence: {
                prefix:
                  "I'M A",

                suffix:
                  ".",

                answer:
                  "GIRL",

                options: [
                  "BOY",
                  "GIRL"
                ],


                imageKey:
                  "girl",

                imageSrc:
                  VISUALS.girl,

                imageAlt:
                  "Ilustração de menina",

                instruction:
                  "Observe a imagem e complete a frase.",

                instructionSpoken:
                  "Observe a imagem e complete a frase para a menina."
              }
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 6 — GREETING MEMORY
         ===================================================== */
      {
        id:
          "en1-m1-step-06-greeting-memory",

        title:
          "Greeting Memory",

        mechanic:
          "memory-quest",

        skill:
          SKILLS.distinguishGreetingFarewell,

        questions: [
          {
            id: "EN1-M1-12",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.distinguishGreetingFarewell,
            difficulty: "hard",
            statement: "Greeting or Goodbye?",
            instruction:
              "Vire as cartas, ouça os áudios e encontre cada cena correspondente.",

            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",

            audio: {
              enabled:
                true,
              text:
                "Vire as cartas, ouça os áudios e encontre cada cena correspondente.",
              language:
                "pt-BR",
              role:
                "instruction"
            },

            alternatives: [
              sourceOption(
                "goodbye",
                "GOODBYE"
              ),
              sourceOption(
                "hello",
                "HELLO"
              ),
              sourceOption(
                "good-morning",
                "GOOD MORNING"

              )
            ],

            answer: {
              type:
                "single",
              value:
                "goodbye"
            },

            feedback: {
              correct:
                "Muito bem! Você revisou HELLO, GOOD MORNING e GOODBYE.",
              incorrect:
                "Ouça novamente e use as cenas como pista de significado.",
              language:
                "pt-BR"
            },

            delivery: {
              mechanic:
                "memory-quest",
              allowImage:
                true,
              allowAudio:
                true
            },

            metadata: {
              memoryQuest: {
                assets: {
                  greeting:
                    VISUALS.greeting,
                  morning:
                    VISUALS.morning,
                  goodbye:
                    VISUALS.goodbye
                },

                cards: [
                  {
                    id:
                      "audio-hello",
                    pairId:
                      "hello",
                    spokenText:
                      "Hello",
                    audioDescription:
                      "Ouvir Hello"
                  },
                  {
                    id:
                      "picture-hello",
                    pairId:
                      "hello",
                    imageAssetKey:
                      "greeting",
                    alt:
                      "Pessoas se cumprimentando"
                  },
                  {
                    id:
                      "audio-morning",
                    pairId:
                      "morning",
                    spokenText:
                      "Good morning",
                    audioDescription:
                      "Ouvir Good morning"
                  },
                  {
                    id:
                      "picture-morning",
                    pairId:
                      "morning",
                    imageAssetKey:

                      "morning",
                    alt:
                      "Cena de manhã"
                  },
                  {
                    id:
                      "audio-goodbye",
                    pairId:
                      "goodbye",
                    spokenText:
                      "Goodbye",
                    audioDescription:
                      "Ouvir Goodbye"
                  },
                  {
                    id:
                      "picture-goodbye",
                    pairId:
                      "goodbye",
                    imageAssetKey:
                      "goodbye",
                    alt:
                      "Cena de despedida"
                  }
                ],

                behavior: {
                  shuffleCards:
                    true,
                  matchDelayMs:
                    420,
                  mismatchDelayMs:
                    1800
                }
              }
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
