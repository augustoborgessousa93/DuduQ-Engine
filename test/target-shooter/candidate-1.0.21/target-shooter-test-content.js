/* =========================================================
   DUDUQ TEST CONTENT — TARGET SHOOTER 1.0.21
   Homologação isolada do upgrade visual do cenário.
   Não altera conteúdo oficial.
   ========================================================= */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.test = window.DUDUQ_CONTENT.test || {};

  function numeralSvg(value, fill) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420"><defs><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#23C2FF"/><stop offset="1" stop-color="#075EEA"/></linearGradient></defs><circle cx="210" cy="210" r="174" fill="#FFE04D" stroke="#E49A00" stroke-width="18"/><circle cx="210" cy="210" r="145" fill="url(#b)" stroke="#FFFFFF" stroke-width="10"/><text x="210" y="285" text-anchor="middle" font-family="Arial Rounded MT Bold,system-ui,sans-serif" font-size="220" font-weight="900" fill="${fill}" stroke="#F5A400" stroke-width="10" paint-order="stroke">${value}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  const moduleDefinition = {
    id: "duduq-test-target-shooter-1.0.21-visual",
    version: "test-1.0.21-visual-1",
    subject: "Língua Inglesa",
    year: 1,
    module: 2,
    title: "NUMBERS",
    description: "Homologação visual isolada do cenário Target Shooter 1.0.21.",
    estimatedMinutes: 1,
    intro: {
      companyKicker: "HOMOLOGAÇÃO",
      collectionName: "Target Shooter 1.0.21",
      loadingLabel: "CARREGANDO CENÁRIO",
      readyLabel: "CENÁRIO PRONTO",
      startLabel: "ABRIR TARGET SHOOTER",
      hint: "Ambiente isolado — não altera o Canary",
      minDurationMs: 0,
      brandingDurationMs: 0,
      switchingDurationMs: 0,
      missionMinDurationMs: 0,
      sparkCount: 0
    },
    activities: [
      {
        id: "homolog-target-shooter-visual-121",
        title: "NUMBERS",
        mechanic: "target-shooter",
        skill: { code: null, description: "Reconhecer números em inglês por apoio auditivo e visual." },
        questions: [
          {
            id: "TS-121-VISUAL-SENTINEL",
            subject: "Língua Inglesa",
            year: 1,
            module: 2,
            difficulty: "easy",
            statement: "Ouça e escolha.",
            instruction: "Ouça e toque na imagem correta.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "one", src: null, language: "en-US", role: "instruction" },
            alternatives: [
              { id: "n1", text: "", image: { enabled: true, src: numeralSvg("1", "#FFE14C"), alt: "one" } },
              { id: "n2", text: "", image: { enabled: true, src: numeralSvg("2", "#FFE14C"), alt: "two" } },
              { id: "n3", text: "", image: { enabled: true, src: numeralSvg("3", "#FFE14C"), alt: "three" } }
            ],
            answer: { type: "single", value: "n1" },
            feedback: {
              correct: "Muito bem! ONE!",
              incorrect: "Ouça novamente e tente outra vez.",
              language: "pt-BR"
            },
            delivery: {
              mechanic: "target-shooter",
              preferred: ["target-shooter"],
              allowImage: true,
              allowAudio: true
            },
            metadata: {
              screenTitle: "NUMBERS",
              targetShooter: {
                audioText: "one",
                mode: "audio-to-image",
                shape: "cloud",
                correctIds: ["n1"],
                difficulty: {
                  speed: 0.48,
                  objectCount: 3,
                  spawnIntervalMs: 170,
                  requiredCorrect: 1,
                  targetSize: 150,
                  timeLimitMs: 0,
                  timerMode: "none"
                },
                items: [
                  { id: "n1", label: "ONE", image: numeralSvg("1", "#FFE14C"), display: "image", accent: "#FFD166" },
                  { id: "n2", label: "TWO", image: numeralSvg("2", "#FFE14C"), display: "image", accent: "#4EB4FF" },
                  { id: "n3", label: "THREE", image: numeralSvg("3", "#FFE14C"), display: "image", accent: "#7FD8C9" }
                ]
              },
              homologation: {
                mechanicRelease: "1.0.21",
                channel: "homolog-target-shooter-1.0.21",
                productionCanaryUntouched: true,
                scope: "visual-environment-only"
              }
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.test.targetShooterVisual121 = Object.freeze(moduleDefinition);
})();
