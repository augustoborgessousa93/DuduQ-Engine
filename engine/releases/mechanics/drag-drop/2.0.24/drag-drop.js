/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.24
   EXPLICIT SINGLE-CHOICE CONTRACT

   Escopo fechado:
   - compõe a base homologada 2.0.22 sem modificá-la;
   - adiciona somente payload.mode = "single-choice";
   - valida contrato inequívoco de uma escolha editorial;
   - avalia a colocação imediatamente nesse modo;
   - distrator -> retry sem progressão;
   - correto -> success e progressão normal;
   - association/classification/pairs/sequence permanecem no fluxo 2.0.22.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.24";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js";
  const SINGLE_CHOICE_HOOK = "__DUDUQ_DD224_SINGLE_CHOICE_PATCH__";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.24] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "/" + expected + "): " + from.slice(0, 160));
    }
    return source.split(from).join(to);
  }

  function patchSingleChoiceRuntime(html) {
    if (typeof html !== "string" || !html.trim()) {
      fail("runtime composto vazio ou inválido.");
    }

    let prepared = html;

    /* O contrato é explícito. required=false sozinho nunca ativa single-choice. */
    prepared = replaceRequired(
      prepared,
      `    payload.items.forEach(function (item) {
      if (item.required !== false && (!item.targetId || !targetIds.has(item.targetId))) {
        throw new Error("Item obrigatório sem destino válido: " + item.id);
      }
    });
    return {`,
      `    payload.items.forEach(function (item) {
      if (item.required !== false && (!item.targetId || !targetIds.has(item.targetId))) {
        throw new Error("Item obrigatório sem destino válido: " + item.id);
      }
    });
    if (payload.mode === "single-choice") {
      var singleChoiceRequired = payload.items.filter(function (item) { return item.required !== false; });
      var singleChoiceDistractors = payload.items.filter(function (item) { return item.required === false; });
      var singleChoiceTarget = payload.targets[0];
      var singleChoiceCapacity = singleChoiceTarget ? Number(singleChoiceTarget.capacity) : NaN;
      if (payload.targets.length !== 1) throw new Error("single-choice exige exatamente um destino.");
      if (payload.items.length < 2) throw new Error("single-choice exige pelo menos duas alternativas.");
      if (singleChoiceRequired.length !== 1) throw new Error("single-choice exige exatamente uma alternativa editorial correta.");
      if (singleChoiceDistractors.length < 1) throw new Error("single-choice exige ao menos um distrator.");
      if (!Number.isFinite(singleChoiceCapacity) || Math.round(singleChoiceCapacity) !== 1) throw new Error("single-choice exige capacidade do destino igual a 1.");
      if (singleChoiceRequired[0].targetId !== singleChoiceTarget.id) throw new Error("single-choice exige destino correto inequívoco para a alternativa editorial.");
      if (singleChoiceDistractors.some(function (item) { return Boolean(item.targetId); })) throw new Error("single-choice não aceita targetId nos distratores.");
    }
    return {`
    );

    prepared = replaceRequired(
      prepared,
      `        snapCorrectItems: false
      }`,
      `        snapCorrectItems: false,
        singleChoice: payload.mode === "single-choice"
      }`
    );

    prepared = replaceRequired(
      prepared,
      `"data-placed":placed ? "true" : "false",`,
      `"data-placed":placed ? "true" : "false",
          "data-dd2-item-id":item.id,`
    );

    prepared = replaceRequired(
      prepared,
      `"data-dd2-target-id":target.id,`,
      `"data-dd2-target-id":target.id,
              "data-single-choice":question.mode === "single-choice" ? "true" : undefined,`
    );

    prepared = replaceRequired(
      prepared,
      `var place = useCallback(function (itemId, targetId, source) {
      if (disabled || feedbackState === "success" || retryAnimating || correctItemIds.indexOf(itemId) >= 0) return;`,
      `var place = useCallback(function (itemId, targetId, source) {
      if (disabled || feedbackState === "success" || retryAnimating || correctItemIds.indexOf(itemId) >= 0 || (question.mode === "single-choice" && submitted.current)) return;`
    );

    prepared = replaceRequired(
      prepared,
      `      setSelected(null);
      setAnnouncement(dd2Accessible(item) + " encaixado.");

      if (source === "drop" && (item.audioAssetKey || item.spokenText)) {`,
      `      setSelected(null);
      setAnnouncement(dd2Accessible(item) + " encaixado.");

      if (question.mode === "single-choice") {
        var singleChoiceCorrect = item.required !== false && item.targetId === targetId;
        submitted.current = true;
        setCorrectItemIds(singleChoiceCorrect ? [item.id] : []);
        setWrongItemIds(singleChoiceCorrect ? [] : [item.id]);
        setAnnouncement(singleChoiceCorrect ? "Resposta correta." : "Tente novamente.");
        var singleChoicePlacements = Object.fromEntries(question.items.map(function (entry) {
          return [entry.id, entry.id === item.id ? targetId : null];
        }));
        onAnswer && onAnswer({
          isCorrect: singleChoiceCorrect,
          answer: { placements: singleChoicePlacements, orders: Object.fromEntries(question.targets.map(function (entry) { return [entry.id, entry.id === targetId ? [item.id] : []]; })) },
          eventCoords: { x: 0, y: 0 },
          metadata: {
            mechanic: "drag-drop",
            mechanicVersion: DD2_VERSION,
            mode: question.mode,
            strategy: question.strategy,
            singleChoice: true,
            selectedItemId: item.id,
            incorrectItemIds: singleChoiceCorrect ? [] : [item.id]
          }
        });
      }

      if (question.mode !== "single-choice" && source === "drop" && (item.audioAssetKey || item.spokenText)) {`
    );

    prepared = replaceRequired(
      prepared,
      `}, [audio.activeAudioKey, capacityFor, correctItemIds, disabled, feedbackState, itemMap, onInteraction, placements, playValueAudio, question.id, question.strategy, retryAnimating, targetMap]);`,
      `}, [audio.activeAudioKey, capacityFor, correctItemIds, disabled, feedbackState, itemMap, onAnswer, onInteraction, placements, playValueAudio, question.id, question.items, question.mode, question.strategy, question.targets, retryAnimating, targetMap]);`
    );

    prepared = replaceRequired(
      prepared,
      `    useEffect(function () {
      var previous = previousFeedback.current;
      previousFeedback.current = feedbackState;
      if (feedbackState === "idle") { submitted.current = false; return; }
      if (feedbackState !== "retry" || previous === "retry") return;
      submitted.current = false;
      setAnnouncement("Revise as posições e tente novamente.");
    }, [feedbackState]);`,
      `    useEffect(function () {
      var previous = previousFeedback.current;
      previousFeedback.current = feedbackState;
      if (feedbackState === "idle") { submitted.current = false; return; }
      if (feedbackState !== "retry" || previous === "retry") return;
      submitted.current = false;
      if (question.mode === "single-choice") {
        setRetryAnimating(true);
        if (retryReturnTimer.current !== null) window.clearTimeout(retryReturnTimer.current);
        retryReturnTimer.current = window.setTimeout(function () {
          setPlacements(initialPlacements());
          setSelected(null);
          setWrongItemIds([]);
          setCorrectItemIds([]);
          setRetryAnimating(false);
          retryReturnTimer.current = null;
          setAnnouncement("Ouça novamente e tente outra vez.");
        }, 850);
        return;
      }
      setAnnouncement("Revise as posições e tente novamente.");
    }, [feedbackState, initialPlacements, question.mode]);`
    );

    prepared = replaceRequired(
      prepared,
      `var ready = requiredItems.length > 0 && positionedCount === requiredItems.length;`,
      `var ready = question.mode === "single-choice" ? false : (requiredItems.length > 0 && positionedCount === requiredItems.length);`
    );

    prepared = prepared.replace(
      "<title>DuduQ - Drag and Drop 2.0.22 - Consolidated Sequence Feedback</title>",
      "<title>DuduQ - Drag and Drop 2.0.24 - Explicit Single Choice</title>"
    );

    return prepared;
  }

  try {
    Object.defineProperty(window, SINGLE_CHOICE_HOOK, {
      value: patchSingleChoiceRuntime,
      configurable: true,
      writable: false
    });
  } catch (_) {
    window[SINGLE_CHOICE_HOOK] = patchSingleChoiceRuntime;
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?dd224Base=2.0.22", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.22: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.22.");
  }

  let source = xhr.responseText;

  /* Identidade da release. O runtime HTML continua sendo o 2.0.22 imutável,
     composto em memória pelo adapter 2.0.24. */
  source = replaceRequired(source, 'const CANDIDATE_VERSION = "2.0.22";', 'const CANDIDATE_VERSION = "2.0.24";');
  source = replaceRequired(source, 'const CANDIDATE_RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.22/";', 'const CANDIDATE_RELEASE_PATH = "/engine/releases/mechanics/drag-drop/2.0.24/";');
  source = replaceRequired(
    source,
    '[\'const VERSION = "2.0.18";\', \'const VERSION = "2.0.22";\'],',
    '[\'const VERSION = "2.0.18";\', \'const VERSION = "2.0.24";\'],'
  );
  source = replaceRequired(
    source,
    'source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.22");',
    'source = source.split("DuduQ Drag & Drop 2.0.18").join("DuduQ Drag & Drop 2.0.24");'
  );

  /* Validação formal do contrato no adapter antes do mount. */
  const adapterContractPatch = `

  source = replaceRequired(
    source,
    '    const instructionAudio = isObject(question.audio) ? question.audio : isObject(question.media?.audio) ? question.media.audio : {};',
    '    const explicitMode = text(adapted.mode || question.payload?.mode || question.mode || question.type).toLowerCase().replace(/_/g, "-");\\n    if (explicitMode === "single-choice") {\\n      if (adapted.targets.length !== 1) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice exige exatamente um destino.");\\n      if (adapted.items.length < 2) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice exige pelo menos duas alternativas.");\\n      if (requiredItems.length !== 1) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice exige exatamente uma alternativa editorial correta.");\\n      if (adapted.items.filter(function (item) { return item.required === false; }).length < 1) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice exige ao menos um distrator.");\\n      var singleChoiceTarget = adapted.targets[0];\\n      if (Number(singleChoiceTarget.capacity) !== 1) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice exige capacidade 1.");\\n      if (requiredItems[0].targetId !== singleChoiceTarget.id) throw new Error("Questão " + text(question.id, index + 1) + ": single-choice sem resposta inequívoca.");\\n      if (adapted.items.some(function (item) { return item.required === false && Boolean(item.targetId); })) throw new Error("Questão " + text(question.id, index + 1) + ": distrator single-choice não pode possuir targetId.");\\n    }\\n\\n    const instructionAudio = isObject(question.audio) ? question.audio : isObject(question.media?.audio) ? question.media.audio : {};',
    1
  );

  source = replaceRequired(
    source,
    '        rejectWrongDrop: true',
    '        rejectWrongDrop: explicitMode === "single-choice" ? false : true,\\n        singleChoice: explicitMode === "single-choice"',
    1
  );

  source = replaceRequired(
    source,
    '      if (!questions.length) return false;\\n      return questions.every((question) => {',
    '      if (!questions.length) return false;\\n      const hasExplicitSingleChoice = questions.some((question) => text(question?.payload?.mode || question?.mode || question?.type).toLowerCase().replace(/_/g, "-") === "single-choice");\\n      if (hasExplicitSingleChoice) {\\n        try { buildRuntimeConfig(payload, {}); return true; } catch (_) { return false; }\\n      }\\n      return questions.every((question) => {',
    1
  );

  source = replaceRequired(
    source,
    '      answerTypes: ["pairs", "sequence", "data-driven-v2"],',
    '      answerTypes: ["pairs", "sequence", "data-driven-v2", "single-choice"],',
    1
  );
`;

  source = replaceRequired(
    source,
    "  let source = xhr.responseText;",
    "  let source = xhr.responseText;" + adapterContractPatch
  );

  /* O 2.0.22 aplica primeiro toda a correção homologada de sequence.
     Só então o patch single-choice atua sobre o DD2 já consolidado. */
  source = replaceRequired(
    source,
    `    return prepared;
  }

  try {
    Object.defineProperty(window, PATCH_HOOK, {`,
    `    prepared = window.__DUDUQ_DD224_SINGLE_CHOICE_PATCH__(prepared);
    return prepared;
  }

  try {
    Object.defineProperty(window, PATCH_HOOK, {`
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar release composta: " + (error && error.message ? error.message : String(error)));
  }
})();
