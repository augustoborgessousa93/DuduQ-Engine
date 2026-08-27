/* DUDUQ English Year 2 — Drag & Drop listening + vocabulary + association finalizer
   Contract for single-target choice only:
   PRIMARY AUDIO -> CENTRAL IMAGE -> AUDIO OPTIONS -> DRAG/DROP -> CONFIRM.

   This layer does NOT redesign the mechanic shell and does NOT change IDs, source answers,
   source alternative wording, shared Drag & Drop releases or Canary. It only reorganizes
   the final Year 2 payload after previous multimodal fallbacks have resolved assets.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 DragDrop Listening Association] Factory indisponível.");
  }
  if (factory.__dragDropListeningAssociationFinalApplied) return;

  const VERSION = "1.0.0-year2-listening-vocabulary-association";
  const originalBuild = factory.buildModule.bind(factory);
  const resolveVisual = typeof factory.resolveYear2VisualConsistent === "function"
    ? factory.resolveYear2VisualConsistent.bind(factory)
    : null;

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function sourceLabels(question) {
    const stored = question?.metadata?.sourceAlternativesV23;
    if (Array.isArray(stored) && stored.length) return stored.map(String);
    return (question?.alternatives || []).map((alternative) =>
      String(alternative?.metadata?.sourceWrittenLabel ?? alternative?.audio?.text ?? alternative?.text ?? alternative?.label ?? "")
    );
  }

  function sourceAnswer(question) {
    return String(question?.metadata?.sourceAnswerV23 ?? question?.metadata?.sourceAnswer ?? "").trim();
  }

  function singleTargetChoice(question) {
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];
    const alternatives = Array.isArray(question?.alternatives) ? question.alternatives : [];
    return question?.delivery?.mechanic === "drag-drop" &&
      pairs.length === 1 && targets.length === 1 &&
      Number(targets[0]?.capacity || 1) === 1 &&
      alternatives.length >= 2 && alternatives.length <= 4 &&
      question?.metadata?.optionPresentation !== "MOVABLE_LETTERS_AFTER_FIRST_LISTEN";
  }

  function imageSourceFromAlternative(alternative) {
    return String(
      alternative?.metadata?.imageAssetKey ||
      alternative?.image?.src ||
      alternative?.imageSrc ||
      alternative?.imageUrl ||
      ""
    ).trim();
  }

  function existingTargetVisual(question) {
    const targets = [
      ...(Array.isArray(question?.metadata?.targets) ? question.metadata.targets : []),
      ...(Array.isArray(question?.metadata?.dragDrop?.targets) ? question.metadata.dragDrop.targets : [])
    ];
    for (const target of targets) {
      const src = String(target?.imageSrc || target?.imageUrl || target?.image || target?.imageAssetKey || "").trim();
      if (src) return { src, status: "existing-target-visual", alt: String(target?.alt || "Imagem central da atividade") };
    }
    return null;
  }

  function correctAlternativeVisual(question) {
    const correctId = String(question?.answer?.value?.[0]?.source || "").trim();
    if (!correctId) return null;
    const alternative = (question?.alternatives || []).find((entry) => String(entry?.id || "") === correctId);
    const src = imageSourceFromAlternative(alternative);
    if (!src) return null;
    return {
      src,
      status: String(alternative?.metadata?.smartAssetStatus || "resolved-correct-option-visual"),
      alt: String(alternative?.image?.alt || alternative?.metadata?.sourceWrittenLabel || sourceAnswer(question) || "Imagem central da atividade")
    };
  }

  function resolvedAnswerVisual(question) {
    if (!resolveVisual) return null;
    try {
      const visual = resolveVisual(sourceAnswer(question));
      if (visual?.src) {
        return {
          src: String(visual.src),
          status: String(visual.status || "resolved-answer-visual"),
          alt: String(visual.alt || sourceAnswer(question) || "Imagem central da atividade")
        };
      }
    } catch (_) {}
    return null;
  }

  function chooseCentralVisual(question) {
    /* If the editorial source already supplied a visual context, preserve it.
       Otherwise reuse the already-resolved image of the correct option before
       falling back to the central smart resolver. */
    if (question?.metadata?.sourcePlanHasVisualV23 === true || String(question?.metadata?.sourcePlanModeV23 || "").toLowerCase() === "image-choice") {
      const existing = existingTargetVisual(question);
      if (existing) return existing;
    }
    return correctAlternativeVisual(question) || existingTargetVisual(question) || resolvedAnswerVisual(question);
  }

  function ensurePrimaryAudio(question) {
    const enabled = question?.audio?.enabled === true || question?.media?.audio?.enabled === true || question?.metadata?.stimulusAudio?.enabled === true;
    if (enabled) return true;

    /* Preserve the source construct. If an earlier layer stored the original stimulus,
       restore only that exact text; never invent a new sentence. */
    const sourceStimulus = String(
      question?.metadata?.sourceStimulusAudioV23 ||
      question?.metadata?.sourceAudioV23 ||
      question?.metadata?.stimulusAudio?.text ||
      ""
    ).trim();
    if (!sourceStimulus) return false;
    question.audio = {
      ...(question.audio || {}),
      enabled: true,
      text: sourceStimulus,
      language: question?.audio?.language || "en-US",
      role: "stimulus"
    };
    return true;
  }

  function canonicalize(question, audit) {
    if (!singleTargetChoice(question)) return;

    const labels = sourceLabels(question);
    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    if (labels.length !== alternatives.length || labels.some((label) => !String(label).trim())) {
      audit.failures.push({ id: question.id, code: "SOURCE_ALTERNATIVES_INCOMPLETE" });
      return;
    }

    const visual = chooseCentralVisual(question);
    if (!visual?.src) {
      audit.failures.push({ id: question.id, code: "CENTRAL_VISUAL_UNRESOLVED" });
      return;
    }

    const target = question.metadata.targets[0];
    target.capacity = 1;
    target.kind = target.kind === "spell-slot" ? target.kind : "response";
    target.imageSrc = visual.src;
    target.imageUrl = visual.src;
    target.image = visual.src;
    target.alt = visual.alt || "Imagem central da atividade";
    target.label = target.label || "SOLTE A RESPOSTA AQUI";

    alternatives.forEach((alternative, index) => {
      const label = String(labels[index]);
      const existingAudio = alternative?.audio && typeof alternative.audio === "object" ? alternative.audio : {};
      alternative.text = String.fromCharCode(65 + index);
      alternative.label = "";
      alternative.audio = {
        ...existingAudio,
        enabled: true,
        text: label,
        language: existingAudio.language || existingAudio.locale || "en-US",
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
        audioAffordanceOwner: "runtime-control",
        centralStimulusVisual: visual.src
      };
      delete alternative.metadata.imageAssetKey;
      delete alternative.metadata.smartAssetStatus;
    });

    const primaryAudioReady = ensurePrimaryAudio(question);
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.statement = "OUÇA, OBSERVE E ARRASTE A RESPOSTA";
    question.instruction = question.statement;
    question.metadata = {
      ...(question.metadata || {}),
      singleTargetChoice: true,
      confirmOnAnySelection: true,
      replacePreviousChoice: true,
      tapToPlace: true,
      hideCapacityBadge: true,
      optionPresentation: "LISTENING_ASSOCIATION_AUDIO_CHOICES",
      pedagogicalModality: "LISTENING_IMAGE_AUDIO_ASSOCIATION",
      listeningAssociation: {
        version: VERSION,
        status: "READY",
        sequence: ["PRIMARY_AUDIO", "CENTRAL_IMAGE", "AUDIO_OPTIONS", "DRAG_DROP", "CONFIRM"],
        centralVisualAsset: visual.src,
        centralVisualStatus: visual.status,
        primaryAudioReady,
        sourceAnswerPreserved: true,
        sourceAlternativeLabelsPreserved: true,
        visualShellPreserved: true
      }
    };

    audit.patched.push(question.id);
    if (!primaryAudioReady) audit.missingPrimaryAudio.push(question.id);
  }

  function postProcess(module) {
    const audit = {
      version: VERSION,
      patched: [],
      failures: [],
      missingPrimaryAudio: []
    };
    for (const question of allQuestions(module)) canonicalize(question, audit);
    module.audit = module.audit || {};
    module.audit.dragDropListeningAssociation = audit;
    return module;
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __dragDropListeningAssociationFinalApplied: true,
    dragDropListeningAssociationVersion: VERSION
  });
})();
