/* DUDUQ Drag & Drop 2.0.23 — SINGLE_TARGET_CHOICE pointer bridge
   Homologation-only helper. The active DD2 runtime owns pointer handlers on
   the source item itself; this bridge binds document-level forwarding at the
   exact pointerdown that starts the gesture, removing mount/effect timing races.
   It is strictly gated to strategy === "single-target-choice".
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-pointer-bridge-c";
  const HOOK = "__DUDUQ_DD222_PATCH_RUNTIME__";
  const MARK = "__duduqDD23SingleTargetPointerBridgeWrapped";
  const READY_EVENT = "duduq:dd23-single-target-runtime-ready";
  const MAX_ATTEMPTS = 1200;

  function fail(message) {
    throw new Error("[DuduQ Drag & Drop 2.0.23 Pointer Bridge] " + message);
  }

  function replaceRequired(source, from, to, expected = 1) {
    const count = source.split(from).length - 1;
    if (count !== expected) {
      fail("assinatura inesperada: " + from.slice(0, 140) + " (" + count + ")");
    }
    return source.split(from).join(to);
  }

  function patchPointerBridge(html) {
    if (typeof html !== "string" || !html.trim()) {
      fail("runtime recebido vazio ou inválido.");
    }

    const originalPointerDown = `    var onPointerDown = useCallback(function (itemId, event) {\n      if (disabled || feedbackState === "success" || event.button !== 0) return;\n      var rect = event.currentTarget.getBoundingClientRect();\n      event.currentTarget.setPointerCapture && event.currentTarget.setPointerCapture(event.pointerId);\n      var nextDrag = { itemId:itemId, originTargetId:locationOf(itemId), pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:rect.left, y:rect.top, offsetX:event.clientX-rect.left, offsetY:event.clientY-rect.top, moved:false, width:rect.width, height:rect.height };\n      dragRef.current = nextDrag;\n      setDrag(nextDrag);\n    }, [disabled, feedbackState, locationOf]);`;

    const bridgedPointerDown = `    var onPointerDown = useCallback(function (itemId, event) {\n      if (disabled || feedbackState === "success" || event.button !== 0) return;\n      var rect = event.currentTarget.getBoundingClientRect();\n      event.currentTarget.setPointerCapture && event.currentTarget.setPointerCapture(event.pointerId);\n      var nextDrag = { itemId:itemId, originTargetId:locationOf(itemId), pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:rect.left, y:rect.top, offsetX:event.clientX-rect.left, offsetY:event.clientY-rect.top, moved:false, width:rect.width, height:rect.height };\n      dragRef.current = nextDrag;\n      setDrag(nextDrag);\n\n      if (question.strategy === "single-target-choice") {\n        var bridgePointerId = event.pointerId;\n        var bridgeDocument = event.currentTarget.ownerDocument || document;\n        var cleanupPointerBridge = function () {\n          bridgeDocument.removeEventListener("pointermove", forwardPointerMove, true);\n          bridgeDocument.removeEventListener("pointerup", forwardPointerUp, true);\n          bridgeDocument.removeEventListener("pointercancel", forwardPointerCancel, true);\n        };\n        var forwardPointerMove = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          onPointerMove(pointerEvent);\n        };\n        var forwardPointerUp = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          cleanupPointerBridge();\n          finishDrag(pointerEvent);\n        };\n        var forwardPointerCancel = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          cleanupPointerBridge();\n          var activeDrag = dragRef.current;\n          if (!activeDrag || activeDrag.pointerId !== pointerEvent.pointerId) return;\n          dragRef.current = null;\n          setDrag(null);\n          setHoverTarget(null);\n        };\n        bridgeDocument.addEventListener("pointermove", forwardPointerMove, true);\n        bridgeDocument.addEventListener("pointerup", forwardPointerUp, true);\n        bridgeDocument.addEventListener("pointercancel", forwardPointerCancel, true);\n      }\n    }, [disabled, feedbackState, locationOf, question.strategy]);`;

    return replaceRequired(html, originalPointerDown, bridgedPointerDown, 1);
  }

  function expose(ready, details) {
    window.DuduQDD23PointerBridge = Object.freeze({
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
      return patchPointerBridge(previous(source));
    };

    Object.defineProperty(wrapped, MARK, { value: true });

    Object.defineProperty(window, HOOK, {
      value: wrapped,
      configurable: true,
      writable: false
    });

    expose(true, "pointerdown-document-forwarding-installed");
    window.dispatchEvent(new CustomEvent("duduq:dd23-pointer-bridge-ready", {
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
    /* The active runtime patch emits this event synchronously immediately
       after replacing the shared hook. Installing here guarantees that the
       pointer bridge wraps the same hook before the loader can mount DD2. */
    if (install()) stopWaiting();
  }

  expose(false, "waiting-for-single-target-runtime-patch");
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
      expose(false, "timeout-waiting-for-single-target-runtime-patch");
      console.error("[DuduQ Drag & Drop 2.0.23 Pointer Bridge] runtime patch não ficou pronto a tempo.");
    }
  }, 10);
})();
