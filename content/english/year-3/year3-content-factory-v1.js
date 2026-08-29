/* DUDUQ English Year 3 — thin content factory v1.0.1
   CONTENT-only helper: maps source-approved item records into the universal DuduQ schema.
   It does not patch mechanics, layout, routing or feedback behavior.
*/
(function () {
  "use strict";
  const VERSION = "1.0.1";
  if (window.DuduQYear3Factory?.version === VERSION) return;

  function text(value, fallback = "") {
    const out = String(value == null ? "" : value).trim();
    return out || fallback;
  }

  function difficulty(value) {
    const raw = text(value).toLowerCase();
    if (raw.includes("dif") || raw === "hard") return "hard";
    if (raw.includes("méd") || raw.includes("med") || raw === "medium") return "medium";
    return "easy";
  }

  function resolveVisual(query, expression) {
    try {
      const result = window.DuduQSmartVisual?.resolve?.(query, { expression });
      if (result?.src) return result;
    } catch (_) {}
    try {
      const src = window.DuduQAssets?.resolveImage?.(query);
      if (src) return { src, status: "official", visualKey: "official:" + query };
    } catch (_) {}
    return { src: null, status: "asset-gap", visualKey: "gap:" + text(query).toLowerCase() };
  }

  function baseQuestion(item, moduleSpec) {
    const declaredMechanic = text(item.mechanic, "bubble-pop");
    return {
      id: item.id,
      subject: "english",
      year: 3,
      module: moduleSpec.module,
      skill: { code: null, description: item.skill },
      difficulty: difficulty(item.difficulty),
      statement: item.prompt,
      instruction: item.instruction || (declaredMechanic === "drag-drop" ? "Observe, ouça quando disponível e arraste a resposta correta." : declaredMechanic === "target-shooter" ? "Ouça e toque na resposta correta." : "Ouça ou leia a situação e escolha a resposta correta."),
      contentLanguage: "en",
      instructionLanguage: "pt-BR",
      feedbackLanguage: "pt-BR",
      alternatives: item.alternatives.map(function (alternative) {
        return { id: alternative.id, text: alternative.text };
      }),
      feedback: {
        correct: "Muito bem!",
        incorrect: "Observe ou ouça novamente e tente outra vez."
      },
      delivery: {
        mechanic: declaredMechanic,
        preferred: [declaredMechanic],
        blocked: []
      },
      metadata: {
        sourceStatus: item.status,
        sourceSkill: item.skill,
        sourceAbility: item.ability,
        sourceStatement: item.prompt,
        sourceMedia: item.media,
        sourceFormat: item.format,
        sourceAnswer: item.answer,
        literacyProfile: "Y3_LITERACY_TRANSITION",
        sourceVersion: "DUDUQ_Ingles_1ao5_Revisao_Pedagogica_Integral_v2.2",
        assetStatus: "smart-resolver-first"
      }
    };
  }

  function dragDropQuestion(item, moduleSpec) {
    const question = baseQuestion(item, moduleSpec);
    const visualQuery = text(item.visualQuery, item.answer.text);
    const visual = resolveVisual(visualQuery, item.expression);
    const target = {
      id: "answer-target",
      label: item.targetLabel || "Resposta",
      capacity: 1,
      kind: "box"
    };
    if (visual.src) {
      target.image = { src: visual.src, alt: visualQuery };
      target.alt = visualQuery;
    }
    if (item.listenText) {
      target.audio = { text: item.listenText, language: "en-US", description: "Ouvir pista em inglês" };
    }
    question.answer = { type: "pairs", value: [[item.answer.id, "answer-target"]] };
    question.metadata.targets = [target];
    question.metadata.visualResolution = { status: visual.status, visualKey: visual.visualKey, requested: visualQuery };
    if (item.listenText) question.audio = { enabled: true, text: item.listenText, language: "en-US", role: "content" };
    return question;
  }

  function bubbleQuestion(item, moduleSpec) {
    const question = baseQuestion(item, moduleSpec);
    question.answer = { type: "single", value: item.answer.id };
    if (item.listenText) question.audio = { enabled: true, text: item.listenText, language: "en-US", role: "content" };
    return question;
  }

  function targetShooterQuestion(item, moduleSpec) {
    const question = baseQuestion(item, moduleSpec);
    question.answer = { type: "single", value: item.answer.id };
    question.audio = { enabled: true, text: item.listenText || item.answer.text, language: "en-US", role: "content" };
    question.metadata.targetShooter = {
      audioText: item.listenText || item.answer.text,
      mode: "audio-to-choice",
      shape: "balloon",
      correctIds: [item.answer.id],
      difficulty: {
        speed: question.difficulty === "hard" ? 0.42 : question.difficulty === "medium" ? 0.34 : 0.28,
        objectCount: item.alternatives.length,
        spawnIntervalMs: 900,
        requiredCorrect: 1,
        targetSize: 172,
        timeLimitMs: 0,
        timerMode: "none"
      },
      items: item.alternatives.map(function (alternative) {
        return { id: alternative.id, label: alternative.text, alt: alternative.text };
      })
    };
    return question;
  }

  function questionFor(item, moduleSpec) {
    if (item.mechanic === "target-shooter") return targetShooterQuestion(item, moduleSpec);
    if (item.mechanic === "drag-drop") return dragDropQuestion(item, moduleSpec);
    return bubbleQuestion(item, moduleSpec);
  }

  function buildModule(spec) {
    const activities = spec.items.map(function (item, index) {
      const mechanic = item.mechanic || "bubble-pop";
      return {
        id: `y3-m${String(spec.module).padStart(2, "0")}-a${String(index + 1).padStart(2, "0")}`,
        title: item.topic || spec.title,
        topic: item.topic || spec.title,
        mechanic,
        questions: [questionFor(item, spec)]
      };
    });

    return {
      id: `duduq-english-y3-module-${String(spec.module).padStart(2, "0")}`,
      version: spec.version || "1.0.0-scale-bootstrap",
      subject: "english",
      year: 3,
      module: spec.module,
      title: spec.title,
      description: spec.objective,
      estimatedMinutes: 12,
      pedagogyPolicy: {
        specification: "DUDUQ_FACTORY_PEDAGOGICAL_SPECIFICATION_v1.1",
        profile: "Y3_LITERACY_TRANSITION",
        priority: "listening-brief-reading-controlled-production",
        audioRepeatable: true,
        longAutonomousReading: false,
        fictitiousProfilesOnly: true,
        multimodalityPriority: true
      },
      factory: {
        source: "DUDUQ_Ingles_1ao5(20260825-012151).docx",
        sourceRevision: "Revisão Pedagógica Integral v2.2",
        scaleChannel: "scale-v1",
        thinContent: true,
        yearSpecificMechanicPatch: false,
        routingContract: "activity.mechanic === question.delivery.mechanic"
      },
      activities
    };
  }

  function publish(spec) {
    window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
    window.DUDUQ_CONTENT.english = window.DUDUQ_CONTENT.english || {};
    window.DUDUQ_CONTENT.english.year3 = window.DUDUQ_CONTENT.english.year3 || {};
    const key = `module${String(spec.module).padStart(2, "0")}`;
    window.DUDUQ_CONTENT.english.year3[key] = buildModule(spec);
    return window.DUDUQ_CONTENT.english.year3[key];
  }

  window.DuduQYear3Factory = Object.freeze({ version: VERSION, buildModule, publish });
})();
