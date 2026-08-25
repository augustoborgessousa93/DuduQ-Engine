/* DUDUQ Year2 v2.3 — homologation-only Drag & Drop visual/data patch
   Purpose: keep v2.3 multimodal interactions compact without touching the v2.2 shared patch
   or immutable mechanic releases.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 v2.3 DragDrop Visual Patch] Factory v2.3 indisponível.");
    return;
  }
  if (factory.__dragDropVisualPatchAppliedV23) return;

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
      if (!values.includes(required)) {
        throw new Error(`EN2-M1-12: letra ${required} ausente.`);
      }
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

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __dragDropVisualPatchAppliedV23: true,
    dragDropVisualPatchVersionV23: "1.0.0-homolog"
  });
})();
