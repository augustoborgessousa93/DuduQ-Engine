/* =========================================================
   DUDUQ ROUTER — DIRECT PAYLOAD COMPATIBILITY v1.0.0

   Purpose:
   - bridge the Router 1.0.0 capability profile with mechanics that
     already validate/render a richer direct payload contract;
   - preserve the editorial answer and source traceability;
   - broaden Drag & Drop "single" eligibility only during the
     synchronous engine-ready bootstrap validation;
   - restore the original Router profile immediately afterwards.

   This file does NOT change question content, scoring, mechanics,
   Core releases, or the Canary manifest.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const FLAG = "__DUDUQ_ROUTER_DIRECT_PAYLOAD_COMPAT_V1__";

  if (window[FLAG]) return;
  window[FLAG] = VERSION;

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function moduleFromConfig() {
    const path = Array.isArray(window.DUDUQ_GAME_CONFIG?.modulePath)
      ? window.DUDUQ_GAME_CONFIG.modulePath
      : [];

    return path.reduce(function (current, key) {
      return current?.[key];
    }, window.DUDUQ_CONTENT) || null;
  }

  function isDirectSingleDragQuestion(question) {
    if (!isObject(question)) return false;
    if (String(question.delivery?.mechanic || "").toLowerCase() !== "drag-drop") return false;
    if (String(question.answer?.type || "").toLowerCase() !== "single") return false;
    if (!Array.isArray(question.payload?.items) || question.payload.items.length < 1) return false;
    if (!Array.isArray(question.payload?.targets) || question.payload.targets.length < 1) return false;

    const answer = String(question.answer?.value ?? "");
    const required = question.payload.items.filter(function (item) {
      return item?.required !== false;
    });

    if (required.length !== 1 || String(required[0]?.id ?? "") !== answer) return false;

    const targetIds = new Set(
      question.payload.targets
        .map(function (target) { return String(target?.id ?? ""); })
        .filter(Boolean)
    );

    return Boolean(required[0]?.targetId && targetIds.has(String(required[0].targetId)));
  }

  function installForBootstrap() {
    const router = window.DuduQRouter;
    const moduleDefinition = moduleFromConfig();

    if (!router?.getProfile || !router?.registerProfile || !moduleDefinition) return;

    const activities = Array.isArray(moduleDefinition.activities)
      ? moduleDefinition.activities
      : [];

    const declaredDragQuestions = activities
      .filter(function (activity) { return activity?.mechanic === "drag-drop"; })
      .flatMap(function (activity) {
        return Array.isArray(activity?.questions) ? activity.questions : [];
      });

    if (!declaredDragQuestions.length) return;

    const directSingles = declaredDragQuestions.filter(isDirectSingleDragQuestion);

    /*
     * Fail closed: the bridge is enabled only when EVERY Drag & Drop
     * question in this module uses the validated direct-payload shape.
     * A mixed or malformed contract remains blocked by the Router.
     */
    if (directSingles.length !== declaredDragQuestions.length) {
      console.error(
        "[DuduQ Router Direct Payload Compat] Drag & Drop contract not eligible for bootstrap bridge."
      );
      return;
    }

    const original = router.getProfile("drag-drop");
    if (!original) return;

    const answerTypes = Array.from(
      new Set([...(original.answerTypes || []), "single"])
    );

    router.registerProfile({
      ...original,
      answerTypes,
      answerTypeWeights: {
        ...(original.answerTypeWeights || {}),
        single: 0
      },
      metadata: {
        ...(original.metadata || {}),
        directPayloadBootstrapCompatibility: VERSION
      }
    });

    /*
     * duduq:engine-ready is dispatched synchronously. The Universal
     * Player validates all activities in the same dispatch turn.
     * Restore the canonical profile in the following microtask so
     * automatic routing outside this bootstrap is never broadened.
     */
    queueMicrotask(function () {
      try {
        router.registerProfile(original);
      } catch (error) {
        console.error(
          "[DuduQ Router Direct Payload Compat] Could not restore canonical Drag & Drop profile.",
          error
        );
      }
    });
  }

  window.addEventListener(
    "duduq:engine-ready",
    installForBootstrap,
    { once: true }
  );
})();
