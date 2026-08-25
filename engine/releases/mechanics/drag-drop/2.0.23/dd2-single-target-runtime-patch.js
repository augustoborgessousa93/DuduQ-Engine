/* DUDUQ Drag & Drop 2.0.23 — active DD2 SINGLE_TARGET_CHOICE runtime patch
   Homologation helper. Wraps the configurable 2.0.22 runtime hook and patches
   only the active .duduq-dd2-* implementation. No Canary/main promotion here.

   SINGLE_TARGET_CHOICE has one pointer owner. The owner is attached once per
   question/strategy and reads the latest React state/callbacks through a ref,
   avoiding detach/reattach gaps during normal rerenders. The same patch also
   preserves correctChoiceId through DD2 normalization so scoring remains tied
   to the original content source.
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-dd2-single-target-f";
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
      `        snapCorrectItems: false\n      }`,
      `        snapCorrectItems: false,\n        singleTargetChoice: Boolean(payload.behavior && payload.behavior.singleTargetChoice),\n        correctChoiceId: payload.behavior && payload.behavior.correctChoiceId ? payload.behavior.correctChoiceId : undefined\n      }`
    );

    prepared = replaceRequired(
      prepared,
      `"data-dd2-target-id":target.id,`,
      `"data-dd2-target-id":target.id,\n              "data-single-target-choice":question.strategy === "single-target-choice" ? "true" : undefined,`
    );

    prepared = replaceRequired(
      prepared,
      `var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success") return;\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, playValueAudio]);`,
      `var singleTargetPointerContextRef = useRef(null);\n    singleTargetPointerContextRef.current = {\n      disabled:disabled,\n      feedbackState:feedbackState,\n      retryAnimating:retryAnimating,\n      itemMap:itemMap,\n      correctItemIds:correctItemIds,\n      locationOf:locationOf,\n      place:place\n    };\n\n    useEffect(function () {\n      if (question.strategy !== "single-target-choice") return;\n\n      function currentContext() {\n        return singleTargetPointerContextRef.current || {};\n      }\n\n      function itemButtonFromEvent(event) {\n        var node = event.target instanceof Element ? event.target : null;\n        return node && node.closest ? node.closest("button.duduq-dd2-item[data-dd2-item-id]") : null;\n      }\n\n      function targetAtPoint(event) {\n        var hit = document.elementFromPoint(event.clientX, event.clientY);\n        var target = hit && hit.closest ? hit.closest("[data-dd2-target-id]") : null;\n        var bank = hit && hit.closest ? hit.closest("[data-dd2-bank]") : null;\n        return { target:target, bank:bank };\n      }\n\n      function finishVisualDrag() {\n        dragRef.current = null;\n        setDrag(null);\n        setHoverTarget(null);\n      }\n\n      function onSingleTargetPointerDown(event) {\n        var ctx = currentContext();\n        var button = itemButtonFromEvent(event);\n        if (!button || button.disabled || ctx.disabled || ctx.feedbackState === "success" || ctx.retryAnimating) return;\n        if (event.pointerType === "mouse" && event.button !== 0) return;\n        var itemId = button.getAttribute("data-dd2-item-id");\n        if (!itemId || !ctx.itemMap || !ctx.itemMap.has(itemId) || (ctx.correctItemIds || []).indexOf(itemId) >= 0) return;\n        var rect = button.getBoundingClientRect();\n        var nextDrag = {\n          itemId:itemId,\n          originTargetId:ctx.locationOf ? ctx.locationOf(itemId) : null,\n          pointerId:event.pointerId,\n          startX:event.clientX,\n          startY:event.clientY,\n          x:rect.left,\n          y:rect.top,\n          offsetX:event.clientX-rect.left,\n          offsetY:event.clientY-rect.top,\n          moved:false,\n          width:rect.width,\n          height:rect.height\n        };\n        dragRef.current = nextDrag;\n        setDrag(nextDrag);\n        setHoverTarget(null);\n      }\n\n      function onSingleTargetPointerMove(event) {\n        var current = dragRef.current;\n        if (!current || current.pointerId !== event.pointerId) return;\n        var moved = current.moved || Math.hypot(event.clientX-current.startX,event.clientY-current.startY) > 6;\n        if (moved && event.cancelable) event.preventDefault();\n        var next = Object.assign({}, current, {\n          x:event.clientX-current.offsetX,\n          y:event.clientY-current.offsetY,\n          moved:moved\n        });\n        dragRef.current = next;\n        var ghost = document.querySelector(".duduq-dd2-ghost");\n        if (ghost) {\n          ghost.style.left = next.x + "px";\n          ghost.style.top = next.y + "px";\n        }\n        if (moved) {\n          var resolved = targetAtPoint(event);\n          var nextTargetId = resolved.target ? resolved.target.getAttribute("data-dd2-target-id") : null;\n          setHoverTarget(function (previousTarget) { return previousTarget === nextTargetId ? previousTarget : nextTargetId; });\n        }\n        setDrag(next);\n      }\n\n      function onSingleTargetPointerUp(event) {\n        var activeDrag = dragRef.current;\n        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;\n        if (!activeDrag.moved) {\n          finishVisualDrag();\n          return;\n        }\n\n        var resolved = targetAtPoint(event);\n        suppressClick.current = true;\n        window.setTimeout(function () { suppressClick.current = false; }, 320);\n        finishVisualDrag();\n\n        var ctx = currentContext();\n        if (resolved.target && typeof ctx.place === "function") {\n          var targetId = resolved.target.getAttribute("data-dd2-target-id");\n          ctx.place(activeDrag.itemId, targetId, "drop");\n        } else if (resolved.bank && typeof ctx.place === "function") {\n          ctx.place(activeDrag.itemId, null, "drop");\n        } else {\n          setAnnouncement("Item retornou para a posição anterior.");\n        }\n      }\n\n      function onSingleTargetPointerCancel(event) {\n        var activeDrag = dragRef.current;\n        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;\n        finishVisualDrag();\n      }\n\n      document.addEventListener("pointerdown", onSingleTargetPointerDown, true);\n      document.addEventListener("pointermove", onSingleTargetPointerMove, true);\n      document.addEventListener("pointerup", onSingleTargetPointerUp, true);\n      document.addEventListener("pointercancel", onSingleTargetPointerCancel, true);\n\n      return function () {\n        document.removeEventListener("pointerdown", onSingleTargetPointerDown, true);\n        document.removeEventListener("pointermove", onSingleTargetPointerMove, true);\n        document.removeEventListener("pointerup", onSingleTargetPointerUp, true);\n        document.removeEventListener("pointercancel", onSingleTargetPointerCancel, true);\n      };\n    }, [question.id, question.strategy]);\n\n    var onItemClick = useCallback(function (item) {\n      if (suppressClick.current) { suppressClick.current = false; return; }\n      if (disabled || feedbackState === "success" || retryAnimating) return;\n      if (question.strategy === "single-target-choice") {\n        var singleTarget = question.targets && question.targets[0];\n        if (singleTarget) {\n          place(item.id, singleTarget.id, "tap");\n          return;\n        }\n      }\n      setSelected(function (current) { return current === item.id ? null : item.id; });\n      onInteraction && onInteraction();\n      if (item.audioAssetKey || item.spokenText) playValueAudio(item, "item");\n    }, [disabled, feedbackState, onInteraction, place, playValueAudio, question.strategy, question.targets, retryAnimating]);`
    );

    prepared = replaceRequired(
      prepared,
      `"data-placed":placed ? "true" : "false",`,
      `"data-placed":placed ? "true" : "false",\n          "data-dd2-item-id":item.id,`
    );

    prepared = replaceRequired(
      prepared,
      `onPointerDown:function (event) { onPointerDown(item.id,event); },\n          onPointerMove:onPointerMove,\n          onPointerUp:finishDrag,\n          onPointerCancel:function () { dragRef.current = null; setDrag(null); setHoverTarget(null); }`,
      `onPointerDown:question.strategy === "single-target-choice" ? undefined : function (event) { onPointerDown(item.id,event); },\n          onPointerMove:question.strategy === "single-target-choice" ? undefined : onPointerMove,\n          onPointerUp:question.strategy === "single-target-choice" ? undefined : finishDrag,\n          onPointerCancel:question.strategy === "single-target-choice" ? undefined : function () { dragRef.current = null; setDrag(null); setHoverTarget(null); }`
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

    expose(true, "active-dd2-single-owner-stable-pointer-and-answer");
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