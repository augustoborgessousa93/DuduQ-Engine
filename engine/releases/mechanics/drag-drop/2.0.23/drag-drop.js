/* =========================================================
   DUDUQ MECHANIC — DRAG & DROP 2.0.23
   SINGLE TARGET CHOICE — M03 HOMOLOGATION CANDIDATE

   Branch-only candidate. It composes 2.0.22, preserving the
   consolidated sequence feedback, and adds a gated single-choice
   interaction used by Year 2 / Module 03 homologation.
   ========================================================= */
(function () {
  "use strict";

  const VERSION = "2.0.23";
  const BASE_URL = "/engine/releases/mechanics/drag-drop/2.0.22/drag-drop.js";

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.23 homolog] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "/" + expected + "): " + from.slice(0, 140));
    }
    return source.split(from).join(to);
  }

  const xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + "?dd223Base=2.0.22", false);
  try {
    xhr.send(null);
  } catch (error) {
    fail("não foi possível carregar a base 2.0.22: " + (error && error.message ? error.message : String(error)));
  }
  if (xhr.status < 200 || xhr.status >= 300 || !xhr.responseText) {
    fail("falha HTTP " + xhr.status + " ao carregar a base 2.0.22.");
  }

  let source = xhr.responseText;

  /* Candidate identity: adapter registers 2.0.23 but keeps the immutable
     2.0.22 HTML runtime path. The HTML is patched in-memory only. */
  source = replaceRequired(
    source,
    "const CANDIDATE_VERSION = \"2.0.22\";",
    "const CANDIDATE_VERSION = \"2.0.23\";"
  );
  source = replaceRequired(
    source,
    "['const VERSION = \"2.0.18\";', 'const VERSION = \"2.0.22\";'],",
    "['const VERSION = \"2.0.18\";', 'const VERSION = \"2.0.23\";'],"
  );
  source = replaceRequired(
    source,
    "source = source.split(\"DuduQ Drag & Drop 2.0.18\").join(\"DuduQ Drag & Drop 2.0.22\");",
    "source = source.split(\"DuduQ Drag & Drop 2.0.18\").join(\"DuduQ Drag & Drop 2.0.23\");"
  );

  /* Patch the 2.0.18 adapter source before 2.0.22 evaluates it.
     The source answer still contains one correct pair. For the gated mode,
     all visible alternatives become placeable in the same destination while
     correctness is carried separately in behavior.correctChoiceId. */
  const adapterPatch = `

  source = replaceRequired(
    source,
    '    const pairs = pairList(question.answer?.value || question.pairs);',
    '    const pairs = pairList(question.answer?.value || question.pairs);\\n    const singleTargetChoice = question.metadata?.singleTargetChoice === true || question.metadata?.interactionAdaptation?.mode === "single-target-choice";',
    1
  );

  source = replaceRequired(
    source,
    '    const items = [];\\n    const usedTargets = new Map();',
    '    if (singleTargetChoice) {\\n      const pair = pairs[0];\\n      const correctRaw = findAlternative(alternatives, pair.source);\\n      if (!correctRaw) throw new Error("Questão " + text(question.id, "sem-id") + ": alternativa correta não encontrada para SINGLE_TARGET_CHOICE.");\\n      const correctChoiceId = text(correctRaw.id);\\n      const targetId = text(isObject(pair.target) ? pair.target.id || pair.target.key || pair.target.value : pair.target, "single-choice-target");\\n      const target = targetBank.has(targetId) ? clone(targetBank.get(targetId)) : normalizeTarget({ id: targetId, label: "SOLTE AQUI", capacity: 1, kind: "single-choice" }, 0, source, context, catalog, registry);\\n      target.capacity = 1;\\n      target.kind = "single-choice";\\n      const choiceItems = alternatives.map(function (alternative, index) {\\n        const item = normalizeItem(alternative, index, source, context, catalog, registry);\\n        item.targetId = targetId;\\n        item.required = true;\\n        item.choiceCorrect = item.id === correctChoiceId;\\n        return item;\\n      });\\n      return { items: choiceItems, targets: [target], strategy: "single-target-choice", correctChoiceId };\\n    }\\n\\n    const items = [];\\n    const usedTargets = new Map();',
    1
  );

  source = replaceRequired(
    source,
    '        rejectWrongDrop: true',
    '        rejectWrongDrop: adapted.strategy === "single-target-choice" ? false : true,\\n        singleTargetChoice: adapted.strategy === "single-target-choice",\\n        correctChoiceId: adapted.correctChoiceId || undefined',
    1
  );
`;

  source = replaceRequired(
    source,
    "  let source = xhr.responseText;",
    "  let source = xhr.responseText;" + adapterPatch,
    1
  );

  const runtimePatch = `

    /* === 2.0.23 SINGLE TARGET CHOICE: gated behavioral patch === */
    prepared = replaceRequired(
      prepared,
      '  function validateDragDropQuestion(question) {\\n    const issues = [];',
      '  function validateDragDropQuestion(question) {\\n    const issues = [];\\n    const singleTargetChoice = question.behavior?.singleTargetChoice === true;',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      if (assignedCount > capacity) {',
      '      if (!singleTargetChoice && assignedCount > capacity) {',
      1
    );

    prepared = replaceRequired(
      prepared,
      '    if (totalCapacity < question.items.length) {',
      '    if (!singleTargetChoice && totalCapacity < question.items.length) {',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      [question.behavior]\\n    );\\n    const itemById = useMemo(',
      '      [question.behavior]\\n    );\\n    const singleTargetChoice = behavior.singleTargetChoice === true;\\n    const itemById = useMemo(',
      1
    );

    prepared = replaceRequired(
      prepared,
      '    const previousFeedbackRef = useRef("idle");\\n    const effectiveDisabled = isDragDropInteractionDisabled(disabled, feedbackState);',
      '    const previousFeedbackRef = useRef("idle");\\n    const singleChoiceRetryTimerRef = useRef(null);\\n    const [singleChoiceRetryAnimating, setSingleChoiceRetryAnimating] = useState(false);\\n    const effectiveDisabled = isDragDropInteractionDisabled(disabled, feedbackState) || singleChoiceRetryAnimating;',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      previousFeedbackRef.current = "idle";\\n    }, [presentationKey, question.id, question.items]);',
      '      previousFeedbackRef.current = "idle";\\n      setSingleChoiceRetryAnimating(false);\\n      if (singleChoiceRetryTimerRef.current !== null) { window.clearTimeout(singleChoiceRetryTimerRef.current); singleChoiceRetryTimerRef.current = null; }\\n    }, [presentationKey, question.id, question.items]);',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        if (behavior.returnIncorrectItemsOnRetry) {\\n          setPlacements((current) => {\\n            const next = { ...current };\\n            evaluation.incorrectItemIds.forEach((itemId) => {\\n              next[itemId] = null;\\n            });\\n            return next;\\n          });\\n        }',
      '        if (behavior.returnIncorrectItemsOnRetry) {\\n          if (singleTargetChoice && evaluation.incorrectItemIds.length > 0) {\\n            setSingleChoiceRetryAnimating(true);\\n            if (singleChoiceRetryTimerRef.current !== null) window.clearTimeout(singleChoiceRetryTimerRef.current);\\n            singleChoiceRetryTimerRef.current = window.setTimeout(() => {\\n              setPlacements((current) => {\\n                const next = { ...current };\\n                evaluation.incorrectItemIds.forEach((itemId) => { next[itemId] = null; });\\n                return next;\\n              });\\n              setLastEvaluation(null);\\n              lastEvaluationRef.current = null;\\n              setSingleChoiceRetryAnimating(false);\\n              singleChoiceRetryTimerRef.current = null;\\n              setAnnouncement("Tente novamente.");\\n            }, 850);\\n          } else {\\n            setPlacements((current) => {\\n              const next = { ...current };\\n              evaluation.incorrectItemIds.forEach((itemId) => { next[itemId] = null; });\\n              return next;\\n            });\\n          }\\n        }',
      1
    );

    prepared = replaceRequired(
      prepared,
      '    }, [behavior.lockCorrectItemsOnRetry, behavior.returnIncorrectItemsOnRetry, feedbackState, question.items]);',
      '    }, [behavior.lockCorrectItemsOnRetry, behavior.returnIncorrectItemsOnRetry, feedbackState, question.items, singleTargetChoice]);',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        const target = targetById.get(targetId);\\n        if (!target) return false;\\n        const currentTargetId = placements[itemId];',
      '        const target = targetById.get(targetId);\\n        if (!target) return false;\\n        if (singleTargetChoice) return true;\\n        const currentTargetId = placements[itemId];',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      [getTargetOccupancy, placements, targetById]\\n    );',
      '      [getTargetOccupancy, placements, singleTargetChoice, targetById]\\n    );',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        setPlacements((current) => ({ ...current, [itemId]: targetId }));',
      '        setPlacements((current) => {\\n          if (!singleTargetChoice) return { ...current, [itemId]: targetId };\\n          const next = Object.fromEntries(Object.keys(current).map((id) => [id, null]));\\n          next[itemId] = targetId;\\n          return next;\\n        });',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        notifyInteraction,\\n        targetById\\n      ]\\n    );',
      '        notifyInteraction,\\n        singleTargetChoice,\\n        targetById\\n      ]\\n    );',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        if (effectiveDisabled || lockedCorrectItemIds.has(itemId)) return;\\n        clearLocalEvaluationForInteraction();',
      '        if (effectiveDisabled || lockedCorrectItemIds.has(itemId)) return;\\n        if (singleTargetChoice) {\\n          const targetId = orderedTargets[0]?.id;\\n          if (targetId) placeItem(itemId, targetId);\\n          return;\\n        }\\n        clearLocalEvaluationForInteraction();',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        lockedCorrectItemIds,\\n        notifyInteraction\\n      ]\\n    );\\n    const activateTarget',
      '        lockedCorrectItemIds,\\n        notifyInteraction,\\n        orderedTargets,\\n        placeItem,\\n        singleTargetChoice\\n      ]\\n    );\\n    const activateTarget',
      1
    );

    prepared = replaceRequired(
      prepared,
      '    const allPlaced = question.items.every((item) => Boolean(placements[item.id]));',
      '    const selectedChoiceItemId = singleTargetChoice ? (question.items.find((item) => Boolean(placements[item.id]))?.id || null) : null;\\n    const allPlaced = singleTargetChoice ? Boolean(selectedChoiceItemId) : question.items.every((item) => Boolean(placements[item.id]));',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        const correctItemIds = [];\\n        const incorrectItemIds = [];\\n        question.items.forEach((item) => {\\n          if (placements[item.id] === item.targetId) {\\n            correctItemIds.push(item.id);\\n          } else {\\n            incorrectItemIds.push(item.id);\\n          }\\n        });',
      '        const correctItemIds = [];\\n        const incorrectItemIds = [];\\n        if (singleTargetChoice) {\\n          const selectedId = selectedChoiceItemId;\\n          const expectedId = behavior.correctChoiceId;\\n          if (selectedId && expectedId && selectedId === expectedId) correctItemIds.push(selectedId);\\n          else if (selectedId) incorrectItemIds.push(selectedId);\\n        } else {\\n          question.items.forEach((item) => {\\n            if (placements[item.id] === item.targetId) correctItemIds.push(item.id);\\n            else incorrectItemIds.push(item.id);\\n          });\\n        }',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      [allPlaced, announce, effectiveDisabled, onAnswer, placements, question.items]\\n    );',
      '      [allPlaced, announce, behavior.correctChoiceId, effectiveDisabled, onAnswer, placements, question.items, selectedChoiceItemId, singleTargetChoice]\\n    );',
      1
    );

    prepared = replaceRequired(
      prepared,
      '        if (feedbackState === "success") return "correct";',
      '        if (feedbackState === "success") return singleTargetChoice ? (itemId === behavior.correctChoiceId ? "correct" : "idle") : "correct";',
      1
    );

    prepared = replaceRequired(
      prepared,
      '      [feedbackState, lastEvaluation]\\n    );',
      '      [behavior.correctChoiceId, feedbackState, lastEvaluation, singleTargetChoice]\\n    );',
      1
    );

    prepared = replaceRequired(
      prepared,
      '            "data-has-media": Boolean(target.imageAssetKey),\\n            className: "duduq-dd-target",',
      '            "data-has-media": Boolean(target.imageAssetKey),\\n            "data-single-target-choice": singleTargetChoice ? "true" : "false",\\n            className: "duduq-dd-target",',
      1
    );

    prepared = prepared.replace(
      "</head>",
      '<style id="duduq-dd223-single-target-choice">' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]){width:min(920px,100%)!important;display:grid!important;grid-template-columns:minmax(310px,1.28fr) minmax(220px,.72fr)!important;grid-template-rows:auto!important;align-items:stretch!important;gap:clamp(16px,2vw,28px)!important;margin-inline:auto!important}' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-target-grid{grid-column:1!important;grid-row:1!important;display:flex!important;min-width:0!important}' +
      '.duduq-dd-target[data-single-target-choice="true"]{width:100%!important;min-height:clamp(285px,42vh,350px)!important;flex:1 1 100%!important;border:2px solid #c9d8e7!important;background:linear-gradient(180deg,#fff 0%,#f6faff 100%)!important;box-shadow:0 4px 0 #c6d5e3,0 12px 24px rgba(31,65,99,.07)!important;overflow:hidden!important}' +
      '.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-head{min-height:clamp(190px,29vh,250px)!important;flex:1 1 auto!important;padding:12px!important;cursor:default!important}' +
      '.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-media{width:clamp(160px,19vw,225px)!important;height:clamp(160px,19vw,225px)!important;max-width:82%!important;max-height:82%!important}' +
      '.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-capacity-badge{display:none!important}' +
      '.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-items{min-height:82px!important;flex:0 0 auto!important;margin:0 12px 12px!important;padding:8px 10px!important;border:2px dashed #91afd0!important;border-radius:16px!important;background:linear-gradient(180deg,#fbfdff,#f1f7fd)!important}' +
      '.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-item[data-compact="true"]{width:min(96%,300px)!important;max-width:300px!important;min-height:62px!important}' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool{grid-column:2!important;grid-row:1!important;min-height:clamp(285px,42vh,350px)!important;padding:4px!important;border:0!important;background:transparent!important;box-shadow:none!important;justify-content:center!important}' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool-head{display:none!important}' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool-items{min-height:0!important;display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;justify-content:center!important;gap:12px!important;padding:0!important}' +
      '.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool .duduq-dd-item{width:100%!important;max-width:260px!important;min-height:64px!important;margin-inline:auto!important}' +
      '.duduq-dd-target[data-single-target-choice="true"]:has(.duduq-dd-item[data-feedback="retry"]){border-color:#ff8a8a!important;box-shadow:0 4px 0 #d96b6b,0 12px 24px rgba(183,28,28,.08)!important}' +
      '@media(max-width:760px){.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]){display:flex!important;flex-direction:column!important;width:min(100%,560px)!important;gap:12px!important}.duduq-dd-target[data-single-target-choice="true"]{min-height:250px!important}.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-head{min-height:160px!important}.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-media{width:clamp(125px,38vw,185px)!important;height:clamp(125px,38vw,185px)!important}.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool{min-height:0!important}.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool-items{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool .duduq-dd-item{max-width:none!important;min-width:0!important}}' +
      '@media(max-height:700px) and (min-width:761px){.duduq-dd-target[data-single-target-choice="true"],.duduq-dd-board:has(.duduq-dd-target[data-single-target-choice="true"]) .duduq-dd-pool{min-height:270px!important}.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-head{min-height:175px!important}.duduq-dd-target[data-single-target-choice="true"] .duduq-dd-target-media{width:165px!important;height:165px!important}}' +
      '</style></head>'
    );
`;

  source = replaceRequired(
    source,
    '    if (!prepared.includes("</head>")) {',
    runtimePatch + '\n    if (!prepared.includes("</head>")) {',
    1
  );

  try {
    (0, eval)(source);
  } catch (error) {
    fail("falha ao inicializar candidato composto: " + (error && error.message ? error.message : String(error)));
  }

  console.info("[DuduQ] Drag & Drop SINGLE TARGET CHOICE homolog registrado:", VERSION);
})();