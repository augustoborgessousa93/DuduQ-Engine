/* DUDUQ Drag & Drop 2.0.23 — SINGLE_TARGET_CHOICE pointer gate diagnostic
   Homologation-only. Wraps the already-installed active DD2 patch and records
   why a DOM pointerdown is accepted or rejected before the drag state starts.
   This file does not change scoring, placement, feedback, Canary or main.
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-pointer-gate-diag-a";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqDD23PointerGateDiagnosticWrapped";
  const READY_EVENT = "duduq:dd23-single-target-runtime-ready";
  const MAX_ATTEMPTS = 1200;

  function fail(message) {
    throw new Error("[DuduQ DD2 Pointer Gate Diagnostic] " + message);
  }

  function patchGate(source) {
    const original = `      function onSingleTargetPointerDown(event) {\n        var ctx = currentContext();\n        var button = itemButtonFromEvent(event);\n        if (!button || button.disabled || ctx.disabled || ctx.feedbackState === "success" || ctx.retryAnimating) return;\n        if (event.pointerType === "mouse" && event.button !== 0) return;\n        var itemId = button.getAttribute("data-dd2-item-id");\n        if (!itemId || !ctx.itemMap || !ctx.itemMap.has(itemId) || (ctx.correctItemIds || []).indexOf(itemId) >= 0) return;`;

    const instrumented = `      function onSingleTargetPointerDown(event) {\n        pointerRuntime.pointerDownSeen = (pointerRuntime.pointerDownSeen || 0) + 1;\n        var ctx = currentContext();\n        var button = itemButtonFromEvent(event);\n        var itemId = button ? button.getAttribute("data-dd2-item-id") : null;\n        var gate = {\n          eventTarget:event.target && (event.target.className || event.target.tagName) || null,\n          pointerType:event.pointerType || null,\n          button:event.button,\n          hasButton:Boolean(button),\n          buttonDisabled:button ? Boolean(button.disabled) : null,\n          itemId:itemId,\n          ctxDisabled:Boolean(ctx.disabled),\n          feedbackState:ctx.feedbackState == null ? null : ctx.feedbackState,\n          retryAnimating:Boolean(ctx.retryAnimating),\n          itemMapReady:Boolean(ctx.itemMap),\n          itemMapHas:Boolean(itemId && ctx.itemMap && ctx.itemMap.has(itemId)),\n          correctItemIds:Array.isArray(ctx.correctItemIds) ? ctx.correctItemIds.slice() : []\n        };\n        pointerRuntime.lastPointerDownGate = gate;\n        pointerRuntime.rejectedBy = null;\n        if (!button) { pointerRuntime.rejectedBy = "no-button"; return; }\n        if (button.disabled) { pointerRuntime.rejectedBy = "button-disabled"; return; }\n        if (ctx.disabled) { pointerRuntime.rejectedBy = "context-disabled"; return; }\n        if (ctx.feedbackState === "success") { pointerRuntime.rejectedBy = "feedback-success"; return; }\n        if (ctx.retryAnimating) { pointerRuntime.rejectedBy = "retry-animating"; return; }\n        if (event.pointerType === "mouse" && event.button !== 0) { pointerRuntime.rejectedBy = "non-primary-mouse-button"; return; }\n        if (!itemId) { pointerRuntime.rejectedBy = "missing-item-id"; return; }\n        if (!ctx.itemMap) { pointerRuntime.rejectedBy = "missing-item-map"; return; }\n        if (!ctx.itemMap.has(itemId)) { pointerRuntime.rejectedBy = "item-not-in-map"; return; }\n        if ((ctx.correctItemIds || []).indexOf(itemId) >= 0) { pointerRuntime.rejectedBy = "already-correct"; return; }\n        pointerRuntime.pointerDownAccepted = (pointerRuntime.pointerDownAccepted || 0) + 1;`;

    const occurrences = source.split(original).length - 1;
    if (occurrences !== 1) {
      fail("assinatura onSingleTargetPointerDown inesperada: " + occurrences);
    }
    return source.split(original).join(instrumented);
  }

  function expose(ready, details) {
    window.DuduQDD23PointerGateDiagnostic = Object.freeze({
      version: VERSION,
      ready: Boolean(ready),
      hook: HOOK,
      details: details || null
    });
  }

  function install() {
    if (window.DuduQDD23SingleTargetRuntimePatch?.ready !== true) return false;
    const previous = window[HOOK];
    if (typeof previous !== "function") return false;
    if (previous[MARK]) {
      expose(true, "already-wrapped");
      return true;
    }

    const wrapped = function (source) {
      return patchGate(previous(source));
    };
    Object.defineProperty(wrapped, MARK, { value: true });
    Object.defineProperty(window, HOOK, {
      value: wrapped,
      configurable: true,
      writable: false
    });

    expose(true, "pointerdown-gate-instrumented");
    window.dispatchEvent(new CustomEvent("duduq:dd23-pointer-gate-diagnostic-ready", {
      detail: { version: VERSION }
    }));
    return true;
  }

  let timer = null;
  function stopWaiting() {
    window.removeEventListener(READY_EVENT, onRuntimeReady);
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }
  function onRuntimeReady() {
    if (install()) stopWaiting();
  }

  expose(false, "waiting-for-active-runtime-patch");
  window.addEventListener(READY_EVENT, onRuntimeReady);
  if (install()) {
    stopWaiting();
    return;
  }

  let attempts = 0;
  timer = window.setInterval(function () {
    attempts += 1;
    if (install()) {
      stopWaiting();
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      stopWaiting();
      expose(false, "timeout-waiting-for-active-runtime-patch");
      console.error("[DuduQ DD2 Pointer Gate Diagnostic] active runtime patch não ficou pronto a tempo.");
    }
  }, 10);
})();