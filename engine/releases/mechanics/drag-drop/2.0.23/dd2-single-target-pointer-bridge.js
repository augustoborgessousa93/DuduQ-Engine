/* DUDUQ Drag & Drop 2.0.23 — SINGLE_TARGET_CHOICE pointer bridge
   Homologation-only helper. The active DD2 runtime owns pointer handlers on
   the source item itself; this bridge forwards pointer move/up/cancel events
   that continue through the iframe document after the pointer leaves the card.
   It is strictly gated to strategy === "single-target-choice".
*/
(function () {
  "use strict";

  const VERSION = "2.0.23-pointer-bridge-b";
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

    const needle = `    var onItemClick = useCallback(function (item) {`;
    const bridge = `    useEffect(function () {\n      if (question.strategy !== "single-target-choice") return;\n\n      function eventIsOwnedByItem(event) {\n        var target = event && event.target;\n        return Boolean(target && target.closest && target.closest(".duduq-dd2-item"));\n      }\n\n      function forwardPointerMove(event) {\n        if (eventIsOwnedByItem(event)) return;\n        onPointerMove(event);\n      }\n\n      function forwardPointerUp(event) {\n        if (eventIsOwnedByItem(event)) return;\n        finishDrag(event);\n      }\n\n      function forwardPointerCancel(event) {\n        var activeDrag = dragRef.current;\n        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;\n        dragRef.current = null;\n        setDrag(null);\n        setHoverTarget(null);\n      }\n\n      document.addEventListener("pointermove", forwardPointerMove, true);\n      document.addEventListener("pointerup", forwardPointerUp, true);\n      document.addEventListener("pointercancel", forwardPointerCancel, true);\n\n      return function () {\n        document.removeEventListener("pointermove", forwardPointerMove, true);\n        document.removeEventListener("pointerup", forwardPointerUp, true);\n        document.removeEventListener("pointercancel", forwardPointerCancel, true);\n      };\n    }, [finishDrag, onPointerMove, question.strategy]);\n\n`;

    return replaceRequired(html, needle, bridge + needle, 1);
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

    expose(true, "document-pointer-forwarding-installed");
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
