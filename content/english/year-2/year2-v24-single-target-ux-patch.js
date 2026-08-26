/* DUDUQ Year2 M03 — Drag & Drop 2.0.24 SINGLE_TARGET_CHOICE UX patch
   Homologation only. Keeps the public R143 entry untouched.
*/
(function () {
  "use strict";

  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    console.error("[DuduQ Year2 DD24 UX] Factory v2.3 indisponível.");
    return;
  }
  if (factory.__dd24SingleTargetUxApplied) return;

  const originalBuild = factory.buildModule.bind(factory);

  function pilotEnabled() {
    return window.DUDUQ_PUBLIC_ENTRY?.interactionPilot === "SINGLE_TARGET_CHOICE" &&
      window.DUDUQ_PUBLIC_ENTRY?.dragDropCandidate === "2.0.24";
  }

  function allQuestions(module) {
    return (module?.activities || []).flatMap((activity) => activity?.questions || []);
  }

  function cleanM03(question) {
    if (!pilotEnabled()) return;
    if (!/^EN2-M3-\d{2}$/.test(String(question?.id || ""))) return;
    if (question?.delivery?.mechanic !== "drag-drop") return;

    const alternatives = Array.isArray(question.alternatives) ? question.alternatives : [];
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];

    if (alternatives.length < 2 || alternatives.length > 4 || pairs.length !== 1 || targets.length !== 1) {
      throw new Error(`${question.id}: DD24 SINGLE_TARGET_CHOICE exige 2–4 alternativas, um par correto e um destino.`);
    }

    question.metadata = question.metadata || {};
    question.metadata.singleTargetChoice = true;
    question.metadata.confirmOnAnySelection = true;
    question.metadata.hideCapacityBadge = true;
    question.metadata.tapToPlace = true;
    question.metadata.replacePreviousChoice = true;
    question.metadata.selectionAudioAutoplay = true;
    question.metadata.selectionAudioDebounceMs = 260;
    question.metadata.visualBaseline = "R143";
    question.metadata.interactionAdaptation = {
      ...(question.metadata.interactionAdaptation || {}),
      mode: "single-target-choice",
      runtimeFormat: "Uma alternativa por vez no destino; clique/toque e arraste são equivalentes; validação somente após CONFIRMAR.",
      visualRule: "Composição centralizada baseada na R143; card compacto; alternativas próximas e horizontais no desktop/notebook; resposta encaixada compacta sem aumentar o card.",
      feedbackRule: "Erro somente após confirmação: card vermelho breve e retorno automático à origem; acerto segue o fluxo padrão.",
      motorRule: "Clique/toque deve mover automaticamente a alternativa para SOLTE AQUI e reproduzir o áudio uma vez."
    };

    /* Enunciado visual limpo. O áudio da instrução permanece no botão principal
       separado, à direita do cabeçalho da atividade. */
    question.statement = "VEJA, OUÇA E ESCOLHA";
    question.instruction = question.statement;
    question.metadata.instructionVisualIconsRemoved = true;
    if (question.metadata.instructionAudio) {
      question.metadata.instructionAudio = {
        ...question.metadata.instructionAudio,
        enabled: true,
        text: "Veja, ouça e escolha.",
        language: "pt-BR",
        repeatable: true
      };
    }

    /* O card já possui controle de áudio real do runtime. O texto editorial
       deve conter somente A/B/C/D para impedir dois speakers no mesmo card. */
    alternatives.forEach((alternative, index) => {
      if (!alternative || typeof alternative !== "object") return;
      const letter = String.fromCharCode(65 + index);
      alternative.text = letter;
      alternative.metadata = {
        ...(alternative.metadata || {}),
        choiceLetter: letter,
        audioAffordanceOwner: "runtime-control",
        duplicateAudioGlyphRemoved: true,
        autoPlayOnSelection: true
      };
    });

    const target = targets[0];
    target.kind = "single-choice";
    target.capacity = 1;
    target.compact = true;
  }

  function postProcess(module) {
    for (const question of allQuestions(module)) cleanM03(question);
    return module;
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return postProcess(originalBuild(config));
    },
    __dd24SingleTargetUxApplied: true,
    dd24SingleTargetUxVersion: "2.0.24-r143-visual-a"
  });
})();
