/* DUDUQ Drag & Drop 2.0.23 — SINGLE_TARGET_CHOICE pointer bridge
   Homologation-only helper. For this gated interaction, pointer movement keeps
   the native DD2 drag visuals, while pointerup over the single target commits
   through the same canonical place() used by tap/click.

   Candidate e adds an iframe-local diagnostic marker so homologation can prove
   whether this exact generated runtime received the bridge and which branch of
   the pointer lifecycle executed. The diagnostics are gated to this candidate.
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-pointer-bridge-e";
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

    const bridgedPointerDown = `    window.__DUDUQ_DD23_POINTER_BRIDGE_RUNTIME__ = window.__DUDUQ_DD23_POINTER_BRIDGE_RUNTIME__ || { version:"2.0.23-pointer-bridge-e", injected:true, renders:0, pointerDown:0, moves:0, pointerUps:0, cancels:0, targetResolved:null, lastHitClass:null, lastPointerUp:null, placeCalls:0, lastPlaceItem:null, lastPlaceTarget:null, afterPlaceFilled:null };\n    window.__DUDUQ_DD23_POINTER_BRIDGE_RUNTIME__.injected = true;\n    window.__DUDUQ_DD23_POINTER_BRIDGE_RUNTIME__.renders += 1;\n    var onPointerDown = useCallback(function (itemId, event) {\n      if (disabled || feedbackState === "success" || event.button !== 0) return;\n      var dd23Diag = window.__DUDUQ_DD23_POINTER_BRIDGE_RUNTIME__;\n      dd23Diag.pointerDown += 1;\n      dd23Diag.lastPlaceItem = itemId;\n      dd23Diag.lastPointerDown = { pointerId:event.pointerId, clientX:Math.round(event.clientX), clientY:Math.round(event.clientY), at:Date.now() };\n      var rect = event.currentTarget.getBoundingClientRect();\n      event.currentTarget.setPointerCapture && event.currentTarget.setPointerCapture(event.pointerId);\n      var nextDrag = { itemId:itemId, originTargetId:locationOf(itemId), pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, x:rect.left, y:rect.top, offsetX:event.clientX-rect.left, offsetY:event.clientY-rect.top, moved:false, width:rect.width, height:rect.height };\n      dragRef.current = nextDrag;\n      setDrag(nextDrag);\n\n      if (question.strategy === "single-target-choice") {\n        var bridgePointerId = event.pointerId;\n        var bridgeItemId = itemId;\n        var bridgeDocument = event.currentTarget.ownerDocument || document;\n        var cleanupPointerBridge = function () {\n          bridgeDocument.removeEventListener("pointermove", forwardPointerMove, true);\n          bridgeDocument.removeEventListener("pointerup", forwardPointerUp, true);\n          bridgeDocument.removeEventListener("pointercancel", forwardPointerCancel, true);\n        };\n        var finishBridgeGesture = function () {\n          dragRef.current = null;\n          setDrag(null);\n          setHoverTarget(null);\n        };\n        var forwardPointerMove = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          dd23Diag.moves += 1;\n          dd23Diag.lastMove = { clientX:Math.round(pointerEvent.clientX), clientY:Math.round(pointerEvent.clientY), at:Date.now() };\n          onPointerMove(pointerEvent);\n        };\n        var forwardPointerUp = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          cleanupPointerBridge();\n          dd23Diag.pointerUps += 1;\n          dd23Diag.lastPointerUp = { pointerId:pointerEvent.pointerId, clientX:Math.round(pointerEvent.clientX), clientY:Math.round(pointerEvent.clientY), at:Date.now() };\n          var hit = bridgeDocument.elementFromPoint(pointerEvent.clientX, pointerEvent.clientY);\n          var targetNode = hit && hit.closest ? hit.closest("[data-dd2-target-id]") : null;\n          var targetId = targetNode ? targetNode.getAttribute("data-dd2-target-id") : null;\n          dd23Diag.targetResolved = targetId;\n          dd23Diag.lastHitClass = hit ? String(hit.className || hit.tagName || "") : null;\n          finishBridgeGesture();\n          if (targetId) {\n            pointerEvent.preventDefault && pointerEvent.preventDefault();\n            dd23Diag.placeCalls += 1;\n            dd23Diag.lastPlaceItem = bridgeItemId;\n            dd23Diag.lastPlaceTarget = targetId;\n            place(bridgeItemId, targetId, "drag-bridge");\n            window.setTimeout(function () {\n              var targetAfter = bridgeDocument.querySelector('[data-dd2-target-id="' + targetId + '"]');\n              dd23Diag.afterPlaceFilled = targetAfter ? targetAfter.getAttribute("data-filled") : null;\n            }, 80);\n          }\n        };\n        var forwardPointerCancel = function (pointerEvent) {\n          if (pointerEvent.pointerId !== bridgePointerId) return;\n          cleanupPointerBridge();\n          dd23Diag.cancels += 1;\n          finishBridgeGesture();\n        };\n        bridgeDocument.addEventListener("pointermove", forwardPointerMove, true);\n        bridgeDocument.addEventListener("pointerup", forwardPointerUp, true);\n        bridgeDocument.addEventListener("pointercancel", forwardPointerCancel, true);\n      }\n    }, [disabled, feedbackState, locationOf, onPointerMove, place, question.strategy]);`;

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

    expose(true, "single-target-drag-instrumented");
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
