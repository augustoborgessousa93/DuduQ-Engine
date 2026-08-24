/* =========================================================
   DUDUQ — ENGLISH — YEAR 2 — MODULE 01 — V2.2 HOMOLOGATION

   Candidata isolada. NÃO substitui module-01.js e NÃO altera Canary 143.
   Fonte editorial: Revisão Pedagógica Integral v2.2, pp. 14–15.

   Regra de segurança:
   - 14 itens estão executáveis nesta candidata;
   - EN2-M1-12 permanece bloqueado até existir garantia verificável de
     primeira escuta de L-E-O sem revelar as letras na tela;
   - Word Slash aparece somente em EN2-M1-08.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "2.2.0-homolog-runtime-a";
  const BASE = "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year2 = window.DUDUQ_CONTENT.english.year2 || {};

  const VISUALS = Object.freeze({
    night: BASE + "Imagens%20Ilustrativa/Good%20Night.png"
  });

  function skill(description) {
    return Object.freeze({ code: null, description });
  }

  const SKILLS = Object.freeze({
    greetings: skill("Identificar e compreender cumprimentos e despedidas básicos por meio da escuta, com apoio visual quando pertinente."),
    alphabet: skill("Ouvir e identificar nomes de letras do alfabeto pronunciados em inglês."),
    spelling: skill("Reconhecer auditivamente perguntas e sequências curtas de soletração em inglês."),
    interaction: skill("Compreender pequenas trocas sociais em inglês, preservando a escuta como evidência principal."),
    pragmatic: skill("Selecionar um cumprimento curto adequado em uma pequena troca social.")
  });

  function option(id, text, withAudio) {
    const value = { id, text };
    if (withAudio) {
      value.audio = {
        enabled: true,
        text,
        language: "en-US",
        role: "option"
      };
    }
    return value;
  }

  function question(config) {
    const value = {
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
        text: config.audioText,
        language: "en-US",
        role: "stimulus"
      },
      alternatives: config.alternatives,
      answer: {
        type: config.answerType || "single",
        value: config.answer
      },
      feedback: {
        correct: config.correct,
        incorrect: config.incorrect,
        language: "pt-BR"
      },
      delivery: {
        mechanic: config.mechanic,
        allowImage: Boolean(config.image),
        allowAudio: true
      },
      metadata: {
        sourceVersion: "2.2",
        sourceStatus: config.sourceStatus,
        readingDemand: config.readingDemand,
        ...(config.metadata || {})
      }
    };

    if (config.image) value.image = config.image;
    return value;
  }

  function targetShooterQuestion(config) {
    const alternatives = config.options.map((text, index) =>
      option(`opt-${index + 1}`, text, false)
    );
    const correctId = `opt-${config.correctIndex + 1}`;

    return question({
      ...config,
      alternatives,
      answer: correctId,
      mechanic: "target-shooter",
      metadata: {
        ...(config.metadata || {}),
        targetShooter: {
          audioText: config.audioText,
          mode: "audio-to-word",
          shape: "balloon",
          correctIds: [correctId],
          difficulty: {
            speed: 0.34,
            objectCount: Math.min(4, alternatives.length),
            spawnIntervalMs: 220,
            requiredCorrect: 1,
            targetSize: 164
          },
          items: alternatives.map((entry) => ({
            id: entry.id,
            label: entry.text,
            display: "text"
          }))
        }
      }
    });
  }

  function matchingQuestion(config) {
    const alternatives = config.options.map((text, index) =>
      option(`opt-${index + 1}`, text, true)
    );
    const correctId = `opt-${config.correctIndex + 1}`;

    return question({
      ...config,
      alternatives,
      answer: correctId,
      mechanic: "matching",
      metadata: {
        ...(config.metadata || {}),
        optionAudioRequired: true,
        matching: {
          mode: "audio-text",
          leftTitle: "Ouça",
          rightTitle: "Escolha",
          leftItems: [
            {
              id: "stimulus",
              spokenText: config.audioText,
              speechLocale: "en-US",
              audioDescription: "Ouvir novamente"
            }
          ],
          rightItems: alternatives.map((entry) => ({
            id: `answer-${entry.id}`,
            label: entry.text,
            spokenText: entry.text,
            speechLocale: "en-US",
            audioDescription: `Ouvir ${entry.text}`
          })),
          pairs: [
            {
              leftId: "stimulus",
              rightId: `answer-${correctId}`
            }
          ],
          behavior: {
            lockLeftOrder: true,
            shuffleRight: true,
            connectionMode: "1x1",
            interactionMode: "smart"
          }
        }
      }
    });
  }

  function bubbleQuestion(config) {
    const alternatives = config.options.map((text, index) =>
      option(`opt-${index + 1}`, text, false)
    );
    const correctId = `opt-${config.correctIndex + 1}`;

    return question({
      ...config,
      alternatives,
      answer: correctId,
      mechanic: "bubble-pop",
      metadata: {
        ...(config.metadata || {}),
        behavior: {
          shuffleBubbles: true
        }
      }
    });
  }

  function slashObject(letter, weight) {
    const value = String(letter).toUpperCase();
    return {
      id: `letter-${value.toLowerCase()}`,
      type: "word",
      label: value,
      value,
      category: value,
      weight: weight || 1
    };
  }

  function wordSlashQuestion() {
    return question({
      id: "EN2-M1-08",
      sourceStatus: "Ajustar",
      skill: SKILLS.alphabet,
      difficulty: "easy",
      readingDemand: "R0-R1",
      statement: "Letter C",
      instruction: "Ouça a letra e corte somente a letra correta.",
      audioText: "C",
      alternatives: [
        option("opt-1", "C", false),
        option("opt-2", "A", false),
        option("opt-3", "B", false),
        option("opt-4", "D", false)
      ],
      answer: "opt-1",
      mechanic: "word-slash",
      correct: "Muito bem! Você reconheceu a letra C pelo som.",
      incorrect: "Ouça a letra C novamente e corte somente a letra C.",
      metadata: {
        title: "LETTER C",
        screenTitle: "LETTER C",
        homologation: {
          status: "pilot",
          policy: "YEAR2_WORD_SLASH_PEDAGOGICAL_HOMOLOGATION",
          readingDemand: "R0-R1",
          rationale: "Reconhecimento auditivo de uma letra isolada; leitura autônoma não é exigida."
        },
        wordSlash: {
          mode: "correct-word",
          audioText: "C",
          goal: 2,
          target: {
            label: "OUÇA",
            value: "C",
            spokenText: "C",
            hideValue: true
          },
          difficulty: {
            speedMinMs: 6500,
            speedMaxMs: 8000,
            maxObjects: 3,
            spawnEveryMs: 1300,
            timeLimitSeconds: 60,
            correctProbability: 0.6
          },
          objects: [
            slashObject("C", 2),
            slashObject("A", 1),
            slashObject("B", 1),
            slashObject("D", 1)
          ]
        }
      }
    });
  }

  const moduleDefinition = {
    id: "english-year-2-module-01-v22-homolog",
    version: VERSION,
    subject: "Língua Inglesa",
    year: 2,
    module: 1,
    title: "Greetings & The Alphabet — v2.2 Homologation",
    description: "Candidata isolada do M01 construída a partir da Revisão Pedagógica Integral v2.2. Prioriza escuta, leitura R0/R1 e seleção mecânica por compatibilidade real.",
    estimatedMinutes: 12,

    source: {
      document: "DUDUQ • Língua Inglesa • Revisão Pedagógica Integral v2.2",
      pages: [14, 15]
    },

    audioPolicy: {
      primary: "recorded-media",
      fallback: "speech-synthesis",
      recordedMediaStatus: "v2.2-rerecord-required-for-changed-items",
      instructionLanguage: "pt-BR",
      contentLanguage: "en-US"
    },

    learningGoals: [
      "Reconhecer cumprimentos e despedidas em contextos variados.",
      "Compreender pequenas trocas sociais por meio da escuta.",
      "Reconhecer nomes de letras em inglês e sequências curtas de soletração.",
      "Usar áudio repetível e apoio visual sem transformar leitura autônoma em barreira."
    ],

    pedagogicalNotes: {
      literacyProfile: "Y2_FOUNDATIONAL_LITERACY — R0 dominante, R1 padrão.",
      sourceFidelity: "IDs, alternativas e respostas seguem a v2.2 nos itens executáveis. Adaptações de interação ficam registradas em metadata.",
      wordSlash: "Somente EN2-M1-08. Não há quota de Word Slash.",
      runtimeIsolation: "Este módulo usa a chave module01v22homolog e não sobrescreve module01.",
      blockedItem: "EN2-M1-12 não entra na execução até ser possível garantir primeira escuta de L-E-O sem revelar letras."
    },

    blockedItems: [
      {
        id: "EN2-M1-12",
        status: "blocked-pending-runtime-capability",
        sourceStatus: "Reescrever",
        difficulty: "medium",
        skill: "Escuta",
        prompt: "Ouça as letras em inglês: “L – E – O”. Qual nome foi soletrado?",
        editorialAlternatives: ["LEO", "LOE", "LEA", "ELO"],
        editorialAnswer: "LEO",
        requiredFormat: "Escuta + letras móveis",
        requiredMediaRule: "Áudio EN obrigatório com pausas naturais; não exibir as letras durante a primeira escuta.",
        intendedMechanic: "drag-drop",
        blocker: "O adapter atual oferece sequência, mas a homologação ainda não comprovou um gate de reveal pós-primeira-escuta sem alterar release imutável."
      }
    ],

    activities: [
      {
        id: "en2-m1-v22-step-01-greetings",
        title: "Listen to Greetings",
        mechanic: "target-shooter",
        skill: SKILLS.greetings,
        questions: [
          targetShooterQuestion({
            id: "EN2-M1-01",
            sourceStatus: "Ajustar",
            skill: SKILLS.greetings,
            difficulty: "easy",
            readingDemand: "R0-R1",
            statement: "Hello",
            instruction: "Ouça a expressão e escolha a opção correspondente.",
            audioText: "Hello",
            options: ["Hi", "Hello", "Good morning", "Good afternoon"],
            correctIndex: 1,
            correct: "Muito bem! Você reconheceu HELLO.",
            incorrect: "Ouça HELLO novamente e tente outra vez."
          }),
          targetShooterQuestion({
            id: "EN2-M1-02",
            sourceStatus: "Ajustar",
            skill: SKILLS.greetings,
            difficulty: "easy",
            readingDemand: "R1",
            statement: "Good morning",
            instruction: "Escute com atenção. Qual expressão foi dita?",
            audioText: "Good morning",
            options: ["Hi", "Hello", "Good morning", "Good afternoon"],
            correctIndex: 2,
            correct: "Muito bem! Você reconheceu GOOD MORNING.",
            incorrect: "Ouça GOOD MORNING novamente e tente outra vez."
          }),
          targetShooterQuestion({
            id: "EN2-M1-03",
            sourceStatus: "Ajustar",
            skill: SKILLS.greetings,
            difficulty: "easy",
            readingDemand: "R1",
            statement: "Good night",
            instruction: "É hora de dormir. Ouça a expressão e escolha o que foi dito.",
            audioText: "Good night",
            options: ["Good morning", "Good night", "See you", "Hello"],
            correctIndex: 1,
            image: {
              enabled: true,
              src: VISUALS.night,
              alt: "Rotina noturna e hora de dormir"
            },
            correct: "Muito bem! GOOD NIGHT combina com a hora de dormir.",
            incorrect: "Ouça GOOD NIGHT novamente e observe o contexto noturno."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-02-farewells",
        title: "Listen & Choose Farewells",
        mechanic: "matching",
        skill: SKILLS.greetings,
        questions: [
          matchingQuestion({
            id: "EN2-M1-04",
            sourceStatus: "Reescrever",
            skill: SKILLS.greetings,
            difficulty: "easy",
            readingDemand: "R0-R1",
            statement: "Bye!",
            instruction: "Ouça a despedida curta e escolha o que foi dito.",
            audioText: "Bye!",
            options: ["Bye!", "Hi!", "Hello!", "Good morning!"],
            correctIndex: 0,
            correct: "Muito bem! Você reconheceu BYE!",
            incorrect: "Ouça BYE! novamente e escolha a expressão ouvida."
          }),
          matchingQuestion({
            id: "EN2-M1-05",
            sourceStatus: "Reescrever",
            skill: SKILLS.greetings,
            difficulty: "easy",
            readingDemand: "R1",
            statement: "See you later!",
            instruction: "Ouça a expressão de despedida e escolha o que foi dito.",
            audioText: "See you later!",
            options: ["Hi!", "See you later!", "Hello!", "Good morning!"],
            correctIndex: 1,
            correct: "Muito bem! Você reconheceu SEE YOU LATER!",
            incorrect: "Ouça SEE YOU LATER! novamente e tente outra vez."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-03-alphabet-pop",
        title: "Listen to the Letters",
        mechanic: "bubble-pop",
        skill: SKILLS.alphabet,
        questions: [
          bubbleQuestion({
            id: "EN2-M1-06",
            sourceStatus: "Ajustar",
            skill: SKILLS.alphabet,
            difficulty: "easy",
            readingDemand: "R0",
            statement: "Letter A",
            instruction: "Ouça o nome da letra em inglês e toque nela.",
            audioText: "A",
            options: ["B", "C", "A", "D"],
            correctIndex: 2,
            correct: "Muito bem! Você encontrou a letra A.",
            incorrect: "Ouça a letra A novamente e tente outra vez."
          }),
          bubbleQuestion({
            id: "EN2-M1-07",
            sourceStatus: "Ajustar",
            skill: SKILLS.alphabet,
            difficulty: "easy",
            readingDemand: "R0",
            statement: "Letter B",
            instruction: "Escute a letra. Qual símbolo corresponde ao som ouvido?",
            audioText: "B",
            options: ["A", "C", "D", "B"],
            correctIndex: 3,
            correct: "Muito bem! Você encontrou a letra B.",
            incorrect: "Ouça a letra B novamente e tente outra vez."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-04-word-slash",
        title: "Listen & Slash the Letter",
        mechanic: "word-slash",
        skill: SKILLS.alphabet,
        questions: [wordSlashQuestion()]
      },

      {
        id: "en2-m1-v22-step-05-more-letters",
        title: "More Letter Listening",
        mechanic: "target-shooter",
        skill: SKILLS.alphabet,
        questions: [
          targetShooterQuestion({
            id: "EN2-M1-09",
            sourceStatus: "Ajustar",
            skill: SKILLS.alphabet,
            difficulty: "easy",
            readingDemand: "R0",
            statement: "Letter M",
            instruction: "Toque na letra cujo nome foi pronunciado em inglês.",
            audioText: "M",
            options: ["A", "M", "B", "C"],
            correctIndex: 1,
            correct: "Muito bem! Você reconheceu a letra M.",
            incorrect: "Ouça a letra M novamente e tente outra vez."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-06-letter-s",
        title: "Listen for S",
        mechanic: "bubble-pop",
        skill: SKILLS.alphabet,
        questions: [
          bubbleQuestion({
            id: "EN2-M1-10",
            sourceStatus: "Ajustar",
            skill: SKILLS.alphabet,
            difficulty: "easy",
            readingDemand: "R0",
            statement: "Letter S",
            instruction: "Ouça com atenção e escolha a letra correta.",
            audioText: "S",
            options: ["A", "B", "S", "C"],
            correctIndex: 2,
            correct: "Muito bem! Você reconheceu a letra S.",
            incorrect: "Ouça a letra S novamente e tente outra vez."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-07-listening-interaction",
        title: "Listen & Understand",
        mechanic: "matching",
        skill: SKILLS.interaction,
        questions: [
          matchingQuestion({
            id: "EN2-M1-11",
            sourceStatus: "Ajustar",
            skill: SKILLS.spelling,
            difficulty: "medium",
            readingDemand: "R1",
            statement: "How do you spell your name?",
            instruction: "Ouça a pergunta. Qual opção mostra a pergunta ouvida?",
            audioText: "How do you spell your name?",
            options: ["What is your name?", "How old are you?", "Where are you from?", "How do you spell your name?"],
            correctIndex: 3,
            correct: "Muito bem! Você reconheceu HOW DO YOU SPELL YOUR NAME?",
            incorrect: "Ouça a pergunta e também as opções antes de tentar novamente."
          }),
          matchingQuestion({
            id: "EN2-M1-13",
            sourceStatus: "Reescrever",
            skill: SKILLS.interaction,
            difficulty: "medium",
            readingDemand: "R1",
            statement: "How are you? — I’m fine, thanks.",
            instruction: "Ouça o diálogo. Qual resposta foi ouvida?",
            audioText: "How are you? I’m fine, thanks.",
            options: ["I’m fine, thanks.", "See you later.", "Good night.", "How do you spell your name?"],
            correctIndex: 0,
            correct: "Muito bem! A resposta ouvida foi I’M FINE, THANKS.",
            incorrect: "Ouça o diálogo e as opções novamente."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-08-hi-response",
        title: "A Short Greeting",
        mechanic: "bubble-pop",
        skill: SKILLS.pragmatic,
        questions: [
          bubbleQuestion({
            id: "EN2-M1-14",
            sourceStatus: "Reescrever",
            skill: SKILLS.pragmatic,
            difficulty: "medium",
            readingDemand: "R0-R1",
            statement: "Mia says: Hi!",
            instruction: "Mia diz “Hi!”. Qual resposta também é um cumprimento curto?",
            audioText: "Hi!",
            options: ["Bye!", "Hi!", "See you later!", "Good night!"],
            correctIndex: 1,
            correct: "Isso! HI! também é um cumprimento curto.",
            incorrect: "Ouça HI! novamente e escolha outro cumprimento."
          })
        ]
      },

      {
        id: "en2-m1-v22-step-09-spelling-bag",
        title: "Listen to B-A-G",
        mechanic: "target-shooter",
        skill: SKILLS.spelling,
        questions: [
          targetShooterQuestion({
            id: "EN2-M1-15",
            sourceStatus: "Reescrever",
            skill: SKILLS.spelling,
            difficulty: "hard",
            readingDemand: "R0-R1",
            statement: "B-A-G",
            instruction: "Ouça as letras em inglês. Qual sequência você ouviu?",
            audioText: "B, A, G",
            options: ["BAG", "BGA", "BAJ", "GAB"],
            correctIndex: 0,
            correct: "Muito bem! A sequência ouvida forma BAG.",
            incorrect: "Ouça B-A-G novamente e compare as sequências."
          })
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.english.year2.module01v22homolog = Object.freeze(moduleDefinition);
})();
