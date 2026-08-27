/* DUDUQ English Year 2 — Drag & Drop 2.0.22 confirm-any bridge
   Year-2 page scope only. The immutable 2.0.22 release and Canary remain unchanged.

   Runtime contract for single-target choice:
   - detect the existing v2.3 shape (1 target, 1 required correct item + distractors);
   - any alternative can be placed and enables CONFIRMAR;
   - correctness is evaluated only after CONFIRMAR;
   - wrong choice stays red briefly, returns to the bank and clears the target;
   - correct choice follows the normal success path;
   - audio alternatives remain independently clickable while another option is playing,
     so the shared audio controller can stop the previous option and start the new one;
   - sequence/classification/regular association remain untouched;
   - no candidate 2.0.23 CSS/layout is imported.
*/
(function () {
  "use strict";

  const VERSION = "1.2.0-year2-listening-audio-switch-active-dd2";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqYear2ConfirmAnyActiveDD2";
  const nativeDefineProperty = Object.defineProperty;
  let interceptionArmed = true;
  let restoreTimer = null;

  if (window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__) return;

  function fail(message) {
    throw new Error("[DuduQ Year2 DD confirm-any] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada (" + count + "/" + expected + "): " + from.slice(0, 150));
    }
    return source.split(from).join(to);
  }

  function patchActiveDD2(html) {
    if (typeof html !== "string" || !html.trim()) fail("runtime DD2 vazio.");
    if (html.includes("__DUDUQ_YEAR2_CONFIRM_ANY_ACTIVE_DD2__")) return html;

    let prepared = html;

    /* Infer the single-target contract from the payload already produced by
       adapter 2.0.18/2.0.22. This keeps answer.value/sourceAnswer untouched. */
    prepared = replaceRequired(
      prepared,
      `      strategy: payload.strategy || "association",`,
      `      strategy: (function () {\n        var target = payload.targets && payload.targets.length === 1 ? payload.targets[0] : null;\n        var items = Array.isArray(payload.items) ? payload.items : [];\n        var requiredForTarget = target ? items.filter(function (item) { return item.required !== false && item.targetId === target.id; }) : [];\n        var hasDistractor = items.some(function (item) { return item.required === false; });\n        return target && Number(target.capacity || 1) === 1 && items.length >= 2 && requiredForTarget.length === 1 && hasDistractor\n          ? "single-target-choice"\n          : (payload.strategy || "association");\n      })(),`
    );

    prepared = replaceRequired(
      prepared,
      `        snapCorrectItems: false\n      }`,
      `        snapCorrectItems: false,\n        singleTargetChoice: (function () {\n          var target = payload.targets && payload.targets.length === 1 ? payload.targets[0] : null;\n          var items = Array.isArray(payload.items) ? payload.items : [];\n          var requiredForTarget = target ? items.filter(function (item) { return item.required !== false && item.targetId === target.id; }) : [];\n          return Boolean(target && Number(target.capacity || 1) === 1 && items.length >= 2 && requiredForTarget.length === 1 && items.some(function (item) { return item.required === false; }));\n        })(),\n        correctChoiceId: (function () {\n          var target = payload.targets && payload.targets.length === 1 ? payload.targets[0] : null;\n          var items = Array.isArray(payload.items) ? payload.items : [];\n          var correct = target ? items.find(function (item) { return item.required !== false && item.targetId === target.id; }) : null;\n          return correct ? correct.id : undefined;\n        })()\n      }`
    );

    /* Diagnostic markers only; no layout rules are injected. */
    prepared = replaceRequired(
      prepared,
      `"data-dd2-target-id":target.id,`,
      `"data-dd2-target-id":target.id,\n              "data-single-target-choice":question.strategy === "single-target-choice" ? "true" : undefined,`
    );

    prepared = replaceRequired(
      prepared,
      `"data-placed":placed ? "true" : "false",`,
      `"data-placed":placed ? "true" : "false",\n          "data-dd2-item-id":item.id,`
    );

    /* Tap/click in Year 2 single choice behaves like choosing one movable card. */
    prepared = replaceRequired(
      prepared,
      `var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success") return;\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, playValueAudio]);`,
      `var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success" || retryAnimating) return;\n      if (question.strategy === "single-target-choice") {\n        var singleTarget = question.targets && question.targets[0];\n        if (singleTarget) {\n          place(item.id, singleTarget.id, "tap");\n          return;\n        }\n      }\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, place, playValueAudio, question.strategy, question.targets, retryAnimating]);`
    );

    /* Any selected card makes the choice ready; do not leak correctness. */
    prepared = replaceRequired(
      prepared,
      `var requiredItems = question.items.filter(function (item) { return item.required !== false; });\n    var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;\n    var ready = requiredItems.length > 0 && positionedCount === requiredItems.length;`,
      `var requiredItems = question.items.filter(function (item) { return item.required !== false; });\n    var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;\n    var singleChoiceTarget = question.strategy === "single-target-choice" && question.targets ? question.targets[0] : null;\n    var selectedChoiceId = singleChoiceTarget ? ((placements[singleChoiceTarget.id] || []).filter(Boolean)[0] || null) : null;\n    var ready = question.strategy === "single-target-choice"\n      ? Boolean(selectedChoiceId)\n      : (requiredItems.length > 0 && positionedCount === requiredItems.length);`
    );

    prepared = replaceRequired(
      prepared,
      `var validatePlacement = useCallback(function () {\n      var incorrect = [];\n      if (question.strategy === "sequence") {`,
      `var validatePlacement = useCallback(function () {\n      var incorrect = [];\n      if (question.strategy === "single-target-choice") {\n        var singleTarget = question.targets && question.targets[0];\n        var selectedIds = singleTarget ? (placements[singleTarget.id] || []).filter(Boolean) : [];\n        var selectedId = selectedIds[0] || null;\n        var expectedId = question.behavior && question.behavior.correctChoiceId;\n        if (!selectedId || selectedId !== expectedId) {\n          if (selectedId) incorrect.push(selectedId);\n        }\n      } else if (question.strategy === "sequence") {`
    );

    prepared = replaceRequired(
      prepared,
      `var correct = question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`,
      `var correct = question.strategy === "single-target-choice"\n        ? question.items.filter(function (item) { return Boolean(locationOf(item.id)) && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; })\n        : question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`
    );

    /* Reuse the already-homologated 2.0.22 red-feedback timer (850ms). */
    prepared = replaceRequired(
      prepared,
      `if (question.strategy === "sequence" && incorrect.length > 0) {`,
      `if ((question.strategy === "sequence" || question.strategy === "single-target-choice") && incorrect.length > 0) {`
    );

    prepared = replaceRequired(
      prepared,
      `return [entry[0], entry[1].map(function (id) { return incorrect.indexOf(id) >= 0 ? null : id; })];`,
      `return [entry[0], question.strategy === "single-target-choice"\n                ? entry[1].filter(function (id) { return incorrect.indexOf(id) < 0; })\n                : entry[1].map(function (id) { return incorrect.indexOf(id) >= 0 ? null : id; })];`
    );

    prepared = replaceRequired(
      prepared,
      `setAnnouncement(correct.length ? "Os itens corretos ficaram em verde. Complete as posições restantes." : "Tente novamente.");`,
      `setAnnouncement(question.strategy === "single-target-choice"\n            ? "Ouça novamente e tente outra vez."\n            : (correct.length ? "Os itens corretos ficaram em verde. Complete as posições restantes." : "Tente novamente."));`
    );

    /* Keep CONFIRMAR visible in idle state, disabled only until a card is placed. */
    prepared = replaceRequired(
      prepared,
      `ready && feedbackState === "idle" ? React.createElement("div", { className:"duduq-matching-action-slot duduq-dd2-actions" },`,
      `feedbackState === "idle" ? React.createElement("div", { className:"duduq-matching-action-slot duduq-dd2-actions" },`
    );

    prepared = replaceRequired(
      prepared,
      `className:"duduq-matching-primary duduq-dd2-confirm",\n              disabled:disabled,`,
      `className:"duduq-matching-primary duduq-dd2-confirm",\n              disabled:disabled || !ready,`
    );

    /* Listening association: do not lock the other option-audio controls while
       one option is playing. The shared audio controller owns stop/switch behavior. */
    prepared = replaceRequired(
      prepared,
      `disabled: disabled || feedbackState === "success" || audio.isPlaying && !playing,`,
      `disabled: disabled || feedbackState === "success",`
    );

    /* Sentinel for diagnostics and to prevent accidental double-patching. */
    if (!prepared.includes("</head>")) fail("runtime sem </head> para sentinela Year 2.");
    prepared = prepared.replace(
      "</head>",
      `<script>window.__DUDUQ_YEAR2_CONFIRM_ANY_ACTIVE_DD2__=true;</script></head>`
    );

    return prepared;
  }

  function composeRuntimeHook(upstream) {
    if (typeof upstream !== "function") return upstream;
    if (upstream[MARK]) return upstream;
    const wrapped = function year2ConfirmAnyActiveDD2(source) {
      return patchActiveDD2(upstream(source));
    };
    nativeDefineProperty(wrapped, MARK, { value: true });
    return wrapped;
  }

  function restoreDefineProperty() {
    if (restoreTimer !== null) {
      window.clearTimeout(restoreTimer);
      restoreTimer = null;
    }
    if (Object.defineProperty === interceptedDefineProperty) Object.defineProperty = nativeDefineProperty;
  }

  function interceptedDefineProperty(target, property, descriptor) {
    if (
      interceptionArmed &&
      target === window &&
      property === HOOK &&
      descriptor &&
      typeof descriptor.value === "function"
    ) {
      const nextDescriptor = { ...descriptor, value: composeRuntimeHook(descriptor.value) };
      const result = nativeDefineProperty(target, property, nextDescriptor);
      interceptionArmed = false;
      window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ = true;
      restoreDefineProperty();
      return result;
    }
    return nativeDefineProperty(target, property, descriptor);
  }

  function armBeforeAdapterBuild() {
    const existing = window[HOOK];
    if (typeof existing === "function") {
      nativeDefineProperty(window, HOOK, {
        value: composeRuntimeHook(existing),
        configurable: true,
        writable: false
      });
      interceptionArmed = false;
      window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_CAPTURED__ = true;
      return;
    }

    Object.defineProperty = interceptedDefineProperty;
    restoreTimer = window.setTimeout(function () {
      if (interceptionArmed) console.warn("[DuduQ Year2 DD confirm-any] Hook 2.0.22 não apareceu na janela de inicialização.");
      restoreDefineProperty();
    }, 30000);
  }

  armBeforeAdapterBuild();

  window.__DUDUQ_YEAR2_DD_CONFIRM_ANY_BRIDGE__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2",
    releaseModified: false,
    canaryModified: false,
    targetRelease: "2.0.22",
    hookTiming: "before-runtime-build",
    layoutModified: false,
    alternativeAudioSwitchEnabled: true
  });
})();
