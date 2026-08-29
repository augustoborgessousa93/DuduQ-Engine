/* DUDUQ shared — Host-owned completion guard v1.0.0
   Cross-year scale layer.

   Contract:
   - DuduQ Host owns progression and the official module completion screen;
   - mechanic-internal `.duduq-engine-complete` views must not flash between steps;
   - no scoring, content, answer, release or navigation rules are changed.
*/
(function () {
  "use strict";

  const VERSION = "1.0.0";
  const STYLE_ID = "duduq-shared-host-completion-guard";
  const FRAME_MARK = "duduqSharedHostCompletionGuard";

  if (window.DuduQSharedHostCompletionGuard?.version === VERSION) return;

  function installInDocument(doc) {
    if (!doc?.documentElement) return false;
    try {
      if (!doc.getElementById(STYLE_ID)) {
        const style = doc.createElement("style");
        style.id = STYLE_ID;
        style.textContent = [
          "/* DuduQ Host owns step/module completion UI. */",
          ".duduq-engine-complete{visibility:hidden!important;opacity:0!important;pointer-events:none!important}",
          ".duduq-engine-complete *{pointer-events:none!important}"
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
    if (!frame || frame.dataset?.[FRAME_MARK] === "true") return;
    try { frame.dataset[FRAME_MARK] = "true"; } catch (_) {}

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
    document.querySelectorAll("#root iframe, iframe").forEach(wireFrame);
  }

  const observer = new MutationObserver(scan);
  function start() {
    scan();
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.DuduQSharedHostCompletionGuard = Object.freeze({
    version: VERSION,
    scope: "all-years",
    hostOwnsProgression: true,
    internalCompletionSelector: ".duduq-engine-complete",
    installInDocument,
    releaseModified: false,
    scoringModified: false,
    contentModified: false
  });
})();
