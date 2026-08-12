/* =========================================================
   DUDUQ CONTENT — ENGLISH — YEAR 1 — MODULE 01
   My First English Words
   Versão 1.2.1 — MÓDULO COMPLETO · IMAGENS VETORIAIS

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

  const VERSION = "1.2.1";

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


  /* =======================================================
     ILUSTRAÇÕES VETORIAIS — ALVOS DO DRAG & DROP

     Por decisão pedagógica, os alvos visuais não usam mais emoji.
     As imagens abaixo são SVGs vetoriais simples, grandes e nítidos,
     incorporados ao próprio conteúdo para manter consistência entre
     Windows, tablets e navegadores sem depender de arquivos externos.
     ======================================================= */

  function svgData(svg) {
    return (
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(
        String(svg || "")
          .replace(/\s+/g, " ")
          .trim()
      )
    );
  }

  const PICTOGRAMS = Object.freeze({
    dog: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#EAF6FF"/>
        <ellipse cx="45" cy="60" rx="24" ry="34" fill="#8B5A3C" transform="rotate(-24 45 60)"/>
        <ellipse cx="115" cy="60" rx="24" ry="34" fill="#8B5A3C" transform="rotate(24 115 60)"/>
        <circle cx="80" cy="80" r="49" fill="#D79A65"/>
        <ellipse cx="80" cy="101" rx="28" ry="22" fill="#F7D7B6"/>
        <circle cx="62" cy="72" r="6" fill="#17324D"/>
        <circle cx="98" cy="72" r="6" fill="#17324D"/>
        <ellipse cx="80" cy="93" rx="9" ry="7" fill="#17324D"/>
        <path d="M68 106 Q80 118 92 106" fill="none" stroke="#17324D" stroke-width="5" stroke-linecap="round"/>
        <path d="M76 111 Q80 126 85 111" fill="#F27B8A"/>
      </svg>
    `),
    cat: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#FFF7E8"/>
        <path d="M40 58 L49 25 L72 49 Z" fill="#F2A64A" stroke="#C87424" stroke-width="4"/>
        <path d="M120 58 L111 25 L88 49 Z" fill="#F2A64A" stroke="#C87424" stroke-width="4"/>
        <circle cx="80" cy="82" r="51" fill="#F6B455"/>
        <path d="M50 55 L51 38 L65 51 Z" fill="#F6C5C8"/>
        <path d="M110 55 L109 38 L95 51 Z" fill="#F6C5C8"/>
        <ellipse cx="61" cy="77" rx="6" ry="8" fill="#17324D"/>
        <ellipse cx="99" cy="77" rx="6" ry="8" fill="#17324D"/>
        <path d="M80 91 l-8 7 h16 z" fill="#E77C8C"/>
        <path d="M80 99 Q70 110 61 101 M80 99 Q90 110 99 101" fill="none" stroke="#17324D" stroke-width="4" stroke-linecap="round"/>
        <path d="M54 95 L25 89 M54 102 L23 104 M106 95 L135 89 M106 102 L137 104" stroke="#6B5A46" stroke-width="3.5" stroke-linecap="round"/>
      </svg>
    `),
    bird: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#EEFBEF"/>
        <ellipse cx="78" cy="89" rx="45" ry="39" fill="#7CCB70"/>
        <circle cx="104" cy="61" r="30" fill="#79C9E8"/>
        <path d="M128 61 L151 72 L128 78 Z" fill="#F6A623"/>
        <circle cx="111" cy="56" r="5.5" fill="#17324D"/>
        <path d="M45 89 Q74 53 98 92 Q69 116 45 89 Z" fill="#43A95D"/>
        <path d="M47 113 L35 135 M69 117 L61 138" stroke="#B7772C" stroke-width="5" stroke-linecap="round"/>
        <path d="M31 137 H48 M56 140 H73" stroke="#B7772C" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `),
    fish: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#E8FAFF"/>
        <ellipse cx="78" cy="82" rx="48" ry="31" fill="#54BFE8"/>
        <path d="M32 82 L9 52 L9 112 Z" fill="#368FD4"/>
        <path d="M72 51 L91 30 L100 58 Z" fill="#79D6F4"/>
        <path d="M72 113 L91 134 L100 106 Z" fill="#79D6F4"/>
        <circle cx="103" cy="72" r="6" fill="#17324D"/>
        <circle cx="105" cy="70" r="2" fill="#FFFFFF"/>
        <path d="M113 91 Q126 83 132 91" fill="none" stroke="#1979B5" stroke-width="4" stroke-linecap="round"/>
        <circle cx="135" cy="48" r="8" fill="none" stroke="#79D6F4" stroke-width="4"/>
        <circle cx="146" cy="28" r="5" fill="none" stroke="#79D6F4" stroke-width="3"/>
      </svg>
    `),
    book: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#EEF4FF"/>
        <path d="M22 41 Q54 35 80 51 V126 Q52 111 22 119 Z" fill="#3D8BEA" stroke="#205EA8" stroke-width="5"/>
        <path d="M138 41 Q106 35 80 51 V126 Q108 111 138 119 Z" fill="#62A8F4" stroke="#205EA8" stroke-width="5"/>
        <path d="M80 52 V126" stroke="#FFFFFF" stroke-width="5"/>
        <path d="M35 58 Q56 54 70 62 M35 75 Q56 70 70 78 M35 92 Q56 87 70 95" stroke="#DCEBFF" stroke-width="4" stroke-linecap="round"/>
        <path d="M125 58 Q104 54 90 62 M125 75 Q104 70 90 78 M125 92 Q104 87 90 95" stroke="#EAF3FF" stroke-width="4" stroke-linecap="round"/>
      </svg>
    `),
    pencil: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#FFF8E6"/>
        <g transform="rotate(-38 80 80)">
          <rect x="65" y="24" width="30" height="92" rx="8" fill="#F5C340" stroke="#D6931C" stroke-width="5"/>
          <rect x="65" y="24" width="30" height="18" rx="7" fill="#F4869A"/>
          <rect x="68" y="44" width="7" height="67" fill="#FFE986" opacity=".9"/>
          <path d="M65 116 L80 143 L95 116 Z" fill="#E8C39D" stroke="#B9855C" stroke-width="4"/>
          <path d="M75 134 L80 143 L85 134 Z" fill="#17324D"/>
        </g>
      </svg>
    `),
    ruler: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#EEFBFA"/>
        <g transform="rotate(-28 80 80)">
          <rect x="24" y="58" width="112" height="44" rx="10" fill="#69D0C4" stroke="#2E8F87" stroke-width="5"/>
          <path d="M40 58 V78 M54 58 V70 M68 58 V78 M82 58 V70 M96 58 V78 M110 58 V70 M124 58 V78" stroke="#FFFFFF" stroke-width="4"/>
          <circle cx="38" cy="91" r="5" fill="#2E8F87"/>
        </g>
      </svg>
    `),
    bag: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#FFF0F6"/>
        <path d="M55 49 Q55 24 80 24 Q105 24 105 49" fill="none" stroke="#754A8D" stroke-width="10" stroke-linecap="round"/>
        <rect x="38" y="43" width="84" height="90" rx="24" fill="#D65AA3" stroke="#943B7A" stroke-width="5"/>
        <rect x="49" y="78" width="62" height="42" rx="15" fill="#F58BC1" stroke="#B3478A" stroke-width="4"/>
        <path d="M54 60 H106" stroke="#FFE3F1" stroke-width="6" stroke-linecap="round"/>
        <circle cx="80" cy="98" r="7" fill="#FFFFFF"/>
        <path d="M37 65 Q20 75 28 105 M123 65 Q140 75 132 105" fill="none" stroke="#754A8D" stroke-width="8" stroke-linecap="round"/>
      </svg>
    `),
    greeting: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#FFF8E8"/>
        <path d="M52 92 V48 Q52 38 60 38 Q68 38 68 48 V71 V34 Q68 24 76 24 Q84 24 84 34 V70 V39 Q84 29 92 29 Q100 29 100 39 V75 V50 Q100 40 108 40 Q116 40 116 50 V91 Q116 128 82 132 Q55 132 45 110 L34 87 Q29 78 37 73 Q45 69 51 79 Z" fill="#F2B06A" stroke="#B87333" stroke-width="5" stroke-linejoin="round"/>
        <path d="M23 54 Q34 42 47 37 M119 34 Q134 43 140 58" fill="none" stroke="#F2C94C" stroke-width="6" stroke-linecap="round"/>
      </svg>
    `),
    paw: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#F2FAEE"/>
        <ellipse cx="80" cy="101" rx="40" ry="31" fill="#6A9D54"/>
        <ellipse cx="43" cy="67" rx="15" ry="21" fill="#6A9D54" transform="rotate(-22 43 67)"/>
        <ellipse cx="69" cy="49" rx="15" ry="21" fill="#6A9D54" transform="rotate(-7 69 49)"/>
        <ellipse cx="96" cy="49" rx="15" ry="21" fill="#6A9D54" transform="rotate(7 96 49)"/>
        <ellipse cx="121" cy="68" rx="15" ry="21" fill="#6A9D54" transform="rotate(22 121 68)"/>
      </svg>
    `),
    palette: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#F7F0FF"/>
        <path d="M82 24 C45 24 20 47 20 80 C20 111 45 136 78 136 C94 136 101 126 94 114 C89 105 93 96 105 96 H118 C134 96 142 86 140 72 C136 43 111 24 82 24 Z" fill="#D8C0EA" stroke="#8C69A6" stroke-width="5"/>
        <circle cx="53" cy="58" r="10" fill="#E85D75"/>
        <circle cx="82" cy="48" r="10" fill="#F2C94C"/>
        <circle cx="109" cy="60" r="10" fill="#56CCF2"/>
        <circle cx="55" cy="91" r="10" fill="#6FCF97"/>
        <circle cx="83" cy="86" r="10" fill="#F2994A"/>
      </svg>
    `),
    teddy: svgData(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="72" fill="#FFF5EC"/>
        <circle cx="48" cy="50" r="21" fill="#B87845"/>
        <circle cx="112" cy="50" r="21" fill="#B87845"/>
        <circle cx="80" cy="78" r="50" fill="#C98A55"/>
        <ellipse cx="80" cy="98" rx="27" ry="22" fill="#EBC7A4"/>
        <circle cx="63" cy="73" r="6" fill="#17324D"/>
        <circle cx="97" cy="73" r="6" fill="#17324D"/>
        <ellipse cx="80" cy="92" rx="8" ry="6" fill="#17324D"/>
        <path d="M70 105 Q80 114 90 105" fill="none" stroke="#17324D" stroke-width="4" stroke-linecap="round"/>
        <path d="M53 117 Q35 131 39 145 M107 117 Q125 131 121 145" fill="none" stroke="#C98A55" stroke-width="15" stroke-linecap="round"/>
      </svg>
    `)
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
        "Nos pareamentos de ANIMALS, SCHOOL OBJECTS e FINAL CHALLENGE, ilustrações vetoriais grandes e nítidas dão apoio visual sem acrescentar tradução escrita. Evitamos emojis como referência principal para garantir leitura consistente em diferentes dispositivos.",

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
                { id: "dog-picture", image: { src: PICTOGRAMS.dog, alt: "Ilustração de cachorro" } },
                { id: "cat-picture", image: { src: PICTOGRAMS.cat, alt: "Ilustração de gato" } },
                { id: "bird-picture", image: { src: PICTOGRAMS.bird, alt: "Ilustração de pássaro" } },
                { id: "fish-picture", image: { src: PICTOGRAMS.fish, alt: "Ilustração de peixe" } }
              ],
              tags: ["animals", "association", "listening", "vector-illustration"]
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
                { id: "book-picture", image: { src: PICTOGRAMS.book, alt: "Ilustração de livro" } },
                { id: "pencil-picture", image: { src: PICTOGRAMS.pencil, alt: "Ilustração de lápis" } },
                { id: "ruler-picture", image: { src: PICTOGRAMS.ruler, alt: "Ilustração de régua" } },
                { id: "bag-picture", image: { src: PICTOGRAMS.bag, alt: "Ilustração de mochila" } }
              ],
              tags: ["school-objects", "association", "listening", "vector-illustration"]
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
                { id: "group-greeting", image: { src: PICTOGRAMS.greeting, alt: "Grupo de cumprimentos" } },
                { id: "group-animal", image: { src: PICTOGRAMS.paw, alt: "Grupo de animais" } },
                { id: "group-color", image: { src: PICTOGRAMS.palette, alt: "Grupo de cores" } }
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
                { id: "group-school", image: { src: PICTOGRAMS.bag, alt: "Grupo de objetos escolares" } },
                { id: "group-toy", image: { src: PICTOGRAMS.teddy, alt: "Grupo de brinquedos" } },
                { id: "group-animal", image: { src: PICTOGRAMS.paw, alt: "Grupo de animais" } },
                { id: "group-color", image: { src: PICTOGRAMS.palette, alt: "Grupo de cores" } }
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

