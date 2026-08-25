/* DUDUQ Drag & Drop 2.0.23 — active DD2 SINGLE_TARGET_CHOICE runtime patch
   Homologation helper. Wraps the configurable 2.0.22 runtime hook and patches
   only the active .duduq-dd2-* implementation. No Canary/main promotion here.
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-dd2-single-target-b";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqDD23SingleTargetWrapped";
  const MAX_ATTEMPTS = 1200;

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.23 DD2] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada: " + from.slice(0, 140) + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  const SINGLE_TARGET_CSS = `
/* === DUDUQ DRAG & DROP 2.0.23 — SINGLE TARGET CHOICE / ACTIVE DD2 === */
.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) minmax(300px, .78fr) !important;
  align-items: start !important;
  gap: clamp(18px, 2.5vw, 34px) !important;
}
.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-targets {
  grid-template-columns: minmax(0, 1fr) !important;
  justify-items: center !important;
  min-width: 0 !important;
}
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-capacity {
  display: none !important;
}
.duduq-dd2-target[data-single-target-choice="true"] {
  width: min(100%, 520px) !important;
  min-height: clamp(260px, 43vh, 390px) !important;
}
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
  min-height: clamp(150px, 24vh, 230px) !important;
}
.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank {
  min-width: 0 !important;
  margin: 0 !important;
  align-self: start !important;
}
.duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  align-content: start !important;
  gap: 10px !important;
}
.duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-item[data-wrong="true"] {
  border-color: #ff5d5d !important;
  background: #fff0f0 !important;
  box-shadow: 0 4px 0 #e14b4b, 0 8px 14px rgba(183,28,28,.10) !important;
}
@media (max-width: 760px) {
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 14px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] {
    width: min(100%, 360px) !important;
    min-height: 210px !important;
  }
  .duduq-dd2-target[data-single-target-choice="true"] .duduq-dd2-zone {
    min-height: 118px !important;
  }
  .duduq-dd2-arena:has(.duduq-dd2-target[data-single-target-choice="true"]) .duduq-dd2-bank-items {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px !important;
  }
}
`;

  function patchActiveDD2(html) {
    if (typeof html !== "string" || !html.trim()) {
      fail("runtime recebido vazio ou inválido.");
    }

    let prepared = html;

    prepared = replaceRequired(
      prepared,
      `"data-dd2-target-id":target.id,`,
      `"data-dd2-target-id":target.id,\n              "data-single-target-choice":question.strategy === "single-target-choice" ? "true" : undefined,`
    );

    prepared = replaceRequired(
      prepared,
      `var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success") return;\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, playValueAudio]);`,
      `var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success" || retryAnimating) return;\n      if (question.strategy === "single-target-choice") {\n        var singleTarget = question.targets && question.targets[0];\n        if (singleTarget) {\n          place(item.id, singleTarget.id, "tap");\n          return;\n        }\n      }\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, place, playValueAudio, question.strategy, question.targets, retryAnimating]);`
    );

    prepared = replaceRequired(
      prepared,
      `var requiredItems = question.items.filter(function (item) { return item.required !== false; });\n    var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;\n    var ready = requiredItems.length > 0 && positionedCount === requiredItems.length;`,
      `var requiredItems = question.items.filter(function (item) { return item.required !== false; });\n    var positionedCount = requiredItems.filter(function (item) { return Boolean(locationOf(item.id)); }).length;\n    var ready = question.strategy === "single-target-choice"\n      ? positionedCount === 1\n      : (requiredItems.length > 0 && positionedCount === requiredItems.length);`
    );

    prepared = replaceRequired(
      prepared,
      `var validatePlacement = useCallback(function () {\n      var incorrect = [];\n      if (question.strategy === "sequence") {`,
      `var validatePlacement = useCallback(function () {\n      var incorrect = [];\n      if (question.strategy === "single-target-choice") {\n        var singleTarget = question.targets && question.targets[0];\n        var selectedIds = singleTarget ? (placements[singleTarget.id] || []).filter(Boolean) : [];\n        var selectedId = selectedIds[0] || null;\n        var correctChoiceId = question.behavior && question.behavior.correctChoiceId;\n        if (!selectedId || selectedId !== correctChoiceId) {\n          if (selectedId) incorrect.push(selectedId);\n        }\n      } else if (question.strategy === "sequence") {`
    );

    prepared = replaceRequired(
      prepared,
      `var correct = question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`,
      `var correct = question.strategy === "single-target-choice"\n        ? question.items.filter(function (item) { return Boolean(locationOf(item.id)) && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; })\n        : question.items.filter(function (item) { return item.required !== false && incorrect.indexOf(item.id) < 0; }).map(function (item) { return item.id; });`
    );

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

    if (!prepared.includes("</head>")) {
      fail("runtime sem </head> para injeção do CSS single-target.");
    }
    prepared = prepared.replace("</head>", `<style>${SINGLE_TARGET_CSS}</style></head>`);

    return prepared;
  }

  function expose(ready, details) {
    window.DuduQDD23SingleTargetRuntimePatch = Object.freeze({
      version: VERSION,
      ready: Boolean(ready),
      hook: HOOK,
      details: details || null
    });
  }

  function install() {
    const previous = window[HOOK];
    if (typeof previous !== "function") return false;
    if (previous[MARK]) {
      expose(true, "already-wrapped");
      return true;
    }

    const wrapped = function (source) {
      return patchActiveDD2(previous(source));
    };
    Object.defineProperty(wrapped, MARK, { value: true });

    Object.defineProperty(window, HOOK, {
      value: wrapped,
      configurable: true,
      writable: false
    });

    expose(true, "active-dd2-hook-wrapped");
    window.dispatchEvent(new CustomEvent("duduq:dd23-single-target-runtime-ready", {
      detail: { version: VERSION }
    }));
    return true;
  }

  expose(false, "waiting-for-dd222-hook");

  if (install()) return;

  let attempts = 0;
  const timer = window.setInterval(function () {
    attempts += 1;
    if (install()) {
      window.clearInterval(timer);
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      window.clearInterval(timer);
      expose(false, "timeout-waiting-for-dd222-hook");
      console.error("[DuduQ Drag & Drop 2.0.23 DD2] hook 2.0.22 não apareceu a tempo.");
    }
  }, 10);
})();
