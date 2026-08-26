/* DUDUQ English Year 2 — v2.3 gamification/router compatibility guard
   Scope: presentation compatibility only. No pedagogical content, IDs, answers,
   vocabulary, difficulty, audio script or activity sequence is changed.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 Router Compat] Factory v2.3 indisponível.");
    return;
  }
  if (factory.__gamificationRouterCompatApplied) return;

  const originalBuild = factory.buildModule.bind(factory);
  const VERSION = "1.1.0-audio-to-visual-router-compat";

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function disableQuestionImage(question) {
    question.image = {
      enabled: false,
      src: null,
      alt: ""
    };
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

  function markCompatibility(question, rule) {
    question.metadata = {
      ...(question.metadata || {}),
      routerCompatibility: {
        version: VERSION,
        rule,
        scope: "PRESENTATION_ONLY",
        staleQuestionImageDisabled: true,
        staleOptionAudioDisabled: true,
        stimulusAudioPreserved: true,
        contentChanged: false,
        sourceAnswerPreserved: true
      }
    };
  }

  function normalizeBubbleAudioNumeral(question) {
    if (question?.delivery?.mechanic !== "bubble-pop") return false;
    if (question?.metadata?.gamificationDiversity?.rule !== "bubble-audio-numeral") return false;

    /*
     * The original source item is numeral/image -> option audio. The diversity
     * rule intentionally becomes one repeatable audio stimulus -> numeral bubbles.
     * Bubble Pop's R143 router profile accepts question audio, but not a main image
     * or per-option audio. Remove only those stale presentation fields.
     */
    disableQuestionImage(question);
    disableOptionAudio(question);
    question.delivery = {
      ...(question.delivery || {}),
      allowImage: false,
      allowAudio: true
    };
    markCompatibility(question, "bubble-audio-numeral");
    return true;
  }

  function normalizeTargetAudioImage(question) {
    if (question?.delivery?.mechanic !== "target-shooter") return false;
    if (question?.metadata?.gamificationDiversity?.rule !== "target-audio-image") return false;

    /*
     * Target Shooter receives one repeatable audio stimulus and visual targets
     * through metadata.targetShooter.items. Per-option audio inherited from the
     * source universal alternatives is not part of this presentation and makes
     * the Router reject the declared mechanic. The old question image is also
     * disabled so it can never reveal the answer before the visual targets.
     */
    disableQuestionImage(question);
    disableOptionAudio(question);
    question.delivery = {
      ...(question.delivery || {}),
      allowImage: true,
      allowAudio: true
    };
    markCompatibility(question, "target-audio-image");
    return true;
  }

  function postProcess(module) {
    let bubblePatched = 0;
    let targetPatched = 0;

    for (const question of allQuestions(module)) {
      if (normalizeBubbleAudioNumeral(question)) bubblePatched += 1;
      if (normalizeTargetAudioImage(question)) targetPatched += 1;
    }

    const audit = Object.freeze({
      version: VERSION,
      scope: "PRESENTATION_ONLY",
      patchedBubbleAudioNumeralItems: bubblePatched,
      patchedTargetAudioImageItems: targetPatched,
      contentChanged: false,
      sourceAnswersPreserved: true
    });

    return Object.freeze({
      ...module,
      routerCompatibilityAudit: audit,
      audit: {
        ...(module.audit || {}),
        routerCompatibility: audit
      }
    });
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __gamificationRouterCompatApplied: true,
    gamificationRouterCompatVersion: VERSION
  });
})();
