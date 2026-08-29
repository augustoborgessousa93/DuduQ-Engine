/* DUDUQ shared Host-owned completion guard
   The Host owns progression and the official completion screen. Mechanics may
   briefly render their own internal completion view before notifying the Host;
   public module entrypoints can load this guard to prevent that flash.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0-shared";
  const STYLE_ID = "duduq-host-completion-guard";
  const FRAME_MARK = "duduqHostCompletionGuard";

  if (window.__DUDUQ_HOST_COMPLETION_GUARD__) return;

  function installInDocument(doc) {
    if (!doc?.documentElement) return false;
    try {
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
          "/* Host-owned progression: hide mechanic-local lesson completion surfaces. */",
          ".duduq-engine-complete {",
          "  visibility: hidden !important;",
          "  opacity: 0 !important;",
          "  pointer-events: none !important;",
          "}",
          ".duduq-engine-complete * { pointer-events: none !important; }"
        ].join("\n");
        (doc.head || doc.documentElement).appendChild(style);
      }
      doc.documentElement.setAttribute("data-duduq-host-completion-guard", "active");
      return true;
    } catch (_) {
      return false;
    }
  }

  function wireFrame(frame) {
    if (!(frame instanceof HTMLIFrameElement)) return;
    try {
      if (frame.dataset?.[FRAME_MARK] === "true") return;
      frame.dataset[FRAME_MARK] = "true";
    } catch (_) {}

    function install() {
      try { installInDocument(frame.contentDocument); } catch (_) {}
    }

    frame.addEventListener("load", function () {
      install();
      window.requestAnimationFrame(install);
    });
    install();
  }

  function scan() {
    installInDocument(document);
    document.querySelectorAll("#root iframe, iframe").forEach(wireFrame);
  }

  const observer = new MutationObserver(scan);

  function start() {
    scan();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.__DUDUQ_HOST_COMPLETION_GUARD__ = Object.freeze({
    version: VERSION,
    scope: "shared-public-entry",
    hostOwnsProgression: true,
    internalCompletionSelector: ".duduq-engine-complete",
    releaseModified: false
  });
})();
