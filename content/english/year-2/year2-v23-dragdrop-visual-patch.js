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

  function patchSingleTargetChoiceM03(question) {
    if (!/^EN2-M3-\d{2}$/.test(String(question?.id || ""))) return;
    if (question?.delivery?.mechanic !== "drag-drop") return;

    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];

    if (alternatives.length < 2 || alternatives.length > 4 || pairs.length !== 1 || targets.length !== 1) {
      throw new Error(`${question.id}: SINGLE_TARGET_CHOICE exige 2–4 alternativas, um par correto e um único destino.`);
    }

    question.metadata = question.metadata || {};
    question.metadata.singleTargetChoice = true;
    question.metadata.confirmOnAnySelection = true;
    question.metadata.hideCapacityBadge = true;
    question.metadata.tapToPlace = true;
    question.metadata.replacePreviousChoice = true;
    question.metadata.interactionAdaptation = {
      ...(question.metadata.interactionAdaptation || {}),
      mode: "single-target-choice",
      runtimeFormat: "Uma alternativa por vez no destino; qualquer alternativa pode ser confirmada; validação apenas após CONFIRMAR.",
      visualRule: "Desktop: estímulo/destino amplo à esquerda e alternativas A–D em coluna à direita. Mobile: estímulo, destino, alternativas em duas colunas e CONFIRMAR no fluxo.",
      feedbackRule: "Erro: card vermelho temporário e retorno automático à origem; acerto: feedback padrão e avanço.",
      motorRule: "Arrastar e tocar/clicar são equivalentes para selecionar uma resposta."
    };

    const target = targets[0];
    target.kind = "single-choice";
    target.capacity = 1;
    target.compact = false;
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
      patchSingleTargetChoiceM03(question);
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
    dragDropVisualPatchVersionV23: "1.1.0-single-target-choice-homolog"
  });
})();