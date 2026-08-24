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
    const byText = Object.fromEntries(letters.map((item) => [String(item?.text || "").toUpperCase(), item?.id]));
    const order = ["L", "E", "O"].map((letter) => byText[letter]).filter(Boolean);
    if (order.length !== 3 || !byText.A) {
      throw new Error("EN2-M1-12: catálogo L/E/O/A incompleto para montagem compacta.");
    }

    question.answer = { type: "single", value: null };
    question.payload = {
      mode: "sequence",
      items: letters.map((item) => ({
        id: item.id,
        label: item.text,
        text: item.text,
        audio: item.audio,
        required: order.includes(item.id)
      })),
      targets: [{ id: "spell-sequence", kind: "list", capacity: 3 }],
      order,
      targetLabel: "MONTE O NOME"
    };
    question.metadata = question.metadata || {};
    question.metadata.sequenceTargetId = "spell-sequence";
    question.metadata.sequenceTitle = "MONTE O NOME";
    question.metadata.interactionAdaptation = {
      ...(question.metadata.interactionAdaptation || {}),
      runtimeFormat: "Primeira escuta sem letras; depois, três slots compactos em linha e quatro letras móveis L/E/O/A.",
      visualRule: "No mobile, os três slots e as quatro letras devem aparecer no primeiro viewport após o reveal."
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
    dragDropVisualPatchVersion: "1.0.0-homolog"
  });
})();
