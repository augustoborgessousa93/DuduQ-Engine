/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP
   Adaptador da mecânica Drag & Drop para o Schema DuduQ.
   Versão 1.0.1
   ========================================================= */

(function () {
  "use strict";

  if (!window.DuduQ) {
    console.error("[DuduQ Drag & Drop] duduq-host.js precisa ser carregado antes.");
    return;
  }

  const MECHANIC_ID = "drag-drop";
  const VERSION = "1.0.1";
  const RUNTIME_VERSION = "1.2.0";
  const BRIDGE_VERSION = "1.0.0";

  /* =======================================================
     UTILITÁRIOS
     ======================================================= */

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const result = String(value).trim();
    return result || fallback;
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE).replace(/\/$/, "");
    }
    return ".";
  }

  function makeSerializable(value) {
    if (value == null) return value;
    try {
      if (typeof structuredClone === "function") return structuredClone(value);
    } catch (_) {}
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function slugify(value, fallback = "item") {
    const normalized = asString(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || fallback;
  }

  function uniqueId(base, usedIds) {
    const cleanBase = slugify(base, "item");
    let candidate = cleanBase;
    let suffix = 2;
    while (usedIds.has(candidate)) {
      candidate = `${cleanBase}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(candidate);
    return candidate;
  }

  function difficultyToNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(1, Math.min(3, Math.round(value)));
    }
    switch (String(value || "").trim().toLowerCase()) {
      case "medium": return 2;
      case "hard": return 3;
      default: return 1;
    }
  }

  function normalizeLocale(value, fallback = "pt-BR") {
    const locale = asString(value, fallback);
    const aliases = {
      en: "en-US",
      "en-us": "en-US",
      "en-gb": "en-GB",
      pt: "pt-BR",
      "pt-br": "pt-BR",
      es: "es-ES",
      "es-es": "es-ES"
    };
    return aliases[locale.toLowerCase()] || locale;
  }

  function createSafeContext(context = {}) {
    return {
      engineVersion: context.engineVersion ?? null,
      moduleId: context.moduleId ?? null,
      year: context.year ?? null,
      subject: context.subject ?? null,
      module: context.module ?? null,
      stepId: context.stepId ?? null,
      stepIndex: context.stepIndex ?? null,
      totalSteps: context.totalSteps ?? null
    };
  }

  /* =======================================================
     LEITURA DO PAYLOAD
     ======================================================= */

  function isLegacyDragDropContent(value) {
    if (!isObject(value)) return false;
    const nested = isObject(value.payload) ? value.payload : value;
    return Array.isArray(nested.items) && nested.items.length > 0 &&
      Array.isArray(nested.targets) && nested.targets.length > 0;
  }

  function extractContentList(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    if (isLegacyDragDropContent(payload)) return [payload];
    if (Array.isArray(payload.questions)) return payload.questions;
    if (Array.isArray(payload.stages)) return payload.stages;
    if (Array.isArray(payload.contents)) return payload.contents;
    if (Array.isArray(payload.entries)) return payload.entries;
    return [payload];
  }

  /* =======================================================
     ASSETS
     ======================================================= */

  function createAssetRegistry(initialAssets) {
    const assets = {};
    const usedKeys = new Set();

    if (isObject(initialAssets)) {
      Object.entries(initialAssets).forEach(([key, value]) => {
        if (typeof value === "string" && value.trim()) {
          assets[key] = value;
          usedKeys.add(key);
        }
      });
    }

    function register(prefix, id, src) {
      const safeSrc = asString(src);
      if (!safeSrc) return null;
      const base = `${slugify(prefix, "asset")}-${slugify(id, "media")}`;
      if (assets[base] === safeSrc) return base;
      const key = uniqueId(base, usedKeys);
      assets[key] = safeSrc;
      return key;
    }

    return { assets, register };
  }

  /* =======================================================
     REFERÊNCIAS CANÔNICAS
     ======================================================= */

  function findAlternative(alternatives, reference) {
    if (!Array.isArray(alternatives)) return null;
    let raw = reference;
    if (isObject(reference)) {
      raw = reference.id ?? reference.value ?? reference.text ?? reference.label ?? null;
    }
    if (raw === null || raw === undefined) return null;

    const value = String(raw).trim();
    let match = alternatives.find((item) => String(item.id) === value);
    if (match) return match;

    const normalized = value.toLowerCase();
    match = alternatives.find((item) =>
      String(item.text || "").trim().toLowerCase() === normalized
    );
    return match || null;
  }

  function buildTargetDescriptorBank(metadata) {
    const bank = new Map();
    if (!isObject(metadata) || !Array.isArray(metadata.targets)) return bank;

    metadata.targets.forEach((entry, index) => {
      if (!isObject(entry)) return;
      const id = asString(entry.id || entry.key || entry.value, `target-${index + 1}`);
      bank.set(id, { ...entry, id });
    });
    return bank;
  }

  function normalizeTargetReference(reference, descriptorBank, index) {
    if (isObject(reference)) {
      const id = asString(
        reference.id || reference.key || reference.value ||
        reference.text || reference.label,
        `target-${index + 1}`
      );
      return { ...(descriptorBank.get(id) || {}), ...reference, id };
    }

    const raw = asString(reference, `target-${index + 1}`);
    if (descriptorBank.has(raw)) return { ...descriptorBank.get(raw), id: raw };
    return { id: slugify(raw, `target-${index + 1}`), label: raw };
  }

  function parsePairEntry(entry) {
    if (Array.isArray(entry) && entry.length >= 2) {
      return { source: entry[0], target: entry[1] };
    }
    if (!isObject(entry)) return null;

    const source = entry.source ?? entry.sourceId ?? entry.item ?? entry.itemId ??
      entry.left ?? entry.leftId ?? entry.from ?? entry.alternative ?? entry.alternativeId;
    const target = entry.target ?? entry.targetId ?? entry.right ?? entry.rightId ??
      entry.to ?? entry.category ?? entry.categoryId ?? entry.destination ?? entry.destinationId;

    if (source === undefined || target === undefined) return null;
    return { source, target };
  }

  function parsePairs(answerValue) {
    if (Array.isArray(answerValue)) return answerValue.map(parsePairEntry).filter(Boolean);
    if (!isObject(answerValue)) return [];
    const singlePair = parsePairEntry(answerValue);
    if (singlePair) return [singlePair];
    return Object.entries(answerValue).map(([source, target]) => ({ source, target }));
  }

  /* =======================================================
     MÍDIA CANÔNICA → RUNTIME
     ======================================================= */

  function alternativeToItemBase(alternative, assetRegistry, question) {
    const item = { id: asString(alternative.id, "item") };
    const label = asString(alternative.text);
    if (label) item.label = label;

    const image = isObject(alternative.image) ? alternative.image : {};
    if (image.enabled && image.src) {
      const assetKey = assetRegistry.register("item", item.id, image.src);
      if (assetKey) item.imageAssetKey = assetKey;
      item.alt = asString(image.alt, label || item.id);
    }

    const metadata = isObject(alternative.metadata) ? alternative.metadata : {};
    if (metadata.imageAssetKey) item.imageAssetKey = asString(metadata.imageAssetKey);

    const audio = isObject(alternative.audio) ? alternative.audio : {};
    if (audio.enabled && audio.text) {
      item.spokenText = asString(audio.text);
      item.speechLocale = normalizeLocale(audio.language || question.languages?.content, "en-US");
      item.audioDescription = asString(
        metadata.audioDescription,
        label ? `Áudio de ${label}` : "Reproduzir áudio"
      );
    } else if (metadata.spokenText) {
      item.spokenText = asString(metadata.spokenText);
      item.speechLocale = normalizeLocale(
        metadata.speechLocale || question.languages?.content,
        "en-US"
      );
      item.audioDescription = asString(metadata.audioDescription, "Reproduzir áudio");
    }

    return item;
  }

  function descriptorToTarget(descriptor, assetRegistry, question, index) {
    const target = { id: asString(descriptor.id, `target-${index + 1}`) };
    const label = asString(
      descriptor.text || descriptor.label || descriptor.title || descriptor.name
    );
    if (label) target.label = label;

    const image = isObject(descriptor.image) ? descriptor.image : {};
    const imageSrc = image.src || descriptor.imageSrc || descriptor.imageUrl || null;
    if (imageSrc) {
      const assetKey = assetRegistry.register("target", target.id, imageSrc);
      if (assetKey) target.imageAssetKey = assetKey;
      target.alt = asString(image.alt || descriptor.alt, label || target.id);
    }
    if (descriptor.imageAssetKey) target.imageAssetKey = asString(descriptor.imageAssetKey);

    const audio = isObject(descriptor.audio) ? descriptor.audio : {};
    const spokenText = audio.text || descriptor.spokenText || null;
    if (spokenText) {
      target.spokenText = asString(spokenText);
      target.speechLocale = normalizeLocale(
        audio.language || descriptor.speechLocale || question.languages?.content,
        "en-US"
      );
      target.audioDescription = asString(
        descriptor.audioDescription,
        label ? `Áudio de ${label}` : "Reproduzir áudio"
      );
    }

    if (Number.isFinite(descriptor.capacity)) {
      target.capacity = Math.max(1, Math.round(descriptor.capacity));
    }
    return target;
  }

  /* =======================================================
     ANSWER TYPE: PAIRS
     ======================================================= */

  function adaptPairsQuestion(question, assetRegistry) {
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    const pairs = parsePairs(question.answer?.value);
    if (!pairs.length) {
      throw new Error(
        `Questão ${question.id}: answer.type "pairs" precisa informar os pares no gabarito.`
      );
    }

    const descriptorBank = buildTargetDescriptorBank(question.metadata);
    const targetDescriptors = new Map();
    const mapping = new Map();

    pairs.forEach((pair, index) => {
      const alternative = findAlternative(alternatives, pair.source);
      if (!alternative) {
        throw new Error(
          `Questão ${question.id}: não encontrei a alternativa referente a "${String(pair.source)}".`
        );
      }

      const descriptor = normalizeTargetReference(pair.target, descriptorBank, index);
      const targetId = asString(descriptor.id, `target-${index + 1}`);
      const previousTarget = mapping.get(alternative.id);
      if (previousTarget && previousTarget !== targetId) {
        throw new Error(
          `Questão ${question.id}: a alternativa ${alternative.id} aponta para mais de um destino.`
        );
      }

      mapping.set(alternative.id, targetId);
      if (!targetDescriptors.has(targetId)) {
        targetDescriptors.set(targetId, { ...descriptor, id: targetId });
      }
    });

    const missing = alternatives.filter((item) => !mapping.has(item.id));
    if (missing.length) {
      throw new Error(
        `Questão ${question.id}: todas as alternativas precisam participar do pareamento. ` +
        `Sem destino: ${missing.map((item) => item.id).join(", ")}.`
      );
    }

    const capacityCount = new Map();
    mapping.forEach((targetId) => {
      capacityCount.set(targetId, (capacityCount.get(targetId) || 0) + 1);
    });

    const targets = Array.from(targetDescriptors.values()).map((descriptor, index) => {
      const target = descriptorToTarget(descriptor, assetRegistry, question, index);
      if (!Number.isFinite(target.capacity)) {
        target.capacity = capacityCount.get(target.id) || 1;
      }
      return target;
    });

    const items = alternatives.map((alternative) => ({
      ...alternativeToItemBase(alternative, assetRegistry, question),
      targetId: mapping.get(alternative.id)
    }));

    const metadata = isObject(question.metadata) ? question.metadata : {};
    const hasCategory = targets.some((target) => target.capacity > 1);

    return {
      items,
      targets,
      behavior: {
        layout: asString(metadata.layout, hasCategory ? "categories" : "grid"),
        shuffleItems: metadata.shuffleItems !== false,
        shuffleTargets: metadata.shuffleTargets === true,
        smartSnap: true,
        instantValidation: false,
        lockCorrectItemsOnRetry: true,
        returnIncorrectItemsOnRetry: true
      },
      cognitivePhase: hasCategory ? "classification" : "association"
    };
  }

  /* =======================================================
     ANSWER TYPE: SEQUENCE
     ======================================================= */

  function adaptSequenceQuestion(question, assetRegistry) {
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    const order = Array.isArray(question.answer?.value) ? question.answer.value : [];
    if (!order.length) {
      throw new Error(
        `Questão ${question.id}: answer.type "sequence" precisa informar a ordem correta em answer.value.`
      );
    }

    const orderedAlternatives = order.map((reference) => {
      const alternative = findAlternative(alternatives, reference);
      if (!alternative) {
        throw new Error(
          `Questão ${question.id}: item da sequência não encontrado: ${String(reference)}.`
        );
      }
      return alternative;
    });

    const uniqueIds = new Set(orderedAlternatives.map((item) => item.id));
    if (uniqueIds.size !== alternatives.length || orderedAlternatives.length !== alternatives.length) {
      throw new Error(
        `Questão ${question.id}: a sequência precisa usar cada alternativa exatamente uma vez.`
      );
    }

    const metadata = isObject(question.metadata) ? question.metadata : {};
    const labels = Array.isArray(metadata.sequenceLabels) ? metadata.sequenceLabels : [];
    const targets = orderedAlternatives.map((_, index) => ({
      id: `position-${index + 1}`,
      label: asString(labels[index], `${index + 1}º`),
      capacity: 1
    }));

    const positionById = new Map();
    orderedAlternatives.forEach((item, index) => {
      positionById.set(item.id, `position-${index + 1}`);
    });

    const items = alternatives.map((alternative) => ({
      ...alternativeToItemBase(alternative, assetRegistry, question),
      targetId: positionById.get(alternative.id)
    }));

    return {
      items,
      targets,
      behavior: {
        layout: asString(metadata.layout, "sequence"),
        shuffleItems: metadata.shuffleItems !== false,
        shuffleTargets: false,
        smartSnap: true,
        instantValidation: false,
        lockCorrectItemsOnRetry: true,
        returnIncorrectItemsOnRetry: true
      },
      cognitivePhase: "ordering"
    };
  }

  /* =======================================================
     FORMATO LEGADO
     ======================================================= */

  function validateLegacyItemsAndTargets(id, items, targets) {
    const targetIds = new Set(
      targets.map((target) => asString(target?.id)).filter(Boolean)
    );
    if (targetIds.size !== targets.length) {
      throw new Error(`Conteúdo ${id}: os destinos precisam ter ids únicos.`);
    }

    items.forEach((item, index) => {
      if (!isObject(item)) throw new Error(`Conteúdo ${id}: item ${index + 1} inválido.`);
      if (!asString(item.id)) throw new Error(`Conteúdo ${id}: item ${index + 1} não possui id.`);
      const targetId = asString(item.targetId);
      if (!targetId || !targetIds.has(targetId)) {
        throw new Error(`Conteúdo ${id}: item ${item.id} aponta para um destino inexistente.`);
      }
    });
  }

  function adaptLegacyContent(rawContent, index) {
    const nested = isObject(rawContent.payload) ? rawContent.payload : rawContent;
    const id = asString(rawContent.id, `drag-drop-${index + 1}`);
    const items = Array.isArray(nested.items) ? nested.items : [];
    const targets = Array.isArray(nested.targets) ? nested.targets : [];
    validateLegacyItemsAndTargets(id, items, targets);

    return {
      id,
      version: asString(rawContent.version, "1.0.0"),
      schemaVersion: rawContent.schemaVersion ?? 1,
      title: asString(rawContent.title, `Drag & Drop ${index + 1}`),
      instruction: asString(
        rawContent.instruction || rawContent.prompt,
        "Arraste cada item até o destino correto."
      ),
      audioText: asString(
        rawContent.audioText || rawContent.instruction || rawContent.prompt,
        "Arraste cada item até o destino correto."
      ),
      learningObjective: asString(
        rawContent.learningObjective || rawContent.objective,
        "Relacionar itens aos destinos corretos."
      ),
      difficulty: difficultyToNumber(rawContent.difficulty),
      cognitivePhase: asString(rawContent.cognitivePhase, "association"),
      renderer: "drag-drop",
      mechanicVersion: RUNTIME_VERSION,
      masterMechanic: "smart-drag-drop",
      payload: {
        items: makeSerializable(items),
        targets: makeSerializable(targets),
        behavior: {
          ...(isObject(nested.behavior) ? makeSerializable(nested.behavior) : {}),
          smartSnap: nested.behavior?.smartSnap !== false,
          instantValidation: nested.behavior?.instantValidation === true,
          lockCorrectItemsOnRetry: nested.behavior?.lockCorrectItemsOnRetry !== false,
          returnIncorrectItemsOnRetry: nested.behavior?.returnIncorrectItemsOnRetry !== false
        }
      },
      feedback: {
        success: rawContent.feedback?.success || rawContent.feedback?.correct ||
          "Excelente! Todos os encaixes estão corretos.",
        retry: rawContent.feedback?.retry || rawContent.feedback?.incorrect ||
          "Observe as pistas e tente novamente."
      },
      sourceQuestionId: rawContent.id || null
    };
  }

  /* =======================================================
     QUESTÃO UNIVERSAL → DRAG & DROP
     ======================================================= */

  function adaptUniversalQuestion(rawQuestion, index, context, defaults, assetRegistry) {
    if (!window.DuduQSchema) throw new Error("DuduQSchema não está carregado.");

    const question = window.DuduQSchema.normalizeQuestion(rawQuestion, index, defaults);
    const validation = window.DuduQSchema.validateQuestion(question);
    if (!validation.valid) {
      throw new Error(`Questão ${question.id} inválida: ${validation.errors.join(" | ")}`);
    }
    if (validation.warnings?.length) {
      console.warn("[DuduQ Drag & Drop] Avisos da questão:", question.id, validation.warnings);
    }
    if (!question.alternatives?.length) {
      throw new Error(
        `Questão ${question.id}: Drag & Drop precisa de alternativas para formar os itens arrastáveis.`
      );
    }

    let adapted;
    if (question.answer.type === "pairs") {
      adapted = adaptPairsQuestion(question, assetRegistry);
    } else if (question.answer.type === "sequence") {
      adapted = adaptSequenceQuestion(question, assetRegistry);
    } else {
      throw new Error(
        `Questão ${question.id}: Drag & Drop universal aceita answer.type "pairs" ou "sequence". ` +
        `Recebido: "${question.answer.type}".`
      );
    }

    const metadata = isObject(question.metadata) ? question.metadata : {};
    const instruction = asString(
      question.instruction || question.statement,
      "Arraste cada item até o destino correto."
    );
    const audioText = question.media?.audio?.enabled && question.media.audio.text
      ? question.media.audio.text
      : instruction;

    return {
      id: question.id,
      version: "1.0.0",
      schemaVersion: 1,
      sourceSchemaVersion: question.schemaVersion,
      sourceQuestionId: question.id,
      title: asString(metadata.title || question.statement, `Drag & Drop ${index + 1}`),
      instruction,
      audioText,
      learningObjective: asString(
        question.skill?.description || metadata.learningObjective,
        "Relacionar itens aos destinos corretos."
      ),
      difficulty: difficultyToNumber(question.difficulty),
      cognitivePhase: adapted.cognitivePhase,
      gradeRange: {
        minimum: question.year || context.year || 1,
        maximum: question.year || context.year || 9
      },
      estimatedSeconds: Number.isFinite(metadata.estimatedSeconds) ? metadata.estimatedSeconds : 55,
      masterMechanic: "smart-drag-drop",
      renderer: "drag-drop",
      mechanicVersion: RUNTIME_VERSION,
      payload: {
        items: adapted.items,
        targets: adapted.targets,
        behavior: adapted.behavior
      },
      feedback: {
        success: question.feedback?.correct || "Excelente! Todos os encaixes estão corretos.",
        retry: question.feedback?.incorrect || "Observe as pistas e tente novamente."
      }
    };
  }

  /* =======================================================
     PAYLOAD COMPLETO → SCHEMA DA PONTE
     ======================================================= */

  function adaptPayload(payload, context = {}) {
    const source = isObject(payload) ? payload : {};
    const list = extractContentList(payload);
    if (!list.length) throw new Error("Nenhuma questão foi encontrada para o Drag & Drop.");

    const assetRegistry = createAssetRegistry(source.assets);
    const defaults = {
      subject: source.subject || context.subject,
      year: source.year ?? source.grade ?? context.year,
      module: source.module ?? context.module,
      contentLanguage: source.contentLanguage || source.language?.learningLanguage || "en",
      instructionLanguage: source.instructionLanguage || source.language?.interfaceLocale || "pt-BR",
      feedbackLanguage: source.feedbackLanguage || source.language?.interfaceLocale || "pt-BR"
    };

    const contents = list.map((rawContent, index) => {
      if (isLegacyDragDropContent(rawContent)) return adaptLegacyContent(rawContent, index);
      return adaptUniversalQuestion(rawContent, index, context, defaults, assetRegistry);
    });

    const firstUniversal = list.find((entry) => !isLegacyDragDropContent(entry));
    let firstQuestion = null;
    if (firstUniversal && window.DuduQSchema) {
      try {
        firstQuestion = window.DuduQSchema.normalizeQuestion(firstUniversal, 0, defaults);
      } catch (_) {}
    }

    const contentLanguage = firstQuestion?.languages?.content || defaults.contentLanguage || "en";
    const instructionLanguage = firstQuestion?.languages?.instruction || defaults.instructionLanguage || "pt-BR";
    const speechLanguage = firstQuestion?.media?.audio?.language || contentLanguage;
    const learningObjectives = contents.map((item) => item.learningObjective).filter(Boolean);
    const id = asString(
      source.lessonId || source.id || context.stepId,
      `drag-drop-${Date.now()}`
    );

    return {
      schemaVersion: 1,
      sourceSchemaVersion: window.DuduQSchema?.version || null,
      mechanicId: MECHANIC_ID,
      mechanicVersion: VERSION,
      runtimeVersion: RUNTIME_VERSION,
      bridgeVersion: BRIDGE_VERSION,
      id,
      lessonId: id,
      version: asString(source.version, "1.0.0"),
      title: asString(source.title || source.lessonTitle, "Drag & Drop"),
      description: asString(
        source.description,
        "Atividade Drag & Drop carregada pelo DuduQ Engine."
      ),
      grade: context.year ?? source.grade ?? source.year ?? 1,
      unitId: context.moduleId || source.unitId || id,
      language: {
        interfaceLocale: normalizeLocale(instructionLanguage, "pt-BR"),
        learningLanguage: normalizeLocale(contentLanguage, "en-US"),
        speechLocale: normalizeLocale(speechLanguage, "en-US")
      },
      learningObjectives: learningObjectives.length
        ? learningObjectives
        : ["Relacionar itens aos destinos corretos."],
      stages: contents,
      assets: assetRegistry.assets,
      progressPolicy: {
        enabled: false,
        storage: "local",
        resumeMode: "restart",
        saveWhen: "step-completed",
        resetCompletedLesson: true
      },
      feedbackPolicy: {
        allowRetry: true,
        advanceAfterCorrectMs: 1450,
        retryFeedbackDurationMs: 1000,
        showHintAfterErrors: 2,
        revealAnswerAfterErrors: 4,
        playSuccessSound: true,
        playRetrySound: true,
        celebrateLessonCompletion: true
      },
      navigationPolicy: {
        allowPreviousStep: false,
        allowStepSkipping: false,
        advanceMode: "automatic",
        showStepCounter: contents.length > 1
      },
      inactivityPolicy: {
        enabled: true,
        delayMs: 10000,
        action: "replay-instruction",
        maximumAutomaticReplays: 1
      },
      gamificationPolicy: {
        progressStyle: "duolingo",
        showProgressLabel: true,
        showTransition: true,
        transitionDurationMs: 760,
        showMascotDuringTransition: true,
        completionBurst: "subtle"
      }
    };
  }

  /* =======================================================
     VALIDAÇÃO
     ======================================================= */

  function validate(payload) {
    if (payload == null) return false;
    const list = extractContentList(payload);
    if (!list.length) return false;
    if (list.every(isLegacyDragDropContent)) return true;

    if (!window.DuduQSchema) {
      console.error(
        "[DuduQ Drag & Drop] Questões universais exigem core/duduq-schema.js."
      );
      return false;
    }

    return list.every((rawQuestion, index) => {
      if (isLegacyDragDropContent(rawQuestion)) return true;
      const question = window.DuduQSchema.normalizeQuestion(rawQuestion, index);
      const result = window.DuduQSchema.validateQuestion(question);
      return result.valid && question.alternatives?.length > 0 &&
        (question.answer.type === "pairs" || question.answer.type === "sequence");
    });
  }

  /* =======================================================
     MONTAGEM
     ======================================================= */

  function mount({ container, payload, options = {}, context = {}, onComplete }) {
    if (!container) throw new Error("[DuduQ Drag & Drop] Container não informado.");

    let adaptedSchema;
    try {
      adaptedSchema = adaptPayload(payload, context);
    } catch (error) {
      console.error("[DuduQ Drag & Drop] Falha ao adaptar conteúdo:", error);
      throw error;
    }

    const serializableSchema = makeSerializable(adaptedSchema);
    if (!serializableSchema) {
      throw new Error("[DuduQ Drag & Drop] Não foi possível serializar o conteúdo.");
    }

    const safeOptions = makeSerializable(options) || {};
    const safeContext = createSafeContext(context);
    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "duduq-mechanic-frame";
    Object.assign(wrapper.style, {
      width: "100%",
      minHeight: "100vh",
      position: "relative"
    });

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Drag & Drop";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    Object.assign(iframe.style, {
      width: "100%",
      height: "100vh",
      border: "0",
      display: "block",
      background: "transparent"
    });

    const params = new URLSearchParams();
    if (context.year) params.set("ano", String(context.year));
    if (context.moduleId) params.set("module", String(context.moduleId));
    params.set("engineAdapter", VERSION);
    params.set("bridge", BRIDGE_VERSION);
    iframe.src = `${getEngineBase()}/DUDUQ_DRAG_DROP.html?${params.toString()}`;

    const requestId = [
      "drag-drop",
      context.stepId || "step",
      Date.now(),
      Math.random().toString(36).slice(2, 8)
    ].join("-");
    const sessionId = [
      context.moduleId || "module",
      context.stepId || "step",
      Date.now()
    ].join(":");

    const results = [];
    let schemaAccepted = false;
    let initSent = false;
    let completed = false;
    let fallbackTimer = null;

    function sendContent() {
      if (initSent || !iframe.contentWindow) return;
      initSent = true;
      try {
        iframe.contentWindow.postMessage({
          channel: "duduq-mechanic",
          type: "duduq:mechanic:init",
          mechanicId: MECHANIC_ID,
          mechanicVersion: VERSION,
          runtimeVersion: RUNTIME_VERSION,
          bridgeVersion: BRIDGE_VERSION,
          requestId,
          sessionId,
          schema: serializableSchema,
          options: safeOptions,
          context: safeContext
        }, "*");

        console.info("[DuduQ Drag & Drop] Schema adaptado enviado para a mecânica.", {
          adapterVersion: VERSION,
          runtimeVersion: RUNTIME_VERSION,
          stages: serializableSchema.stages.length
        });
      } catch (error) {
        initSent = false;
        console.error("[DuduQ Drag & Drop] Falha ao enviar conteúdo:", error);
      }
    }

    function matchesThisSession(data) {
      if (!data || typeof data !== "object") return false;
      if (data.mechanicId && data.mechanicId !== MECHANIC_ID) return false;
      if (data.requestId && data.requestId !== requestId) return false;
      return true;
    }

    function handleMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!matchesThisSession(data)) return;
      const type = asString(data.type);

      if (type === "duduq:mechanic:ready") {
        console.info("[DuduQ Drag & Drop] Mecânica pronta.");
        sendContent();
        return;
      }

      if (type === "duduq:mechanic:schema-accepted") {
        schemaAccepted = true;
        console.info("[DuduQ Drag & Drop] Schema aceito pela ponte.", data.payload || null);
        return;
      }

      /* Ignora eventos do catálogo demonstrativo antes do schema externo. */
      if (!schemaAccepted) return;

      if (type === "duduq:mechanic:step") {
        console.info("[DuduQ Drag & Drop] Etapa interna:", data.payload || null);
        return;
      }

      if (type === "duduq:mechanic:result") {
        if (data.payload) results.push(makeSerializable(data.payload));
        console.info("[DuduQ Drag & Drop] Resultado recebido:", data.payload || null);
        return;
      }

      if (type === "duduq:mechanic:complete") {
        if (completed) return;
        completed = true;

        const lesson = data.payload?.lesson || {};
        const result = {
          completed: true,
          mechanic: MECHANIC_ID,
          adapterVersion: VERSION,
          runtimeVersion: RUNTIME_VERSION,
          lessonId: lesson.id || serializableSchema.lessonId,
          lessonVersion: lesson.version || serializableSchema.version,
          totalStages: lesson.totalStages || serializableSchema.stages.length,
          results: results.slice()
        };

        console.info("[DuduQ Drag & Drop] Mecânica concluída.", result);
        if (typeof onComplete === "function") onComplete(result);
        return;
      }

      if (type === "duduq:mechanic:error") {
        console.error(
          "[DuduQ Drag & Drop] Erro recebido da mecânica:",
          data.payload || data
        );
      }
    }

    window.addEventListener("message", handleMessage);

    iframe.addEventListener("load", function () {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      fallbackTimer = window.setTimeout(sendContent, 900);
    });

    wrapper.appendChild(iframe);
    container.appendChild(wrapper);

    return function destroy() {
      window.removeEventListener("message", handleMessage);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
      try { iframe.src = "about:blank"; } catch (_) {}
      iframe.remove();
      wrapper.remove();
    };
  }

  /* =======================================================
     REGISTRO
     ======================================================= */

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name: "Drag & Drop",
      category: "associacao-classificacao-ordenacao",
      active: true,
      acceptsSchema: "1.0.0",
      answerTypes: ["pairs", "sequence"],
      runtimeVersion: RUNTIME_VERSION,
      bridgeVersion: BRIDGE_VERSION,
      legacyPayload: true
    }
  });

  console.info("[DuduQ] Drag & Drop registrado:", VERSION);
})();
