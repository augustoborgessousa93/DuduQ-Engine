/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP
   CLEAN ARENA & CARD REFINEMENT 2.0.7

   PRINCIPIO:
   - adapter escrito do zero;
   - runtime visual derivado exclusivamente do Target Shooter 1.0.16;
   - nenhuma dependencia do Drag & Drop 1.x/2.0.0 anterior;
   - somente a dinamica interna da mecanica muda.
   ========================================================= */
(function () {
  "use strict";

  const MECHANIC_ID = "drag-drop";
  const VERSION = "2.0.7";
  const RUNTIME_VERSION = "target-shell-1.0.16-dd2";
  const RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.7/";

  if (!window.DuduQ || typeof window.DuduQ.registerMechanic !== "function") {
    console.error("[DuduQ Drag & Drop 2.0.7] duduq-host.js precisa ser carregado antes.");
    return;
  }

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function text(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized || fallback;
  }

  function clone(value) {
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

  function engineBase() {
    const base = window.DUDUQ_ENGINE_BASE ? String(window.DUDUQ_ENGINE_BASE) : ".";
    return base.replace(/\/$/, "");
  }

  function locale(value, fallback) {
    const raw = text(value, fallback);
    const map = {
      en: "en-US",
      "en-us": "en-US",
      "en-gb": "en-GB",
      pt: "pt-BR",
      "pt-br": "pt-BR",
      es: "es-ES",
      "es-es": "es-ES"
    };
    return map[raw.toLowerCase()] || raw;
  }

  function numericDifficulty(value) {
    if (Number.isFinite(Number(value))) {
      return Math.max(1, Math.min(3, Math.round(Number(value))));
    }
    const raw = text(value).toLowerCase();
    if (raw === "hard" || raw === "dificil" || raw === "difícil") return 3;
    if (raw === "medium" || raw === "medio" || raw === "médio") return 2;
    return 1;
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) return payload;
    if (!isObject(payload)) return [];
    for (const key of ["questions", "stages", "entries", "contents"]) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    if (payload.type || payload.answer || payload.payload || payload.items || payload.categories || payload.targets) {
      return [payload];
    }
    return [];
  }

  function createRegistry(initial) {
    const assets = {};
    if (isObject(initial)) {
      for (const [key, value] of Object.entries(initial)) {
        if (typeof value === "string" && value.trim()) assets[key] = value.trim();
      }
    }
    let serial = 0;
    function register(prefix, id, source) {
      const src = text(source);
      if (!src) return "";
      const root = `${prefix}-${text(id, "asset").replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
      let key = root;
      while (assets[key] && assets[key] !== src) {
        serial += 1;
        key = `${root}-${serial}`;
      }
      assets[key] = src;
      return key;
    }
    return { assets, register };
  }

  function flattenCatalog(source) {
    const catalog = new Map();
    const raw = source?.assetCatalog || source?.assetsCatalog || source?.catalog || source?.assets?.catalog;
    if (!isObject(raw)) return catalog;
    for (const [key, entry] of Object.entries(raw)) {
      if (typeof entry === "string") {
        catalog.set(key.toLowerCase(), { key, path: entry, aliases: [] });
        continue;
      }
      if (!isObject(entry)) continue;
      const path = text(entry.path || entry.src || entry.url);
      if (!path) continue;
      const aliases = Array.isArray(entry.aliases) ? entry.aliases.map(String) : [];
      const descriptor = { key, path, aliases };
      catalog.set(key.toLowerCase(), descriptor);
      for (const alias of aliases) catalog.set(String(alias).trim().toLowerCase(), descriptor);
    }
    return catalog;
  }

  function looksLikePath(value) {
    const raw = text(value);
    return /^(?:https?:|data:|blob:|\/|\.\/|\.\.\/)/i.test(raw) || /\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg|m4a)(?:[?#].*)?$/i.test(raw);
  }

  function catalogPath(reference, source, context, catalog) {
    const raw = text(reference);
    if (!raw) return "";
    if (looksLikePath(raw)) return raw;
    const found = catalog.get(raw.toLowerCase());
    if (found?.path) return found.path;

    try {
      const getter = window.DuduQAssets?.getContent;
      if (typeof getter === "function") {
        const resolved = getter(
          text(context.subject || source.subject, "english").toLowerCase(),
          context.year ?? source.year,
          context.module ?? source.module,
          raw
        );
        if (typeof resolved === "string" && resolved.trim()) return resolved.trim();
      }
    } catch (_) {}
    return "";
  }

  function resolveImage(value, source, context, catalog, registry, prefix, id) {
    if (!value) return { key: "", alt: "" };
    const descriptor = isObject(value) ? value : { src: value };
    const reference = descriptor.src || descriptor.url || descriptor.path || descriptor.asset || descriptor.name || descriptor.key;
    const path = catalogPath(reference, source, context, catalog);
    return {
      key: path ? registry.register(prefix, id, path) : text(descriptor.assetKey),
      alt: text(descriptor.alt || descriptor.description || descriptor.label)
    };
  }

  function resolveAudio(value, source, context, catalog, registry, prefix, id) {
    if (!value) return { key: "", spokenText: "", speechLocale: "", description: "" };
    const descriptor = isObject(value) ? value : { text: value };
    const reference = descriptor.src || descriptor.url || descriptor.path || descriptor.asset || descriptor.name || descriptor.key;
    const path = catalogPath(reference, source, context, catalog);
    return {
      key: path ? registry.register(prefix, id, path) : text(descriptor.assetKey),
      spokenText: text(descriptor.text || descriptor.spokenText || descriptor.label),
      speechLocale: locale(descriptor.language || descriptor.locale || descriptor.speechLocale, "en-US"),
      description: text(descriptor.description || descriptor.audioDescription || descriptor.label)
    };
  }

  function normalizeItem(raw, index, source, context, catalog, registry) {
    const item = isObject(raw) ? raw : { content: raw };
    const id = text(item.id || item.key, `item-${index + 1}`);
    const label = text(item.label || item.text || item.word || item.contentLabel || (typeof item.content === "string" && !looksLikePath(item.content) ? item.content : ""));
    const image = resolveImage(item.image || item.imageSrc || item.imageUrl || item.imageAsset || (isObject(item.content) ? item.content.image : ""), source, context, catalog, registry, "dd2-item-image", id);
    const audio = resolveAudio(item.audio || item.audioSrc || item.audioAsset || (isObject(item.content) ? item.content.audio : ""), source, context, catalog, registry, "dd2-item-audio", id);
    const normalized = {
      id,
      label: label || undefined,
      targetId: text(item.targetId || item.target || item.destination || item.category) || undefined,
      required: item.required !== false,
      sequenceIndex: Number.isInteger(item.sequenceIndex) ? item.sequenceIndex : undefined
    };
    if (image.key) normalized.imageAssetKey = image.key;
    if (image.alt || item.alt) normalized.alt = text(image.alt || item.alt, label || id);
    if (audio.key) normalized.audioAssetKey = audio.key;
    if (audio.spokenText || item.spokenText) normalized.spokenText = text(audio.spokenText || item.spokenText);
    if (normalized.spokenText) normalized.speechLocale = locale(item.speechLocale || audio.speechLocale, "en-US");
    if (normalized.audioAssetKey || normalized.spokenText) normalized.audioDescription = text(item.audioDescription || audio.description, label ? `Ouvir ${label}` : "Ouvir áudio");
    return normalized;
  }

  function normalizeTarget(raw, index, source, context, catalog, registry) {
    const target = isObject(raw) ? raw : { label: raw };
    const id = text(target.id || target.key || target.value, `target-${index + 1}`);
    const label = text(target.label || target.text || target.title || target.name || target.prompt);
    const image = resolveImage(target.image || target.imageSrc || target.imageUrl || target.imageAsset, source, context, catalog, registry, "dd2-target-image", id);
    const audio = resolveAudio(target.audio || target.audioSrc || target.audioAsset, source, context, catalog, registry, "dd2-target-audio", id);
    const normalized = {
      id,
      label: label || undefined,
      prompt: text(target.prompt) || undefined,
      kind: text(target.kind) || undefined,
      capacity: Number.isFinite(Number(target.capacity)) ? Math.max(1, Math.round(Number(target.capacity))) : undefined
    };
    if (image.key) normalized.imageAssetKey = image.key;
    if (image.alt || target.alt) normalized.alt = text(image.alt || target.alt, label || id);
    if (audio.key) normalized.audioAssetKey = audio.key;
    if (audio.spokenText || target.spokenText) normalized.spokenText = text(audio.spokenText || target.spokenText);
    if (normalized.spokenText) normalized.speechLocale = locale(target.speechLocale || audio.speechLocale, "en-US");
    if (normalized.audioAssetKey || normalized.spokenText) normalized.audioDescription = text(target.audioDescription || audio.description, label ? `Ouvir ${label}` : "Ouvir áudio do destino");
    return normalized;
  }

  function findAlternative(alternatives, reference) {
    const raw = isObject(reference)
      ? text(reference.id || reference.value || reference.text || reference.label)
      : text(reference);
    if (!raw) return null;
    const normalized = raw.toLowerCase();
    return alternatives.find((item) => text(item.id) === raw) ||
      alternatives.find((item) => text(item.text || item.label).toLowerCase() === normalized) ||
      null;
  }

  function pairEntry(raw) {
    if (Array.isArray(raw) && raw.length >= 2) return { source: raw[0], target: raw[1] };
    if (!isObject(raw)) return null;
    const source = raw.source ?? raw.sourceId ?? raw.item ?? raw.itemId ?? raw.left ?? raw.leftId ?? raw.from ?? raw.alternative ?? raw.alternativeId;
    const target = raw.target ?? raw.targetId ?? raw.right ?? raw.rightId ?? raw.to ?? raw.category ?? raw.categoryId ?? raw.destination ?? raw.destinationId;
    if (source === undefined || target === undefined) return null;
    return { source, target };
  }

  function pairList(value) {
    if (Array.isArray(value)) return value.map(pairEntry).filter(Boolean);
    if (!isObject(value)) return [];
    const single = pairEntry(value);
    if (single) return [single];
    return Object.entries(value).map(([source, target]) => ({ source, target }));
  }

  function adaptPairs(question, source, context, catalog, registry) {
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    const pairs = pairList(question.answer?.value || question.pairs);
    if (!pairs.length) throw new Error(`Questão ${text(question.id, "sem-id")}: pares não informados.`);

    const rawTargets = Array.isArray(question.metadata?.targets)
      ? question.metadata.targets
      : Array.isArray(question.targets)
        ? question.targets
        : [];
    const targetBank = new Map(rawTargets.map((target, index) => {
      const normalized = normalizeTarget(target, index, source, context, catalog, registry);
      return [normalized.id, normalized];
    }));

    const items = [];
    const usedTargets = new Map();
    for (const [index, pair] of pairs.entries()) {
      const rawItem = findAlternative(alternatives, pair.source);
      if (!rawItem) throw new Error(`Questão ${text(question.id, "sem-id")}: item ${String(pair.source)} não encontrado.`);
      const item = normalizeItem(rawItem, index, source, context, catalog, registry);
      const targetId = text(isObject(pair.target) ? pair.target.id || pair.target.key || pair.target.value : pair.target, `target-${index + 1}`);
      item.targetId = targetId;
      items.push(item);

      if (!usedTargets.has(targetId)) {
        if (targetBank.has(targetId)) {
          usedTargets.set(targetId, clone(targetBank.get(targetId)));
        } else {
          usedTargets.set(targetId, normalizeTarget(isObject(pair.target) ? pair.target : { id: targetId, label: targetId }, index, source, context, catalog, registry));
        }
      }
    }

    for (const alternative of alternatives) {
      if (items.some((item) => item.id === alternative.id)) continue;
      const distractor = normalizeItem(alternative, items.length, source, context, catalog, registry);
      distractor.required = false;
      delete distractor.targetId;
      items.push(distractor);
    }

    const capacities = new Map();
    for (const item of items) {
      if (!item.targetId) continue;
      capacities.set(item.targetId, (capacities.get(item.targetId) || 0) + 1);
    }
    const targets = Array.from(usedTargets.values()).map((target) => ({
      ...target,
      capacity: target.capacity || capacities.get(target.id) || 1,
      kind: target.kind || ((capacities.get(target.id) || 0) > 1 ? "category" : "box")
    }));

    return { items, targets, strategy: targets.some((target) => target.capacity > 1) ? "classification" : "association" };
  }

  function adaptSequence(question, source, context, catalog, registry) {
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : Array.isArray(question.items) ? question.items : [];
    const order = Array.isArray(question.answer?.value) ? question.answer.value : Array.isArray(question.order) ? question.order : [];
    if (!order.length) throw new Error(`Questão ${text(question.id, "sem-id")}: sequência não informada.`);
    const targetId = text(question.metadata?.sequenceTargetId || question.targetId, "sequence");
    const items = order.map((reference, index) => {
      const raw = findAlternative(alternatives, reference);
      if (!raw) throw new Error(`Questão ${text(question.id, "sem-id")}: item de sequência não encontrado.`);
      return {
        ...normalizeItem(raw, index, source, context, catalog, registry),
        targetId,
        sequenceIndex: index
      };
    });
    const target = normalizeTarget({
      id: targetId,
      label: question.metadata?.sequenceTitle || question.metadata?.targetLabel || question.targetLabel || "Monte a sequência",
      capacity: items.length,
      kind: "list"
    }, 0, source, context, catalog, registry);
    return { items, targets: [target], strategy: "sequence" };
  }

  function directCategorize(question, source, context, catalog, registry) {
    const rawTargets = Array.isArray(question.categories) ? question.categories : question.targets;
    const targets = (Array.isArray(rawTargets) ? rawTargets : []).map((target, index) => normalizeTarget(target, index, source, context, catalog, registry));
    const items = (Array.isArray(question.items) ? question.items : []).map((item, index) => normalizeItem(item, index, source, context, catalog, registry));
    const counts = new Map();
    items.forEach((item) => item.targetId && counts.set(item.targetId, (counts.get(item.targetId) || 0) + 1));
    targets.forEach((target) => {
      target.capacity = target.capacity || counts.get(target.id) || 1;
      target.kind = target.kind || "category";
    });
    return { items, targets, strategy: "classification" };
  }

  function directSentence(question, source, context, catalog, registry, completeOnly) {
    const rawTokens = Array.isArray(question.tokens) ? question.tokens : Array.isArray(question.items) ? question.items : [];
    const tokens = rawTokens.map((token, index) => isObject(token) ? token : { id: `token-${index + 1}`, label: String(token), value: String(token) });
    const rawAnswer = isObject(question.answer) && Array.isArray(question.answer.value) ? question.answer.value : question.answer;
    const expected = Array.isArray(question.order)
      ? question.order
      : Array.isArray(rawAnswer)
        ? rawAnswer
        : (typeof rawAnswer === "string" && rawAnswer.trim() ? [rawAnswer] : []);
    const targetId = completeOnly ? "sentence-gap" : "sentence-sequence";
    const normalizedTokens = tokens.map((token, index) => normalizeItem(token, index, source, context, catalog, registry));
    const orderReferences = expected.length ? expected : normalizedTokens.map((item) => item.id);
    const expectedIds = orderReferences.map((reference) => {
      const candidate = findAlternative(tokens, reference);
      return text(candidate?.id || reference);
    });
    normalizedTokens.forEach((item) => {
      const position = expectedIds.indexOf(item.id);
      item.targetId = position >= 0 ? targetId : undefined;
      item.required = position >= 0;
      item.sequenceIndex = position >= 0 ? position : undefined;
    });
    const label = completeOnly
      ? text(question.sentence || question.prompt || question.statement, "Complete a frase")
      : text(question.targetLabel, "Monte a frase");
    const target = normalizeTarget({ id: targetId, label, capacity: expectedIds.length || 1, kind: completeOnly ? "slot" : "list" }, 0, source, context, catalog, registry);
    return { items: normalizedTokens, targets: [target], strategy: completeOnly ? "slots" : "sequence" };
  }

  function directImageWord(question, source, context, catalog, registry, direction) {
    const entries = Array.isArray(question.items) ? question.items : [];
    const items = [];
    const targets = [];
    entries.forEach((entry, index) => {
      const id = text(entry.id, `pair-${index + 1}`);
      const targetId = `target-${id}`;
      const answer = text(entry.answer || entry.word || entry.text || entry.label);
      if (direction === "image-to-word") {
        targets.push(normalizeTarget({ id: targetId, image: entry.image, alt: entry.alt || answer, capacity: 1 }, index, source, context, catalog, registry));
        items.push(normalizeItem({ id: `item-${id}`, label: answer, targetId }, index, source, context, catalog, registry));
      } else {
        targets.push(normalizeTarget({ id: targetId, label: answer, capacity: 1 }, index, source, context, catalog, registry));
        items.push(normalizeItem({ id: `item-${id}`, image: entry.image, alt: entry.alt || answer, targetId }, index, source, context, catalog, registry));
      }
    });
    return { items, targets, strategy: "association" };
  }

  function directAudio(question, source, context, catalog, registry, responseKind) {
    const entries = Array.isArray(question.items) ? question.items : [];
    const items = [];
    const targets = [];
    entries.forEach((entry, index) => {
      const id = text(entry.id, `audio-${index + 1}`);
      const targetId = `audio-target-${id}`;
      targets.push(normalizeTarget({
        id: targetId,
        label: entry.promptLabel || "Ouça",
        audio: entry.audio || { text: entry.spokenText || entry.word || entry.answer, language: entry.language || "en-US" },
        capacity: 1,
        kind: "audio"
      }, index, source, context, catalog, registry));
      if (responseKind === "image") {
        items.push(normalizeItem({ id: `item-${id}`, image: entry.image, alt: entry.alt || entry.answer, targetId }, index, source, context, catalog, registry));
      } else {
        items.push(normalizeItem({ id: `item-${id}`, label: entry.answer || entry.word || entry.text, targetId }, index, source, context, catalog, registry));
      }
    });
    return { items, targets, strategy: "association" };
  }

  function adaptDirect(question, source, context, catalog, registry) {
    const mode = text(question.type || question.mode, "association").toLowerCase().replace(/_/g, "-");
    if (mode === "categorize" || mode === "classification" || mode === "categories") {
      return { ...directCategorize(question, source, context, catalog, registry), mode };
    }
    if (["build-sentence", "sentence-building", "word-order", "organize", "order", "sequence"].includes(mode)) {
      return { ...directSentence(question, source, context, catalog, registry, false), mode };
    }
    if (["complete-sentence", "sentence-completion"].includes(mode)) {
      return { ...directSentence(question, source, context, catalog, registry, true), mode };
    }
    if (["image-to-word", "image-to-text"].includes(mode)) {
      return { ...directImageWord(question, source, context, catalog, registry, "image-to-word"), mode };
    }
    if (["word-to-image", "text-to-image"].includes(mode)) {
      return { ...directImageWord(question, source, context, catalog, registry, "word-to-image"), mode };
    }
    if (["audio-to-word", "audio-word"].includes(mode)) {
      return { ...directAudio(question, source, context, catalog, registry, "word"), mode };
    }
    if (["audio-to-image", "audio-drag"].includes(mode)) {
      return { ...directAudio(question, source, context, catalog, registry, "image"), mode };
    }

    const targets = (Array.isArray(question.targets) ? question.targets : []).map((target, index) => normalizeTarget(target, index, source, context, catalog, registry));
    const items = (Array.isArray(question.items) ? question.items : []).map((item, index) => normalizeItem(item, index, source, context, catalog, registry));
    if (!targets.length || !items.length) throw new Error(`Questão ${text(question.id, "sem-id")}: itens e destinos são obrigatórios.`);
    const strategy = text(question.strategy, targets.some((target) => target.capacity > 1) ? "classification" : "association");
    return { items, targets, strategy, mode };
  }

  function buildStage(question, index, source, context, catalog, registry) {
    if (!isObject(question)) throw new Error(`Questão ${index + 1} inválida.`);

    const answerType = text(question.answer?.type).toLowerCase();
    let adapted;
    if (answerType === "pairs") {
      adapted = adaptPairs(question, source, context, catalog, registry);
    } else if (answerType === "sequence") {
      adapted = adaptSequence(question, source, context, catalog, registry);
    } else if (isObject(question.payload) && Array.isArray(question.payload.items) && Array.isArray(question.payload.targets)) {
      adapted = adaptDirect({ ...question, ...question.payload, type: question.payload.mode || question.type || question.mode }, source, context, catalog, registry);
    } else {
      adapted = adaptDirect(question, source, context, catalog, registry);
    }

    if (!adapted.items.length || !adapted.targets.length) throw new Error(`Questão ${text(question.id, index + 1)} sem itens ou destinos.`);

    const requiredItems = adapted.items.filter((item) => item.required !== false);
    if (!requiredItems.length) throw new Error(`Questão ${text(question.id, index + 1)} precisa de ao menos um item obrigatório.`);

    const targetIds = new Set(adapted.targets.map((target) => target.id));
    for (const item of requiredItems) {
      if (!item.targetId || !targetIds.has(item.targetId)) {
        throw new Error(`Questão ${text(question.id, index + 1)}: item ${item.id} sem destino válido.`);
      }
    }

    const instructionAudio = isObject(question.audio) ? question.audio : isObject(question.media?.audio) ? question.media.audio : {};
    const instructionAudioResolved = resolveAudio(instructionAudio, source, context, catalog, registry, "dd2-instruction-audio", text(question.id, index + 1));
    const instruction = text(question.instruction || question.prompt || question.statement, "Arraste cada item até o destino correto.");

    return {
      id: text(question.id, `drag-drop-${index + 1}`),
      title: text(question.metadata?.title || question.statement || question.title, `Drag & Drop ${index + 1}`),
      instruction,
      audioText: text(instructionAudioResolved.spokenText || instructionAudio.text, instruction),
      instructionAudioAssetKey: instructionAudioResolved.key || undefined,
      instructionLocale: locale(instructionAudio.language || question.instructionLanguage, "pt-BR"),
      mode: text(adapted.mode || question.metadata?.mode || question.type || question.mode, "association"),
      strategy: text(adapted.strategy, "association"),
      difficulty: numericDifficulty(question.difficulty),
      items: adapted.items,
      targets: adapted.targets,
      behavior: {
        shuffleItems: question.metadata?.shuffleItems !== false && question.behavior?.shuffleItems !== false,
        shuffleTargets: question.metadata?.shuffleTargets === true || question.behavior?.shuffleTargets === true,
        lockCorrectItemsOnRetry: true,
        returnIncorrectItemsOnRetry: true,
        snapCorrectItems: true,
        rejectWrongDrop: true
      },
      feedback: {
        success: text(question.feedback?.correct || question.feedback?.success, "Muito bem! Atividade concluída."),
        retry: text(question.feedback?.incorrect || question.feedback?.retry, "Observe novamente e tente outra vez."),
        hint: text(question.feedback?.hint || question.hint)
      }
    };
  }

  function systemAssets() {
    const assets = window.DuduQAssets?.assets || window.DUDUQ_ASSETS || {};
    return {
      mascotIdle: assets.mascots?.idle || "",
      mascotCorrect: assets.mascots?.correct || assets.mascots?.success || "",
      mascotError: assets.mascots?.error || assets.mascots?.retry || "",
      mascotComplete: assets.mascots?.complete || "",
      soundCorrect: assets.sounds?.correct || "",
      soundError: assets.sounds?.error || ""
    };
  }

  function buildRuntimeConfig(payload, context) {
    const source = isObject(payload) ? payload : {};
    const questions = extractQuestions(payload);
    if (!questions.length) throw new Error("Nenhuma questão encontrada para o novo Drag & Drop.");
    const catalog = flattenCatalog(source);
    const registry = createRegistry(source.assets);
    const stages = questions.map((question, index) => buildStage(question, index, source, context, catalog, registry));
    return {
      schemaVersion: 2,
      mechanic: MECHANIC_ID,
      mechanicVersion: VERSION,
      runtimeVersion: RUNTIME_VERSION,
      id: text(source.id || context.stepId, `drag-drop-${Date.now()}`),
      version: text(source.version, "1.0.0"),
      title: text(source.title || context.stepTitle, "Drag & Drop"),
      language: {
        interfaceLocale: "pt-BR",
        learningLanguage: "en-US",
        speechLocale: "en-US"
      },
      stages,
      assets: registry.assets,
      systemAssets: systemAssets(),
      feedbackPolicy: {
        allowRetry: true,
        advanceAfterCorrectMs: 1100,
        playSuccessSound: true,
        playRetrySound: true
      }
    };
  }

  function validate(payload) {
    try {
      const questions = extractQuestions(payload);
      if (!questions.length) return false;
      return questions.every((question) => {
        if (!isObject(question)) return false;
        if (question.answer?.type === "pairs" || question.answer?.type === "sequence") return true;
        if (Array.isArray(question.payload?.items) && Array.isArray(question.payload?.targets)) return true;
        if (question.type || question.mode || (Array.isArray(question.items) && (Array.isArray(question.targets) || Array.isArray(question.categories)))) return true;
        return false;
      });
    } catch (_) {
      return false;
    }
  }

  function replaceConfig(html, config) {
    const marker = '<script id="targetShooterConfig" type="application/json">';
    const start = html.indexOf(marker);
    if (start < 0) throw new Error("[Drag & Drop 2.0.4] Configuração do shell Target Shooter não encontrada.");
    const bodyStart = start + marker.length;
    const end = html.indexOf("</script>", bodyStart);
    if (end < 0) throw new Error("[Drag & Drop 2.0.4] Fechamento da configuração não encontrado.");
    const json = JSON.stringify(config).replace(/</g, "\\u003c");
    return html.slice(0, bodyStart) + json + html.slice(end);
  }

  function stampContext(html, context) {
    if (context?.year == null) return html;
    const year = String(context.year);
    return html.replace(/<html([^>]*)>/i, (_, attrs) => `<html${attrs} data-duduq-ano="${year}" data-duduq-ano-ativo="${year}">`);
  }

  function syncChrome(doc, context, title) {
    if (!doc?.documentElement) return;
    if (context?.year != null) {
      doc.documentElement.setAttribute("data-duduq-ano", String(context.year));
      doc.documentElement.setAttribute("data-duduq-ano-ativo", String(context.year));
    }
    const heading = doc.querySelector(".duduq-engine-heading h1");
    if (heading && title && heading.textContent !== title) heading.textContent = title;

    const total = Number.isFinite(context?.totalSteps) ? Math.max(1, context.totalSteps) : null;
    const index = Number.isFinite(context?.stepIndex) ? Math.max(0, context.stepIndex) : null;
    if (total !== null && index !== null) {
      const current = Math.min(total, index + 1);
      const strong = doc.querySelector(".duduq-progress-copy strong");
      const progressLabel = `Etapa ${current} de ${total}`;
      if (strong && strong.textContent !== progressLabel) strong.textContent = progressLabel;
      const trail = doc.querySelector(".duduq-progress-trail");
      if (trail) {
        const completed = Math.max(0, Math.min(index, total));
        trail.style.setProperty("--lesson-progress", String(completed / total));
        trail.setAttribute("aria-valuemax", String(total));
        trail.setAttribute("aria-valuenow", String(completed));
        trail.setAttribute("aria-valuetext", `${completed} de ${total} etapas concluídas`);
      }
    }
  }

  function installChromeObserver(doc, context, title) {
    syncChrome(doc, context, title);
    if (!doc?.body || typeof MutationObserver !== "function") return () => {};
    const observer = new MutationObserver(() => syncChrome(doc, context, title));
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }

  function mount({ container, payload, context = {}, onComplete }) {
    if (!container) throw new Error("[DuduQ Drag & Drop 2.0.7] Container não informado.");

    const config = buildRuntimeConfig(payload, context);
    const serializable = clone(config);
    if (!serializable) throw new Error("[DuduQ Drag & Drop 2.0.7] Conteúdo não pôde ser serializado.");

    container.innerHTML = "";
    const frame = document.createElement("div");
    frame.className = "duduq-mechanic-frame duduq-drag-drop-v2-frame";
    Object.assign(frame.style, { width: "100%", height: "100%", minHeight: "0", overflow: "hidden", position: "relative" });

    const iframe = document.createElement("iframe");
    iframe.title = "DuduQ — Drag & Drop";
    iframe.setAttribute("allow", "autoplay; fullscreen");
    iframe.setAttribute("allowfullscreen", "");
    Object.assign(iframe.style, { width: "100%", height: "100%", minHeight: "0", border: "0", display: "block", background: "transparent" });

    frame.appendChild(iframe);
    container.appendChild(frame);

    let destroyed = false;
    let completed = false;
    let stopChrome = null;
    const results = [];

    function onMessage(event) {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (data?.type === "DUDUQ_DRAG_DROP_RESULT") {
        if (data.payload) results.push(clone(data.payload));
        return;
      }
      if (data?.type === "DUDUQ_DRAG_DROP_COMPLETE" && !completed) {
        completed = true;
        onComplete?.({
          completed: true,
          mechanic: MECHANIC_ID,
          adapterVersion: VERSION,
          runtimeVersion: RUNTIME_VERSION,
          totalStages: serializable.stages.length,
          results: results.slice()
        });
      }
    }

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", () => {
      if (destroyed) return;
      try {
        stopChrome?.();
        stopChrome = installChromeObserver(iframe.contentDocument, context, text(payload?.title, serializable.title));
      } catch (error) {
        console.warn("[DuduQ Drag & Drop 2.0.7] Não foi possível sincronizar o chrome do Target Shooter.", error);
      }
    });

    const runtimeUrl = `${engineBase()}${RELEASE_PATH}DUDUQ_DRAG_DROP.html?engineAdapter=${encodeURIComponent(VERSION)}`;
    fetch(runtimeUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status} ao carregar runtime.`);
        return response.text();
      })
      .then((html) => {
        if (destroyed) return;
        let prepared = replaceConfig(html, serializable);
        prepared = stampContext(prepared, context);
        prepared = prepared.replace("Preparando o Target Shooter…", "Preparando o Drag & Drop…");
        iframe.srcdoc = prepared;
      })
      .catch((error) => {
        console.error("[DuduQ Drag & Drop 2.0.7] Falha ao preparar runtime:", error);
        if (!destroyed) container.textContent = "Erro ao preparar a atividade Drag & Drop.";
      });

    return function destroy() {
      destroyed = true;
      stopChrome?.();
      window.removeEventListener("message", onMessage);
      try { iframe.src = "about:blank"; } catch (_) {}
      iframe.remove();
      frame.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name: "Drag & Drop",
      architecture: "target-shooter-shell-clean-rebuild",
      shellSource: "target-shooter@1.0.16",
      category: "pedagogical-drag-drop",
      answerTypes: ["pairs", "sequence", "data-driven-v2"],
      runtimeVersion: RUNTIME_VERSION,
      rebuiltFromScratch: true
    }
  });

  console.info("[DuduQ] Drag & Drop CLEAN REBUILD registrado:", VERSION);
})();
