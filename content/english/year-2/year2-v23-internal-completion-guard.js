/* DUDUQ English Year 2 — internal mechanic completion flash guard
   The module Host owns progression and the official completion screen.
   Mechanics may render their own internal "Lição concluída" view for one paint
   before notifying the Host. In Year 2 public modules that internal view must
   never be exposed between activities.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-year2-host-owned-completion";
  const STYLE_ID = "duduq-year2-internal-completion-guard";
  const FRAME_MARK = "duduqYear2CompletionGuard";

  if (window.__DUDUQ_YEAR2_INTERNAL_COMPLETION_GUARD__) return;

  function installInDocument(doc) {
    if (!doc || !doc.documentElement) return false;

    try {
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
          "/* Host-owned progression: never expose a mechanic's internal lesson-complete screen. */",
          ".duduq-engine-complete {",
          "  visibility: hidden !important;",
          "  opacity: 0 !important;",
          "  pointer-events: none !important;",
          "}",
          ".duduq-engine-complete * { pointer-events: none !important; }"
        ].join("\n");
        (doc.head || doc.documentElement).appendChild(style);
      }

      doc.documentElement.setAttribute(
        "data-duduq-year2-internal-completion-guard",
        "active"
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function wireFrame(frame) {
    if (!frame || frame.dataset?.[FRAME_MARK] === "true") return;

    try {
      frame.dataset[FRAME_MARK] = "true";
    } catch (_) {}

    function install() {
      try {
        installInDocument(frame.contentDocument);
      } catch (_) {}
    }

    frame.addEventListener("load", function () {
      install();
      window.requestAnimationFrame(install);
    });

    install();
  }

  function scan() {
    document.querySelectorAll("#root iframe, iframe").forEach(wireFrame);
  }

  const observer = new MutationObserver(scan);

  function start() {
    scan();
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.__DUDUQ_YEAR2_INTERNAL_COMPLETION_GUARD__ = Object.freeze({
    version: VERSION,
    scope: "english-year-2-public-entry",
    hostOwnsProgression: true,
    internalCompletionSelector: ".duduq-engine-complete",
    releaseModified: false,
    canaryModified: false
  });
})();
