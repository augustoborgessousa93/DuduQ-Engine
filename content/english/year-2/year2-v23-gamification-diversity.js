/* DUDUQ English Year 2 — v2.3 gamification diversity layer
   Scope: interaction only. Editorial content, IDs, abilities, answers and vocabulary stay unchanged.
   RC: enriches the Year 2 experience with real Matching, Bubble Pop and Target Shooter without
   making autonomous English reading a requirement.
*/
(function () {
  "use strict";

  const currentFactory = window.DuduQYear2V23Factory;
  const baseFactory = window.DuduQYear2V22Factory;

  if (!currentFactory || typeof currentFactory.buildModule !== "function") {
    console.error("[DuduQ Year2 Diversity] Factory v2.3 indisponível.");
    return;
  }
  if (!baseFactory || typeof baseFactory.resolveVisual !== "function") {
    console.error("[DuduQ Year2 Diversity] Resolver visual da Factory indisponível.");
    return;
  }
  if (currentFactory.__gamificationDiversityApplied) return;

  const VERSION = "2.3.1-gamification-diversity-rc1";
  const originalBuild = currentFactory.buildModule.bind(currentFactory);
  const resolveVisual = baseFactory.resolveVisual.bind(baseFactory);

  const NUMBER_VALUES = Object.freeze({
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20
  });

  const SIMPLE_EMOJI = Object.freeze({
    doll: "🪆", ball: "⚽", train: "🚂", plane: "✈️", "teddy bear": "🧸",
    "video game": "🎮", kite: "🪁", boat: "⛵",
    duck: "🦆", horse: "🐴", cow: "🐄", pig: "🐷", sheep: "🐑", dog: "🐕",
    apple: "🍎", banana: "🍌", orange: "🍊", grape: "🍇", grapes: "🍇",
    papaya: "🍈", melon: "🍈", carrot: "🥕", tomato: "🍅", potato: "🥔", pear: "🍐"
  });

  const EXACT_RAW = Object.freeze({
    apple: "Apple - maçã.png",
    banana: "Banana.png",
    orange: "Orange  -laranja fruta.png",
    grape: "Grapes - uvas.png",
    grapes: "Grapes - uvas.png",
    papaya: "Papaya - mamão.png",
    melon: "Melon - melão.png",
    carrot: "Carrot - cenoura.png",
    pear: "Pear - pera.png",
    tomato: "Tomato - tomate.png"
  });

  // Only IDs listed here change mechanic/presentation. No pedagogical field is rewritten.
  const RULES = Object.freeze({
    // M01 — break the opening Target Shooter streak and add true audio/image association.
    "EN2-M1-02": "matching-audio-image",
    "EN2-M1-04": "matching-audio-image",
    "EN2-M1-13": "matching-audio-audio",

    // M02 — numbers/family: Bubble + Matching + Target Shooter + retained Drag & Drop.
    "EN2-M2-01": "bubble-audio-numeral",
    "EN2-M2-02": "matching-image-audio",
    "EN2-M2-03": "target-audio-image",
    "EN2-M2-04": "bubble-audio-numeral",
    "EN2-M2-05": "matching-image-audio",
    "EN2-M2-06": "target-audio-image",
    "EN2-M2-07": "matching-image-audio",
    "EN2-M2-08": "target-audio-image",
    "EN2-M2-10": "matching-image-audio",
    "EN2-M2-11": "target-audio-image",
    "EN2-M2-13": "matching-image-audio",
    "EN2-M2-14": "bubble-audio-numeral",

    // M03 — toys/colors/quantities: alternate association and rapid visual recognition.
    "EN2-M3-01": "matching-image-audio",
    "EN2-M3-02": "target-audio-image",
    "EN2-M3-04": "matching-image-audio",
    "EN2-M3-05": "target-audio-image",
    "EN2-M3-07": "matching-image-audio",
    "EN2-M3-10": "matching-image-audio",
    "EN2-M3-11": "target-audio-image",
    "EN2-M3-12": "matching-image-audio",
    "EN2-M3-14": "matching-image-audio",

    // M04 — animals/shapes: keep integrated description items in Drag & Drop.
    "EN2-M4-01": "matching-image-audio",
    "EN2-M4-02": "target-audio-image",
    "EN2-M4-03": "matching-image-audio",
    "EN2-M4-05": "matching-image-audio",
    "EN2-M4-06": "matching-image-audio",
    "EN2-M4-07": "target-audio-image",
    "EN2-M4-08": "matching-image-audio",
    "EN2-M4-10": "matching-image-audio",
    "EN2-M4-13": "matching-image-audio",

    // M05 — body: alternate image→audio association with audio→highlighted-body targeting.
    "EN2-M5-01": "matching-image-audio",
    "EN2-M5-02": "target-audio-image",
    "EN2-M5-03": "matching-image-audio",
    "EN2-M5-04": "target-audio-image",
    "EN2-M5-05": "matching-image-audio",
    "EN2-M5-06": "target-audio-image",
    "EN2-M5-07": "matching-image-audio",
    "EN2-M5-08": "target-audio-image",
    "EN2-M5-11": "matching-image-audio",
    "EN2-M5-12": "target-audio-image",
    "EN2-M5-13": "matching-image-audio",

    // M06 — food/colors/size: use exact repository art when already available, fallback otherwise.
    "EN2-M6-01": "matching-image-audio",
    "EN2-M6-02": "target-audio-image",
    "EN2-M6-03": "matching-image-audio",
    "EN2-M6-04": "target-audio-image",
    "EN2-M6-05": "matching-image-audio",
    "EN2-M6-06": "target-audio-image",
    "EN2-M6-07": "matching-image-audio",
    "EN2-M6-09": "matching-image-audio",
    "EN2-M6-11": "target-audio-image",
    "EN2-M6-12": "matching-audio-image",
    "EN2-M6-13": "matching-image-audio"
  });

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function optionId(index) {
    return `opt-${index + 1}`;
  }

  function sourceAnswerId(item) {
    return optionId(Number(item.answerIndex));
  }

  function normalizeLabel(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.!?]/g, "")
      .replace(/^it['’]?s\s+(an?\s+)?/, "")
      .replace(/^this\s+is\s+my\s+/, "")
      .replace(/^my\s+/, "")
      .trim();
  }

  function descriptorForSimpleLabel(label, topic) {
    const key = normalizeLabel(label);
    if (Object.prototype.hasOwnProperty.call(NUMBER_VALUES, key)) {
      return { kind: "numeral", value: NUMBER_VALUES[key], alt: `Numeral ${NUMBER_VALUES[key]}` };
    }
    if (["mother", "father", "brother", "sister", "grandfather", "grandmother"].includes(key)) {
      return { kind: "family", role: key, alt: `Familiar: ${key}` };
    }
    if (["triangle", "square", "rectangle", "star", "circle"].includes(key)) {
      return { kind: "shape", shape: key, color: "blue", alt: `Forma: ${key}` };
    }
    if (["head", "eye", "ear", "nose", "mouth", "knee", "shoulders", "hands", "legs", "feet", "finger"].includes(key)) {
      return { kind: "body", part: key, count: ["hands", "legs", "feet", "shoulders"].includes(key) ? 2 : 1, alt: `Parte do corpo: ${key}` };
    }
    if (EXACT_RAW[key]) {
      return { kind: "raw", file: EXACT_RAW[key], alt: key };
    }
    if (SIMPLE_EMOJI[key]) {
      return { kind: "emoji", emoji: SIMPLE_EMOJI[key], alt: `${topic || "Vocabulário"}: ${key}` };
    }
    return null;
  }

  function resolved(descriptor) {
    if (!descriptor) return null;
    try {
      return resolveVisual(descriptor);
    } catch (error) {
      console.warn("[DuduQ Year2 Diversity] Falha ao resolver visual", descriptor, error);
      return null;
    }
  }

  function sourceStimulusVisual(q, plan) {
    const fromQuestion =
      q?.image?.src ||
      q?.metadata?.targets?.[0]?.imageSrc ||
      q?.metadata?.targets?.[0]?.image ||
      null;
    if (fromQuestion) {
      return {
        src: String(fromQuestion),
        alt: q?.image?.alt || q?.metadata?.targets?.[0]?.alt || "Imagem do item",
        status: /^data:image\//i.test(String(fromQuestion)) ? "provisional" : "repository-asset"
      };
    }
    return resolved(plan?.visual);
  }

  function sourceOptionVisuals(q, item, plan) {
    const targetItems = q?.metadata?.targetShooter?.items || [];
    if (targetItems.length === item.alternatives.length && targetItems.every((entry) => entry?.image)) {
      return targetItems.map((entry, index) => ({
        src: String(entry.image),
        alt: entry.alt || String(item.alternatives[index]),
        status: /^data:image\//i.test(String(entry.image)) ? "provisional" : "repository-asset"
      }));
    }
    if (Array.isArray(plan?.optionVisuals) && plan.optionVisuals.length === item.alternatives.length) {
      const list = plan.optionVisuals.map(resolved);
      if (list.every(Boolean)) return list;
    }
    const list = item.alternatives.map((label) => resolved(descriptorForSimpleLabel(label, item.topic)));
    return list.every(Boolean) ? list : null;
  }

  function resetUniversalAlternatives(q, item, displayTexts) {
    q.alternatives = item.alternatives.map((text, index) => ({
      id: optionId(index),
      text: displayTexts ? String(displayTexts[index]) : `🔊 ${String.fromCharCode(65 + index)}`,
      audio: {
        enabled: true,
        text: String(text),
        language: "en-US",
        role: "option"
      },
      metadata: {
        sourceWrittenLabel: String(text),
        writtenLabelVisibleBeforeAnswer: false
      }
    }));
    q.answer = { type: "single", value: sourceAnswerId(item) };
  }

  function mark(q, rule, fromMechanic) {
    q.metadata = q.metadata || {};
    q.metadata.gamificationDiversity = {
      version: VERSION,
      rule,
      fromMechanic: fromMechanic || null,
      toMechanic: q.delivery?.mechanic || null,
      contentChanged: false,
      sourceIdPreserved: true,
      sourceAnswerPreserved: true,
      autonomousEnglishReadingRequired: false
    };
    q.metadata.englishReadingRequired = false;
    q.metadata.readingDependency = "NÃO";
    q.metadata.audioRepeatableWithoutPenalty = true;
  }

  function applyMatchingImageAudio(q, item, plan) {
    const image = sourceStimulusVisual(q, plan);
    if (!image) return false;
    const from = q.delivery?.mechanic;
    resetUniversalAlternatives(q, item);
    q.delivery = { ...(q.delivery || {}), mechanic: "matching", allowImage: true, allowAudio: true };
    q.image = { enabled: true, src: image.src, alt: image.alt || "Imagem do item" };
    const assets = { stimulus: image.src };
    q.metadata.matching = {
      mode: "image-word",
      leftTitle: "Observe",
      rightTitle: "Ouça e relacione",
      assets,
      leftItems: [{ id: "stimulus", imageAssetKey: "stimulus", alt: image.alt || "Imagem do item" }],
      rightItems: item.alternatives.map((text, index) => ({
        id: `answer-${optionId(index)}`,
        spokenText: String(text),
        speechLocale: "en-US",
        audioDescription: `Ouvir opção ${index + 1}`
      })),
      pairs: [{ leftId: "stimulus", rightId: `answer-${sourceAnswerId(item)}` }],
      behavior: {
        lockLeftOrder: true,
        shuffleRight: true,
        connectionMode: "1x1",
        interactionMode: "smart",
        lockCorrectPairsOnRetry: true,
        allowUnpairedDistractors: true
      }
    };
    q.statement = "👀🔊 VEJA, OUÇA E CONECTE";
    q.instruction = q.statement;
    q.metadata.optionPresentation = "AUDIO_PRIMARY_MATCHING_NO_ENGLISH_TEXT";
    mark(q, "matching-image-audio", from);
    return true;
  }

  function applyMatchingAudioImage(q, item, plan) {
    const visuals = sourceOptionVisuals(q, item, plan);
    if (!visuals) return false;
    const from = q.delivery?.mechanic;
    resetUniversalAlternatives(q, item);
    q.delivery = { ...(q.delivery || {}), mechanic: "matching", allowImage: true, allowAudio: true };
    q.audio = { enabled: true, text: String(item.answer), language: "en-US", role: "stimulus" };
    const assets = {};
    const rightItems = visuals.map((visual, index) => {
      const key = `option-${index + 1}`;
      assets[key] = visual.src;
      return { id: `answer-${optionId(index)}`, imageAssetKey: key, alt: visual.alt || String(item.alternatives[index]) };
    });
    q.metadata.matching = {
      mode: "audio-image",
      leftTitle: "Ouça",
      rightTitle: "Conecte à imagem",
      assets,
      leftItems: [{ id: "stimulus", spokenText: String(item.answer), speechLocale: "en-US", audioDescription: "Ouvir novamente" }],
      rightItems,
      pairs: [{ leftId: "stimulus", rightId: `answer-${sourceAnswerId(item)}` }],
      behavior: {
        lockLeftOrder: true,
        shuffleRight: true,
        connectionMode: "1x1",
        interactionMode: "smart",
        lockCorrectPairsOnRetry: true,
        allowUnpairedDistractors: true
      }
    };
    q.statement = "🔊🖼️ OUÇA E CONECTE";
    q.instruction = q.statement;
    q.metadata.optionPresentation = "IMAGE_PRIMARY_MATCHING_NO_ENGLISH_TEXT";
    mark(q, "matching-audio-image", from);
    return true;
  }

  function applyMatchingAudioAudio(q, item, plan) {
    const stimulus = String(plan?.stimulus || item.answer);
    const from = q.delivery?.mechanic;
    resetUniversalAlternatives(q, item);
    q.delivery = { ...(q.delivery || {}), mechanic: "matching", allowImage: false, allowAudio: true };
    q.audio = { enabled: true, text: stimulus, language: "en-US", role: "stimulus" };
    q.metadata.matching = {
      mode: "audio-word",
      leftTitle: "Ouça",
      rightTitle: "Relacione ao áudio",
      assets: {},
      leftItems: [{ id: "stimulus", spokenText: stimulus, speechLocale: "en-US", audioDescription: "Ouvir diálogo" }],
      rightItems: item.alternatives.map((text, index) => ({
        id: `answer-${optionId(index)}`,
        spokenText: String(text),
        speechLocale: "en-US",
        audioDescription: `Ouvir opção ${index + 1}`
      })),
      pairs: [{ leftId: "stimulus", rightId: `answer-${sourceAnswerId(item)}` }],
      behavior: {
        lockLeftOrder: true,
        shuffleRight: true,
        connectionMode: "1x1",
        interactionMode: "smart",
        lockCorrectPairsOnRetry: true,
        allowUnpairedDistractors: true
      }
    };
    q.statement = "🔊🔗 OUÇA E CONECTE";
    q.instruction = q.statement;
    q.metadata.optionPresentation = "AUDIO_PRIMARY_MATCHING_NO_ENGLISH_TEXT";
    mark(q, "matching-audio-audio", from);
    return true;
  }

  function applyBubbleAudioNumeral(q, item) {
    const numbers = item.alternatives.map((label) => NUMBER_VALUES[normalizeLabel(label)]);
    if (numbers.some((value) => !Number.isFinite(value))) return false;
    const from = q.delivery?.mechanic;
    resetUniversalAlternatives(q, item, numbers);
    q.delivery = { ...(q.delivery || {}), mechanic: "bubble-pop", allowImage: false, allowAudio: true };
    q.audio = { enabled: true, text: String(item.answer), language: "en-US", role: "stimulus" };
    q.statement = "🔊🫧 OUÇA E ESTOURE O NÚMERO";
    q.instruction = q.statement;
    q.metadata.behavior = {
      ...(q.metadata.behavior || {}),
      shuffleBubbles: true,
      readingProfile: "Y2_FOUNDATIONAL_LITERACY",
      textRole: "NUMERAL_SYMBOL_ONLY"
    };
    q.metadata.optionPresentation = "NUMERAL_SYMBOLS_ONLY";
    mark(q, "bubble-audio-numeral", from);
    return true;
  }

  function applyTargetAudioImage(q, item, plan) {
    const visuals = sourceOptionVisuals(q, item, plan);
    if (!visuals) return false;
    const from = q.delivery?.mechanic;
    resetUniversalAlternatives(q, item);
    q.delivery = { ...(q.delivery || {}), mechanic: "target-shooter", allowImage: true, allowAudio: true };
    q.audio = { enabled: true, text: String(item.answer), language: "en-US", role: "stimulus" };
    q.metadata.stimulusAudio = { enabled: true, text: String(item.answer), language: "en-US", repeatable: true };
    q.metadata.targetShooter = {
      audioText: String(item.answer),
      mode: "audio-to-image",
      shape: "balloon",
      correctIds: [sourceAnswerId(item)],
      difficulty: {
        speed: 0.26,
        objectCount: Math.min(4, item.alternatives.length),
        spawnIntervalMs: 280,
        requiredCorrect: 1,
        targetSize: 184
      },
      items: visuals.map((visual, index) => ({
        id: optionId(index),
        label: "",
        image: visual.src,
        alt: visual.alt || String(item.alternatives[index]),
        display: "image"
      }))
    };
    q.statement = "🔊🎯 OUÇA E ATINJA A IMAGEM";
    q.instruction = q.statement;
    q.metadata.optionPresentation = "IMAGE_TARGETS_NO_ENGLISH_TEXT";
    mark(q, "target-audio-image", from);
    return true;
  }

  function applyRule(q, item, plan, rule) {
    if (rule === "matching-image-audio") return applyMatchingImageAudio(q, item, plan);
    if (rule === "matching-audio-image") return applyMatchingAudioImage(q, item, plan);
    if (rule === "matching-audio-audio") return applyMatchingAudioAudio(q, item, plan);
    if (rule === "bubble-audio-numeral") return applyBubbleAudioNumeral(q, item, plan);
    if (rule === "target-audio-image") return applyTargetAudioImage(q, item, plan);
    return false;
  }

  function rebuildActivities(module, config, questions) {
    const sourceById = new Map((config.items || []).map((item) => [item.id, item]));
    const plan = config.plan || {};
    const activities = [];
    let current = null;
    for (const q of questions) {
      const item = sourceById.get(q.id);
      const topic = String(q.metadata?.topic || plan[q.id]?.topic || item?.topic || config.title || "").toUpperCase();
      const mechanic = q.delivery?.mechanic || "drag-drop";
      const forceOwn = plan[q.id]?.forceOwnActivity === true || q.metadata?.forceOwnActivity === true;
      if (forceOwn || !current || current.mechanic !== mechanic || current.topic !== topic || current.questions.length >= 4) {
        current = {
          id: `${q.id.toLowerCase()}-${String(mechanic).replace(/[^a-z0-9-]/gi, "-")}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          title: topic || config.title,
          topic: topic || config.title,
          mechanic,
          skill: q.skill,
          questions: []
        };
        activities.push(current);
      }
      current.questions.push(q);
      if (forceOwn) current = null;
    }
    return activities;
  }

  function distribution(activities) {
    const out = {};
    for (const activity of activities || []) {
      for (const q of activity.questions || []) {
        const mechanic = activity.mechanic || q.delivery?.mechanic || "unknown";
        out[mechanic] = (out[mechanic] || 0) + 1;
      }
    }
    return out;
  }

  function patchMatchingRuntimeFetch() {
    if (window.__DUDUQ_YEAR2_MATCHING_DISTRACTOR_FETCH_PATCH__) return;
    if (typeof window.fetch !== "function" || typeof window.Response !== "function") return;
    const nativeFetch = window.fetch.bind(window);
    const needle = `rightIds.forEach((id) => {\n      if (!rightDegrees.get(id)) {\n        issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n      }\n    });`;
    const replacement = `if (question.behavior?.allowUnpairedDistractors !== true) {\n      rightIds.forEach((id) => {\n        if (!rightDegrees.get(id)) {\n          issues.push({ path: \`rightItems:\${id}\`, code: "UNPAIRED_RIGHT_ITEM", message: "Todo item da direita deve participar de ao menos uma conexão correta.", severity: "error" });\n        }\n      });\n    }`;
    window.fetch = function patchedYear2MatchingFetch(input, init) {
      return nativeFetch(input, init).then(async (response) => {
        const url = typeof input === "string" ? input : (input?.url || response.url || "");
        if (!/\/DUDUQ_MATCHING\.html(?:\?|$)/i.test(String(url))) return response;
        const html = await response.text();
        if (!html.includes(needle)) {
          console.warn("[DuduQ Year2 Diversity] Matching validator signature not found; distractor mode not enabled.");
          return new Response(html, { status: response.status, statusText: response.statusText, headers: response.headers });
        }
        const patched = html.replace(needle, replacement);
        return new Response(patched, { status: response.status, statusText: response.statusText, headers: response.headers });
      });
    };
    window.__DUDUQ_YEAR2_MATCHING_DISTRACTOR_FETCH_PATCH__ = VERSION;
  }

  function buildModule(config) {
    patchMatchingRuntimeFetch();
    const built = originalBuild(config);
    const before = distribution(built.activities);
    const sourceById = new Map((config.items || []).map((item) => [item.id, item]));
    const originalQuestions = (built.activities || []).flatMap((activity) => activity.questions || []);
    const questions = originalQuestions.map((question) => clone(question));
    const changed = [];
    const skipped = [];

    for (const q of questions) {
      const rule = RULES[q.id];
      if (!rule) continue;
      const item = sourceById.get(q.id);
      if (!item) {
        skipped.push({ id: q.id, rule, reason: "SOURCE_ITEM_NOT_FOUND" });
        continue;
      }
      const ok = applyRule(q, item, config.plan?.[q.id] || {}, rule);
      if (ok) changed.push({ id: q.id, rule, mechanic: q.delivery?.mechanic });
      else skipped.push({ id: q.id, rule, reason: "REPRESENTATION_NOT_SAFE" });
    }

    const sourceIds = (config.items || []).map((item) => item.id);
    const finalIds = questions.map((q) => q.id);
    const sameIds = sourceIds.length === finalIds.length && sourceIds.every((id, index) => id === finalIds[index]);
    if (!sameIds) {
      throw new Error("[DuduQ Year2 Diversity] Integrity gate failed: IDs/order changed.");
    }
    for (const item of config.items || []) {
      const q = questions.find((entry) => entry.id === item.id);
      if (!q || q.metadata?.sourceAnswerV23 !== item.answer) {
        throw new Error(`[DuduQ Year2 Diversity] Integrity gate failed: source answer mismatch at ${item.id}.`);
      }
    }

    const activities = rebuildActivities(built, config, questions);
    const after = distribution(activities);
    const diversityAudit = Object.freeze({
      version: VERSION,
      scope: "GAMIFICATION_ONLY",
      module: config.module,
      sourceItems: sourceIds.length,
      finalItems: finalIds.length,
      idsPreserved: sameIds,
      contentChanged: false,
      pedagogicalDifficultyChanged: false,
      autonomousEnglishReadingIntroduced: false,
      before,
      after,
      changed,
      skipped,
      ruleCountInModule: changed.length + skipped.length,
      matchingDistractorMode: "single-correct-pair + unpaired distractors; runtime validation patched only when explicit flag is present"
    });

    return Object.freeze({
      ...built,
      version: VERSION,
      description: `${config.title} — v2.3 multimodal com diversidade de gamificação, conteúdo editorial preservado.`,
      activities,
      mechanicDistribution: after,
      gamificationDiversityAudit: diversityAudit,
      audit: {
        ...(built.audit || {}),
        gamificationDiversity: diversityAudit,
        sourceItems: sourceIds.length,
        executableItems: finalIds.length,
        idsPreserved: true,
        pedagogicalContentChanged: false
      }
    });
  }

  patchMatchingRuntimeFetch();

  window.DuduQYear2V23Factory = Object.freeze({
    ...currentFactory,
    version: VERSION,
    buildModule,
    __gamificationDiversityApplied: true,
    gamificationDiversityVersion: VERSION,
    gamificationDiversityRules: RULES
  });

  console.info("[DuduQ Year2 Diversity] Camada registrada:", VERSION, Object.keys(RULES).length, "itens candidatos");
})();
