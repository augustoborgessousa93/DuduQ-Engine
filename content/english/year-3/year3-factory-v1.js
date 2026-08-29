/* DUDUQ English Year 3 — clean factory v1
   SOURCE (what to teach) + PLAN (how to deliver) -> native DuduQ module definition.
   No mechanic runtime patching is allowed here.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQYear3Factory?.version === VERSION) return;

  function assert(condition, message) {
    if (!condition) throw new Error("[DuduQ Year3 Factory] " + message);
  }

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); } catch (_) {}
    return JSON.parse(JSON.stringify(value));
  }

  function difficulty(value) {
    const n = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (n.includes("dificil") || n.includes("hard")) return "hard";
    if (n.includes("media") || n.includes("medio") || n.includes("medium")) return "medium";
    return "easy";
  }

  function sourceModule(moduleNumber) {
    return window.DUDUQ_YEAR3_SOURCE_MODULES?.[moduleNumber] || null;
  }

  function planModule(moduleNumber) {
    return window.DUDUQ_YEAR3_PLANS?.[moduleNumber] || null;
  }

  function visuals() {
    return window.DuduQYear3Visuals || null;
  }

  function resolveVisual(label, visualPlan) {
    const api = visuals();
    assert(api?.resolve, "DuduQYear3Visuals não carregado.");
    if (visualPlan && typeof visualPlan === "object") return api.resolve(label, visualPlan);
    return api.resolve(label);
  }

  function answerLetter(item) {
    return String(item?.answer?.id || "").trim().toUpperCase();
  }

  function sourceAlternatives(item) {
    return (Array.isArray(item.alternatives) ? item.alternatives : []).map((alt) => ({
      id: String(alt.id),
      text: String(alt.text)
    }));
  }

  function universalAlternatives(item, plan = {}) {
    return sourceAlternatives(item).map((alt) => {
      const out = {
        id: alt.id,
        text: alt.text
      };

      if (plan.optionSpeech) {
        out.spokenText = alt.text;
        out.speechLocale = "en-US";
        out.metadata = {
          ...(out.metadata || {}),
          speechText: alt.text,
          speechLanguage: "en-US"
        };
      }

      if (plan.optionVisuals === "auto") {
        const visual = resolveVisual(alt.text);
        if (visual?.src) {
          out.image = {
            enabled: true,
            src: visual.src,
            alt: visual.alt || alt.text
          };
          out.metadata = {
            ...(out.metadata || {}),
            visualStrategy: visual.strategy || ""
          };
          if (visual.assetKey) out.metadata.imageAssetKey = visual.assetKey;
        }
      }

      return out;
    });
  }

  function commonMetadata(source, item, plan, moduleNumber) {
    return {
      screenTitle: plan.screenTitle || source.topic || source.title,
      activityTitle: plan.activityTitle || source.topic || source.title,
      sourceVersion: "2.2",
      sourceStatus: item.status,
      sourceDifficulty: item.difficulty,
      sourceSkill: item.skill,
      sourceAbility: item.ability,
      sourceStatement: item.prompt,
      sourceAlternatives: sourceAlternatives(item),
      sourceAnswer: clone(item.answer),
      sourceMedia: item.media,
      sourceSuggestedFormat: item.suggestedFormat,
      sourceOrder: Number(String(item.id).match(/-(\d{2})$/)?.[1] || 0),
      yearProfile: "Y3_LITERACY_SUPPORTED",
      readingProfile: plan.readingProfile || "R0-R2_SUPPORTED",
      factoryVersion: VERSION,
      module: moduleNumber,
      mechanicPlan: plan.mechanic
    };
  }

  function commonQuestion(source, item, plan, moduleNumber) {
    const question = {
      id: item.id,
      subject: "english",
      year: 3,
      module: moduleNumber,
      skill: {
        code: null,
        description: item.ability || item.skill
      },
      difficulty: difficulty(item.difficulty),
      statement: item.prompt,
      instruction: plan.instruction || "OBSERVE E RESPONDA.",
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      alternatives: universalAlternatives(item, plan),
      feedback: {
        correct: "Muito bem!",
        incorrect: "Observe as pistas, ouça novamente e tente outra vez.",
        language: "pt-BR"
      },
      metadata: commonMetadata(source, item, plan, moduleNumber)
    };

    if (plan.audioText) {
      question.audio = {
        enabled: true,
        text: plan.audioText,
        language: "en-US",
        role: "instruction"
      };
      question.media = {
        audio: {
          enabled: true,
          text: plan.audioText,
          language: "en-US",
          role: "instruction"
        }
      };
    }

    return question;
  }

  function buildBubble(source, item, plan, moduleNumber) {
    const question = commonQuestion(source, item, plan, moduleNumber);

    /* Bubble accepts catalog keys, but not arbitrary option image URLs through the Router.
       Keep official imageAssetKey when available; semantic URL fallbacks remain text/speech. */
    question.alternatives = sourceAlternatives(item).map((alt) => {
      const out = {
        id: alt.id,
        text: alt.text,
        metadata: {
          speechText: plan.optionSpeech ? alt.text : "",
          speechLanguage: "en-US"
        }
      };

      if (plan.optionVisuals === "auto") {
        const visual = resolveVisual(alt.text);
        if (visual?.assetKey) {
          out.metadata.imageAssetKey = visual.assetKey;
          out.metadata.visualStrategy = visual.strategy || "CORE_OFFICIAL_EXACT_ALIAS";
        }
      }
      return out;
    });

    question.answer = { type: "single", value: answerLetter(item) };
    question.delivery = {
      mechanic: "bubble-pop",
      preferred: ["bubble-pop"],
      blocked: plan.blocked || []
    };
    return question;
  }

  function buildTarget(source, item, plan, moduleNumber) {
    const question = commonQuestion(source, item, plan, moduleNumber);
    question.alternatives = sourceAlternatives(item);
    question.answer = { type: "single", value: answerLetter(item) };
    question.delivery = {
      mechanic: "target-shooter",
      preferred: ["target-shooter"]
    };

    const items = sourceAlternatives(item).map((alt) => {
      const visual = resolveVisual(alt.text);
      const target = {
        id: alt.id,
        label: alt.text,
        alt: visual?.alt || alt.text,
        spokenText: plan.optionSpeech ? alt.text : undefined,
        speechLocale: "en-US"
      };
      if (visual?.assetKey) target.imageAsset = visual.assetKey;
      if (visual?.src) {
        target.imageUrl = visual.src;
        target.image = visual.src;
      }
      return target;
    });

    question.metadata.targetShooter = {
      audioText: plan.audioText || "",
      mode: plan.audioText ? "audio-to-image" : "image-choice",
      shape: "balloon",
      correctIds: [answerLetter(item)],
      difficulty: {
        speed: question.difficulty === "hard" ? .38 : question.difficulty === "medium" ? .32 : .27,
        objectCount: 4,
        spawnIntervalMs: 820,
        requiredCorrect: 1,
        targetSize: 180,
        timeLimitMs: 0,
        timerMode: "none"
      },
      items
    };
    return question;
  }

  function buildDragDrop(source, item, plan, moduleNumber) {
    const question = commonQuestion(source, item, plan, moduleNumber);
    const targetId = "context";
    const contextVisual = resolveVisual(item.answer?.text || item.prompt, plan.contextVisual || { type: "scene", scene: "friends" });

    question.answer = {
      type: "pairs",
      value: [{ source: answerLetter(item), target: targetId }]
    };
    question.delivery = {
      mechanic: "drag-drop",
      preferred: ["drag-drop"]
    };

    question.metadata.targets = [{
      id: targetId,
      label: plan.targetLabel || "Observe",
      capacity: 1,
      kind: "box",
      image: contextVisual?.src ? {
        src: contextVisual.src,
        alt: contextVisual.alt || "Contexto visual"
      } : undefined
    }];
    question.metadata.contextVisualStrategy = contextVisual?.strategy || "";
    return question;
  }

  function buildSmartSentence(source, item, plan, moduleNumber) {
    const question = commonQuestion(source, item, plan, moduleNumber);
    const smart = plan.smart || {};
    const tokens = Array.isArray(smart.tokens) ? smart.tokens : [];
    const answer = Array.isArray(smart.answer) ? smart.answer.map(String) : [];
    assert(tokens.length >= 2, `${item.id}: Smart Sentence sem tokens.`);
    assert(answer.length >= 1, `${item.id}: Smart Sentence sem answer.`);

    question.answer = {
      type: "sequence",
      value: answer.slice()
    };
    question.delivery = {
      mechanic: "smart-sentence",
      preferred: ["smart-sentence"],
      blocked: ["word-slash"]
    };
    question.metadata.smartSentence = {
      mode: smart.mode || "word-build",
      instruction: plan.instruction || "OUÇA E MONTE.",
      instructionSpoken: plan.audioText || "",
      language: "en-US",
      tokens: tokens.map((token) => ({
        id: String(token.id),
        value: String(token.value),
        label: String(token.value),
        spokenText: String(token.value)
      })),
      answer: answer.slice(),
      helperText: "Toque ou arraste para montar a resposta.",
      interaction: {
        tap: true,
        drag: true,
        reorder: true,
        remove: true,
        shuffle: true
      },
      feedback: clone(question.feedback),
      difficulty: {
        level: question.difficulty === "hard" ? 3 : question.difficulty === "medium" ? 2 : 1,
        hintAfterErrors: 1
      }
    };
    return question;
  }

  function buildQuestion(source, item, plan, moduleNumber) {
    assert(plan?.mechanic, `${item.id}: plano de mecânica ausente.`);
    if (plan.mechanic === "bubble-pop") return buildBubble(source, item, plan, moduleNumber);
    if (plan.mechanic === "target-shooter") return buildTarget(source, item, plan, moduleNumber);
    if (plan.mechanic === "drag-drop") return buildDragDrop(source, item, plan, moduleNumber);
    if (plan.mechanic === "smart-sentence") return buildSmartSentence(source, item, plan, moduleNumber);
    throw new Error(`[DuduQ Year3 Factory] ${item.id}: mecânica ainda não suportada pela factory v1 (${plan.mechanic}).`);
  }

  function activityTitle(source, plan) {
    if (plan.mechanic === "bubble-pop") return source.topic || "Listen & Choose";
    if (plan.mechanic === "target-shooter") return source.topic || "Visual Challenge";
    if (plan.mechanic === "drag-drop") return source.topic || "Connect the Clues";
    if (plan.mechanic === "smart-sentence") return source.topic || "Build It";
    return source.topic || source.title;
  }

  function intro() {
    return {
      companyKicker: "UMA CRIAÇÃO DE",
      companyLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/LOGO%20DA%20EMPRESA_COLORIDO.png",
      companyAlt: "Editora Brasil Cultural",
      companyName: "Editora Brasil Cultural",
      companyWidth: 820,
      collectionLogo: "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/Logo%20EduQ%20Play.png",
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
    };
  }

  function buildModule(moduleNumber) {
    const source = sourceModule(moduleNumber);
    const planModuleEntry = planModule(moduleNumber);
    assert(source, `M${moduleNumber}: source não carregado.`);
    assert(planModuleEntry, `M${moduleNumber}: plan não carregado.`);
    assert(Array.isArray(source.items) && source.items.length === 15, `M${moduleNumber}: esperado banco de 15 itens.`);

    const activities = source.items.map((item, index) => {
      const plan = planModuleEntry.items?.[item.id];
      const question = buildQuestion(source, item, plan, moduleNumber);
      return {
        id: `Y3-M${String(moduleNumber).padStart(2, "0")}-A${String(index + 1).padStart(2, "0")}`,
        title: activityTitle(source, plan),
        mechanic: plan.mechanic,
        skill: { description: item.skill || item.ability },
        questions: [question]
      };
    });

    const mechanics = Array.from(new Set(activities.map((activity) => activity.mechanic)));
    return {
      id: `duduq-english-y3-module-${String(moduleNumber).padStart(2, "0")}`,
      version: `3.0.0-year3-clean-factory-${VERSION}`,
      subject: "english",
      year: 3,
      module: moduleNumber,
      title: source.title,
      description: `DuduQ English Year 3 — ${source.title}.`,
      estimatedMinutes: 6,
      intro: intro(),
      pedagogyPolicy: {
        specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",
        profile: "Y3_LITERACY_SUPPORTED",
        readingDefault: "R1_SUPPORTED",
        readingMax: "R2_SHORT_FUNCTIONAL",
        audioRepeatable: true,
        imagesLargeUnambiguous: true,
        controlledProduction: true,
        fictionalPersonalDataOnly: true
      },
      factory: {
        tag: "year3-clean-scale-20260829",
        cleanBuild: true,
        sourceVersion: "2.2",
        factoryVersion: VERSION,
        sharedCore: true,
        yearSpecificStructuralHotfixes: false,
        engineChannel: "canary-v1",
        engineRevisionExpected: 143
      },
      mechanics,
      activities
    };
  }

  function registerModule(moduleNumber, key) {
    const definition = buildModule(moduleNumber);
    window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
    window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
    window.DUDUQ_CONTENT.english.year3 = window.DUDUQ_CONTENT.english.year3 || {};
    window.DUDUQ_CONTENT.english.year3[key || `module${String(moduleNumber).padStart(2, "0")}v1`] = definition;
    return definition;
  }

  window.DuduQYear3Factory = Object.freeze({
    version: VERSION,
    buildModule,
    registerModule,
    policy: "SOURCE_IMMUTABLE > PLAN > NATIVE_MECHANIC_PAYLOAD"
  });
})();
