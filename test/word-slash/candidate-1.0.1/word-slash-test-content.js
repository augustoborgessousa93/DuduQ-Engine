/* =========================================================
   DUDUQ TEST CONTENT — WORD SLASH 1.0.1 HOMOLOGATION
   Sentinelas: palavra, imagem e categoria.
   Não altera conteúdo oficial.
   ========================================================= */
(function () {
  "use strict";

  window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  window.DUDUQ_CONTENT.test = window.DUDUQ_CONTENT.test || {};

  function emojiFallback(emoji, label, background) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><rect width="320" height="240" rx="42" fill="${background}"/><text x="160" y="150" text-anchor="middle" font-size="112">${emoji}</text><text x="160" y="211" text-anchor="middle" font-size="26" font-weight="800" font-family="system-ui,sans-serif" fill="#17375e">${label}</text></svg>`;
    return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
  }

  function imageFor(key, emoji, label, background) {
    try {
      const resolved = window.DuduQAssets?.resolveImage?.(key);
      if (typeof resolved === "string" && resolved.trim()) return resolved.trim();
    } catch (_) {}
    return emojiFallback(emoji, label, background);
  }

  const images = {
    dog: imageFor("dog", "🐶", "DOG", "#FFF0E8"),
    cat: imageFor("cat", "🐱", "CAT", "#FFF4D6"),
    bus: imageFor("bus", "🚌", "BUS", "#FFF7CF"),
    house: imageFor("house", "🏠", "HOUSE", "#EDF6FF"),
    apple: imageFor("apple", "🍎", "APPLE", "#FFF0F0"),
    banana: imageFor("banana", "🍌", "BANANA", "#FFF8D8"),
    strawberry: imageFor("strawberry", "🍓", "STRAWBERRY", "#FFF0F4")
  };

  const moduleDefinition = {
    id: "duduq-test-word-slash-1.0.1",
    version: "test-word-slash-1.0.1-1",
    subject: "Língua Inglesa",
    year: 1,
    module: 0,
    title: "WORD SLASH",
    description: "Homologação isolada do Word Slash com palavras, imagens e categorias.",
    estimatedMinutes: 3,

    intro: {
      companyKicker: "HOMOLOGAÇÃO",
      collectionName: "Word Slash 1.0.1",
      loadingLabel: "CARREGANDO TESTE",
      readyLabel: "TESTE PRONTO",
      startLabel: "ABRIR WORD SLASH",
      hint: "Ambiente isolado — não altera o Canary",
      minDurationMs: 0,
      brandingDurationMs: 0,
      switchingDurationMs: 0,
      missionMinDurationMs: 0,
      sparkCount: 0
    },

    activities: [
      {
        id: "homolog-word-slash-101",
        title: "WORD SLASH",
        mechanic: "word-slash",
        skill: { code: null, description: "Reconhecer rapidamente vocabulário familiar em inglês." },
        questions: [
          {
            id: "WS101-WORD-APPLE",
            subject: "Língua Inglesa",
            year: 1,
            module: 0,
            difficulty: "easy",
            statement: "WORD",
            instruction: "Corte somente a palavra APPLE.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Slice the word apple.", src: null, language: "en-US", role: "instruction" },
            alternatives: [
              { id: "a1", text: "APPLE" },
              { id: "a2", text: "TABLE" },
              { id: "a3", text: "HOUSE" },
              { id: "a4", text: "DOG" }
            ],
            answer: { type: "single", value: "a1" },
            feedback: { correct: "Muito bem!", incorrect: "Observe o alvo e tente novamente.", language: "pt-BR" },
            delivery: { mechanic: "word-slash", preferred: ["word-slash"], allowImage: false, allowAudio: true },
            metadata: {
              screenTitle: "WORDS",
              wordSlash: {
                mode: "correct-word",
                target: { label: "APPLE", value: "apple", spokenText: "apple" },
                goal: 3,
                difficulty: { maxObjects: 4, timeLimitSeconds: 38, correctProbability: 0.50 },
                objects: [
                  { id: "apple-word", type: "word", label: "APPLE", value: "apple", category: "fruit", weight: 3 },
                  { id: "table-word", type: "word", label: "TABLE", value: "table", category: "object" },
                  { id: "house-word", type: "word", label: "HOUSE", value: "house", category: "place" },
                  { id: "dog-word", type: "word", label: "DOG", value: "dog", category: "animal" }
                ]
              },
              homologation: { mechanicRelease: "1.0.1", channel: "homolog-word-slash-1.0.1", productionCanaryUntouched: true }
            }
          },
          {
            id: "WS101-IMAGE-DOG",
            subject: "Língua Inglesa",
            year: 1,
            module: 0,
            difficulty: "easy",
            statement: "IMAGES",
            instruction: "Corte somente a imagem do DOG.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Slice the dog.", src: null, language: "en-US", role: "instruction" },
            alternatives: [
              { id: "i1", text: "", image: { enabled: true, src: images.cat, alt: "Cat" } },
              { id: "i2", text: "", image: { enabled: true, src: images.dog, alt: "Dog" } },
              { id: "i3", text: "", image: { enabled: true, src: images.bus, alt: "Bus" } },
              { id: "i4", text: "", image: { enabled: true, src: images.house, alt: "House" } }
            ],
            answer: { type: "single", value: "i2" },
            feedback: { correct: "Muito bem! DOG!", incorrect: "Observe as imagens e tente novamente.", language: "pt-BR" },
            delivery: { mechanic: "word-slash", preferred: ["word-slash"], allowImage: true, allowAudio: true },
            metadata: {
              screenTitle: "IMAGES",
              wordSlash: {
                mode: "correct-image",
                target: { label: "DOG", value: "dog", spokenText: "dog" },
                goal: 3,
                difficulty: { maxObjects: 4, timeLimitSeconds: 38, correctProbability: 0.48 },
                objects: [
                  { id: "cat-image", type: "image", imageSrc: images.cat, alt: "Cat", value: "cat", category: "animal" },
                  { id: "dog-image", type: "image", imageSrc: images.dog, alt: "Dog", value: "dog", category: "animal", weight: 3 },
                  { id: "bus-image", type: "image", imageSrc: images.bus, alt: "Bus", value: "bus", category: "transport" },
                  { id: "house-image", type: "image", imageSrc: images.house, alt: "House", value: "house", category: "place" }
                ]
              },
              homologation: { mechanicRelease: "1.0.1", channel: "homolog-word-slash-1.0.1", productionCanaryUntouched: true }
            }
          },
          {
            id: "WS101-CATEGORY-FRUITS",
            subject: "Língua Inglesa",
            year: 1,
            module: 0,
            difficulty: "medium",
            statement: "FRUITS",
            instruction: "Corte somente as frutas.",
            contentLanguage: "en",
            instructionLanguage: "pt-BR",
            feedbackLanguage: "pt-BR",
            audio: { enabled: true, text: "Slice only the fruits.", src: null, language: "en-US", role: "instruction" },
            alternatives: [
              { id: "f1", text: "", image: { enabled: true, src: images.apple, alt: "Apple" } },
              { id: "f2", text: "", image: { enabled: true, src: images.banana, alt: "Banana" } },
              { id: "f3", text: "", image: { enabled: true, src: images.strawberry, alt: "Strawberry" } },
              { id: "f4", text: "", image: { enabled: true, src: images.bus, alt: "Bus" } },
              { id: "f5", text: "", image: { enabled: true, src: images.house, alt: "House" } }
            ],
            answer: { type: "multiple", value: ["f1", "f2", "f3"] },
            feedback: { correct: "Excelente! FRUITS!", incorrect: "Corte somente as frutas.", language: "pt-BR" },
            delivery: { mechanic: "word-slash", preferred: ["word-slash"], allowImage: true, allowAudio: true },
            metadata: {
              screenTitle: "FRUITS",
              wordSlash: {
                mode: "category",
                target: { label: "FRUITS", acceptCategories: ["fruit"], spokenText: "fruits" },
                goal: 4,
                difficulty: { maxObjects: 5, timeLimitSeconds: 42, correctProbability: 0.58 },
                objects: [
                  { id: "apple-fruit", type: "image", imageSrc: images.apple, alt: "Apple", value: "apple", category: "fruit" },
                  { id: "banana-fruit", type: "image", imageSrc: images.banana, alt: "Banana", value: "banana", category: "fruit" },
                  { id: "strawberry-fruit", type: "image", imageSrc: images.strawberry, alt: "Strawberry", value: "strawberry", category: "fruit" },
                  { id: "bus-not-fruit", type: "image", imageSrc: images.bus, alt: "Bus", value: "bus", category: "transport" },
                  { id: "house-not-fruit", type: "image", imageSrc: images.house, alt: "House", value: "house", category: "place" }
                ]
              },
              homologation: { mechanicRelease: "1.0.1", channel: "homolog-word-slash-1.0.1", productionCanaryUntouched: true }
            }
          }
        ]
      }
    ]
  };

  window.DUDUQ_CONTENT.test.wordSlash101 = Object.freeze(moduleDefinition);
})();
