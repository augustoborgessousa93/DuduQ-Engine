/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   Hello! Greetings & Introductions
   Versão 1.4.0 — PRODUÇÃO PEDAGÓGICA PARA ALFABETIZAÇÃO

   FONTES
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - DUDUQ Documento Mestre — Conteúdo & Orquestração v1.0

   PRINCÍPIO
   - Conteúdo primeiro, mecânica depois.
   - Preserva os 12 IDs oficiais EN1-M1-01 a EN1-M1-12.
   - Reduz carga de leitura do 1º ano usando áudio e cenas vetoriais.
   - Usa apenas mecânicas hoje integradas e estáveis no Host.
   - Registra em metadata a mecânica de catálogo ideal quando diferente.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.4.0";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
  window.DUDUQ_CONTENT.english.year1 = window.DUDUQ_CONTENT.english.year1 || {};

  if (window.DUDUQ_CONTENT.english.year1.module01?.version === VERSION) return;

  function skill(description) {
    return Object.freeze({ code: null, description });
  }

  function svgData(svg) {
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  const VISUALS = Object.freeze({
    morning: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#DDF3FF"/><circle cx="76" cy="146" r="43" fill="#FFD34D"/><path d="M0 164 Q70 120 146 165 T320 160 V220 H0Z" fill="#91D38B"/><path d="M0 181 Q80 145 160 185 T320 178 V220 H0Z" fill="#5FB777"/><g stroke="#F8A91B" stroke-width="7" stroke-linecap="round"><path d="M76 88V63"/><path d="M28 110L10 94"/><path d="M124 110l18-16"/></g><path d="M235 58h45c12 0 22 10 22 22s-10 22-22 22h-45c-12 0-22-10-22-22s10-22 22-22z" fill="#fff" opacity=".92"/></svg>`),
    afternoon: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#AEE3FF"/><circle cx="244" cy="62" r="38" fill="#FFD34D"/><path d="M0 166 Q76 128 160 168 T320 158 V220 H0Z" fill="#78C985"/><rect x="52" y="105" width="18" height="72" rx="8" fill="#9D6748"/><circle cx="61" cy="91" r="44" fill="#4DAE68"/><circle cx="92" cy="108" r="32" fill="#5CBD72"/><path d="M205 177h96v43h-96z" fill="#E7C686"/><path d="M206 177l48-35 47 35z" fill="#C96C5C"/></svg>`),
    goodbye: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#FFF3D6"/><rect x="223" y="48" width="66" height="138" rx="8" fill="#A97555"/><rect x="232" y="60" width="48" height="126" fill="#F8E5C7"/><circle cx="118" cy="80" r="31" fill="#F4C9A8"/><path d="M87 78q8-38 34-34 28 3 29 36" fill="#51382F"/><rect x="83" y="112" width="71" height="79" rx="24" fill="#5DB7E8"/><path d="M154 126c35-8 53-24 56-46" fill="none" stroke="#F4C9A8" stroke-width="16" stroke-linecap="round"/><path d="M206 72l10-15M207 75l18-5M205 70l3-19" stroke="#F4C9A8" stroke-width="7" stroke-linecap="round"/><path d="M74 191h102" stroke="#31546D" stroke-width="10" stroke-linecap="round"/></svg>`),
    greeting: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#E7F8F0"/><circle cx="97" cy="78" r="29" fill="#F1C8A6"/><circle cx="221" cy="78" r="29" fill="#E8B98F"/><path d="M70 78q8-35 30-34 25 2 27 35" fill="#584038"/><path d="M194 78q5-31 29-34 25 4 27 36" fill="#3C2D2B"/><rect x="63" y="109" width="68" height="78" rx="23" fill="#74C989"/><rect x="187" y="109" width="68" height="78" rx="23" fill="#F0B65E"/><path d="M132 130c21-13 34-14 55 0" fill="none" stroke="#F1C8A6" stroke-width="14" stroke-linecap="round"/><path d="M188 130c-21-13-34-14-55 0" fill="none" stroke="#E8B98F" stroke-width="14" stroke-linecap="round"/><path d="M142 54h36" stroke="#3996D3" stroke-width="6" stroke-linecap="round"/><circle cx="155" cy="48" r="4" fill="#3996D3"/><circle cx="169" cy="48" r="4" fill="#3996D3"/></svg>`),
    boy: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#E9F6FF"/><circle cx="160" cy="78" r="40" fill="#EEC5A3"/><path d="M120 74q9-45 43-43 34 4 39 45-18-11-39-11-22 0-43 9z" fill="#49362F"/><circle cx="145" cy="79" r="4" fill="#263D4D"/><circle cx="176" cy="79" r="4" fill="#263D4D"/><path d="M149 96q12 10 24 0" fill="none" stroke="#B66B5F" stroke-width="4" stroke-linecap="round"/><path d="M99 207v-56c0-31 25-55 61-55s61 24 61 55v56" fill="#59B784"/><path d="M128 207v-51h64v51" fill="#3C8BC0"/></svg>`),
    girl: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#FFF4E7"/><path d="M111 84q1-56 49-56 49 0 51 58v38h-100z" fill="#5B3D30"/><circle cx="160" cy="80" r="39" fill="#EEC5A3"/><path d="M123 69q8-39 39-38 31 2 38 39-21-10-38-10-21 0-39 9z" fill="#5B3D30"/><circle cx="145" cy="80" r="4" fill="#263D4D"/><circle cx="176" cy="80" r="4" fill="#263D4D"/><path d="M149 96q12 10 24 0" fill="none" stroke="#B66B5F" stroke-width="4" stroke-linecap="round"/><path d="M99 207v-56c0-31 25-55 61-55s61 24 61 55v56" fill="#F0B65E"/><path d="M125 207v-46h70v46" fill="#C56FA7"/></svg>`),
    selfintro: svgData(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" rx="28" fill="#EAF9F4"/><circle cx="125" cy="78" r="36" fill="#EEC5A3"/><path d="M91 76q6-41 36-40 32 2 36 42" fill="#49362F"/><rect x="79" y="112" width="92" height="83" rx="26" fill="#5BB8D9"/><rect x="100" y="127" width="50" height="24" rx="8" fill="#fff"/><text x="125" y="144" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="#24506F">ANA</text><path d="M173 125c28 5 38 20 45 42" fill="none" stroke="#EEC5A3" stroke-width="15" stroke-linecap="round"/><path d="M206 61h78c12 0 22 10 22 22v28c0 12-10 22-22 22h-50l-18 16 4-16h-14c-12 0-22-10-22-22V83c0-12 10-22 22-22z" fill="#fff" stroke="#85C7E7" stroke-width="4"/><circle cx="222" cy="97" r="5" fill="#4C90B8"/><circle cx="245" cy="97" r="5" fill="#4C90B8"/><circle cx="268" cy="97" r="5" fill="#4C90B8"/></svg>`)
  });

  const SKILLS = Object.freeze({
    greetingBasic: skill("Identificar cumprimentos básicos usados no dia a dia."),
    greetingSituation: skill("Relacionar cumprimentos a situações cotidianas."),
    farewell: skill("Identificar expressão de despedida."),
    identifySelf: skill("Identificar-se utilizando a estrutura ‘I’m...’."),
    boyGirl: skill("Compreender e empregar as palavras boy e girl."),
    greetingResponse: skill("Responder a um cumprimento simples."),
    personalPresentation: skill("Identificar apresentação pessoal simples."),
    boyGirlSentence: skill("Empregar a estrutura ‘I’m a boy/girl’."),
    distinguishGreetingFarewell: skill("Distinguir cumprimento e despedida.")
  });

  function enOption(id, text, tone) {
    return {
      id,
      text,
      audio: {
        enabled: true,
        text: text.replace(/\.{3}$/, ""),
        language: "en-US",
        role: "option"
      },
      metadata: tone ? { tone } : {}
    };
  }

  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,
    subject: "Língua Inglesa",
    year: 1,
    module: 1,
    title: "Hello! Greetings & Introductions",
    description:
      "Missão inicial do 1º ano com prioridade para escuta, associação visual e reconhecimento de estruturas muito curtas em inglês.",
    estimatedMinutes: 4,

    learningGoals: [
      "Reconhecer HI, HELLO, GOODBYE, GOOD MORNING e GOOD AFTERNOON em situações simples.",
      "Relacionar cumprimentos a cenas de manhã, tarde, encontro e despedida.",
      "Reconhecer BOY e GIRL com apoio visual e sonoro.",
      "Compreender I’M... como estrutura inicial de apresentação pessoal.",
      "Completar I’M A BOY/GIRL em contexto simples.",
      "Distinguir cumprimento de despedida."
    ],

    pedagogicalNotes: {
      officialSource:
        "Conteúdo derivado dos 12 itens oficiais EN1-M1-01 a EN1-M1-12.",
      literacy:
        "No 1º ano, leitura em inglês não é tratada como pré-requisito. As palavras permanecem visíveis para criar familiaridade, mas áudio, contexto e imagem oferecem caminhos de acesso ao significado.",
      audio:
        "As instruções podem ser faladas em português; estímulos do idioma-alvo são pronunciados em inglês. Cards de Drag & Drop possuem áudio próprio.",
      image:
        "Cenas vetoriais são usadas quando o significado é concreto ou contextual. Não são decorativas: representam manhã, tarde, despedida, encontro, menino, menina e apresentação pessoal.",
      mechanics:
        "Bubble Pop é reservado a reconhecimento/discriminação de alvos curtos. Drag & Drop é usado como associação real áudio/palavra → cena, e não como arraste decorativo.",
      futureMechanics:
        "Matching permanece a preferência de catálogo para várias associações 1×1; Smart Sentence permanece a preferência de catálogo para EN1-M1-10/11. A migração pode ocorrer sem mudar os IDs quando esses adaptadores estiverem integrados ao Host.",
      noInventedCurriculumCode:
        "Nenhum código BNCC é inventado; as habilidades permanecem descritivas."
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
         Reconhecimento auditivo rápido: EN1-M1-01 e EN1-M1-04
         ===================================================== */
      {
        id: "en1-m1-step-01-hello",
        title: "Hello!",
        mechanic: "bubble-pop",
        skill: SKILLS.greetingBasic,
        questions: [
          {
            id: "EN1-M1-01",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingBasic, difficulty: "easy",
            statement: "Hello!",
            instruction: "Ouça a saudação e escolha o que foi dito.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Hello", language: "en-US", role: "instruction" },
            alternatives: [
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } },
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "green" } }
            ],
            answer: { type: "single", value: "hello" },
            feedback: {
              correct: "Muito bem! Você reconheceu HELLO.",
              incorrect: "Ouça novamente. Você também pode tocar nas bolhas para comparar os sons.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "Hello!", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason: "Escuta + reconhecimento de alvo curto entre três opções.",
              sourceMedia: "Áudio EN obrigatório: Hello.",
              tags: ["official", "listening", "greetings", "EN1-M1-01"]
            }
          },
          {
            id: "EN1-M1-04",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.farewell, difficulty: "easy",
            statement: "Goodbye!",
            instruction: "Qual palavra usamos para nos despedir?",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Qual palavra usamos para nos despedir?", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "hello", text: "HELLO", metadata: { tone: "green" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "blue" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } }
            ],
            answer: { type: "single", value: "goodbye" },
            feedback: {
              correct: "Isso! GOODBYE é usado para se despedir.",
              incorrect: "Toque nas opções para ouvi-las e pense no momento de ir embora.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "Goodbye!", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason: "Discriminação lexical simples; a pronúncia das bolhas reduz dependência de leitura.",
              sourceMedia: "Áudio EN recomendado: Goodbye; não antecipado no autoplay.",
              tags: ["official", "farewell", "EN1-M1-04"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 2 — MORNING & AFTERNOON
         Associação palavra/áudio → cena: EN1-M1-02 e EN1-M1-03
         ===================================================== */
      {
        id: "en1-m1-step-02-time-greetings",
        title: "Morning & Afternoon",
        mechanic: "drag-drop",
        skill: SKILLS.greetingSituation,
        questions: [
          {
            id: "EN1-M1-02",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingSituation, difficulty: "easy",
            statement: "Morning",
            instruction: "Ouça e arraste cada expressão para a cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e arraste cada expressão para a cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              enOption("good-afternoon", "GOOD AFTERNOON"),
              enOption("goodbye", "GOODBYE"),
              enOption("good-morning", "GOOD MORNING")
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "good-afternoon", target: "scene-afternoon" },
                { source: "goodbye", target: "scene-goodbye" },
                { source: "good-morning", target: "scene-morning" }
              ]
            },
            feedback: {
              correct: "Muito bem! GOOD MORNING ficou na cena da manhã.",
              incorrect: "Ouça novamente cada card e observe o momento mostrado em cada cena.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "Morning", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching", productionMechanic: "drag-drop",
              mechanicReason: "A habilidade é relacionar saudação e situação. A associação visual reduz leitura e o arraste tem função cognitiva real.",
              sourceCorrectAnswer: "GOOD MORNING",
              sourceMedia: "Imagem recomendada: manhã/sol nascendo.",
              targets: [
                { id: "scene-afternoon", image: { src: VISUALS.afternoon, alt: "Cena do período da tarde" } },
                { id: "scene-goodbye", image: { src: VISUALS.goodbye, alt: "Cena de despedida" } },
                { id: "scene-morning", image: { src: VISUALS.morning, alt: "Cena de manhã com o sol nascendo" } }
              ],
              tags: ["official", "association", "visual", "listening", "EN1-M1-02"]
            }
          },
          {
            id: "EN1-M1-03",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingSituation, difficulty: "easy",
            statement: "Afternoon",
            instruction: "Ouça e arraste cada expressão para a cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e arraste cada expressão para a cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              enOption("good-afternoon", "GOOD AFTERNOON"),
              enOption("good-morning", "GOOD MORNING"),
              enOption("goodbye", "GOODBYE")
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "good-afternoon", target: "scene-afternoon" },
                { source: "good-morning", target: "scene-morning" },
                { source: "goodbye", target: "scene-goodbye" }
              ]
            },
            feedback: {
              correct: "Excelente! GOOD AFTERNOON ficou na cena da tarde.",
              incorrect: "Escute cada expressão novamente e compare manhã, tarde e despedida.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "Afternoon", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching", productionMechanic: "drag-drop",
              mechanicReason: "Associação situação–saudação com cenas concretas e áudio das opções.",
              sourceCorrectAnswer: "GOOD AFTERNOON",
              sourceMedia: "Imagem recomendada: período da tarde.",
              targets: [
                { id: "scene-morning", image: { src: VISUALS.morning, alt: "Cena de manhã com o sol nascendo" } },
                { id: "scene-afternoon", image: { src: VISUALS.afternoon, alt: "Cena do período da tarde" } },
                { id: "scene-goodbye", image: { src: VISUALS.goodbye, alt: "Cena de despedida" } }
              ],
              tags: ["official", "association", "visual", "listening", "EN1-M1-03"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 3 — BOY & GIRL
         Vocabulário concreto com apoio visual: EN1-M1-06 e 07
         ===================================================== */
      {
        id: "en1-m1-step-03-boy-girl",
        title: "Boy & Girl",
        mechanic: "drag-drop",
        skill: SKILLS.boyGirl,
        questions: [
          {
            id: "EN1-M1-06",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirl, difficulty: "easy",
            statement: "Boy & Girl",
            instruction: "Ouça as palavras e arraste cada uma para a figura correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça as palavras e arraste cada uma para a figura correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              enOption("boy", "BOY"),
              enOption("girl", "GIRL"),
              enOption("hello", "HELLO")
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "boy", target: "scene-boy" },
                { source: "girl", target: "scene-girl" },
                { source: "hello", target: "scene-greeting" }
              ]
            },
            feedback: {
              correct: "Muito bem! BOY foi relacionado à figura de menino.",
              incorrect: "Toque nos cards para ouvir e compare as figuras novamente.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "Boy", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching", productionMechanic: "drag-drop",
              mechanicReason: "Vocabulário concreto é melhor demonstrado por palavra/áudio → figura do que por tradução escrita.",
              sourceCorrectAnswer: "BOY",
              sourceMedia: "Imagem recomendada: menino.",
              targets: [
                { id: "scene-boy", image: { src: VISUALS.boy, alt: "Ilustração de menino" } },
                { id: "scene-girl", image: { src: VISUALS.girl, alt: "Ilustração de menina" } },
                { id: "scene-greeting", image: { src: VISUALS.greeting, alt: "Duas crianças se cumprimentando" } }
              ],
              tags: ["official", "visual-vocabulary", "listening", "EN1-M1-06"]
            }
          },
          {
            id: "EN1-M1-07",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirl, difficulty: "easy",
            statement: "Boy & Girl",
            instruction: "Ouça as palavras e arraste cada uma para a figura correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça as palavras e arraste cada uma para a figura correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              enOption("boy", "BOY"),
              enOption("girl", "GIRL"),
              enOption("goodbye", "GOODBYE")
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "boy", target: "scene-boy" },
                { source: "girl", target: "scene-girl" },
                { source: "goodbye", target: "scene-goodbye" }
              ]
            },
            feedback: {
              correct: "Muito bem! GIRL foi relacionado à figura de menina.",
              incorrect: "Ouça novamente e use as figuras como pista de significado.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "Girl", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "matching", productionMechanic: "drag-drop",
              mechanicReason: "Associação visual/sonora evita exigir leitura ou tradução como pré-requisito.",
              sourceCorrectAnswer: "GIRL",
              sourceMedia: "Imagem recomendada: menina.",
              targets: [
                { id: "scene-girl", image: { src: VISUALS.girl, alt: "Ilustração de menina" } },
                { id: "scene-boy", image: { src: VISUALS.boy, alt: "Ilustração de menino" } },
                { id: "scene-goodbye", image: { src: VISUALS.goodbye, alt: "Cena de despedida" } }
              ],
              tags: ["official", "visual-vocabulary", "listening", "EN1-M1-07"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 4 — I'M...
         Reconhecimento da estrutura e compreensão oral: 05 e 09
         ===================================================== */
      {
        id: "en1-m1-step-04-im",
        title: "I'm...",
        mechanic: "bubble-pop",
        skill: SKILLS.identifySelf,
        questions: [
          {
            id: "EN1-M1-05",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.identifySelf, difficulty: "easy",
            statement: "I'm...",
            instruction: "Qual estrutura pode ser usada para dizer o próprio nome?",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Qual estrutura pode ser usada para dizer o próprio nome?", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "pink" } },
              { id: "good-afternoon", text: "GOOD AFTERNOON", metadata: { tone: "green" } },
              { id: "im", text: "I'M...", metadata: { tone: "blue" } }
            ],
            answer: { type: "single", value: "im" },
            feedback: {
              correct: "Certo! I'M... pode iniciar uma apresentação com o próprio nome.",
              incorrect: "Toque nas opções para ouvi-las e tente novamente.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "I'm...", sourceDifficulty: "Fácil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason: "Escolha direta entre estruturas curtas com pronúncia das opções.",
              sourceMedia: "Sem mídia obrigatória.",
              tags: ["official", "introductions", "EN1-M1-05"]
            }
          },
          {
            id: "EN1-M1-09",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.personalPresentation, difficulty: "medium",
            statement: "I'm Ana.",
            instruction: "Ouça as frases e arraste cada áudio para a cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça as frases e arraste cada áudio para a cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "im-ana", text: "I'M ANA.", audio: { enabled: true, text: "I'm Ana.", language: "en-US", role: "option" } },
              { id: "goodbye", text: "GOODBYE", audio: { enabled: true, text: "Goodbye", language: "en-US", role: "option" } },
              { id: "good-afternoon", text: "GOOD AFTERNOON", audio: { enabled: true, text: "Good afternoon", language: "en-US", role: "option" } }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "im-ana", target: "scene-selfintro" },
                { source: "goodbye", target: "scene-goodbye" },
                { source: "good-afternoon", target: "scene-afternoon" }
              ]
            },
            feedback: {
              correct: "Muito bem! I'M ANA. foi ligado à cena de apresentação pessoal.",
              incorrect: "Ouça novamente cada card. As cenas mostram apresentação, despedida e tarde.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "I'm Ana.", sourceDifficulty: "Média",
              preferredCatalogMechanic: "matching", productionMechanic: "drag-drop",
              mechanicReason: "A habilidade é compreender o significado de uma fala. Áudio → cena elimina alternativas longas em português.",
              sourceCorrectAnswer: "Dizendo o próprio nome",
              sourceMedia: "Áudio EN obrigatório: I'm Ana.",
              targets: [
                { id: "scene-selfintro", image: { src: VISUALS.selfintro, alt: "Criança se apresentando pelo próprio nome" } },
                { id: "scene-goodbye", image: { src: VISUALS.goodbye, alt: "Cena de despedida" } },
                { id: "scene-afternoon", image: { src: VISUALS.afternoon, alt: "Cena do período da tarde" } }
              ],
              sourceAlternatives: ["Dizendo o próprio nome", "Despedindo-se", "Dizendo boa tarde"],
              tags: ["official", "oral-comprehension", "visual", "EN1-M1-09"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 5 — I'M A...
         Completar estrutura curta: EN1-M1-10 e EN1-M1-11
         ===================================================== */
      {
        id: "en1-m1-step-05-im-a",
        title: "I'm a...",
        mechanic: "bubble-pop",
        skill: SKILLS.boyGirlSentence,
        questions: [
          {
            id: "EN1-M1-10",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirlSentence, difficulty: "medium",
            statement: "I'm a ___.",
            instruction: "👦 Complete: I'M A ___.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Complete I'm a blank para um menino.", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "girl", text: "GIRL", metadata: { tone: "pink" } },
              { id: "boy", text: "BOY", metadata: { tone: "blue" } },
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "green" } }
            ],
            answer: { type: "single", value: "boy" },
            feedback: {
              correct: "Perfeito! I'M A BOY.",
              incorrect: "Toque nas opções para ouvir e complete a frase da figura.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "I'm a boy.", sourceDifficulty: "Média",
              preferredCatalogMechanic: "smart-sentence", productionMechanic: "bubble-pop",
              mechanicReason: "Smart Sentence é o encaixe ideal; o fallback mantém uma única lacuna e opções curtas, com apoio de áudio.",
              sourceMedia: "Imagem recomendada: menino.",
              tags: ["official", "sentence-completion", "EN1-M1-10"]
            }
          },
          {
            id: "EN1-M1-11",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirlSentence, difficulty: "medium",
            statement: "I'm a ___.",
            instruction: "👧 Complete: I'M A ___.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Complete I'm a blank para uma menina.", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "boy", text: "BOY", metadata: { tone: "green" } },
              { id: "hello", text: "HELLO", metadata: { tone: "blue" } },
              { id: "girl", text: "GIRL", metadata: { tone: "pink" } }
            ],
            answer: { type: "single", value: "girl" },
            feedback: {
              correct: "Perfeito! I'M A GIRL.",
              incorrect: "Ouça as opções e complete a frase da figura.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "I'm a girl.", sourceDifficulty: "Média",
              preferredCatalogMechanic: "smart-sentence", productionMechanic: "bubble-pop",
              mechanicReason: "Uma lacuna curta, apoio visual e pronúncia das opções reduzem a demanda de leitura enquanto Smart Sentence não está integrado.",
              sourceMedia: "Imagem recomendada: menina.",
              tags: ["official", "sentence-completion", "EN1-M1-11"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 6 — GREETING CHALLENGE
         Consolidação: EN1-M1-08 e EN1-M1-12
         ===================================================== */
      {
        id: "en1-m1-step-06-challenge",
        title: "Greeting Challenge",
        mechanic: "bubble-pop",
        skill: SKILLS.greetingResponse,
        questions: [
          {
            id: "EN1-M1-08",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingResponse, difficulty: "medium",
            statement: "Hello!",
            instruction: "Ouça HELLO. Qual opção também é um cumprimento?",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Hello", language: "en-US", role: "instruction" },
            alternatives: [
              { id: "goodbye", text: "GOODBYE!", metadata: { tone: "pink" } },
              { id: "im-boy", text: "I'M A BOY.", metadata: { tone: "green" } },
              { id: "hi", text: "HI!", metadata: { tone: "blue" } }
            ],
            answer: { type: "single", value: "hi" },
            feedback: {
              correct: "Isso! HI! também é um cumprimento.",
              incorrect: "Ouça as opções e procure outra forma de cumprimentar alguém.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "Hello → Hi", sourceDifficulty: "Média",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason: "Resposta rápida a um estímulo oral curto.",
              sourceMedia: "Áudio EN recomendado: Hello!",
              tags: ["official", "greeting-response", "EN1-M1-08"]
            }
          },
          {
            id: "EN1-M1-12",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.distinguishGreetingFarewell, difficulty: "hard",
            statement: "Greeting or Goodbye?",
            instruction: "Qual opção é uma despedida?",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Qual opção é uma despedida?", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "goodbye", text: "GOODBYE", metadata: { tone: "blue" } },
              { id: "hello", text: "HELLO", metadata: { tone: "green" } },
              { id: "good-morning", text: "GOOD MORNING", metadata: { tone: "yellow" } }
            ],
            answer: { type: "single", value: "goodbye" },
            feedback: {
              correct: "Muito bem! GOODBYE é despedida; HELLO e GOOD MORNING são cumprimentos.",
              incorrect: "Toque nas palavras para ouvi-las e tente novamente.",
              language: "pt-BR"
            },
            delivery: { mechanic: "bubble-pop", allowImage: false, allowAudio: true },
            metadata: {
              title: "Greeting or Goodbye?", sourceDifficulty: "Difícil",
              preferredCatalogMechanic: "bubble-pop",
              mechanicReason: "Consolidação por discriminação de três expressões já trabalhadas.",
              sourceMedia: "Sem mídia obrigatória.",
              tags: ["official", "review", "farewell", "EN1-M1-12"]
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.english.year1.module01 = Object.freeze(moduleDefinition);
})();

