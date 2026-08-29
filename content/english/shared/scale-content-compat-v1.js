/* DUDUQ English — scale-v1 shared content compatibility v1.0.0
   Temporary cross-year payload bridge.
   It does NOT patch mechanic releases or scoring.

   Current capability gap:
   Target Shooter 1.0.21 declares routerProfile.supports.optionAudio=false.
   Revised multimodal content keeps each option's speech text in metadata,
   while the unsupported option.audio field is deferred until the shared
   Target Shooter capability is upgraded for every year at once.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  if (window.DuduQScaleContentCompat?.version === VERSION) return;

  function currentModule() {
    const path = Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)
      ? window.DUDUQ_GAME_CONFIG.modulePath
      : [];
    return path.reduce(function (current, key) {
      return current?.[key];
    }, window.DUDUQ_CONTENT);
  }

  function deferUnsupportedTargetShooterOptionAudio(moduleDefinition) {
    let deferred = 0;
    const activities = Array.isArray(moduleDefinition?.activities)
      ? moduleDefinition.activities
      : [];

    activities.forEach(function (activity) {
      if (activity?.mechanic !== "target-shooter") return;
      const questions = Array.isArray(activity.questions) ? activity.questions : [];

      questions.forEach(function (question) {
        const alternatives = Array.isArray(question?.alternatives)
          ? question.alternatives
          : [];

        alternatives.forEach(function (alternative) {
          const audio = alternative?.audio;
          if (!audio?.enabled || !(audio.text || audio.src)) return;

          const spokenText = String(
            alternative?.metadata?.speechText || audio.text || alternative.text || ""
          ).trim();

          alternative.metadata = {
            ...(alternative.metadata || {}),
            speechText: spokenText,
            speechLanguage: alternative?.metadata?.speechLanguage || audio.language || "en-US",
            optionAudioDeferred: true,
            optionAudioDeferredReason: "target-shooter-1.0.21-router-capability"
          };

          delete alternative.audio;
          deferred += 1;
        });

        question.metadata = {
          ...(question.metadata || {}),
          optionAudioCompatibility: deferred > 0
            ? "speech-preserved-deferred-until-shared-target-shooter-upgrade"
            : question?.metadata?.optionAudioCompatibility
        };
      });
    });

    return deferred;
  }

  function apply() {
    const moduleDefinition = currentModule();
    const deferred = deferUnsupportedTargetShooterOptionAudio(moduleDefinition);

    window.__DUDUQ_SCALE_CONTENT_COMPAT_STATE__ = Object.freeze({
      version: VERSION,
      moduleId: moduleDefinition?.id || null,
      deferredTargetShooterOptionAudio: deferred,
      releaseModified: false
    });

    return deferred;
  }

  window.addEventListener("duduq:engine-ready", apply);

  window.DuduQScaleContentCompat = Object.freeze({
    version: VERSION,
    apply,
    deferUnsupportedTargetShooterOptionAudio
  });
})();
