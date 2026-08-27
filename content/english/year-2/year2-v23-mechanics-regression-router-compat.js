/* DUDUQ English Year 2 — mechanics regression post-hotfix Router compatibility
   Keeps smart Bubble visuals in metadata.imageAssetKey (supported by Router)
   while removing duplicate option image URLs (not supported by Bubble Pop).
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Mechanics Router Compat] Factory v2.3 indisponível.");
  }
  if (factory.__mechanicsRegressionRouterCompatApplied) return;

  const VERSION = "1.0.0-mechanics-regression-rc1";
  const originalBuild = factory.buildModule.bind(factory);

  function questions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function disableMainImage(question) {
    question.image = { ...(question.image || {}), enabled: false, src: null, alt: "" };
    question.media = question.media || {};
    question.media.image = { ...(question.media.image || {}), enabled: false, src: null, alt: "" };
    if (question?.stimulus?.image) {
      question.stimulus.image = { ...question.stimulus.image, enabled: false, src: null, alt: "" };
    }
  }

  function normalizeBubble(question) {
    if (question?.delivery?.mechanic !== "bubble-pop") return false;

    disableMainImage(question);
    for (const alternative of question.alternatives || []) {
      if (!alternative || typeof alternative !== "object") continue;
      // Bubble Pop Router accepts metadata.imageAssetKey, not option image URLs.
      // Preserve the smart official-bank key and remove only its duplicate URL alias.
      alternative.image = {
        ...(alternative.image || {}),
        enabled: false,
        src: null,
        alt: alternative?.image?.alt || ""
      };
      if (alternative?.audio) {
        alternative.audio = {
          ...alternative.audio,
          enabled: false,
          src: null,
          text: ""
        };
      }
    }
    question.delivery = { ...(question.delivery || {}), allowImage: true, allowAudio: true };
    question.metadata = question.metadata || {};
    question.metadata.mechanicsRegressionRouterCompatibility = {
      version: VERSION,
      mechanic: "bubble-pop",
      questionImageDisabled: true,
      optionImageUrlDisabled: true,
      optionImageAssetKeyPreserved: true,
      optionAudioDisabled: true,
      sourceAnswerPreserved: true,
      contentChanged: false
    };
    return true;
  }

  function postProcess(module) {
    let bubbleItems = 0;
    for (const question of questions(module)) {
      if (normalizeBubble(question)) bubbleItems += 1;
    }
    const audit = Object.freeze({
      version: VERSION,
      patchedBubbleItems: bubbleItems,
      optionImageAssetKeyPreserved: true,
      contentChanged: false,
      sourceAnswersPreserved: true
    });
    return Object.freeze({
      ...module,
      mechanicsRegressionRouterCompatibilityAudit: audit,
      audit: { ...(module.audit || {}), mechanicsRegressionRouterCompatibility: audit }
    });
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __mechanicsRegressionRouterCompatApplied: true,
    mechanicsRegressionRouterCompatVersion: VERSION
  });
})();
