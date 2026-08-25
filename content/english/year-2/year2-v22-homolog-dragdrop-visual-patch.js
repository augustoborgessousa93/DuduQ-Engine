/* DUDUQ Year2 v2.2 — homologation-only Drag & Drop visual/data patch
   Purpose: keep Y2 interactions compact on mobile without changing immutable mechanic releases.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V22Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 DragDrop Visual Patch] Factory indisponível.");
    return;
  }
  if (factory.__dragDropVisualPatchApplied) return;

  const originalBuild = factory.buildModule.bind(factory);

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

  function buildModule(config) {
    return postProcess(originalBuild(config));
  }

  window.DuduQYear2V22Factory = Object.freeze({
    ...factory,
    buildModule,
    __dragDropVisualPatchApplied: true,
    dragDropVisualPatchVersion: "1.0.1-homolog"
  });
})();
