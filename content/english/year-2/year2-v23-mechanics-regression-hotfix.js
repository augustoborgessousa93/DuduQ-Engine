/* DUDUQ English Year 2 — v2.3 mechanics regression hotfix
   Scope: runtime/presentation only. IDs, source answers, order and pedagogical intent stay frozen.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 Mechanics Hotfix] Factory v2.3 indisponível.");
    return;
  }
  if (factory.__mechanicsRegressionHotfixApplied) return;

  const VERSION = "2.3.3-mechanics-regression-hotfix-rc1";
  const originalBuild = factory.buildModule.bind(factory);
  const resolveYear2Visual = typeof factory.resolveYear2Visual === "function"
    ? factory.resolveYear2Visual.bind(factory)
    : null;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function cleanVisibleText(value) {
    return String(value == null ? "" : value)
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/[\uFE0E\uFE0F\u200D]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function optionId(index) {
    return `opt-${index + 1}`;
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/[.!?]/g, "")
      .replace(/\s+/g, " ");
  }

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function sourceAlternatives(question) {
    const list = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(list) && list.length) return list.map(String);
    return (question?.alternatives || []).map((alternative) =>
      String(alternative?.metadata?.sourceWrittenLabel ?? alternative?.audio?.text ?? alternative?.text ?? "")
    );
  }

  function sourceAnswer(question) {
    return String(
      question?.metadata?.sourceAnswerV23 ??
      question?.metadata?.sourceAnswer ??
      question?.metadata?.correctAnswerReinforcement?.writtenText ??
      ""
    );
  }

  function sourceAnswerIndex(question, labels) {
    const answer = normalize(sourceAnswer(question));
    const index = labels.findIndex((label) => normalize(label) === answer);
    if (index >= 0) return index;
    const current = String(question?.answer?.value ?? "");
    const match = current.match(/(?:opt-|option-)(\d+)$/i);
    return match ? Math.max(0, Number(match[1]) - 1) : -1;
  }

  function disableQuestionImage(question) {
    if (question?.image) question.image = { ...question.image, enabled: false, src: "" };
    if (question?.media?.image) question.media.image = { ...question.media.image, enabled: false, src: "" };
    if (question?.stimulus?.image) question.stimulus.image = { ...question.stimulus.image, enabled: false, src: "" };
  }

  function resolveVisual(label) {
    if (!resolveYear2Visual) return null;
    try {
      const visual = resolveYear2Visual(label);
      if (!visual?.src) return null;
      return {
        src: String(visual.src),
        alt: String(visual.alt || label || "Imagem da opção"),
        visualKey: String(visual.visualKey || visual.src),
        status: String(visual.status || "resolved")
      };
    } catch (error) {
      console.warn("[DuduQ Year2 Mechanics Hotfix] Falha ao resolver asset:", label, error);
      return null;
    }
  }

  function audioAlternative(label, index) {
    return {
      id: optionId(index),
      text: String.fromCharCode(65 + index),
      audio: {
        enabled: true,
        text: String(label),
        language: "en-US",
        role: "option"
      },
      metadata: {
        sourceWrittenLabel: String(label),
        writtenLabelVisibleBeforeAnswer: false,
        audioAffordanceOwner: "runtime-control"
      }
    };
  }

  function fallbackTargetToDragDrop(question, reason) {
    const labels = sourceAlternatives(question);
    const correctIndex = sourceAnswerIndex(question, labels);
    if (labels.length < 2 || correctIndex < 0 || correctIndex >= labels.length) return false;

    const answerText = sourceAnswer(question) || labels[correctIndex];
    question.delivery = {
      ...(question.delivery || {}),
      mechanic: "drag-drop",
      allowImage: false,
      allowAudio: true
    };
    question.alternatives = labels.map(audioAlternative);
    question.answer = {
      type: "pairs",
      value: [{ source: optionId(correctIndex), target: "response-target" }]
    };
    question.audio = {
      enabled: true,
      text: answerText,
      language: "en-US",
      role: "stimulus"
    };
    question.metadata = question.metadata || {};
    question.metadata.stimulusAudio = {
      enabled: true,
      text: answerText,
      language: "en-US",
      repeatable: true
    };
    question.metadata.targets = [{
      id: "response-target",
      label: "ARRASTE A RESPOSTA",
      capacity: 1,
      kind: "response",
      compact: true
    }];
    question.metadata.shuffleItems = true;
    question.metadata.shuffleTargets = false;
    question.metadata.mechanicsRegressionFallback = {
      version: VERSION,
      from: "target-shooter",
      to: "drag-drop",
      reason,
      sourceAnswerPreserved: true
    };
    delete question.metadata.targetShooter;
    disableQuestionImage(question);
    question.statement = "OUÇA E ARRASTE A RESPOSTA";
    question.instruction = question.statement;
    return true;
  }

  function fallbackWordSlashToTarget(question, reason) {
    const labels = sourceAlternatives(question);
    const correctIndex = sourceAnswerIndex(question, labels);
    if (labels.length < 2 || correctIndex < 0 || correctIndex >= labels.length) return false;

    const answerText = sourceAnswer(question) || labels[correctIndex];
    question.delivery = {
      ...(question.delivery || {}),
      mechanic: "target-shooter",
      allowImage: false,
      allowAudio: true
    };
    question.alternatives = labels.map((label, index) => ({
      id: optionId(index),
      text: String(label),
      metadata: { sourceWrittenLabel: String(label) }
    }));
    question.answer = { type: "single", value: optionId(correctIndex) };
    question.audio = { enabled: true, text: answerText, language: "en-US", role: "stimulus" };
    question.metadata = question.metadata || {};
    question.metadata.stimulusAudio = {
      enabled: true,
      text: answerText,
      language: "en-US",
      repeatable: true
    };
    question.metadata.targetShooter = {
      audioText: answerText,
      mode: "audio-to-word",
      shape: "balloon",
      correctIds: [optionId(correctIndex)],
      difficulty: {
        speed: 0.24,
        objectCount: Math.min(4, labels.length),
        spawnIntervalMs: 320,
        requiredCorrect: 1,
        targetSize: 184
      },
      items: labels.map((label, index) => ({
        id: optionId(index),
        label: String(label),
        display: "text"
      }))
    };
    question.metadata.mechanicsRegressionFallback = {
      version: VERSION,
      from: "word-slash",
      to: "target-shooter",
      reason,
      sourceAnswerPreserved: true
    };
    delete question.metadata.wordSlash;
    disableQuestionImage(question);
    question.statement = "OUÇA E ATINJA A OPÇÃO";
    question.instruction = question.statement;
    return true;
  }

  function validateWordSlash(question) {
    const config = question?.metadata?.wordSlash;
    if (!config || typeof config !== "object") return { valid: false, reason: "WORD_SLASH_CONFIG_MISSING" };
    if (!config.target || typeof config.target !== "object") return { valid: false, reason: "WORD_SLASH_TARGET_MISSING" };
    if (!Array.isArray(config.objects) || config.objects.length < 2) return { valid: false, reason: "WORD_SLASH_OBJECTS_MISSING" };

    const target = normalize(config.target.value);
    if (!target) return { valid: false, reason: "WORD_SLASH_TARGET_VALUE_EMPTY" };

    const visible = config.objects.filter((object) =>
      Boolean(String(object?.label ?? object?.value ?? object?.imageSrc ?? object?.image?.src ?? "").trim())
    );
    if (visible.length < 2) return { valid: false, reason: "WORD_SLASH_CONTENT_NOT_RENDERABLE" };

    const correct = config.objects.filter((object) => {
      if (typeof object?.correct === "boolean") return object.correct;
      if (Array.isArray(config.target.acceptValues)) return config.target.acceptValues.map(normalize).includes(normalize(object?.value));
      if (Array.isArray(config.target.acceptCategories)) return config.target.acceptCategories.map(normalize).includes(normalize(object?.category));
      return normalize(object?.value) === target;
    });
    const wrong = config.objects.filter((object) => !correct.includes(object));
    if (!correct.length) return { valid: false, reason: "WORD_SLASH_NO_CORRECT_OBJECT" };
    if (!wrong.length) return { valid: false, reason: "WORD_SLASH_NO_DISTRACTOR" };

    return { valid: true, correct: correct.length, wrong: wrong.length };
  }

  function hardenWordSlash(question, audit) {
    if (question?.delivery?.mechanic !== "word-slash") return;
    const validation = validateWordSlash(question);
    question.metadata = question.metadata || {};
    question.metadata.wordSlashPayloadAudit = {
      version: VERSION,
      ...validation,
      visibleOnEntryRequired: true
    };
    if (!validation.valid) {
      const fallback = fallbackWordSlashToTarget(question, validation.reason);
      audit.wordSlashFallbacks.push({ id: question.id, reason: validation.reason, fallback });
      if (!fallback) {
        throw new Error(`${question.id}: Word Slash inválido e fallback não pôde ser construído.`);
      }
    } else {
      audit.wordSlashValidated.push(question.id);
    }
  }

  function upgradeBubbleImages(question, audit) {
    if (question?.delivery?.mechanic !== "bubble-pop") return;
    const labels = sourceAlternatives(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.length < 2) return;

    const used = new Set();
    const visuals = labels.map(resolveVisual);
    const complete = visuals.every((visual) => visual?.src && !used.has(visual.src) && used.add(visual.src));
    if (!complete) {
      question.metadata = question.metadata || {};
      question.metadata.bubbleSmartAssets = {
        version: VERSION,
        status: "INCOMPLETE_UNIQUE_ASSET_SET",
        officialFirst: true
      };
      audit.bubbleAssetFailures.push(question.id);
      return;
    }

    alternatives.forEach((alternative, index) => {
      const visual = visuals[index];
      alternative.metadata = {
        ...(alternative.metadata || {}),
        imageAssetKey: visual.src,
        smartAssetStatus: visual.status,
        sourceWrittenLabel: String(labels[index])
      };
      alternative.image = {
        enabled: true,
        src: visual.src,
        alt: visual.alt || String(labels[index])
      };
    });
    question.delivery = { ...(question.delivery || {}), allowImage: true };
    question.metadata = question.metadata || {};
    question.metadata.bubbleSmartAssets = {
      version: VERSION,
      status: "COMPLETE",
      officialFirst: true,
      uniqueImages: visuals.length,
      directUrlAssetKeys: true
    };
    audit.bubbleUpgraded.push(question.id);
  }

  function dedupeTargetShooter(question, audit) {
    if (question?.delivery?.mechanic !== "target-shooter") return;
    const config = question?.metadata?.targetShooter;
    if (!config || !Array.isArray(config.items) || config.mode !== "audio-to-image") return;

    const labels = sourceAlternatives(question);
    if (labels.length !== config.items.length || labels.length < 2) return;

    const used = new Set();
    const visuals = labels.map(resolveVisual);
    const duplicateOrMissing = visuals.some((visual) => {
      if (!visual?.src) return true;
      const key = visual.src;
      if (used.has(key)) return true;
      used.add(key);
      return false;
    });

    if (duplicateOrMissing) {
      const fallback = fallbackTargetToDragDrop(question, "TARGET_IMAGE_SET_NOT_UNIQUE");
      audit.targetFallbacks.push({ id: question.id, fallback, labels: labels.length, uniqueImages: used.size });
      if (!fallback) {
        throw new Error(`${question.id}: Target Shooter contém imagens repetidas e fallback não pôde ser construído.`);
      }
      return;
    }

    config.items = config.items.map((item, index) => ({
      ...item,
      label: "",
      image: visuals[index].src,
      alt: visuals[index].alt || labels[index],
      display: "image"
    }));
    question.metadata.targetShooterSmartAssets = {
      version: VERSION,
      status: "UNIQUE",
      count: visuals.length,
      officialFirst: true
    };
    audit.targetUnique.push(question.id);
  }

  function sanitizeQuestionText(question, audit) {
    const fields = ["statement", "instruction"];
    let changed = false;
    for (const field of fields) {
      if (typeof question?.[field] !== "string") continue;
      const cleaned = cleanVisibleText(question[field]);
      if (cleaned !== question[field]) changed = true;
      question[field] = cleaned;
    }
    if (question?.metadata && typeof question.metadata.screenTitle === "string") {
      const cleaned = cleanVisibleText(question.metadata.screenTitle);
      if (cleaned !== question.metadata.screenTitle) changed = true;
      question.metadata.screenTitle = cleaned;
    }
    if (question?.feedback) {
      for (const key of ["correct", "incorrect"]) {
        if (typeof question.feedback[key] !== "string") continue;
        const cleaned = cleanVisibleText(question.feedback[key]);
        if (cleaned !== question.feedback[key]) changed = true;
        question.feedback[key] = cleaned;
      }
    }
    if (changed) audit.sanitizedText.push(question.id);
  }

  function annotateMatching(question, audit) {
    if (question?.delivery?.mechanic !== "matching") return;
    const config = question?.metadata?.matching;
    if (!config || !Array.isArray(config.pairs)) return;
    const pairCount = config.pairs.length;
    config.layout = {
      ...(config.layout || {}),
      pairCount,
      density: pairCount <= 3 ? "comfortable" : "compact",
      fit: "viewport",
      internalScrollFrom: 7
    };
    if (pairCount > 3) audit.matchingCompact.push({ id: question.id, pairCount });
  }

  function regroup(module, questions) {
    const activities = [];
    let current = null;
    for (const question of questions) {
      const mechanic = question?.delivery?.mechanic || "drag-drop";
      const topic = String(question?.metadata?.topic || "").toUpperCase();
      const forceOwn = question?.metadata?.forceOwnActivity === true;
      if (forceOwn || !current || current.mechanic !== mechanic || current.topic !== topic || current.questions.length >= 4) {
        current = {
          id: `${String(question.id).toLowerCase()}-${String(mechanic).replace(/[^a-z0-9-]/gi, "-")}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: topic || module.title,
          topic: topic || module.title,
          mechanic,
          skill: question.skill,
          questions: []
        };
        activities.push(current);
      }
      current.questions.push(question);
      if (forceOwn) current = null;
    }
    return activities;
  }

  function distribution(activities) {
    const result = {};
    for (const activity of activities || []) {
      for (const question of activity.questions || []) {
        const mechanic = activity.mechanic || question?.delivery?.mechanic || "unknown";
        result[mechanic] = (result[mechanic] || 0) + 1;
      }
    }
    return result;
  }

  function installRuntimeFetchPatches() {
    if (window.__DUDUQ_YEAR2_MECHANICS_REGRESSION_FETCH_PATCH__) return;
    if (typeof window.fetch !== "function" || typeof window.Response !== "function") return;

    const upstreamFetch = window.fetch.bind(window);

    const matchingCss = `
<style id="duduq-year2-matching-density-hotfix">
.duduq-matching-board[data-pair-count="4"] .duduq-matching-column{gap:clamp(5px,.8vh,8px)!important}
.duduq-matching-board[data-pair-count="4"] .duduq-matching-card{height:clamp(58px,7.8vh,68px)!important;min-height:58px!important;padding-block:5px!important}
.duduq-matching-board[data-pair-count="4"][data-has-visual="true"] .duduq-matching-media{width:clamp(44px,5vw,54px)!important;height:clamp(44px,5vw,54px)!important}
.duduq-matching-board[data-pair-count="4"][data-has-visual="true"] .duduq-matching-color{width:clamp(42px,4.8vw,52px)!important;height:clamp(42px,4.8vw,52px)!important}
.duduq-matching-board[data-pair-count="4"]{padding-block:10px!important;margin-bottom:0!important}
.duduq-matching-board[data-pair-count="4"] .duduq-matching-column-title{min-height:18px!important;font-size:12px!important}
.duduq-matching-surface:has(.duduq-matching-board[data-pair-count="4"]) .duduq-matching-instruction{margin-top:6px!important;margin-bottom:10px!important;min-height:50px!important}
.duduq-matching-surface:has(.duduq-matching-board[data-pair-count="4"]) .duduq-matching-action-slot{min-height:54px!important;padding:7px 0 5px!important}
.duduq-matching-board:is([data-pair-count="5"],[data-pair-count="6"]) .duduq-matching-column{gap:4px!important}
.duduq-matching-board:is([data-pair-count="5"],[data-pair-count="6"]) .duduq-matching-card{height:50px!important;min-height:50px!important;padding-block:3px!important}
.duduq-matching-board:is([data-pair-count="5"],[data-pair-count="6"])[data-has-visual="true"] .duduq-matching-media{width:40px!important;height:40px!important}
.duduq-matching-board:is([data-pair-count="5"],[data-pair-count="6"]) .duduq-matching-column-title{min-height:16px!important;font-size:11px!important}
.duduq-matching-surface:has(.duduq-matching-board:is([data-pair-count="7"],[data-pair-count="8"],[data-pair-count="9"],[data-pair-count="10"])) .duduq-matching-board{max-height:calc(100vh - 150px)!important;overflow-y:auto!important;overscroll-behavior:contain}
@media (min-width:900px) and (max-height:700px){
 .duduq-matching-board[data-pair-count="4"] .duduq-matching-card{height:54px!important;min-height:54px!important}
 .duduq-matching-board[data-pair-count="4"] .duduq-matching-column{gap:4px!important}
 .duduq-matching-board[data-pair-count="4"][data-has-visual="true"] .duduq-matching-media{width:42px!important;height:42px!important}
 .duduq-matching-surface:has(.duduq-matching-board[data-pair-count="4"]) .duduq-matching-instruction{margin-bottom:7px!important;min-height:46px!important}
}
</style>`;

    window.fetch = function year2MechanicsRegressionFetch(input, init) {
      return upstreamFetch(input, init).then(async (response) => {
        const url = typeof input === "string" ? input : (input?.url || response.url || "");
        const textUrl = String(url);
        const isMatching = /\/DUDUQ_MATCHING\.html(?:\?|$)/i.test(textUrl);
        const isWordSlash = /\/DUDUQ_WORD_SLASH\.html(?:\?|$)/i.test(textUrl);
        const isBubblePop = /\/DUDUQ_BUBBLE_POP\.html(?:\?|$)/i.test(textUrl);
        if (!isMatching && !isWordSlash && !isBubblePop) return response;

        let html = await response.text();

        if (isMatching) {
          html = html.replace(
            'const layoutDensity = layoutPairCount <= 3 ? "comfortable" : layoutPairCount === 4 ? "balanced" : "compact";',
            'const layoutDensity = layoutPairCount <= 3 ? "comfortable" : "compact";'
          );
          if (!html.includes('id="duduq-year2-matching-density-hotfix"')) {
            html = html.replace("</head>", matchingCss + "\n</head>");
          }
        }

        if (isWordSlash) {
          html = html.replace(
            "const startY = arenaHeight + metrics.height + 12;",
            "const startY = Math.max(8, arenaHeight - metrics.height - 10);"
          );
          html = html.replace(
            '(presentation.initialObjectIds || []).forEach((id, index) => timers.push(schedule(() => spawnObject(id), 180 + index * 300)));',
            'const initialIds = presentation.initialObjectIds || []; if (initialIds.length) initialIds.forEach((id, index) => timers.push(schedule(() => spawnObject(id), 90 + index * 220))); else timers.push(schedule(() => spawnObject(), 90));'
          );
        }

        if (isBubblePop) {
          html = html.replace(
            "const source = assets[bubble.imageAssetKey];",
            'const source = assets[bubble.imageAssetKey] || (/^(?:https?:|data:image\\/)/i.test(String(bubble.imageAssetKey || "")) ? bubble.imageAssetKey : null);'
          );
        }

        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers
        });
      });
    };

    window.__DUDUQ_YEAR2_MECHANICS_REGRESSION_FETCH_PATCH__ = VERSION;
  }

  function buildModule(config) {
    installRuntimeFetchPatches();
    const built = originalBuild(config);
    const sourceIds = (config.items || []).map((item) => item.id);
    const questions = allQuestions(built).map(clone);
    const audit = {
      version: VERSION,
      scope: "YEAR2_MECHANICS_REGRESSION_ONLY",
      wordSlashValidated: [],
      wordSlashFallbacks: [],
      sanitizedText: [],
      targetUnique: [],
      targetFallbacks: [],
      bubbleUpgraded: [],
      bubbleAssetFailures: [],
      matchingCompact: []
    };

    for (const question of questions) {
      hardenWordSlash(question, audit);
      upgradeBubbleImages(question, audit);
      dedupeTargetShooter(question, audit);
      annotateMatching(question, audit);
      sanitizeQuestionText(question, audit);
    }

    const finalIds = questions.map((question) => question.id);
    const idsPreserved = sourceIds.length === finalIds.length && sourceIds.every((id, index) => id === finalIds[index]);
    if (!idsPreserved) {
      throw new Error("[DuduQ Year2 Mechanics Hotfix] IDs/order changed.");
    }

    const sourceById = new Map((config.items || []).map((item) => [item.id, item]));
    for (const question of questions) {
      const source = sourceById.get(question.id);
      if (!source) throw new Error(`${question.id}: source item missing.`);
      if (String(question?.metadata?.sourceAnswerV23) !== String(source.answer)) {
        throw new Error(`${question.id}: source answer changed.`);
      }
    }

    if (audit.bubbleAssetFailures.length) {
      throw new Error(`[DuduQ Year2 Mechanics Hotfix] Bubble Pop sem conjunto completo de imagens: ${audit.bubbleAssetFailures.join(", ")}`);
    }

    const activities = regroup(built, questions);
    const mechanicDistribution = distribution(activities);
    const frozenAudit = Object.freeze({ ...audit, idsPreserved: true, sourceAnswersPreserved: true });

    return Object.freeze({
      ...built,
      version: VERSION,
      activities,
      mechanicDistribution,
      mechanicsRegressionAudit: frozenAudit,
      audit: {
        ...(built.audit || {}),
        mechanicsRegression: frozenAudit,
        sourceItems: sourceIds.length,
        executableItems: finalIds.length,
        idsPreserved: true,
        pedagogicalContentChanged: false
      }
    });
  }

  installRuntimeFetchPatches();

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    version: VERSION,
    buildModule,
    __mechanicsRegressionHotfixApplied: true,
    mechanicsRegressionHotfixVersion: VERSION
  });

  console.info("[DuduQ Year2 Mechanics Hotfix] Camada registrada:", VERSION);
})();
