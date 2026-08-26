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
  const VERSION = "1.0.0-bubble-audio-numeral";

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function normalizeBubbleAudioNumeral(question) {
    if (question?.delivery?.mechanic !== "bubble-pop") return false;
    if (question?.metadata?.gamificationDiversity?.rule !== "bubble-audio-numeral") return false;

    /*
     * The original Year 2 source item is image/numeral -> audio. The diversity
     * rule intentionally inverts the presentation to audio -> numeral bubbles.
     * Bubble Pop's R143 router profile does not accept a question-level image,
     * and the old source visual is no longer part of the transformed stimulus.
     * Disable only that stale presentation field; numeral alternatives, source
     * answer and repeatable English audio remain untouched.
     */
    question.image = {
      enabled: false,
      src: null,
      alt: ""
    };
    question.delivery = {
      ...(question.delivery || {}),
      allowImage: false,
      allowAudio: true
    };
    question.metadata = {
      ...(question.metadata || {}),
      routerCompatibility: {
        version: VERSION,
        scope: "PRESENTATION_ONLY",
        staleQuestionImageDisabled: true,
        contentChanged: false,
        sourceAnswerPreserved: true
      }
    };
    return true;
  }

  function postProcess(module) {
    let patched = 0;
    for (const question of allQuestions(module)) {
      if (normalizeBubbleAudioNumeral(question)) patched += 1;
    }

    const audit = Object.freeze({
      version: VERSION,
      scope: "PRESENTATION_ONLY",
      patchedBubbleAudioNumeralItems: patched,
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
