/* =========================================================
   DUDUQ — YEAR 2 / MODULE 01 — WORD SLASH HOMOLOGATION OVERLAY

   Escopo estritamente local desta branch de homologação.
   Não altera Canary 143, releases imutáveis nem módulos já aprovados.

   Piloto: EN2-M1-08
   Habilidade: ouvir e identificar o nome da letra C em inglês.
   Decisão: Word Slash é usado como discriminação auditiva + símbolo isolado,
   com baixa velocidade, alvos grandes, sem penalidade por erro e sem exigir
   leitura autônoma de palavra/frase.
   ========================================================= */

(function () {
  "use strict";

  const root = window.DUDUQ_CONTENT = window.DUDUQ_CONTENT || {};
  root.english = root.english || {};
  root.english.year2 = root.english.year2 || {};

  const year2 = root.english.year2;
  let storedModule = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function findQuestion(moduleDefinition, questionId) {
    for (const activity of moduleDefinition.activities || []) {
      for (const question of activity.questions || []) {
        if (question.id === questionId) return { activity, question };
      }
    }
    return null;
  }

  function wordObject(letter, weight) {
    const normalized = String(letter || "").trim().toUpperCase();
    return {
      id: "letter-" + normalized.toLowerCase(),
      type: "word",
      label: normalized,
      value: normalized,
      category: normalized,
      weight: weight || 1
    };
  }

  function patchModule(source) {
    const moduleDefinition = clone(source);
    const targetId = "EN2-M1-08";
    const located = findQuestion(moduleDefinition, targetId);

    if (!located) {
      console.warn("[DuduQ Year 2 Homolog] EN2-M1-08 não encontrado; módulo preservado.");
      return source;
    }

    const sourceActivity = located.activity;
    const sourceQuestion = located.question;

    sourceActivity.questions = (sourceActivity.questions || [])
      .filter(function (question) {
        return question.id !== targetId;
      });

    const question = clone(sourceQuestion);
    question.instruction = "Ouça a letra e corte somente a letra correta.";
    question.delivery = question.delivery || {};
    question.delivery.mechanic = "word-slash";
    question.delivery.allowAudio = true;
    question.delivery.allowImage = false;

    question.feedback = question.feedback || {};
    question.feedback.correct = "Muito bem! Você reconheceu a letra C pelo som.";
    question.feedback.incorrect = "Ouça a letra C novamente. Depois corte somente a letra C.";

    question.metadata = question.metadata || {};
    question.metadata.title = "LETTER C";
    question.metadata.screenTitle = "LETTER C";
    question.metadata.homologation = {
      status: "pilot",
      policy: "YEAR2_WORD_SLASH_PEDAGOGICAL_HOMOLOGATION",
      readingDemand: "R0-R1",
      rationale: "Reconhecimento auditivo de letra com resposta por símbolo isolado; leitura autônoma não é necessária."
    };
    question.metadata.wordSlash = {
      mode: "correct-word",
      audioText: "C",
      goal: 2,
      target: {
        label: "OUÇA",
        value: "C",
        spokenText: "C",
        hideValue: true
      },
      difficulty: {
        speedMinMs: 6500,
        speedMaxMs: 8000,
        maxObjects: 3,
        spawnEveryMs: 1300,
        timeLimitSeconds: 60,
        correctProbability: 0.6
      },
      objects: [
        wordObject("A", 1),
        wordObject("B", 1),
        wordObject("C", 2)
      ]
    };

    const wordSlashActivity = {
      id: "en2-m1-step-03b-alphabet-slash-pilot",
      title: "Listen & Slash the Letter",
      mechanic: "word-slash",
      skill: clone(sourceActivity.skill || question.skill || {}),
      questions: [question],
      metadata: {
        homologationOnly: true,
        sourceQuestionId: targetId
      }
    };

    const index = (moduleDefinition.activities || []).findIndex(function (activity) {
      return activity.id === sourceActivity.id;
    });

    if (index >= 0) {
      moduleDefinition.activities.splice(index + 1, 0, wordSlashActivity);
    } else {
      moduleDefinition.activities.push(wordSlashActivity);
    }

    moduleDefinition.version = "1.3.2-homolog-word-slash";
    moduleDefinition.description =
      String(moduleDefinition.description || "") +
      " Homologação pedagógica: EN2-M1-08 utiliza Word Slash com discriminação auditiva de letra e baixa demanda de leitura.";

    moduleDefinition.pedagogicalNotes = moduleDefinition.pedagogicalNotes || {};
    moduleDefinition.pedagogicalNotes.wordSlashHomologation =
      "Piloto local no EN2-M1-08. A mecânica não é aplicada por cota: permanece condicionada à habilidade, ao perfil Y2_FOUNDATIONAL_LITERACY e à demanda de leitura R0/R1.";

    if (moduleDefinition.audioCatalog && moduleDefinition.audioCatalog[targetId]) {
      moduleDefinition.audioCatalog[targetId].mechanic = "word-slash";
      if (moduleDefinition.audioCatalog[targetId].instruction) {
        moduleDefinition.audioCatalog[targetId].instruction.text =
          "Ouça a letra e corte somente a letra correta.";
      }
    }

    return Object.freeze(moduleDefinition);
  }

  Object.defineProperty(year2, "module01", {
    configurable: true,
    enumerable: true,
    get: function () {
      return storedModule;
    },
    set: function (value) {
      storedModule = patchModule(value);
    }
  });
})();
