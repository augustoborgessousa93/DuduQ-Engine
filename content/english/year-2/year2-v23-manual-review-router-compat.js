/* DUDUQ English Year 2 — manual-review post-hotfix Router compatibility
   Runs after the smart visual / variable Matching layer.
   It only removes presentation fields forbidden by the declared mechanic.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Manual Review Router Compat] Factory v2.3 indisponível.");
  }
  if (factory.__manualReviewRouterCompatApplied) return;

  const originalBuild = factory.buildModule.bind(factory);
  const VERSION = "1.0.1-manual-review-post-visual";

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function disableQuestionImage(question) {
    question.image = { enabled: false, src: null, alt: "" };
    if (question?.media && typeof question.media === "object") {
      question.media.image = { enabled: false, src: null, alt: "" };
    }
    if (question?.stimulus?.image && typeof question.stimulus.image === "object") {
      question.stimulus.image = { enabled: false, src: null, alt: "" };
    }
  }

  function disableOptionAudio(question) {
    for (const alternative of question.alternatives || []) {
      if (!alternative || typeof alternative !== "object") continue;
      alternative.audio = {
        enabled: false,
        src: null,
        text: "",
        language: "en-US",
        role: "option"
      };
    }
  }

  function normalize(question) {
    const mechanic = question?.delivery?.mechanic;
    const rule = question?.metadata?.gamificationDiversity?.rule;

    if (mechanic === "bubble-pop" && rule === "bubble-audio-numeral") {
      disableQuestionImage(question);
      disableOptionAudio(question);
      question.delivery = { ...(question.delivery || {}), allowImage: false, allowAudio: true };
      question.metadata = {
        ...(question.metadata || {}),
        manualReviewRouterCompatibility: {
          version: VERSION,
          rule,
          questionImageDisabled: true,
          optionAudioDisabled: true,
          contentChanged: false,
          sourceAnswerPreserved: true
        }
      };
      return "bubble";
    }

    if (mechanic === "target-shooter" && rule === "target-audio-image") {
      // The visual choices live in metadata.targetShooter.items. A main question
      // image can reveal the answer and per-option audio is forbidden by Router.
      disableQuestionImage(question);
      disableOptionAudio(question);
      question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
      question.metadata = {
        ...(question.metadata || {}),
        manualReviewRouterCompatibility: {
          version: VERSION,
          rule,
          questionImageDisabled: true,
          optionAudioDisabled: true,
          targetVisualsPreserved: true,
          contentChanged: false,
          sourceAnswerPreserved: true
        }
      };
      return "target";
    }

    if (mechanic === "drag-drop") {
      // Router intentionally forbids a main question image for Drag & Drop.
      // Visual meaning must live in the target/option payload. The manual-review
      // layer already moves the safe visual to metadata.targets when needed;
      // remove only duplicate main-image aliases that Schema would normalize
      // back into media.image and reject before the Intro can launch.
      disableQuestionImage(question);
      question.delivery = { ...(question.delivery || {}), allowAudio: true };
      question.metadata = {
        ...(question.metadata || {}),
        manualReviewRouterCompatibility: {
          version: VERSION,
          rule: rule || "drag-drop-main-image-normalization",
          questionImageDisabled: true,
          targetVisualsPreserved: true,
          contentChanged: false,
          sourceAnswerPreserved: true
        }
      };
      return "drag";
    }

    return null;
  }

  function postProcess(module) {
    let bubble = 0;
    let target = 0;
    let drag = 0;
    for (const question of allQuestions(module)) {
      const result = normalize(question);
      if (result === "bubble") bubble += 1;
      if (result === "target") target += 1;
      if (result === "drag") drag += 1;
    }
    const audit = Object.freeze({
      version: VERSION,
      patchedBubbleItems: bubble,
      patchedTargetItems: target,
      patchedDragDropItems: drag,
      contentChanged: false,
      sourceAnswersPreserved: true
    });
    return Object.freeze({
      ...module,
      manualReviewRouterCompatibilityAudit: audit,
      audit: { ...(module.audit || {}), manualReviewRouterCompatibility: audit }
    });
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __manualReviewRouterCompatApplied: true,
    manualReviewRouterCompatVersion: VERSION
  });
})();
