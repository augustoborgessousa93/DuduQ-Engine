/* DUDUQ English Year 2 — Drag & Drop 2.0.22 single-choice bridge
   Year-2 page scope only. The immutable 2.0.22 release and canary manifest are not changed.

   Contract:
   - any placed alternative enables CONFIRMAR;
   - correctness is evaluated only after CONFIRMAR;
   - wrong choice turns red, returns to the pool and clears the target;
   - correct choice keeps the normal success path;
   - sequence/classification/regular association stay untouched.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-year2-confirm-any-selection";
  const DD222_SCRIPT = /\/engine\/releases\/mechanics\/drag-drop\/2\.0\.22\/drag-drop\.js(?:[?#]|$)/i;
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";

  if (window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__) return;

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      throw new Error(`[Year2 DD confirm-any] assinatura inesperada (${count}/${expected}): ${from.slice(0, 120)}`);
    }
    return source.split(from).join(to);
  }

  function patchYear2Runtime(html) {
    let prepared = String(html || "");
    if (!prepared) throw new Error("[Year2 DD confirm-any] runtime vazio.");
    if (prepared.includes("__DUDUQ_YEAR2_SINGLE_TARGET_CHOICE_RUNTIME__")) return prepared;

    prepared = replaceRequired(
      prepared,
      `      [question.behavior]\n    );\n    const itemById = useMemo(`,
      `      [question.behavior]\n    );\n    const year2SingleTargetChoice = Boolean(\n      question.targets?.length === 1 &&\n      Number(question.targets[0]?.capacity || 1) === 1 &&\n      question.items?.length >= 2 &&\n      question.items.filter((item) => item.required !== false && item.targetId === question.targets[0]?.id).length === 1 &&\n      question.items.some((item) => item.required === false)\n    );\n    const year2CorrectChoiceId = year2SingleTargetChoice\n      ? (question.items.find((item) => item.required !== false && item.targetId === question.targets[0]?.id)?.id || null)\n      : null;\n    const __DUDUQ_YEAR2_SINGLE_TARGET_CHOICE_RUNTIME__ = year2SingleTargetChoice;\n    const itemById = useMemo(`
    );

    prepared = replaceRequired(
      prepared,
      `    const previousFeedbackRef = useRef("idle");\n    const effectiveDisabled = isDragDropInteractionDisabled(disabled, feedbackState);`,
      `    const previousFeedbackRef = useRef("idle");\n    const year2SingleChoiceRetryTimerRef = useRef(null);\n    const [year2SingleChoiceRetryAnimating, setYear2SingleChoiceRetryAnimating] = useState(false);\n    const effectiveDisabled = isDragDropInteractionDisabled(disabled, feedbackState) || year2SingleChoiceRetryAnimating;`
    );

    prepared = replaceRequired(
      prepared,
      `      previousFeedbackRef.current = "idle";\n    }, [presentationKey, question.id, question.items]);`,
      `      previousFeedbackRef.current = "idle";\n      setYear2SingleChoiceRetryAnimating(false);\n      if (year2SingleChoiceRetryTimerRef.current !== null) {\n        window.clearTimeout(year2SingleChoiceRetryTimerRef.current);\n        year2SingleChoiceRetryTimerRef.current = null;\n      }\n    }, [presentationKey, question.id, question.items]);`
    );

    prepared = replaceRequired(
      prepared,
      `        if (behavior.returnIncorrectItemsOnRetry) {\n          setPlacements((current) => {\n            const next = { ...current };\n            evaluation.incorrectItemIds.forEach((itemId) => {\n              next[itemId] = null;\n            });\n            return next;\n          });\n        }`,
      `        if (behavior.returnIncorrectItemsOnRetry) {\n          if (year2SingleTargetChoice && evaluation.incorrectItemIds.length > 0) {\n            setYear2SingleChoiceRetryAnimating(true);\n            if (year2SingleChoiceRetryTimerRef.current !== null) window.clearTimeout(year2SingleChoiceRetryTimerRef.current);\n            year2SingleChoiceRetryTimerRef.current = window.setTimeout(() => {\n              setPlacements((current) => {\n                const next = { ...current };\n                evaluation.incorrectItemIds.forEach((itemId) => { next[itemId] = null; });\n                return next;\n              });\n              setLastEvaluation(null);\n              lastEvaluationRef.current = null;\n              setYear2SingleChoiceRetryAnimating(false);\n              year2SingleChoiceRetryTimerRef.current = null;\n              setAnnouncement("Tente novamente.");\n            }, 850);\n          } else {\n            setPlacements((current) => {\n              const next = { ...current };\n              evaluation.incorrectItemIds.forEach((itemId) => { next[itemId] = null; });\n              return next;\n            });\n          }\n        }`
    );

    prepared = replaceRequired(
      prepared,
      `    }, [behavior.lockCorrectItemsOnRetry, behavior.returnIncorrectItemsOnRetry, feedbackState, question.items]);`,
      `    }, [behavior.lockCorrectItemsOnRetry, behavior.returnIncorrectItemsOnRetry, feedbackState, question.items, year2SingleTargetChoice]);`
    );

    prepared = replaceRequired(
      prepared,
      `        const target = targetById.get(targetId);\n        if (!target) return false;\n        const currentTargetId = placements[itemId];`,
      `        const target = targetById.get(targetId);\n        if (!target) return false;\n        if (year2SingleTargetChoice) return true;\n        const currentTargetId = placements[itemId];`
    );

    prepared = replaceRequired(
      prepared,
      `      [getTargetOccupancy, placements, targetById]\n    );`,
      `      [getTargetOccupancy, placements, targetById, year2SingleTargetChoice]\n    );`
    );

    prepared = replaceRequired(
      prepared,
      `        setPlacements((current) => ({ ...current, [itemId]: targetId }));`,
      `        setPlacements((current) => {\n          if (!year2SingleTargetChoice) return { ...current, [itemId]: targetId };\n          const next = Object.fromEntries(Object.keys(current).map((id) => [id, null]));\n          next[itemId] = targetId;\n          return next;\n        });`
    );

    prepared = replaceRequired(
      prepared,
      `        notifyInteraction,\n        targetById\n      ]\n    );`,
      `        notifyInteraction,\n        targetById,\n        year2SingleTargetChoice\n      ]\n    );`
    );

    prepared = replaceRequired(
      prepared,
      `        if (effectiveDisabled || lockedCorrectItemIds.has(itemId)) return;\n        clearLocalEvaluationForInteraction();`,
      `        if (effectiveDisabled || lockedCorrectItemIds.has(itemId)) return;\n        if (year2SingleTargetChoice) {\n          const targetId = orderedTargets[0]?.id;\n          if (targetId) placeItem(itemId, targetId);\n          return;\n        }\n        clearLocalEvaluationForInteraction();`
    );

    prepared = replaceRequired(
      prepared,
      `        lockedCorrectItemIds,\n        notifyInteraction\n      ]\n    );\n    const activateTarget`,
      `        lockedCorrectItemIds,\n        notifyInteraction,\n        orderedTargets,\n        placeItem,\n        year2SingleTargetChoice\n      ]\n    );\n    const activateTarget`
    );

    prepared = replaceRequired(
      prepared,
      `    const allPlaced = question.items.every((item) => Boolean(placements[item.id]));`,
      `    const year2SelectedChoiceItemId = year2SingleTargetChoice\n      ? (question.items.find((item) => Boolean(placements[item.id]))?.id || null)\n      : null;\n    const allPlaced = year2SingleTargetChoice\n      ? Boolean(year2SelectedChoiceItemId)\n      : question.items.every((item) => Boolean(placements[item.id]));`
    );

    prepared = replaceRequired(
      prepared,
      `        const correctItemIds = [];\n        const incorrectItemIds = [];\n        question.items.forEach((item) => {\n          if (placements[item.id] === item.targetId) {\n            correctItemIds.push(item.id);\n          } else {\n            incorrectItemIds.push(item.id);\n          }\n        });`,
      `        const correctItemIds = [];\n        const incorrectItemIds = [];\n        if (year2SingleTargetChoice) {\n          const selectedId = year2SelectedChoiceItemId;\n          if (selectedId && year2CorrectChoiceId && selectedId === year2CorrectChoiceId) correctItemIds.push(selectedId);\n          else if (selectedId) incorrectItemIds.push(selectedId);\n        } else {\n          question.items.forEach((item) => {\n            if (placements[item.id] === item.targetId) correctItemIds.push(item.id);\n            else incorrectItemIds.push(item.id);\n          });\n        }`
    );

    prepared = replaceRequired(
      prepared,
      `      [allPlaced, announce, effectiveDisabled, onAnswer, placements, question.items]\n    );`,
      `      [allPlaced, announce, effectiveDisabled, onAnswer, placements, question.items, year2CorrectChoiceId, year2SelectedChoiceItemId, year2SingleTargetChoice]\n    );`
    );

    prepared = replaceRequired(
      prepared,
      `        if (feedbackState === "success") return "correct";`,
      `        if (feedbackState === "success") return year2SingleTargetChoice ? (itemId === year2CorrectChoiceId ? "correct" : "idle") : "correct";`
    );

    prepared = replaceRequired(
      prepared,
      `      [feedbackState, lastEvaluation]\n    );`,
      `      [feedbackState, lastEvaluation, year2CorrectChoiceId, year2SingleTargetChoice]\n    );`
    );

    prepared = replaceRequired(
      prepared,
      `            "data-has-media": Boolean(target.imageAssetKey),\n            className: "duduq-dd-target",`,
      `            "data-has-media": Boolean(target.imageAssetKey),\n            "data-year2-single-target-choice": year2SingleTargetChoice ? "true" : "false",\n            className: "duduq-dd-target",`
    );

    return prepared;
  }

  function composeHook() {
    const upstream = window[HOOK];
    if (typeof upstream !== "function" || upstream.__year2ConfirmAnyComposed) return false;

    const composed = function year2ConfirmAnyRuntimeHook(html) {
      const upstreamPrepared = upstream(html);
      return patchYear2Runtime(upstreamPrepared);
    };
    Object.defineProperty(composed, "__year2ConfirmAnyComposed", { value: true });

    try {
      Object.defineProperty(window, HOOK, {
        value: composed,
        configurable: true,
        writable: false
      });
    } catch (_) {
      window[HOOK] = composed;
    }
    return true;
  }

  document.addEventListener(
    "load",
    function year2DragDropAdapterLoadCapture(event) {
      const script = event.target;
      if (!script || script.tagName !== "SCRIPT") return;
      const src = String(script.src || script.getAttribute("src") || "");
      if (!DD222_SCRIPT.test(src)) return;
      try {
        if (!composeHook()) {
          console.warn("[DuduQ Year2 DD confirm-any] Hook 2.0.22 não estava disponível após o adapter carregar.");
        }
      } catch (error) {
        console.error("[DuduQ Year2 DD confirm-any] Falha ao compor runtime.", error);
      }
    },
    true
  );

  window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    releaseModified: false,
    canaryModified: false,
    targetRelease: "2.0.22"
  });
})();
