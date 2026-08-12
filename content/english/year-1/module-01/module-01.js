/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   Hello! Greetings & Introductions
   Versão 1.3.0 — CONTEÚDO OFICIAL
 
   FONTES PEDAGÓGICAS
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - DUDUQ Documento Mestre — Conteúdo & Orquestração v1.0
 
   PRINCÍPIOS DESTA VERSÃO
   - Conteúdo primeiro, mecânica depois.
   - Preserva os 12 IDs oficiais EN1-M1-01 a EN1-M1-12.
   - Não inventa códigos BNCC.
   - Mantém as alternativas e respostas do banco oficial.
   - Reordena apenas a apresentação pedagógica para criar progressão.
   - Não altera Core, World Fusion, Host, Intro, Transition ou Completion.
 
   ORQUESTRAÇÃO ATUAL
   - O repositório possui Bubble Pop e Drag & Drop registrados no Host.
   - Os 12 itens oficiais deste módulo são de resposta única.
   - Bubble Pop é a mecânica registrada que preserva esse formato sem
     deformar os itens em arrastes artificiais.
   - Matching e Smart Sentence ficam registrados em metadata como
     mecânicas preferidas de catálogo para itens específicos, para futura
     migração quando seus adaptadores estiverem prontos para produção.
   ========================================================= */
 
(function () {
  "use strict";
 
  const VERSION = "1.3.0";
 
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
 
  function skill(description) {
    return Object.freeze({
      code: null,
      description
    });
  }
 
  const SKILLS = Object.freeze({
    greetingBasic: skill(
      "Identificar cumprimentos básicos usados no dia a dia."
    ),
 
    greetingSituation: skill(
      "Relacionar cumprimentos a situações cotidianas."
    ),
 
    farewell: skill(
      "Identificar expressão de despedida."
    ),
 
    identifySelf: skill(
      "Identificar-se utilizando a estrutura ‘I’m...’."
    ),
 
    boyGirl: skill(
      "Compreender e empregar as palavras boy e girl."
    ),
 
    greetingResponse: skill(
      "Responder a um cumprimento simples."
    ),
 
    personalPresentation: skill(
      "Identificar apresentação pessoal simples."
    ),
 
    boyGirlSentence: skill(
      "Empregar a estrutura ‘I’m a boy/girl’."
    ),
 
    distinguishGreetingFarewell: skill(
      "Distinguir cumprimento e despedida."
    )
  });
 
  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,
 
    subject: "Língua Inglesa",
    year: 1,
    module: 1,
 
    title: "Hello! Greetings & Introductions",
 
    description:
      "Missão inicial do 1º ano para reconhecer e usar cumprimentos básicos, compreender a estrutura I’M... e identificar BOY/GIRL com baixa carga de leitura e forte apoio oral.",
 
    estimatedMinutes: 4,
 
    learningGoals: [
      "Reconhecer HI, HELLO, GOODBYE, GOOD MORNING e GOOD AFTERNOON em situações simples.",
      "Identificar I’M... como estrutura inicial de apresentação pessoal.",
      "Reconhecer e empregar BOY e GIRL em estruturas muito curtas.",
      "Responder a HELLO com outro cumprimento adequado.",
      "Distinguir cumprimento de despedida."
    ],
 
    pedagogicalNotes: {
      officialSource:
        "Módulo construído a partir dos 12 itens oficiais EN1-M1-01 a EN1-M1-12 do banco de conteúdo de Língua Inglesa.",
 
      ids:
        "Os IDs oficiais identificam as questões e são preservados independentemente da mecânica escolhida.",
 
      noInventedCurriculumCode:
        "Nenhum código BNCC é criado. As habilidades permanecem em linguagem descritiva, conforme as fontes editoriais.",
 
      yearProfile:
        "Para o 1º ano, priorizamos alta objetividade, pouca leitura, instruções curtas em português e apoio sonoro quando útil.",
 
      mechanics:
        "A melhor mecânica de catálogo é registrada por item em metadata. No build atual, Bubble Pop é usado nos 12 itens porque é a mecânica de resposta única registrada no Host; Drag & Drop exigiria converter questões de escolha em pairs/sequence, o que deformaria o item.",
 
      futureMechanics:
        "Quando Matching e Smart Sentence estiverem registrados em produção, EN1-M1-02/03/06/07 poderão migrar para Matching e EN1-M1-10/11 para Smart Sentence sem alterar seus IDs.",
 
      audioSafety:
        "Áudio em inglês é usado quando constitui o estímulo do item. Quando pronunciar a resposta antes da interação anteciparia o gabarito, o autoplay usa somente instrução em português. A pronúncia do alvo pode ocorrer após a seleção.",
 
      sequence:
        "Os itens foram organizados em cinco etapas: entrada por cumprimentos, contexto manhã/tarde, BOY/GIRL, apresentação com I’M..., e consolidação. O conteúdo e o gabarito de cada ID permanecem inalterados."
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
         ETAPA 1 — HELLO!
         EN1-M1-01 e EN1-M1-04
         ===================================================== */
      {
        id: "en1-m1-step-01-hello",
        title: "Hello!",
        mechanic: "bubble-pop",
        skill: SKILLS.greetingBasic,
 
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
              "Ouça a saudação e escolha o que foi dito.",
 
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
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } },
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "green" } }
            ],
 
            answer: {
              type: "single",
              value: "hello"
            },
 
            feedback: {
              correct:
                "Muito bem! Você reconheceu HELLO.",
              incorrect:
                "Ouça novamente e compare com as palavras nas bolhas.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Hello!",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Reconhecimento auditivo rápido entre três alvos curtos.",
              sourceMedia:
                "Áudio EN obrigatório: Hello.",
              tags: ["official", "greetings", "listening", "EN1-M1-01"]
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
              "Qual palavra usamos para nos despedir?",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            /*
             * A fonte recomenda áudio de GOODBYE. Como o áudio antes da
             * escolha revelaria o gabarito, o autoplay lê somente a pergunta
             * em português. A bolha selecionada continua pronunciando o alvo.
             */
            audio: {
              enabled: true,
              text: "Qual palavra usamos para nos despedir?",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "hello", text: "HELLO", metadata: { tone: "green" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "blue" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } }
            ],
 
            answer: {
              type: "single",
              value: "goodbye"
            },
 
            feedback: {
              correct:
                "Isso! GOODBYE é usado para se despedir.",
              incorrect:
                "Pense no momento em que alguém vai embora e tente novamente.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Goodbye!",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Discriminação lexical direta entre cumprimento e despedida.",
              sourceMedia:
                "Áudio EN recomendado: Goodbye. Não é usado no autoplay para não antecipar a resposta.",
              tags: ["official", "greetings", "farewell", "EN1-M1-04"]
            }
          }
        ]
      },
 
      /* =====================================================
         ETAPA 2 — MORNING & AFTERNOON
         EN1-M1-02 e EN1-M1-03
         ===================================================== */
      {
        id: "en1-m1-step-02-time-greetings",
        title: "Morning & Afternoon",
        mechanic: "bubble-pop",
        skill: SKILLS.greetingSituation,
 
        questions: [
          {
            id: "EN1-M1-02",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingSituation,
            difficulty: "easy",
 
            statement: "Morning",
            instruction:
              "É de manhã. Qual saudação combina com esse momento?",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "É de manhã. Qual saudação combina com esse momento?",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "good-afternoon", text: "GOOD AFTERNOON", metadata: { tone: "purple" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "blue" } }
            ],
 
            answer: {
              type: "single",
              value: "good-morning"
            },
 
            feedback: {
              correct:
                "Muito bem! GOOD MORNING combina com o período da manhã.",
              incorrect:
                "Observe o momento do dia e compare as saudações.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Morning",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "No catálogo completo, Matching cena-palavra é preferível. No build atual, Bubble Pop preserva a escolha única sem converter o item em arraste artificial.",
              sourceMedia:
                "Imagem recomendada: manhã/sol nascendo.",
              futureImageDescription:
                "Cena simples de manhã com sol nascendo; sem texto que entregue a resposta.",
              tags: ["official", "greetings", "morning", "EN1-M1-02"]
            }
          },
 
          {
            id: "EN1-M1-03",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingSituation,
            difficulty: "easy",
 
            statement: "Afternoon",
            instruction:
              "É de tarde. Qual saudação combina com esse momento?",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "É de tarde. Qual saudação combina com esse momento?",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "good-afternoon", text: "GOOD AFTERNOON", metadata: { tone: "orange" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "green" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "blue" } }
            ],
 
            answer: {
              type: "single",
              value: "good-afternoon"
            },
 
            feedback: {
              correct:
                "Excelente! GOOD AFTERNOON combina com o período da tarde.",
              incorrect:
                "Pense no período da tarde e tente outra vez.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Afternoon",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "No catálogo completo, Matching cena-palavra é preferível. Bubble Pop é o fallback registrado que mantém a escolha simples.",
              sourceMedia:
                "Imagem recomendada: período da tarde.",
              futureImageDescription:
                "Cena clara de tarde, com luz diurna; sem texto que entregue a resposta.",
              tags: ["official", "greetings", "afternoon", "EN1-M1-03"]
            }
          }
        ]
      },
 
      /* =====================================================
         ETAPA 3 — BOY & GIRL
         EN1-M1-06 e EN1-M1-07
         ===================================================== */
      {
        id: "en1-m1-step-03-boy-girl",
        title: "Boy & Girl",
        mechanic: "bubble-pop",
        skill: SKILLS.boyGirl,
 
        questions: [
          {
            id: "EN1-M1-06",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirl,
            difficulty: "easy",
 
            statement: "Boy & Girl",
            instruction:
              "Selecione a palavra em inglês correspondente a menino.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Selecione a palavra em inglês correspondente a menino.",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "boy", text: "BOY", metadata: { tone: "blue" } },
              { id: "girl", text: "GIRL", metadata: { tone: "pink" } },
              { id: "hello", text: "HELLO", metadata: { tone: "green" } }
            ],
 
            answer: {
              type: "single",
              value: "boy"
            },
 
            feedback: {
              correct:
                "Muito bem! BOY corresponde a menino.",
              incorrect:
                "Compare as palavras e tente novamente.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Boy",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "Matching palavra-imagem seria a preferência de catálogo por ser vocabulário concreto. Bubble Pop preserva o item oficial de escolha única no build atual.",
              sourceMedia:
                "Imagem recomendada: menino.",
              futureImageDescription:
                "Ilustração simples de uma criança menino, sem estereótipos visuais desnecessários.",
              tags: ["official", "identity", "boy", "EN1-M1-06"]
            }
          },
 
          {
            id: "EN1-M1-07",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirl,
            difficulty: "easy",
 
            statement: "Boy & Girl",
            instruction:
              "Selecione a palavra em inglês correspondente a menina.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Selecione a palavra em inglês correspondente a menina.",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "boy", text: "BOY", metadata: { tone: "green" } },
              { id: "girl", text: "GIRL", metadata: { tone: "blue" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } }
            ],
 
            answer: {
              type: "single",
              value: "girl"
            },
 
            feedback: {
              correct:
                "Muito bem! GIRL corresponde a menina.",
              incorrect:
                "Observe as palavras e tente outra vez.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Girl",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "Matching palavra-imagem seria a preferência de catálogo. Bubble Pop é o fallback fiel ao formato atual do item.",
              sourceMedia:
                "Imagem recomendada: menina.",
              futureImageDescription:
                "Ilustração simples de uma criança menina, sem estereótipos visuais desnecessários.",
              tags: ["official", "identity", "girl", "EN1-M1-07"]
            }
          }
        ]
      },
 
      /* =====================================================
         ETAPA 4 — I'M...
         EN1-M1-05, EN1-M1-09, EN1-M1-10 e EN1-M1-11
         ===================================================== */
      {
        id: "en1-m1-step-04-im",
        title: "I'm...",
        mechanic: "bubble-pop",
        skill: SKILLS.identifySelf,
 
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
              "Qual estrutura pode ser usada para dizer o próprio nome?",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Qual estrutura pode ser usada para dizer o próprio nome?",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } },
              { id: "good-afternoon", text: "GOOD AFTERNOON", metadata: { tone: "green" } },
              { id: "im", text: "I'M...", metadata: { tone: "blue" } }
            ],
 
            answer: {
              type: "single",
              value: "im"
            },
 
            feedback: {
              correct:
                "Certo! I'M... pode iniciar uma apresentação com o próprio nome.",
              incorrect:
                "Pense em como alguém começa a dizer o próprio nome em inglês.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "I'm...",
              sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Escolha direta entre três estruturas curtas; não é necessário construir a frase neste item.",
              sourceMedia:
                "Sem mídia obrigatória.",
              tags: ["official", "introductions", "im", "EN1-M1-05"]
            }
          },
 
          {
            id: "EN1-M1-09",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.personalPresentation,
            difficulty: "medium",
 
            statement: "I'm Ana.",
            instruction:
              "Ouça e escolha o que a pessoa está fazendo.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "I'm Ana.",
              language: "en-US",
              role: "instruction"
            },
 
            alternatives: [
              { id: "saying-name", text: "DIZENDO O PRÓPRIO NOME", metadata: { tone: "blue" } },
              { id: "saying-goodbye", text: "DESPEDINDO-SE", metadata: { tone: "pink" } },
              { id: "saying-afternoon", text: "DIZENDO BOA TARDE", metadata: { tone: "green" } }
            ],
 
            answer: {
              type: "single",
              value: "saying-name"
            },
 
            feedback: {
              correct:
                "Muito bem! I'M ANA. apresenta o próprio nome.",
              incorrect:
                "Ouça novamente. A pessoa está se apresentando, despedindo-se ou dizendo boa tarde?",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "I'm Ana.",
              sourceDifficulty: "Média",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Compreensão oral com três significados possíveis; a decisão é categórica e não exige construção de frase.",
              sourceMedia:
                "Áudio EN obrigatório: I'm Ana.",
              tags: ["official", "introductions", "listening", "EN1-M1-09"]
            }
          },
 
          {
            id: "EN1-M1-10",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.boyGirlSentence,
            difficulty: "medium",
 
            statement: "I'm a ___.",
            instruction:
              "Complete I'M A ___. para um menino.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Complete I'm a blank para um menino.",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "girl", text: "GIRL", metadata: { tone: "pink" } },
              { id: "boy", text: "BOY", metadata: { tone: "blue" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "green" } }
            ],
 
            answer: {
              type: "single",
              value: "boy"
            },
 
            feedback: {
              correct:
                "Perfeito! I'M A BOY. é a frase completa para um menino.",
              incorrect:
                "Observe a estrutura I'M A ___. e escolha a palavra adequada.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "I'm a boy.",
              sourceDifficulty: "Média",
              preferredCatalogMechanic: "smart-sentence",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "Smart Sentence é a preferência de catálogo para completar estrutura. Enquanto o adaptador não está em produção, Bubble Pop mantém as três alternativas oficiais e o gabarito.",
              sourceMedia:
                "Imagem recomendada: menino.",
              futureImageDescription:
                "Ilustração simples de um menino como apoio contextual, sem texto.",
              tags: ["official", "introductions", "boy", "EN1-M1-10"]
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
              "Complete I'M A ___. para uma menina.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Complete I'm a blank para uma menina.",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "boy", text: "BOY", metadata: { tone: "green" } },
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } },
              { id: "girl", text: "GIRL", metadata: { tone: "pink" } }
            ],
 
            answer: {
              type: "single",
              value: "girl"
            },
 
            feedback: {
              correct:
                "Perfeito! I'M A GIRL. é a frase completa para uma menina.",
              incorrect:
                "Observe a estrutura I'M A ___. e tente novamente.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "I'm a girl.",
              sourceDifficulty: "Média",
              preferredCatalogMechanic: "smart-sentence",
              productionMechanic: "bubble-pop",
              mechanicReason:
                "Smart Sentence é a preferência de catálogo para completar estrutura. Bubble Pop preserva as alternativas oficiais até a mecânica estar registrada.",
              sourceMedia:
                "Imagem recomendada: menina.",
              futureImageDescription:
                "Ilustração simples de uma menina como apoio contextual, sem texto.",
              tags: ["official", "introductions", "girl", "EN1-M1-11"]
            }
          }
        ]
      },
 
      /* =====================================================
         ETAPA 5 — GREETING CHALLENGE
         EN1-M1-08 e EN1-M1-12
         ===================================================== */
      {
        id: "en1-m1-step-05-challenge",
        title: "Greeting Challenge",
        mechanic: "bubble-pop",
        skill: SKILLS.distinguishGreetingFarewell,
 
        questions: [
          {
            id: "EN1-M1-08",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.greetingResponse,
            difficulty: "medium",
 
            statement: "Hello!",
            instruction:
              "Ouça e escolha uma resposta que também seja um cumprimento.",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Hello!",
              language: "en-US",
              role: "instruction"
            },
 
            alternatives: [
              { id: "goodbye", text: "GOODBYE!", metadata: { tone: "pink" } },
              { id: "im-a-boy", text: "I'M A BOY.", metadata: { tone: "green" } },
              { id: "hi", text: "HI!", metadata: { tone: "blue" } }
            ],
 
            answer: {
              type: "single",
              value: "hi"
            },
 
            feedback: {
              correct:
                "Muito bem! HI! também é um cumprimento.",
              incorrect:
                "Ouça HELLO! novamente e escolha outra forma de cumprimentar.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Hello!",
              sourceDifficulty: "Média",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Resposta rápida a estímulo oral curto, com três alternativas inequívocas.",
              sourceMedia:
                "Áudio EN recomendado: Hello!",
              tags: ["official", "greetings", "response", "EN1-M1-08"]
            }
          },
 
          {
            id: "EN1-M1-12",
            subject: "Língua Inglesa",
            year: 1,
            module: 1,
            skill: SKILLS.distinguishGreetingFarewell,
            difficulty: "hard",
 
            statement: "Final Challenge",
            instruction:
              "Qual alternativa é uma despedida, e não um cumprimento?",
 
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
 
            audio: {
              enabled: true,
              text: "Qual alternativa é uma despedida, e não um cumprimento?",
              language: "pt-BR",
              role: "instruction"
            },
 
            alternatives: [
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "blue" } },
              { id: "hello", text: "HELLO", metadata: { tone: "green" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } }
            ],
 
            answer: {
              type: "single",
              value: "goodbye"
            },
 
            feedback: {
              correct:
                "Missão concluída! GOODBYE é despedida; HELLO e GOOD MORNING são cumprimentos.",
              incorrect:
                "Compare o uso das três expressões e tente mais uma vez.",
              language: "pt-BR"
            },
 
            delivery: {
              mechanic: "bubble-pop",
              preferred: ["bubble-pop"],
              allowImage: false,
              allowAudio: true
            },
 
            metadata: {
              title: "Final Challenge",
              sourceDifficulty: "Difícil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason:
                "Discriminação final entre três expressões curtas já trabalhadas no módulo.",
              sourceMedia:
                "Sem mídia obrigatória.",
              tags: ["official", "greetings", "review", "EN1-M1-12"]
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
