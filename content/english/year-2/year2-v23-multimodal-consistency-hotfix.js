/* DUDUQ English Year 2 — v2.3 multimodal consistency hotfix
   Final Year-2-only post-process.
   - preserves IDs, sourceAnswerV23, order and pedagogical intent;
   - official Assets-DuduQ first, controlled semantic visual second;
   - prevents audio -> audio single-target Drag & Drop;
   - marks single-target choice so runtime validation happens only on CONFIRMAR;
   - diversifies complete Matching pools without changing the source answer.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 Multimodal Consistency] Factory v2.3 indisponível.");
    return;
  }
  if (factory.__multimodalConsistencyHotfixApplied) return;

  const VERSION = "2.3.4-multimodal-consistency-rc1";
  const originalBuild = factory.buildModule.bind(factory);
  const upstreamResolve = typeof factory.resolveYear2Visual === "function"
    ? factory.resolveYear2Visual.bind(factory)
    : null;

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function normalize(value) {
    return String(value == null ? "" : value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function sourceLabels(question) {
    const stored = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(stored) && stored.length) return stored.map(String);
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

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function svgData(key, icon, accent, detail) {
    const safeKey = String(key || "visual").replace(/[<>&]/g, "");
    const safeIcon = String(icon || "●").replace(/[<>&]/g, "");
    const safeDetail = String(detail || "").replace(/[<>&]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260" role="img" aria-label="${safeKey}">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="${accent}" stop-opacity=".18"/></linearGradient></defs>
      <rect x="8" y="8" width="344" height="244" rx="42" fill="url(#g)" stroke="${accent}" stroke-width="5"/>
      <circle cx="180" cy="124" r="78" fill="#fff" stroke="${accent}" stroke-width="4" opacity=".96"/>
      <text x="180" y="151" text-anchor="middle" font-family="Arial,Segoe UI Emoji,sans-serif" font-size="82" font-weight="800" fill="#17365d">${safeIcon}</text>
      ${safeDetail ? `<text x="180" y="224" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#365a7d">${safeDetail}</text>` : ""}
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function letterVisual(label) {
    const raw = String(label || "").trim().toUpperCase().replace(/[^A-Z]/g, "");
    if (!raw || raw.length > 4) return null;
    const chars = raw.split("");
    const positions = chars.length === 1 ? [180] : chars.length === 2 ? [130, 230] : chars.length === 3 ? [95, 180, 265] : [72, 144, 216, 288];
    const tiles = chars.map((char, index) =>
      `<g transform="translate(${positions[index] - 34} 88)"><rect width="68" height="76" rx="16" fill="#fff" stroke="#2c83cf" stroke-width="4"/><text x="34" y="53" text-anchor="middle" font-family="Arial,sans-serif" font-size="43" font-weight="900" fill="#17365d">${char}</text></g>`
    ).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260" role="img" aria-label="Letras ${chars.join(" ")}"><rect x="8" y="8" width="344" height="244" rx="42" fill="#f5fbff" stroke="#62a9e6" stroke-width="5"/>${tiles}<path d="M80 196h200" stroke="#a8cce9" stroke-width="5" stroke-linecap="round"/></svg>`;
    return {
      src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      status: "semantic-letter-card",
      visualKey: `letter-card:${raw}`,
      alt: `Cartão visual das letras ${chars.join(" ")}`
    };
  }

  function semanticPhrase(label) {
    const key = normalize(label);
    const entries = [
      [/^hi!?$|^hello!?$/, "👋", "#3c9ee8", "greeting-wave"],
      [/good morning/, "🌅", "#e8a53c", "morning-scene"],
      [/good afternoon/, "☀", "#e5ad2d", "afternoon-scene"],
      [/good night/, "☾", "#7469ce", "night-scene"],
      [/bye|goodbye|see you/, "👋", "#9a73d1", "farewell-scene"],
      [/im fine|i m fine|thanks|thank you/, "☺", "#55a967", "wellbeing-positive"],
      [/how are you/, "☺?", "#55a967", "wellbeing-question"],
      [/spell|alphabet/, "ABC", "#3587cf", "spelling"],
      [/what is your name|whats your name|my name/, "🏷", "#3b96c7", "name-badge"],
      [/how old|age|birthday/, "🎂", "#d8799a", "age-birthday"],
      [/where are you from|from where/, "⌖", "#4b9b7a", "place-origin"],
      [/friend/, "☺☺", "#4b9b7a", "friends"],
      [/school/, "⌂", "#6484c5", "school"],
      [/phone|number/, "☎", "#4a91be", "phone-number"]
    ];
    for (const [pattern, icon, accent, visualKey] of entries) {
      if (!pattern.test(key)) continue;
      return {
        src: svgData(key, icon, accent, ""),
        status: "semantic-scene",
        visualKey: `semantic:${visualKey}:${key}`,
        alt: `Representação visual de ${String(label)}`
      };
    }
    return null;
  }

  function upstreamVisual(label) {
    if (!upstreamResolve) return null;
    try {
      const visual = upstreamResolve(label);
      if (!visual?.src) return null;
      return {
        src: String(visual.src),
        status: String(visual.status || "resolved"),
        visualKey: String(visual.visualKey || visual.src),
        alt: String(visual.alt || label || "Imagem da alternativa")
      };
    } catch (_) {
      return null;
    }
  }

  function resolveByFragments(label) {
    const words = String(label || "").trim().split(/\s+/).filter(Boolean);
    for (let size = Math.min(words.length, 5); size >= 1; size -= 1) {
      for (let start = 0; start + size <= words.length; start += 1) {
        const fragment = words.slice(start, start + size).join(" ");
        const visual = upstreamVisual(fragment);
        if (visual) {
          return {
            ...visual,
            status: visual.status === "repository-asset" ? "repository-asset-fragment" : visual.status,
            visualKey: `${visual.visualKey}:fragment:${normalize(fragment)}`,
            alt: String(label)
          };
        }
      }
    }
    return null;
  }

  function resolveVisual(label, options = {}) {
    const direct = upstreamVisual(label);
    if (direct && options.forceSemanticVariant !== true) return direct;

    const raw = String(label || "").trim();
    const compactLetters = raw.replace(/[\s.\-–—]/g, "");
    if (/^[A-Z]{1,4}$/.test(compactLetters)) {
      const letter = letterVisual(compactLetters);
      if (letter) return letter;
    }

    const phrase = semanticPhrase(raw);
    if (phrase) return phrase;

    if (direct) return direct;
    return resolveByFragments(raw);
  }

  function uniqueVisuals(labels) {
    const used = new Set();
    return labels.map((label) => {
      let visual = resolveVisual(label);
      if (!visual) return null;
      let key = visual.visualKey || visual.src;
      if (used.has(key)) {
        const variant = resolveVisual(label, { forceSemanticVariant: true });
        if (variant && !used.has(variant.visualKey || variant.src)) visual = variant;
        key = visual.visualKey || visual.src;
      }
      if (used.has(key)) return null;
      used.add(key);
      return visual;
    });
  }

  function clearTargetVisual(target) {
    if (!target || typeof target !== "object") return;
    delete target.imageSrc;
    delete target.imageUrl;
    delete target.image;
    delete target.imageAssetKey;
    target.alt = "Área para soltar a resposta";
  }

  function singlePairChoice(question) {
    if (question?.delivery?.mechanic !== "drag-drop") return false;
    if (question?.metadata?.forceOwnActivity === true && /spell|sequence/i.test(String(question?.metadata?.interactionAdaptation?.runtimeFormat || ""))) return false;
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];
    return pairs.length === 1 && targets.length === 1 && (question.alternatives || []).length >= 2 && Number(targets[0]?.capacity || 1) === 1;
  }

  function hasAudioStimulus(question) {
    return question?.audio?.enabled === true || question?.metadata?.stimulusAudio?.enabled === true;
  }

  function hasImageStimulus(question) {
    return Boolean(
      (question?.image?.enabled && question?.image?.src) ||
      (question?.media?.image?.enabled && question?.media?.image?.src) ||
      (question?.stimulus?.image?.enabled && question?.stimulus?.image?.src)
    );
  }

  function markSingleTargetChoice(question, audit) {
    if (!singlePairChoice(question)) return;
    question.metadata = question.metadata || {};
    question.metadata.singleTargetChoice = true;
    question.metadata.confirmOnAnySelection = true;
    question.metadata.tapToPlace = true;
    question.metadata.replacePreviousChoice = true;
    question.metadata.hideCapacityBadge = true;
    question.metadata.interactionAdaptation = {
      ...(question.metadata.interactionAdaptation || {}),
      mode: "single-target-choice-year2",
      runtimeFormat: "Uma alternativa por vez; qualquer alternativa colocada libera CONFIRMAR; a validação ocorre somente após CONFIRMAR.",
      feedbackRule: "Erro: vermelho temporário, retorno à origem e nova tentativa. Acerto: feedback positivo e avanço."
    };
    const target = question.metadata.targets[0];
    target.kind = "single-choice";
    target.capacity = 1;
    target.compact = false;
    audit.singleTargetChoices.push(question.id);
  }

  function upgradeAudioDragDropToImages(question, audit) {
    if (!singlePairChoice(question) || !hasAudioStimulus(question) || hasImageStimulus(question)) return;
    if (question?.metadata?.optionPresentation === "MOVABLE_LETTERS_AFTER_FIRST_LISTEN") return;

    const labels = sourceLabels(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.length < 2) return;

    const visuals = uniqueVisuals(labels);
    if (!visuals.every(Boolean)) {
      question.metadata = question.metadata || {};
      question.metadata.multimodalChoiceAudit = {
        version: VERSION,
        status: "VISUAL_SET_INCOMPLETE",
        missing: labels.filter((_, index) => !visuals[index])
      };
      audit.dragDropVisualFailures.push(question.id);
      return;
    }

    alternatives.forEach((alternative, index) => {
      const label = labels[index];
      const visual = visuals[index];
      alternative.text = "";
      alternative.label = "";
      alternative.image = { enabled: true, src: visual.src, alt: visual.alt || label };
      alternative.imageSrc = visual.src;
      alternative.imageUrl = visual.src;
      if (alternative.audio) alternative.audio = { ...alternative.audio, enabled: false };
      alternative.metadata = {
        ...(alternative.metadata || {}),
        sourceWrittenLabel: label,
        writtenLabelVisibleBeforeAnswer: false,
        imageAssetKey: visual.src,
        smartAssetStatus: visual.status,
        multimodalRole: "DRAGGABLE_VISUAL"
      };
    });

    const target = question.metadata?.targets?.[0];
    clearTargetVisual(target);
    if (target) target.label = "ARRASTE A IMAGEM";
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.statement = "OUÇA E ARRASTE A IMAGEM";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "IMAGE_PRIMARY_DRAG_DROP_CHOICE";
    question.metadata.multimodalChoiceAudit = {
      version: VERSION,
      status: "AUDIO_TO_IMAGE",
      visualStatuses: visuals.map((visual) => visual.status),
      sourceAnswerPreserved: true
    };
    audit.dragDropAudioToImage.push(question.id);
  }

  function ensureTargetShooterVisuals(question, audit) {
    if (question?.delivery?.mechanic !== "target-shooter") return;
    const config = question?.metadata?.targetShooter;
    if (!Array.isArray(config?.items) || config.items.length < 2) return;
    const labels = sourceLabels(question);
    if (labels.length !== config.items.length) return;
    const visuals = uniqueVisuals(labels);
    if (!visuals.every(Boolean)) {
      audit.targetVisualFailures.push(question.id);
      return;
    }
    config.items = config.items.map((item, index) => ({
      ...item,
      label: "",
      image: visuals[index].src,
      imageSrc: visuals[index].src,
      imageUrl: visuals[index].src,
      alt: visuals[index].alt || labels[index],
      display: "image",
      visualStatus: visuals[index].status
    }));
    question.delivery = { ...(question.delivery || {}), allowImage: true };
    question.metadata.targetShooterSmartAssets = {
      version: VERSION,
      status: "COMPLETE",
      count: visuals.length,
      officialFirst: true
    };
    audit.targetVisualComplete.push(question.id);
  }

  function ensureBubbleVisuals(question, audit) {
    if (question?.delivery?.mechanic !== "bubble-pop") return;
    const labels = sourceLabels(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.length < 2) return;
    const visuals = uniqueVisuals(labels);
    if (!visuals.every(Boolean)) {
      audit.bubbleVisualFailures.push(question.id);
      return;
    }
    alternatives.forEach((alternative, index) => {
      alternative.metadata = {
        ...(alternative.metadata || {}),
        sourceWrittenLabel: labels[index],
        imageAssetKey: visuals[index].src,
        smartAssetStatus: visuals[index].status
      };
      alternative.image = { enabled: true, src: visuals[index].src, alt: visuals[index].alt || labels[index] };
    });
    question.delivery = { ...(question.delivery || {}), allowImage: true };
    question.metadata.bubbleSmartAssets = {
      version: VERSION,
      status: "COMPLETE",
      officialFirst: true,
      uniqueImages: visuals.length,
      directUrlAssetKeys: true
    };
    audit.bubbleVisualComplete.push(question.id);
  }

  function topicPool(module) {
    const pools = new Map();
    for (const question of allQuestions(module)) {
      const topic = String(question?.metadata?.topic || "GENERAL").toUpperCase();
      if (!pools.has(topic)) pools.set(topic, []);
      const pool = pools.get(topic);
      for (const label of sourceLabels(question)) {
        const key = normalize(label);
        if (!key || pool.some((entry) => entry.key === key)) continue;
        const visual = resolveVisual(label);
        if (!visual) continue;
        pool.push({ label: String(label), key, visual });
      }
    }
    return pools;
  }

  function diversifyMatching(module, audit) {
    const pools = topicPool(module);
    const previousByTopic = new Map();

    for (const question of allQuestions(module)) {
      if (question?.delivery?.mechanic !== "matching") continue;
      const matching = question?.metadata?.matching;
      if (!matching || !Array.isArray(matching.pairs) || matching.pairs.length < 2) continue;

      const topic = String(question?.metadata?.topic || "GENERAL").toUpperCase();
      const candidates = clone(pools.get(topic) || []);
      const correct = sourceAnswer(question);
      const correctKey = normalize(correct);
      const correctEntry = candidates.find((entry) => entry.key === correctKey) || (() => {
        const visual = resolveVisual(correct);
        return visual ? { label: correct, key: correctKey, visual } : null;
      })();
      if (!correctEntry) continue;

      const desired = matching.pairs.length;
      const originalKeys = new Set(sourceLabels(question).map(normalize));
      const previous = previousByTopic.get(topic) || new Set();
      const selected = [correctEntry];
      const usedKeys = new Set([correctEntry.key]);
      const usedVisuals = new Set([correctEntry.visual.visualKey || correctEntry.visual.src]);

      const ranked = candidates
        .filter((entry) => entry.key !== correctEntry.key)
        .sort((a, b) => {
          const score = (entry) =>
            (previous.has(entry.key) ? 10 : 0) +
            (originalKeys.has(entry.key) ? 0 : 2) +
            entry.key.localeCompare("");
          const delta = score(a) - score(b);
          return delta || a.key.localeCompare(b.key);
        });

      for (const entry of ranked) {
        if (selected.length >= desired) break;
        const visualKey = entry.visual.visualKey || entry.visual.src;
        if (usedKeys.has(entry.key) || usedVisuals.has(visualKey)) continue;
        usedKeys.add(entry.key);
        usedVisuals.add(visualKey);
        selected.push(entry);
      }

      if (selected.length < Math.min(desired, 2)) continue;
      const pairCount = Math.min(desired, selected.length);
      const final = selected.slice(0, pairCount);
      const assets = {};
      const leftItems = [];
      const rightItems = [];
      const pairs = [];
      final.forEach((entry, index) => {
        const assetKey = `diverse-asset-${index + 1}`;
        const leftId = `diverse-audio-${index + 1}`;
        const rightId = `diverse-visual-${index + 1}`;
        assets[assetKey] = entry.visual.src;
        leftItems.push({ id: leftId, spokenText: entry.label, speechLocale: "en-US", audioDescription: `Ouvir opção ${index + 1}` });
        rightItems.push({ id: rightId, imageAssetKey: assetKey, alt: entry.visual.alt || entry.label });
        pairs.push({ leftId, rightId });
      });

      const currentKeys = new Set(final.map((entry) => entry.key));
      const overlap = [...currentKeys].filter((key) => previous.has(key)).length;
      matching.mode = "audio-image";
      matching.leftTitle = "Ouça";
      matching.rightTitle = "Ligue à imagem";
      matching.assets = assets;
      matching.leftItems = leftItems;
      matching.rightItems = rightItems;
      matching.pairs = pairs;
      matching.behavior = {
        ...(matching.behavior || {}),
        shuffleLeft: pairCount > 2,
        shuffleRight: true,
        connectionMode: "1x1",
        allowUnpairedDistractors: false
      };
      question.metadata.matchingDiversity = {
        version: VERSION,
        topic,
        labels: final.map((entry) => entry.label),
        pairCount,
        overlapWithPrevious: overlap,
        overlapRatio: previous.size ? overlap / Math.max(1, pairCount) : 0,
        sourceAnswerIncluded: final.some((entry) => entry.key === correctKey)
      };
      previousByTopic.set(topic, currentKeys);
      audit.matchingDiversified.push({ id: question.id, topic, pairCount, overlap, labels: final.map((entry) => entry.label) });
    }
  }

  function syncActivityMechanics(module) {
    for (const activity of module.activities || []) {
      const mechanics = new Set((activity.questions || []).map((question) => question?.delivery?.mechanic).filter(Boolean));
      if (mechanics.size > 1) throw new Error(`${activity.id}: atividade mista após consistência multimodal.`);
      if (mechanics.size === 1) activity.mechanic = [...mechanics][0];
    }
  }

  function postProcess(module) {
    const audit = {
      version: VERSION,
      dragDropAudioToImage: [],
      dragDropVisualFailures: [],
      singleTargetChoices: [],
      targetVisualComplete: [],
      targetVisualFailures: [],
      bubbleVisualComplete: [],
      bubbleVisualFailures: [],
      matchingDiversified: []
    };

    for (const question of allQuestions(module)) {
      upgradeAudioDragDropToImages(question, audit);
      markSingleTargetChoice(question, audit);
      ensureTargetShooterVisuals(question, audit);
      ensureBubbleVisuals(question, audit);
    }
    diversifyMatching(module, audit);
    syncActivityMechanics(module);

    module.audit = { ...(module.audit || {}), multimodalConsistency: audit };
    return module;
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    resolveYear2VisualConsistent: resolveVisual,
    __multimodalConsistencyHotfixApplied: true,
    multimodalConsistencyVersion: VERSION
  });
})();
