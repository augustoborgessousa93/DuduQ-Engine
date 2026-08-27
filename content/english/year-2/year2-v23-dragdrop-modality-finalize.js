/* DUDUQ English Year 2 — Drag & Drop pedagogical modality finalizer
   Preserves the v2.3 multimodal direction after runtime/Router fallbacks:
   - visual stimulus + source audio alternatives => image/context -> audio;
   - audio stimulus without visual context => audio -> image (handled upstream).
   IDs, source answers and source alternative labels remain frozen.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 DragDrop Modality] Factory indisponível.");
  }
  if (factory.__dragDropModalityFinalizeApplied) return;

  const VERSION = "1.0.0-year2-v23-modality-finalize";
  const originalBuild = factory.buildModule.bind(factory);
  const resolveVisual = typeof factory.resolveYear2VisualConsistent === "function"
    ? factory.resolveYear2VisualConsistent.bind(factory)
    : null;

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

    const sourcePrompt = String(question?.metadata?.sourcePromptV23 || "");
    const sourceSuggestsVisualStimulus = /observe|imagem|grupo|personagem|numeral|mostra|vê|veja/i.test(sourcePrompt);
    const existingVisual = targetVisual(question);
    if (!sourceSuggestsVisualStimulus && !existingVisual) return;

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
      stimulusVisualAsset: visual.src,
      stimulusVisualStatus: visual.status,
      sourceAnswerPreserved: true
    };

    const consistency = question?.metadata;
    if (consistency) consistency.pedagogicalModality = "IMAGE_CONTEXT_TO_AUDIO";
    audit.imageToAudio.push(question.id);
  }

  function postProcess(module) {
    const audit = { version: VERSION, imageToAudio: [], visualStimulusFailures: [] };
    for (const question of allQuestions(module)) restoreImageToAudio(question, audit);

    const consistency = module?.audit?.multimodalConsistency;
    if (consistency) {
      const restored = new Set(audit.imageToAudio);
      consistency.dragDropVisualFailures = (consistency.dragDropVisualFailures || []).filter((id) => !restored.has(id));
      consistency.dragDropAudioToImage = (consistency.dragDropAudioToImage || []).filter((id) => !restored.has(id));
      consistency.dragDropImageToAudio = [...(consistency.dragDropImageToAudio || []), ...audit.imageToAudio];
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
