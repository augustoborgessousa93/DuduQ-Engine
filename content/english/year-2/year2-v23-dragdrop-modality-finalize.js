/* DUDUQ English Year 2 — Drag & Drop pedagogical modality finalizer
   Preserves the v2.3 multimodal direction after runtime/Router fallbacks:
   - visual stimulus + source audio alternatives => image/context -> audio;
   - audio stimulus without visual context => audio -> image.
   IDs, source answers and source alternative labels remain frozen.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 DragDrop Modality] Factory indisponível.");
  }
  if (factory.__dragDropModalityFinalizeApplied) return;

  const VERSION = "1.0.2-year2-v23-explicit-plan-mode";
  const originalBuild = factory.buildModule.bind(factory);
  const resolveVisual = typeof factory.resolveYear2VisualConsistent === "function"
    ? factory.resolveYear2VisualConsistent.bind(factory)
    : null;

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
    const values = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(values) && values.length) return values.map(String);
    return (question?.alternatives || []).map((alternative) =>
      String(alternative?.metadata?.sourceWrittenLabel ?? alternative?.audio?.text ?? alternative?.text ?? "")
    );
  }

  function sourceAnswer(question) {
    return String(question?.metadata?.sourceAnswerV23 ?? question?.metadata?.sourceAnswer ?? "");
  }

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function singleTarget(question) {
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];
    return question?.delivery?.mechanic === "drag-drop" && pairs.length === 1 && targets.length === 1 &&
      Number(targets[0]?.capacity || 1) === 1 && (question.alternatives || []).length >= 2;
  }

  function sourceAudioAlternatives(question) {
    const types = question?.metadata?.sourceAlternativeTypesV23;
    return Array.isArray(types) && types.length >= 2 && types.every((type) => String(type).toLowerCase() === "audio");
  }

  function targetVisual(question) {
    const targets = [
      ...(Array.isArray(question?.metadata?.targets) ? question.metadata.targets : []),
      ...(Array.isArray(question?.metadata?.dragDrop?.targets) ? question.metadata.dragDrop.targets : [])
    ];
    for (const target of targets) {
      const src = String(target?.imageSrc || target?.imageUrl || target?.image || target?.imageAssetKey || "").trim();
      if (src) return { target, src };
    }
    const main = question?.image?.enabled && question?.image?.src
      ? String(question.image.src)
      : question?.media?.image?.enabled && question?.media?.image?.src
        ? String(question.media.image.src)
        : "";
    return main ? { target: null, src: main } : null;
  }

  function clearTargetVisual(question) {
    const targets = [
      ...(Array.isArray(question?.metadata?.targets) ? question.metadata.targets : []),
      ...(Array.isArray(question?.metadata?.dragDrop?.targets) ? question.metadata.dragDrop.targets : [])
    ];
    for (const target of targets) {
      if (!target || typeof target !== "object") continue;
      delete target.imageSrc;
      delete target.imageUrl;
      delete target.image;
      delete target.imageAssetKey;
      target.alt = "Área para soltar a resposta";
    }
  }

  function familyGroupFallback() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="300" viewBox="0 0 420 300" role="img" aria-label="Grupo familiar fictício">
      <rect x="8" y="8" width="404" height="284" rx="44" fill="#f5fbff" stroke="#68a9dc" stroke-width="5"/>
      <g fill="#ffffff" stroke="#377fb8" stroke-width="5">
        <circle cx="115" cy="105" r="35"/><circle cx="210" cy="88" r="42"/><circle cx="305" cy="105" r="35"/>
        <path d="M55 235c8-56 30-85 60-85s52 29 60 85z"/><path d="M135 240c10-68 37-104 75-104s65 36 75 104z"/><path d="M245 235c8-56 30-85 60-85s52 29 60 85z"/>
      </g>
      <path d="M85 245h250" stroke="#a9cae4" stroke-width="6" stroke-linecap="round"/>
    </svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function semanticChoiceFallback(label) {
    const key = normalize(label);
    let body = "";
    let alt = String(label || "Alternativa visual");

    if (/favorite color/.test(key)) {
      body = `<ellipse cx="178" cy="132" rx="86" ry="66" fill="#f7d9ad" stroke="#8a643e" stroke-width="5"/>
        <circle cx="135" cy="105" r="15" fill="#e85d5d"/><circle cx="180" cy="91" r="15" fill="#f2c94c"/>
        <circle cx="220" cy="115" r="15" fill="#4f8bd6"/><circle cx="205" cy="160" r="15" fill="#63b66e"/>
        <circle cx="155" cy="165" r="15" fill="#9b6bd3"/>`;
      alt = "Paleta com várias cores";
    } else if (/favorite toy/.test(key)) {
      body = `<rect x="105" y="145" width="150" height="72" rx="18" fill="#f3b85d" stroke="#a56e1e" stroke-width="5"/>
        <circle cx="142" cy="125" r="34" fill="#5ea7e8" stroke="#28699f" stroke-width="5"/>
        <rect x="194" y="92" width="48" height="65" rx="10" fill="#e86f6f" stroke="#9f3535" stroke-width="5"/>
        <path d="M118 145h125" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
      alt = "Brinquedos em uma caixa";
    } else if (/whats this|what is this/.test(key)) {
      body = `<rect x="116" y="98" width="92" height="92" rx="18" fill="#8fd3c7" stroke="#32786c" stroke-width="5"/>
        <circle cx="232" cy="151" r="42" fill="none" stroke="#355b7c" stroke-width="9"/>
        <path d="M262 181l43 43" stroke="#355b7c" stroke-width="12" stroke-linecap="round"/>`;
      alt = "Objeto sendo observado com lupa";
    } else if (/how old/.test(key)) {
      body = `<rect x="120" y="145" width="120" height="62" rx="15" fill="#f0a3b8" stroke="#a34b66" stroke-width="5"/>
        <path d="M130 145c22-28 42 22 62-6 20 28 39-20 48 6" fill="#fff4d2" stroke="#d19b40" stroke-width="5"/>
        <path d="M150 108v33M180 98v43M210 108v33" stroke="#4d789e" stroke-width="7" stroke-linecap="round"/>
        <circle cx="150" cy="101" r="7" fill="#f6b33d"/><circle cx="180" cy="91" r="7" fill="#f6b33d"/><circle cx="210" cy="101" r="7" fill="#f6b33d"/>`;
      alt = "Bolo de aniversário com velas";
    } else {
      return null;
    }

    const safeAlt = alt.replace(/[<>&"]/g, "");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="260" viewBox="0 0 360 260" role="img" aria-label="${safeAlt}">
      <rect x="8" y="8" width="344" height="244" rx="42" fill="#f7fbff" stroke="#6ba7d6" stroke-width="5"/>
      ${body}
    </svg>`;
    return {
      src: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      status: "semantic-controlled-fallback",
      visualKey: `year2-semantic:${key}`,
      alt
    };
  }

  function resolveChoiceVisual(label) {
    let visual = null;
    if (resolveVisual) {
      try { visual = resolveVisual(label); } catch (_) {}
    }
    if (visual?.src) {
      return {
        src: String(visual.src),
        status: String(visual.status || "resolved"),
        visualKey: String(visual.visualKey || visual.src),
        alt: String(visual.alt || label || "Imagem da alternativa")
      };
    }
    return semanticChoiceFallback(label);
  }

  function ensureStimulusVisual(question) {
    const existing = targetVisual(question);
    if (existing) return { src: existing.src, status: "existing-final-target" };

    let visual = null;
    if (resolveVisual) {
      try { visual = resolveVisual(sourceAnswer(question)); } catch (_) {}
      if (!visual?.src && /family/i.test(String(question?.metadata?.topic || ""))) {
        try { visual = resolveVisual("family"); } catch (_) {}
      }
    }
    const src = String(visual?.src || (/family/i.test(String(question?.metadata?.topic || "")) ? familyGroupFallback() : ""));
    if (!src) return null;

    const target = question?.metadata?.targets?.[0];
    if (!target) return null;
    target.imageSrc = src;
    target.image = src;
    target.imageUrl = src;
    target.alt = target.alt || "Imagem de contexto da atividade";
    return { src, status: visual?.status || "semantic-context-fallback" };
  }

  function restoreImageToAudio(question, audit) {
    if (!singleTarget(question) || !sourceAudioAlternatives(question)) return;

    const sourcePlanMode = String(question?.metadata?.sourcePlanModeV23 || "").toLowerCase();
    const sourcePrompt = String(question?.metadata?.sourcePromptV23 || "");
    const sourcePlanHasVisual = question?.metadata?.sourcePlanHasVisualV23 === true;
    const sourceDeclaresVisualStimulus = sourcePlanHasVisual || sourcePlanMode === "image-choice";
    const legacyVisualCue = /observe|imagem|grupo|personagem|numeral|mostra|vê|veja|cart[aã]o/i.test(sourcePrompt);
    const existingVisual = targetVisual(question);
    if (!sourceDeclaresVisualStimulus && !legacyVisualCue && !existingVisual) return;

    const visual = ensureStimulusVisual(question);
    if (!visual?.src) {
      audit.visualStimulusFailures.push(question.id);
      return;
    }

    const labels = sourceLabels(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.length < 2) return;

    alternatives.forEach((alternative, index) => {
      const label = labels[index];
      alternative.text = String.fromCharCode(65 + index);
      alternative.label = "";
      alternative.audio = {
        enabled: true,
        text: label,
        language: "en-US",
        role: "option"
      };
      alternative.image = { enabled: false, src: null, alt: "" };
      delete alternative.imageSrc;
      delete alternative.imageUrl;
      alternative.metadata = {
        ...(alternative.metadata || {}),
        sourceWrittenLabel: label,
        writtenLabelVisibleBeforeAnswer: false,
        multimodalRole: "AUDIO_ALTERNATIVE",
        stimulusVisualAsset: visual.src
      };
      delete alternative.metadata.imageAssetKey;
      delete alternative.metadata.smartAssetStatus;
    });

    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.statement = "VEJA, OUÇA E ARRASTE A RESPOSTA";
    question.instruction = question.statement;
    question.metadata.optionPresentation = "AUDIO_PRIMARY_DRAG_DROP_CHOICE";
    question.metadata.multimodalChoiceAudit = {
      version: VERSION,
      status: "IMAGE_TO_AUDIO",
      sourcePlanModeV23: sourcePlanMode,
      stimulusVisualAsset: visual.src,
      stimulusVisualStatus: visual.status,
      sourceAnswerPreserved: true
    };

    question.metadata.pedagogicalModality = "IMAGE_CONTEXT_TO_AUDIO";
    audit.imageToAudio.push(question.id);
  }

  function repairAudioToImage(question, audit) {
    if (!singleTarget(question) || !sourceAudioAlternatives(question)) return;
    if (String(question?.metadata?.sourcePlanModeV23 || "").toLowerCase() !== "audio-choice") return;
    if (question?.metadata?.sourcePlanHasVisualV23 === true || targetVisual(question)) return;
    if (question?.metadata?.optionPresentation === "MOVABLE_LETTERS_AFTER_FIRST_LISTEN") return;

    const labels = sourceLabels(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.length < 2) return;

    const used = new Set();
    const visuals = labels.map((label) => {
      const visual = resolveChoiceVisual(label);
      if (!visual?.src) return null;
      const key = String(visual.visualKey || visual.src);
      if (used.has(key)) return null;
      used.add(key);
      return visual;
    });

    if (!visuals.every(Boolean)) {
      audit.audioToImageFailures.push(question.id);
      return;
    }

    alternatives.forEach((alternative, index) => {
      const label = labels[index];
      const visual = visuals[index];
      alternative.text = "";
      alternative.label = "";
      alternative.audio = { ...(alternative.audio || {}), enabled: false, src: null };
      alternative.image = { enabled: true, src: visual.src, alt: visual.alt || label };
      alternative.imageSrc = visual.src;
      alternative.imageUrl = visual.src;
      alternative.metadata = {
        ...(alternative.metadata || {}),
        sourceWrittenLabel: label,
        writtenLabelVisibleBeforeAnswer: false,
        imageAssetKey: visual.src,
        smartAssetStatus: visual.status,
        multimodalRole: "DRAGGABLE_VISUAL"
      };
    });

    clearTargetVisual(question);
    const target = question?.metadata?.targets?.[0];
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
    question.metadata.pedagogicalModality = "AUDIO_TO_IMAGE";
    audit.audioToImage.push(question.id);
  }

  function postProcess(module) {
    const audit = {
      version: VERSION,
      imageToAudio: [],
      audioToImage: [],
      visualStimulusFailures: [],
      audioToImageFailures: []
    };

    for (const question of allQuestions(module)) {
      restoreImageToAudio(question, audit);
      repairAudioToImage(question, audit);
    }

    const consistency = module?.audit?.multimodalConsistency;
    if (consistency) {
      const restored = new Set(audit.imageToAudio);
      const repaired = new Set(audit.audioToImage);
      const resolved = new Set([...restored, ...repaired]);
      consistency.dragDropVisualFailures = (consistency.dragDropVisualFailures || []).filter((id) => !resolved.has(id));
      consistency.dragDropAudioToImage = [
        ...(consistency.dragDropAudioToImage || []).filter((id) => !restored.has(id)),
        ...audit.audioToImage.filter((id) => !(consistency.dragDropAudioToImage || []).includes(id))
      ];
      consistency.dragDropImageToAudio = [...new Set([...(consistency.dragDropImageToAudio || []), ...audit.imageToAudio])];
    }
    module.audit = { ...(module.audit || {}), dragDropModalityFinalize: audit };
    return module;
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __dragDropModalityFinalizeApplied: true,
    dragDropModalityFinalizeVersion: VERSION
  });
})();
