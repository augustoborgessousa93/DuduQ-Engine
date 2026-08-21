/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP
   Canonical Production Release 1.1.36
   Contrato externo: DuduQ Schema / answer pairs|sequence
   Runtime universal no shell Target Shooter: 2.10.0
   ========================================================= */

(function () {
  "use strict";

  const MECHANIC_ID = "drag-drop";
  const VERSION = "1.1.36";
  const RUNTIME_VERSION = "2.10.0";
  const BRIDGE_VERSION = "1.0.0";
  const RELEASE_PATH =
    "/engine/releases/mechanics/drag-drop/1.1.36/";

  if (!window.DuduQ) {
    console.error(
      "[DuduQ Drag & Drop 1.1.36] duduq-host.js precisa ser carregado antes."
    );
    return;
  }

  function isObject(value) {
    return (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    );
  }

  function asString(value, fallback = "") {
    if (value === null || value === undefined) {
      return fallback;
    }

    const text = String(value).trim();
    return text || fallback;
  }

  function clone(value) {
    if (value == null) return value;

    try {
      if (typeof structuredClone === "function") {
        return structuredClone(value);
      }
    } catch (_) {}

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return null;
    }
  }

  function getEngineBase() {
    if (window.DUDUQ_ENGINE_BASE) {
      return String(window.DUDUQ_ENGINE_BASE)
        .replace(/\/$/, "");
    }

    return ".";
  }

  function normalizeLocale(value, fallback) {
    const raw = asString(value, fallback);
    const aliases = {
      en: "en-US",
      "en-us": "en-US",
      "en-gb": "en-GB",
      pt: "pt-BR",
      "pt-br": "pt-BR",
      es: "es-ES",
      "es-es": "es-ES"
    };

    return aliases[raw.toLowerCase()] || raw;
  }

  function difficultyToNumber(value) {
    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return Math.max(
        1,
        Math.min(3, Math.round(value))
      );
    }

    switch (
      String(value || "")
        .trim()
        .toLowerCase()
    ) {
      case "medium":
        return 2;
      case "hard":
        return 3;
      default:
        return 1;
    }
  }

  function extractQuestions(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (!isObject(payload)) {
      return [];
    }

    if (
      Array.isArray(payload.items) &&
      Array.isArray(payload.targets)
    ) {
      return [payload];
    }

    for (const key of [
      "questions",
      "stages",
      "contents",
      "entries"
    ]) {
      if (Array.isArray(payload[key])) {
        return payload[key];
      }
    }

    return [payload];
  }

  function resolveSystemAssets(context) {
    const source =
      window.DuduQAssets?.assets ||
      window.DUDUQ_ASSETS ||
      {};

    const OFFICIAL_IMAGE =
      "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Imagens%20Ilustrativa/";

    const OFFICIAL_SOUND =
      "https://raw.githubusercontent.com/augustoborgessousa93/Assets-DuduQ/main/Efeitos%20sonoros/";

    const year =
      String(
        context?.year ??
        context?.moduleYear ??
        ""
      ).match(/[1-5]/)?.[0] || "";

    return {
      mascotIdle:
        source.mascots?.idle ||
        OFFICIAL_IMAGE + "DUDUQ_IDLE.png",

      mascotCorrect:
        source.mascots?.correct ||
        source.mascots?.success ||
        OFFICIAL_IMAGE + "DUDUQ_ACERTO.png",

      mascotError:
        source.mascots?.error ||
        source.mascots?.retry ||
        OFFICIAL_IMAGE + "DUDUQ_ERRO.png",

      soundClick:
        source.sounds?.click ||
        OFFICIAL_SOUND + "click.mp3",

      soundCorrect:
        source.sounds?.correct ||
        source.sounds?.feedbackCorrect ||
        OFFICIAL_SOUND + "correct.mp3",

      soundError:
        source.sounds?.error ||
        source.sounds?.feedbackError ||
        OFFICIAL_SOUND + "error.mp3",

      worldBackground:
        (
          year &&
          source.backgrounds?.[year]
        ) || ""
    };
  }

  function createAssetRegistry(initialAssets) {
    const assets = {};

    if (isObject(initialAssets)) {
      for (
        const [key, value]
        of Object.entries(initialAssets)
      ) {
        if (
          typeof value === "string" &&
          value.trim()
        ) {
          assets[key] = value.trim();
        }
      }
    }

    let serial = 0;

    function register(prefix, id, src) {
      const safeSrc = asString(src);
      if (!safeSrc) return "";

      const base =
        `${prefix}-${String(id || "asset")
          .replace(/[^a-zA-Z0-9_-]+/g, "-")}`;

      let key = base;

      while (
        assets[key] &&
        assets[key] !== safeSrc
      ) {
        serial += 1;
        key = `${base}-${serial}`;
      }

      assets[key] = safeSrc;
      return key;
    }

    return {
      assets,
      register
    };
  }

  function readAudioSource(audio) {
    if (!isObject(audio)) return "";

    return asString(
      audio.src ||
      audio.url ||
      audio.file ||
      audio.source
    );
  }

  function alternativeToItem(
    alternative,
    question,
    registry
  ) {
    const item = {
      id: asString(
        alternative?.id,
        `item-${Math.random()
          .toString(36)
          .slice(2, 7)}`
      )
    };

    const label = asString(
      alternative?.text ||
      alternative?.label
    );

    if (label) {
      item.label = label;
    }

    const image =
      isObject(alternative?.image)
        ? alternative.image
        : {};

    const metadata =
      isObject(alternative?.metadata)
        ? alternative.metadata
        : {};

    const imageSrc =
      image.src ||
      alternative?.imageSrc ||
      metadata.imageSrc ||
      "";

    if (imageSrc) {
      item.imageAssetKey =
        registry.register(
          "item",
          item.id,
          imageSrc
        );

      item.alt = asString(
        image.alt ||
        alternative?.alt ||
        metadata.alt,
        label || item.id
      );
    } else if (metadata.imageAssetKey) {
      item.imageAssetKey =
        asString(metadata.imageAssetKey);
    }

    const audio =
      isObject(alternative?.audio)
        ? alternative.audio
        : {};

    const spokenText =
      audio.text ||
      alternative?.spokenText ||
      metadata.spokenText ||
      "";

    if (spokenText) {
      item.spokenText =
        asString(spokenText);

      item.speechLocale =
        normalizeLocale(
          audio.language ||
          alternative?.speechLocale ||
          metadata.speechLocale ||
          question?.contentLanguage ||
          question?.languages?.content,
          "en-US"
        );

      item.audioDescription =
        asString(
          metadata.audioDescription ||
          alternative?.audioDescription,
          label
            ? `Ouvir ${label}`
            : "Ouvir áudio"
        );

      const audioSrc =
        readAudioSource(audio);

      if (audioSrc) {
        item.audioAssetKey =
          registry.register(
            "audio-item",
            item.id,
            audioSrc
          );
      }
    }

    return item;
  }

  function buildTargetBank(metadata) {
    const bank = new Map();

    if (
      !isObject(metadata) ||
      !Array.isArray(metadata.targets)
    ) {
      return bank;
    }

    metadata.targets.forEach(
      function (entry, index) {
        if (!isObject(entry)) return;

        const id = asString(
          entry.id ||
          entry.key ||
          entry.value,
          `target-${index + 1}`
        );

        bank.set(
          id,
          {
            ...clone(entry),
            id
          }
        );
      }
    );

    return bank;
  }

  function targetDescriptor(
    reference,
    bank,
    index
  ) {
    if (isObject(reference)) {
      const id = asString(
        reference.id ||
        reference.key ||
        reference.value ||
        reference.label ||
        reference.text,
        `target-${index + 1}`
      );

      return {
        ...(bank.get(id) || {}),
        ...clone(reference),
        id
      };
    }

    const raw = asString(
      reference,
      `target-${index + 1}`
    );

    if (bank.has(raw)) {
      return {
        ...clone(bank.get(raw)),
        id: raw
      };
    }

    return {
      id: raw,
      label: raw
    };
  }

  function descriptorToTarget(
    descriptor,
    question,
    registry,
    index
  ) {
    const target = {
      id: asString(
        descriptor?.id,
        `target-${index + 1}`
      )
    };

    const label = asString(
      descriptor?.label ||
      descriptor?.text ||
      descriptor?.title ||
      descriptor?.name
    );

    if (label) {
      target.label = label;
    }

    const image =
      isObject(descriptor?.image)
        ? descriptor.image
        : {};

    const imageSrc =
      image.src ||
      descriptor?.imageSrc ||
      descriptor?.imageUrl ||
      "";

    if (imageSrc) {
      target.imageAssetKey =
        registry.register(
          "target",
          target.id,
          imageSrc
        );

      target.alt =
        asString(
          image.alt ||
          descriptor?.alt,
          label || target.id
        );
    } else if (descriptor?.imageAssetKey) {
      target.imageAssetKey =
        asString(
          descriptor.imageAssetKey
        );
    }

    const audio =
      isObject(descriptor?.audio)
        ? descriptor.audio
        : {};

    const spokenText =
      audio.text ||
      descriptor?.spokenText ||
      "";

    if (spokenText) {
      target.spokenText =
        asString(spokenText);

      target.speechLocale =
        normalizeLocale(
          audio.language ||
          descriptor?.speechLocale ||
          question?.contentLanguage ||
          question?.languages?.content,
          "en-US"
        );

      target.audioDescription =
        asString(
          descriptor?.audioDescription,
          label
            ? `Ouvir ${label}`
            : "Ouvir áudio"
        );

      const audioSrc =
        readAudioSource(audio);

      if (audioSrc) {
        target.audioAssetKey =
          registry.register(
            "audio-target",
            target.id,
            audioSrc
          );
      }
    }

    target.capacity =
      Number.isFinite(
        Number(descriptor?.capacity)
      )
        ? Math.max(
            1,
            Math.round(
              Number(descriptor.capacity)
            )
          )
        : 1;

    return target;
  }

  function findAlternative(
    alternatives,
    reference
  ) {
    let value = reference;

    if (isObject(reference)) {
      value =
        reference.id ??
        reference.value ??
        reference.text ??
        reference.label;
    }

    const raw =
      asString(value);

    if (!raw) return null;

    const exact =
      alternatives.find(
        function (item) {
          return (
            String(item?.id) === raw
          );
        }
      );

    if (exact) return exact;

    const normalized =
      raw.toLowerCase();

    return (
      alternatives.find(
        function (item) {
          return (
            asString(
              item?.text ||
              item?.label
            )
              .toLowerCase() ===
            normalized
          );
        }
      ) || null
    );
  }

  function parsePair(entry) {
    if (
      Array.isArray(entry) &&
      entry.length >= 2
    ) {
      return {
        source: entry[0],
        target: entry[1]
      };
    }

    if (!isObject(entry)) {
      return null;
    }

    const source =
      entry.source ??
      entry.sourceId ??
      entry.item ??
      entry.itemId ??
      entry.left ??
      entry.leftId ??
      entry.from ??
      entry.alternative ??
      entry.alternativeId;

    const target =
      entry.target ??
      entry.targetId ??
      entry.right ??
      entry.rightId ??
      entry.to ??
      entry.category ??
      entry.categoryId ??
      entry.destination ??
      entry.destinationId;

    if (
      source === undefined ||
      target === undefined
    ) {
      return null;
    }

    return {
      source,
      target
    };
  }

  function parsePairs(value) {
    if (Array.isArray(value)) {
      return value
        .map(parsePair)
        .filter(Boolean);
    }

    if (!isObject(value)) {
      return [];
    }

    const single =
      parsePair(value);

    if (single) {
      return [single];
    }

    return Object
      .entries(value)
      .map(
        function ([source, target]) {
          return {
            source,
            target
          };
        }
      );
  }

  function getQuestionAudio(question) {
    const audio =
      isObject(question?.media?.audio)
        ? question.media.audio
        : isObject(question?.audio)
          ? question.audio
          : {};

    const text =
      asString(
        audio.text ||
        question?.instruction ||
        question?.statement
      );

    return {
      text,
      locale:
        normalizeLocale(
          audio.language ||
          question?.instructionLanguage ||
          question?.languages?.instruction,
          "pt-BR"
        ),
      src:
        readAudioSource(audio)
    };
  }

  function adaptPairs(
    question,
    registry
  ) {
    const alternatives =
      Array.isArray(question.alternatives)
        ? question.alternatives
        : [];

    const pairs =
      parsePairs(
        question.answer?.value
      );

    if (!pairs.length) {
      throw new Error(
        `Questão ${question.id}: pareamento sem pares.`
      );
    }

    const bank =
      buildTargetBank(
        question.metadata
      );

    const descriptors =
      new Map();

    const mapping =
      new Map();

    pairs.forEach(
      function (pair, index) {
        const alternative =
          findAlternative(
            alternatives,
            pair.source
          );

        if (!alternative) {
          throw new Error(
            `Questão ${question.id}: item ${String(pair.source)} não encontrado.`
          );
        }

        const descriptor =
          targetDescriptor(
            pair.target,
            bank,
            index
          );

        const targetId =
          asString(
            descriptor.id,
            `target-${index + 1}`
          );

        mapping.set(
          alternative.id,
          targetId
        );

        if (
          !descriptors.has(targetId)
        ) {
          descriptors.set(
            targetId,
            {
              ...descriptor,
              id: targetId
            }
          );
        }
      }
    );

    const missing =
      alternatives.filter(
        function (item) {
          return !mapping.has(item.id);
        }
      );

    if (missing.length) {
      throw new Error(
        `Questão ${question.id}: todos os itens precisam possuir destino.`
      );
    }

    const capacity =
      new Map();

    mapping.forEach(
      function (targetId) {
        capacity.set(
          targetId,
          (capacity.get(targetId) || 0) + 1
        );
      }
    );

    const targets =
      Array.from(
        descriptors.values()
      ).map(
        function (descriptor, index) {
          const target =
            descriptorToTarget(
              descriptor,
              question,
              registry,
              index
            );

          if (
            !Number.isFinite(
              Number(
                descriptor.capacity
              )
            )
          ) {
            target.capacity =
              capacity.get(target.id) || 1;
          }

          return target;
        }
      );

    const items =
      alternatives.map(
        function (alternative) {
          return {
            ...alternativeToItem(
              alternative,
              question,
              registry
            ),
            targetId:
              mapping.get(
                alternative.id
              )
          };
        }
      );

    const metadata =
      isObject(question.metadata)
        ? question.metadata
        : {};

    return {
      items,
      targets,
      behavior: {
        layout:
          asString(
            metadata.layout,
            targets.some(
              function (target) {
                return target.capacity > 1;
              }
            )
              ? "categories"
              : "grid"
          ),
        shuffleItems:
          metadata.shuffleItems !== false,
        shuffleTargets:
          metadata.shuffleTargets === true,
        smartSnap: true,
        instantValidation: false,
        lockCorrectItemsOnRetry: true,
        returnIncorrectItemsOnRetry: true
      },
      cognitivePhase: "association"
    };
  }

  function adaptSequence(
    question,
    registry
  ) {
    const alternatives =
      Array.isArray(question.alternatives)
        ? question.alternatives
        : [];

    const order =
      Array.isArray(
        question.answer?.value
      )
        ? question.answer.value
        : [];

    if (
      !order.length ||
      order.length !==
        alternatives.length
    ) {
      throw new Error(
        `Questão ${question.id}: sequência incompleta.`
      );
    }

    const ordered =
      order.map(
        function (reference) {
          const alternative =
            findAlternative(
              alternatives,
              reference
            );

          if (!alternative) {
            throw new Error(
              `Questão ${question.id}: item da sequência não encontrado.`
            );
          }

          return alternative;
        }
      );

    if (
      new Set(
        ordered.map(
          function (item) {
            return item.id;
          }
        )
      ).size !== alternatives.length
    ) {
      throw new Error(
        `Questão ${question.id}: a sequência deve usar cada item uma única vez.`
      );
    }

    const metadata =
      isObject(question.metadata)
        ? question.metadata
        : {};

    const sequenceTargetId =
      asString(
        metadata.sequenceTargetId,
        "sequence"
      );

    const targets = [
      {
        id: sequenceTargetId,
        label:
          asString(
            metadata.sequenceTitle ||
            metadata.targetLabel,
            "Monte a sequência"
          ),
        capacity: ordered.length,
        kind: "list"
      }
    ];

    const positionByItem =
      new Map();

    ordered.forEach(
      function (item, index) {
        positionByItem.set(
          item.id,
          index
        );
      }
    );

    const items =
      alternatives.map(
        function (alternative) {
          return {
            ...alternativeToItem(
              alternative,
              question,
              registry
            ),
            targetId:
              sequenceTargetId,
            sequenceIndex:
              positionByItem.get(
                alternative.id
              )
          };
        }
      );

    return {
      items,
      targets,
      behavior: {
        layout:
          asString(
            metadata.layout,
            "sequence"
          ),
        shuffleItems:
          metadata.shuffleItems !== false,
        shuffleTargets: false,
        smartSnap: true,
        instantValidation: false,
        lockCorrectItemsOnRetry: true,
        returnIncorrectItemsOnRetry: true
      },
      cognitivePhase: "ordering"
    };
  }

  function normalizeLegacyAssets(
    value,
    prefix,
    registry
  ) {
    const normalized =
      clone(value) || {};
    const image =
      isObject(normalized.image)
        ? normalized.image
        : {};
    const audio =
      isObject(normalized.audio)
        ? normalized.audio
        : {};
    const imageSrc =
      image.src ||
      normalized.imageSrc ||
      normalized.imageUrl ||
      "";
    const audioSrc =
      readAudioSource(audio) ||
      asString(normalized.audioSrc);

    if (
      imageSrc &&
      !normalized.imageAssetKey
    ) {
      normalized.imageAssetKey =
        registry.register(
          `${prefix}-image`,
          normalized.id,
          imageSrc
        );
      normalized.alt =
        asString(
          normalized.alt ||
          image.alt,
          normalized.label ||
          normalized.id
        );
    }

    if (
      audioSrc &&
      !normalized.audioAssetKey
    ) {
      normalized.audioAssetKey =
        registry.register(
          `${prefix}-audio`,
          normalized.id,
          audioSrc
        );
      normalized.audioDescription =
        asString(
          normalized.audioDescription,
          normalized.label
            ? `Ouvir ${normalized.label}`
            : "Ouvir áudio"
        );
    }

    delete normalized.imageSrc;
    delete normalized.imageUrl;
    delete normalized.audioSrc;

    return normalized;
  }

  function adaptLegacy(
    raw,
    index,
    registry
  ) {
    const nested =
      isObject(raw.payload)
        ? raw.payload
        : raw;

    const items =
      (clone(nested.items) || [])
        .map(function (item) {
          return normalizeLegacyAssets(
            item,
            "item",
            registry
          );
        });

    const targets =
      (clone(nested.targets) || [])
        .map(function (target) {
          return normalizeLegacyAssets(
            target,
            "target",
            registry
          );
        });

    const strategy =
      asString(
        nested.strategy ||
        raw.strategy,
        "association"
      );

    if (strategy === "sequence") {
      const nextIndexByTarget =
        new Map();

      items.forEach(
        function (item) {
          const targetId =
            asString(item.targetId);
          const nextIndex =
            nextIndexByTarget.get(
              targetId
            ) || 0;

          if (
            !Number.isInteger(
              item.sequenceIndex
            )
          ) {
            item.sequenceIndex =
              nextIndex;
          }

          nextIndexByTarget.set(
            targetId,
            nextIndex + 1
          );
        }
      );

      targets.forEach(
        function (target) {
          const assigned =
            items.filter(
              function (item) {
                return (
                  item.targetId ===
                  target.id
                );
              }
            ).length;

          target.capacity =
            Math.max(
              Number(target.capacity) || 1,
              assigned
            );
        }
      );
    }

    if (
      !items.length ||
      !targets.length
    ) {
      throw new Error(
        "Conteúdo legado do Drag & Drop incompleto."
      );
    }

    return {
      id:
        asString(
          raw.id,
          `drag-${index + 1}`
        ),
      title:
        asString(
          raw.title,
          `Drag & Drop ${index + 1}`
        ),
      instruction:
        asString(
          raw.instruction ||
          raw.prompt,
          "Arraste cada item até o destino correto."
        ),
      instructionAudio: {
        text:
          asString(
            raw.audioText ||
            raw.instruction ||
            raw.prompt,
            "Arraste cada item até o destino correto."
          ),
        locale: "pt-BR",
        src: ""
      },
      difficulty:
        difficultyToNumber(
          raw.difficulty
        ),
      cognitivePhase:
        asString(
          raw.cognitivePhase,
          "association"
        ),
      payload: {
        mode:
          asString(
            nested.mode ||
            raw.mode
          ) || undefined,
        strategy,
        items,
        targets,
        behavior: {
          ...(isObject(nested.behavior)
            ? clone(nested.behavior)
            : {}),
          smartSnap:
            nested.behavior?.smartSnap !== false,
          instantValidation:
            nested.behavior?.instantValidation === true,
          lockCorrectItemsOnRetry:
            nested.behavior
              ?.lockCorrectItemsOnRetry !== false,
          returnIncorrectItemsOnRetry:
            nested.behavior
              ?.returnIncorrectItemsOnRetry !== false
        }
      },
      feedback: {
        success:
          raw.feedback?.success ||
          raw.feedback?.correct ||
          "Excelente! Todos os encaixes estão corretos.",
        retry:
          raw.feedback?.retry ||
          raw.feedback?.incorrect ||
          "Observe as pistas e tente novamente."
      }
    };
  }

  function adaptQuestion(
    raw,
    index,
    context,
    registry
  ) {
    if (
      isObject(raw) &&
      Array.isArray(
        raw.payload?.items ||
        raw.items
      ) &&
      Array.isArray(
        raw.payload?.targets ||
        raw.targets
      )
    ) {
      return adaptLegacy(
        raw,
        index,
        registry
      );
    }

    let question = raw;

    if (
      window.DuduQSchema &&
      typeof window.DuduQSchema
        .normalizeQuestion ===
        "function"
    ) {
      try {
        question =
          window.DuduQSchema
            .normalizeQuestion(
              raw,
              index,
              {
                subject:
                  context.subject,
                year:
                  context.year,
                module:
                  context.module
              }
            );
      } catch (_) {
        question = raw;
      }
    }

    if (!isObject(question)) {
      throw new Error(
        `Questão ${index + 1} inválida.`
      );
    }

    const answerType =
      asString(
        question.answer?.type
      ).toLowerCase();

    const adapted =
      answerType === "pairs"
        ? adaptPairs(
            question,
            registry
          )
        : answerType === "sequence"
          ? adaptSequence(
              question,
              registry
            )
          : null;

    if (!adapted) {
      throw new Error(
        `Questão ${question.id || index + 1}: Drag & Drop aceita apenas pairs ou sequence.`
      );
    }

    const instruction =
      asString(
        question.instruction ||
        question.statement,
        "Arraste cada item até o destino correto."
      );

    const feedback =
      isObject(question.feedback)
        ? question.feedback
        : {};

    return {
      id:
        asString(
          question.id,
          `drag-${index + 1}`
        ),
      title:
        asString(
          question.metadata?.title ||
          question.statement,
          `Drag & Drop ${index + 1}`
        ),
      instruction,
      instructionAudio:
        getQuestionAudio(question),
      difficulty:
        difficultyToNumber(
          question.difficulty
        ),
      cognitivePhase:
        adapted.cognitivePhase,
      payload: {
        mode:
          asString(
            question.metadata?.mode
          ) || undefined,
        strategy:
          answerType === "sequence"
            ? "sequence"
            : asString(
                question.metadata?.strategy,
                "association"
              ),
        items: adapted.items,
        targets: adapted.targets,
        behavior:
          adapted.behavior
      },
      feedback: {
        success:
          feedback.correct ||
          feedback.success ||
          "Excelente! Todos os encaixes estão corretos.",
        retry:
          feedback.incorrect ||
          feedback.retry ||
          "Observe as pistas e tente novamente."
      }
    };
  }

  function adaptPayload(
    payload,
    context
  ) {
    const source =
      isObject(payload)
        ? payload
        : {};

    const questions =
      extractQuestions(payload);

    if (!questions.length) {
      throw new Error(
        "Nenhuma questão encontrada para Drag & Drop."
      );
    }

    const registry =
      createAssetRegistry(
        source.assets
      );

    const stages =
      questions.map(
        function (question, index) {
          return adaptQuestion(
            question,
            index,
            context,
            registry
          );
        }
      );

    return {
      schemaVersion: 1,
      mechanicId: MECHANIC_ID,
      mechanicVersion: VERSION,
      runtimeVersion:
        RUNTIME_VERSION,
      bridgeVersion:
        BRIDGE_VERSION,
      id:
        asString(
          source.id ||
          context.stepId,
          `drag-${Date.now()}`
        ),
      lessonId:
        asString(
          source.id ||
          context.stepId,
          `drag-${Date.now()}`
        ),
      version:
        asString(
          source.version,
          "1.0.0"
        ),
      title:
        asString(
          source.title,
          "Drag & Drop"
        ),
      language: {
        interfaceLocale: "pt-BR",
        learningLanguage: "en-US",
        speechLocale: "en-US"
      },
      stages,
      assets:
        registry.assets,
      systemAssets:
        resolveSystemAssets(context),
      feedbackPolicy: {
        allowRetry: true,
        advanceAfterCorrectMs: 1050,
        retryFeedbackDurationMs: 0
      }
    };
  }

  function validate(payload) {
    const questions =
      extractQuestions(payload);

    if (!questions.length) {
      return false;
    }

    return questions.every(
      function (question) {
        if (
          isObject(question) &&
          Array.isArray(
            question.payload?.items ||
            question.items
          ) &&
          Array.isArray(
            question.payload?.targets ||
            question.targets
          )
        ) {
          return true;
        }

        const answerType =
          asString(
            question?.answer?.type
          ).toLowerCase();

        return (
          Array.isArray(
            question?.alternatives
          ) &&
          question.alternatives.length > 0 &&
          (
            answerType === "pairs" ||
            answerType === "sequence"
          )
        );
      }
    );
  }

  function safeContext(context) {
    return {
      engineVersion:
        context?.engineVersion || null,
      moduleId:
        context?.moduleId || null,
      year:
        context?.year || null,
      subject:
        context?.subject || null,
      module:
        context?.module || null,
      stepId:
        context?.stepId || null,
      stepIndex:
        context?.stepIndex ?? null,
      totalSteps:
        context?.totalSteps ?? null
    };
  }

  function replaceRuntimeConfig(html, config) {
    const startTag =
      '<script id="dragDropConfig" type="application/json">';
    const start = html.indexOf(startTag);

    if (start < 0) {
      throw new Error(
        "[DuduQ Drag & Drop] JSON de configuração não encontrado."
      );
    }

    const contentStart =
      start + startTag.length;
    const end =
      html.indexOf(
        "</script>",
        contentStart
      );

    if (end < 0) {
      throw new Error(
        "[DuduQ Drag & Drop] Fechamento do JSON não encontrado."
      );
    }

    const json =
      JSON.stringify(config)
        .replace(/</g, "\\u003c");

    return (
      html.slice(0, contentStart) +
      json +
      html.slice(end)
    );
  }

  function stampYear(html, year) {
    if (year == null) return html;

    return html.replace(
      /<html([^>]*)>/i,
      function (_, attrs) {
        return (
          `<html${attrs} data-duduq-ano="${String(year)}"` +
          ` data-duduq-ano-ativo="${String(year)}">`
        );
      }
    );
  }

  function syncGlobalChrome(doc, context, title) {
    if (!doc?.documentElement) return;

    if (context?.year != null) {
      doc.documentElement.setAttribute(
        "data-duduq-ano-ativo",
        String(context.year)
      );
      doc.documentElement.setAttribute(
        "data-duduq-ano",
        String(context.year)
      );
    }

    const heading =
      doc.querySelector(
        ".duduq-engine-heading h1"
      );

    if (
      heading &&
      heading.textContent !== title
    ) {
      heading.textContent = title;
    }

    const stepIndex =
      Number.isFinite(context?.stepIndex)
        ? context.stepIndex
        : 0;
    const totalSteps =
      Number.isFinite(context?.totalSteps)
        ? Math.max(1, context.totalSteps)
        : 1;
    const current =
      Math.min(
        stepIndex + 1,
        totalSteps
      );
    const label =
      `Etapa ${current} de ${totalSteps}`;

    const strong =
      doc.querySelector(
        ".duduq-progress-copy strong"
      );

    if (
      strong &&
      strong.textContent !== label
    ) {
      strong.textContent = label;
    }

    const trail =
      doc.querySelector(
        ".duduq-progress-trail"
      );

    if (trail) {
      const completedBefore =
        Math.max(
          0,
          Math.min(
            stepIndex,
            totalSteps
          )
        );

      trail.style.setProperty(
        "--lesson-progress",
        String(
          completedBefore /
          totalSteps
        )
      );
      trail.setAttribute(
        "aria-valuemax",
        String(totalSteps)
      );
      trail.setAttribute(
        "aria-valuenow",
        String(completedBefore)
      );
      trail.setAttribute(
        "aria-valuetext",
        `${completedBefore} de ${totalSteps} etapas concluídas`
      );
    }
  }

  function installChromeSync(
    doc,
    context,
    title
  ) {
    syncGlobalChrome(
      doc,
      context,
      title
    );

    const observer =
      new MutationObserver(
        function () {
          syncGlobalChrome(
            doc,
            context,
            title
          );
        }
      );

    if (doc.body) {
      observer.observe(
        doc.body,
        {
          childList: true,
          subtree: true,
          characterData: true
        }
      );
    }

    return function () {
      observer.disconnect();
    };
  }

  function mount({
    container,
    payload,
    options = {},
    context = {},
    onComplete
  }) {
    if (!container) {
      throw new Error(
        "[DuduQ Drag & Drop 1.1.36] Container não informado."
      );
    }

    const schema =
      adaptPayload(
        payload,
        context
      );

    const serializableSchema =
      clone(schema);

    if (!serializableSchema) {
      throw new Error(
        "[DuduQ Drag & Drop 1.1.36] Falha ao serializar conteúdo."
      );
    }

    container.innerHTML = "";

    const wrapper =
      document.createElement("div");

    wrapper.className =
      "duduq-mechanic-frame duduq-drag-clean-frame";

    Object.assign(
      wrapper.style,
      {
        width: "100%",
        height: "100%",
        minHeight: "0",
        overflow: "hidden",
        position: "relative"
      }
    );

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.title =
      "DuduQ — Drag & Drop";

    iframe.setAttribute(
      "allow",
      "autoplay; fullscreen"
    );

    iframe.setAttribute(
      "allowfullscreen",
      ""
    );

    Object.assign(
      iframe.style,
      {
        width: "100%",
        height: "100%",
        minHeight: "0",
        border: "0",
        display: "block",
        background: "transparent"
      }
    );

    const results = [];
    let destroyed = false;
    let completed = false;
    let stopChromeSync = null;

    const title =
      asString(
        payload?.title,
        serializableSchema.title ||
        "Drag & Drop"
      );

    function handleMessage(event) {
      if (
        event.source !==
        iframe.contentWindow
      ) {
        return;
      }

      const data = event.data;

      if (
        data?.type ===
        "DUDUQ_DRAG_DROP_RESULT"
      ) {
        if (data.payload) {
          results.push(
            clone(data.payload)
          );
        }
        return;
      }

      if (
        data?.type ===
        "DUDUQ_DRAG_DROP_COMPLETE"
      ) {
        if (completed) return;

        completed = true;

        onComplete?.({
          completed: true,
          mechanic: MECHANIC_ID,
          adapterVersion: VERSION,
          runtimeVersion: RUNTIME_VERSION,
          lessonId: serializableSchema.lessonId,
          lessonVersion: serializableSchema.version,
          totalStages: serializableSchema.stages.length,
          results: results.slice()
        });
      }
    }

    window.addEventListener(
      "message",
      handleMessage
    );

    iframe.addEventListener(
      "load",
      function () {
        if (destroyed) return;

        try {
          stopChromeSync =
            installChromeSync(
              iframe.contentDocument,
              context,
              title
            );
        } catch (error) {
          console.warn(
            "[DuduQ Drag & Drop] O shell global não pôde ser sincronizado.",
            error
          );
        }
      }
    );

    wrapper.appendChild(
      iframe
    );

    container.appendChild(
      wrapper
    );

    const runtimeUrl =
      `${getEngineBase()}${RELEASE_PATH}` +
      `DUDUQ_DRAG_DROP.html?engineAdapter=` +
      encodeURIComponent(VERSION);

    fetch(runtimeUrl)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ao carregar Drag & Drop.`
          );
        }
        return response.text();
      })
      .then(function (html) {
        if (destroyed) return;

        let prepared =
          replaceRuntimeConfig(
            html,
            serializableSchema
          );

        prepared =
          stampYear(
            prepared,
            context.year
          );

        prepared = prepared.replace(
          "Preparando o Target Shooter…",
          "Preparando o Drag & Drop…"
        );

        iframe.srcdoc = prepared;
      })
      .catch(function (error) {
        console.error(
          "[DuduQ Drag & Drop 1.1.36] Falha ao preparar runtime:",
          error
        );

        if (!destroyed) {
          container.textContent =
            "Erro ao preparar a atividade Drag & Drop.";
        }
      });

    return function destroy() {
      destroyed = true;
      stopChromeSync?.();

      window.removeEventListener(
        "message",
        handleMessage
      );

      try {
        iframe.src =
          "about:blank";
      } catch (_) {}

      iframe.remove();
      wrapper.remove();
    };
  }

  window.DuduQ.registerMechanic({
    id: MECHANIC_ID,
    version: VERSION,
    validate,
    mount,
    metadata: {
      name:
        "Drag & Drop",
      architecture:
        "target-shell-runtime-v1",
      category:
        "associacao-classificacao-ordenacao",
      answerTypes: [
        "pairs",
        "sequence"
      ],
      runtimeVersion:
        RUNTIME_VERSION,
      bridgeVersion:
        BRIDGE_VERSION,
      legacyPayload: true
    }
  });

  console.info(
    "[DuduQ] Drag & Drop CANONICAL registrado:",
    VERSION
  );
})();
