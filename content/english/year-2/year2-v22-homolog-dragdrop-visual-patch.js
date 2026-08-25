/* DUDUQ Year2 — homologation-only Drag & Drop visual/data patch
   Purpose: keep Y2 interactions compact on mobile without changing immutable mechanic releases.
   Applies to both the v2.2 base Factory and, when already loaded, the v2.3 multimodal Factory.
*/
(function () {
  "use strict";

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function normalizeResponseTargets(question) {
    if (question?.delivery?.mechanic !== "drag-drop") return;
    const targets = question?.metadata?.targets;
    if (!Array.isArray(targets)) return;
    for (const target of targets) {
      if (!target || typeof target !== "object") continue;
      if (target.id === "response-target" && target.kind === "box" && !target.imageSrc) {
        target.kind = "response";
        target.compact = true;
      }
    }
  }

  function patchM112(question) {
    if (question?.id !== "EN2-M1-12") return;
    const letters = Array.isArray(question.alternatives) ? question.alternatives : [];
    const values = letters.map((item) => String(item?.text || "").toUpperCase());
    for (const required of ["L", "E", "O", "A"]) {
      if (!values.includes(required)) throw new Error(`EN2-M1-12: letra ${required} ausente.`);
    }

    const targets = question?.metadata?.targets;
    if (!Array.isArray(targets) || targets.length !== 3) {
      throw new Error("EN2-M1-12: esperados três destinos posicionais.");
    }
    for (const target of targets) {
      target.kind = "spell-slot";
      target.compact = true;
    }

    question.metadata = question.metadata || {};
    question.metadata.interactionAdaptation = {
      ...(question.metadata.interactionAdaptation || {}),
      runtimeFormat: "Primeira escuta sem letras; depois, três destinos posicionais compactos em linha e quatro letras móveis L/E/O/A.",
      visualRule: "No mobile, os três destinos e as quatro letras devem aparecer juntos no primeiro viewport após o reveal."
    };
  }

  function postProcess(module) {
    for (const question of allQuestions(module)) {
      normalizeResponseTargets(question);
      patchM112(question);
    }
    return module;
  }

  function wrapFactory(globalName, markerName, versionName) {
    const factory = window[globalName];
    if (!factory || typeof factory.buildModule !== "function") return false;
    if (factory[markerName]) return true;

    const originalBuild = factory.buildModule.bind(factory);
    const wrapped = Object.freeze({
      ...factory,
      buildModule(config) {
        return postProcess(originalBuild(config));
      },
      [markerName]: true,
      [versionName]: "1.0.2-homolog"
    });
    window[globalName] = wrapped;
    return true;
  }

  const baseOk = wrapFactory(
    "DuduQYear2V22Factory",
    "__dragDropVisualPatchApplied",
    "dragDropVisualPatchVersion"
  );

  const v23Ok = wrapFactory(
    "DuduQYear2V23Factory",
    "__dragDropVisualPatchAppliedV23",
    "dragDropVisualPatchVersionV23"
  );

  if (!baseOk && !v23Ok) {
    console.error("[DuduQ Year2 DragDrop Visual Patch] Factories indisponíveis.");
  }
})();
