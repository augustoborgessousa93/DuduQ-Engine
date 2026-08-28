/* DUDUQ English Year 2 — short pedagogical instruction layer
   Applies only to learner-facing commands after the final mechanic is selected.
   Editorial source prompts, IDs, answers and scoring remain untouched.
*/
(function () {
  "use strict";

  const VERSION = "1.0.1-short-narrable-instructions";
  const factory = window.DuduQYear2V23Factory;
  if (!factory || typeof factory.buildModule !== "function") {
    throw new Error("[DuduQ Year2 Instructions] Factory v2.3 indisponível.");
  }
  if (window.__DUDUQ_YEAR2_PEDAGOGICAL_INSTRUCTIONS__) return;

  const upstreamBuild = factory.buildModule.bind(factory);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function hasImage(question) {
    if (question?.metadata?.sourcePlanHasVisualV23 === true) return true;
    return (question?.alternatives || []).some(function (alternative) {
      const image = alternative?.image;
      return Boolean(
        alternative?.imageSrc || alternative?.imageUrl || alternative?.metadata?.imageAssetKey ||
        (image && typeof image === "object" ? image.src || image.enabled === true : image)
      );
    });
  }

  function isMultiTarget(question) {
    const targets = Array.isArray(question?.metadata?.targets) ? question.metadata.targets : [];
    const pairs = Array.isArray(question?.answer?.value) ? question.answer.value : [];
    return targets.length > 1 || pairs.length > 1;
  }

  function commandFor(question, activity) {
    const mechanic = String(activity?.mechanic || question?.delivery?.mechanic || "").toLowerCase();
    const mode = String(question?.metadata?.sourcePlanModeV23 || "").toLowerCase();
    const topic = String(question?.metadata?.topic || activity?.topic || "").toUpperCase();
    const image = hasImage(question);

    if (mechanic === "target-shooter") {
      if (mode === "letter-choice" || question?.metadata?.optionPresentation === "ISOLATED_LETTER_SYMBOLS") {
        return "OUÇA E TOQUE NA LETRA CORRETA.";
      }
      return image || mode === "audio-image"
        ? "OUÇA E TOQUE NA IMAGEM CORRETA."
        : "OUÇA E TOQUE NA RESPOSTA CORRETA.";
    }

    if (mechanic === "bubble-pop") {
      return image
        ? "OUÇA E ESTOURE A IMAGEM CORRETA."
        : "OUÇA E ESTOURE A RESPOSTA CORRETA.";
    }

    if (mechanic === "matching") {
      return "OUÇA E JUNTE CADA SOM À IMAGEM.";
    }

    if (mechanic === "memory-quest") {
      return "ENCONTRE OS PARES CORRETOS.";
    }

    if (mechanic === "smart-sentence") {
      return "OUÇA E MONTE A FRASE.";
    }

    if (mechanic === "word-slash") {
      return "OUÇA E CORTE A PALAVRA CORRETA.";
    }

    if (mechanic === "drag-drop") {
      if (isMultiTarget(question)) {
        return image
          ? "ARRASTE CADA IMAGEM PARA O LUGAR CORRETO."
          : "ARRASTE CADA RESPOSTA PARA O LUGAR CORRETO.";
      }
      if (mode === "letter-choice" || topic === "ALPHABET" && question?.metadata?.optionPresentation === "ISOLATED_LETTER_SYMBOLS") {
        return "OUÇA E ARRASTE A LETRA CORRETA.";
      }
      return "OUÇA E ARRASTE A RESPOSTA CORRETA.";
    }

    if (mode === "letter-choice") return "OUÇA E ESCOLHA A LETRA CORRETA.";
    if (mode === "spelling-build") return "OUÇA E MONTE A PALAVRA.";
    if (mode === "audio-image") return "OUÇA E ESCOLHA A IMAGEM CORRETA.";
    return "OUÇA E ESCOLHA A RESPOSTA CORRETA.";
  }

  function spoken(display) {
    const clean = String(display || "").trim().replace(/\s+/g, " ");
    if (!clean) return "";
    const lower = clean.toLocaleLowerCase("pt-BR");
    return lower.charAt(0).toLocaleUpperCase("pt-BR") + lower.slice(1);
  }

  function refine(module) {
    const refined = clone(module);
    let normalized = 0;

    for (const activity of refined.activities || []) {
      for (const question of activity.questions || []) {
        const display = commandFor(question, activity);
        const previous = String(question.statement || question.instruction || "");
        const speech = spoken(display);
        question.metadata = question.metadata || {};
        question.metadata.pedagogicalInstruction = {
          version: VERSION,
          previousDisplayInstruction: previous,
          display,
          speech,
          mechanic: String(activity?.mechanic || question?.delivery?.mechanic || ""),
          principle: "SHORT_NARRABLE_MECHANIC_ALIGNED"
        };
        question.statement = display;
        question.instruction = display;
        question.metadata.instructionAudio = {
          ...(question.metadata.instructionAudio || {}),
          enabled: true,
          text: speech,
          language: "pt-BR",
          repeatable: true
        };
        normalized += 1;
      }
    }

    refined.audit = {
      ...(refined.audit || {}),
      pedagogicalInstructions: {
        version: VERSION,
        normalized,
        profile: "Y2_FOUNDATIONAL_LITERACY",
        maxReadingRole: "R1_SUPPORTED",
        editorialSourcePromptsPreserved: true
      }
    };
    return Object.freeze(refined);
  }

  window.DuduQYear2V23Factory = Object.freeze({
    ...factory,
    buildModule(config) {
      return refine(upstreamBuild(config));
    },
    __pedagogicalInstructionsApplied: true
  });

  window.__DUDUQ_YEAR2_PEDAGOGICAL_INSTRUCTIONS__ = Object.freeze({
    version: VERSION,
    scope: "year-2-all-90-items",
    rule: "short-narrable-mechanic-aligned",
    sourcePromptsPreserved: true
  });
})();
