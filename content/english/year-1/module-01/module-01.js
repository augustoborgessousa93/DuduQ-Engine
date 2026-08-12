/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   Hello! Greetings & Introductions
   Versão 1.5.0 — FINAL PEDAGÓGICO PARA ALFABETIZAÇÃO

   FONTES EDITORIAIS
   - DUDUQ Conteúdo Oficial — Língua Inglesa v1.0
   - DUDUQ Documento Mestre — Conteúdo & Orquestração v1.0

   REGRAS DESTA VERSÃO
   - Conteúdo primeiro, mecânica depois.
   - Preserva os 12 IDs oficiais EN1-M1-01 a EN1-M1-12.
   - Não usa Bubble Pop no 1º ano.
   - Leitura em inglês NÃO é pré-requisito para jogar.
   - Áudio e imagem assumem papel pedagógico central.
   - Target Shooter usa alvos grandes, lentos e sem cronômetro.
   - Matching trabalha relações 1×1 realmente significativas.
   - Smart Sentence usa uma única lacuna e duas opções no 1º ano.
   - Memory Quest aparece apenas na consolidação final.
   - Nenhum código BNCC é inventado.
   ========================================================= */

(function () {
  "use strict";

  const VERSION = "1.5.0";

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

  function sourceOption(id, text) {
    return { id, text };
  }

  const moduleDefinition = {
    id: "english-year-1-module-01",
    version: VERSION,
    subject: "Língua Inglesa",
    year: 1,
    module: 1,
    title: "Hello! Greetings & Introductions",
    description:
      "Missão inicial de Língua Inglesa do 1º ano, organizada para crianças em processo de alfabetização, com prioridade para escuta, imagens e associações significativas.",
    estimatedMinutes: 5,

    learningGoals: [
      "Reconhecer HI, HELLO, GOODBYE, GOOD MORNING e GOOD AFTERNOON em situações simples.",
      "Relacionar cumprimentos a cenas de encontro, despedida, manhã e tarde.",
      "Reconhecer BOY e GIRL com apoio visual e sonoro.",
      "Compreender I’M... como estrutura inicial de apresentação pessoal.",
      "Completar I’M A BOY/GIRL em uma estrutura curta e contextualizada.",
      "Revisar cumprimentos por associação entre áudio e imagem."
    ],

    pedagogicalNotes: {
      officialSource:
        "Módulo construído a partir dos 12 itens oficiais EN1-M1-01 a EN1-M1-12.",
      literacy:
        "No 1º ano, a leitura de palavras em inglês não é tratada como pré-requisito. O texto permanece como exposição à forma escrita, mas áudio e imagem oferecem o caminho principal de compreensão.",
      bubblePopPolicy:
        "Bubble Pop não é utilizado neste módulo por depender excessivamente do reconhecimento visual da palavra escrita para esta faixa de alfabetização.",
      targetShooterPolicy:
        "Target Shooter é usado somente em seleção auditivo-visual, com alvos grandes, velocidade reduzida e sem cronômetro.",
      matchingPolicy:
        "Matching é priorizado quando a habilidade pede associação 1×1 entre som, situação, imagem e expressão.",
      smartSentencePolicy:
        "Smart Sentence usa uma única lacuna e apenas BOY/GIRL como opções visíveis. As alternativas editoriais originais permanecem registradas em metadata para rastreabilidade; a redução visual é uma decisão pedagógica explícita para o 1º ano.",
      memoryQuestPolicy:
        "Memory Quest aparece apenas ao final, como revisão de repertório já apresentado, nunca como primeira exposição.",
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
         ETAPA 1 — LISTEN & CHOOSE — TARGET SHOOTER
         EN1-M1-01 / EN1-M1-03 / EN1-M1-04
         O aluno OUVE e acerta uma CENA, não precisa ler.
         ===================================================== */
      {
        id: "en1-m1-step-01-listen-choose",
        title: "Listen & Choose",
        mechanic: "target-shooter",
        skill: SKILLS.greetingBasic,
        questions: [
          {
            id: "EN1-M1-01",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingBasic, difficulty: "easy",
            statement: "Hello!",
            instruction: "Ouça e acerte a cena que combina com a saudação.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Hello", language: "en-US", role: "instruction" },
            alternatives: [
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: { type: "single", value: "hello" },
            feedback: {
              correct: "Muito bem! HELLO é uma saudação de encontro.",
              incorrect: "Ouça HELLO novamente e observe as cenas.",
              language: "pt-BR"
            },
            delivery: { mechanic: "target-shooter", allowImage: true, allowAudio: true },
            metadata: {
              title: "Hello!", screenTitle: "Hello!", sourceDifficulty: "Fácil",
              sourceMedia: "Áudio EN obrigatório: Hello.",
              sourceCorrectAnswer: "HELLO",
              presentationDecision: "As alternativas oficiais permanecem no dado canônico; a resposta visual usa cenas para não exigir leitura em inglês.",
              targetShooter: {
                audioText: "Hello",
                mode: "audio-to-image",
                shape: "balloon",
                correctIds: ["scene-greeting"],
                difficulty: { speed: 0.42, objectCount: 3, spawnIntervalMs: 190, requiredCorrect: 1, targetSize: 150 },
                items: [
                  { id: "scene-greeting", label: "", image: VISUALS.greeting, display: "image" },
                  { id: "scene-goodbye", label: "", image: VISUALS.goodbye, display: "image" },
                  { id: "scene-afternoon", label: "", image: VISUALS.afternoon, display: "image" }
                ]
              },
              tags: ["official", "listening", "visual", "EN1-M1-01"]
            }
          },
          {
            id: "EN1-M1-03",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingSituation, difficulty: "easy",
            statement: "Good afternoon",
            instruction: "Ouça e acerte a cena do período correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Good afternoon", language: "en-US", role: "instruction" },
            alternatives: [
              sourceOption("good-afternoon", "GOOD AFTERNOON"),
              sourceOption("good-morning", "GOOD MORNING"),
              sourceOption("goodbye", "GOODBYE")
            ],
            answer: { type: "single", value: "good-afternoon" },
            feedback: {
              correct: "Excelente! GOOD AFTERNOON combina com a tarde.",
              incorrect: "Ouça novamente e procure a cena da tarde.",
              language: "pt-BR"
            },
            delivery: { mechanic: "target-shooter", allowImage: true, allowAudio: true },
            metadata: {
              title: "Good afternoon", screenTitle: "Afternoon", sourceDifficulty: "Fácil",
              sourceMedia: "Imagem recomendada: período da tarde.",
              sourceCorrectAnswer: "GOOD AFTERNOON",
              targetShooter: {
                audioText: "Good afternoon",
                mode: "audio-to-image",
                shape: "cloud",
                correctIds: ["scene-afternoon"],
                difficulty: { speed: 0.42, objectCount: 3, spawnIntervalMs: 190, requiredCorrect: 1, targetSize: 150 },
                items: [
                  { id: "scene-morning", label: "", image: VISUALS.morning, display: "image" },
                  { id: "scene-afternoon", label: "", image: VISUALS.afternoon, display: "image" },
                  { id: "scene-goodbye", label: "", image: VISUALS.goodbye, display: "image" }
                ]
              },
              tags: ["official", "listening", "time-of-day", "EN1-M1-03"]
            }
          },
          {
            id: "EN1-M1-04",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.farewell, difficulty: "easy",
            statement: "Goodbye!",
            instruction: "Ouça e acerte a cena de despedida.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Goodbye", language: "en-US", role: "instruction" },
            alternatives: [
              sourceOption("hello", "HELLO"),
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: { type: "single", value: "goodbye" },
            feedback: {
              correct: "Isso! GOODBYE é usado para se despedir.",
              incorrect: "Ouça GOODBYE novamente e observe quem está indo embora.",
              language: "pt-BR"
            },
            delivery: { mechanic: "target-shooter", allowImage: true, allowAudio: true },
            metadata: {
              title: "Goodbye!", screenTitle: "Goodbye!", sourceDifficulty: "Fácil",
              sourceMedia: "Áudio EN recomendado: Goodbye.",
              sourceCorrectAnswer: "GOODBYE",
              targetShooter: {
                audioText: "Goodbye",
                mode: "audio-to-image",
                shape: "balloon",
                correctIds: ["scene-goodbye"],
                difficulty: { speed: 0.40, objectCount: 3, spawnIntervalMs: 195, requiredCorrect: 1, targetSize: 150 },
                items: [
                  { id: "scene-greeting", label: "", image: VISUALS.greeting, display: "image" },
                  { id: "scene-goodbye", label: "", image: VISUALS.goodbye, display: "image" },
                  { id: "scene-morning", label: "", image: VISUALS.morning, display: "image" }
                ]
              },
              tags: ["official", "listening", "farewell", "EN1-M1-04"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 2 — MORNING & AFTERNOON — MATCHING
         EN1-M1-02
         Dois pares curtos: áudio ↔ cena.
         ===================================================== */
      {
        id: "en1-m1-step-02-morning-afternoon",
        title: "Morning & Afternoon",
        mechanic: "matching",
        skill: SKILLS.greetingSituation,
        questions: [
          {
            id: "EN1-M1-02",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingSituation, difficulty: "easy",
            statement: "Good morning",
            instruction: "Ouça e ligue cada saudação à cena correta.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e ligue cada saudação à cena correta.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("good-afternoon", "GOOD AFTERNOON"),
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: { type: "single", value: "good-morning" },
            feedback: {
              correct: "Muito bem! GOOD MORNING combina com a manhã.",
              incorrect: "Ouça cada áudio novamente e compare manhã e tarde.",
              language: "pt-BR"
            },
            delivery: { mechanic: "matching", allowImage: true, allowAudio: true },
            metadata: {
              title: "Good morning", sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "GOOD MORNING",
              sourceMedia: "Imagem recomendada: manhã/sol nascendo.",
              presentationDecision: "O Matching apresenta um contraste guiado GOOD MORNING × GOOD AFTERNOON; GOODBYE permanece registrado como alternativa editorial do item, mas não é necessário na associação 1×1 desta tela.",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Cenas",
                assets: { morning: VISUALS.morning, afternoon: VISUALS.afternoon },
                leftItems: [
                  { id: "audio-morning", spokenText: "Good morning", speechLocale: "en-US", audioDescription: "Ouvir Good morning" },
                  { id: "audio-afternoon", spokenText: "Good afternoon", speechLocale: "en-US", audioDescription: "Ouvir Good afternoon" }
                ],
                rightItems: [
                  { id: "picture-morning", imageAssetKey: "morning", alt: "Cena de manhã" },
                  { id: "picture-afternoon", imageAssetKey: "afternoon", alt: "Cena de tarde" }
                ],
                pairs: [
                  { leftId: "audio-morning", rightId: "picture-morning" },
                  { leftId: "audio-afternoon", rightId: "picture-afternoon" }
                ],
                behavior: { shuffleLeft: true, shuffleRight: true, connectionMode: "1x1", interactionMode: "tap" }
              },
              tags: ["official", "matching", "listening", "EN1-M1-02"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 3 — WHO AM I? — MATCHING
         EN1-M1-05 / 06 / 07 / 08
         Repertório concreto e resposta a cumprimento.
         ===================================================== */
      {
        id: "en1-m1-step-03-who-am-i",
        title: "Who Am I?",
        mechanic: "matching",
        skill: SKILLS.boyGirl,
        questions: [
          {
            id: "EN1-M1-05",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.identifySelf, difficulty: "easy",
            statement: "I'm...",
            instruction: "Ouça e ligue cada fala à cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e ligue cada fala à cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("good-afternoon", "GOOD AFTERNOON"),
              sourceOption("im", "I'M...")
            ],
            answer: { type: "single", value: "im" },
            feedback: {
              correct: "Certo! I'M... pode iniciar uma apresentação com o próprio nome.",
              incorrect: "Ouça novamente e observe quem está se apresentando.",
              language: "pt-BR"
            },
            delivery: { mechanic: "matching", allowImage: true, allowAudio: true },
            metadata: {
              title: "I'm...", sourceDifficulty: "Fácil",
              sourceCorrectAnswer: "I'M...",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Cenas",
                assets: { selfintro: VISUALS.selfintro, goodbye: VISUALS.goodbye },
                leftItems: [
                  { id: "audio-im", spokenText: "I'm Ana", speechLocale: "en-US", audioDescription: "Ouvir uma apresentação" },
                  { id: "audio-goodbye", spokenText: "Goodbye", speechLocale: "en-US", audioDescription: "Ouvir uma despedida" }
                ],
                rightItems: [
                  { id: "picture-selfintro", imageAssetKey: "selfintro", alt: "Criança dizendo o próprio nome" },
                  { id: "picture-goodbye", imageAssetKey: "goodbye", alt: "Cena de despedida" }
                ],
                pairs: [
                  { leftId: "audio-im", rightId: "picture-selfintro" },
                  { leftId: "audio-goodbye", rightId: "picture-goodbye" }
                ],
                behavior: { shuffleLeft: true, shuffleRight: true, connectionMode: "1x1", interactionMode: "tap" }
              },
              tags: ["official", "matching", "introduction", "EN1-M1-05"]
            }
          },
          {
            id: "EN1-M1-06",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirl, difficulty: "easy",
            statement: "Boy",
            instruction: "Ouça e ligue cada palavra à imagem correta.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e ligue cada palavra à imagem correta.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("boy", "BOY"),
              sourceOption("girl", "GIRL"),
              sourceOption("hello", "HELLO")
            ],
            answer: { type: "single", value: "boy" },
            feedback: {
              correct: "Muito bem! BOY foi relacionado à figura de menino.",
              incorrect: "Ouça BOY e GIRL novamente e compare as imagens.",
              language: "pt-BR"
            },
            delivery: { mechanic: "matching", allowImage: true, allowAudio: true },
            metadata: {
              title: "Boy", sourceDifficulty: "Fácil", sourceCorrectAnswer: "BOY",
              sourceMedia: "Imagem recomendada: menino.",
              matching: {
                mode: "audio-image",
                leftTitle: "Ouça",
                rightTitle: "Imagens",
                assets: { boy: VISUALS.boy, girl: VISUALS.girl },
                leftItems: [
                  { id: "audio-boy", spokenText: "Boy", speechLocale: "en-US", audioDescription: "Ouvir Boy" },
                  { id: "audio-girl", spokenText: "Girl", speechLocale: "en-US", audioDescription: "Ouvir Girl" }
                ],
                rightItems: [
                  { id: "picture-boy", imageAssetKey: "boy", alt: "Ilustração de menino" },
                  { id: "picture-girl", imageAssetKey: "girl", alt: "Ilustração de menina" }
                ],
                pairs: [
                  { leftId: "audio-boy", rightId: "picture-boy" },
                  { leftId: "audio-girl", rightId: "picture-girl" }
                ],
                behavior: { shuffleLeft: true, shuffleRight: true, connectionMode: "1x1", interactionMode: "tap" }
              },
              tags: ["official", "matching", "visual-vocabulary", "EN1-M1-06"]
            }
          },
          {
            id: "EN1-M1-07",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirl, difficulty: "easy",
            statement: "Girl",
            instruction: "Observe as imagens e ligue cada uma à palavra correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Observe as imagens e ligue cada uma à palavra correspondente. Toque nas palavras para ouvi-las.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("boy", "BOY"),
              sourceOption("girl", "GIRL"),
              sourceOption("goodbye", "GOODBYE")
            ],
            answer: { type: "single", value: "girl" },
            feedback: {
              correct: "Muito bem! GIRL corresponde à figura de menina.",
              incorrect: "Toque em BOY e GIRL para ouvir antes de ligar.",
              language: "pt-BR"
            },
            delivery: { mechanic: "matching", allowImage: true, allowAudio: true },
            metadata: {
              title: "Girl", sourceDifficulty: "Fácil", sourceCorrectAnswer: "GIRL",
              sourceMedia: "Imagem recomendada: menina.",
              matching: {
                mode: "image-word",
                leftTitle: "Imagens",
                rightTitle: "Ouça e ligue",
                assets: { boy: VISUALS.boy, girl: VISUALS.girl },
                leftItems: [
                  { id: "picture-boy", imageAssetKey: "boy", alt: "Ilustração de menino" },
                  { id: "picture-girl", imageAssetKey: "girl", alt: "Ilustração de menina" }
                ],
                rightItems: [
                  { id: "word-boy", label: "BOY", spokenText: "Boy", speechLocale: "en-US", audioDescription: "Ouvir Boy" },
                  { id: "word-girl", label: "GIRL", spokenText: "Girl", speechLocale: "en-US", audioDescription: "Ouvir Girl" }
                ],
                pairs: [
                  { leftId: "picture-boy", rightId: "word-boy" },
                  { leftId: "picture-girl", rightId: "word-girl" }
                ],
                behavior: { shuffleLeft: true, shuffleRight: true, connectionMode: "1x1", interactionMode: "tap" }
              },
              tags: ["official", "matching", "retrieval", "EN1-M1-07"]
            }
          },
          {
            id: "EN1-M1-08",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.greetingResponse, difficulty: "medium",
            statement: "Hello → Hi",
            instruction: "Ouça e ligue cada fala à resposta que combina.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Ouça e ligue cada fala à resposta que combina.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("goodbye", "GOODBYE!"),
              sourceOption("im-boy", "I'M A BOY."),
              sourceOption("hi", "HI!")
            ],
            answer: { type: "single", value: "hi" },
            feedback: {
              correct: "Isso! HI! pode responder a HELLO!.",
              incorrect: "Ouça novamente as falas e compare encontro e despedida.",
              language: "pt-BR"
            },
            delivery: { mechanic: "matching", allowImage: false, allowAudio: true },
            metadata: {
              title: "Hello → Hi", sourceDifficulty: "Média",
              sourceCorrectAnswer: "HI!", sourceMedia: "Áudio EN recomendado: Hello!",
              matching: {
                mode: "audio-word",
                leftTitle: "Ouça",
                rightTitle: "Respostas",
                leftItems: [
                  { id: "audio-hello", spokenText: "Hello", speechLocale: "en-US", audioDescription: "Ouvir Hello" },
                  { id: "audio-goodbye", spokenText: "Goodbye", speechLocale: "en-US", audioDescription: "Ouvir Goodbye" }
                ],
                rightItems: [
                  { id: "word-hi", label: "HI!", spokenText: "Hi", speechLocale: "en-US", audioDescription: "Ouvir Hi" },
                  { id: "word-goodbye", label: "GOODBYE!", spokenText: "Goodbye", speechLocale: "en-US", audioDescription: "Ouvir Goodbye" }
                ],
                pairs: [
                  { leftId: "audio-hello", rightId: "word-hi" },
                  { leftId: "audio-goodbye", rightId: "word-goodbye" }
                ],
                behavior: { shuffleLeft: false, shuffleRight: true, connectionMode: "1x1", interactionMode: "tap" }
              },
              tags: ["official", "matching", "greeting-response", "EN1-M1-08"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 4 — I'M ANA. — DRAG & DROP
         EN1-M1-09
         Os cards mostram 1/2/3; o significado vem do ÁUDIO.
         ===================================================== */
      {
        id: "en1-m1-step-04-im-ana",
        title: "I'm Ana.",
        mechanic: "drag-drop",
        skill: SKILLS.personalPresentation,
        questions: [
          {
            id: "EN1-M1-09",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.personalPresentation, difficulty: "medium",
            statement: "I'm Ana.",
            instruction: "Toque para ouvir e arraste cada áudio para a cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Toque para ouvir e arraste cada áudio para a cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              { id: "audio-1", text: "1", audio: { enabled: true, text: "I'm Ana.", language: "en-US", role: "option" }, metadata: { sourceText: "Dizendo o próprio nome" } },
              { id: "audio-2", text: "2", audio: { enabled: true, text: "Goodbye", language: "en-US", role: "option" }, metadata: { sourceText: "Despedindo-se" } },
              { id: "audio-3", text: "3", audio: { enabled: true, text: "Good afternoon", language: "en-US", role: "option" }, metadata: { sourceText: "Dizendo boa tarde" } }
            ],
            answer: {
              type: "pairs",
              value: [
                { source: "audio-1", target: "scene-selfintro" },
                { source: "audio-2", target: "scene-goodbye" },
                { source: "audio-3", target: "scene-afternoon" }
              ]
            },
            feedback: {
              correct: "Muito bem! I'M ANA. corresponde à cena de apresentação pessoal.",
              incorrect: "Toque nos três cards novamente e compare as cenas.",
              language: "pt-BR"
            },
            delivery: { mechanic: "drag-drop", allowImage: true, allowAudio: true },
            metadata: {
              title: "I'm Ana.", sourceDifficulty: "Média",
              sourceCorrectAnswer: "Dizendo o próprio nome",
              sourceAlternatives: ["Dizendo o próprio nome", "Despedindo-se", "Dizendo boa tarde"],
              sourceMedia: "Áudio EN obrigatório: I'm Ana.",
              presentationDecision: "As três alternativas editoriais foram preservadas em metadata. Na interface, os cards são numerados e falados para retirar a leitura de frases como barreira à compreensão oral.",
              targets: [
                { id: "scene-selfintro", image: { src: VISUALS.selfintro, alt: "Criança dizendo o próprio nome" } },
                { id: "scene-goodbye", image: { src: VISUALS.goodbye, alt: "Cena de despedida" } },
                { id: "scene-afternoon", image: { src: VISUALS.afternoon, alt: "Cena do período da tarde" } }
              ],
              tags: ["official", "drag-drop", "oral-comprehension", "EN1-M1-09"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 5 — I'M A... — SMART SENTENCE
         EN1-M1-10 / EN1-M1-11
         Uma lacuna, duas opções, imagem + áudio.
         ===================================================== */
      {
        id: "en1-m1-step-05-im-a",
        title: "I'm a...",
        mechanic: "smart-sentence",
        skill: SKILLS.boyGirlSentence,
        questions: [
          {
            id: "EN1-M1-10",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirlSentence, difficulty: "medium",
            statement: "I'm a ___.",
            instruction: "Observe a imagem e complete a frase.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Observe a imagem e complete a frase para o menino.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("girl", "GIRL"),
              sourceOption("boy", "BOY"),
              sourceOption("goodbye", "GOODBYE")
            ],
            answer: { type: "single", value: "boy" },
            feedback: {
              correct: "Perfeito! I'M A BOY.",
              incorrect: "Observe a imagem, toque nas opções para ouvir e tente novamente.",
              language: "pt-BR"
            },
            delivery: { mechanic: "smart-sentence", allowImage: true, allowAudio: true },
            metadata: {
              title: "I'm a boy.", sourceDifficulty: "Média",
              sourceCorrectAnswer: "BOY",
              sourceAlternatives: ["GIRL", "BOY", "GOODBYE"],
              sourceMedia: "Imagem recomendada: menino.",
              presentationDecision: "GOODBYE permanece registrado como distrator editorial; a interface do 1º ano mostra somente BOY/GIRL para focar a estrutura e reduzir leitura não essencial.",
              smartSentence: {
                prefix: "I'M A",
                suffix: ".",
                answer: "BOY",
                options: ["BOY", "GIRL"],
                imageKey: "boy",
                imageSrc: VISUALS.boy,
                imageAlt: "Ilustração de menino",
                instruction: "Observe a imagem e complete a frase.",
                instructionSpoken: "Observe a imagem e complete a frase para o menino."
              },
              tags: ["official", "smart-sentence", "EN1-M1-10"]
            }
          },
          {
            id: "EN1-M1-11",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.boyGirlSentence, difficulty: "medium",
            statement: "I'm a ___.",
            instruction: "Observe a imagem e complete a frase.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Observe a imagem e complete a frase para a menina.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("boy", "BOY"),
              sourceOption("hello", "HELLO"),
              sourceOption("girl", "GIRL")
            ],
            answer: { type: "single", value: "girl" },
            feedback: {
              correct: "Perfeito! I'M A GIRL.",
              incorrect: "Observe a imagem, toque nas opções para ouvir e tente novamente.",
              language: "pt-BR"
            },
            delivery: { mechanic: "smart-sentence", allowImage: true, allowAudio: true },
            metadata: {
              title: "I'm a girl.", sourceDifficulty: "Média",
              sourceCorrectAnswer: "GIRL",
              sourceAlternatives: ["BOY", "HELLO", "GIRL"],
              sourceMedia: "Imagem recomendada: menina.",
              presentationDecision: "HELLO permanece registrado como distrator editorial; a interface do 1º ano mostra somente BOY/GIRL pela mesma regra de alfabetização.",
              smartSentence: {
                prefix: "I'M A",
                suffix: ".",
                answer: "GIRL",
                options: ["BOY", "GIRL"],
                imageKey: "girl",
                imageSrc: VISUALS.girl,
                imageAlt: "Ilustração de menina",
                instruction: "Observe a imagem e complete a frase.",
                instructionSpoken: "Observe a imagem e complete a frase para a menina."
              },
              tags: ["official", "smart-sentence", "EN1-M1-11"]
            }
          }
        ]
      },

      /* =====================================================
         ETAPA 6 — GREETING MEMORY — MEMORY QUEST
         EN1-M1-12 — consolidação final do repertório.
         ===================================================== */
      {
        id: "en1-m1-step-06-greeting-memory",
        title: "Greeting Memory",
        mechanic: "memory-quest",
        skill: SKILLS.distinguishGreetingFarewell,
        questions: [
          {
            id: "EN1-M1-12",
            subject: "Língua Inglesa", year: 1, module: 1,
            skill: SKILLS.distinguishGreetingFarewell, difficulty: "hard",
            statement: "Greeting or Goodbye?",
            instruction: "Vire as cartas, ouça os áudios e encontre cada cena correspondente.",
            contentLanguage: "en", instructionLanguage: "pt-BR", feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Vire as cartas, ouça os áudios e encontre cada cena correspondente.", language: "pt-BR", role: "instruction" },
            alternatives: [
              sourceOption("goodbye", "GOODBYE"),
              sourceOption("hello", "HELLO"),
              sourceOption("good-morning", "GOOD MORNING")
            ],
            answer: { type: "single", value: "goodbye" },
            feedback: {
              correct: "Muito bem! Você revisou HELLO, GOOD MORNING e GOODBYE.",
              incorrect: "Ouça novamente e use as cenas como pista de significado.",
              language: "pt-BR"
            },
            delivery: { mechanic: "memory-quest", allowImage: true, allowAudio: true },
            metadata: {
              title: "Greeting Memory", sourceDifficulty: "Difícil",
              sourceCorrectAnswer: "GOODBYE",
              sourceAlternatives: ["GOODBYE", "HELLO", "GOOD MORNING"],
              presentationDecision: "O item de revisão usa os três elementos oficiais como três pares áudio↔imagem. Não introduz conteúdo novo.",
              memoryQuest: {
                assets: {
                  greeting: VISUALS.greeting,
                  morning: VISUALS.morning,
                  goodbye: VISUALS.goodbye
                },
                cards: [
                  { id: "audio-hello", pairId: "hello", spokenText: "Hello", audioDescription: "Ouvir Hello" },
                  { id: "picture-hello", pairId: "hello", imageAssetKey: "greeting", alt: "Pessoas se cumprimentando" },
                  { id: "audio-morning", pairId: "morning", spokenText: "Good morning", audioDescription: "Ouvir Good morning" },
                  { id: "picture-morning", pairId: "morning", imageAssetKey: "morning", alt: "Cena de manhã" },
                  { id: "audio-goodbye", pairId: "goodbye", spokenText: "Goodbye", audioDescription: "Ouvir Goodbye" },
                  { id: "picture-goodbye", pairId: "goodbye", imageAssetKey: "goodbye", alt: "Cena de despedida" }
                ],
                behavior: { shuffleCards: true, matchDelayMs: 420, mismatchDelayMs: 720 }
              },
              tags: ["official", "memory-quest", "review", "EN1-M1-12"]
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.english.year1.module01 = Object.freeze(moduleDefinition);
})();
