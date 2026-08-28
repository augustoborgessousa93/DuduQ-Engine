/* DUDUQ Year 2 v2.3 — M01-12 image grouping refinement
   Replaces only the presentation/runtime task for EN2-M1-12.
   The original v2.3 source metadata (including sourceAnswerV23 = LEO) is preserved
   for audit, while the learner performs a concrete alphabet classification task:
   drag image cards into L / E / O initial-letter groups.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-m1-12-image-group";
  const QUESTION_ID = "EN2-M1-12";
  const factory = window.DuduQYear2V23Factory;
  const baseFactory = window.DuduQYear2V22Factory;

  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ M01-12 Image Group] Factory v2.3 indisponível.");
  }
  if (window.__DUDUQ_YEAR2_M1_12_IMAGE_GROUP__) return;

  const upstreamBuild = factory.buildModule.bind(factory);

  const GROUPS = Object.freeze([
    { id: "initial-l", letter: "L", words: ["lion", "lemon"] },
    { id: "initial-e", letter: "E", words: ["elephant", "egg"] },
    { id: "initial-o", letter: "O", words: ["orange", "owl"] }
  ]);

  const CARDS = Object.freeze([
    { id: "image-lion", word: "lion", letter: "L", emoji: "🦁", alt: "Imagem de um leão" },
    { id: "image-lemon", word: "lemon", letter: "L", emoji: "🍋", alt: "Imagem de um limão" },
    { id: "image-elephant", word: "elephant", letter: "E", emoji: "🐘", alt: "Imagem de um elefante" },
    { id: "image-egg", word: "egg", letter: "E", emoji: "🥚", alt: "Imagem de um ovo" },
    { id: "image-orange", word: "orange", letter: "O", emoji: "🍊", alt: "Imagem de uma laranja" },
    { id: "image-owl", word: "owl", letter: "O", emoji: "🦉", alt: "Imagem de uma coruja" }
  ]);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function fallbackVisual(card) {
    if (baseFactory && typeof baseFactory.resolveVisual === "function") {
      try {
        const resolved = baseFactory.resolveVisual({ kind: "emoji", emoji: card.emoji, alt: card.alt });
        if (resolved?.src) return resolved;
      } catch (_) {}
    }
    return { src: "", alt: card.alt, status: "missing" };
  }

  function resolveVisual(card) {
    const consistent = factory.resolveYear2VisualConsistent;
    if (typeof consistent === "function") {
      try {
        const resolved = consistent(card.word);
        if (resolved?.src) {
          return {
            src: String(resolved.src),
            alt: String(resolved.alt || card.alt),
            status: String(resolved.status || "smart-resolved")
          };
        }
      } catch (_) {}
    }
    return fallbackVisual(card);
  }

  function transformQuestion(question) {
    const sourceAnswerV23 = question?.metadata?.sourceAnswerV23 ?? "LEO";
    const sourcePromptV23 = question?.metadata?.sourcePromptV23 ?? question?.statement ?? "";
    const sourceAlternativesV23 = clone(question?.metadata?.sourceAlternativesV23 || []);
    const visuals = new Map(CARDS.map((card) => [card.id, resolveVisual(card)]));

    question.statement = "ARRASTE AS IMAGENS PARA A LETRA INICIAL CORRETA";
    question.instruction = question.statement;
    question.skill = {
      ...(question.skill || {}),
      description: "Associar imagens e palavras ouvidas à letra inicial correspondente em inglês."
    };
    question.audio = {
      enabled: true,
      text: "Arraste as imagens para a letra inicial correta.",
      language: "pt-BR",
      role: "instruction"
    };
    question.delivery = {
      ...(question.delivery || {}),
      mechanic: "drag-drop",
      allowImage: true,
      allowAudio: true
    };

    question.alternatives = CARDS.map((card) => {
      const visual = visuals.get(card.id) || fallbackVisual(card);
      return {
        id: card.id,
        text: "",
        label: "",
        image: { enabled: true, src: visual.src, alt: visual.alt || card.alt },
        imageSrc: visual.src,
        imageUrl: visual.src,
        audio: { enabled: true, text: card.word, language: "en-US", role: "option" },
        spokenText: card.word,
        speechLocale: "en-US",
        audioDescription: `Ouvir ${card.word}`,
        metadata: {
          sourceWrittenLabel: card.word,
          writtenLabelVisibleBeforeAnswer: false,
          imageAssetKey: visual.src,
          smartAssetStatus: visual.status,
          multimodalRole: "DRAGGABLE_VISUAL",
          initialLetter: card.letter
        }
      };
    });

    question.answer = {
      type: "pairs",
      value: CARDS.map((card) => ({
        source: card.id,
        target: `initial-${card.letter.toLowerCase()}`
      }))
    };

    question.metadata = {
      ...(question.metadata || {}),
      sourceAnswerV23,
      sourcePromptV23,
      sourceAlternativesV23,
      optionPresentation: "IMAGE_GROUPING_BY_INITIAL_LETTER",
      englishReadingRequired: false,
      englishWordReadingRequired: false,
      optionAudioRequired: true,
      shuffleItems: true,
      shuffleTargets: false,
      forceOwnActivity: true,
      targets: GROUPS.map((group) => ({
        id: group.id,
        label: group.letter,
        alt: `Grupo da letra ${group.letter}`,
        capacity: 2,
        kind: "box"
      })),
      instructionAudio: {
        enabled: true,
        text: "Arraste as imagens para a letra inicial correta.",
        language: "pt-BR",
        repeatable: true
      },
      interactionAdaptation: {
        sourceFormat: question?.metadata?.interactionAdaptation?.sourceFormat || "Escuta + letras móveis.",
        runtimeFormat: "Classificação visual: seis imagens em três grupos de letras iniciais L, E e O.",
        rationale: "Torna o alfabeto concreto e multimodal: imagem + áudio + letra inicial, sem exigir leitura autônoma."
      },
      imageGrouping: {
        version: VERSION,
        letters: GROUPS.map((group) => group.letter),
        capacityPerGroup: 2,
        cards: CARDS.map((card) => ({ id: card.id, word: card.word, initialLetter: card.letter })),
        sourceAnswerPreserved: sourceAnswerV23 === "LEO"
      },
      correctAnswerReinforcement: {
        spokenText: "L: lion, lemon. E: elephant, egg. O: orange, owl.",
        writtenText: "L • lion / lemon   E • elephant / egg   O • orange / owl",
        language: "en-US",
        revealWrittenAfterResponse: true
      }
    };

    delete question.metadata.firstListenGate;
    delete question.metadata.stimulusAudio;
    delete question.metadata.editorialAnswer;
    delete question.metadata.editorialAlternatives;

    question.feedback = {
      ...(question.feedback || {}),
      correct: "Muito bem! Você organizou as imagens pelas letras iniciais.",
      incorrect: "Ouça a palavra, observe a letra inicial e tente novamente.",
      language: "pt-BR"
    };

    return question;
  }

  function refine(module, config) {
    if (Number(config?.module) !== 1 || Number(module?.module) !== 1) return module;

    const refined = clone(module);
    let found = false;
    for (const activity of refined.activities || []) {
      for (let index = 0; index < (activity.questions || []).length; index += 1) {
        const question = activity.questions[index];
        if (question?.id !== QUESTION_ID) continue;
        activity.questions[index] = transformQuestion(question);
        activity.title = "ALPHABET";
        activity.topic = "ALPHABET";
        activity.mechanic = "drag-drop";
        activity.skill = clone(activity.questions[index].skill);
        found = true;
      }
    }

    if (!found) {
      throw new Error(`[DuduQ M01-12 Image Group] ${QUESTION_ID} não encontrado no módulo construído.`);
    }

    refined.audit = {
      ...(refined.audit || {}),
      m1_12ImageGrouping: {
        version: VERSION,
        questionId: QUESTION_ID,
        groups: 3,
        draggableImages: 6,
        sourceAnswerV23Preserved: true
      }
    };

    return Object.freeze(refined);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return refine(upstreamBuild(config), config);
    },
    __m1_12ImageGroupingApplied: true
  });

  window.__DUDUQ_YEAR2_M1_12_IMAGE_GROUP__ = Object.freeze({
    version: VERSION,
    questionId: QUESTION_ID,
    mode: "image-grouping-by-initial-letter",
    letters: GROUPS.map((group) => group.letter),
    draggableImages: CARDS.length,
    audioPerImage: true,
    sourceAnswerV23Preserved: true,
    releaseModified: false,
    canaryModified: false
  });
})();
