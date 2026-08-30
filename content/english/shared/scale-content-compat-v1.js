/* DUDUQ English — scale-v1 shared content compatibility v1.1.0
   Temporary cross-year payload bridge.
   It does NOT patch mechanic releases, scoring, IDs or answers.

   Shared compatibility responsibilities:
   1) Legacy content may declare the chosen mechanic at activity level but omit
      question.delivery.mechanic. The Universal Player uses the Router as a
      validator, so this bridge mirrors the already-declared activity mechanic
      into the missing delivery field without changing mechanic selection.
   2) Target Shooter 1.0.21 declares routerProfile.supports.optionAudio=false.
      Revised multimodal content keeps each option's speech text in metadata,
      while the unsupported option.audio field is deferred until the shared
      Target Shooter capability is upgraded for every year at once.
*/
(function () {
  "use strict";

  const VERSION = "1.1.0";
  if (window.DuduQScaleContentCompat?.version === VERSION) return;

  function currentModule() {
    const path = Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)
      ? window.DUDUQ_GAME_CONFIG.modulePath
      : [];
    return path.reduce(function (current, key) {
      return current?.[key];
    }, window.DUDUQ_CONTENT);
  }

  function pinDeclaredActivityMechanics(moduleDefinition) {
    let pinned = 0;
    let conflicts = 0;
    const activities = Array.isArray(moduleDefinition?.activities)
      ? moduleDefinition.activities
      : [];

    activities.forEach(function (activity) {
      const mechanic = String(activity?.mechanic || "").trim();
      if (!mechanic) return;

      const questions = Array.isArray(activity.questions) ? activity.questions : [];
      questions.forEach(function (question) {
        if (!question || typeof question !== "object") return;

        const existing = String(question?.delivery?.mechanic || "").trim();
        if (existing) {
          if (existing !== mechanic) conflicts += 1;
          return;
        }

        question.delivery = {
          ...(question.delivery || {}),
          mechanic
        };
        question.metadata = {
          ...(question.metadata || {}),
          legacyDeclaredMechanicPinned: true,
          legacyDeclaredMechanicSource: "activity.mechanic"
        };
        pinned += 1;
      });
    });

    return { pinned, conflicts };
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
        let deferredInQuestion = 0;
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
          deferredInQuestion += 1;
        });

        if (deferredInQuestion > 0) {
          question.metadata = {
            ...(question.metadata || {}),
            optionAudioCompatibility: "speech-preserved-deferred-until-shared-target-shooter-upgrade"
          };
        }
      });
    });

    return deferred;
  }

  function apply() {
    const moduleDefinition = currentModule();
    const mechanicPin = pinDeclaredActivityMechanics(moduleDefinition);
    const deferred = deferUnsupportedTargetShooterOptionAudio(moduleDefinition);

    window.__DUDUQ_SCALE_CONTENT_COMPAT_STATE__ = Object.freeze({
      version: VERSION,
      moduleId: moduleDefinition?.id || null,
      legacyDeclaredMechanicsPinned: mechanicPin.pinned,
      legacyDeclaredMechanicConflicts: mechanicPin.conflicts,
      deferredTargetShooterOptionAudio: deferred,
      releaseModified: false,
      idsModified: false,
      answersModified: false
    });

    return window.__DUDUQ_SCALE_CONTENT_COMPAT_STATE__;
  }

  window.addEventListener("duduq:engine-ready", apply);

  window.DuduQScaleContentCompat = Object.freeze({
    version: VERSION,
    apply,
    pinDeclaredActivityMechanics,
    deferUnsupportedTargetShooterOptionAudio
  });
})();
